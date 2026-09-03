      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R, 160, 160),
        new THREE.MeshStandardMaterial({
          map: earthMap, bumpMap, bumpScale: 0.22, roughnessMap: specMap,
          roughness: 0.78, metalness: 0.05
        })
      );
      earthGroup.add(earth);

      // Dynamic Blinn-Phong sun glint on open water, masked by the ocean map —
      // reads as a real specular highlight sliding across the sea rather than a
      // flat tinted sphere. (Ported from the standalone import build.)
      const oceanGlint = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.005, 112, 112),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: {
            waterMap: { value: waterMap },
            sunDir: { value: sun.position.clone().normalize() },
            oceanColor: { value: new THREE.Color(0x052840) },
            // Impact site (crater/ejecta) sits just under this glint sphere but
            // the water mask has no idea the shallow sea there turned to land —
            // without masking it out, the specular highlight keeps painting a
            // bright "reflection" patch straight over the crater/ejecta.
            impactDir: { value: impactNormal.clone() },
            // Must cover the full ejecta apron (ejectaFan radius CRATER_R * 2.15,
            // craterGroup settles at ~1.36x scale, plus margin), not just the
            // crater proper — otherwise the sheen still bleeds onto the outer
            // ejecta ring and reads as an odd "reflection" there.
            craterMaskCos: { value: Math.cos(Math.asin(Math.min(0.98, (CRATER_R * 2.15 * 1.36 * 1.15) / EARTH_R))) }
          },
          vertexShader: [
            'varying vec3 vWNormal; varying vec3 vWPos; varying vec2 vUv; varying vec3 vLocalN;',
            'void main(){',
            '  vUv = uv;',
            '  vLocalN = normalize(position);',
            '  vec4 wp = modelMatrix * vec4(position, 1.0);',
            '  vWPos = wp.xyz;',
            '  vWNormal = normalize(mat3(modelMatrix) * normal);',
            '  gl_Position = projectionMatrix * viewMatrix * wp;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D waterMap; uniform vec3 sunDir; uniform vec3 oceanColor;',
            'uniform vec3 impactDir; uniform float craterMaskCos;',
            'varying vec3 vWNormal; varying vec3 vWPos; varying vec2 vUv; varying vec3 vLocalN;',
            'void main(){',
            // impactDir/impactNormal are local-space (relative to earthGroup);
            // must compare against the local-space normal, not the world-space
            // one, or the mask hole drifts off the crater as Earth rotates.
            '  if (dot(vLocalN, impactDir) > craterMaskCos) discard;',
            '  float mask = texture2D(waterMap, vUv).r;',
            '  if (mask < 0.02) discard;',
            '  vec3 n = normalize(vWNormal);',
            '  vec3 v = normalize(cameraPosition - vWPos);',
            '  vec3 l = normalize(sunDir);',
            '  vec3 h = normalize(l + v);',
            '  float spec = pow(max(dot(n, h), 0.0), 140.0) * 3.2;',
            '  float broad = pow(max(dot(n, h), 0.0), 18.0) * 0.25;',
            '  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);',
            '  float glint = spec + broad;',
            '  vec3 col = oceanColor + vec3(1.0, 0.97, 0.87) * glint + vec3(0.3, 0.5, 0.7) * fres * 0.3;',
            '  float alpha = mask * clamp(0.16 + glint * 0.85 + fres * 0.12, 0.0, 1.0);',
            '  gl_FragColor = vec4(col, alpha);',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(oceanGlint);

      const nights = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.004, 112, 112),
        new THREE.MeshBasicMaterial({
          map: nightMap, transparent: true, opacity: 0.85, depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      earthGroup.add(nights);

      function paintCraterMap(ctx, w, h, mode) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const cx = w * 0.5, cy = h * 0.5, maxR = w * 0.5;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const dx = (x - cx) / maxR, dy = (y - cy) / maxR;
            const r = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx);
            const i = (y * w + x) * 4;
            const n = fbm(dx * 7.4 + 2.1, dy * 7.4 + 1.4);
            const n2 = fbm(dx * 18 + 4.2, dy * 18 + 0.7);
            const n3 = fbm(dx * 42, dy * 42);
            const ray = Math.pow(Math.max(0, Math.cos(ang * 5.0 + n * 2.4)), 10);
            const crack = Math.abs(Math.sin(ang * 9.0 + n2 * 6.0)) * Math.abs(Math.sin(r * 22 + n3 * 8));
            let R = 0, G = 0, B = 0, A = 255;
            // Widening the fade zone (previous attempt) fixed the ring but
            // paled the whole floor, because most of the disc — not just the
            // rim — was partly transparent. Wrong lever: the issue was never
            // how WIDE the fade is, it's that a perfectly circular gradient
            // reads as a cutout no matter how gentle. Real crater rims don't
            // fade smoothly, they break up into rubble. So: stay fully solid
            // out to r=0.62, then let noise perturb the effective radius
            // before the (short, steep) fade — the boundary becomes a jagged,
            // broken edge instead of a clean ring, which doesn't read as
            // "cut" even though the transition itself is narrow again.
            const edgeJitter = (fbm(dx * 6 + 11.3, dy * 6 + 5.7) - 0.5) * 0.1
              + (fbm(dx * 14 - 3.2, dy * 14 + 8.9) - 0.5) * 0.04;
            const rEdge = r + edgeJitter;
            const rimT = Math.min(1, Math.max(0, (rEdge - 0.62) / 0.22));
            const jitteredFade = rEdge >= 0.84 ? 0 : 1 - rimT * rimT * (3 - 2 * rimT);
            // hard safety net independent of jitter — guarantees a true,
            // exact zero well inside the mesh's real edge (r=1) no matter
            // which way the noise pushed rEdge, so there's still a proper
            // dead buffer and no mesh-boundary artifact can reappear
            const rimFade = r >= 0.95 ? 0 : jitteredFade;
            if (mode === 'emit') {
              const hot = Math.max(0, 1 - r / 0.46);
              const vein = crack > 0.72 && r < 0.7 ? 0.85 : 0;
              R = (hot * 255 + vein * 200) * (0.75 + n * 0.25);
              G = (hot * hot * 160 + vein * 70);
              B = hot * hot * hot * 70;
              A = Math.min(255, (hot * 240 + vein * 180) * rimFade);
            } else if (mode === 'rough') {
              // glassy melt near the center (low roughness), rough broken breccia
              // further out — sells the "still hot / still glassy" ground feel
              let v;
              if (r < 0.2) {
                v = 26 + n * 16 + (crack > 0.75 ? 46 : 0);
              } else if (r < 0.42) {
                const t = (r - 0.2) / 0.22;
                v = 26 + t * 160 + n2 * 20;
              } else {
                v = 195 + n * 40 + n3 * 20 - (crack > 0.8 ? 70 : 0);
              }
              v = v < 0 ? 0 : v > 255 ? 255 : v;
              R = G = B = v; A = 255;
            } else {
              if (r < 0.2) {
                R = 210; G = 118 - r * 90; B = 42 - r * 80;
                // glassy sheen streaks — cooled impact glass, not matte rock
                const glass = crack > 0.78 ? (crack - 0.78) / 0.22 : 0;
                R += glass * 42; G += glass * 58; B += glass * 74;
              } else if (r < 0.42) {
                const t = (r - 0.2) / 0.22;
                R = 168 - t * 70; G = 72 - t * 32; B = 28 - t * 8;
              } else if (r < 0.7) {
                R = 38 + n * 22 + n3 * 10; G = 22 + n * 12; B = 16 + n * 6;
              } else {
                R = 52 + n * 22 - ray * 12; G = 36 + n * 14; B = 24 + n * 8;
              }
              if (crack > 0.8 && r < 0.68) { R = 210; G = 110; B = 36; }
              if (r > 0.36) {
                // breccia/rubble clasts — fine grain speckle so the rim and
                // ejecta blanket read as broken rock, not a smooth painted ring
                const clast = noise2(dx * 130 + 3.3, dy * 130 + 7.1);
                const speck = (clast - 0.5) * 30;
                R += speck; G += speck * 0.82; B += speck * 0.6;
              }
              // fade the colour itself toward dark ash as the rim approaches
              // the cutout edge, not just alpha — an alpha-only fade still
              // shows a hard-looking colour seam where it turns translucent
              const edgeDark = 1 - rimFade;
              R += (10 - R) * edgeDark * 0.85;
              G += (8 - G) * edgeDark * 0.85;
              B += (6 - B) * edgeDark * 0.85;
              A = rimFade * 255;
            }
            d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = A;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      const craterMap = canvasTex((ctx, w, h) => paintCraterMap(ctx, w, h, 'albedo'), 384, 384);
      const craterEmit = canvasTex((ctx, w, h) => paintCraterMap(ctx, w, h, 'emit'), 384, 384);
      const craterRough = canvasTex((ctx, w, h) => paintCraterMap(ctx, w, h, 'rough'), 384, 384);

      const craterGroup = new THREE.Group();
      craterGroup.position.copy(impactPoint.clone().multiplyScalar(1.0018));
      craterGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), impactNormal);
      earthGroup.add(craterGroup);
      // A plain CircleGeometry only has ONE ring of rim vertices plus a single
      // center vertex — the whole pit/terrace/bowl/rim-hump profile below has
      // nowhere to land except those two radii, so it collapsed into a shallow
      // cone and read as a flat painted disc instead of a real depression with
      // a raised rim. Build the disc with concentric rings instead so the
      // height profile actually has geometry to express itself on.
      const CRATER_RINGS = 32, CRATER_SEGS = 96;
      const craterVertN = 1 + CRATER_RINGS * CRATER_SEGS;
      const craterPosArr = new Float32Array(craterVertN * 3);
      const craterUvArr = new Float32Array(craterVertN * 2);
      const craterCol = new Float32Array(craterVertN * 3);
      function craterVertex(vi, x, y) {
        const r = Math.sqrt(x * x + y * y);
        const ang = Math.atan2(y, x);
        const n = Math.sin(ang * 5.0 + 0.4) * 0.22 + Math.sin(ang * 11.0 + 1.7) * 0.12
          + Math.sin(x * 38 + y * 27) * 0.1 + Math.sin(x * 71 - y * 53) * 0.05;
        const rn = r / CRATER_R;
        let z = 0;
        if (rn < 0.16) {
          z = -0.055 * (1 - rn / 0.16) * (1.08 + n * 0.12);
        } else if (rn < 0.3) {
          const pk = (rn - 0.16) / 0.14;
          z = -0.022 + 0.028 * Math.sin(pk * Math.PI) * (0.82 + n * 0.4);
        } else if (rn < 0.56) {
          const bowl = 1 - (rn - 0.3) / 0.26;
          z = -0.038 * bowl * bowl * (1.05 + n * 0.2);
        } else if (rn < 0.8) {
          const rimT = (rn - 0.56) / 0.24;
          z = 0.022 * Math.sin(rimT * Math.PI) * (0.72 + n * 0.4);
        } else {
          z = 0.004 * (1 - (rn - 0.8) / 0.2) * (0.55 + n * 0.5);
        }
        z *= CRATER_RELIEF;   // hold depth:width fixed as CRATER_R shrinks
        const scallop = 1 + n * 0.06 * Math.min(1, rn * 1.2);
        // Same flat-tangent-plane problem sphereWrap already fixed for boulders:
        // this disc's local x/y is a flat plane at the impact point, and the
        // sphere curves away underneath it — worst at the outer rim, where the
        // uncorrected vertices sat measurably above the true surface (the
        // "crater floor floating above Earth" report). Correct it the same way:
        // scale to the pop's final 1.36x, wrap onto the sphere, scale back down
        // so craterGroup's own scale restores the intended value at settle.
        const [cwx, cwy, cwz] = sphereWrap(x * scallop * 1.36, y * scallop * 1.36, z * 1.36);
        craterPosArr[vi * 3] = cwx / 1.36;
        craterPosArr[vi * 3 + 1] = cwy / 1.36;
        craterPosArr[vi * 3 + 2] = cwz / 1.36;
        craterUvArr[vi * 2] = 0.5 + (x / CRATER_R) * 0.5;
        craterUvArr[vi * 2 + 1] = 0.5 + (y / CRATER_R) * 0.5;
        const melt = Math.max(0, 1 - rn / 0.42);
        const ash = Math.max(0, (rn - 0.55) / 0.45);
        craterCol[vi * 3] = 0.1 + melt * 0.55 + ash * 0.14;
        craterCol[vi * 3 + 1] = 0.055 + melt * 0.2 + ash * 0.08;
        craterCol[vi * 3 + 2] = 0.035 + melt * 0.05 + ash * 0.04;
      }
      craterVertex(0, 0, 0);
      for (let ring = 1; ring <= CRATER_RINGS; ring++) {
        const r = (ring / CRATER_RINGS) * CRATER_R;
        for (let seg = 0; seg < CRATER_SEGS; seg++) {
          const theta = (seg / CRATER_SEGS) * Math.PI * 2;
          craterVertex(1 + (ring - 1) * CRATER_SEGS + seg, Math.cos(theta) * r, Math.sin(theta) * r);
        }
      }
      const craterIdx = [];
      for (let seg = 0; seg < CRATER_SEGS; seg++) {
        craterIdx.push(0, 1 + seg, 1 + (seg + 1) % CRATER_SEGS);
      }
      for (let ring = 1; ring < CRATER_RINGS; ring++) {
        const innerStart = 1 + (ring - 1) * CRATER_SEGS;
        const outerStart = 1 + ring * CRATER_SEGS;
        for (let seg = 0; seg < CRATER_SEGS; seg++) {
          const a = innerStart + seg, b = innerStart + (seg + 1) % CRATER_SEGS;
          const c = outerStart + seg, d = outerStart + (seg + 1) % CRATER_SEGS;
          craterIdx.push(a, c, b, b, c, d);
        }
      }
      const craterGeo = new THREE.BufferGeometry();
      craterGeo.setAttribute('position', new THREE.BufferAttribute(craterPosArr, 3));
      craterGeo.setAttribute('uv', new THREE.BufferAttribute(craterUvArr, 2));
      craterGeo.setAttribute('color', new THREE.BufferAttribute(craterCol, 3));
      craterGeo.setIndex(craterIdx);
      craterGeo.computeVertexNormals();
      const craterFloor = new THREE.Mesh(
        craterGeo,
        new THREE.MeshStandardMaterial({
          map: craterMap, emissiveMap: craterEmit, vertexColors: true,
          // Opaque with normal depth writes, like the import build. Leaving it
          // `transparent:true` made Three.js sort it in the transparent pass
          // against the melt/ejecta/boulder meshes at the same spot; the
          // unstable draw order there was what smeared the lit floor + its
          // emissive into a flat pale "film" over the bowl. polygonOffset keeps
          // it from z-fighting the ejecta blanket at the shared rim.
          depthWrite: true,
          polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
          // No roughnessMap by default — its glassy low-roughness centre + the
          // hard directional sun threw a specular sheen that added to the film.
          roughness: 0.82, metalness: 0.02,
          emissive: 0xff6a18, emissiveIntensity: 0
        })
      );
      craterGroup.add(craterFloor);

      function makeMeltDisc(size, color, z) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(255,210,120,0.95)');
        g.addColorStop(0.22, 'rgba(255,120,28,0.78)');
        g.addColorStop(0.48, 'rgba(210,48,10,0.42)');
        g.addColorStop(0.76, 'rgba(90,12,4,0.12)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        const tex = new THREE.CanvasTexture(c);
        const mesh = new THREE.Mesh(
          new THREE.CircleGeometry(size, 64),
          new THREE.MeshBasicMaterial({
            map: tex, color, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
          })
        );
        mesh.position.z = z;
        craterGroup.add(mesh);
        return mesh;
      }
      const meltPool = makeMeltDisc(CRATER_R * 0.34, 0xffc060, 0.014);
      const meltHalo = makeMeltDisc(CRATER_R * 0.62, 0xff4a10, 0.008);
      const meltOuter = makeMeltDisc(CRATER_R * 0.88, 0xff2208, 0.004);

      function paintEjecta(ctx, w, h) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        const cx = w * 0.5, cy = h * 0.5, maxR = w * 0.5;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const dx = (x - cx) / maxR, dy = (y - cy) / maxR;
            const r = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx);
            const i = (y * w + x) * 4;
            const n = fbm(dx * 9 + 1.2, dy * 9 + 3.4);
            const n2 = fbm(dx * 22, dy * 22);
            // lower powers than before (was 8/14) — those raised such a sharp,
            // narrow spike that the ray streaks read as hard-edged shapes
            // rather than soft rays, worst right near the disc's outer edge
            // where their weight (below) used to be strongest
            const ray = Math.pow(Math.max(0, Math.cos(ang * 6.0 + n * 3.2)), 5)
              + Math.pow(Math.max(0, Math.cos(ang * 11.0 - n2 * 2.1)), 7) * 0.55;
            const blanket = Math.max(0, 1 - r / 0.75) * (0.35 + n * 0.55);
            // rays used to grow toward the outer edge (r*0.7) — exactly where
            // they need to be dying out, not peaking — now they fade to zero
            // well before the disc's true boundary (r=1)
            const rayFalloff = Math.max(0, Math.min(1, (0.85 - r) / 0.85));
            const cover = Math.min(1, blanket + ray * (0.25 + r * 0.5) * rayFalloff);
            const ash = 0.12 + n * 0.08;
            const clast = noise2(dx * 110 + 5.4, dy * 110 + 2.6);
            const speck = clast > 0.72 ? (clast - 0.72) / 0.28 * cover * 26 : 0;
            // No amount of "smoother" math fixed this because the real issue
            // is 8-bit alpha precision: a curve that only reaches zero right
            // at the mesh's true edge (r=1) spends its last few percent of
            // opacity within a couple of quantized alpha levels, and THAT
            // shows up as a ring no matter how gentle the formula is. Fix:
            // finish fading to a hard, exact zero well before the edge
            // (r=0.55), leaving a wide dead buffer with nothing drawn at all
            // before the mesh's actual boundary is ever reached.
            const fadeT = Math.min(1, Math.max(0, (r - 0.1) / 0.65));
            const fadeS = fadeT * fadeT * (3 - 2 * fadeT);
            const fade = r >= 0.75 ? 0 : Math.pow(1 - fadeS, 1.6);
            // premultiply: darken colour toward black together with alpha.
            // Bright RGB left behind fully-transparent texels still bleeds
            // into visible pixels once generateMipmaps blends them for
            // anything far enough away to sample a lower mip level — that
            // bleed is what still read as a hard ring after the alpha-only fade
            const vis = Math.min(1, cover) * fade;
            d[i] = (28 + n * 22 + ray * 18 + speck) * vis;
            d[i + 1] = (18 + n * 12 + ray * 8 + speck * 0.8) * vis;
            d[i + 2] = (12 + n * 6 + speck * 0.5) * vis;
            d[i + 3] = cover * 180 * fade;
          }
        }
        ctx.putImageData(img, 0, 0);
      }
      // Same flat-CircleGeometry problem as craterGeo, worse here because this
      // disc reaches much further out (2.15x CRATER_R) — the curvature the
      // sphere loses under a flat plane grows with distance, so a flat ejecta
      // disc this size bulged far above the true ground. Build it with
      // concentric rings, sphereWrap-corrected, same as craterGeo.
      function makeGroundDisc(radius, rings, segs, zFn) {
        const vertN = 1 + rings * segs;
        const pos = new Float32Array(vertN * 3);
        const uv = new Float32Array(vertN * 2);
        function setVert(vi, x, y) {
          const z = zFn(x, y);
          const [cwx, cwy, cwz] = sphereWrap(x * 1.36, y * 1.36, z * 1.36);
          pos[vi * 3] = cwx / 1.36; pos[vi * 3 + 1] = cwy / 1.36; pos[vi * 3 + 2] = cwz / 1.36;
          uv[vi * 2] = 0.5 + (x / radius) * 0.5; uv[vi * 2 + 1] = 0.5 + (y / radius) * 0.5;
        }
        setVert(0, 0, 0);
        for (let ring = 1; ring <= rings; ring++) {
          const r = (ring / rings) * radius;
          for (let seg = 0; seg < segs; seg++) {
            const theta = (seg / segs) * Math.PI * 2;
            setVert(1 + (ring - 1) * segs + seg, Math.cos(theta) * r, Math.sin(theta) * r);
          }
        }
        const idx = [];
        for (let seg = 0; seg < segs; seg++) idx.push(0, 1 + seg, 1 + (seg + 1) % segs);
        for (let ring = 1; ring < rings; ring++) {
          const innerStart = 1 + (ring - 1) * segs, outerStart = 1 + ring * segs;
          for (let seg = 0; seg < segs; seg++) {
            const a = innerStart + seg, b = innerStart + (seg + 1) % segs;
            const c = outerStart + seg, d = outerStart + (seg + 1) % segs;
            idx.push(a, c, b, b, c, d);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
      }
      const ejectaFan = new THREE.Mesh(
        // craterFloor's own rim/bowl profile tapers to exactly z=0 at its
        // outer edge (rn=1), so the blanket needs to sit flush with that
        makeGroundDisc(CRATER_R * 2.15, 24, 96, () => -0.0005),
        new THREE.MeshBasicMaterial({
          map: canvasTex(paintEjecta, 384, 384),
          transparent: true, opacity: 0, depthWrite: false
        })
      );
      craterGroup.add(ejectaFan);
      const boulderMat = new THREE.MeshStandardMaterial({
        color: 0x2c2218, roughness: 0.96, metalness: 0.08, flatShading: true,
        emissive: 0x4a1808, emissiveIntensity: 0,
        transparent: true, opacity: 0
      });
      // boulders live in their own group so they can counter-scale against
      // craterGroup's excavation pop — otherwise every rock visibly slides
      // outward from the impact point as the crater grows, instead of just appearing
      const boulderGroup = new THREE.Group();
      craterGroup.add(boulderGroup);
      // craterGroup's local x/y is a FLAT tangent plane at the impact point.
      // That's a fine approximation right at the crater, but boulders scattered
      // out on the ejecta blanket sit far enough from the tangent point that
      // the sphere curves away underneath them — a flat offset there measurably
      // overshoots the real surface height (quadratically with distance), which
      // is exactly what made distant rocks appear to float above the horizon.
      // This re-derives (x,y) as an arc-length distance along the sphere and
      // returns the true flat-frame coordinates of that point, so `z` stays a
      // small height-above-ground instead of ballooning into a false altitude.
      function sphereWrap(x, y, z) {
        const L = Math.sqrt(x * x + y * y);
        if (L < 1e-6) return [x, y, z];
        const theta = L / EARTH_R;
        const mag = EARTH_R * Math.sin(theta);
        return [x / L * mag, y / L * mag, z + EARTH_R * (Math.cos(theta) - 1)];
      }
      // ground height at (x,y) in crater-local units, mirrors the craterGeo bowl/rim
      // profile above so boulders sit on the terrain instead of floating on a flat plane
      function craterHeight(x, y) {
        const r = Math.sqrt(x * x + y * y);
        const ang = Math.atan2(y, x);
        const n = Math.sin(ang * 5.0 + 0.4) * 0.22 + Math.sin(ang * 11.0 + 1.7) * 0.12
          + Math.sin(x * 38 + y * 27) * 0.1 + Math.sin(x * 71 - y * 53) * 0.05;
        const rn = Math.min(r / CRATER_R, 1.15);
        // craterVertex scales its identical profile by CRATER_RELIEF before it
        // ever reaches the mesh — missing that here made this return a height
        // up to ~1/CRATER_RELIEF too large, so boulders sat far off the actual
        // (relief-scaled) floor: floating on the rim bump, buried in the bowl.
        let z;
        if (rn < 0.16) z = -0.055 * (1 - rn / 0.16) * (1.08 + n * 0.12);
        else if (rn < 0.3) { const pk = (rn - 0.16) / 0.14; z = -0.022 + 0.028 * Math.sin(pk * Math.PI) * (0.82 + n * 0.4); }
        else if (rn < 0.56) { const bowl = 1 - (rn - 0.3) / 0.26; z = -0.038 * bowl * bowl * (1.05 + n * 0.2); }
        else if (rn < 0.8) { const rimT = (rn - 0.56) / 0.24; z = 0.022 * Math.sin(rimT * Math.PI) * (0.72 + n * 0.4); }
        else if (rn < 1.0) z = 0.004 * (1 - (rn - 0.8) / 0.2) * (0.55 + n * 0.5);
        else z = 0.004 * (0.55 + n * 0.5) * (1 - (rn - 1.0) / 0.15);
        return z * CRATER_RELIEF;
      }
      // each boulder gets its own irregular hull instead of a shared scaled icosahedron —
      // repeated identical rocks read as fake in close-up shots
      function makeBoulderGeo(seed, size) {
        // Smooth sine-wave crag on a subdivided icosahedron reads as a lumpy
        // sphere, not a rock — real broken rock has flat facets at sharply
        // different distances from the centre. Detail-0 icosahedron (12
        // corners, 20 faces) + flatShading gives the facets; per-corner
        // *independent* random jitter (not a smooth field) gives the angular,
        // broken-chunk silhouette instead of a bumpy potato.
        const geo = new THREE.IcosahedronGeometry(size, 0);
        const gp = geo.attributes.position;
        // per-boulder axis stretch so chunks vary between blocky and elongated
        const sx = 0.75 + hash2(seed, 1.1) * 0.6;
        const sy = 0.75 + hash2(seed, 2.3) * 0.6;
        const sz = 0.75 + hash2(seed, 3.7) * 0.6;
        for (let i = 0; i < gp.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(gp, i);
          const nrm = v.clone().normalize();
          // This geometry is non-indexed — each of the 12 corners is
          // duplicated across its adjacent faces. Hash on the (quantized)
          // direction, not the buffer index, so every copy of the same
          // corner gets the identical jitter and the mesh stays watertight
          // instead of cracking apart at the seams.
          const key1 = Math.round(nrm.x * 500) + seed * 97;
          const key2 = Math.round(nrm.y * 500) - Math.round(nrm.z * 500) + seed * 53;
          const jitter = 0.42 + hash2(key1, key2) * 0.8;
          v.copy(nrm.multiplyScalar(size * jitter));
          v.x *= sx; v.y *= sy; v.z *= sz;
          gp.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        return geo;
      }
      const boulders = [];
      const BOULDER_N = 52;
      for (let i = 0; i < BOULDER_N; i++) {
        const seed = i * 3.71 + 1.3;
        const zone = i / BOULDER_N;
        let rad, size;
        // block sizes are absolute world units tuned for the old crater — scale
        // them with CRATER_RELIEF so a rim megablock stays a few % of the crater
        // radius (km-scale on a ~90 km radius bowl), not a chunk of the peak ring
        if (zone < 0.36) {
          // slumped terrace megablocks along the rim
          rad = CRATER_R * (0.58 + ((i * 13) % 9) / 9 * 0.24);
          size = (0.013 + ((i * 7) % 5) * 0.0048) * CRATER_RELIEF;
        } else if (zone < 0.86) {
          // ejecta rubble scattered across the surrounding blanket, thinning
          // out to ~2 crater radii like a real continuous ejecta apron
          rad = CRATER_R * (0.95 + ((i * 17) % 13) / 13 * 1.15);
          size = (0.006 + ((i * 11) % 5) * 0.0026) * CRATER_RELIEF;
        } else {
          // sparse breccia-lens rubble on the floor, clear of the melt pool
          rad = CRATER_R * (0.32 + ((i * 19) % 7) / 7 * 0.2);
          size = (0.008 + ((i * 5) % 4) * 0.003) * CRATER_RELIEF;
        }
        const ang = seed * 1.9 + Math.sin(i * 0.7) * 0.6;
        // x0/y0 are true terrain-local coords (what craterHeight expects to
        // pick the right rim/bowl/blanket zone). boulderGroup counter-scales
        // x/y against craterGroup's pop, so the *placed* x/y must be
        // pre-multiplied by the pop's final scale (1.36) to land on the same
        // spot the terrain itself settles at — z needs no such correction
        // since it isn't counter-scaled and grows with the floor naturally
        const x0 = Math.cos(ang) * rad, y0 = Math.sin(ang) * rad;
        const rock = new THREE.Mesh(makeBoulderGeo(seed, size), boulderMat.clone());
        const dusty = 0.68 + hash2(i * 3.1, 4.2) * 0.55;
        rock.material.color.multiplyScalar(dusty);
        // craterHeight() returns the *raw* (pre-pop) terrain height — but the
        // floor mesh it needs to match renders that value scaled by the pop's
        // final 1.36x (same as x/y above), so it must be pre-scaled here too.
        // The lift (how much of the rock pokes above its resting point) is a
        // fixed physical amount independent of the pop, so it stays unscaled.
        // z then passes through craterGroup's own scale (unlike x/y, which
        // cancel against boulderGroup's counter-scale) — pre-divide by 1.36 so
        // the sphere-corrected height lands right once that scale settles.
        // negative: sink the centre below ground level so more than half the
        // rock is buried — a positive lift here reads as "resting on top"
        const groundZ = craterHeight(x0, y0) * 1.36 - size * 0.3;
        const [wx, wy, wz] = sphereWrap(x0 * 1.36, y0 * 1.36, groundZ);
        rock.position.set(wx, wy, wz / 1.36);
        rock.rotation.set(seed, seed * 1.4, seed * 0.6);
        boulderGroup.add(rock);
        boulders.push(rock);
      }
      craterGroup.scale.setScalar(0.001);
      craterGroup.visible = false;

      let fogMap = placeholderTex('#ffffff');
      let cloudMap = placeholderTex('#ffffff');
      let highCloudMap = placeholderTex('#ffffff');
      const fogLayer = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.02, 80, 80),
        new THREE.MeshLambertMaterial({
          color: 0xd8e4ee, transparent: true, opacity: 0.3, depthWrite: false,
          alphaMap: fogMap
        })
      );
      earthGroup.add(fogLayer);

