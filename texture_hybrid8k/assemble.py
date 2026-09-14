"""Conservative AI-detail transfer, not a georeferenced DEM reconstruction."""
from pathlib import Path
import sys
import json
import hashlib
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / '.cache/texture-stitch-deps'))
import cv2
import numpy as np
from PIL import Image

W, H, PAD = 8192, 4096, 128
OUT = ROOT.parent / 'textures/hybrid8k'
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'manifest.json').read_text())

def rgb(path, size=None):
    with Image.open(path) as im:
        im = im.convert('RGB')
        if size:
            im = im.resize(size, Image.Resampling.LANCZOS)
        return np.array(im)

def land_mask(a):
    a = a.astype(np.float32)
    # Specific to this blue/cyan-water master; not a universal water classifier.
    return (np.minimum(a[..., 2] - a[..., 0], a[..., 1] - a[..., 0]) < 8).astype(np.float32)

def edges(a):
    # Match the periodic seam and collapse the singular polar rows.
    for k in range(32):
        t = (1 - k / 32) ** 2 * .5
        left, right = a[:, k].copy(), a[:, -1-k].copy()
        a[:, k] = left * (1-t) + right * t
        a[:, -1-k] = right * (1-t) + left * t
    for row in (0, -1):
        a[row] = a[row].mean(axis=0)
    return a

base = rgb(manifest['source'], (W, H))
edges(base)
land = land_mask(base)
inland = np.clip(cv2.distanceTransform(land.astype(np.uint8), cv2.DIST_L2, 3) / 10, 0, 1)
detail_sum = np.zeros((H, W), np.float32)
weights = np.zeros_like(detail_sum)
report = {'output_size': [W, H], 'native_8k': False, 'tiles': [],
          'method': 'Fixed coordinates, feathered inland luminance detail only; master chroma retained.',
          'limitations': 'Illustrative geography; heuristic water mask; synthetic relief, not measured elevation.'}
for tile in manifest['tiles']:
    path = ROOT / 'generated' / (tile['name'] + '.png')
    with Image.open(path) as im:
        native = im.size
    ai = rgb(path, (2304, 1280))
    source = rgb(tile['input'])
    allowed = land_mask(ai) * land_mask(source)
    allowed = cv2.erode(allowed, np.ones((13, 13), np.uint8))
    gray = cv2.cvtColor(ai, cv2.COLOR_RGB2GRAY).astype(np.float32)
    detail = np.clip(gray - cv2.GaussianBlur(gray, (0, 0), 5), -22, 22) * allowed
    rampx = np.minimum(np.minimum(np.arange(2304)+1, np.arange(2304, 0, -1))/PAD, 1)
    rampy = np.minimum(np.minimum(np.arange(1280)+1, np.arange(1280, 0, -1))/PAD, 1)
    feather = (rampy[:, None] * rampx[None, :]).astype(np.float32)
    x, y, _, _ = tile['core']
    yy = np.arange(y-PAD, y+1024+PAD)
    valid = (yy >= 0) & (yy < H)
    xx = np.arange(x-PAD, x+2048+PAD) % W
    detail_sum[np.ix_(yy[valid], xx)] += (detail * feather)[valid]
    weights[np.ix_(yy[valid], xx)] += feather[valid]
    report['tiles'].append({'name': tile['name'], 'native_size': native,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'land_disagreement_fraction': float(np.mean(land_mask(ai) != land_mask(source)))})
    print('Transferred', tile['name'], flush=True)

detail_sum /= np.maximum(weights, .0001)
del weights
detail_sum *= inland * .65
color = base.copy()
# Suppress baked ocean ridges without replacing shallow/deep-water colors.
for channel in range(3):
    plane = base[..., channel].astype(np.float32)
    # Preserve coastal colors: normalize by water coverage to exclude land bleed.
    water_weight = cv2.GaussianBlur(1-land, (0, 0), 3)
    ocean = cv2.GaussianBlur(plane * (1-land), (0, 0), 3) / np.maximum(water_weight, .0001)
    color[..., channel] = np.clip(plane * land + ocean * (1-land) + detail_sum, 0, 255)
edges(color)
Image.fromarray(color).save(OUT / 'color-8k.png')
color4 = np.array(Image.fromarray(color).resize((4096, 2048), Image.Resampling.LANCZOS))
edges(color4)
Image.fromarray(color4).save(OUT / 'color-4k.png')
Image.fromarray(color).resize((2048, 1024), Image.Resampling.LANCZOS).save(ROOT / 'preview.jpg', quality=95)

# Deterministic illustrative microrelief. No ocean elevation or color-to-height conversion.
rng = np.random.default_rng(66000)
height = np.zeros((H, W), np.float32)
for scale, amp in ((64, .12), (256, .07), (1024, .025)):
    noise = rng.random((scale//2+1, scale+1), dtype=np.float32)
    noise[:, -1] = noise[:, 0]
    height += cv2.resize(noise, (W, H), interpolation=cv2.INTER_CUBIC) * amp
height *= inland
height[:2] = 0
height[-2:] = 0
edges(height)
height *= land
roughness = np.clip(90 + land * 135 + detail_sum * .25, 0, 255).astype(np.uint8)
edges(roughness)
water = ((1-land)*255).astype(np.uint8)
for label, data in [('water', water), ('roughness', roughness)]:
    Image.fromarray(data).save(OUT / f'{label}-8k.png')
    Image.fromarray(data).resize((4096, 2048), Image.Resampling.BOX).save(OUT / f'{label}-4k.png')
Image.fromarray((height * 65535).astype(np.uint16)).save(OUT / 'height-8k.png')

for size, label in [((W, H), '8k'), ((4096, 2048), '4k')]:
    h = cv2.resize(height, size, interpolation=cv2.INTER_AREA)
    mask = cv2.resize(land, size, interpolation=cv2.INTER_AREA)
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 3
    dy = np.gradient(h, axis=0) * 6
    normal = np.stack([-dx, dy, np.ones_like(h)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    normal[mask < .99] = [0, 0, 1]
    normal[:2] = [0, 0, 1]
    normal[-2:] = [0, 0, 1]
    encoded = np.round((normal*.5+.5)*255).astype(np.uint8)
    encoded[:, -1] = encoded[:, 0]
    Image.fromarray(encoded).save(OUT / f'normal-{label}.png')

report['seam_max_channel_error'] = int(np.max(np.abs(color[:, 0].astype(int)-color[:, -1].astype(int))))
report['ai_ocean_detail_applied'] = False
report['files'] = {p.name: p.stat().st_size for p in OUT.glob('*.png')}
(ROOT / 'report.json').write_text(json.dumps(report, indent=2))
# Same fixed crop at native display scale, before then after.
box = (1600, 1200, 2600, 1800)
compare = Image.new('RGB', (2000, 600))
compare.paste(Image.fromarray(base).crop(box), (0, 0))
compare.paste(Image.fromarray(color).crop(box), (1000, 0))
compare.save(ROOT / 'detail-before-after.png')
assert report['seam_max_channel_error'] == 0
assert np.max(height[land == 0]) == 0
print(json.dumps({'complete': True, 'size': [W, H], 'tiles': len(report['tiles'])}))
