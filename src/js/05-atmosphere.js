      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.036, 96, 96),
        new THREE.MeshLambertMaterial({
          color: 0xffffff, transparent: true, opacity: 0.68, depthWrite: false,
          alphaMap: cloudMap
        })
      );
      earthGroup.add(clouds);

      const highClouds = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.054, 80, 80),
        new THREE.MeshLambertMaterial({
          color: 0xf4f7ff, transparent: true, opacity: 0.34, depthWrite: false,
          alphaMap: highCloudMap
        })
      );
      earthGroup.add(highClouds);

      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R * 1.045, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.BackSide,
          uniforms: {
            glowColor: { value: new THREE.Color(0x6eb8ff) },
            sunDir: { value: sun.position.clone().normalize() },
            impactDir: { value: impactNormal.clone() },
            impactGlow: { value: 0 },
            intensity: { value: 1.0 }
          },
          vertexShader: [
            'varying vec3 vWNormal; varying vec3 vWPos;',
            'void main(){',
            '  vec4 wp=modelMatrix*vec4(position,1.0);',
            '  vWPos=wp.xyz;',
            '  vWNormal=normalize(mat3(modelMatrix)*normal);',
            '  gl_Position=projectionMatrix*viewMatrix*wp;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 glowColor; uniform vec3 sunDir; uniform vec3 impactDir;',
            'uniform float intensity; uniform float impactGlow;',
            'varying vec3 vWNormal; varying vec3 vWPos;',
            'void main(){',
            '  vec3 n=normalize(vWNormal);',
            '  vec3 v=normalize(cameraPosition-vWPos);',
            '  float fres=pow(1.0-max(dot(n,v),0.0), 2.8);',
            '  float day=smoothstep(-0.15,0.45,dot(n,normalize(sunDir)));',
            '  float term=pow(1.0-abs(dot(n,normalize(sunDir))), 3.0);',
            '  float hit=max(0.0, dot(n,normalize(impactDir)));',
            '  float blast=pow(hit, 11.0)*impactGlow;',
            '  vec3 col=mix(glowColor, vec3(1.0,0.55,0.25), term*0.85);',
            '  col=mix(col, vec3(1.0,0.72,0.32), clamp(blast,0.0,1.0));',
            '  float a=fres*(0.18+day*0.72+term*0.55+blast*1.0)*intensity;',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.95));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(atmo);

      const haze = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.078, 64, 64),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.BackSide,
          uniforms: { hazeA: { value: 0.08 }, hazeColor: { value: new THREE.Color(0xa8d8ff) } },
          vertexShader: [
            'varying vec3 vWNormal; varying vec3 vWPos;',
            'void main(){',
            '  vWNormal=normalize(mat3(modelMatrix)*position);',
            '  vWPos=(modelMatrix*vec4(position,1.0)).xyz;',
            '  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform float hazeA; uniform vec3 hazeColor;',
            'varying vec3 vWNormal; varying vec3 vWPos;',
            'void main(){',
            '  vec3 n=normalize(vWNormal);',
            '  vec3 v=normalize(cameraPosition-vWPos);',
            '  float fres=pow(1.0-max(dot(n,v),0.0), 2.6);',
            '  gl_FragColor=vec4(hazeColor, fres*hazeA);',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(haze);

      // Re-entry glow of the thermal pulse: for a short window after the
      // impact the upper atmosphere worldwide is streaked with incandescent
      // returning ejecta. It is a global effect, but it only *reads* against
      // the unlit hemisphere — on the day side the sunlit surface is far
      // brighter than the glowing sky above it.
      const broil = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.03, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.FrontSide,
          blending: THREE.AdditiveBlending,
          uniforms: {
            sunDir: { value: sun.position.clone().normalize() },
            pulse: { value: 0 }
          },
          vertexShader: [
            'varying vec3 vN; varying vec3 vWPos;',
            'void main(){',
            '  vN=normalize(mat3(modelMatrix)*normal);',
            '  vec4 wp=modelMatrix*vec4(position,1.0);',
            '  vWPos=wp.xyz;',
            '  gl_Position=projectionMatrix*viewMatrix*wp;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 sunDir; uniform float pulse;',
            'varying vec3 vN; varying vec3 vWPos;',
            'float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }',
            'float vnoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);',
            '  float a=h31(i), b=h31(i+vec3(1,0,0)), c=h31(i+vec3(0,1,0)), d=h31(i+vec3(1,1,0));',
            '  float e=h31(i+vec3(0,0,1)), g=h31(i+vec3(1,0,1)), hh=h31(i+vec3(0,1,1)), k=h31(i+vec3(1,1,1));',
            '  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(hh,k,f.x),f.y), f.z); }',
            'void main(){',
            '  vec3 n=normalize(vN);',
            '  vec3 v=normalize(cameraPosition-vWPos);',
            '  float day=smoothstep(-0.28,0.4,dot(n,normalize(sunDir)));',
            '  float side=mix(1.0,0.16,day);',
            '  // the glowing shell of air is deepest looking edge-on at the limb',
            '  float lim=pow(1.0-max(dot(n,v),0.0), 2.2);',
            '  float m=0.45+0.55*(vnoise(n*11.0)*0.65+vnoise(n*27.0)*0.35);',
            '  vec3 col=mix(vec3(0.5,0.09,0.02), vec3(1.0,0.46,0.13), pulse);',
            '  float a=pulse*side*(0.22+lim*1.25)*m;',
            '  if(a<0.004) discard;',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.8));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(broil);

      const dust = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R * 1.085, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.BackSide,
          uniforms: {
            impactDir: { value: impactNormal.clone() },
            dustR: { value: 0 },
            dustOpacity: { value: 0 },
            veilCol: { value: new THREE.Color(0x9a6238) },
            time: { value: 0 }
          },
          vertexShader: [
            'varying vec3 vN; varying vec3 vWNormal; varying vec3 vWPos;',
            'void main(){',
            '  vN=normalize(position);',
            '  vWNormal=normalize(mat3(modelMatrix)*position);',
            '  vWPos=(modelMatrix*vec4(position,1.0)).xyz;',
            '  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 impactDir; uniform float dustR; uniform float dustOpacity; uniform float time;',
            'uniform vec3 veilCol;',
            'varying vec3 vN; varying vec3 vWNormal; varying vec3 vWPos;',
            'void main(){',
            '  vec3 ln=normalize(vN);',
            '  float ang=acos(clamp(dot(ln,normalize(impactDir)),-1.0,1.0));',
            '  float n=0.5+0.5*(sin(ln.x*5.5+ln.z*3.8+time*0.11)+sin(ln.y*4.6-time*0.07)+sin((ln.x+ln.z)*7.2+time*0.05)*0.7);',
            '  float az=atan(ln.z,ln.x);',
            '  float tongue=pow(max(0.0, cos(az*3.0+n*2.1)), 2.4)*0.22;',
            '  float reach=dustR*(0.72+n*0.38+tongue);',
            '  float cover=1.0-smoothstep(reach*0.12, reach, ang);',
            '  cover=pow(max(cover,0.0), 1.45)*dustOpacity*(0.35+n*0.65);',
            '  vec3 wn=normalize(vWNormal);',
            '  vec3 view=normalize(cameraPosition-vWPos);',
            '  float fres=pow(1.0-max(dot(wn,view),0.0), 1.55);',
            '  float vol=mix(0.12, 1.0, fres);',
            '  // thin edges of the veil carry its colour; the dense middle of it',
            '  // is already too optically thick to send much of anything back',
            '  vec3 col=mix(veilCol, veilCol*0.26, cover);',
            '  float a=cover*vol*(0.38+n*0.16);',
            '  if(a<0.006) discard;',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.62));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(dust);

      const rockGeo = new THREE.IcosahedronGeometry(ASTEROID_R, 3);
      const pos = rockGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i);
        const nrm = v.clone().normalize();
        const crag = Math.sin(v.x * 42) * 0.09 + Math.cos(v.y * 31) * 0.08 + Math.sin(v.z * 25) * 0.07
          + Math.sin(v.x * 17 + v.y * 13) * 0.05;
        v.copy(nrm.multiplyScalar(ASTEROID_R * (0.78 + crag + Math.random() * 0.04)));
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      rockGeo.computeVertexNormals();
      const asteroid = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
        color: 0x4a3830, roughness: 0.97, metalness: 0.12,
        emissive: 0xff3a08, emissiveIntensity: 0.35,
        flatShading: true
      }));
      scene.add(asteroid);

      // Sphere meshes, never camera-facing sprites — a billboard plane
      // through the rock cuts Earth in a circle whose rim sits on the crater
      // and rotates with the camera.
      const glowGeo = new THREE.SphereGeometry(1, 18, 14);
      function makeAsteroidGlow(color, size) {
        const mat = new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
        });
        const mesh = new THREE.Mesh(glowGeo, mat);
        mesh.scale.setScalar(size);
        asteroid.add(mesh);
        return mesh;
      }
      const fireCore = makeAsteroidGlow(0xffe8b8, ASTEROID_R * 1.42);
      const fireShell = makeAsteroidGlow(0xff6a20, ASTEROID_R * 2.05);
      const fireHalo = makeAsteroidGlow(0xff3a08, ASTEROID_R * 0.01);
      const plasmaShell = makeAsteroidGlow(0xa8dcff, ASTEROID_R * 1.68);
      const plasmaHalo = makeAsteroidGlow(0x6aa8ff, ASTEROID_R * 0.01);
      fireHalo.visible = false;
      plasmaHalo.visible = false;
      const heatLight = new THREE.PointLight(0xff6a20, 0, 4.2, 1.7);
      asteroid.add(heatLight);

      const TAIL = 720;
      const tailPos = new Float32Array(TAIL * 3);
      const tailCol = new Float32Array(TAIL * 3);
      const tailLife = new Float32Array(TAIL);
      for (let i = 0; i < TAIL; i++) tailPos[i * 3] = tailPos[i * 3 + 1] = tailPos[i * 3 + 2] = 80;
      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
      tailGeo.setAttribute('color', new THREE.BufferAttribute(tailCol, 3));
      const tail = new THREE.Points(tailGeo, new THREE.PointsMaterial({
        size: 0.038, vertexColors: true, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, sizeAttenuation: true
      }));
      // Same trap as the debris systems: the bounding sphere is computed once,
      // on the first render, while every point is still parked at (80,80,80).
      // The frustum then never contains it and the whole trail is culled on
      // every frame after that — which is why the ablation streak had never
      // actually appeared on screen.
      tail.frustumCulled = false;
      scene.add(tail);

      const shock = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.035, 96, 96),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
          uniforms: {
            impactDir: { value: impactNormal.clone() },
            waveR: { value: 0 },
            waveW: { value: 0.07 },
            waveA: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; void main(){ vN=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            'uniform vec3 impactDir; uniform float waveR; uniform float waveW; uniform float waveA; varying vec3 vN;',
            'void main(){',
            '  float ang=acos(clamp(dot(normalize(vN),normalize(impactDir)),-1.0,1.0));',
            '  float n=sin(vN.x*28.0+vN.y*17.0)*0.5+0.5;',
            '  float w=waveW*(0.85+n*0.3);',
            '  float ring=smoothstep(waveR-w,waveR,ang)*(1.0-smoothstep(waveR,waveR+w*0.7,ang));',
            '  float trail=smoothstep(waveR-w*3.2,waveR-w,ang)*(1.0-smoothstep(waveR-w,waveR,ang))*0.35;',
            '  vec3 col=mix(vec3(1.0,0.45,0.12), vec3(1.0,0.95,0.78), ring);',
            '  gl_FragColor=vec4(col, (ring*0.95+trail)*waveA);',
            '}'
          ].join('\n')
        })
      );
      shock.visible = false;
      earthGroup.add(shock);

      const impactBloom = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.035, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.FrontSide,
          blending: THREE.AdditiveBlending,
          uniforms: {
            impactDir: { value: impactNormal.clone() },
            bloomR: { value: 0 },
            bloomA: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; void main(){ vN=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            'uniform vec3 impactDir; uniform float bloomR; uniform float bloomA; varying vec3 vN;',
            'void main(){',
            '  vec3 n=normalize(vN);',
            '  float ang=acos(clamp(dot(n,normalize(impactDir)),-1.0,1.0));',
            '  float soft=1.0-smoothstep(0.0, max(0.001,bloomR), ang);',
            '  float core=pow(soft, 5.2);',
            '  float mid=pow(soft, 2.4);',
            '  float nse=sin(n.x*27.0+n.y*19.0)*0.05+sin(n.z*31.0-n.x*13.0)*0.04;',
            '  vec3 col=mix(vec3(0.72,0.12,0.02), vec3(1.0,0.42,0.06), mid);',
            '  col=mix(col, vec3(1.0,0.72,0.22), core);',
            '  float a=clamp((soft*0.28+core*0.38+nse)*bloomA,0.0,0.72);',
            '  if(a<0.012) discard;',
            '  gl_FragColor=vec4(col, a);',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(impactBloom);

      const tsunami = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.018, 96, 96),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.FrontSide,
          uniforms: {
            ...impactFirstUniforms,
            impactDir: { value: impactNormal.clone() },
            waterMap: { value: waterMap },
            waveR: { value: 0 },
            waveA: { value: 0 },
            trainW: { value: 0.1 },
            resurge: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vN=normalize(position); vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            impactFirstGLSL,
            'uniform vec3 impactDir; uniform sampler2D waterMap;',
            'uniform float waveR; uniform float waveA; uniform float trainW; uniform float resurge;',
            'varying vec3 vN; varying vec2 vUv;',
            'void main(){',
            '  float ang=acos(clamp(dot(normalize(vN),normalize(impactDir)),-1.0,1.0));',
            '  float wet=surfaceWater(vUv, texture2D(waterMap, vUv).r);',
            '  // the water mask fades across its own shoreline, so its midtones',
            '  // are the coast — that is where run-up piles the wave up',
            '  float coast=pow(4.0*wet*(1.0-wet), 0.6);',
            '  // Resurge: the sea pouring back into an empty crater. It moves',
            '  // inward, the opposite way to everything else in the shot, and',
            '  // it is what launches the outward train when it rebounds.',
            '  float rr=mix(0.30, 0.05, resurge);',
            '  float res=(1.0-smoothstep(0.0, 0.075, abs(ang-rr)))*resurge*(1.0-resurge*0.18);',
            '  // Wave train: a shallow-water set of crests, not one wall. Each',
            '  // crest is lower than the one ahead of it, and all of them lose',
            '  // height as the ring they are spread around grows.',
            '  float train=0.0;',
            '  float crest=0.0;',
            '  for (int k=0; k<4; k++) {',
            '    float r=waveR-float(k)*trainW;',
            '    if (r<=0.0) continue;',
            '    float amp=exp(-float(k)*0.62);',
            '    float b=smoothstep(r-trainW*0.35, r, ang)*(1.0-smoothstep(r, r+trainW*0.2, ang));',
            '    train+=b*amp;',
            '    crest=max(crest, pow(b,2.0)*amp);',
            '  }',
            '  float spread=1.0/sqrt(max(sin(min(ang,3.0)), 0.3));',
            '  // nothing propagates out of the hole itself: inside the rim and',
            '  // its apron the water is still collapsing in, not travelling out',
            '  float born=smoothstep(0.06, 0.2, ang);',
            '  train*=spread*born; crest*=spread*born;',
            '  // Near the impact the platform is simply drowned — the wave runs',
            '  // hundreds of kilometres over low ground before it is a coastal',
            '  // wave at all — so the near field is not masked to open water.',
            '  // Past that it travels on sea only, and climbs at the shorelines.',
            '  float flood=1.0-smoothstep(0.12, 0.45, ang);',
            '  float carry=max(wet, flood*0.5);',
            '  float sea=train*carry;',
            '  float run=train*coast*2.6;',
            '  vec3 swell=vec3(0.04,0.22,0.30);',
            '  vec3 foam=vec3(0.80,0.91,0.96);',
            '  vec3 churn=vec3(0.74,0.80,0.80);',
            '  // The resurge carries its own weight: it happens before the train',
            '  // exists, so it cannot hang off the train amplitude. It also does',
            '  // not need the water mask — it *is* the sea, pouring across the',
            '  // drowned platform and into the open hole.',
            '  float a=(sea*1.15+run)*waveA+res*max(wet,0.65)*1.35;',
            '  if(a<0.008) discard;',
            '  vec3 col=mix(swell, foam, clamp(crest*1.6+run*0.9, 0.0, 1.0));',
            '  col=mix(col, churn, clamp(res*1.4, 0.0, 1.0));',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.8));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(tsunami);

      const flashOrb = new THREE.PointLight(0xfff4d0, 0, 5.6, 1.35); // hard local flare, not a whole-planet wash
      flashOrb.position.copy(impactPoint.clone().multiplyScalar(1.22));
      earthGroup.add(flashOrb);
      const fillOrb = new THREE.PointLight(0xff8a32, 0, 4.2, 1.45);
      fillOrb.position.copy(impactPoint.clone().multiplyScalar(1.08));
      earthGroup.add(fillOrb);
      const craterLight = new THREE.PointLight(0xff7a28, 0, 1.3, 1.65); // reach hugs the smaller crater
      craterLight.position.copy(impactPoint.clone().multiplyScalar(1.055));
      earthGroup.add(craterLight);

      // Ejecta deposit on the globe (the `scorch` layer). Three zones, all
      // measured as angular distance from the impact (crater radius is
      // CRATER_R/EARTH_R ~ 0.042 rad):
      //  - continuous blanket: dark, hummocky, lobate edge, out to ~3 crater
      //    radii (one crater diameter beyond the rim), thinning outward
      //  - discontinuous rays: pale streaks of pulverised platform carbonate,
      //    broken into dashes (secondary-crater chains), reaching several
      //    times farther, longer downrange of the oblique approach
      //  - distal spherule fall: a faint pale speckle that sweeps the whole
      //    globe behind a ballistic front
      // plus a low wide char beyond the blanket so the shock beat keeps its
      // burnt continent until the thermal-pulse pass owns that.
      const scorch = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.012, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.FrontSide,
          uniforms: {
            ...impactFirstUniforms,
            impactDir: { value: impactNormal.clone() },
            downDir: { value: new THREE.Vector3(1, 0, 0) },
            waterMap: { value: waterMap },
            blanketR: { value: 0 },
            burn: { value: 0 },
            rayF: { value: 0 },
            distF: { value: 0 },
            heat: { value: 0 },
            scorchA: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vN=normalize(position); vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            impactFirstGLSL,
            'uniform sampler2D waterMap; varying vec2 vUv;',
            'uniform vec3 impactDir; uniform vec3 downDir; uniform float blanketR; uniform float burn; uniform float rayF; uniform float distF; uniform float heat; uniform float scorchA; varying vec3 vN;',
            'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
            'float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }',
            '// cell value-noise: sin-grid "noise" at this frequency aliases into a',
            '// visible moire lattice across the whole globe',
            'float vnoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);',
            '  float a=h31(i), b=h31(i+vec3(1,0,0)), c=h31(i+vec3(0,1,0)), d=h31(i+vec3(1,1,0));',
            '  float e=h31(i+vec3(0,0,1)), g=h31(i+vec3(1,0,1)), hh=h31(i+vec3(0,1,1)), k=h31(i+vec3(1,1,1));',
            '  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(hh,k,f.x),f.y), f.z); }',
            'void main(){',
            '  vec3 nrm=normalize(vN);',
            '  vec3 dir=normalize(impactDir);',
            '  float ang=acos(clamp(dot(nrm,dir),-1.0,1.0));',
            '  // azimuth around the site, measured from the downrange direction',
            '  vec3 tanU=normalize(downDir-dir*dot(downDir,dir));',
            '  vec3 bitU=cross(dir,tanU);',
            '  vec3 fl3=nrm-dir*dot(nrm,dir);',
            '  float fl=length(fl3);',
            '  vec3 d=fl>1e-5?fl3/fl:tanU;',
            '  float az=atan(dot(d,bitU),dot(d,tanU));',
            '  float down=dot(d,tanU);',
            '  float n=sin(nrm.x*18.0+nrm.y*11.0)*0.42+sin(nrm.z*23.0+nrm.x*9.0)*0.32+sin(nrm.y*31.0-nrm.z*14.0)*0.18;',
            '  float n2=sin(nrm.x*41.0-nrm.z*27.0)*0.28+sin(nrm.y*53.0+nrm.x*19.0)*0.2;',
            '  float n3=(0.6*vnoise(nrm*90.0)+0.4*vnoise(nrm*230.0))*2.0-1.0;',
            '  // --- continuous blanket: lobate rim, slightly longer downrange',
            '  float lobe=1.0+0.18*sin(az*7.0+n*2.0)+0.1*sin(az*13.0-n2*3.0)+0.12*down;',
            '  float bEdge=blanketR*lobe;',
            '  float blanket=1.0-smoothstep(bEdge*0.5, bEdge, ang);',
            '  blanket*=0.7+0.3*(0.5+0.5*n3)*(0.6+0.4*n);',
            '  // --- rays: narrow radial streaks, each its own length, dashed',
            '  float rayA=pow(max(0.0, cos(az*9.0+n*1.6)), 14.0)+pow(max(0.0, cos(az*17.0-n2*2.2+1.3)), 22.0)*0.7+pow(max(0.0, cos(az*5.0+0.7)), 9.0)*0.5;',
            '  float rid=floor((az+3.1416)/6.2832*17.0+0.5);',
            '  float len=0.35+0.65*h21(vec2(rid,2.0));',
            '  float reach=blanketR*(1.3+4.2*len*(0.72+0.38*down))*rayF;',
            '  float ray=rayA*(1.0-smoothstep(reach*0.55, reach, ang))*smoothstep(bEdge*0.6, bEdge*1.05, ang);',
            '  // irregular gaps (secondary-crater clusters), not a regular ladder',
            '  float dash=0.4+0.6*smoothstep(0.32,0.68, vnoise(vec3(ang*150.0, az*7.0, 1.7)));',
            '  ray*=dash*(0.7+0.3*n3);',
            '  // --- distal spherule fall: faint pale speckle behind a global front',
            '  float front=distF*3.3;',
            '  // transient: brightest just behind the front, settled out once it has passed',
            '  float dn=vnoise(nrm*28.0)*0.6+vnoise(nrm*70.0)*0.4;',
            '  float distal=(1.0-smoothstep(front-0.7, front, ang))*distF*(1.0-distF)*3.2*smoothstep(0.3,0.8,dn)*0.11;',
            '  // --- wildfire char. The thermal pulse ignites fires worldwide, so',
            '  // this is a global patchy burn on land, not a ring around the',
            '  // crater — a little denser near the impact where the re-entry flux',
            '  // is heaviest. `burn` only ever grows: scars do not un-burn.',
            '  float burnP=vnoise(nrm*7.0)*0.6+vnoise(nrm*19.0)*0.4;',
            '  float near=0.78+0.3*(1.0-smoothstep(0.35,1.9,ang));',
            '  float chr=burn*smoothstep(0.66-burn*0.52, 1.04-burn*0.44, burnP*near)*(0.55+0.45*burnP);',
            '  // --- colours: dark hummocky blanket, pale carbonate rays, hot inner zone early',
            '  vec3 blanketCol=mix(vec3(0.15,0.12,0.09), vec3(0.24,0.20,0.15), 0.5+0.5*n3);',
            '  float melt=pow(max(1.0-ang/(blanketR*0.5+0.001),0.0), 2.6)*heat;',
            '  blanketCol=mix(blanketCol, vec3(0.95,0.45,0.12), melt);',
            '  vec3 rayCol=vec3(0.66,0.62,0.55);',
            '  vec3 charCol=vec3(0.12,0.09,0.06);',
            '  // rays and char only persist on land — over open water the fall-out',
            '  // sinks and disperses (the blanket itself still buries the shelf)',
            '  float land=1.0-0.85*surfaceWater(vUv, texture2D(waterMap, vUv).r);',
            '  float aB=blanket*scorchA;',
            '  float aR=ray*scorchA*0.7*land;',
            '  float aC=chr*scorchA*0.6*land;',
            '  float aD=distal;',
            '  float a=aB+aR*(1.0-aB)+aC*(1.0-aB-aR*(1.0-aB))+aD;',
            '  if(a<0.015) discard;',
            '  vec3 col=(blanketCol*aB+rayCol*aR*(1.0-aB)+charCol*aC*(1.0-aB-aR*(1.0-aB))+vec3(0.75,0.72,0.66)*aD)/max(a,1e-4);',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.7));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(scorch);
