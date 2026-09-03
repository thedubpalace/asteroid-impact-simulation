      function tick(now) {
        const realDt = Math.min(0.05, lastDebris ? (now - lastDebris) / 1000 : 0.016);
        lastDebris = now;
        if (!reduceMotion && now - grainClock > 140) { paintGrain(); grainClock = now; }

        if (!playing) {
          earthGroup.rotation.y += 0.00022;
          fogLayer.rotation.y += 0.0001;
          clouds.rotation.y += 0.0002;
          highClouds.rotation.y -= 0.00008;
          nights.material.opacity = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(earthGroup.rotation.y + 0.8));
          atmo.material.uniforms.sunDir.value.copy(sun.position).normalize();
          // evaluate hit AFTER rotation so camera tracks the site, not last frame's site
          const idleLook = worldImpact().multiplyScalar(0.92);
          camera.position.lerp(holdCam, 0.045);
          controls.target.lerp(idleLook, 0.045);
          controls.autoRotate = false;
          controls.update();
          renderer.render(scene, camera);
          requestAnimationFrame(tick);
          return;
        }

        if (introT < 2.4) {
          introT += realDt;
          if (introT > 1.15 && !frameOpen) {
            frameOpen = true;
            document.body.classList.add('is-open');
          }
        }

        const lookAhead = simTime;
        let timeScale = introT < 1.8 ? THREE.MathUtils.lerp(0.35, 1, ease(clamp01(introT / 1.8))) : 1;
        if (lookAhead > 12.15 && lookAhead < 13.55) timeScale = THREE.MathUtils.lerp(1, 0.22, ease(clamp01((lookAhead - 12.15) / 0.28)));
        if (lookAhead >= 13.55 && lookAhead < 15.2) timeScale = THREE.MathUtils.lerp(0.22, 1, ease(clamp01((lookAhead - 13.55) / 1.6)));
        simTime += realDt * timeScale;
        const t = simTime;
        const dt = realDt * timeScale;
        const phase = currentPhase(t);
        const total = clamp01(t / PHASES[PHASES.length - 1].t1);

        // black wipe over the cut from the globe to the ground scene
        let veilA = 0;
        if (t >= 33.2 && t < 33.95) veilA = ease(clamp01((t - 33.2) / 0.75));
        else if (t >= 33.95 && t < 34.9) veilA = 1 - ease(clamp01((t - 33.95) / 0.95));
        hud.veil.style.opacity = veilA.toFixed(3);
        // only hand the frame to the ground scene once the veil is fully black,
        // otherwise the forest flashes through at ~50% during the wipe-in and
        // reads as a light flicker before the real reveal
        const onGround = t >= 33.95;

        // rotate Earth first, then derive a single shared impact site for camera/rock/fx
        earthGroup.rotation.y += 0.00055;
        fogLayer.rotation.y += 0.00018;
        clouds.rotation.y += 0.00042;
        highClouds.rotation.y -= 0.00018;
        asteroid.rotation.x += 0.03;
        asteroid.rotation.y += 0.02;
        const hit = worldImpact();

        const approachU = clamp01(t / 12.4);
        const posA = asteroidPath(approachU);
        const nextA = asteroidPath(Math.min(1, approachU + 0.004));
        const vel = nextA.clone().sub(posA);
        if (vel.lengthSq() > 1e-8) vel.normalize();
        else vel.copy(hit).normalize().negate();
        asteroid.position.copy(posA);
        if (asteroid.visible) {
          const heat = clamp01((approachU - 0.18) / 0.82);
          const entry = clamp01((approachU - 0.62) / 0.38);
          const flicker = 0.88 + 0.12 * Math.sin(t * 37.0) + 0.06 * Math.sin(t * 71.0);
          // kill glow well before contact so the mesh never intersects Earth
          const contactFade = 1 - clamp01((approachU - 0.78) / 0.14);
          fireCore.material.opacity = (0.18 + heat * 0.55 + entry * 0.28) * flicker * contactFade;
          fireShell.material.opacity = (0.08 + heat * 0.32 + entry * 0.28) * flicker * contactFade;
          fireHalo.material.opacity = 0;
          fireHalo.visible = false;
          plasmaShell.material.opacity = entry * 0.22 * flicker * contactFade;
          plasmaHalo.material.opacity = 0;
          plasmaHalo.visible = false;
          fireCore.visible = contactFade > 0.02;
          fireShell.visible = contactFade > 0.02;
          plasmaShell.visible = contactFade > 0.02;
          const pulse = 1 + entry * 0.12 + Math.sin(t * 28.0) * entry * 0.03;
          fireCore.scale.setScalar(ASTEROID_R * 1.42 * pulse);
          fireShell.scale.setScalar(ASTEROID_R * 2.05 * pulse);
          plasmaShell.scale.setScalar(ASTEROID_R * 1.68 * pulse);
          heatLight.intensity = 0.55 + heat * 3.2 + entry * 6.5;
          asteroid.material.emissiveIntensity = 0.28 + heat * 1.25 + entry * 2.1;
          asteroid.scale.setScalar(1 + entry * 0.04 + Math.sin(t * 40) * entry * 0.015);
        } else {
          fireCore.material.opacity = 0;
          fireShell.material.opacity = 0;
          fireHalo.material.opacity = 0;
          plasmaShell.material.opacity = 0;
          plasmaHalo.material.opacity = 0;
          fireCore.visible = false;
          fireShell.visible = false;
          plasmaShell.visible = false;
        }

        const altKm = THREE.MathUtils.lerp(1.2e6, 0, approachU);
        const spd = approachU >= 1 ? 0 : THREE.MathUtils.lerp(20.4, 19.6, approachU);
        hud.speed.textContent = spd.toFixed(1) + ' km/s';
        hud.alt.textContent = approachU >= 1 ? '0 km' : formatAlt(altKm);

        const tailAlive = asteroid.visible && t < 11.9;
        emitTail(posA, vel.clone().multiplyScalar(-1), tailAlive, clamp01((approachU - 0.55) / 0.45));
        tail.visible = tailAlive;

        atmo.material.uniforms.sunDir.value.copy(sun.position).normalize();

        const nrm = hit.clone().normalize();
        atmo.material.uniforms.impactDir.value.copy(nrm);
        const rockPal = [
          [0.48, 0.36, 0.24], [0.32, 0.24, 0.17], [0.58, 0.42, 0.26],
          [0.22, 0.17, 0.12], [0.40, 0.30, 0.20], [0.62, 0.50, 0.34]
        ];
        const smokePal = [
          [0.48, 0.44, 0.40], [0.34, 0.31, 0.28], [0.58, 0.54, 0.50],
          [0.26, 0.23, 0.20], [0.40, 0.37, 0.33], [0.20, 0.18, 0.16]
        ];
        const sootPal = [
          [0.14, 0.12, 0.10], [0.20, 0.16, 0.13], [0.09, 0.08, 0.07],
          [0.24, 0.19, 0.15], [0.12, 0.10, 0.09], [0.17, 0.14, 0.11]
        ];
        const mistPal = [
          [0.62, 0.58, 0.54], [0.46, 0.43, 0.40], [0.54, 0.51, 0.48],
          [0.36, 0.34, 0.31], [0.50, 0.47, 0.44]
        ];

        const impactAge = t >= 12.4 ? t - 12.4 : -1;
        if (t >= 12.4 && flashPeak === 0) flashPeak = 1;
        if (impactAge >= 0) {
          const ft = impactAge;
          // smooth rise then long soft decay — no hard tier edges
          const rise = ft < 0.22 ? ease(ft / 0.22) : 1;
          const decay = ft < 0.22 ? 1 : Math.exp(-(ft - 0.22) * 0.55);
          const pulse = rise * decay;
          const longGlow = Math.exp(-ft * 0.28);

          // brief, dim full-frame punch — a blink, not a sustained white-out
          hud.flash.style.opacity = String(Math.min(0.16, (ft < 0.16 ? ease(ft / 0.04) * (1 - ft / 0.22) : 0)));
          hud.heat.style.opacity = '0';

          // incandescent fireball cap over the crater. bloomR is an angular
          // radius; the crater is ~0.057 rad, so this tops out at ~1.5x it —
          // a fireball a little bigger than the hole, nothing wider
          const melt = Math.exp(-ft * 0.18);
          impactBloom.material.uniforms.bloomR.value = 0.03 + ease(clamp01(ft / 0.85)) * 0.055;
          impactBloom.material.uniforms.bloomA.value = Math.min(0.2, pulse * 0.26 + melt * 0.07) * Math.exp(-ft * 0.7);

          // the flash orbs are a hard blink at contact and then gone within ~1s
          // (flashDk), so they never sit on the terrain as a white wash — the
          // lingering warmth is carried by craterLight and the melt pool alone
          const flashDk = Math.exp(-ft * 1.7);
          flashOrb.intensity = flashDk * 21 + melt * 2;
          fillOrb.intensity = flashDk * 12 + melt * 1.5;
          // Keep a steady ember baseline like the import build — the crater
          // stays a warm-lit bowl instead of going pitch black once the sun
          // dims. (An earlier decay-to-zero here left the parked floor emissive
          // as the only lit thing at the site, which read as a pale film.)
          craterLight.intensity = 2.2 + pulse * 6.0 + melt * 2.6;
          // atmospheric flare hugs the impact meridian only
          atmo.material.uniforms.impactGlow.value = pulse * 0.4 + melt * 0.1;

          // barely a pop — the daylit disc must not clip to white on contact
          renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 1.09, Math.min(1, pulse * 0.98)) * (0.94 + longGlow * 0.12);

          // soft impact jolt — enough punch without shoving Earth out of frame
          const shakeAmt = reduceMotion ? 0 : (ft < 1.8 ? (1 - ft / 1.8) * 0.048 : (ft < 5 ? (1 - (ft - 1.8) / 3.2) * 0.014 : 0));
          if (shakeAmt > 0) {
            shake.set((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt * 0.65, (Math.random() - 0.5) * shakeAmt * 0.55);
          } else {
            shake.set(0, 0, 0);
          }
          const fovKick = reduceMotion ? 0 : (ft < 0.9 ? (1 - ft / 0.9) * 2.2 : 0);
          camera.fov = 42 + shakeAmt * 10 + fovKick;
          camera.updateProjectionMatrix();
          asteroid.visible = false;
          if (ft > 8.5) hud.flash.style.opacity = 0;
          if (debrisBurst === 0) {
            debrisBurst = 1;
            // throw speeds pulled back to match the smaller crater — rock
            // ejecta ~0.5x (the ballistic arc reads as crater-scaled), the
            // smoke/soot/mist column ~0.7x so the plume base still fits the pit
            // while the winter pall keeps building
            spawnBurst(ejecta, impactPoint, impactNormal, 980, 1.9, 2.25, 6.4, rockPal, false);
            spawnBurst(ejecta, impactPoint, impactNormal, 620, 2.5, 1.05, 4.6, rockPal, true);
            spawnBurst(smoke, impactPoint, impactNormal, 1400, 0.82, 0.95, 22, smokePal, true);
            spawnBurst(smoke, impactPoint, impactNormal, 1100, 0.45, 1.55, 26, smokePal, true);
            spawnBurst(smoke, impactPoint, impactNormal, 760, 0.2, 2.15, 28, smokePal, false);
            spawnBurst(soot, impactPoint, impactNormal, 1100, 0.56, 1.75, 24, sootPal, true);
            spawnBurst(soot, impactPoint, impactNormal, 780, 0.26, 2.45, 28, sootPal, true);
            spawnBurst(mistFine, impactPoint, impactNormal, 860, 0.38, 1.7, 20, mistPal, true);
            spawnBurst(mistFine, impactPoint, impactNormal, 620, 0.17, 2.35, 24, mistPal, false);
          }
          craterGroup.visible = true;
          const grow = ease(clamp01(ft / 1.15));
          const craterScale = 0.38 + grow * 0.98;
          craterGroup.scale.setScalar(craterScale);
          // counter-scale x/y only, so boulders don't slide radially as the
          // crater pops open — but let z follow craterGroup's own scale like
          // craterFloor does, so boulders track the terrain height it's
          // rendered at instead of resting at the un-scaled (wrong) height
          boulderGroup.scale.set(1 / craterScale, 1 / craterScale, 1);
          const cool = clamp01((ft - 1.6) / 10);
          craterFloor.material.emissive.setRGB(
            THREE.MathUtils.lerp(1.0, 0.55, cool),
            THREE.MathUtils.lerp(0.48, 0.12, cool),
            THREE.MathUtils.lerp(0.12, 0.03, cool)
          );
          craterFloor.material.emissiveIntensity = 0.8 + pulse * 1.4 + melt * 0.95 - cool * 0.4;
          // A light cool-down ash on the floor colour — the import build leaves
          // this at full white, but a slight knock-back keeps the interior from
          // reading as a bare un-ashed hole once the land around it scorches.
          // Was lerp(1.0, 0.3): far too dark once the floor became opaque and
          // its dark outer-zone albedo x vertex tint x this all stacked to near
          // black. Keep it gentle.
          const ashTint = THREE.MathUtils.lerp(1.0, 0.72, cool);
          craterFloor.material.color.setRGB(ashTint, ashTint * 0.95, ashTint * 0.9);
          meltPool.material.opacity = Math.min(0.58, 0.16 + pulse * 0.34 + melt * 0.2) * (1 - cool * 0.55);
          meltHalo.material.opacity = Math.min(0.26, 0.07 + pulse * 0.17 + melt * 0.1) * (1 - cool * 0.48);
          meltOuter.material.opacity = Math.min(0.14, 0.03 + pulse * 0.09 + melt * 0.06) * (1 - cool * 0.4);
          ejectaFan.material.opacity = Math.min(0.72, ease(clamp01(ft / 1.25)) * 0.66);
          boulders.forEach((b, i) => {
            b.material.opacity = grow;
            b.material.emissiveIntensity = (0.35 + melt * 1.4) * (1 - cool * 0.6) * (0.55 + (i % 3) * 0.2);
          });
          nights.material.opacity = THREE.MathUtils.lerp(0.85, 0.08, Math.min(1, pulse * 0.85 + melt * 0.7));
        } else {
          shake.set(0, 0, 0);
          if (camera.fov !== 42) {
            camera.fov = 42;
            camera.updateProjectionMatrix();
          }
          hud.heat.style.opacity = '0';
          nights.material.opacity = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(earthGroup.rotation.y + 0.8));
        }

        if (t >= 12.42 && t < 28) {
          const rate = t < 14.5 ? 0.95 : (t < 18 ? 0.78 : 0.52);
          if (Math.random() < rate) {
            spawnBurst(smoke, impactPoint, impactNormal, 86, 0.2 + Math.random() * 0.28, 1.25, 24, smokePal, true);
            spawnBurst(mistFine, impactPoint, impactNormal, 64, 0.12 + Math.random() * 0.2, 1.7, 22, mistPal, true);
            spawnBurst(soot, impactPoint, impactNormal, 58, 0.14 + Math.random() * 0.22, 2.25, 26, sootPal, true);
          }
          if (t > 14.8 && Math.random() < 0.72) {
            const high = impactPoint.clone().addScaledVector(impactNormal, 0.45 + Math.random() * 1.15);
            spawnBurst(smoke, high, impactNormal, 38, 0.08 + Math.random() * 0.14, 1.95, 18, smokePal, false);
            spawnBurst(mistFine, high, impactNormal, 30, 0.07 + Math.random() * 0.1, 2.15, 16, mistPal, false);
            spawnBurst(soot, high, impactNormal, 24, 0.07 + Math.random() * 0.12, 2.35, 20, sootPal, false);
          }
          if (t < 16.4 && Math.random() < 0.8) {
            spawnBurst(ejecta, impactPoint, impactNormal, 28, 1.35 + Math.random() * 1.35, 2.1, 4.2, rockPal, false);
            spawnBurst(ejecta, impactPoint, impactNormal, 16, 2.65, 0.85, 3.2, rockPal, true);
          }
        }

        stepDebris(ejecta, dt, 0.981, -0.68, EARTH_R + 0.06, 0, 0.012);
        stepDebris(smoke, dt, 0.996, -0.01, EARTH_R + 0.28, 0.055, 0.075);
        stepDebris(soot, dt, 0.997, -0.006, EARTH_R + 0.30, 0.038, 0.09);
        stepDebris(mistFine, dt, 0.998, 0.002, EARTH_R + 0.26, 0.042, 0.08);

        const after = clamp01((t - 12.4) / 22);
        ejecta.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(1.0, 0.14, clamp01((t - 12.4) / 7.2)) : 0;
        smoke.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(0.88, 0.46, after) : 0;
        soot.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(0.92, 0.5, after) : 0;
        mistFine.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(0.68, 0.32, after) : 0;

        if (t >= 12.55) {
          // vapour/steam blanket — starts tight on the crater at contact and
          // spreads over the next ~11s, so the close-up beat isn't buried under
          // a milky cap before the camera pulls back
          const gf = clamp01((t - 12.55) / 11);
          groundFog.material.uniforms.fogR.value = 0.08 + ease(gf) * 0.6;
          groundFog.material.uniforms.fogA.value = (0.13 + gf * 0.22) * (1 - clamp01((t - 24) / 12) * 0.4);
          groundFog.material.uniforms.time.value = t;
        }

        if (t >= 12.4) {
          // scorched-earth / fire blanket. Was 0.08 + 0.72 rad — a near-
          // hemispheric wash that read as the impact flash being far too wide.
          // A ~0.45 rad cap is still a continental burn zone, not the planet.
          const burn = clamp01((t - 12.4) / 5.6);
          scorch.material.uniforms.scorchR.value = 0.05 + ease(burn) * 0.4;
          scorch.material.uniforms.scorchA.value = 0.4 + burn * 0.18;
        }

        // Air-blast shockwave is effectively supersonic and reaches any given
        // distance far sooner than the tsunami — a gravity wave in water that,
        // even in the open ocean, only manages ~700 km/h. It has to fire first
        // and cross its full radius quickly, not trail behind the water wave.
        if (t >= 12.6) {
          const sw = clamp01((t - 12.6) / 3.6);
          shock.visible = shockLayerOn;
          shock.material.uniforms.waveR.value = sw * 3.15;
          shock.material.uniforms.waveW.value = 0.055 + sw * 0.07;
          shock.material.uniforms.waveA.value = (1 - sw) * 1.15;
        }

        if (t >= 13.4) {
          const tw = clamp01((t - 13.4) / 10.5);
          tsunami.material.uniforms.waveR.value = tw * 2.4;
          tsunami.material.uniforms.waveA.value = (1 - tw) * 0.42;
        }

        if (t >= 16.8) {
          const winter = clamp01((t - 16.8) / 11.2);
          dust.material.uniforms.dustR.value = winter * Math.PI;
          dust.material.uniforms.dustOpacity.value = THREE.MathUtils.lerp(0.0, 1.45, winter);
          dust.material.uniforms.time.value = t;
          fogLayer.material.opacity = THREE.MathUtils.lerp(0.3, 0.08, winter);
          clouds.material.opacity = THREE.MathUtils.lerp(0.68, 0.16, winter);
          highClouds.material.opacity = THREE.MathUtils.lerp(0.34, 0.05, winter);
          haze.material.uniforms.hazeA.value = THREE.MathUtils.lerp(0.08, 0.18, winter);
          haze.material.uniforms.hazeColor.value.lerpColors(new THREE.Color(0xa8d8ff), new THREE.Color(0x4a3828), winter);
          nights.material.opacity = THREE.MathUtils.lerp(0.85, 0.05, winter);
          clouds.material.color.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x3a3028), winter);
          highClouds.material.color.lerpColors(new THREE.Color(0xf4f7ff), new THREE.Color(0x2a221c), winter);
          fogLayer.material.color.lerpColors(new THREE.Color(0xd8e4ee), new THREE.Color(0x241c16), winter);
          sun.intensity = THREE.MathUtils.lerp(1.85, 0.1, winter);
          ambient.intensity = THREE.MathUtils.lerp(0.16, 0.05, winter);
          hemi.intensity = THREE.MathUtils.lerp(0.32, 0.08, winter);
          renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 0.3, winter);
          atmo.material.uniforms.glowColor.value.lerpColors(new THREE.Color(0x6eb8ff), new THREE.Color(0x3a2818), winter);
          atmo.material.uniforms.intensity.value = THREE.MathUtils.lerp(1.0, 0.25, winter);
          controls.autoRotateSpeed = 0.18 + winter * 0.12;
          hud.dust.textContent = Math.round(winter * 100) + '%';
        } else {
          dust.material.uniforms.dustR.value = 0;
          dust.material.uniforms.dustOpacity.value = 0;
          fogLayer.material.opacity = 0.3;
          fogLayer.material.color.set(0xd8e4ee);
          clouds.material.opacity = 0.68;
          clouds.material.color.set(0xffffff);
          highClouds.material.opacity = 0.34;
          highClouds.material.color.set(0xf4f7ff);
          haze.material.uniforms.hazeA.value = 0.08;
          haze.material.uniforms.hazeColor.value.set(0xa8d8ff);
          sun.intensity = 1.85;
          ambient.intensity = 0.16;
          hemi.intensity = 0.32;
          if (t < 12.4) renderer.toneMappingExposure = 1.05;
          atmo.material.uniforms.glowColor.value.set(0x6eb8ff);
          atmo.material.uniforms.intensity.value = 1.0;
          controls.autoRotateSpeed = 0.18;
          hud.dust.textContent = '0%';
        }

        if (phase.id !== lastPhase) {
          lastPhase = phase.id;
          hud.phase.textContent = phase.hud;
          hud.name.textContent = phase.name;
          hud.copy.textContent = phase.copy;
        }
        hud.progress.style.width = (total * 100).toFixed(1) + '%';

        if (onGround) {
          // ground scene owns the frame now — skip the globe camera rig
          updateGround(t);
          renderer.render(groundScene, groundCam);
          requestAnimationFrame(tick);
          return;
        }

        if (introT < 2.2) {
          const u = ease(clamp01(introT / 2.2));
          const rig = cameraRig(camModeEl.value === 'free' ? 'cinematic' : camModeEl.value, t, hit, posA);
          camera.position.lerpVectors(holdCam, rig.pos, u);
          controls.target.lerpVectors(hit.clone().multiplyScalar(0.92), rig.look, u);
          controls.autoRotate = false;
        } else {
          applyCamera(camModeEl.value, t, hit, posA, false);
        }
        controls.update();
        if (t >= 12.4) pinFxToImpact(hit);
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        groundCam.aspect = window.innerWidth / window.innerHeight;
        groundCam.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        sizeGrain();
      });
