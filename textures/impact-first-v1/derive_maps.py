"""Derive aligned material maps from the three impact-first albedo images.

These are synthetic artistic material maps, not survey elevation or bathymetry.
Every output keeps the source image's exact dimensions and pixel registration.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / '.cache/texture-stitch-deps'))
import cv2
import numpy as np


def smoothstep(lo, hi, value):
    x = np.clip((value-lo)/(hi-lo), 0, 1)
    return x*x*(3-2*x)


def make_maps(name):
    albedo = cv2.imread(str(ROOT / f'{name}.png'), cv2.IMREAD_COLOR)
    if albedo is None:
        raise FileNotFoundError(name)
    rgb = cv2.cvtColor(albedo, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    hsv = cv2.cvtColor(albedo, cv2.COLOR_BGR2HSV).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Blue/cyan dominance identifies deep and shallow water while pale dry
    # land stays land. Blur gives shore pixels an honest intermediate value.
    cyan = np.minimum(g-r, b-r)
    blue = b-r
    water = np.maximum(smoothstep(0.035, 0.14, cyan), smoothstep(0.12, 0.32, blue))
    water *= 0.86 + 0.14 * smoothstep(30, 150, hsv[..., 1])
    water = cv2.GaussianBlur(water, (0, 0), 1.2)
    water = np.clip(water, 0, 1)
    land = 1-water

    lum = cv2.cvtColor(albedo, cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    coarse = cv2.GaussianBlur(lum, (0, 0), max(4, min(albedo.shape[:2]) / 38))
    detail = np.abs(lum-cv2.GaussianBlur(lum, (0, 0), 1.25))
    edge = np.sqrt(cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3)**2 +
                   cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3)**2)
    # Synthetic land-only relief: broad brightness variation supplies slopes,
    # fine grain supplies only modest local relief; open water stays flat.
    height = land * np.clip(0.14 + 0.64*coarse + 0.55*detail + 0.22*edge, 0, 1)
    height = cv2.GaussianBlur(height, (0, 0), 0.55)
    height16 = np.round(height*65535).astype(np.uint16)
    dx = cv2.Sobel(height, cv2.CV_32F, 1, 0, ksize=3)
    dy = cv2.Sobel(height, cv2.CV_32F, 0, 1, ksize=3)
    normal = np.dstack((-dx*7.5, -dy*7.5, np.ones_like(height)))
    normal /= np.maximum(np.linalg.norm(normal, axis=2, keepdims=True), 1e-6)
    normal = np.round((normal*0.5+0.5)*255).astype(np.uint8)
    normal = cv2.cvtColor(normal, cv2.COLOR_RGB2BGR)

    # Water is smooth; sandy shelves and textured land scatter more light.
    shore = 4*water*(1-water)
    roughness = np.clip(0.08*water + land*(0.68 + 0.23*detail + 0.14*edge) + 0.26*shore, 0, 1)
    roughness8 = np.round(roughness*255).astype(np.uint8)
    out = ROOT / 'maps'
    out.mkdir(exist_ok=True)
    cv2.imwrite(str(out / f'{name}-water.png'), np.round(water*255).astype(np.uint8))
    cv2.imwrite(str(out / f'{name}-roughness.png'), roughness8)
    cv2.imwrite(str(out / f'{name}-height.png'), height16)
    cv2.imwrite(str(out / f'{name}-normal.png'), normal)
    return {
        'name': name, 'size': [int(albedo.shape[1]), int(albedo.shape[0])],
        'water_fraction': float(np.mean(water > 0.5)),
        'height_range': [int(height16.min()), int(height16.max())],
        'roughness_range': [int(roughness8.min()), int(roughness8.max())]
    }


if __name__ == '__main__':
    reports = [make_maps(name) for name in ('world', 'region', 'impact')]
    hashes = {}
    for path in sorted((ROOT / 'maps').glob('*.png')):
        hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    (ROOT / 'maps.json').write_text(json.dumps({'method':
        'Color-classified water; synthetic land-only height; Sobel tangent normals; roughness from water, shore and local texture.',
        'reports': reports, 'sha256': hashes}, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'reports': reports, 'files': len(hashes)}, indent=2))
