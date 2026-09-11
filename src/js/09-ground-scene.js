      // ---- Ground-level extinction scene ---------------------------------
      // After the orbital "nuclear winter" beat the film cuts (through a black
      // wipe) down to the forest floor under the dust pall: dark, ash and acid
      // rain, one theropod that lies down and does not get up. This is a
      // separate THREE.Scene with its own camera/fog/lights, rendered instead
      // of the globe once simTime passes EXT_T0.
      const EXT_T0 = 34, EXT_T1 = 50;
      // colour of the sky while the re-entry pulse is overhead
      const BROIL_LIGHT = new THREE.Color(0xff5a18);
      const BROIL_SKY = new THREE.Color(0x4a1c0a);
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

      // How the surface dies. The thermal pulse scorches the crowns within
      // hours; the needles then drop and the stand goes to bare poles. Ash
      // settles pale over everything, and the sulphate aerosol from the
      // vaporised anhydrite falls out as acid rain — a sickly yellow cast
      // through the middle of the phase, before the murk drains to grey.
      const CANOPY_LIVE = new THREE.Color(0x1b2814);
      const CANOPY_SCORCH = new THREE.Color(0x3d2411);
      const CANOPY_BARE = new THREE.Color(0x241d16);
      const FERN_LIVE = new THREE.Color(0x6a7250);
      const GRASS_LIVE = new THREE.Color(0x8a8256);
      const DEAD_BROWN = new THREE.Color(0x4a3a1e);
      const ASH_PALE = new THREE.Color(0xb3ada2);
      const ACID_HAZE = new THREE.Color(0x6e6a3a);
      const RAIN_COLD = new THREE.Color(0xadbdcd);
      const RAIN_ACID = new THREE.Color(0xc9c69c);
      const DINO_LIVE = new THREE.Color(0xc8b9a8);
      const DINO_DEAD = new THREE.Color(0x8b8990);

      // Canopy loss is geometry, not just colour: the crowns physically thin
      // to bare spires as the needles come off. Rewriting 280 instance
      // matrices costs nothing, so do it properly rather than fading a colour.
      let canopyInst = null;
      const _cq = new THREE.Quaternion(), _ce = new THREE.Euler();
      const _cp = new THREE.Vector3(), _cs = new THREE.Vector3(), _cm = new THREE.Matrix4();
      function setCanopy(fall) {
        if (!canopyInst) return;
        const keep = 1 - fall;
        for (let i = 0; i < treePlace.length; i++) {
          const t = treePlace[i];
          _ce.set(t.lean * 0.4, t.ry, t.lean);
          _cq.setFromEuler(_ce);
          _cp.set(t.px, 0, t.pz);
          const cs = t.dead ? t.sc * 0.5 : t.sc;
          // shrink across the trunk, not down it — a defoliated conifer keeps
          // its height and loses its width
          const csXZ = cs * (t.broad ? 1.55 : 1) * (0.28 + keep * 0.72);
          const csY = cs * (t.broad ? 0.62 : 1) * (0.82 + keep * 0.18);
          _cs.set(csXZ, csY, csXZ);
          _cm.compose(_cp, _cq, _cs);
          canopyInst.setMatrixAt(i, _cm);
        }
        canopyInst.instanceMatrix.needsUpdate = true;
      }

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
        canopyInst = canopyIM;
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
          // per-particle drift so the fall reads as turbulent, not uniform.
          // Weighted well above the old 0.35: at these fall speeds that was a
          // ~10 degree lean, which read as vertical. This is a real slant.
          drift: (Math.random() - 0.5) * 0.9 + 1.6
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

      // ======================================================================
      //  Extra realism layer (added after the 9-pass checklist): seismic
      //  arrival, glass-spherule patter, dry lightning in the smoke, wind in
      //  the stand, trees actually alight, falling litter, the animal's breath
      //  fogging in the cold, rain dripping off canopy and hide, splashes and
      //  puddles on the floor, embers lifting off the ground fires, heat
      //  shimmer over the fire band, ash mounding over the carcass, an eye
      //  catch-light, and a few animals fleeing through the far murk at the
      //  open. All procedural, no new sidecar assets.
      // ======================================================================
      const _pc = new THREE.Color();

      const softDotTex = canvasTex((ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }, 64, 64);
      const flameTex = canvasTex((ctx, w, h) => {
        const g = ctx.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0.0, 'rgba(255,232,150,0.95)');
        g.addColorStop(0.35, 'rgba(255,140,44,0.72)');
        g.addColorStop(0.7, 'rgba(196,58,20,0.26)');
        g.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // feather the side edges so the card never reads as a rectangle
        ctx.globalCompositeOperation = 'destination-in';
        const hg = ctx.createLinearGradient(0, 0, w, 0);
        hg.addColorStop(0, 'rgba(0,0,0,0)');
        hg.addColorStop(0.5, 'rgba(0,0,0,1)');
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 44; i++) {
          ctx.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.13})`;
          ctx.beginPath();
          ctx.arc(Math.random() * w, h * (0.1 + Math.random() * 0.9), 4 + Math.random() * 11, 0, 7);
          ctx.fill();
        }
      }, 64, 128);
      const ringTex = canvasTex((ctx, w, h) => {
        ctx.strokeStyle = 'rgba(206,222,235,0.9)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 6, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(206,222,235,0.32)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 17, 0, 7); ctx.stroke();
      }, 64, 64);

      // ---- Wind: vertex sway injected into the existing stand materials ----
      // One shared phase + amplitude uniform; per-instance offset from the
      // instance matrix so no two trees move together. Amplitude is driven per
      // frame in updateGround (firestorm gust + seismic shake).
      const windPhaseU = { value: 0 }, windAmpU = { value: 0 };
      // `bend` squares the lever so the displacement concentrates at the tip.
      // A linear lever moves the whole crown including its base, which at any
      // amplitude big enough to see slides the canopy off the top of its own
      // trunk. Short plants (fern, grass) bend from the ground and want the
      // linear version, so this is per-material rather than global.
      function addSway(mat, amp, lever, bend) {
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uWindPhase = windPhaseU;
          sh.uniforms.uWindAmp = windAmpU;
          sh.vertexShader = 'uniform float uWindPhase;\nuniform float uWindAmp;\n' + sh.vertexShader;
          sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\n' +
            '#ifdef USE_INSTANCING\n' +
            '  float iph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 1.3;\n' +
            '#else\n' +
            '  float iph = 0.0;\n' +
            '#endif\n' +
            '  float lev = max(transformed.y - ' + lever.toFixed(2) + ', 0.0);\n' +
            (bend ? '  lev = lev * lev * ' + bend.toFixed(3) + ';\n' : '') +
            '  float gust = 0.6 + 0.4 * sin(uWindPhase * 0.27 + iph);\n' +
            '  transformed.x += sin(uWindPhase + iph + transformed.y * 0.35) * uWindAmp * ' + amp.toFixed(3) + ' * gust * lev;\n' +
            '  transformed.z += cos(uWindPhase * 0.9 + iph + transformed.y * 0.3) * uWindAmp * ' + amp.toFixed(3) + ' * gust * lev * 0.5;');
        };
        mat.needsUpdate = true;
      }
      addSway(trunkMat, 0.16, 1.5, 0.06);
      addSway(canopyMat, 1.0, 2.5, 0.115);
      addSway(fernMat, 1.7, 0.12, 0);
      addSway(grassMat, 1.4, 0.04, 0);

      // ---- Glass-spherule patter: the very first fallout, ahead of the ash -
      const TEK = 520;
      const tekPos = new Float32Array(TEK * 6), tekState = [];
      for (let i = 0; i < TEK; i++) {
        const s = { x: (Math.random() - 0.5) * 150, y: Math.random() * 96,
          z: -Math.random() * 120 - 2, len: 1.2 + Math.random() * 2.4, v: 66 + Math.random() * 46 };
        tekState.push(s);
        tekPos[i * 6] = s.x; tekPos[i * 6 + 1] = s.y; tekPos[i * 6 + 2] = s.z;
        tekPos[i * 6 + 3] = s.x + 0.1; tekPos[i * 6 + 4] = s.y - s.len; tekPos[i * 6 + 5] = s.z;
      }
      const tekGeo = new THREE.BufferGeometry();
      tekGeo.setAttribute('position', new THREE.BufferAttribute(tekPos, 3));
      const tekSeg = new THREE.LineSegments(tekGeo, new THREE.LineBasicMaterial({
        color: 0xbfffd8, transparent: true, opacity: 0, fog: false,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      }));
      tekSeg.frustumCulled = false;
      groundScene.add(tekSeg);

      // ---- Dry lightning inside the smoke pall ---------------------------
      const lgt = new THREE.PointLight(0xccd6ff, 0, 340, 2);
      lgt.position.set(40, 60, -140);
      groundScene.add(lgt);
      const lgtState = { timer: 1.5 + Math.random() * 3, flash: 0 };

      // ---- Trees actually alight: a few foreground crowns burn, then char -
      const fireTrees = treePlace
        .filter((t) => t.pz > -30 && Math.abs(t.px) < 26)
        .sort((a, b) => b.sc - a.sc)
        .slice(0, 5);
      fireTrees.push({ px: -7, pz: -20, sc: 1.1 }, { px: 9, pz: -15, sc: 1.0 });
      const treeFireCards = [];
      const treeFireGrp = new THREE.Group();
      fireTrees.forEach((t) => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(4.6 * t.sc, 10 * t.sc),
          new THREE.MeshBasicMaterial({
            map: flameTex, transparent: true, opacity: 0, depthWrite: false,
            blending: THREE.AdditiveBlending, fog: true, toneMapped: false
          }));
        m.position.set(t.px, 4.6 * t.sc, t.pz);
        m.userData = { ph: Math.random() * 6.28 };
        treeFireGrp.add(m); treeFireCards.push(m);
      });
      groundScene.add(treeFireGrp);

      // ---- Embers lifting off the ground fires -------------------------
      const EMB = 220;
      const embPos = new Float32Array(EMB * 3), embState = [];
      for (let i = 0; i < EMB; i++) {
        const tp = fireTrees[(Math.random() * fireTrees.length) | 0];
        const a = { ox: tp.px, oz: tp.pz, x: tp.px + (Math.random() - 0.5) * 6,
          y: Math.random() * 15, z: tp.pz + (Math.random() - 0.5) * 6,
          v: 1.4 + Math.random() * 3.2, sw: Math.random() * 6.28 };
        embState.push(a);
        embPos[i * 3] = a.x; embPos[i * 3 + 1] = a.y; embPos[i * 3 + 2] = a.z;
      }
      const embGeo = new THREE.BufferGeometry();
      embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
      const embPts = new THREE.Points(embGeo, new THREE.PointsMaterial({
        map: softDotTex, color: 0xff7a2a, size: 0.14, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false
      }));
      embPts.frustumCulled = false;
      groundScene.add(embPts);

      // ---- Heat shimmer over the distant fire band -------------------
      const shimmer = new THREE.Mesh(
        new THREE.PlaneGeometry(560, 120),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { uT: { value: 0 }, uA: { value: 0 } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: [
            'varying vec2 vUv; uniform float uT; uniform float uA;',
            'void main(){',
            '  float w = sin(vUv.x * 42.0 + uT * 6.0 + sin(vUv.y * 18.0 + uT * 3.0) * 2.0);',
            '  w += sin(vUv.x * 17.0 - uT * 4.0);',
            '  float band = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));',
            '  gl_FragColor = vec4(1.0, 0.55, 0.26, max(0.0, w) * 0.045 * band * uA);',
            '}'
          ].join('\n')
        }));
      shimmer.position.set(-10, 14, -150);
      shimmer.frustumCulled = false;
      groundScene.add(shimmer);

      // ---- Falling litter: scorched needles and twigs coming down -----
      const LIT = 340;
      const litPos = new Float32Array(LIT * 3), litState = [];
      for (let i = 0; i < LIT; i++) {
        const tp = treePlace[(Math.random() * treePlace.length) | 0];
        const s = { x: tp.px + (Math.random() - 0.5) * 4, y: 3 + Math.random() * 9 * tp.sc,
          z: tp.pz + (Math.random() - 0.5) * 4, v: 1.1 + Math.random() * 2.6,
          sw: Math.random() * 6.28, drift: (Math.random() - 0.5) * 1.4 };
        litState.push(s);
        litPos[i * 3] = s.x; litPos[i * 3 + 1] = s.y; litPos[i * 3 + 2] = s.z;
      }
      const litGeo = new THREE.BufferGeometry();
      litGeo.setAttribute('position', new THREE.BufferAttribute(litPos, 3));
      const litPts = new THREE.Points(litGeo, new THREE.PointsMaterial({
        color: 0x4a3a1e, size: 0.1, transparent: true, opacity: 0, fog: true
      }));
      litPts.frustumCulled = false;
      groundScene.add(litPts);

      // ---- The animal's breath fogging in the cold ------------------
      const breathPool = [];
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
          // fog off: the breath has to stay brighter than the pall it is seen
          // against, and at 12 m the fog was already washing it into the haze
          new THREE.MeshBasicMaterial({ map: puffTex, color: 0xcfd4d2, transparent: true,
            opacity: 0, depthWrite: false, fog: false }));
        m.frustumCulled = false;
        groundScene.add(m);
        breathPool.push({ m, life: 1, vx: 0, vy: 0, vz: 0 });
      }
      let breathTimer = 0;

      // ---- Rain dripping off the canopy and off the hide -----------
      const DRIP = 260;
      const dripPos = new Float32Array(DRIP * 6), dripState = [];
      for (let i = 0; i < DRIP; i++) {
        let x, z, y0;
        if (i < 44) { x = 0.5 + (Math.random() - 0.5) * 3.4; z = -12 + (Math.random() - 0.5) * 2.6; y0 = 3.4 + Math.random() * 1.6; }
        else { const tp = treePlace[(Math.random() * treePlace.length) | 0];
          x = tp.px + (Math.random() - 0.5) * 3 * tp.sc; z = tp.pz + (Math.random() - 0.5) * 3 * tp.sc;
          y0 = 3.5 + Math.random() * 7 * tp.sc; }
        dripState.push({ x, z, y0, y: Math.random() * y0, v: 13 + Math.random() * 10,
          len: 0.45 + Math.random() * 0.7, wait: Math.random() * 1.4 });
      }
      const dripGeo = new THREE.BufferGeometry();
      dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
      const dripSeg = new THREE.LineSegments(dripGeo, new THREE.LineBasicMaterial({
        color: 0xadbdcd, transparent: true, opacity: 0.4, fog: true
      }));
      dripSeg.frustumCulled = false;
      groundScene.add(dripSeg);

      // ---- Rain splashes on the forest floor ---------------------
      const splashPool = [];
      for (let i = 0; i < 46; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ map: ringTex, color: 0xbccad6, transparent: true,
            opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, toneMapped: false }));
        m.rotation.x = -Math.PI / 2;
        m.frustumCulled = false;
        groundScene.add(m);
        splashPool.push({ m, life: Math.random() });
      }

      // ---- Puddles: a thin wet sheen on the floor, not a mirror -------
      // Soft-edged, unlit, low opacity, tinted to whatever the pall colour is
      // so it reads as standing water catching the sky, then ash skins it over.
      const puddleTex = canvasTex((ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.38)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }, 64, 64);
      const puddleGrp = new THREE.Group();
      [[-5, -8, 5], [3, -15, 4], [-11, -5, 3.5], [7, -4, 3], [-2, -19, 4.5], [11, -13, 3], [1, -2.5, 3.5]].forEach((p) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(p[2], p[2] * 0.66),
          new THREE.MeshBasicMaterial({ map: puddleTex, color: 0x8f97a0, transparent: true,
            opacity: 0, depthWrite: false, fog: true }));
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = Math.random() * Math.PI;
        m.position.set(p[0], 0.06, p[1]);
        m.frustumCulled = false;
        puddleGrp.add(m);
      });
      groundScene.add(puddleGrp);

      // ---- Ash mounding over the carcass, and against foreground trunks --
      const carcassAsh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12),
        new THREE.MeshStandardMaterial({ color: ASH_PALE, roughness: 1, metalness: 0 }));
      carcassAsh.position.set(0.6, -0.4, -12);
      carcassAsh.scale.setScalar(0.01);
      carcassAsh.frustumCulled = false;
      groundScene.add(carcassAsh);
      const baseMoundGrp = new THREE.Group();
      [[-4, -10], [5, -14], [-9, -6], [8, -8]].forEach((p) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8),
          new THREE.MeshStandardMaterial({ color: ASH_PALE, roughness: 1, metalness: 0 }));
        m.position.set(p[0], -0.35, p[1]);
        m.scale.setScalar(0.01);
        m.frustumCulled = false;
        baseMoundGrp.add(m);
      });
      groundScene.add(baseMoundGrp);

      // ---- Eye catch-light on the animal, blinking until it dies ----
      const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: softDotTex, color: 0xfff1d6, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false
      }));
      eyeGlow.scale.setScalar(0.09);
      groundScene.add(eyeGlow);

      // ---- A few animals fleeing through the far murk at the open ---
      const fleeMat = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 1, metalness: 0 });
      const fleeGrp = new THREE.Group();
      const fleers = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.95, 0.7), fleeMat);
        body.position.y = 1.5;
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.42), fleeMat);
        neck.position.set(-1.2, 2.4, 0);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.32, 0.32), fleeMat);
        tail.position.set(1.9, 1.6, 0);
        g.add(body, neck, tail);
        g.position.set(34 + i * 18, 0, -58 - i * 12);
        g.userData = { spd: 22 + i * 6, ph: Math.random() * 6.28 };
        fleeGrp.add(g); fleers.push(g);
      }
      groundScene.add(fleeGrp);

      function resetGroundExtras() {
        windAmpU.value = 0;
        tekSeg.material.opacity = 0;
        lgt.intensity = 0; lgtState.flash = 0; lgtState.timer = 1.5 + Math.random() * 3;
        treeFireCards.forEach((m) => (m.material.opacity = 0));
        embPts.material.opacity = 0;
        shimmer.material.uniforms.uA.value = 0;
        litPts.material.opacity = 0;
        breathPool.forEach((b) => { b.life = 1; b.m.material.opacity = 0; });
        breathTimer = 0;
        dripSeg.material.opacity = 0;
        splashPool.forEach((s) => { s.m.material.opacity = 0; });
        puddleGrp.children.forEach((m) => (m.material.opacity = 0));
        carcassAsh.scale.setScalar(0.01);
        baseMoundGrp.children.forEach((m) => m.scale.setScalar(0.01));
        eyeGlow.material.opacity = 0;
        fleeGrp.visible = true;
        fleers.forEach((g, i) => g.position.set(34 + i * 18, 0, -58 - i * 12));
      }

      function updateGroundExtras(t, pe, dt, broilG, ashLoad, acid, vigour) {
        const RM = reduceMotion ? 0 : 1;

        // spherule patter — heaviest at the open, gone before the ash bank
        const tekA = clamp01(1 - pe / 0.11);
        for (let i = 0; i < TEK; i++) {
          const s = tekState[i];
          s.y -= s.v * dt; s.x += 0.4 * dt;
          if (s.y < -1) { s.y = 70 + Math.random() * 26; s.x = (Math.random() - 0.5) * 150; }
          tekPos[i * 6] = s.x; tekPos[i * 6 + 1] = s.y; tekPos[i * 6 + 2] = s.z;
          tekPos[i * 6 + 3] = s.x + 0.1; tekPos[i * 6 + 4] = s.y - s.len; tekPos[i * 6 + 5] = s.z;
        }
        tekGeo.attributes.position.needsUpdate = true;
        tekSeg.material.opacity = 0.55 * tekA;

        // dry lightning: only once the smoke exists, and not while the broiler
        // sky is already lighting everything
        if (RM) {
          lgtState.timer -= dt;
          if (lgtState.timer <= 0) {
            lgtState.flash = 1;
            lgtState.timer = 1.3 + Math.random() * 4.6;
            lgt.position.set((Math.random() - 0.5) * 260, 38 + Math.random() * 52, -70 - Math.random() * 170);
          }
          lgtState.flash *= 0.8;
          const la = clamp01((pe - 0.05) / 0.06) * (1 - broilG) * (1 - clamp01((pe - 0.82) / 0.15));
          lgt.intensity = lgtState.flash * lgtState.flash * 7 * la;
        }

        // ground fires: fade in fast, burn, drop to embers by ~pe 0.5
        const burn = clamp01((pe - 0.02) / 0.1) * (1 - ease(clamp01((pe - 0.26) / 0.24)));
        for (const m of treeFireCards) {
          m.quaternion.copy(groundCam.quaternion);
          const fl = 0.7 + 0.3 * Math.sin(t * 11 + m.userData.ph) * RM;
          m.material.opacity = burn * fl * 1.15;
          m.scale.y = 1 + burn * 0.16 * Math.sin(t * 7 + m.userData.ph) * RM;
        }
        groundAmb.color.lerp(BROIL_LIGHT, burn * 0.3);
        groundAmb.intensity += burn * 0.35;
        groundHemi.intensity += burn * 0.18;

        // embers lifting off those fires
        for (let i = 0; i < EMB; i++) {
          const a = embState[i];
          a.y += a.v * dt; a.sw += dt * 3;
          a.x += Math.sin(a.sw) * 0.5 * dt; a.z += Math.cos(a.sw * 0.7) * 0.4 * dt;
          if (a.y > 21) { a.y = 0.4; a.x = a.ox + (Math.random() - 0.5) * 6; a.z = a.oz + (Math.random() - 0.5) * 6; }
          embPos[i * 3] = a.x; embPos[i * 3 + 1] = a.y; embPos[i * 3 + 2] = a.z;
        }
        embGeo.attributes.position.needsUpdate = true;
        embPts.material.opacity = Math.max(burn, broilG) * 0.8;

        shimmer.material.uniforms.uT.value = t;
        shimmer.material.uniforms.uA.value = broilG * RM;

        // falling litter — canopy-defoliation window, plus a kick from the
        // seismic shake at the open
        const shake = RM * Math.max(0, 1 - pe / 0.055);
        const litA = clamp01((pe - 0.08) / 0.12) * (1 - clamp01((pe - 0.6) / 0.3));
        for (let i = 0; i < LIT; i++) {
          const s = litState[i];
          s.y -= s.v * dt; s.sw += dt * 3;
          s.x += (Math.sin(s.sw) * 0.8 + s.drift) * dt * RM;
          if (s.y < 0.05) { s.y = 3 + Math.random() * 9; }
          litPos[i * 3] = s.x; litPos[i * 3 + 1] = s.y; litPos[i * 3 + 2] = s.z;
        }
        litGeo.attributes.position.needsUpdate = true;
        litPts.material.opacity = clamp01(litA * 0.7 + shake * 0.5);
        _pc.copy(DEAD_BROWN).lerp(ASH_PALE, ashLoad * 0.5);
        litPts.material.color.copy(_pc);

        // the animal's breath, while it still breathes
        // The first pass emitted one big soft puff that expanded to ~2.9 units
        // at 0.45 alpha — the same value and softness as the haze it sat in, so
        // it read as background murk rather than as breath. It wants to be
        // small, dense and brighter than the pall, and to clear quickly. Two
        // puffs per exhalation (a nostril pair) and a capped interval so there
        // is never a multi-second dead gap while the animal is still alive.
        if (pe < 0.3 && RM) {
          breathTimer -= dt;
          if (breathTimer <= 0) {
            breathTimer = 0.75 + (1 - vigour) * 1.45;
            for (let k = 0; k < 2; k++) {
              const p = breathPool.find((b) => b.life >= 1);
              if (!p) break;
              p.life = 0;
              p.vx = -(1.5 + Math.random() * 0.7); p.vy = 0.3 + Math.random() * 0.3;
              p.vz = (k ? 0.16 : -0.16) + (Math.random() - 0.5) * 0.2;
              // clear of the snout tip, not pasted over the middle of the head:
              // the puff has depthWrite off so anything short of the muzzle
              // draws on top of the jaw instead of in front of it
              p.m.position.set(dino.position.x - 4.3, dino.position.y + 4.15, dino.position.z + p.vz * 0.8);
            }
          }
        }
        for (const b of breathPool) {
          if (b.life >= 1) { b.m.material.opacity = 0; continue; }
          b.life += dt / 1.1;
          b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
          b.vy += 0.5 * dt;
          b.m.quaternion.copy(groundCam.quaternion);
          const s = 0.3 + b.life * 1.35; b.m.scale.setScalar(s);
          b.m.material.opacity = Math.sin(clamp01(b.life) * Math.PI) * 0.8 * (1 - clamp01((pe - 0.24) / 0.08));
        }

        // drips off canopy tips and off the hide
        for (let i = 0; i < DRIP; i++) {
          const s = dripState[i];
          if (s.wait > 0) {
            s.wait -= dt;
            dripPos[i * 6] = dripPos[i * 6 + 3] = 0; dripPos[i * 6 + 1] = dripPos[i * 6 + 4] = -60;
            dripPos[i * 6 + 2] = dripPos[i * 6 + 5] = 0;
            continue;
          }
          s.y -= s.v * dt;
          if (s.y < 0.05) { s.y = s.y0; s.wait = 0.3 + Math.random() * 1.7; }
          dripPos[i * 6] = s.x; dripPos[i * 6 + 1] = s.y; dripPos[i * 6 + 2] = s.z;
          dripPos[i * 6 + 3] = s.x + 0.04; dripPos[i * 6 + 4] = s.y - s.len; dripPos[i * 6 + 5] = s.z;
        }
        dripGeo.attributes.position.needsUpdate = true;
        dripSeg.material.opacity = 0.36 * (1 - clamp01((pe - 0.6) / 0.3) * 0.5);
        _pc.copy(RAIN_COLD).lerp(RAIN_ACID, acid * 0.7);
        dripSeg.material.color.copy(_pc);

        // splashes on the floor, thinning as ash and puddles take over
        const splA = 1 - clamp01((pe - 0.5) / 0.4);
        for (const s of splashPool) {
          s.life += dt / 0.42;
          if (s.life >= 1) {
            s.life = 0;
            s.m.position.set(-6 + (Math.random() - 0.5) * 28, 0.06, -8 + (Math.random() - 0.5) * 24);
          }
          const sc = 0.15 + s.life * 1.3; s.m.scale.setScalar(sc);
          s.m.material.opacity = (1 - s.life) * 0.45 * splA;
        }

        // puddles fill as a faint sheen, then ash skins them over
        const wet = ease(clamp01((pe - 0.06) / 0.3));
        const pAsh = clamp01((ashLoad - 0.25) / 0.6);
        _pc.copy(groundScene.fog.color).lerp(ASH_PALE, pAsh * 0.6).lerp(RAIN_ACID, acid * 0.2);
        for (const m of puddleGrp.children) {
          m.material.opacity = wet * (0.16 + pAsh * 0.12);
          m.material.color.copy(_pc);
        }

        // ash mounding over the carcass and against foreground trunks
        const bury = ease(clamp01((pe - 0.5) / 0.42));
        carcassAsh.scale.set(3.8 * bury + 0.01, 1.7 * bury + 0.01, 2.4 * bury + 0.01);
        _pc.copy(ASH_PALE).lerp(DEAD_BROWN, 0.25 * (1 - bury));
        carcassAsh.material.color.copy(_pc);
        if (pe >= 0.3) dinoMat.color.lerp(ASH_PALE, bury * 0.5);
        const mnd = ease(clamp01((ashLoad - 0.3) / 0.6));
        for (const m of baseMoundGrp.children) m.scale.set(2.4 * mnd + 0.01, 0.7 * mnd + 0.01, 2.4 * mnd + 0.01);

        // eye catch-light: blinks while alive, then out
        eyeGlow.position.set(dino.position.x - 2.7, dino.position.y + 4.5, dino.position.z - 0.3);
        const blink = Math.sin(t * 0.9) > -0.85 ? 1 : 0;
        eyeGlow.material.opacity = (pe < 0.29 ? 1 : 0) * blink * clamp01(vigour) * 0.85;

        // animals fleeing through the far murk, only at the very open
        fleeGrp.visible = pe < 0.17;
        if (fleeGrp.visible) {
          for (const g of fleers) {
            g.position.x -= g.userData.spd * dt;
            if (g.position.x < -140) g.position.x = 120;
            g.position.y = RM * Math.abs(Math.sin(t * 6 + g.userData.ph)) * 0.35;
            g.rotation.z = RM * Math.sin(t * 6 + g.userData.ph) * 0.06;
          }
        }
      }

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
      // Hide relief as a height field, shared by the normal-map bake below.
      // A bumpMap only ever perturbs along the view-space derivative and washes
      // out at grazing angles; a real tangent-space normal map keeps the scutes
      // and pebbling readable across the whole body, which matters on a model
      // with 1820 triangles and no texture of its own.
      function dinoHeight(nx, ny) {
        const peb = noise2(nx * 170, ny * 170);
        const peb2 = noise2(nx * 96 + 3.0, ny * 78 + 6.0);
        // rows of raised scutes running along the body
        const scute = Math.abs(Math.sin((ny * 40 + fbm(nx * 5, ny * 5) * 5) * Math.PI));
        const wrinkle = Math.abs(Math.sin((nx * 12 + fbm(nx * 6, ny * 6) * 4) * Math.PI));
        return 0.5 + (peb - 0.5) * 0.47 + (peb2 - 0.5) * 0.235
          + (1 - scute) * 0.133 - wrinkle * 0.118;
      }
      function paintDinoNormal(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const e = 1 / w;               // one texel, for the central difference
        const S = 1.0;                 // relief strength; fine-tuned by normalScale
        for (let y = 0; y < h; y++) {
          const ny = y / h;
          for (let x = 0; x < w; x++) {
            const nx = x / w;
            const i = (y * w + x) * 4;
            const hx = dinoHeight(nx + e, ny) - dinoHeight(nx - e, ny);
            const hy = dinoHeight(nx, ny + e) - dinoHeight(nx, ny - e);
            const vx = -hx * S, vy = -hy * S, vz = 1;
            const L = Math.sqrt(vx * vx + vy * vy + vz * vz);
            d[i] = (vx / L * 0.5 + 0.5) * 255;
            d[i + 1] = (vy / L * 0.5 + 0.5) * 255;
            d[i + 2] = (vz / L * 0.5 + 0.5) * 255;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      const dinoSkinTex = canvasTex(paintDinoSkin, 512, 512);
      dinoSkinTex.wrapS = dinoSkinTex.wrapT = THREE.RepeatWrapping;
      dinoSkinTex.repeat.set(1, 1.3);
      const dinoNormalTex = canvasTex(paintDinoNormal, 512, 512);
      dinoNormalTex.wrapS = dinoNormalTex.wrapT = THREE.RepeatWrapping;
      dinoNormalTex.repeat.set(1, 1.3);
      // a normal map is vector data, not colour — sRGB decoding would bend
      // every normal toward +Z and flatten the relief back out
      dinoNormalTex.encoding = THREE.LinearEncoding;

      // Quaternius ships this flat-shaded: coincident vertices carry their own
      // per-face normal, so a 1820-triangle body reads as faceted plates and the
      // head shows visible banding. Average the normals of vertices that share a
      // position, but only where the face already agrees with that average —
      // past the limit (a genuine crease: jaw line, teeth, claws) the vertex
      // keeps its own normal so those stay sharp. Done on normals alone rather
      // than by merging vertices, which would have to carry skinIndex and
      // skinWeight across the merge as well.
      function smoothNormals(g, cosLimit) {
        const pos = g.attributes.position, nrm = g.attributes.normal;
        if (!pos || !nrm) return;
        const n = pos.count;
        const buckets = new Map();
        for (let k = 0; k < n; k++) {
          const key = Math.round(pos.getX(k) * 1e4) + ',' +
            Math.round(pos.getY(k) * 1e4) + ',' + Math.round(pos.getZ(k) * 1e4);
          let list = buckets.get(key);
          if (!list) { list = []; buckets.set(key, list); }
          list.push(k);
        }
        const out = new Float32Array(n * 3);
        buckets.forEach((list) => {
          let ax = 0, ay = 0, az = 0;
          for (let j = 0; j < list.length; j++) {
            ax += nrm.getX(list[j]); ay += nrm.getY(list[j]); az += nrm.getZ(list[j]);
          }
          const L = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
          ax /= L; ay /= L; az /= L;
          for (let j = 0; j < list.length; j++) {
            const k = list[j];
            const ox = nrm.getX(k), oy = nrm.getY(k), oz = nrm.getZ(k);
            const agree = ox * ax + oy * ay + oz * az;
            const smooth = agree > cosLimit;
            out[k * 3] = smooth ? ax : ox;
            out[k * 3 + 1] = smooth ? ay : oy;
            out[k * 3 + 2] = smooth ? az : oz;
          }
        });
        for (let k = 0; k < n; k++) nrm.setXYZ(k, out[k * 3], out[k * 3 + 1], out[k * 3 + 2]);
        nrm.needsUpdate = true;
      }

      // three r128 gates skinned deformation on material.skinning — a fresh
      // material without it renders the rig frozen in bind pose (the model
      // translates as one rigid block, no clip ever shows). Keep it true.
      const dinoMat = new THREE.MeshStandardMaterial({
        color: 0xbdbbc2, roughness: 0.92, metalness: 0, transparent: true, opacity: 1,
        map: dinoSkinTex, normalMap: dinoNormalTex,
        // the animal renders about 300 px wide under a weak diffuse key, so a
        // subtle setting (0.55 was the first try) never reaches the screen;
        // 1.6 turns the hide sandy. This is the middle, and it is also what
        // gives the body back the definition the normal smoothing took off it.
        normalScale: new THREE.Vector2(1.1, 1.1),
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
              // after the UV pass, which wants the original per-face normals to
              // pick its projection axis, not the smoothed ones
              smoothNormals(g, 0.72);
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
        setCanopy(0);
        canopyMat.color.copy(CANOPY_LIVE);
        fernMat.color.copy(FERN_LIVE);
        grassMat.color.copy(GRASS_LIVE);
        forestFloor.material.color.setRGB(1, 1, 1);
        rain.material.color.copy(RAIN_COLD);
        dinoMat.color.copy(DINO_LIVE);
        resetGroundExtras();
      }

      function updateGround(t, expoIn) {
        const pe = clamp01((t - EXT_T0) / (EXT_T1 - EXT_T0));
        const dt = 1 / 60;
        // Ground-level view of the same thermal pulse the globe beat shows
        // from orbit: the scene opens under a sky full of re-entering ejecta,
        // which is what the fire rain *is*. It burns out over the first
        // quarter of the phase and hands the frame to the cold rain and ash.
        const broilG = thermalPulse(pe / 0.34);

        // Seismic arrival: the P/S waves reach the site as the scene opens and
        // ring down over ~1 s, with one aftershock. Feeds both the camera and
        // the wind term so the canopy shakes debris loose.
        const quake = reduceMotion ? 0
          : Math.max(0, 1 - pe / 0.055) + 0.45 * Math.max(0, 1 - Math.abs(pe - 0.13) / 0.025);
        // Firestorm wind builds over the first half, never fully still after.
        // Measured: the first pass ran at 0.006-0.02, which put about 0.1 units
        // of sway on a 13-unit conifer — under 1%, i.e. invisible. This range
        // plus the squared lever puts the crown tips at a few per cent.
        windPhaseU.value = t * 2.4;
        windAmpU.value = (reduceMotion ? 0 : 1) *
          (THREE.MathUtils.lerp(0.022, 0.062, ease(clamp01((pe - 0.02) / 0.5))) + quake * 0.09);

        // Ash keeps falling all phase but banks up fastest early, so the
        // ground pales long before the light has finished going.
        const ashLoad = ease(clamp01((pe - 0.05) / 0.55));
        // Acid rain peaks weeks in and then washes out: a sickly sulphur cast
        // that rises through the first third and is gone by the last.
        const acid = pe < 0.28
          ? ease(clamp01((pe - 0.1) / 0.18))
          : 1 - ease(clamp01((pe - 0.28) / 0.4));
        // Scorched crowns first, then the needles drop and the stand goes bare.
        const scorched = ease(clamp01(pe / 0.12));
        const fall = ease(clamp01((pe - 0.1) / 0.42));
        setCanopy(fall);
        canopyMat.color.copy(CANOPY_LIVE).lerp(CANOPY_SCORCH, scorched)
          .lerp(CANOPY_BARE, fall).lerp(ASH_PALE, ashLoad * 0.22);
        // ferns and ground cover die faster than the trees above them
        const wither = ease(clamp01((pe - 0.04) / 0.3));
        fernMat.color.copy(FERN_LIVE).lerp(DEAD_BROWN, wither).lerp(ASH_PALE, ashLoad * 0.4);
        grassMat.color.copy(GRASS_LIVE).lerp(DEAD_BROWN, wither).lerp(ASH_PALE, ashLoad * 0.45);
        // ash banking up on the forest floor — the one thing getting lighter
        forestFloor.material.color.setRGB(1, 1, 1).lerp(ASH_PALE, ashLoad * 0.85);
        rain.material.color.copy(RAIN_COLD).lerp(RAIN_ACID, acid * 0.8);

        // starts lit (some daylight still forces through), then the smoke pall
        // thickens across the phase — but it never reaches full black: the shot
        // ends on a dim, cold gloom with the rain still visibly falling
        const dk = ease(clamp01((pe - 0.2) / 0.72)) * 0.84;
        groundKey.intensity = THREE.MathUtils.lerp(1.7, 0.06, dk);
        groundAmb.intensity = THREE.MathUtils.lerp(0.95, 0.09, dk) + broilG * 0.5;
        groundHemi.intensity = THREE.MathUtils.lerp(0.95, 0.09, dk) + broilG * 0.45;
        // keeps building, but caps short of a white-out so the streaks read
        groundScene.fog.density = THREE.MathUtils.lerp(0.026, 0.07, ease(pe));
        const murk = new THREE.Color(0x7a7062).lerp(new THREE.Color(0x0d0c0a), dk);
        murk.lerp(BROIL_SKY, broilG * 0.8);
        murk.lerp(ACID_HAZE, acid * 0.3 * (1 - broilG));
        groundScene.fog.color.copy(murk);
        groundScene.background.copy(murk);
        const sd = 1 - dk * 0.9;
        groundSky.material.color.setRGB(sd * (1 + broilG * 1.5), sd * (1 + broilG * 0.32), sd * (1 + broilG * 0.04));
        // the light is coming from the whole sky, not the (long gone) sun, so
        // the pulse lands on the ambient and hemisphere terms, not the key
        groundAmb.color.setHex(0x3a342c).lerp(BROIL_LIGHT, broilG * 0.85);
        groundHemi.color.setHex(0x5e5548).lerp(BROIL_LIGHT, broilG * 0.85);
        emberBand.material.opacity = 0.3 * (1 - clamp01(pe / 0.72)) + broilG * 0.5;
        mistGlow.material.opacity = 0.85 * (1 - clamp01(pe / 0.45)); // last light, snuffed by ~pe 0.45
        // Continue the film's exposure rather than cutting to a new one. The
        // globe beat ends almost black; the eye (and the camera) opens up as
        // the frame comes out of the veil, and from there the pall closes it
        // down again. The ramp is short and sits under the veil's fade-out.
        const cut = ease(clamp01(pe / 0.06));
        renderer.toneMappingExposure = THREE.MathUtils.lerp(
          expoIn === undefined ? 1.1 : expoIn,
          THREE.MathUtils.lerp(1.1, 0.46, dk), cut);

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
        groundCam.position.x += Math.sin(t * 57.3) * quake * 0.45;
        groundCam.position.y += Math.sin(t * 48.1) * quake * 0.3;
        groundCam.position.z += Math.sin(t * 63.7) * quake * 0.28;
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
        // same curve as the glow overhead — this is the material making it
        fireRain.material.opacity = 0.62 * broilG;

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
        // The animal fails before it falls: its breathing shallows out and the
        // colour drains out of its hide, and then the ash greys over the body.
        const vigour = 1 - ease(clamp01((pe - 0.08) / 0.22));
        dinoMat.color.copy(DINO_LIVE)
          .lerp(DINO_DEAD, ease(clamp01((pe - 0.1) / 0.34)))
          .lerp(ASH_PALE, ashLoad * 0.3);
        if (dinoMixer) {
          if (pe < 0.3) {
            if (dinoDeath.isRunning()) dinoDeath.stop();
            if (!dinoIdle.isRunning()) dinoIdle.reset().play();
            // breathing goes shallow and slow before the collapse: the idle
            // clip winds down and the body's own rise and fall winds down with it
            dinoIdle.setEffectiveTimeScale(0.42 + vigour * 0.73);
            dinoMixer.update(dt);
            // the idle clip carries the head/tail/leg motion now that skinning
            // works; keep the group layer light so the body doesn't wobble as
            // one rigid block on top of it
            const br = reduceMotion ? 0 : (0.22 + vigour * 0.78);
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
            // no sinking through the floor / fading to nothing any more: it
            // settles a little and the ash blanket (carcassAsh) buries it
            const settle = ease(clamp01((pe - 0.72) / 0.28));
            dino.position.y = -0.12 - settle * 0.4;
            dinoMat.opacity = 1;
          }
        }
        updateGroundExtras(t, pe, dt, broilG, ashLoad, acid, vigour);
      }

