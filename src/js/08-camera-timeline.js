      function ease(t) { return t * t * (3 - 2 * t); }
      function clamp01(v) { return Math.max(0, Math.min(1, v)); }

      const camModeEl = document.getElementById('cam-mode');
      const camLockEl = document.getElementById('cam-lock');

      function impactBasis(hit) {
        const n = hit.clone().normalize();
        const ref = Math.abs(n.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const tangent = new THREE.Vector3().crossVectors(ref, n).normalize();
        const bitan = new THREE.Vector3().crossVectors(n, tangent).normalize();
        return { n, tangent, bitan };
      }

      function cameraRig(mode, t, hit, rock) {
        const { n, tangent, bitan } = impactBasis(hit);
        const look = camLockEl.checked ? hit.clone().multiplyScalar(0.84) : new THREE.Vector3();
        let pos;
        if (mode === 'close') {
          // pulled in ~30% now that the crater is 4x smaller, so it still fills
          // a solid part of the frame at this beat
          pos = hit.clone().addScaledVector(n, 1.12).addScaledVector(tangent, 0.82).addScaledVector(bitan, 0.4);
          look.copy(hit).multiplyScalar(0.97);
        } else if (mode === 'wide') {
          pos = n.clone().multiplyScalar(9.4).addScaledVector(tangent, 2.5).addScaledVector(bitan, 1.5);
        } else if (mode === 'cinematic') {
          const u = clamp01(t / 12.4);
          const far = n.clone().multiplyScalar(10.8).addScaledVector(tangent, 3.6).add(new THREE.Vector3(0, 1.7, 0));
          // hold a stable near rig through contact so Earth doesn't "jump away";
          // both near and contact tightened for the smaller crater
          const near = hit.clone().addScaledVector(n, 1.42).addScaledVector(tangent, 1.08).addScaledVector(bitan, 0.42);
          const contact = hit.clone().addScaledVector(n, 1.18).addScaledVector(tangent, 0.92).addScaledVector(bitan, 0.35);
          const pullback = n.clone().multiplyScalar(8.9).addScaledVector(tangent, 2.4).addScaledVector(bitan, 1.4);
          pos = far.clone().lerp(near, ease(Math.min(1, u * 1.05)));
          if (t >= 12.2) {
            const hold = ease(clamp01((t - 12.2) / 1.1));
            pos.lerp(contact, hold * 0.85);
            look.copy(hit).multiplyScalar(0.96);
          }
          if (t > 15.8) pos.lerp(pullback, ease(clamp01((t - 15.8) / 8)));
          if (t < 12.35) look.lerp(rock, 0.28 * (1 - clamp01((t - 11.0) / 1.35)));
        } else {
          pos = hit.clone().addScaledVector(n, 1.68).addScaledVector(tangent, 1.5).addScaledVector(bitan, 0.6);
          look.copy(hit).multiplyScalar(0.9);
        }
        return { pos, look };
      }

      function applyCamera(mode, t, hit, rock, snap) {
        if (mode === 'free') {
          controls.autoRotate = true;
          controls.minDistance = 3.4;   // keep manual orbit outside the globe
          if (!camLockEl.checked) controls.target.set(0, 0, 0);
          else if (snap) controls.target.copy(hit).multiplyScalar(0.2);
          return;
        }
        controls.autoRotate = false;
        // the scripted rigs frame a now-small crater from close in; the default
        // 3.4 floor was clamping every contact/close shot back out to orbit
        controls.minDistance = 0.9;
        const rig = cameraRig(mode, t, hit, rock);
        if (snap) {
          camera.position.copy(rig.pos);
          controls.target.copy(rig.look);
        } else {
          camera.position.lerp(rig.pos, 0.036);
          controls.target.lerp(rig.look, 0.04);
        }
        camera.position.add(shake);
      }

      function snapCamera() {
        if (!playing) {
          const hit0 = worldImpact();
          camera.position.copy(holdCam);
          controls.target.copy(hit0.clone().multiplyScalar(0.92));
          return;
        }
        applyCamera(camModeEl.value, simTime, worldImpact(), asteroid.position, true);
      }
      document.getElementById('cam-set').addEventListener('click', snapCamera);
      document.getElementById('cam-reset').addEventListener('click', () => {
        camModeEl.value = 'cinematic';
        camLockEl.checked = true;
        if (!playing) snapCamera();
        else {
          camera.position.set(0.6, 1.8, 8.4);
          controls.target.set(0, 0, 0);
        }
      });
      camModeEl.addEventListener('change', snapCamera);
      snapCamera();

      function worldImpact() {
        return impactPoint.clone().applyEuler(earthGroup.rotation);
      }

      function pinFxToImpact(hit) {
        const p = hit.clone().project(camera);
        const x = THREE.MathUtils.clamp((p.x * 0.5 + 0.5) * 100, -8, 108);
        const y = THREE.MathUtils.clamp((-p.y * 0.5 + 0.5) * 100, -8, 108);
        hud.flash.style.setProperty('--fx', x.toFixed(1) + '%');
        hud.flash.style.setProperty('--fy', y.toFixed(1) + '%');
        hud.heat.style.setProperty('--fx', x.toFixed(1) + '%');
        hud.heat.style.setProperty('--fy', y.toFixed(1) + '%');
      }

      function asteroidPath(u) {
        const site = worldImpact();
        const n = site.clone().normalize();
        // contact is the rock's leading face, not its center buried in the crust
        const to = n.clone().multiplyScalar(EARTH_R + ASTEROID_R * 0.35);
        // steeply oblique — ~53 deg from horizontal, in from the north-east,
        // matching the trajectory reconstructions for the real impactor
        // (was ~64 deg, closer to vertical than the estimates support)
        const inbound = n.clone().multiplyScalar(0.36).add(new THREE.Vector3(0.52, 0.18, -0.28)).normalize();
        const from = to.clone().addScaledVector(inbound, 15.6);
        return from.lerp(to, u);
      }

      function currentPhase(t) {
        for (let i = PHASES.length - 1; i >= 0; i--) if (t >= PHASES[i].t0) return PHASES[i];
        return PHASES[0];
      }

      function emitTail(origin, dir, alive, heat) {
        const h = heat || 0;
        for (let i = 0; i < TAIL; i++) {
          if (tailLife[i] <= 0 && alive && Math.random() < 0.42 + h * 0.55) {
            tailLife[i] = 1;
            const spread = 0.055 + h * 0.12;
            tailPos[i * 3] = origin.x + (Math.random() - 0.5) * spread;
            tailPos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * spread;
            tailPos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * spread;
            const hot = Math.random();
            if (hot < 0.25 * h) {
              tailCol[i * 3] = 0.55 + hot * 0.4;
              tailCol[i * 3 + 1] = 0.75 + hot * 0.25;
              tailCol[i * 3 + 2] = 1.0;
            } else {
              tailCol[i * 3] = 1;
              tailCol[i * 3 + 1] = 0.28 + hot * 0.55;
              tailCol[i * 3 + 2] = 0.05 + hot * 0.18;
            }
          }
          if (tailLife[i] > 0) {
            tailLife[i] -= 0.014 + Math.random() * 0.012;
            const drift = 0.028 + h * 0.02;
            tailPos[i * 3] += dir.x * drift + (Math.random() - 0.5) * 0.012;
            tailPos[i * 3 + 1] += dir.y * drift + (Math.random() - 0.5) * 0.012;
            tailPos[i * 3 + 2] += dir.z * drift + (Math.random() - 0.5) * 0.012;
            if (tailLife[i] < 0.4) {
              tailCol[i * 3] *= 0.97;
              tailCol[i * 3 + 1] *= 0.93;
              tailCol[i * 3 + 2] *= 0.91;
            }
          } else {
            tailPos[i * 3] = tailPos[i * 3 + 1] = tailPos[i * 3 + 2] = 80;
          }
        }
        tailGeo.attributes.position.needsUpdate = true;
        tailGeo.attributes.color.needsUpdate = true;
        tail.material.size = 0.038 + h * 0.07;
      }

      function formatAlt(km) {
        if (km > 1e5) return (km / 1e6).toFixed(2) + '×10⁶ km';
        if (km > 1e3) return Math.round(km).toLocaleString() + ' km';
        return km.toFixed(0) + ' km';
      }

