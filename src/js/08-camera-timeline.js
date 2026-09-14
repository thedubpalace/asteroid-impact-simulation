      function ease(t) { return t * t * (3 - 2 * t); }
      function clamp01(v) { return Math.max(0, Math.min(1, v)); }

      // The thermal pulse — the "global broiler". Ballistic ejecta thrown clear
      // of the atmosphere re-enters worldwide within tens of minutes of the
      // impact, and the friction of that return turns the whole sky into an
      // infrared grill: hot enough to ignite surface fires everywhere, hours
      // before any soot darkens the sky. Shape: a fast rise as the first
      // material arrives, then a long tail as the rest rains back. One curve
      // drives both views of the same event — the glowing night side seen from
      // orbit, and the fire rain that opens the ground scene.
      function thermalPulse(u) {
        if (u <= 0) return 0;
        return ease(clamp01(u / 0.14)) * Math.exp(-Math.max(0, u - 0.14) * 3.6);
      }

      // Winter veil colour. Thin soot preferentially scatters the short
      // wavelengths, so the first stage of the pall is a permanent sunset —
      // the sky reddens long before it darkens. As the load thickens that
      // flattens out to a dead ash grey, and past a certain optical depth it
      // simply stops transmitting. Red, then grey, then black: three stages,
      // not one straight lerp from blue to brown.
      const VEIL_CLEAR = new THREE.Color(0xa8d8ff);
      const VEIL_RED = new THREE.Color(0xc4551c);
      const VEIL_GREY = new THREE.Color(0x4c443a);
      const VEIL_BLACK = new THREE.Color(0x0a0807);
      // the veil seen from outside starts as warm ochre rock dust rather than
      // clear blue sky, but runs through the same three stages after that
      const VEIL_DUST = new THREE.Color(0x9a6238);
      const _veilSky = new THREE.Color();
      const _veilDust = new THREE.Color();
      function veilTint(out, dim, clear) {
        if (dim < 0.42) return out.copy(clear).lerp(VEIL_RED, ease(dim / 0.42));
        if (dim < 0.78) return out.copy(VEIL_RED).lerp(VEIL_GREY, ease((dim - 0.42) / 0.36));
        return out.copy(VEIL_GREY).lerp(VEIL_BLACK, ease((dim - 0.78) / 0.22));
      }

      // Impact melt cooling. A sheet of shock-melted rock kilometres thick
      // radiates its way down the blackbody ramp: white-hot, then yellow,
      // orange, a dull red, and finally a black glass crust. It is the
      // slowest-changing thing at the site and it outlasts every other glow.
      const MELT_WHITE = new THREE.Color(0xfff2d8);
      const MELT_YELLOW = new THREE.Color(0xffb43c);
      const MELT_ORANGE = new THREE.Color(0xff5a10);
      const MELT_RED = new THREE.Color(0x8c1604);
      const MELT_BLACK = new THREE.Color(0x140a06);
      const _melt = new THREE.Color();
      function meltTint(u) {
        if (u < 0.18) return _melt.copy(MELT_WHITE).lerp(MELT_YELLOW, ease(u / 0.18));
        if (u < 0.45) return _melt.copy(MELT_YELLOW).lerp(MELT_ORANGE, ease((u - 0.18) / 0.27));
        if (u < 0.75) return _melt.copy(MELT_ORANGE).lerp(MELT_RED, ease((u - 0.45) / 0.30));
        return _melt.copy(MELT_RED).lerp(MELT_BLACK, ease((u - 0.75) / 0.25));
      }

      // White balance. The light reaching the ground is filtered through more
      // and more soot, so direct sun reddens the way it does through a wildfire
      // plume, and the sky term goes from a clear blue bounce to brown murk.
      // Driven by the same optical depth the winter dimming uses, so colour and
      // brightness are two views of one quantity rather than two timelines.
      const SUN_DAY = new THREE.Color(0xfff2d8);
      const SUN_DUSK = new THREE.Color(0xff9a4a);
      const SUN_EMBER = new THREE.Color(0x7a2c10);
      const SKY_DAY = new THREE.Color(0x1a3a6a);
      const SKY_MURK = new THREE.Color(0x4a3524);
      const SKY_DEAD = new THREE.Color(0x1c120c);
      const AMB_DAY = new THREE.Color(0x0c1224);
      const AMB_DEAD = new THREE.Color(0x1a1008);
      const _sunC = new THREE.Color();
      function sunTint(dim) {
        if (dim < 0.5) return _sunC.copy(SUN_DAY).lerp(SUN_DUSK, ease(dim / 0.5));
        return _sunC.copy(SUN_DUSK).lerp(SUN_EMBER, ease((dim - 0.5) / 0.5));
      }

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
          // View from south of the site: local surface-up projects upward
          // with OrbitControls' fixed world-Y up, keeping the ground below.
          pos = hit.clone().addScaledVector(n, 1.12).addScaledVector(tangent, 0.45).addScaledVector(bitan, -0.85);
          look.copy(hit).multiplyScalar(0.97);
        } else if (mode === 'wide') {
          pos = n.clone().multiplyScalar(9.4).addScaledVector(tangent, 2.5).addScaledVector(bitan, -2.8);
        } else if (mode === 'cinematic') {
          const u = clamp01(t / 12.4);
          // Keep approach, contact and retreat on the same southern side.
          // Crossing over the site reversed the apparent ground/plume direction.
          const far = n.clone().multiplyScalar(10.8).addScaledVector(tangent, 2.2).addScaledVector(bitan, -3.0);
          const near = hit.clone().addScaledVector(n, 1.42).addScaledVector(tangent, 0.65).addScaledVector(bitan, -0.85);
          const contact = hit.clone().addScaledVector(n, 1.12).addScaledVector(tangent, 0.3).addScaledVector(bitan, -0.92);
          const pullback = n.clone().multiplyScalar(8.9).addScaledVector(tangent, 2.4).addScaledVector(bitan, -2.4);
          pos = far.clone().lerp(near, ease(Math.min(1, u * 1.05)));
          if (t >= 12.2) {
            const hold = ease(clamp01((t - 12.2) / 1.1));
            pos.lerp(contact, hold * 0.85);
            look.lerp(hit.clone().multiplyScalar(0.96), hold);
          }
          if (t > 15.8) pos.lerp(pullback, ease(clamp01((t - 15.8) / 8)));
          if (t < 12.35) look.lerp(rock, 0.28 * (1 - clamp01((t - 11.0) / 1.35)));
        } else {
          pos = hit.clone().addScaledVector(n, 1.68).addScaledVector(tangent, 0.9).addScaledVector(bitan, -0.8);
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
        snapCamera();
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
          if (tailLife[i] <= 0 && alive && Math.random() < 0.3 + h * 0.68) {
            tailLife[i] = 1;
            // a narrow ablation column, not a cloud — the streak should read as
            // a drawn line behind the bolide, not a swarm of separate blobs
            const spread = 0.018 + h * 0.05;
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
            // stripped material cools as it falls behind, so the streak runs
            // white-hot at the bolide down to a dull red at its far end
            if (tailLife[i] < 0.72) {
              tailCol[i * 3] *= 0.985;
              tailCol[i * 3 + 1] *= 0.945;
              tailCol[i * 3 + 2] *= 0.915;
            }
          } else {
            tailPos[i * 3] = tailPos[i * 3 + 1] = tailPos[i * 3 + 2] = 80;
          }
        }
        tailGeo.attributes.position.needsUpdate = true;
        tailGeo.attributes.color.needsUpdate = true;
        tail.material.size = 0.012 + h * 0.035;
      }

      function formatAlt(km) {
        if (km > 1e5) return (km / 1e6).toFixed(2) + '×10⁶ km';
        if (km > 1e3) return Math.round(km).toLocaleString() + ' km';
        return km.toFixed(0) + ' km';
      }

