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

      const dust = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R * 1.085, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.BackSide,
          uniforms: {
            impactDir: { value: impactNormal.clone() },
            dustR: { value: 0 },
            dustOpacity: { value: 0 },
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
            '  vec3 col=mix(vec3(0.22,0.18,0.14), vec3(0.07,0.055,0.04), cover);',
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
            impactDir: { value: impactNormal.clone() },
            waveR: { value: 0 },
            waveA: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; void main(){ vN=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            'uniform vec3 impactDir; uniform float waveR; uniform float waveA; varying vec3 vN;',
            'void main(){',
            '  float ang=acos(clamp(dot(normalize(vN),normalize(impactDir)),-1.0,1.0));',
            '  float band=smoothstep(waveR-0.08,waveR,ang)*(1.0-smoothstep(waveR,waveR+0.05,ang));',
            '  float foam=pow(band,1.5);',
            '  vec3 col=mix(vec3(0.05,0.25,0.35), vec3(0.75,0.88,0.95), foam);',
            '  gl_FragColor=vec4(col, band*waveA*0.75);',
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

      const scorch = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_R + 0.012, 80, 80),
        new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, side: THREE.FrontSide,
          uniforms: {
            impactDir: { value: impactNormal.clone() },
            scorchR: { value: 0 },
            scorchA: { value: 0 }
          },
          vertexShader: 'varying vec3 vN; void main(){ vN=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: [
            'uniform vec3 impactDir; uniform float scorchR; uniform float scorchA; varying vec3 vN;',
            'void main(){',
            '  vec3 nrm=normalize(vN);',
            '  vec3 dir=normalize(impactDir);',
            '  float ang=acos(clamp(dot(nrm,dir),-1.0,1.0));',
            '  float n=sin(nrm.x*18.0+nrm.y*11.0)*0.42+sin(nrm.z*23.0+nrm.x*9.0)*0.32+sin(nrm.y*31.0-nrm.z*14.0)*0.18;',
            '  float n2=sin(nrm.x*41.0-nrm.z*27.0)*0.28+sin(nrm.y*53.0+nrm.x*19.0)*0.2;',
            '  float az=atan(nrm.z,nrm.x);',
            '  float ray=pow(max(0.0, cos(az*6.0+n*2.8)), 9.0)+pow(max(0.0, cos(az*11.0-n2*3.1)), 14.0)*0.55;',
            '  float lobe=0.62+n*0.38+n2*0.22+sin(az*3.0+nrm.y*6.0)*0.16;',
            '  float blanket=1.0-smoothstep(scorchR*0.04, scorchR*lobe, ang);',
            '  blanket=pow(max(blanket,0.0), 1.85)*(0.28+n*0.42+n2*0.18);',
            '  float streaks=ray*smoothstep(scorchR*1.22, scorchR*0.1, ang);',
            '  float cover=max(blanket, streaks*0.72);',
            '  float melt=pow(max(1.0-ang/(scorchR*0.26+0.001),0.0), 3.4);',
            '  float glass=pow(max(1.0-ang/(scorchR*0.13+0.001),0.0), 4.2);',
            '  vec3 ash=mix(vec3(0.14,0.10,0.06), vec3(0.24,0.12,0.05), cover);',
            '  vec3 hot=mix(vec3(0.5,0.13,0.03), vec3(0.95,0.5,0.14), glass);',
            '  vec3 col=mix(ash, hot, melt);',
            '  float a=cover*scorchA*(0.5+n*0.12);',
            '  if(a<0.018) discard;',
            '  gl_FragColor=vec4(col, clamp(a,0.0,0.5));',
            '}'
          ].join('\n')
        })
      );
      earthGroup.add(scorch);

