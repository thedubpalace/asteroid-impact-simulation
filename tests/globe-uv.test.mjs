import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../src/js/02-noise-terrain.js', import.meta.url), 'utf8');
const fn = source.match(/function latLonToVec\(lat, lon, r\) \{[\s\S]*?\n      \}/)[0];
class Vector3 { constructor(x, y, z) { Object.assign(this, { x, y, z }); } }
const convert = vm.runInNewContext(fn + ';latLonToVec', { THREE: { Vector3 }, Math });

test('longitude and latitude agree with Three SphereGeometry UVs', () => {
  for (const latitude of [-80, -30, 0, 21.4, 80]) {
    for (const longitude of [-180, -89.5, -45, 0, 90, 179]) {
      const lat = latitude * Math.PI / 180, lon = longitude * Math.PI / 180;
      const p = convert(lat, lon, 2.4);
      const u = (lon + Math.PI) / (2 * Math.PI), theta = Math.PI / 2 - lat;
      const expected = [-2.4 * Math.cos(u * 2 * Math.PI) * Math.sin(theta),
        2.4 * Math.cos(theta), 2.4 * Math.sin(u * 2 * Math.PI) * Math.sin(theta)];
      [p.x, p.y, p.z].forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-10));
    }
  }
});

test('western impact longitude uses positive Z, not eastern hemisphere', () => {
  assert.ok(convert(21.4 * Math.PI / 180, -89.5 * Math.PI / 180, 2.4).z > 0);
});
