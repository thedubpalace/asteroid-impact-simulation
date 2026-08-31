      function makeStars(count, radius, size, color) {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const r = radius * (0.55 + Math.random() * 0.45);
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          pos[i * 3 + 2] = r * Math.cos(phi);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return new THREE.Points(g, new THREE.PointsMaterial({
          color, size, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false
        }));
      }
      scene.add(makeStars(1400, 90, 0.1, 0xffffff));
      scene.add(makeStars(500, 70, 0.18, 0xc9ddff));

      function latLonToVec(lat, lon, r) {
        const cl = Math.cos(lat);
        return new THREE.Vector3(r * cl * Math.cos(lon), r * Math.sin(lat), r * cl * Math.sin(lon));
      }
      const impactPoint = latLonToVec(IMPACT_LAT, IMPACT_LON, EARTH_R);
      const impactNormal = impactPoint.clone().normalize();

      function hash2(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
      }
      function noise2(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const n00 = hash2(xi, yi), n10 = hash2(xi + 1, yi);
        const n01 = hash2(xi, yi + 1), n11 = hash2(xi + 1, yi + 1);
        return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
      }
      function fbm(x, y) {
        return noise2(x, y) * 0.46 + noise2(x * 2.07, y * 2.07) * 0.24 + noise2(x * 4.13, y * 4.13) * 0.14
          + noise2(x * 8.3, y * 8.3) * 0.09 + noise2(x * 16.7, y * 16.7) * 0.05 + noise2(x * 33, y * 33) * 0.02;
      }
      function ridge(x, y) {
        return 1 - Math.abs(fbm(x, y) * 2 - 1);
      }

      function blobField(nx, ny, blobs) {
        let d = 0;
        for (let i = 0; i < blobs.length; i++) {
          const b = blobs[i];
          const dx = (nx - b[0]) / b[2];
          const dy = (ny - b[1]) / b[3];
          const rot = b[4] || 0;
          const c = Math.cos(rot), s = Math.sin(rot);
          const rx = dx * c - dy * s;
          const ry = dx * s + dy * c;
          // smooth falloff — avoids hard oval "box" continents
          const rr = rx * rx + ry * ry;
          const fall = Math.max(0, 1 - rr);
          if (fall > 0) d = Math.max(d, Math.pow(fall, 1.35) * (b[5] || 1));
        }
        return d;
      }

      const CRET_BLOBS = [
        [0.18, 0.34, 0.13, 0.10, 0.4, 1], [0.22, 0.38, 0.09, 0.08, -0.3, 0.9],
        [0.14, 0.42, 0.07, 0.09, 0.6, 0.85], [0.27, 0.32, 0.08, 0.07, 0.2, 0.8],
        [0.20, 0.48, 0.05, 0.07, 0.1, 0.7], [0.16, 0.36, 0.05, 0.045, 1.1, 0.55],
        [0.28, 0.56, 0.07, 0.11, 0.5, 1], [0.32, 0.62, 0.06, 0.10, -0.2, 0.9],
        [0.25, 0.64, 0.05, 0.08, 0.3, 0.75], [0.30, 0.52, 0.04, 0.05, -0.8, 0.5],
        [0.48, 0.42, 0.11, 0.16, 0.15, 1], [0.52, 0.50, 0.09, 0.12, -0.25, 0.95],
        [0.44, 0.36, 0.08, 0.08, 0.4, 0.8], [0.55, 0.38, 0.07, 0.09, 0.1, 0.75],
        [0.50, 0.34, 0.045, 0.055, 0.9, 0.55],
        [0.62, 0.32, 0.16, 0.09, 0.05, 1], [0.70, 0.30, 0.12, 0.08, -0.2, 0.9],
        [0.78, 0.34, 0.10, 0.08, 0.3, 0.85], [0.66, 0.38, 0.09, 0.07, 0.1, 0.7],
        [0.58, 0.28, 0.07, 0.06, 0.4, 0.65], [0.84, 0.38, 0.07, 0.09, -0.15, 0.7],
        [0.64, 0.52, 0.05, 0.06, 0.8, 0.85], [0.74, 0.44, 0.04, 0.06, -0.5, 0.45],
        [0.78, 0.68, 0.09, 0.07, 0.2, 0.95], [0.84, 0.72, 0.07, 0.06, -0.3, 0.8],
        [0.48, 0.86, 0.22, 0.08, 0.05, 1], [0.62, 0.84, 0.12, 0.06, -0.1, 0.8],
        [0.18, 0.18, 0.16, 0.07, 0, 0.55], [0.72, 0.16, 0.14, 0.06, 0.1, 0.5]
      ];

      function warpUV(nx, ny, scale, amount) {
        const wx = (fbm(nx * scale + 11.2, ny * scale + 4.7) - 0.5) * amount;
        const wy = (fbm(nx * scale - 3.8, ny * scale + 19.1) - 0.5) * amount;
        return [nx + wx, ny + wy];
      }

      function landMask(nx, ny) {
        // three-scale warp: large bays, mid fjords/inlets, fine peninsulas — keeps coasts organic, not boxes
        const w1 = warpUV(nx, ny, 3.2, 0.062);
        const w2 = warpUV(w1[0], w1[1], 11.5, 0.018);
        const w3 = warpUV(w2[0], w2[1], 27, 0.009);
        const base = blobField(w3[0], w3[1], CRET_BLOBS);
        const n = fbm(w3[0] * 9.4, w3[1] * 17.2);
        const nMid = fbm(w3[0] * 28 + 2.4, w3[1] * 48 + 1.1);
        const nFine = noise2(w3[0] * 86, w3[1] * 140);
        const nJag = noise2(w3[0] * 190 + 7.3, w3[1] * 310 + 4.8);
        let val = base + (n - 0.5) * 0.46 + (nMid - 0.5) * 0.18 + (nFine - 0.5) * 0.085 + (nJag - 0.5) * 0.034;
        // scattered arc islands near coastal margins, like real continental-shelf archipelagos
        const marginDist = Math.abs(val);
        if (marginDist < 0.14) {
          const isl = noise2(w3[0] * 210 + 12.4, w3[1] * 210 + 5.6) * 0.6
            + noise2(w3[0] * 430 - 3.1, w3[1] * 430 + 8.8) * 0.4;
          val += Math.max(0, isl - 0.74) * (1 - marginDist / 0.14) * 1.4;
        }
        return val;
      }

      function mountainField(nx, ny) {
        const w = warpUV(nx, ny, 5.2, 0.028);
        const a = ridge(w[0] * 10.5 + 1.2, w[1] * 17.5);
        const b = ridge(w[0] * 20.0 - 4.1, w[1] * 29.0 + 2.4);
        return Math.pow(a * 0.62 + b * 0.38, 1.32);
      }

      // Build elevation once, sample for other maps — huge speedup. Nudged up
      // for sharper coastlines/ridges; the colour map is painted higher still
      // (below) so surface grain resolves finer. Kept modest so the one-time
      // bake/paint on load stays a couple of seconds, not tens.
      const MAP_W = 2880, MAP_H = 1440;
      const elevField = new Float32Array(MAP_W * MAP_H);
      const mtnField = new Float32Array(MAP_W * MAP_H);
      async function bakeElevation() {
        const step = 64;
        for (let y0 = 0; y0 < MAP_H; y0 += step) {
          const y1 = Math.min(MAP_H, y0 + step);
          for (let y = y0; y < y1; y++) {
            const ny = y / MAP_H;
            for (let x = 0; x < MAP_W; x++) {
              const nx = x / MAP_W;
              const i = y * MAP_W + x;
              elevField[i] = landMask(nx, ny);
              mtnField[i] = elevField[i] > 0.34 ? mountainField(nx, ny) : 0;
            }
          }
          setLoad(8 + (y1 / MAP_H) * 36, 'Raising continents');
          await yieldFrame();
        }
      }

      function sampleField(field, w, h, nx, ny) {
        const x = Math.max(0, Math.min(w - 1.001, nx * w));
        const y = Math.max(0, Math.min(h - 1.001, ny * h));
        const x0 = x | 0, y0 = y | 0;
        const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
        const tx = x - x0, ty = y - y0;
        const i00 = y0 * w + x0, i10 = y0 * w + x1, i01 = y1 * w + x0, i11 = y1 * w + x1;
        const a = field[i00] + (field[i10] - field[i00]) * tx;
        const b = field[i01] + (field[i11] - field[i01]) * tx;
        return a + (b - a) * ty;
      }

      function coastSample(nx, ny) {
        const elev = sampleField(elevField, MAP_W, MAP_H, nx, ny);
        return elev
          + (noise2(nx * 150, ny * 260) - 0.5) * 0.038
          + (noise2(nx * 340 + 5.1, ny * 560 + 2.4) - 0.5) * 0.016;
      }

