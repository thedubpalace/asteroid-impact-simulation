"""Prepare fixed-coordinate 4x4 crops with 128-pixel context borders."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
W, H, PAD = 8192, 4096, 128
source = ROOT.parent / 'textures/earth_cretaceous_color.jpg'
with Image.open(source) as image:
    original_size = image.size
    base = np.asarray(image.convert('RGB').resize((W, H), Image.Resampling.LANCZOS))
(ROOT / 'inputs').mkdir(parents=True, exist_ok=True)
(ROOT / 'generated').mkdir(exist_ok=True)
manifest = {'source': str(source), 'source_size': original_size, 'output_size': [W, H], 'padding': PAD, 'tiles': []}
for row in range(4):
    for col in range(4):
        name = chr(65 + row * 4 + col)
        x, y = col * 2048, row * 1024
        yy = np.arange(y - PAD, y + 1024 + PAD)
        xx = np.arange(x - PAD, x + 2048 + PAD)
        polar = (yy < 0) | (yy >= H)
        yy = np.where(yy < 0, -yy - 1, np.where(yy >= H, 2 * H - yy - 1, yy))
        pixels = base[yy[:, None], (xx[None, :] + polar[:, None] * (W // 2)) % W]
        path = ROOT / 'inputs' / f'{name}.png'
        Image.fromarray(pixels).save(path)
        prompt = (
            'Use case: precise-object-edit. Image 1 is the exact edit target, a fixed geographic crop '
            'from a globe surface texture, NOT a reference for a new composition. '
            f'This is tile {name} of a locked 4x4 equirectangular map. '
            'Return a single 2304x1280 landscape raster matching the supplied framing exactly. '
            'Improve only fine surface detail: photorealistic satellite-scale forest canopy variation, '
            'subtle rock and sediment grain, coherent fine drainage within existing land, natural terrain microstructure. '
            'Keep every coastline, island outline, land/water boundary, mountain belt, lake, river mouth and all large '
            'features at the EXACT SAME PIXEL POSITIONS. No panning, zooming, reframing, stretching, rotating or relocating geography. '
            'Preserve the outer 128-pixel context border and the low-frequency color palette. '
            'Dark blue and cyan are WATER, not land: keep the ocean smooth, subdued and free of invented rocky relief. '
            'This is an unlit base-color/albedo asset: neutral diffuse illumination, no shadows or directional highlights, '
            'no clouds, atmospheric haze, vignette, glare, specular reflections or depth-of-field. '
            'No new islands, no cities, roads, borders, grid, labels, text, symbols or watermark. '
            'Do not draw a whole globe or a world map: enhance ONLY the exact crop supplied. '
            'The region is an illustrative warm late-Cretaceous world; do not add polar ice.'
        )
        manifest['tiles'].append({'name': name, 'core': [x, y, 2048, 1024], 'input': str(path), 'prompt': prompt})
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'Prepared 16 fixed crops at 2304x1280 from {original_size}; target {W}x{H}')
