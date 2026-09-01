      function paintCretaceous(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          const lat = Math.abs(ny * 2 - 1);
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const i = (y * w + x) * 4;
            const elev = sampleField(elevField, MAP_W, MAP_H, nx, ny);
            const mountains = sampleField(mtnField, MAP_W, MAP_H, nx, ny);
            const n = fbm(nx * 20, ny * 36);
            const n2 = fbm(nx * 48 + 3.1, ny * 80 + 1.7);
            const n3 = fbm(nx * 96, ny * 160);
            const grain = noise2(nx * 240 + 1.7, ny * 400 + 0.4);
            const clump = noise2(nx * 72 + 4.2, ny * 118 + 2.8);
            const coast = coastSample(nx, ny);
            let r, g, b;
            if (coast > 0.40) {
              const hgt = Math.max(0, (elev - 0.40) / 0.75);
              const arid = n * (1 - lat * 0.85);
              const peak = mountains * (0.55 + hgt * 0.9);
              const forest = n2 * 0.62 + n3 * 0.38;
              if (lat > 0.82 || (lat > 0.72 && (hgt > 0.38 || peak > 0.72))) {
                const crevasse = Math.abs(n3 - 0.5);
                r = 222 + n * 18 + grain * 10;
                g = 228 + n * 12 + grain * 8;
                b = 234 + n2 * 10;
                if (crevasse < 0.07) {
                  const c = 1 - crevasse / 0.07;
                  r -= c * 20; g -= c * 12; b -= c * 6;
                }
              } else if (peak > 0.58 || hgt > 0.54) {
                const band = Math.abs(Math.sin((hgt + n2 * 0.16) * 18.0));
                r = 84 + n * 34 + peak * 78 + band * 18 + grain * 10;
                g = 70 + n * 20 + peak * 36 + band * 8;
                b = 56 + n * 14 + peak * 18;
                if (peak > 0.76 && lat > 0.32) {
                  const snow = (peak - 0.76) / 0.24;
                  r += (216 + n * 14 - r) * snow;
                  g += (220 + n * 10 - g) * snow;
                  b += (224 + n2 * 8 - b) * snow;
                }
              } else if (arid > 0.58 && lat < 0.46 && forest < 0.58) {
                const dune = Math.abs(Math.sin(nx * 88 + n * 8 + ny * 14));
                r = 184 + n * 30 + n3 * 8 + dune * 16 + grain * 8;
                g = 146 + n * 18 + dune * 8;
                b = 72 + n * 12 + grain * 6;
              } else if (forest > 0.42 && lat < 0.72 && hgt < 0.50) {
                const deep = (forest - 0.42) / 0.58;
                const gap = clump > 0.7 ? (clump - 0.7) / 0.3 : 0;
                r = 22 + n * 12 + (1 - deep) * 28 + gap * 34 + grain * 8;
                g = 78 + n * 22 + deep * 52 + n3 * 12 - gap * 16 + grain * 6;
                b = 28 + n * 8 + n2 * 6 + gap * 8;
              } else if (hgt > 0.20) {
                r = 70 + n * 22 + n3 * 8 + grain * 8;
                g = 116 + n * 22 + n2 * 10 + grain * 6;
                b = 42 + n * 10;
              } else {
                r = 36 + n * 16 + clump * 10;
                g = 116 + n * 22 + n2 * 12 + grain * 8;
                b = 48 + n * 10;
              }
              if (elev < 0.472) {
                const t = (0.472 - elev) / 0.072;
                if (t > 0.52) {
                  const beach = (t - 0.52) / 0.48;
                  r += (214 + n * 12 - r) * beach;
                  g += (186 + n * 10 - g) * beach;
                  b += (118 + n2 * 8 - b) * beach;
                } else {
                  const plain = t / 0.52;
                  r += (96 + n * 14 - r) * plain * 0.5;
                  g += (130 + n * 10 - g) * plain * 0.32;
                  b += (68 + n2 * 8 - b) * plain * 0.22;
                }
              }
              const river = Math.abs(fbm(nx * 12 + 1.4, ny * 20 + 2.2) - 0.5);
              if (river < 0.017 && hgt < 0.52 && elev > 0.418) {
                const wet = 1 - river / 0.017;
                const body = wet * wet;
                const bank = wet * (1 - body);
                r += (14 - r) * body + (30 - r) * bank * 0.42;
                g += (76 - g) * body + (110 - g) * bank * 0.32;
                b += (108 - b) * body + (50 - b) * bank * 0.18;
              }
              r += (n3 - 0.5) * 10 + (grain - 0.5) * 8;
              g += (n2 - 0.5) * 8 + (grain - 0.5) * 6;
              b += (n - 0.5) * 5;
            } else {
              const depth = Math.max(0, 0.40 - elev);
              if (elev > 0.348) {
                const sh = (elev - 0.348) / 0.052;
                r = 18 + n * 10 + sh * 38 + grain * sh * 16;
                g = 130 + n * 14 + sh * 30 + grain * sh * 8;
                b = 136 + n2 * 10 + sh * 24;
              } else if (lat > 0.84) {
                r = 176 + n * 26 + grain * 10;
                g = 202 + n * 16;
                b = 216 + n2 * 10;
              } else {
                const current = Math.abs(Math.sin(ny * 22 + n * 6 + nx * 8));
                r = 3 + depth * 8 + current * 4;
                g = 36 + (1 - depth) * 72 + n * 10 + n2 * 8 + current * 8;
                b = 86 + (1 - depth) * 64 + n2 * 10 + current * 6;
              }
            }
            d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
            d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
            d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function canvasTex(draw, w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        draw(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
        t.anisotropy = 8;
        t.generateMipmaps = true;
        return t;
      }

      function loadImage(src) {
        return new Promise((res, rej) => {
          const im = new Image();
          im.crossOrigin = 'anonymous';
          im.onload = () => res(im);
          im.onerror = () => rej(new Error('image load failed: ' + src));
          im.src = src;
        });
      }
      // wrap an already-decoded <img> as a globe texture: sRGB for colour maps,
      // linear for data maps (bump / roughness / masks); repeat on S so the
      // equirectangular seam is invisible, clamp on T for the poles
      function imgTex(img, linear) {
        const t = new THREE.Texture(img);
        t.encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
        t.wrapS = THREE.RepeatWrapping;
        t.anisotropy = 8;
        t.needsUpdate = true;
        return t;
      }

      function paintBump(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const elev = sampleField(elevField, MAP_W, MAP_H, nx, ny);
            const mountains = sampleField(mtnField, MAP_W, MAP_H, nx, ny);
            const n = fbm(nx * 26, ny * 48);
            const grain = noise2(nx * 220 + 3.1, ny * 360 + 1.4);
            const ridge = Math.abs(Math.sin((elev + mountains * 0.35 + n * 0.08) * 22.0));
            let v;
            if (elev > 0.40) {
              const hgt = (elev - 0.40) / 0.75;
              v = 102 + hgt * 168 + mountains * 92 + n * 18 + grain * 14 + ridge * mountains * 22;
              if (elev < 0.47) v += (0.47 - elev) * 90;
            } else {
              const swell = Math.abs(Math.sin(ny * 18 + n * 5 + nx * 7));
              v = 28 + n * 10 + Math.max(0, elev) * 22 + swell * 8 + grain * 5;
              if (elev > 0.34) v += (elev - 0.34) * 80;
            }
            if (elev > 0.418) {
              const river = Math.abs(fbm(nx * 12 + 1.4, ny * 20 + 2.2) - 0.5);
              if (river < 0.017) v -= (1 - river / 0.017) * 42;
            }
            const i = (y * w + x) * 4;
            v = v < 0 ? 0 : v > 255 ? 255 : v;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function paintSpec(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const elev = coastSample(nx, ny);
            const mountains = sampleField(mtnField, MAP_W, MAP_H, nx, ny);
            const i = (y * w + x) * 4;
            let v;
            if (elev < 0.40) {
              const depth = Math.max(0, 0.40 - elev);
              v = 118 + depth * 70;
            } else {
              const hgt = (elev - 0.40) / 0.75;
              v = 228 - mountains * 36 - hgt * 22;
              if (elev < 0.46) v -= (0.46 - elev) * 90;
            }
            d[i] = d[i + 1] = d[i + 2] = v < 90 ? 90 : v > 255 ? 255 : v;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function paintWater(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          for (let x = 0; x < w; x++) {
            const elev = coastSample(x / w, ny);
            const i = (y * w + x) * 4;
            let v = 0;
            if (elev < 0.40) {
              const depth = Math.max(0, 0.40 - elev);
              v = 160 + depth * 90;
            } else if (elev < 0.418) {
              v = (0.418 - elev) / 0.018 * 70;
            }
            d[i] = d[i + 1] = d[i + 2] = v > 255 ? 255 : v;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function paintClouds(ctx, w, h, dens, scale) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const s = scale || 1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const nx = x / w, ny = y / h;
            const bands = fbm(nx * 8 * s, ny * 18 * s);
            const swirl = fbm(nx * 20 * s + 4, ny * 7 * s);
            const clumps = fbm(nx * 32 * s + 9, ny * 26 * s);
            const lat = Math.abs(ny * 2 - 1);
            const belt = 0.18 + Math.cos(lat * Math.PI * 1.6) * 0.12;
            const v = Math.max(0, bands * 0.5 + swirl * 0.32 + clumps * 0.28 - (dens || 0.28) + belt);
            const a = Math.min(255, v * 560);
            const i = (y * w + x) * 4;
            d[i] = d[i + 1] = d[i + 2] = 255;
            d[i + 3] = a;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function paintFog(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const nx = x / w, ny = y / h;
            const haze = fbm(nx * 5, ny * 9);
            const lat = Math.abs(ny * 2 - 1);
            const v = Math.max(0, haze * 0.7 + (1 - lat) * 0.18 - 0.22);
            const i = (y * w + x) * 4;
            d[i] = 210; d[i + 1] = 220; d[i + 2] = 230;
            d[i + 3] = Math.min(255, v * 210);
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function paintNight(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const elev = coastSample(nx, ny);
            const i = (y * w + x) * 4;
            let r = 0, g = 0, b = 0, a = 0;
            if (elev > 0.41 && Math.abs(ny * 2 - 1) < 0.72) {
              const city = fbm(nx * 48 + 2, ny * 80 + 5);
              const dense = fbm(nx * 100, ny * 150);
              if (city > 0.64) {
                const glow = (city - 0.64) * 2.5 * dense;
                r = 255; g = 180 + dense * 40; b = 90;
                a = Math.min(255, glow * 220);
              }
            }
            d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      let earthMap = placeholderTex('#16324a');
      let bumpMap = placeholderTex('#404040');
      let specMap = placeholderTex('#202020');
      let waterMap = placeholderTex('#c8c8c8');
      let nightMap = placeholderTex('#000000');
      const earthGroup = new THREE.Group();
      scene.add(earthGroup);

