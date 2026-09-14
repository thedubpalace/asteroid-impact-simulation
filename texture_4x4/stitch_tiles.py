"""Conservative master-registered mosaic; no generative pixels or source edits.

Requires numpy and opencv-python-headless. Run register_tiles.py first.
The master anchors geography and low-frequency color. Only locally consistent
tile detail is admitted; unverified areas retain the interpolated master.
"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / '.cache' / 'texture-stitch-deps'))
import cv2
import numpy as np


def water(image):
    b, g, r = cv2.split(image.astype(np.float32))
    return np.clip((np.minimum(b - r, g - r) - 4) / 16, 0, 1)


def main():
    cv2.setNumThreads(4)
    master = cv2.imread(str(ROOT / 'master.png'))
    height, width = master.shape[:2]
    out_w, out_h = 4096, 2048
    base = cv2.resize(master, (out_w, out_h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    master_gray = cv2.cvtColor(master, cv2.COLOR_BGR2GRAY)
    master_water = water(master)
    grid_y, grid_x = np.mgrid[:height, :width].astype(np.float32)
    detail_sum = np.zeros_like(base)
    total_weight = np.zeros((out_h, out_w), np.float32)
    coverage = np.zeros((height, width), np.float32)
    records = json.loads((ROOT / 'registration.json').read_text(encoding='utf-8'))
    report = {'output_size': [out_w, out_h], 'tiles': []}
    for record in records:
        letter = record['tile']
        if record.get('inliers', 0) < 20 or record.get('source_hull_fraction', 0) < 0.12:
            report['tiles'].append({'tile': letter, 'used': False, 'reason': 'Insufficient spatially distributed matches'})
            print(f'{letter}: skipped (insufficient support)', flush=True)
            continue
        tile = cv2.imread(str(ROOT / f'{letter}.png'))
        matrix = np.array(record['matrix'], dtype=np.float64)
        warped = cv2.warpPerspective(tile, matrix, (width, height))
        valid = cv2.warpPerspective(np.ones(tile.shape[:2], np.uint8), matrix, (width, height))
        # Do not extrapolate a homography far outside the matched feature hull.
        hull_mask = np.zeros((height, width), np.uint8)
        hull = cv2.convexHull(np.float32(record['target_points'])).astype(np.int32)
        cv2.fillConvexPoly(hull_mask, hull, 1)
        hull_mask = cv2.dilate(hull_mask, np.ones((41, 41), np.uint8))
        support = valid * hull_mask
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        flow_engine = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
        flow = flow_engine.calc(master_gray, gray, None)
        reverse = flow_engine.calc(gray, master_gray, None)
        sample_x, sample_y = grid_x + flow[..., 0], grid_y + flow[..., 1]
        aligned = cv2.remap(warped, sample_x, sample_y, cv2.INTER_LINEAR)
        reverse_sample = cv2.remap(reverse, sample_x, sample_y, cv2.INTER_LINEAR)
        consistency = np.linalg.norm(flow + reverse_sample, axis=2)
        movement = np.linalg.norm(flow, axis=2)
        support = cv2.remap(support, sample_x, sample_y, cv2.INTER_NEAREST)
        edge = np.minimum(cv2.distanceTransform(support, cv2.DIST_L2, 3) / 18, 1)
        color_error = np.mean(np.abs(cv2.GaussianBlur(aligned.astype(np.float32), (0, 0), 1.5)
            - cv2.GaussianBlur(master.astype(np.float32), (0, 0), 1.5)), axis=2)
        coast_error = np.abs(water(aligned) - master_water)
        confidence = (edge * np.exp(-(consistency / 1.8) ** 2)
            * np.exp(-(color_error / 26) ** 2) * np.exp(-(coast_error / 0.3) ** 2))
        confidence[movement > 16] = 0
        confidence[consistency > 4] = 0
        confidence = cv2.GaussianBlur(confidence, (0, 0), 1.2)
        confidence *= support
        # Sample the original full-resolution tile once, not the small warp.
        inverse = np.linalg.inv(matrix)
        sx = cv2.resize(sample_x, (out_w, out_h))
        sy = cv2.resize(sample_y, (out_w, out_h))
        denominator = inverse[2, 0] * sx + inverse[2, 1] * sy + inverse[2, 2]
        tx = ((inverse[0, 0] * sx + inverse[0, 1] * sy + inverse[0, 2]) / denominator).astype(np.float32)
        ty = ((inverse[1, 0] * sx + inverse[1, 1] * sy + inverse[1, 2]) / denominator).astype(np.float32)
        high = cv2.remap(tile, tx, ty, cv2.INTER_CUBIC).astype(np.float32)
        # Transfer detail while keeping master color/lighting at broad scales.
        difference = high - base
        difference -= cv2.GaussianBlur(difference, (0, 0), 10)
        weight = cv2.resize(confidence, (out_w, out_h))
        detail_sum += difference * weight[..., None]
        total_weight += weight
        coverage = np.maximum(coverage, confidence)
        entry = {'tile': letter, 'used': True, 'inliers': record['inliers'],
            'globe_fraction_confident': float(np.mean(confidence > 0.35))}
        report['tiles'].append(entry)
        print(f'{letter}: used, confident globe coverage {entry["globe_fraction_confident"]:.1%}', flush=True)
    result = np.clip(base + detail_sum / np.maximum(total_weight, 1)[..., None], 0, 255).astype(np.uint8)
    # Explicitly retain the master's unsupported polar and longitude-edge bands.
    # Do not fabricate a seamless polar reconstruction where no evidence exists.
    output = ROOT / 'earth_stitched_4096.png'
    assert cv2.imwrite(str(output), result)
    report['globe_fraction_confident'] = float(np.mean(coverage > 0.35))
    report['limitations'] = ['4096x2048 canvas is not uniform native 4K detail.',
        'Unsupported regions retain interpolated master pixels.',
        'Master longitude seam and polar artifacts are preserved, not reconstructed.',
        'Color-derived material masks remain approximate; no height map is inferred.']
    (ROOT / 'stitch-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    cv2.imwrite(str(ROOT / 'stitch-coverage.png'), (coverage * 255).astype(np.uint8))
    # Matched-size before/after crops for visual QA, not an upscaling claim.
    crops = [(900, 180, 600, 450), (1700, 400, 600, 450), (1800, 950, 600, 450)]
    sheet = np.zeros((3 * 490, 1200, 3), np.uint8)
    for i, (x, y, w, h) in enumerate(crops):
        sheet[i * 490 + 40:(i + 1) * 490, :600] = base[y:y+h, x:x+w].astype(np.uint8)
        sheet[i * 490 + 40:(i + 1) * 490, 600:] = result[y:y+h, x:x+w]
        cv2.putText(sheet, 'MASTER resized', (10, i * 490 + 28), cv2.FONT_HERSHEY_SIMPLEX, .65, (255,255,255), 1)
        cv2.putText(sheet, 'REGISTERED TILE DETAIL', (610, i * 490 + 28), cv2.FONT_HERSHEY_SIMPLEX, .65, (255,255,255), 1)
    cv2.imwrite(str(ROOT / 'stitch-comparison.jpg'), sheet)
    print(json.dumps({'output': str(output), 'confident_coverage': report['globe_fraction_confident']}), flush=True)


if __name__ == '__main__':
    main()
