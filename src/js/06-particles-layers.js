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
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, 'rgba(255,255,255,0.42)');
          g.addColorStop(0.3, 'rgba(255,255,255,0.18)');
          g.addColorStop(0.65, 'rgba(255,255,255,0.05)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, c.width, c.height);
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

      function makeDebris(count, size, opacity, map, blending, softGrow) {
        const p = new Float32Array(count * 3);
        const c = new Float32Array(count * 3);
        const s = new Float32Array(count);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
        const mat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, depthTest: true,
          blending: blending || THREE.NormalBlending,
          uniforms: {
            map: { value: map },
            uOpacity: { value: opacity },
            uScale: { value: size },
            uGrow: { value: softGrow ? 1.0 : 0.0 }
          },
          vertexShader: [
            'attribute float aSize; attribute vec3 color;',
            'varying vec3 vColor; varying float vLife;',
            'uniform float uScale; uniform float uGrow;',
            'void main(){',
            '  vColor=color;',
            '  vLife=aSize;',
            '  float dist=length(position);',
            '  // shrink before the camera-facing quad can clip Earth into a circle',
            '  float lift=smoothstep(2.46, 2.62, dist);',
            '  vec4 mv=modelViewMatrix*vec4(position,1.0);',
            '  float rnd=fract(sin(dot(position.xy+position.z, vec2(12.9898,78.233)))*43758.5453);',
            '  float age=1.0-aSize;',
            '  float grow=mix(1.0, 1.0+age*0.45, uGrow);',
            '  float sz=mix(uScale*0.55,uScale*1.05,rnd)*grow*lift;',
            '  if(aSize<0.001 || sz<0.0008){ gl_PointSize=0.0; gl_Position=vec4(2.0,2.0,2.0,1.0); return; }',
            '  gl_PointSize=sz*(280.0/max(1.2,-mv.z));',
            '  gl_Position=projectionMatrix*mv;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D map; uniform float uOpacity; uniform float uGrow;',
            'varying vec3 vColor; varying float vLife;',
            'void main(){',
            '  vec2 pc=gl_PointCoord-vec2(0.5);',
            '  float rr=length(pc)*2.0;',
            '  if(rr>0.92) discard;',
            '  vec4 tex=texture2D(map, gl_PointCoord);',
            '  float age=1.0-vLife;',
            '  float fade=smoothstep(0.0,0.22,age)*smoothstep(0.0,0.45,vLife);',
            '  // soft round mask only for gas (uGrow=1) — a rock sprite already has a',
            '  // jagged silhouette baked into its alpha; masking it by pure radial',
            '  // distance would sand its spikes back down into a circle',
            '  float rim=mix(1.0, 1.0-smoothstep(0.42,0.92,rr), uGrow);',
            '  float soft=pow(max(tex.a,0.0), mix(1.15, 0.88, uGrow))*rim;',
            '  float a=soft*uOpacity*fade;',
            '  if(a<0.012) discard;',
            '  gl_FragColor=vec4(vColor,a);',
            '}'
          ].join('\n')
        });
        const pts = new THREE.Points(g, mat);
        earthGroup.add(pts);
        const parts = [];
        for (let i = 0; i < count; i++) {
          parts.push({ life: 0, max: 1, pos: new THREE.Vector3(80, 80, 80), vel: new THREE.Vector3(), spin: Math.random(), grow: 1 });
          p[i * 3] = p[i * 3 + 1] = p[i * 3 + 2] = 80;
          s[i] = 0;
        }
        return { count, p, c, s, g, pts, parts, mat };
      }

      // Dense enough to read as a column, large enough to keep mass without sprites
      const ejecta = makeDebris(1800, 0.014, 0.98, gritTex, THREE.NormalBlending, false);
      const smoke = makeDebris(4200, 0.038, 0.58, cloudTex, THREE.NormalBlending, true);
      const soot = makeDebris(3200, 0.030, 0.58, sootTex, THREE.NormalBlending, true);
      const mistFine = makeDebris(2600, 0.032, 0.40, mistTex, THREE.NormalBlending, true);

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
        // floor is opaque by default now — flip transparent on to preview it
        () => { craterFloor.material.transparent = true; craterFloor.material.opacity = 0.18; },
        () => { craterFloor.material.transparent = false; craterFloor.material.opacity = 1; });
      wireLayerToggle('layer-boulders', [boulderGroup]);
      wireLayerToggle('layer-melt', [meltPool, meltHalo, meltOuter]);
      wireLayerToggle('layer-ejecta', [ejectaFan]);
      wireLayerToggle('layer-scorch', [scorch]);
      wireLayerToggle('layer-fog', [groundFog]);
      wireLayerToggle('layer-particles', [ejecta.pts, smoke.pts, soot.pts, mistFine.pts]);
      wireLayerToggle('layer-clouds', [clouds, highClouds]);
      wireLayerToggle('layer-bloom', [impactBloom]);
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

      function spawnBurst(sys, origin, normal, n, speed, spread, life, palette, jet) {
        let spawned = 0;
        for (let i = 0; i < sys.count && spawned < n; i++) {
          const pr = sys.parts[i];
          if (pr.life > 0) continue;
          // random cone — wide scatter avoids ring / shell stacking
          const rx = Math.random() - 0.5, ry = Math.random() - 0.5, rz = Math.random() - 0.5;
          const dir = normal.clone().add(new THREE.Vector3(rx, ry, rz).multiplyScalar(spread)).normalize();
          const heightBias = Math.pow(Math.random(), jet ? 0.48 : 1.05);
          const lift = jet ? (0.28 + heightBias * 1.45) : (0.18 + Math.random() * 0.32);
          pr.pos.copy(origin).addScaledVector(dir, 0.08 + Math.random() * 0.22);
          pr.pos.addScaledVector(normal, 0.34 + lift * (jet ? 0.95 : 0.58));
          const spd = speed * (0.28 + Math.random() * 1.15 + heightBias * 0.45);
          pr.vel.copy(dir).multiplyScalar(spd);
          if (jet) pr.vel.addScaledVector(normal, speed * (0.28 + heightBias * 0.95));
          pr.vel.x += (Math.random() - 0.5) * speed * 0.18;
          pr.vel.y += (Math.random() - 0.5) * speed * 0.18;
          pr.vel.z += (Math.random() - 0.5) * speed * 0.18;
          pr.max = life * (0.5 + Math.random() * 0.9);
          pr.life = pr.max;
          pr.spin = Math.random() * Math.PI * 2;
          pr.grow = 0.7 + Math.random() * 0.9;
          const col = palette[(spawned + (Math.random() * palette.length | 0)) % palette.length];
          const j = Math.random() * 0.1 - 0.05;
          sys.c[i * 3] = Math.max(0, col[0] + j);
          sys.c[i * 3 + 1] = Math.max(0, col[1] + j * 0.85);
          sys.c[i * 3 + 2] = Math.max(0, col[2] + j * 0.7);
          sys.s[i] = 1;
          spawned++;
        }
        sys.g.attributes.color.needsUpdate = true;
        sys.g.attributes.aSize.needsUpdate = true;
      }

      const _n = new THREE.Vector3();
      const _side = new THREE.Vector3();
      const _up = new THREE.Vector3(0.2, 1, 0.1);
      function stepDebris(sys, dt, drag, gravity, floorR, rise, swirl) {
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
          pr.vel.multiplyScalar(drag);
          _n.copy(pr.pos);
          const plen = _n.length();
          if (plen > 1e-6) _n.multiplyScalar(1 / plen);
          if (gravity) pr.vel.addScaledVector(_n, gravity);
          if (rise) pr.vel.addScaledVector(_n, rise * (1 - age * 0.65));
          if (swirl) {
            _side.crossVectors(_n, _up).normalize();
            pr.vel.addScaledVector(_side, Math.sin(pr.spin * 40 + age * 8) * swirl);
          }
          pr.pos.addScaledVector(pr.vel, dt);
          if (floorR) {
            const len = pr.pos.length();
            if (len < floorR) {
              pr.pos.multiplyScalar((floorR + 0.008) / Math.max(len, 1e-6));
              _n.copy(pr.pos).multiplyScalar(1 / (floorR + 0.008));
              pr.vel.reflect(_n).multiplyScalar(0.18);
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
      let lastDebris = 0;
      let simTime = 0;
      let grainClock = 0;
      let playing = false;
      let frameOpen = false;
      let introT = 0;
      const shake = new THREE.Vector3();
      const holdCam = new THREE.Vector3(0.15, 0.35, 4.15);

