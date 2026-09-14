"""Read-only pixel checks for the exported atlas and local detail patch."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'textures/hybrid8k'
for path in OUT.glob('*.png'):
    with Image.open(path) as im:
        expected = (8192, 4096) if '-8k' in path.name else (4096, 2048)
        assert im.size == expected, (path.name, im.size)
        im.verify()
water = np.array(Image.open(OUT / 'water-8k.png'))
height = np.array(Image.open(OUT / 'height-8k.png'))
normal = np.array(Image.open(OUT / 'normal-8k.png'))
assert np.max(height[water == 255]) == 0
assert np.all(normal[water == 255] == [128, 128, 255])
color = np.array(Image.open(OUT / 'color-8k.png'))
assert np.array_equal(color[:, 0], color[:, -1])
assert np.all(color[0] == color[0, 0])
assert np.all(color[-1] == color[-1, 0])
if (ROOT / 'impact-final.png').exists():
    before = np.array(Image.open(ROOT / 'impact-input.png'))
    after = np.array(Image.open(ROOT / 'impact-final.png'))
    for a, b in [(before[0], after[0]), (before[-1], after[-1]),
                 (before[:, 0], after[:, 0]), (before[:, -1], after[:, -1])]:
        assert np.array_equal(a, b), 'Patch edge changed'
    report = json.loads((ROOT / 'impact-report.json').read_text())
    x0, y0, x1, y1 = report['box']
    assert np.array_equal(color[y0:y1, x0:x1], after)
print('PASS: dimensions, PNG integrity, flat-water height/normals, longitude seam, poles, local patch edges and placement')
