      function makeSpriteTex(kind) {
        const c = document.createElement('canvas');
        c.width = c.height = kind === 'cloud' ? 128 : 64;
        const ctx = c.getContext('2d');
        const cx = c.width * 0.5, cy = c.height * 0.5, r = c.width * 0.5;
        ctx.clearRect(0, 0, c.width, c.height);
        if (kind === 'cloud') {
          // soft multi-lobe billow — no hard disc edge
          for (let i = 0; i < 7; i++) {
            const ox = (Math.sin(i * 2.4) * 0.22 + Math.cos(i * 1.1) * 0.08) * r;
            const oy = (Math.cos(i * 1.9) * 0.2 + Math.sin(i * 0.7) * 0.1) * r;
            const rr = r * (0.42 + (i % 3) * 0.1);
            const g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rr);
            g.addColorStop(0, 'rgba(255,255,255,0.55)');
            g.addColorStop(0.35, 'rgba(255,255,255,0.28)');
            g.addColorStop(0.7, 'rgba(255,255,255,0.08)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx + ox, cy + oy, rr, 0, Math.PI * 2);
            ctx.fill();
          }
          const edge = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
          edge.addColorStop(0, 'rgba(255,255,255,0.2)');
          edge.addColorStop(0.55, 'rgba(255,255,255,0.08)');
          edge.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = edge;
          ctx.fillRect(0, 0, c.width, c.height);
        } else if (kind === 'mist') {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, 'rgba(255,255,255,0.55)');
          g.addColorStop(0.25, 'rgba(255,255,255,0.28)');
          g.addColorStop(0.55, 'rgba(255,255,255,0.1)');
          g.addColorStop(0.8, 'rgba(255,255,255,0.025)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, c.width, c.height);
        } else if (kind === 'soot') {
          // ragged multi-lobe, not a plain radial gradient: a plain gradient is
          // rotation-invariant, so a field of them reads as a field of identical
          // dots however much you jitter size and position. Lobes give the
          // sprite a silhouette that per-particle rotation can actually vary.
          for (let i = 0; i < 9; i++) {
            const ox = (Math.sin(i * 3.1) * 0.26 + Math.cos(i * 1.7) * 0.1) * r;
            const oy = (Math.cos(i * 2.3) * 0.24 + Math.sin(i * 1.3) * 0.12) * r;
            const rr = r * (0.3 + (i % 4) * 0.09);
            const g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rr);
            g.addColorStop(0, 'rgba(255,255,255,0.34)');
            g.addColorStop(0.4, 'rgba(255,255,255,0.16)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx + ox, cy + oy, rr, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // irregular rock-chunk silhouette for flying ejecta — a plain radial
          // gradient reads as a glowing marble, not a piece of broken rock
          const spikes = 9;
          const verts = [];
          for (let i = 0; i < spikes; i++) {
            const a = (i / spikes) * Math.PI * 2;
            const rr = r * (0.48 + hash2(i * 4.1 + 2.3, 7.7) * 0.44);
            verts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
          }
          const g = ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.22, 0, cx, cy, r * 0.95);
          g.addColorStop(0, 'rgba(255,255,255,0.95)');
          g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
          g.addColorStop(0.75, 'rgba(255,255,255,0.22)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(verts[0][0], verts[0][1]);
          for (let i = 1; i < spikes; i++) ctx.lineTo(verts[i][0], verts[i][1]);
          ctx.closePath();
          ctx.fill();
          // dark facet on the shadow side so it reads as a chunk, not a disc
          ctx.fillStyle = 'rgba(0,0,0,0.24)';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(verts[Math.floor(spikes * 0.5)][0], verts[Math.floor(spikes * 0.5)][1]);
          ctx.lineTo(verts[Math.floor(spikes * 0.66)][0], verts[Math.floor(spikes * 0.66)][1]);
          ctx.lineTo(verts[Math.floor(spikes * 0.83)][0], verts[Math.floor(spikes * 0.83)][1]);
          ctx.closePath();
          ctx.fill();
        }
        const t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
      }
      const mistTex = makeSpriteTex('mist');
      const sootTex = makeSpriteTex('soot');
      const gritTex = makeSpriteTex('grit');
      const cloudTex = makeSpriteTex('cloud');
      tail.material.map = mistTex;
      tail.material.needsUpdate = true;

      // softGrow: falsy = rock (no swell), true = gas (+45% over life), or a
      // number = gas with that multiple of the swell (fireball billows ~2.5x)
      function makeDebris(count, size, opacity, map, blending, softGrow) {
        const p = new Float32Array(count * 3);
        const c = new Float32Array(count * 3);
        const s = new Float32Array(count);
        const k = new Float32Array(count);
        const r = new Float32Array(count);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
        g.setAttribute('aScale', new THREE.BufferAttribute(k, 1));
        g.setAttribute('aRot', new THREE.BufferAttribute(r, 1));
        const mat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, depthTest: true,
          blending: blending || THREE.NormalBlending,
          uniforms: {
            map: { value: map },
            uOpacity: { value: opacity },
            uScale: { value: size },
            uGrow: { value: softGrow ? 1.0 : 0.0 },
            uGrowMul: { value: typeof softGrow === 'number' ? softGrow : 1.0 },
            uCool: { value: 0.0 },
            uHot: { value: 0.0 },
            uProj: { value: 1000.0 }
          },
          vertexShader: [
            'attribute float aSize; attribute float aScale; attribute float aRot; attribute vec3 color;',
            'varying vec3 vColor; varying float vLife; varying float vRot;',
            'uniform float uScale; uniform float uGrow; uniform float uGrowMul; uniform float uProj;',
            'void main(){',
            '  vColor=color;',
            '  vLife=aSize;',
            '  vRot=aRot;',
            '  float dist=length(position);',
            '  vec4 mv=modelViewMatrix*vec4(position,1.0);',
            '  float age=1.0-aSize;',
            '  float grow=mix(1.0, 1.0+age*0.45*uGrowMul, uGrow);',
            '  // per-particle size is fixed at spawn (aScale) — hashing it off the',
            '  // moving position made every sprite flicker in size frame to frame',
            '  float sz0=uScale*aScale*grow;',
            '  // shrink before the camera-facing quad can clip Earth into a circle.',
            '  // The clip only happens once the quad half-width exceeds the altitude,',
            '  // so scale the threshold with the sprite instead of a fixed 0.22 —',
            '  // that floor forced every launch to start ~2 crater radii up in the air',
            '  float lift=smoothstep(2.4+sz0*0.35, 2.4+sz0*1.25, dist);',
            '  float sz=sz0*lift;',
            '  if(aSize<0.001 || sz<0.0008){ gl_PointSize=0.0; gl_Position=vec4(2.0,2.0,2.0,1.0); return; }',
            '  // uProj = drawing-buffer height / (2 tan(fov/2)): uScale is a true',
            '  // world-space sprite width. The old fixed 280 was ~4x too small for',
            '  // this viewport, so the whole ash column rendered as a faint dusting.',
            '  gl_PointSize=sz*(uProj/max(1.2,-mv.z));',
            '  gl_Position=projectionMatrix*mv;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D map; uniform float uOpacity; uniform float uGrow; uniform float uCool; uniform float uHot;',
            'varying vec3 vColor; varying float vLife; varying float vRot;',
            'void main(){',
            '  vec2 pc=gl_PointCoord-vec2(0.5);',
            '  float rr=length(pc)*2.0;',
            '  if(rr>0.92) discard;',
            '  // Per-particle sprite rotation. gl_PointCoord is axis-aligned, so',
            '  // without this every sprite in a system shows the exact same',
            '  // silhouette at the same angle and a cloud of them reads as one',
            '  // blob motif tiled across the screen instead of as smoke.',
            '  float cs=cos(vRot), sn=sin(vRot);',
            '  vec2 ruv=vec2(pc.x*cs-pc.y*sn, pc.x*sn+pc.y*cs)+vec2(0.5);',
            '  vec4 tex=texture2D(map, ruv);',
            '  float age=1.0-vLife;',
            '  float fade=smoothstep(0.0,0.22,age)*smoothstep(0.0,0.45,vLife);',
            '  // soft round mask only for gas (uGrow=1) — a rock sprite already has a',
            '  // jagged silhouette baked into its alpha; masking it by pure radial',
            '  // distance would sand its spikes back down into a circle.',
            '  // The gas falloff runs almost the whole radius: a mask that only',
            '  // starts at 0.42 leaves a discernible disc edge on every puff.',
            '  float rim=mix(1.0, 1.0-smoothstep(0.08,0.98,rr), uGrow);',
            '  // >1 exponent for gas thins the mid-tones into wisps; <1 (the old',
            '  // 0.88) pushed them up towards solid and made each puff a lump',
            '  float soft=pow(max(tex.a,0.0), mix(1.15, 1.35, uGrow))*rim;',
            '  // incandescent gas (uCool=1) radiates its heat away over its life:',
            '  // white-yellow -> orange -> dull red -> gone, handing over to the ash',
            '  float cool=uCool*smoothstep(0.03,0.72,age);',
            '  vec3 col=mix(vColor, vColor*vec3(0.55,0.16,0.04), cool);',
            '  // Rock leaves the crater incandescent and radiates down the',
            '  // blackbody ramp along its arc. Unlike vapour it does not thin',
            '  // out as it cools — the chunk is still there — so this rides on',
            '  // top of the albedo and leaves the alpha alone.',
            '  float hot=uHot*pow(1.0-smoothstep(0.0,0.5,age), 1.7);',
            '  col+=mix(vec3(1.0,0.34,0.05), vec3(1.0,0.88,0.62), hot)*hot*1.5;',
            '  float a=soft*uOpacity*fade*(1.0-cool*0.85);',
            '  if(a<0.012) discard;',
            '  gl_FragColor=vec4(col,a);',
            '}'
          ].join('\n')
        });
        const pts = new THREE.Points(g, mat);
        // the bounding sphere is computed once, on first render, while every
        // particle is still parked at (80,80,80) — so the default frustum
        // culling threw the whole system away on every frame after that
        pts.frustumCulled = false;
        earthGroup.add(pts);
        debrisSystems.push(mat);
        const parts = [];
        for (let i = 0; i < count; i++) {
          parts.push({ life: 0, max: 1, pos: new THREE.Vector3(80, 80, 80), vel: new THREE.Vector3(), spin: Math.random(), grow: 1 });
          p[i * 3] = p[i * 3 + 1] = p[i * 3 + 2] = 80;
          s[i] = 0;
          k[i] = 1;
          r[i] = 0;
        }
        return { count, p, c, s, k, r, g, pts, parts, mat };
      }

      const debrisSystems = [];
      function setDebrisProj() {
        const px = renderer.domElement.height / (2 * Math.tan(42 * 0.5 * Math.PI / 180));
        debrisSystems.forEach((m) => { m.uniforms.uProj.value = px; });
      }
      // Dense enough to read as a column, large enough to keep mass without sprites
      // resolving individually. The gas systems trade per-sprite opacity for
      // size: at the old 0.05/0.58 a puff was about half a crater radius across
      // and dark enough to see on its own, so the column read as a pile of
      // separate lumps. Roughly 1.75x the width at ~0.55x the alpha keeps about
      // the same optical depth through the plume while every sprite now overlaps
      // several neighbours instead of sitting in its own gap.
      const ejecta = makeDebris(1800, 0.017, 0.98, gritTex, THREE.NormalBlending, false);
      const smoke = makeDebris(4200, 0.088, 0.32, cloudTex, THREE.NormalBlending, true);
      const soot = makeDebris(3200, 0.082, 0.30, sootTex, THREE.NormalBlending, true);
      const mistFine = makeDebris(2600, 0.072, 0.24, mistTex, THREE.NormalBlending, true);
      // incandescent vapour fireball — the ~1/3 of impact energy that goes into
      // shock-heating rock and seawater, rising and billowing off the crater in
      // the first seconds before it cools into the ash column above
      // the fireball keeps most of its opacity: it is additive glow rather than
      // a lump, and it is what veils the hard-edged melt discs on the crater
      const fireball = makeDebris(900, 0.088, 0.52, cloudTex, THREE.AdditiveBlending, 2.6);
      fireball.mat.uniforms.uCool.value = 1.0;
      setDebrisProj();

      // No camera-facing plume sprites. A billboard through the crater
      // clips Earth as a circle whose rim sits on the hit and tracks the camera.

      const groundFog = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.03, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.FrontSide,
          uniforms: {
            impactDir: { value: impactNormal.clone() },
            fogR: { value: 0 },
            fogA: { value: 0 },
            time: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; void main(){ vN=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            'uniform vec3 impactDir; uniform float fogR; uniform float fogA; uniform float time; varying vec3 vN;',
            'void main(){',
            '  vec3 nrm=normalize(vN);',
            '  float ang=acos(clamp(dot(nrm,normalize(impactDir)),-1.0,1.0));',
            '  float n=0.5+0.5*(sin(nrm.x*14.0+time*0.25)+sin(nrm.z*11.0-time*0.2)+sin(nrm.y*17.0+time*0.15));',
            '  float n2=0.5+0.5*(sin(nrm.x*31.0-nrm.y*19.0+time*0.12)+sin(nrm.z*27.0+time*0.08));',
            '  float az=atan(nrm.z,nrm.x);',
            '  float tongue=pow(max(0.0, cos(az*4.0+n*2.4)), 3.2)*0.55+pow(max(0.0, cos(az*7.0-n2*1.8)), 5.5)*0.28;',
            '  float reach=fogR*(0.55+n*0.55+n2*0.28+tongue);',
            '  float cover=1.0-smoothstep(reach*0.08, reach, ang);',
            '  cover=pow(max(cover,0.0), 1.7)*(0.22+n*0.55+n2*0.28);',
            '  vec3 col=mix(vec3(0.28,0.24,0.20), vec3(0.10,0.08,0.06), cover);',
            '  float a=cover*fogA*(0.42+n*0.16);',
            '  if(a<0.012) discard;',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.55));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(groundFog);

      // Layer toggles — lets us isolate one visual system at a time to pin
      // down which one is responsible for a given look, instead of guessing
      // from a screenshot with everything stacked together.
      function wireLayerToggle(id, targets) {
        const el = document.getElementById(id);
        if (!el) return;
        const apply = () => targets.forEach((t) => { if (t) t.visible = el.checked; });
        el.addEventListener('change', apply);
        apply();
      }
      wireLayerToggle('layer-floor', [craterFloor]);
      // sub-toggles for craterFloor's individual material channels — these
      // aren't separate objects, just properties on the one material, so they
      // need their own wiring instead of the .visible-based helper above
      function wireMaterialToggle(id, on, off) {
        const el = document.getElementById(id);
        if (!el) return;
        const apply = () => { off(); if (el.checked) on(); craterFloor.material.needsUpdate = true; };
        el.addEventListener('change', apply);
        apply();
      }
      wireMaterialToggle('layer-floor-albedo',
        () => { craterFloor.material.map = craterMap; craterFloor.material.opacity = 1; },
        () => { craterFloor.material.map = null; craterFloor.material.opacity = 0; });
      wireMaterialToggle('layer-floor-emit',
        () => { craterFloor.material.emissiveMap = craterEmit; },
        () => { craterFloor.material.emissiveMap = null; });
      wireMaterialToggle('layer-floor-rough',
        () => { craterFloor.material.roughnessMap = craterRough; },
        () => { craterFloor.material.roughnessMap = null; });
      wireMaterialToggle('layer-floor-vcolor',
        () => { craterFloor.material.vertexColors = true; },
        () => { craterFloor.material.vertexColors = false; });
      wireMaterialToggle('layer-floor-see',
        // floor is opaque by default now — flip transparent on to preview it.
        // alphaTest has to come off with it: at 0.18 opacity every fragment
        // would fail a 0.5 test and the preview would show nothing at all.
        () => { craterFloor.material.transparent = true; craterFloor.material.opacity = 0.18; craterFloor.material.alphaTest = 0; },
        () => { craterFloor.material.transparent = false; craterFloor.material.opacity = 1; craterFloor.material.alphaTest = 0.5; });
      wireLayerToggle('layer-boulders', [boulderGroup]);
      wireLayerToggle('layer-melt', [meltPool, meltHalo, meltOuter]);
      wireLayerToggle('layer-ejecta', [ejectaFan]);
      wireLayerToggle('layer-scorch', [scorch]);
      wireLayerToggle('layer-fog', [groundFog]);
      wireLayerToggle('layer-particles', [ejecta.pts, smoke.pts, soot.pts, mistFine.pts, fireball.pts]);
      wireLayerToggle('layer-clouds', [clouds, highClouds]);
      wireLayerToggle('layer-bloom', [impactBloom]);
      wireLayerToggle('layer-broil', [broil]);
      wireLayerToggle('layer-tsunami', [tsunami]);
      // shock.visible is also driven every frame by the animate loop once the
      // shockwave phase starts, so a plain .visible toggle here would just get
      // overwritten next frame — gate the animate loop's own assignment instead
      let shockLayerOn = true;
      (function () {
        const el = document.getElementById('layer-shock');
        if (!el) return;
        el.addEventListener('change', () => { shockLayerOn = el.checked; shock.visible = shockLayerOn; });
      })();

      function resetDebris(sys) {
        for (let i = 0; i < sys.count; i++) {
          sys.parts[i].life = 0;
          sys.p[i * 3] = 80;
          sys.p[i * 3 + 1] = 80;
          sys.p[i * 3 + 2] = 80;
          sys.s[i] = 0;
        }
        sys.g.attributes.position.needsUpdate = true;
        sys.g.attributes.aSize.needsUpdate = true;
      }

      // jet: false = loose scatter, true = pre-lofted column,
      //   'curtain' = ejecta curtain: an inverted cone launched off a ring of
      //     radius ringR (the growing rim) at ~45deg, densest at the rim. Big
      //     blocks go slow (land first, closest); fines go fast and far.
      //   'plume' = fireball: born low over the crater with an upward velocity
      //     so it visibly rises, instead of appearing already lofted.
      function spawnBurst(sys, origin, normal, n, speed, spread, life, palette, jet, ringR) {
        let spawned = 0;
        const basis = (jet === 'curtain' || jet === 'plume') ? impactBasis(origin) : null;
        const gas = sys.mat.uniforms.uGrow.value > 0.5;
        function place(i) {
          const pr = sys.parts[i];
          // gas gets a much wider size spread than rock — a cloud built from
          // near-identical sprite sizes reads as a regular field of lumps, and
          // the big faint ones are what tie the small ones into a continuum
          let scl = gas ? 0.4 + Math.pow(Math.random(), 0.8) * 1.5 : 0.55 + Math.random() * 0.5;
          let lifeMul = 1;
          if (basis) {
            const az = Math.random() * Math.PI * 2;
            const radial = basis.tangent.clone().multiplyScalar(Math.cos(az)).addScaledVector(basis.bitan, Math.sin(az));
            // One continuous launch-speed spectrum per plume burst. Each call
            // used to fire a narrow band (x0.55..x1.30 of `speed`), so the two
            // or three calls a system made at contact each settled into their
            // own altitude shell with a 4-14x density void in between, and the
            // column read as a glowing cap floating free of a darker stump.
            // A power law over ~9x covers every band from vent to top: mostly
            // slow material low down, a thin fast core launched off the axis
            // that lives longer because it has further to go.
            const fast = jet === 'plume' ? Math.pow(Math.random(), 1.7) : 0;
            const rr = (ringR || 0) * (jet === 'curtain'
              ? 0.6 + Math.random() * 0.4
              : Math.sqrt(Math.random()) * 0.8 * (1 - fast * 0.55));
            pr.pos.copy(origin).addScaledVector(radial, rr).addScaledVector(normal, 0.02 + Math.random() * 0.04);
            if (jet === 'curtain') {
              // size-sorted: a few big blocks, mostly fines small enough to
              // vanish once they land far out, so the distal spray doesn't
              // read as a field of marbles
              const big = Math.pow(Math.random(), 2.4);
              scl = 0.28 + big * 2.0;
              const el = (38 + (Math.random() - 0.5) * spread) * Math.PI / 180;
              pr.vel.copy(normal).multiplyScalar(Math.sin(el)).addScaledVector(radial, Math.cos(el));
              pr.vel.multiplyScalar(speed * (0.3 + (1 - big) * 0.9 + Math.random() * 0.25));
            } else {
              pr.vel.copy(normal).multiplyScalar(speed * (0.3 + fast * 2.4));
              // the slow skirt spreads widest; the fast core stays collimated
              pr.vel.addScaledVector(radial, speed * Math.random() * spread * (1 - fast * 0.45));
              lifeMul = 1 + fast * 0.7;
            }
            pr.vel.x += (Math.random() - 0.5) * speed * 0.08;
            pr.vel.y += (Math.random() - 0.5) * speed * 0.08;
            pr.vel.z += (Math.random() - 0.5) * speed * 0.08;
          } else {
            // random cone — wide scatter avoids ring / shell stacking
            const rx = Math.random() - 0.5, ry = Math.random() - 0.5, rz = Math.random() - 0.5;
            const dir = normal.clone().add(new THREE.Vector3(rx, ry, rz).multiplyScalar(spread)).normalize();
            const heightBias = Math.pow(Math.random(), jet ? 0.48 : 1.05);
            const lift = jet ? (0.28 + heightBias * 1.45) : (0.18 + Math.random() * 0.32);
            pr.pos.copy(origin).addScaledVector(dir, 0.02 + Math.random() * 0.08);
            pr.pos.addScaledVector(normal, 0.03 + lift * (jet ? 0.22 : 0.12));
            const spd = speed * (0.28 + Math.random() * 1.15 + heightBias * 0.45);
            pr.vel.copy(dir).multiplyScalar(spd);
            if (jet) pr.vel.addScaledVector(normal, speed * (0.28 + heightBias * 0.95));
            pr.vel.x += (Math.random() - 0.5) * speed * 0.18;
            pr.vel.y += (Math.random() - 0.5) * speed * 0.18;
            pr.vel.z += (Math.random() - 0.5) * speed * 0.18;
          }
          sys.k[i] = scl;
          pr.max = life * (0.5 + Math.random() * 0.9) * lifeMul;
          pr.life = pr.max;
          pr.spin = Math.random() * Math.PI * 2;
          sys.r[i] = pr.spin;
          pr.grow = 0.7 + Math.random() * 0.9;
          const col = palette[(spawned + (Math.random() * palette.length | 0)) % palette.length];
          const j = Math.random() * 0.1 - 0.05;
          sys.c[i * 3] = Math.max(0, col[0] + j);
          sys.c[i * 3 + 1] = Math.max(0, col[1] + j * 0.85);
          sys.c[i * 3 + 2] = Math.max(0, col[2] + j * 0.7);
          sys.s[i] = 1;
          spawned++;
        }
        for (let i = 0; i < sys.count && spawned < n; i++) {
          if (sys.parts[i].life <= 0) place(i);
        }
        // Free slots first; if the pool is saturated, recycle whatever has the
        // least life left instead of silently dropping the spawn. A column that
        // has reached its buoyancy cap parks tens of seconds of long-lived
        // material in every slot the system owns, so the sustained vent stopped
        // spawning entirely and the stem under the cap emptied out — rebuilding
        // the same detached cap this pass exists to remove, from the other end.
        while (spawned < n) {
          let worst = -1, worstLife = Infinity;
          for (let i = 0; i < sys.count; i++) {
            const l = sys.parts[i].life;
            if (l < worstLife) { worstLife = l; worst = i; }
          }
          if (worst < 0) break;
          place(worst);
        }
        sys.g.attributes.color.needsUpdate = true;
        sys.g.attributes.aSize.needsUpdate = true;
        sys.g.attributes.aScale.needsUpdate = true;
        sys.g.attributes.aRot.needsUpdate = true;
      }

      const _n = new THREE.Vector3();
      const _side = new THREE.Vector3();
      const _fwd = new THREE.Vector3();
      const _up = new THREE.Vector3(0.2, 1, 0.1);
      // drag/gravity/rise/swirl are tuned as per-frame-at-60fps amounts; scale
      // them by dt so the slow-motion window around contact actually slows the
      // ballistics too (rocks used to keep falling at full speed while the
      // rest of the frame crawled) and frame rate stops changing the arcs
      // settle: seconds of life left once a particle touches the floor (rocks
      // on the ground fade out instead of lying there for their full life)
      // capH: height above floorR at which the gas reaches neutral buoyancy —
      // lift dies out through that band and turns into lateral outflow, so the
      // column spreads into a cap the stem below keeps feeding. Without one,
      // the only thing setting a particle's ceiling was its launch speed.
      function stepDebris(sys, dt, drag, gravity, floorR, rise, swirl, settle, capH) {
        const fr = dt * 60;
        const dragF = Math.pow(drag, fr);
        for (let i = 0; i < sys.count; i++) {
          const pr = sys.parts[i];
          if (pr.life <= 0) {
            // park far off-camera — origin sits inside Earth and a leftover
            // point sprite would clip as a camera-facing circle through the crater
            sys.p[i * 3] = 80;
            sys.p[i * 3 + 1] = 80;
            sys.p[i * 3 + 2] = 80;
            sys.s[i] = 0;
            continue;
          }
          pr.life -= dt;
          const age = 1 - pr.life / pr.max;
          sys.s[i] = Math.max(0.001, pr.life / pr.max);
          pr.vel.multiplyScalar(dragF);
          _n.copy(pr.pos);
          const plen = _n.length();
          if (plen > 1e-6) _n.multiplyScalar(1 / plen);
          if (gravity) pr.vel.addScaledVector(_n, gravity * fr);
          // 0 below the buoyancy band, 1 above it
          const capB = capH ? clamp01((plen - floorR - capH * 0.55) / (capH * 0.6)) : 0;
          if (rise) pr.vel.addScaledVector(_n, rise * (1 - age * 0.65) * (1 - capB) * fr);
          if (capB > 0) {
            // bleed off what upward momentum is left rather than letting the
            // fast core coast straight through the cap and detach above it
            const vn = pr.vel.dot(_n);
            if (vn > 0) pr.vel.addScaledVector(_n, -vn * Math.min(0.85, 0.055 * capB * fr));
          }
          if (swirl) {
            // turbulent widening: a per-particle random horizontal direction
            // (spin is random) — the old single-axis push along n x up flung
            // the whole column sideways into one long horizontal stream
            _side.crossVectors(_n, _up).normalize();
            _fwd.crossVectors(_n, _side);
            const ph = pr.spin * 40 + age * 8;
            // the lift that stops at the cap has to go somewhere: outward
            const sw = swirl * (1 + capB * 6.0);
            pr.vel.addScaledVector(_side, Math.sin(ph) * sw * fr);
            pr.vel.addScaledVector(_fwd, Math.cos(ph) * sw * fr);
          }
          pr.pos.addScaledVector(pr.vel, dt);
          if (floorR) {
            const len = pr.pos.length();
            if (len < floorR) {
              pr.pos.multiplyScalar((floorR + 0.008) / Math.max(len, 1e-6));
              _n.copy(pr.pos).multiplyScalar(1 / (floorR + 0.008));
              pr.vel.reflect(_n).multiplyScalar(0.18);
              if (settle && pr.life > settle) pr.life = settle;
            }
          }
          sys.p[i * 3] = pr.pos.x;
          sys.p[i * 3 + 1] = pr.pos.y;
          sys.p[i * 3 + 2] = pr.pos.z;
        }
        sys.g.attributes.position.needsUpdate = true;
        sys.g.attributes.aSize.needsUpdate = true;
      }

      let start = performance.now();
      let flashPeak = 0;
      let lastPhase = '';
      let debrisBurst = 0;
      // launch axis of the vapour column — tilted downrange at contact, since
      // Chicxulub came in oblique. Null until then; falls back to the vertical.
      let plumeAxis = null;
      let lastDebris = 0;
      let simTime = 0;
      let grainClock = 0;
      let playing = false;
      let frameOpen = false;
      let introT = 0;
      const shake = new THREE.Vector3();
      const holdCam = new THREE.Vector3(0.15, 0.35, 4.15);

