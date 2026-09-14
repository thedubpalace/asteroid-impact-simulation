"""Prepare/apply a coordinate-locked local AI detail patch; never paint an island."""
from pathlib import Path
import json
import sys
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / '.cache/texture-stitch-deps'))
import cv2
import numpy as np
from PIL import Image

OUT = ROOT.parent / 'textures/hybrid8k'
SIZE = 768
CX = round((180 - 89.5) / 360 * 8192)
CY = round((90 - 21.4) / 180 * 4096)
BOX = (CX-SIZE//2, CY-SIZE//2, CX+SIZE//2, CY+SIZE//2)
PROMPT = '''Use case: precise-object-edit.
Image 1 is the exact EDIT TARGET: a coordinate-locked square crop from an Earth globe albedo texture, centered on the simulation impact coordinate. Do not change framing, projection, rotation or scale.
Create a much more detailed photorealistic satellite-style surface texture of this exact region BEFORE impact. Preserve every coastline, island outline, sea channel and the entire land-water layout exactly at its existing pixel positions. Keep the same large-scale colors.
On existing LAND only, enhance natural forest canopy, fine sediment/limestone grain, drainage and irregular terrain detail. On existing turquoise WATER, add extremely subtle submerged sediment/bathymetric color variations. Deep blue water stays smooth. Water is not land: never add islands, exposed rings or mountains in water.
Neutral unlit albedo, overhead flat map, no directional shadows or baked highlights. No crater, no asteroid, no explosion, no circular marking, no target symbol, no roads/cities/text/labels/grid/clouds. Do not paint a circular patch at the center.
Keep the outer 96-pixel border unchanged for seamless integration. Return one high-resolution square image, preferably 2048x2048. The input geometry and land-water boundaries must remain identical; add fine detail only. This is an illustrative late-Cretaceous map, not a modern map reconstruction.'''

if len(sys.argv) < 2 or sys.argv[1] == 'prepare':
    with Image.open(OUT / 'color-8k.png') as im:
        im.crop(BOX).save(ROOT / 'impact-input.png')
    (ROOT / 'impact-prompt.txt').write_text(PROMPT, encoding='utf-8')
    print(json.dumps({'box': BOX, 'center': [CX, CY], 'prompt': PROMPT}))
else:
    raw_path = ROOT / 'impact-generated.png'
    with Image.open(raw_path) as im:
        native = im.size
        ai = np.asarray(im.convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS)).astype(np.float32)
    base = np.asarray(Image.open(ROOT / 'impact-input.png').convert('RGB')).astype(np.float32)
    def land(a):
        return (np.minimum(a[..., 2]-a[..., 0], a[..., 1]-a[..., 0]) < 8).astype(np.float32)
    same = (land(ai) == land(base)).astype(np.float32)
    same = cv2.erode(same, np.ones((9, 9), np.uint8))
    lum = cv2.cvtColor(ai.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    base_lum = cv2.cvtColor(base.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    # Replace old blurry luminance detail, rather than stacking texture over it.
    ai_detail = lum - cv2.GaussianBlur(lum, (0, 0), 6)
    old_detail = base_lum - cv2.GaussianBlur(base_lum, (0, 0), 6)
    detail = np.clip(ai_detail - old_detail, -36, 36)
    # Square separable smootherstep: no circular decal, zero border derivative.
    edge = np.minimum(np.arange(SIZE), np.arange(SIZE)[::-1]) / 96
    edge = np.clip(edge, 0, 1)
    edge = edge**3 * (edge * (edge * 6 - 15) + 10)
    weight = edge[:, None] * edge[None, :] * same
    # Ocean gets only tiny color variation, not a land relief/normal overlay.
    weight *= .95 * land(base) + .15 * (1-land(base))
    patch = np.clip(base + (detail * weight)[..., None], 0, 255).astype(np.uint8)
    Image.fromarray(patch).save(ROOT / 'impact-final.png')
    with Image.open(OUT / 'color-8k.png') as im:
        full = im.convert('RGB')
    full.paste(Image.fromarray(patch), BOX)
    full.save(OUT / 'color-8k.png')
    four = np.array(full.resize((4096, 2048), Image.Resampling.LANCZOS))
    four[:, -1] = four[:, 0]
    Image.fromarray(four).save(OUT / 'color-4k.png')
    full.resize((2048, 1024), Image.Resampling.LANCZOS).save(ROOT / 'preview.jpg', quality=95)
    compare = Image.new('RGB', (SIZE*2, SIZE))
    compare.paste(Image.fromarray(base.astype(np.uint8)), (0, 0))
    compare.paste(Image.fromarray(patch), (SIZE, 0))
    compare.save(ROOT / 'impact-before-after.png')
    assert np.array_equal(patch[0], base[0].astype(np.uint8))
    assert np.array_equal(patch[:, 0], base[:, 0].astype(np.uint8))
    report = {'native_size': native, 'atlas_patch_size': [SIZE, SIZE], 'box': BOX,
        'center': [CX, CY], 'land_disagreement_fraction': float(np.mean(land(ai) != land(base))),
        'method': 'Coordinate-locked high-frequency detail transfer; smooth rectangular feather; unchanged material masks.',
        'preimpact': True, 'new_island_or_crater_painted': False}
    (ROOT / 'impact-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))
