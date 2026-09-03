      // ---- Ground-level extinction scene ---------------------------------
      // After the orbital "nuclear winter" beat the film cuts (through a black
      // wipe) down to the forest floor under the dust pall: dark, ash and acid
      // rain, one theropod that lies down and does not get up. This is a
      // separate THREE.Scene with its own camera/fog/lights, rendered instead
      // of the globe once simTime passes EXT_T0.
      const EXT_T0 = 34, EXT_T1 = 50;
      const groundScene = new THREE.Scene();
      // a pale ash-grey sky/haze is the whole point — the forest and the animal
      // read as dark silhouettes against it, then it drains to black
      groundScene.background = new THREE.Color(0x7a7062);
      groundScene.fog = new THREE.FogExp2(0x7a7062, 0.022);
      const groundCam = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 700);

      // starts as a grim overcast dusk you can actually read, then collapses to
      // black over the back half of the phase as the light dies for good
      const groundAmb = new THREE.AmbientLight(0x3a342c, 0.8);
      const groundKey = new THREE.DirectionalLight(0x9a8b72, 1.6); // diffuse — flat grey lid, no sun disc
      groundKey.position.set(-16, 34, 20);
      const groundHemi = new THREE.HemisphereLight(0x5e5548, 0x141009, 0.75);
      groundScene.add(groundAmb, groundKey, groundHemi);

      const groundSky = new THREE.Mesh(
        new THREE.SphereGeometry(320, 32, 24),
        new THREE.MeshBasicMaterial({
          side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false,
          map: canvasTex((ctx, w, h) => {
            // sunless ash overcast — dark overhead, a bright bruised band at the
            // horizon so the forest and the animal read as hard silhouettes
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0.0, '#201e1b'); g.addColorStop(0.44, '#332f2a');
            g.addColorStop(0.72, '#5a5044'); g.addColorStop(0.88, '#79695331');
            g.addColorStop(0.95, '#807055'); g.addColorStop(1.0, '#5c4c3b');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            // heavy blotchy cloud so there is no clean horizon line — the far
            // forest should dissolve into haze, not butt against a flat lid
            for (let i = 0; i < 520; i++) {
              ctx.fillStyle = `rgba(20,17,13,${0.04 + Math.random() * 0.14})`;
              ctx.beginPath();
              ctx.ellipse(Math.random() * w, h * (0.35 + Math.random() * 0.65),
                60 + Math.random() * 220, 18 + Math.random() * 70, 0, 0, 7);
              ctx.fill();
            }
          }, 1024, 512)
        })
      );
      groundScene.add(groundSky);

      // distant fires seen through the murk — soft, edgeless glow low on the
      // horizon (was a hard-edged 700-wide slab that read as a flat wall)
      const emberBand = new THREE.Mesh(
        new THREE.PlaneGeometry(560, 150),
        new THREE.MeshBasicMaterial({
          map: canvasTex((ctx, w, h) => {
            const g = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.5);
            g.addColorStop(0, 'rgba(255,120,50,0.55)');
            g.addColorStop(0.35, 'rgba(200,80,34,0.24)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 5; i++) {
              const cx = w * (0.2 + Math.random() * 0.6);
              const rg = ctx.createRadialGradient(cx, h * 0.66, 0, cx, h * 0.66, 60 + Math.random() * 90);
              rg.addColorStop(0, 'rgba(255,150,70,0.4)');
              rg.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
            }
          }, 512, 256),
          transparent: true, opacity: 0.45, fog: false,
          toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      emberBand.position.set(-10, 10, -158);
      groundScene.add(emberBand);

      // the last of the daylight forcing through the smoke — a soft bright
      // patch overhead that the thickening pall snuffs out over the phase
      const mistGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(220, 150),
        new THREE.MeshBasicMaterial({
          map: canvasTex((ctx, w, h) => {
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, 'rgba(255,238,205,0.9)');
            g.addColorStop(0.4, 'rgba(210,190,150,0.35)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          }, 256, 256),
          transparent: true, opacity: 0.8, fog: false, toneMapped: false,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      mistGlow.position.set(-30, 34, -150);
      groundScene.add(mistGlow);

      const floorTex = canvasTex((ctx, w, h) => {
        ctx.fillStyle = '#332e26'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 5200; i++) {
          const r = Math.random(), v = 26 + Math.random() * 34;
          ctx.fillStyle = r < 0.7 ? `rgb(${v | 0},${v * 0.88 | 0},${v * 0.64 | 0})`
            : r < 0.9 ? `rgba(66,74,46,${0.12 + Math.random() * 0.22})`
              : `rgba(${150 + Math.random() * 60 | 0},${138 + Math.random() * 50 | 0},128,${0.08 + Math.random() * 0.16})`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
      }, 1024, 1024);
      floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
      floorTex.repeat.set(8, 8);
      const floorGeo = new THREE.PlaneGeometry(420, 420, 60, 60);
      const fpos = floorGeo.attributes.position;
      for (let i = 0; i < fpos.count; i++) {
        const x = fpos.getX(i), y = fpos.getY(i);
        fpos.setZ(i, (fbm(x * 0.03 + 10, y * 0.03 - 4) - 0.5) * 3.0 + (fbm(x * 0.12, y * 0.12) - 0.5) * 0.8);
      }
      floorGeo.computeVertexNormals();
      const forestFloor = new THREE.Mesh(floorGeo,
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1, metalness: 0 }));
      forestFloor.rotation.x = -Math.PI / 2;
      groundScene.add(forestFloor);

      // ---- Forest: instanced Quaternius pine (models/tree.glb, CC0) ---------
      // The tree is a Quaternius "Pine Tree" (Animated? no — static low-poly),
      // CC0 / public domain via Poly Pizza (poly.pizza/u/Quaternius). One mesh,
      // two prims (Wood trunk + Green canopy). Rendered as two InstancedMeshes
      // so a dense stand costs 2 draw calls. Placement biased into the camera's
      // -Z half with a clear lane around the animal; a long tail runs out into
      // the fog so the tree line dissolves instead of ending at an edge.
      const TREE_N = 280;
      const treePlace = [];
      for (let i = 0; i < TREE_N; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 22 + Math.pow(Math.random(), 0.6) * 240;
        let px = Math.cos(ang) * rad;
        let pz = -Math.abs(Math.sin(ang) * rad) - 8;
        if (pz > 12) pz -= 40;
        if (Math.abs(px - 3) < 8 && pz > -26) px += (px < 3 ? -13 : 13);
        const far = clamp01(rad / 262);
        // near trees were landing tall AND close, filling the whole frame —
        // push the min radius out and cap the scale spread so nothing looms
        treePlace.push({
          px, pz,
          sc: (0.75 + Math.random() * 0.75) * (1 - far * 0.28),
          ry: Math.random() * Math.PI * 2,
          lean: Math.random() < 0.22 ? (Math.random() - 0.5) * 0.26 : 0,
          tone: 0.5 + Math.random() * 0.6,
          dead: Math.random() < 0.14,
          // Late-Cretaceous conifer stands weren't uniform narrow pine — a
          // share read as broader, flatter Araucaria-type crowns. No second
          // model to load, so fake the silhouette by squashing/widening the
          // shared canopy mesh's own scale per-instance instead of scaling it
          // evenly like the rest.
          broad: Math.random() < 0.25
        });
      }

      function paintBark(ctx, w, h) {
        const img = ctx.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const nx = x / w, ny = y / h, i = (y * w + x) * 4;
          const fibre = Math.abs(Math.sin((nx * 26 + fbm(nx * 4, ny * 8) * 6) * Math.PI));
          const n = fbm(nx * 10, ny * 22);
          const knot = noise2(nx * 40 + 3, ny * 14 + 7);
          let v = 30 + n * 20 - fibre * 16 + (knot > 0.8 ? -14 : 0);
          v = v < 6 ? 6 : v > 90 ? 90 : v;
          d[i] = v * 1.15; d[i + 1] = v * 0.86; d[i + 2] = v * 0.62; d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      function paintCanopy(ctx, w, h) {
        const img = ctx.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const nx = x / w, ny = y / h, i = (y * w + x) * 4;
          const clump = fbm(nx * 6 + 1.3, ny * 6 + 2.7);
          const needle = noise2(nx * 120, ny * 120);
          const gap = fbm(nx * 14 + 5, ny * 16 + 3);
          let g = 40 + clump * 34 + (needle > 0.62 ? 14 : 0);
          if (gap > 0.66) g -= (gap - 0.66) / 0.34 * 30;          // sky gaps
          g -= (1 - ny) * 10;                                     // darker underside
          const dead = fbm(nx * 5 + 9, ny * 7 + 4);
          const br = dead > 0.72 ? (dead - 0.72) / 0.28 : 0;      // patches of brown
          let r = g * (0.5 + br * 0.9), gg = g * (1.0 - br * 0.35), b = g * (0.42 - br * 0.1);
          d[i] = r < 0 ? 0 : r > 200 ? 200 : r;
          d[i + 1] = gg < 0 ? 0 : gg > 200 ? 200 : gg;
          d[i + 2] = b < 0 ? 0 : b > 200 ? 200 : b;
          d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      const barkTex = canvasTex(paintBark, 128, 256);
      barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping; barkTex.repeat.set(2, 3);
      const canopyTex = canvasTex(paintCanopy, 256, 256);
      canopyTex.wrapS = canopyTex.wrapT = THREE.RepeatWrapping; canopyTex.repeat.set(2, 2);

      const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, color: 0x2a2016, roughness: 1, metalness: 0, fog: true });
      const canopyMat = new THREE.MeshStandardMaterial({ map: canopyTex, color: 0x1b2814, roughness: 1, metalness: 0, fog: true });

      new THREE.GLTFLoader().load('models/tree.glb', (gltf) => {
        gltf.scene.updateWorldMatrix(true, true);
        const src = [];
        gltf.scene.traverse((o) => { if (o.isMesh) src.push(o); });
        const whole = new THREE.Box3().setFromObject(gltf.scene);
        const norm = 13 / Math.max(0.001, whole.max.y - whole.min.y);  // conifers tower over the animal
        const baseY = whole.min.y;
        const prep = (m) => {
          const geo = m.geometry.clone();
          geo.applyMatrix4(m.matrixWorld);        // bake the node's 100x scale + hierarchy
          geo.translate(0, -baseY, 0);
          geo.scale(norm, norm, norm);
          geo.computeBoundingBox();
          const bb = geo.boundingBox, s = new THREE.Vector3(); bb.getSize(s);
          const p = geo.attributes.position, nr = geo.attributes.normal;
          const uv = new Float32Array(p.count * 2);
          for (let k = 0; k < p.count; k++) {
            const ux = (p.getX(k) - bb.min.x) / (s.x || 1);
            const uy = (p.getY(k) - bb.min.y) / (s.y || 1);
            const uz = (p.getZ(k) - bb.min.z) / (s.z || 1);
            const ay = Math.abs(nr ? nr.getY(k) : 0);
            if (ay > 0.6) { uv[k * 2] = ux; uv[k * 2 + 1] = uz; }
            else { uv[k * 2] = (ux + uz); uv[k * 2 + 1] = uy; }
          }
          geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          return geo;
        };
        let trunkGeo = null, canopyGeo = null;
        src.forEach((m) => {
          const g = prep(m);
          if (/wood|bark|trunk|bole/i.test(m.material && m.material.name || '')) trunkGeo = g;
          else canopyGeo = g;
        });
        if (!trunkGeo) trunkGeo = prep(src[0]);
        if (!canopyGeo) canopyGeo = prep(src[src.length - 1]);

        const trunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_N);
        const canopyIM = new THREE.InstancedMesh(canopyGeo, canopyMat, TREE_N);
        trunkIM.frustumCulled = false; canopyIM.frustumCulled = false;
        const mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
        const eul = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
        const c = new THREE.Color();
        treePlace.forEach((t, i) => {
          eul.set(t.lean * 0.4, t.ry, t.lean);
          q.setFromEuler(eul);
          pv.set(t.px, 0, t.pz);
          sv.set(t.sc, t.sc, t.sc);
          mtx.compose(pv, q, sv);
          trunkIM.setMatrixAt(i, mtx);
          const cs = t.dead ? t.sc * 0.5 : t.sc;
          // broad ones: wider, flatter crown instead of the uniform pine scale
          const csXZ = cs * (t.broad ? 1.55 : 1);
          const csY = cs * (t.broad ? 0.62 : 1);
          sv.set(csXZ, csY, csXZ);
          mtx.compose(pv, q, sv);
          canopyIM.setMatrixAt(i, mtx);
          trunkIM.setColorAt(i, c.setRGB(t.tone * 1.0, t.tone * 0.9, t.tone * 0.78));
          canopyIM.setColorAt(i, t.dead
            ? c.setRGB(t.tone * 1.1, t.tone * 0.8, t.tone * 0.45)
            : t.broad
              ? c.setRGB(t.tone * 0.72, t.tone * 0.98, t.tone * 0.86)   // duller blue-green Araucaria cast
              : c.setRGB(t.tone * 0.85, t.tone * 1.05, t.tone * 0.78));
        });
        trunkIM.instanceMatrix.needsUpdate = true;
        canopyIM.instanceMatrix.needsUpdate = true;
        if (trunkIM.instanceColor) trunkIM.instanceColor.needsUpdate = true;
        if (canopyIM.instanceColor) canopyIM.instanceColor.needsUpdate = true;
        groundScene.add(trunkIM, canopyIM);
      });

      // ---- Undergrowth: ferns, cycads/tree-ferns, grass tufts -------------
      // Procedural (no sidecar) alpha-card clumps, one InstancedMesh per type,
      // biased into the near foreground so the forest floor has a layer of
      // planting instead of bare dirt under the trees.
      function frondTex(kind) {
        return canvasTex((ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          if (kind === 'grass') {
            for (let b = 0; b < 7; b++) {
              const bx = w * (0.16 + Math.random() * 0.68);
              const bw2 = w * (0.03 + Math.random() * 0.04);
              const lean = (Math.random() - 0.5) * w * 0.18;
              const g = ctx.createLinearGradient(0, h, 0, 0);
              g.addColorStop(0, 'rgba(44,46,26,0.95)');
              g.addColorStop(1, 'rgba(70,74,40,0.0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.moveTo(bx - bw2, h);
              ctx.quadraticCurveTo(bx + lean, h * 0.4, bx + lean * 1.3, h * 0.05);
              ctx.quadraticCurveTo(bx + lean, h * 0.4, bx + bw2, h);
              ctx.fill();
            }
          } else {
            // feather frond: a rib with pinnae
            ctx.strokeStyle = 'rgba(26,40,20,0.95)';
            ctx.lineWidth = w * 0.03;
            ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.5, h * 0.06); ctx.stroke();
            for (let s = 0; s < 22; s++) {
              const t = s / 21, y = h * (0.95 - t * 0.9);
              const len = w * (0.42 * Math.sin(t * Math.PI) + 0.05);
              ctx.strokeStyle = `rgba(${28 + t * 10 | 0},${44 + t * 14 | 0},${20 + t * 6 | 0},0.9)`;
              ctx.lineWidth = w * 0.018;
              ctx.beginPath(); ctx.moveTo(w * 0.5, y); ctx.lineTo(w * 0.5 - len, y - len * 0.5); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(w * 0.5, y); ctx.lineTo(w * 0.5 + len, y - len * 0.5); ctx.stroke();
            }
          }
        }, 128, 128);
      }
      function toNI(g) { return g.index ? g.toNonIndexed() : g; }
      function mergeGeos(geos) {
        let n = 0;
        geos.forEach((g) => { n += g.attributes.position.count; });
        const P = new Float32Array(n * 3), U = new Float32Array(n * 2), N = new Float32Array(n * 3);
        let o = 0;
        geos.forEach((g) => {
          const p = g.attributes.position, u = g.attributes.uv, nr = g.attributes.normal;
          for (let i = 0; i < p.count; i++) {
            P[(o + i) * 3] = p.getX(i); P[(o + i) * 3 + 1] = p.getY(i); P[(o + i) * 3 + 2] = p.getZ(i);
            U[(o + i) * 2] = u.getX(i); U[(o + i) * 2 + 1] = u.getY(i);
            N[(o + i) * 3] = nr.getX(i); N[(o + i) * 3 + 1] = nr.getY(i); N[(o + i) * 3 + 2] = nr.getZ(i);
          }
          o += p.count;
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
        geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
        return geo;
      }
      // a clump = several upright cards fanned around Y, each tilted out from centre
      function makeClump(blades, wide, tall, tilt, trunkH) {
        const parts = [];
        for (let b = 0; b < blades; b++) {
          const pg = toNI(new THREE.PlaneGeometry(wide * (0.7 + Math.random() * 0.6), tall * (0.7 + Math.random() * 0.6)));
          const m = new THREE.Matrix4(), r = new THREE.Matrix4(), tr = new THREE.Matrix4();
          const ang = (b / blades) * Math.PI * 2 + Math.random() * 0.5;
          const lean = tilt * (0.5 + Math.random() * 0.7);
          r.makeRotationY(ang);
          const rx = new THREE.Matrix4().makeRotationX(-lean);
          tr.makeTranslation(0, trunkH + tall * 0.42 * Math.cos(lean), 0);
          m.multiplyMatrices(r, tr).multiply(rx);
          pg.applyMatrix4(m);
          parts.push(pg);
        }
        if (trunkH > 0.01) {
          const cg = toNI(new THREE.CylinderGeometry(0.05, 0.09, trunkH, 5));
          cg.applyMatrix4(new THREE.Matrix4().makeTranslation(0, trunkH * 0.5, 0));
          parts.push(cg);
        }
        return mergeGeos(parts);
      }

      const fernMat = new THREE.MeshStandardMaterial({
        map: frondTex('fern'), color: 0x6a7250, roughness: 1, metalness: 0,
        transparent: true, alphaTest: 0.45, side: THREE.DoubleSide, fog: true
      });
      const grassMat = new THREE.MeshStandardMaterial({
        map: frondTex('grass'), color: 0x8a8256, roughness: 1, metalness: 0,
        transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, fog: true
      });

      function scatterInstanced(geo, mat, count, minR, maxR, pow, yScaleLo, yScaleHi) {
        const im = new THREE.InstancedMesh(geo, mat, count);
        im.frustumCulled = false;
        const mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
        const pv = new THREE.Vector3(), sv = new THREE.Vector3(), c = new THREE.Color();
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = minR + Math.pow(Math.random(), pow) * (maxR - minR);
          let px = Math.cos(ang) * rad;
          let pz = -Math.abs(Math.sin(ang) * rad) - 4;
          if (pz > 10) pz -= 32;
          if (Math.abs(px - 0.5) < 3.2 && pz > -15) px += (px < 0.5 ? -4 : 4);   // clear round the animal
          const sc = yScaleLo + Math.random() * (yScaleHi - yScaleLo);
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
          pv.set(px, 0, pz);
          sv.set(sc * (0.85 + Math.random() * 0.4), sc, sc * (0.85 + Math.random() * 0.4));
          mtx.compose(pv, q, sv);
          im.setMatrixAt(i, mtx);
          const tone = 0.6 + Math.random() * 0.7;
          const brown = Math.random() < 0.22 ? 0.5 : 0;
          im.setColorAt(i, c.setRGB(tone * (0.8 + brown), tone * (1.0 - brown * 0.3), tone * (0.7 - brown * 0.2)));
        }
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        groundScene.add(im);
        return im;
      }

      scatterInstanced(makeClump(6, 1.7, 1.5, 0.7, 0), fernMat, 360, 3, 78, 1.7, 0.7, 1.5);          // low ferns, near
      scatterInstanced(makeClump(7, 1.4, 2.6, 0.5, 1.1), fernMat, 110, 8, 150, 1.1, 0.8, 1.6);        // cycads / tree-ferns, mid
      scatterInstanced(makeClump(4, 0.55, 0.8, 0.35, 0), grassMat, 620, 1.5, 60, 2.0, 0.7, 1.4);      // grass tufts, foreground carpet

      // heavy downpour, but the streaks stay individually legible — count and
      // spread are up, opacity only a little, so it doesn't grey out to a sheet
      const RAIN = 4400, RAIN_BOX = 74;
      const rainPos = new Float32Array(RAIN * 6);
      const rainState = [];
      for (let i = 0; i < RAIN; i++) {
        const s = {
          x: (Math.random() - 0.5) * RAIN_BOX * 2, y: Math.random() * 44,
          z: -Math.random() * 110 - 2, len: 0.6 + Math.random() * 1.15, v: 38 + Math.random() * 26
        };
        rainState.push(s);
        rainPos[i * 6] = s.x; rainPos[i * 6 + 1] = s.y; rainPos[i * 6 + 2] = s.z;
        rainPos[i * 6 + 3] = s.x + 0.15; rainPos[i * 6 + 4] = s.y - s.len; rainPos[i * 6 + 5] = s.z;
      }
      const rainGeo = new THREE.BufferGeometry();
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
      const rain = new THREE.LineSegments(rainGeo,
        // fog off so the streaks stay legible right to the end, when the murk
        // would otherwise swallow them — opacity is driven manually instead
        new THREE.LineBasicMaterial({ color: 0xadbdcd, transparent: true, opacity: 0.34, fog: false }));
      groundScene.add(rain);

      // ---- Fire rain: re-entering ejecta, not just cold rain -------------
      // Chicxulub threw material clear out of the atmosphere; as it fell back
      // it re-heated on re-entry and rained down worldwide as glowing embers,
      // the "global broiler" that is thought to have ignited wildfires within
      // minutes/hours — well before soot ever darkens the sky. Modelled as a
      // second, additive streak-rain that burns hot right as the scene opens
      // and burns itself out over the phase's first stretch, underneath (and
      // fading beneath) the ordinary cold rain.
      const FIRE_RAIN = 900, FIRE_RAIN_BOX = 74;
      const fireRainPos = new Float32Array(FIRE_RAIN * 6);
      const fireRainState = [];
      for (let i = 0; i < FIRE_RAIN; i++) {
        const s = {
          x: (Math.random() - 0.5) * FIRE_RAIN_BOX * 2, y: Math.random() * 50,
          z: -Math.random() * 110 - 2, len: 0.5 + Math.random() * 1.3, v: 28 + Math.random() * 30
        };
        fireRainState.push(s);
        fireRainPos[i * 6] = s.x; fireRainPos[i * 6 + 1] = s.y; fireRainPos[i * 6 + 2] = s.z;
        fireRainPos[i * 6 + 3] = s.x + 0.1; fireRainPos[i * 6 + 4] = s.y - s.len; fireRainPos[i * 6 + 5] = s.z;
      }
      const fireRainGeo = new THREE.BufferGeometry();
      fireRainGeo.setAttribute('position', new THREE.BufferAttribute(fireRainPos, 3));
      const fireRain = new THREE.LineSegments(fireRainGeo,
        new THREE.LineBasicMaterial({
          color: 0xff6a20, transparent: true, opacity: 0, fog: false,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
      groundScene.add(fireRain);

      const ASH = 900;
      const ashPos = new Float32Array(ASH * 3);
      const ashState = [];
      for (let i = 0; i < ASH; i++) {
        const a = {
          x: (Math.random() - 0.5) * 130, y: Math.random() * 46,
          z: -Math.random() * 105 - 2, v: 0.9 + Math.random() * 1.8, sw: Math.random() * 6.28,
          // fine ash rides the wind rather than all falling straight down —
          // per-particle drift so the fall reads as turbulent, not uniform
          drift: (Math.random() - 0.5) * 0.5 + 0.35
        };
        ashState.push(a);
        ashPos[i * 3] = a.x; ashPos[i * 3 + 1] = a.y; ashPos[i * 3 + 2] = a.z;
      }
      const ashGeo = new THREE.BufferGeometry();
      ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
      const ashPts = new THREE.Points(ashGeo,
        new THREE.PointsMaterial({ color: 0x7a7266, size: 0.14, transparent: true, opacity: 0.5 }));
      groundScene.add(ashPts);

      // Drifting smoke banks — several soft, ragged billboard clusters at mixed
      // depths that thicken across the phase. Kept as discrete clumps (not one
      // uniform fog) so the sky reads as rolling smoke, not a flat grey filter.
      const puffTex = canvasTex((ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(150,142,128,0.6)');
        g.addColorStop(0.5, 'rgba(92,86,76,0.3)');
        g.addColorStop(1, 'rgba(30,27,23,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 46; i++) {
          ctx.fillStyle = `rgba(58,54,48,${0.03 + Math.random() * 0.09})`;
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 24 + Math.random() * 88, 0, 7);
          ctx.fill();
        }
      }, 256, 256);
      const SMOKE_N = 10;
      const smokePuffs = [];
      const smokeGroup = new THREE.Group();
      for (let i = 0; i < SMOKE_N; i++) {
        const cluster = new THREE.Group();
        cluster.position.set(
          (Math.random() - 0.5) * 260,
          4 + Math.random() * 28,
          -26 - Math.random() * 190
        );
        const blades = 3 + (Math.random() * 3 | 0);
        for (let k = 0; k < blades; k++) {
          const sw = 44 + Math.random() * 96;
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(sw, sw * (0.55 + Math.random() * 0.5)),
            new THREE.MeshBasicMaterial({
              map: puffTex, color: 0x8b8174, transparent: true, opacity: 0,
              depthWrite: false, fog: true
            })
          );
          m.position.set((Math.random() - 0.5) * 46, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 26);
          m.userData.o = 0.45 + Math.random() * 0.6;
          cluster.add(m);
        }
        cluster.userData = { vx: 1.2 + Math.random() * 2.8, baseY: cluster.position.y, sw: Math.random() * 6.28, amp: 0.3 + Math.random() * 0.6 };
        smokePuffs.push(cluster);
        smokeGroup.add(cluster);
      }
      groundScene.add(smokeGroup);

      // The dinosaur is a Quaternius model — the "T-Rex" from the Animated
      // Dinosaur Bundle, CC0 / public domain, via Poly Pizza
      // (poly.pizza/u/Quaternius). Shipped as models/trex.glb (Armature with
      // TRex_Idle / TRex_Walk / TRex_Death clips). Loaded async; until it
      // arrives dinoModel is null and updateGround skips it. Every mesh is
      // re-materialled to a flat near-black so it silhouettes in the fog like
      // everything else in this scene.
      const dino = new THREE.Group();
      dino.position.set(0.5, 0, -12);
      groundScene.add(dino);
      let dinoModel = null, dinoMixer = null, dinoIdle = null, dinoDeath = null;
      let dinoDeathDur = 1;

      // Procedural reptile hide for the T-Rex — high-contrast so the pattern
      // still reads on a dark animal in gloom: dark olive dorsal counter-shade,
      // pale belly, broad irregular blotches, faint cross bars, pebble speckle.
      function paintDinoSkin(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          // v roughly runs belly (0) -> back (1) once tiled over the body
          const back = Math.abs(ny * 2 - 1);
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const i = (y * w + x) * 4;
            const big = fbm(nx * 4.5 + 0.5, ny * 4.5 + 1.2);
            const mid = fbm(nx * 13 + 3.1, ny * 13 + 1.7);
            const peb = noise2(nx * 150, ny * 150);
            const peb2 = noise2(nx * 84 + 5.0, ny * 66 + 2.0);
            // counter-shading: dark along the spine, pale on the belly
            let base = 42 + (1 - back) * 66 - back * 12;
            // broad blotch field
            const blotch = fbm(nx * 7 + 7.4, ny * 8 + 4.2);
            if (blotch > 0.58) base -= (blotch - 0.58) / 0.42 * 52;
            else if (blotch < 0.34) base += (0.34 - blotch) / 0.34 * 30;
            // soft cross bars down the flank
            const bar = Math.sin((nx * 9 + big * 3.4) * Math.PI);
            base -= Math.max(0, bar) * (0.35 + big * 0.4) * 20 * (1 - back * 0.5);
            // pebble speckle
            base += (peb > 0.66 ? (peb - 0.66) / 0.34 : 0) * 22;
            base -= (peb2 < 0.3 ? (0.3 - peb2) / 0.3 : 0) * 18;
            base += (mid - 0.5) * 10;
            const v = base < 4 ? 4 : base > 230 ? 230 : base;
            // faint olive cast, a touch warmer on the lighter belly
            d[i] = v * 0.98;
            d[i + 1] = v * 1.0;
            d[i + 2] = v * 0.86;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      function paintDinoBump(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const i = (y * w + x) * 4;
            const peb = noise2(nx * 170, ny * 170);
            const peb2 = noise2(nx * 96 + 3.0, ny * 78 + 6.0);
            // rows of raised scutes running along the body
            const scute = Math.abs(Math.sin((ny * 40 + fbm(nx * 5, ny * 5) * 5) * Math.PI));
            const wrinkle = Math.abs(Math.sin((nx * 12 + fbm(nx * 6, ny * 6) * 4) * Math.PI));
            let v = 128 + (peb - 0.5) * 120 + (peb2 - 0.5) * 60 + (1 - scute) * 34 - wrinkle * 30;
            v = v < 0 ? 0 : v > 255 ? 255 : v;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      const dinoSkinTex = canvasTex(paintDinoSkin, 512, 512);
      dinoSkinTex.wrapS = dinoSkinTex.wrapT = THREE.RepeatWrapping;
      dinoSkinTex.repeat.set(1, 1.3);
      const dinoBumpTex = canvasTex(paintDinoBump, 512, 512);
      dinoBumpTex.wrapS = dinoBumpTex.wrapT = THREE.RepeatWrapping;
      dinoBumpTex.repeat.set(1, 1.3);
      dinoBumpTex.encoding = THREE.LinearEncoding;

      // three r128 gates skinned deformation on material.skinning — a fresh
      // material without it renders the rig frozen in bind pose (the model
      // translates as one rigid block, no clip ever shows). Keep it true.
      const dinoMat = new THREE.MeshStandardMaterial({
        color: 0xbdbbc2, roughness: 0.92, metalness: 0, transparent: true, opacity: 1,
        map: dinoSkinTex, bumpMap: dinoBumpTex, bumpScale: 0.04,
        skinning: true
      });
      new THREE.GLTFLoader().load('models/trex.glb', (gltf) => {
        dinoModel = gltf.scene;
        dinoModel.traverse((o) => {
          if (o.isMesh) {
            if (o.morphTargetInfluences && o.morphTargetInfluences.length) dinoMat.morphTargets = true;
            // the GLB packs every part into a tiny palette-atlas UV cluster, so
            // a tiled map samples near-uniform — rebuild UVs as a box projection
            // of the local position so the skin actually spreads over the body
            const g = o.geometry;
            if (g && g.attributes.position) {
              g.computeBoundingBox();
              const bbx = g.boundingBox, sz = new THREE.Vector3();
              bbx.getSize(sz);
              const pos = g.attributes.position, nrm = g.attributes.normal;
              const uv = new Float32Array(pos.count * 2);
              for (let k = 0; k < pos.count; k++) {
                const px = (pos.getX(k) - bbx.min.x) / (sz.x || 1);
                const py = (pos.getY(k) - bbx.min.y) / (sz.y || 1);
                const pz = (pos.getZ(k) - bbx.min.z) / (sz.z || 1);
                const ax = Math.abs(nrm ? nrm.getX(k) : 0);
                const az = Math.abs(nrm ? nrm.getZ(k) : 1);
                // side-facing tris use x-length along the body; front/back use z
                if (az >= ax) { uv[k * 2] = px * (sz.x / (sz.y || 1)); uv[k * 2 + 1] = py; }
                else { uv[k * 2] = pz * (sz.z / (sz.y || 1)); uv[k * 2 + 1] = py; }
              }
              g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            }
            o.material = dinoMat; o.castShadow = false; o.frustumCulled = false;
          }
        });
        // FBX2glTF bakes an arbitrary unit scale into the rig — measure the
        // rest-pose bounds and normalise to a fixed on-screen height, feet on y=0
        dinoModel.rotation.y = -Math.PI / 2 - 0.2;    // side-on profile, facing screen-right
        dino.add(dinoModel);
        const bb = new THREE.Box3().setFromObject(dinoModel);
        const s = 6.0 / Math.max(0.001, bb.max.y - bb.min.y);
        dinoModel.scale.multiplyScalar(s);
        const bb2 = new THREE.Box3().setFromObject(dinoModel);
        dinoModel.position.x -= (bb2.min.x + bb2.max.x) / 2;
        dinoModel.position.z -= (bb2.min.z + bb2.max.z) / 2;
        // Box3.setFromObject ignores skeletal deformation, so this plants the
        // rest pose. The Idle clip lowers the hips a touch on playback — lift a
        // small margin so the feet still sit on the ground, not through it.
        dinoModel.position.y -= bb2.min.y - 0.12;
        dinoMixer = new THREE.AnimationMixer(dinoModel);
        // tolerate clip-name drift between bundle exports — match on substring
        const byName = (frag) => gltf.animations.find(a => a.name.toLowerCase().includes(frag))
          || THREE.AnimationClip.findByName(gltf.animations, frag);
        const idleClip = byName('idle') || gltf.animations[0];
        const deathClip = byName('death') || byName('die') || idleClip;
        dinoIdle = dinoMixer.clipAction(idleClip);
        dinoDeath = dinoMixer.clipAction(deathClip);
        dinoDeath.clampWhenFinished = true;
        dinoDeath.loop = THREE.LoopOnce;
        dinoDeathDur = deathClip.duration || 1;
        dinoIdle.play();
      });

      function resetGround() {
        hud.veil.style.opacity = 0;
        dinoMat.opacity = 1;
        dino.position.set(0.5, 0, -12);
        dino.rotation.set(0, 0, 0);
        dino.scale.setScalar(1);
        if (dinoMixer) {
          dinoDeath.stop();
          dinoIdle.reset().play();
          dinoMixer.update(0);
        }
        groundScene.fog.density = 0.026;
        groundScene.fog.color.set(0x7a7062);
        groundScene.background.set(0x7a7062);
        mistGlow.material.opacity = 0.85;
      }

      function updateGround(t) {
        const pe = clamp01((t - EXT_T0) / (EXT_T1 - EXT_T0));
        const dt = 1 / 60;

        // starts lit (some daylight still forces through), then the smoke pall
        // thickens across the phase — but it never reaches full black: the shot
        // ends on a dim, cold gloom with the rain still visibly falling
        const dk = ease(clamp01((pe - 0.2) / 0.72)) * 0.84;
        groundKey.intensity = THREE.MathUtils.lerp(1.7, 0.06, dk);
        groundAmb.intensity = THREE.MathUtils.lerp(0.95, 0.09, dk);
        groundHemi.intensity = THREE.MathUtils.lerp(0.95, 0.09, dk);
        // keeps building, but caps short of a white-out so the streaks read
        groundScene.fog.density = THREE.MathUtils.lerp(0.026, 0.07, ease(pe));
        const murk = new THREE.Color(0x7a7062).lerp(new THREE.Color(0x0d0c0a), dk);
        groundScene.fog.color.copy(murk);
        groundScene.background.copy(murk);
        const sd = 1 - dk * 0.9;
        groundSky.material.color.setRGB(sd, sd, sd);
        emberBand.material.opacity = 0.3 * (1 - clamp01(pe / 0.72));
        mistGlow.material.opacity = 0.85 * (1 - clamp01(pe / 0.45)); // last light, snuffed by ~pe 0.45
        renderer.toneMappingExposure = THREE.MathUtils.lerp(1.1, 0.46, dk);

        // smoke banks: several clumps drifting across, thickening from a thin
        // haze at the start to a heavy pall by mid-phase
        const smokeThick = THREE.MathUtils.lerp(0.06, 0.5, ease(clamp01((pe - 0.04) / 0.72)));
        for (const c of smokePuffs) {
          c.position.x += c.userData.vx * dt;
          if (c.position.x > 150) c.position.x -= 300;
          if (!reduceMotion) {
            c.userData.sw += dt * 0.4;
            c.position.y = c.userData.baseY + Math.sin(c.userData.sw) * c.userData.amp;
          }
          for (const m of c.children) {
            m.quaternion.copy(groundCam.quaternion);           // face the lens
            m.material.opacity = smokeThick * m.userData.o;
          }
        }

        const cz = THREE.MathUtils.lerp(17, 12.5, ease(pe));
        const cy = THREE.MathUtils.lerp(3.0, 2.4, pe);
        groundCam.position.set(
          -4.5 + Math.sin(t * 0.11) * 0.5,
          cy + (reduceMotion ? 0 : Math.sin(t * 1.7) * 0.03),
          cz
        );
        // frame the animal (near z-12) against the horizon band; drift the
        // look-point down as it collapses
        groundCam.lookAt(0.5, 2.6 - pe * 1.5, -12);

        for (let i = 0; i < RAIN; i++) {
          const s = rainState[i];
          s.y -= s.v * dt;
          s.x += 2.2 * dt;
          if (s.y < -1) { s.y = 34 + Math.random() * 8; s.x = (Math.random() - 0.5) * RAIN_BOX * 2; }
          if (s.x > RAIN_BOX) s.x -= RAIN_BOX * 2;
          rainPos[i * 6] = s.x; rainPos[i * 6 + 1] = s.y; rainPos[i * 6 + 2] = s.z;
          rainPos[i * 6 + 3] = s.x + 0.14; rainPos[i * 6 + 4] = s.y - s.len; rainPos[i * 6 + 5] = s.z;
        }
        rainGeo.attributes.position.needsUpdate = true;
        // hold the rain up as the light dies so the shot ends on falling rain,
        // not a black frame
        rain.material.opacity = THREE.MathUtils.lerp(0.28, 0.42, ease(pe));

        for (let i = 0; i < FIRE_RAIN; i++) {
          const s = fireRainState[i];
          s.y -= s.v * dt;
          s.x += 1.6 * dt;
          if (s.y < -1) { s.y = 40 + Math.random() * 10; s.x = (Math.random() - 0.5) * FIRE_RAIN_BOX * 2; }
          if (s.x > FIRE_RAIN_BOX) s.x -= FIRE_RAIN_BOX * 2;
          fireRainPos[i * 6] = s.x; fireRainPos[i * 6 + 1] = s.y; fireRainPos[i * 6 + 2] = s.z;
          fireRainPos[i * 6 + 3] = s.x + 0.1; fireRainPos[i * 6 + 4] = s.y - s.len; fireRainPos[i * 6 + 5] = s.z;
        }
        fireRainGeo.attributes.position.needsUpdate = true;
        // burns hottest the instant the scene opens, then the re-entry pulse
        // passes — from here on it's just cold rain and ash
        fireRain.material.opacity = 0.5 * (1 - ease(clamp01(pe / 0.22)));

        for (let i = 0; i < ASH; i++) {
          const a = ashState[i];
          a.y -= a.v * dt; a.sw += dt;
          // wider, uneven sway plus a faster jitter layer so fine ash eddies
          // in turbulent air instead of falling in a near-straight line
          a.x += (Math.sin(a.sw) * 1.4 + Math.sin(a.sw * 2.7 + i) * 0.5) * dt + a.drift * dt;
          a.z += Math.cos(a.sw * 0.8 + i * 0.3) * 0.5 * dt;
          if (a.y < -1) {
            a.y = 44 + Math.random() * 6; a.x = (Math.random() - 0.5) * 130; a.z = -Math.random() * 105 - 2;
          }
          ashPos[i * 3] = a.x; ashPos[i * 3 + 1] = a.y; ashPos[i * 3 + 2] = a.z;
        }
        ashGeo.attributes.position.needsUpdate = true;

        // the animal: idle in the rain, then it topples (Death clip scrubbed
        // over pe 0.30-0.52 so the collapse plays while there's still light to
        // read it), lies dead through the dark, then sinks and fades out
        if (dinoMixer) {
          if (pe < 0.3) {
            if (dinoDeath.isRunning()) dinoDeath.stop();
            if (!dinoIdle.isRunning()) dinoIdle.reset().play();
            dinoIdle.setEffectiveTimeScale(1.15);
            dinoMixer.update(dt);
            // the idle clip carries the head/tail/leg motion now that skinning
            // works; keep the group layer light so the body doesn't wobble as
            // one rigid block on top of it
            const br = reduceMotion ? 0 : 1;
            dino.position.x = 0.5 + br * Math.sin(t * 0.45) * 0.06;
            dino.position.y = br * (0.5 + 0.5 * Math.sin(t * 1.5)) * 0.05; // breathe up only, never dip below ground
            dino.rotation.set(
              br * Math.sin(t * 0.8) * 0.015,
              br * Math.sin(t * 0.3) * 0.05,
              br * Math.sin(t * 0.45) * 0.02
            );
            dino.scale.setScalar(1);
            dinoMat.opacity = 1;
          } else {
            const kd = clamp01((pe - 0.3) / 0.22);         // death plays out over pe 0.30-0.52
            if (dinoIdle.isRunning()) dinoIdle.stop();
            if (!dinoDeath.isRunning()) dinoDeath.reset().play();
            dinoDeath.paused = true;
            dinoDeath.time = kd * dinoDeathDur;
            dinoMixer.update(0);
            dino.rotation.set(0, 0, 0);
            dino.scale.setScalar(1);
            dino.position.x = 0.5;
            const sink = ease(clamp01((pe - 0.72) / 0.28));
            dino.position.y = -sink * 2.6;
            dinoMat.opacity = 1 - sink;
          }
        }
      }

