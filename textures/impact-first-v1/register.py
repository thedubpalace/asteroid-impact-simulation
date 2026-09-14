"""Measure image alignment for runtime UV transforms; never resample the PNGs."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parents[1] / '.cache/texture-stitch-deps'))
import cv2
import numpy as np


def register(source_name, target_name):
    source = cv2.imread(str(ROOT / source_name))
    target = cv2.imread(str(ROOT / target_name))
    sift = cv2.SIFT_create(nfeatures=20000, contrastThreshold=0.015)
    kp1, d1 = sift.detectAndCompute(cv2.cvtColor(source, cv2.COLOR_BGR2GRAY), None)
    kp2, d2 = sift.detectAndCompute(cv2.cvtColor(target, cv2.COLOR_BGR2GRAY), None)
    d1 = np.sqrt(d1 / (d1.sum(axis=1, keepdims=True) + 1e-8))
    d2 = np.sqrt(d2 / (d2.sum(axis=1, keepdims=True) + 1e-8))
    matches = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.76 * b.distance]
    record = {'source': source_name, 'target': target_name, 'matches': len(matches)}
    if len(matches) < 6:
        raise RuntimeError(f'Insufficient feature matches: {record}')
    a = np.float32([kp1[m.queryIdx].pt for m in matches])
    b = np.float32([kp2[m.trainIdx].pt for m in matches])
    # An affine transform preserves a flat map and cannot fold its corners.
    affine, inliers = cv2.estimateAffine2D(a, b, method=cv2.RANSAC,
        ransacReprojThreshold=3, maxIters=20000, confidence=0.999, refineIters=20)
    if affine is None:
        raise RuntimeError(f'No stable transform: {record}')
    good = inliers.ravel().astype(bool)
    matrix = np.vstack([affine, [0, 0, 1]])
    error = np.linalg.norm(cv2.transform(a[None], affine)[0] - b, axis=1)
    h, w = source.shape[:2]
    corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    footprint = cv2.transform(corners[None], affine)[0]
    record.update(source_size=[w, h], target_size=[target.shape[1], target.shape[0]],
        matrix=matrix.tolist(), inliers=int(good.sum()),
        median_error_px=float(np.median(error[good])),
        source_hull_fraction=float(cv2.contourArea(cv2.convexHull(a[good])) / (w*h)),
        footprint=footprint.tolist())
    if good.sum() < 6 or np.linalg.det(affine[:, :2]) <= 0:
        raise RuntimeError(f'Invalid registration: {record}')
    return record


if __name__ == '__main__':
    cv2.setRNGSeed(17)
    records = [register('impact.png', 'region.png'), register('region.png', 'world.png')]
    (ROOT / 'registration.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf8')
    print(json.dumps(records, indent=2))
