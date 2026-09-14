"""Measure tile-to-master feature alignment; leave source images untouched."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / '.cache' / 'texture-stitch-deps'))
import cv2
import numpy as np


def features(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    points, descriptors = cv2.SIFT_create(nfeatures=18000, contrastThreshold=0.025).detectAndCompute(gray, None)
    # RootSIFT improves matching under moderate contrast/color changes.
    descriptors /= descriptors.sum(axis=1, keepdims=True) + 1e-8
    return points, np.sqrt(descriptors)


def register():
    master = cv2.imread(str(ROOT / 'master.png'))
    master_points, master_descriptors = features(master)
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    records = []
    for letter in 'ABCDEFGHIJKLMNOP':
        tile = cv2.imread(str(ROOT / f'{letter}.png'))
        points, descriptors = features(tile)
        candidates = matcher.knnMatch(descriptors, master_descriptors, k=2)
        matches = [first for first, second in candidates if first.distance < 0.72 * second.distance]
        record = {'tile': letter, 'matches': len(matches)}
        if len(matches) >= 8:
            source = np.float32([points[m.queryIdx].pt for m in matches])
            target = np.float32([master_points[m.trainIdx].pt for m in matches])
            matrix, inliers = cv2.findHomography(source, target, cv2.RANSAC, 3.0, maxIters=10000, confidence=0.999)
            if matrix is not None:
                good = inliers.ravel().astype(bool)
                projected = cv2.perspectiveTransform(source[None], matrix)[0]
                errors = np.linalg.norm(projected - target, axis=1)
                h, w = tile.shape[:2]
                corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
                footprint = cv2.perspectiveTransform(corners[None], matrix)[0]
                hull = cv2.convexHull(source[good])
                record.update(matrix=matrix.tolist(), inliers=int(good.sum()),
                    inlier_fraction=float(good.mean()), median_error=float(np.median(errors[good])),
                    p90_error=float(np.percentile(errors[good], 90)),
                    source_hull_fraction=float(cv2.contourArea(hull) / (w * h)),
                    footprint=footprint.tolist(),
                    source_points=source[good].tolist(), target_points=target[good].tolist())
        records.append(record)
        print(json.dumps({key: value for key, value in record.items()
            if key not in ('matrix', 'source_points', 'target_points')}), flush=True)
    output = ROOT / 'registration.json'
    output.write_text(json.dumps(records, indent=2), encoding='utf-8')
    print(f'Saved {output}', flush=True)


if __name__ == '__main__':
    register()
