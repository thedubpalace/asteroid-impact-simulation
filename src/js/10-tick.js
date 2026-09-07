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
        // A 10 km bolide crosses the ~100 km of atmosphere that matters in
        // about 2-3 s. Before that it is a cold rock coasting in vacuum, and
        // ram pressure (~ air density x v^2, and density climbs exponentially
        // with depth) only lights it up right at the end — so the bolide is at
        // its most brilliant at the instant of contact, not before it.
        const air = clamp01((t - 9.9) / 2.5);
        const blaze = Math.pow(air, 2.2);
        if (asteroid.visible) {
          // faint pre-entry ember only; the fireball itself is all `blaze`
          const heat = clamp01((approachU - 0.18) / 0.82);
          const flicker = 0.88 + 0.12 * Math.sin(t * 37.0) + 0.06 * Math.sin(t * 71.0);
          // These glow shells are solid additive spheres, so once the rock is
          // within a shell radius of the ground they read as a hard disc pasted
          // on the surface. Fade them out over the last ~0.2 world units of
          // altitude and let the point light, the mesh emissive and the
          // precursor flash carry the final instant. (This used to start at
          // approachU 0.78 — a whole second early, killing the fireball on the
          // way down instead of at the ground.)
          const contactFade = clamp01((posA.length() - EARTH_R + 0.01) / 0.08);
          fireCore.material.opacity = (0.06 + heat * 0.12 + blaze * 0.82) * flicker * contactFade;
          fireShell.material.opacity = (0.02 + heat * 0.07 + blaze * 0.7) * flicker * contactFade;
          fireHalo.material.opacity = 0;
          fireHalo.visible = false;
          // shock-heated air ahead of the rock — only exists once there is air
          plasmaShell.material.opacity = blaze * 0.42 * flicker * contactFade;
          plasmaHalo.material.opacity = 0;
          plasmaHalo.visible = false;
          fireCore.visible = contactFade > 0.02;
          fireShell.visible = contactFade > 0.02;
          plasmaShell.visible = contactFade > 0.02;
          // the ablation envelope inflates as it burns
          const pulse = 1 + blaze * 0.5 + Math.sin(t * 28.0) * blaze * 0.04;
          fireCore.scale.setScalar(ASTEROID_R * 1.42 * pulse);
          fireShell.scale.setScalar(ASTEROID_R * (2.05 + blaze * 1.1) * pulse);
          plasmaShell.scale.setScalar(ASTEROID_R * (1.68 + blaze * 0.5) * pulse);
          heatLight.intensity = 0.35 + heat * 1.1 + blaze * 5.5;
          // hotter means whiter: the ablating surface runs up the blackbody
          // ramp from dull red to a white-yellow that outshines the daylit sea
          asteroid.material.emissive.setRGB(1, 0.23 + blaze * 0.62, 0.03 + blaze * 0.5);
          asteroid.material.emissiveIntensity = 0.28 + heat * 0.6 + blaze * 5.5;
          asteroid.scale.setScalar(1 + blaze * 0.05 + Math.sin(t * 40) * blaze * 0.02);
        } else {
          fireCore.material.opacity = 0;
          fireShell.material.opacity = 0;
          fireHalo.material.opacity = 0;
          plasmaShell.material.opacity = 0;
          plasmaHalo.material.opacity = 0;
          fireCore.visible = false;
          fireShell.visible = false;
          plasmaShell.visible = false;
          // The bolide's own light dies with it. This used to be left at its
          // last entry value for the whole rest of the shot, quietly washing
          // out the crater from a light source that no longer exists.
          heatLight.intensity *= Math.pow(0.02, realDt);
        }

        // the readout used to run one straight line from 1.2 million km to
        // zero, so it passed through every atmospheric altitude in the last
        // thousandth of the shot. The final 2.5 s is the atmosphere: 120 km.
        const altKm = air > 0 ? THREE.MathUtils.lerp(120, 0, air)
          : THREE.MathUtils.lerp(1.2e6, 120, clamp01(t / 9.9));
        const spd = approachU >= 1 ? 0 : THREE.MathUtils.lerp(20.4, 19.6, approachU);
        hud.speed.textContent = spd.toFixed(1) + ' km/s';
        hud.alt.textContent = approachU >= 1 ? '0 km' : formatAlt(altKm);

        // the ablation trail runs all the way to the ground — cutting it at
        // 11.9 left the last second of the fall with no streak at all
        const tailAlive = asteroid.visible && t < 12.4;
        emitTail(posA, vel.clone().multiplyScalar(-1), tailAlive, blaze);
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
        const firePal = [
          [1.0, 0.92, 0.72], [1.0, 0.78, 0.42], [1.0, 0.6, 0.22],
          [0.98, 0.46, 0.14], [1.0, 0.86, 0.58]
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

          // Brief, dim full-frame punch — a blink, not a sustained white-out.
          // It picks up from the precursor's level instead of restarting from
          // zero, so the frame does not drop dark for an instant at contact.
          hud.flash.style.opacity = String(ft < 0.22 ? (0.13 + ease(clamp01(ft / 0.05)) * 0.06) * (1 - ft / 0.22) : 0);
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
          // likewise hand over from the precursor's atmospheric flare
          atmo.material.uniforms.impactGlow.value = Math.max(pulse * 0.4 + melt * 0.1, 0.3 * Math.exp(-ft * 6));

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
          craterGroup.visible = true;
          const grow = ease(clamp01(ft / 1.15));
          const craterScale = 0.38 + grow * 0.98;
          craterGroup.scale.setScalar(craterScale);
          // counter-scale x/y only, so boulders don't slide radially as the
          // crater pops open — but let z follow craterGroup's own scale like
          // craterFloor does, so boulders track the terrain height it's
          // rendered at instead of resting at the un-scaled (wrong) height
          boulderGroup.scale.set(1 / craterScale, 1 / craterScale, 1);
          // world-space radius of the rim as it excavates outward
          const rimR = CRATER_R * craterScale;
          if (debrisBurst === 0) {
            debrisBurst = 1;
            // downrange direction of the oblique approach, in earthGroup space,
            // so the ejecta rays can run longer ahead of the impactor
            const upWorld = asteroidPath(0).sub(asteroidPath(1)).normalize();
            const inv = new THREE.Euler(-earthGroup.rotation.x, -earthGroup.rotation.y, -earthGroup.rotation.z, 'ZYX');
            const downL = upWorld.negate().applyEuler(inv);
            downL.addScaledVector(impactNormal, -downL.dot(impactNormal)).normalize();
            scorch.material.uniforms.downDir.value.copy(downL);
            // Contact energy partition: the earliest ejecta is the fastest —
            // shocked fines jetted steeply off the contact point — while the
            // vapour fireball is born low over the pit and *rises* (velocity +
            // buoyant lift in stepDebris) rather than appearing pre-lofted.
            spawnBurst(ejecta, impactPoint, impactNormal, 220, 0.46, 30, 5.5, rockPal, 'curtain', rimR * 0.6);
            spawnBurst(fireball, impactPoint, impactNormal, 480, 0.14, 0.55, 5.0, firePal, 'plume', rimR * 1.4);
            // the ash/steam column also starts low and climbs behind the fireball
            spawnBurst(smoke, impactPoint, impactNormal, 1400, 0.1, 0.7, 22, smokePal, 'plume', rimR * 1.6);
            spawnBurst(smoke, impactPoint, impactNormal, 1100, 0.06, 1.1, 26, smokePal, 'plume', rimR * 2.4);
            spawnBurst(smoke, impactPoint, impactNormal, 760, 0.07, 2.15, 28, smokePal, false);
            spawnBurst(soot, impactPoint, impactNormal, 1100, 0.08, 0.9, 24, sootPal, 'plume', rimR * 1.8);
            spawnBurst(soot, impactPoint, impactNormal, 780, 0.05, 1.4, 28, sootPal, 'plume', rimR * 2.8);
            spawnBurst(mistFine, impactPoint, impactNormal, 860, 0.07, 0.9, 20, mistPal, 'plume', rimR * 2.0);
            spawnBurst(mistFine, impactPoint, impactNormal, 620, 0.06, 2.35, 24, mistPal, false);
          }
          // Ejecta curtain: an inverted cone launched off the rim as it moves
          // outward, densest early and near the rim. Launch speed falls as the
          // excavation slows, so the last (coarsest) material lands closest.
          if (ft < 2.0) {
            const ex = 1 - ft / 2.0;
            spawnBurst(ejecta, impactPoint, impactNormal, 6 + Math.round(26 * ex), 0.26 + ex * 0.24, 22, 5.5, rockPal, 'curtain', rimR * 0.95);
          }
          // fireball keeps feeding off the melt for a couple of seconds, then
          // the column above it is ash only
          if (ft < 2.4 && Math.random() < 0.75) {
            spawnBurst(fireball, impactPoint, impactNormal, 10, 0.12, 0.4, 4.5, firePal, 'plume', rimR * 0.9);
          }
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
          // Precursor: the column of air ahead of the bolide is compressed to
          // incandescence a beat before the rock itself arrives, so the sky
          // over the site lights up first and the impact flash takes over from
          // an already-bright frame rather than from black.
          const precursor = Math.pow(clamp01((t - 12.02) / 0.38), 3.0);
          hud.flash.style.opacity = (precursor * 0.13).toFixed(3);
          atmo.material.uniforms.impactGlow.value = precursor * 0.3;
          nights.material.opacity = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(earthGroup.rotation.y + 0.8));
        }

        if (t >= 12.42 && t < 28) {
          // Sustained venting keeps the column fed from the rim for minutes.
          // This used to push ~200 pre-lofted, randomly aimed sprites *per
          // frame* — every slot that freed up was instantly refilled somewhere
          // in a 0.4-unit cloud, which read as dots over half the hemisphere.
          // Now a modest per-second trickle, born low and rising like the rest.
          const feed = (t < 14.5 ? 1.0 : (t < 18 ? 0.7 : 0.4)) * dt * 60;
          const vent = CRATER_R * 1.3;
          if (Math.random() < 0.6 * feed) {
            spawnBurst(smoke, impactPoint, impactNormal, 6, 0.05 + Math.random() * 0.05, 0.8, 24, smokePal, 'plume', vent);
            spawnBurst(mistFine, impactPoint, impactNormal, 4, 0.04 + Math.random() * 0.04, 0.9, 22, mistPal, 'plume', vent * 1.3);
            spawnBurst(soot, impactPoint, impactNormal, 4, 0.04 + Math.random() * 0.05, 0.9, 26, sootPal, 'plume', vent);
          }
          if (t > 14.8 && Math.random() < 0.3 * feed) {
            // a little loose haze shed off the top of the column
            const high = impactPoint.clone().addScaledVector(impactNormal, 0.15 + Math.random() * 0.25);
            spawnBurst(smoke, high, impactNormal, 3, 0.02 + Math.random() * 0.03, 1.95, 18, smokePal, false);
            spawnBurst(mistFine, high, impactNormal, 3, 0.02 + Math.random() * 0.03, 2.15, 16, mistPal, false);
          }
        }

        // ejecta gravity was -0.68/frame: ~40 units/s^2, which dropped every
        // rock within a few frames of launch. ~0.7 units/s^2 gives the curtain
        // a readable multi-second ballistic arc at crater scale.
        stepDebris(ejecta, dt, 0.996, -0.012, EARTH_R + 0.012, 0, 0, 0.9);
        // rise/swirl were ~30x too strong: the column left the frame at
        // ~13 units/s and sat 70+ radii out by the winter beat. Buoyant lift
        // now tops out near 0.04 units/s, so the plume climbs ~0.5 units
        // (a few crater diameters) over the shock beat and stays over the pit.
        stepDebris(smoke, dt, 0.99, -0.00015, EARTH_R + 0.04, 0.0006, 0.0004);
        stepDebris(soot, dt, 0.99, -0.0001, EARTH_R + 0.05, 0.00045, 0.0004);
        stepDebris(mistFine, dt, 0.99, 0, EARTH_R + 0.04, 0.0005, 0.0004);
        stepDebris(fireball, dt, 0.985, 0, EARTH_R + 0.03, 0.0008, 0.0003);

        const after = clamp01((t - 12.4) / 22);
        ejecta.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(1.0, 0.14, clamp01((t - 12.4) / 7.2)) : 0;
        fireball.mat.uniforms.uOpacity.value = t > 12.4 ? 0.55 : 0;
        smoke.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(0.7, 0.4, after) : 0;
        soot.mat.uniforms.uOpacity.value = t > 12.4 ? THREE.MathUtils.lerp(0.55, 0.32, after) : 0;
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
          // Ejecta deposit. The continuous blanket follows the curtain down
          // over the first ~2.5 s (to ~3 crater radii = one diameter past the
          // rim); the rays keep extending as slower, farther ballistic material
          // lands; the distal spherule front sweeps the globe over ~10 s.
          const fa = t - 12.4;
          const craterAng = CRATER_R / EARTH_R;
          scorch.material.uniforms.blanketR.value = craterAng * (0.6 + ease(clamp01(fa / 2.5)) * 2.4);
          scorch.material.uniforms.rayF.value = ease(clamp01((fa - 0.6) / 4.4));
          scorch.material.uniforms.distF.value = ease(clamp01((fa - 2.5) / 9.5));
          scorch.material.uniforms.heat.value = Math.exp(-fa * 0.25);
          scorch.material.uniforms.scorchA.value = 0.5 + clamp01(fa / 5.6) * 0.2;
        }

        // Thermal pulse. Deliberately lands after the air blast has crossed
        // and before the dust veil starts to bite at t=16.8: the sky broils
        // first, and only then does the soot those fires raise put it out.
        const broilNow = thermalPulse((t - 15.2) / 8.0);
        broil.material.uniforms.pulse.value = broilNow;
        broil.material.uniforms.sunDir.value.copy(sun.position).normalize();
        // fires spread while the pulse is on the sky and then simply stay
        // burnt — roughly the running integral of the pulse above
        scorch.material.uniforms.burn.value = ease(clamp01((t - 15.6) / 6.5));

        // Air-blast shockwave is effectively supersonic and reaches any given
        // distance far sooner than the tsunami — a gravity wave in water that,
        // even in the open ocean, only manages ~700 km/h. It has to fire first
        // and cross its full radius quickly, not trail behind the water wave.
        if (t >= 12.6) {
          const sw = clamp01((t - 12.6) / 3.6);
          shock.visible = shockLayerOn;
          // a blast wave leaves hypersonic and decays toward the speed of
          // sound, so the ring covers most of its ground early and crawls late
          shock.material.uniforms.waveR.value = 3.15 * Math.pow(sw, 0.72);
          shock.material.uniforms.waveW.value = 0.055 + sw * 0.07;
          shock.material.uniforms.waveA.value = (1 - sw) * 1.15;
        }

        // Chicxulub struck a shallow carbonate platform, so the water response
        // runs in two stages. First the sea collapses back into the open
        // crater — the resurge, the only thing in the shot moving inward.
        if (t >= 12.85) {
          tsunami.material.uniforms.resurge.value = clamp01((t - 12.85) / 1.1);
        }
        // Then the rebound sends the train out. A shallow-water wave runs at
        // sqrt(g*h): a few hundred metres per second over the deep basin, a
        // tenth of that once it is up on a shelf. It is far slower than the
        // air blast above and it keeps slowing, so the radius decelerates and
        // the crests spread apart behind it as the longer waves outrun them.
        if (t >= 13.7) {
          const tw = clamp01((t - 13.7) / 10.5);
          tsunami.material.uniforms.waveR.value = 1.6 * Math.pow(tw, 0.8);
          tsunami.material.uniforms.trainW.value = 0.085 + tw * 0.13;
          tsunami.material.uniforms.waveA.value = (1 - tw * 0.72) * 0.5;
        }

        if (t >= 16.8) {
          // Winter onset. Soot from the global fires and rock dust from the
          // plume load the stratosphere over days and weeks — a slow start,
          // not a switch — so the optical depth `tau` ramps with a >1 exponent
          // rather than linearly. Sunlight then falls off exponentially with
          // that load (Beer-Lambert), which is why the sky reddens for a long
          // time and then loses the last of its light quickly.
          const tau = 5.0 * Math.pow(clamp01((t - 16.8) / 17.2), 1.55);
          const light = Math.exp(-tau);
          const dim = 1 - light;
          // the veil goes global well before it goes opaque: it spreads to
          // cover the planet in the first stretch, then just keeps thickening
          const spread = ease(clamp01((t - 16.8) / 6.2));
          const veil = veilTint(_veilSky, dim, VEIL_CLEAR);
          dust.material.uniforms.dustR.value = spread * Math.PI;
          dust.material.uniforms.dustOpacity.value = 1.45 * (1 - Math.exp(-tau * 0.7));
          dust.material.uniforms.veilCol.value.copy(veilTint(_veilDust, dim, VEIL_DUST));
          dust.material.uniforms.time.value = t;
          fogLayer.material.opacity = THREE.MathUtils.lerp(0.3, 0.08, dim);
          clouds.material.opacity = THREE.MathUtils.lerp(0.68, 0.16, dim);
          highClouds.material.opacity = THREE.MathUtils.lerp(0.34, 0.05, dim);
          haze.material.uniforms.hazeA.value = THREE.MathUtils.lerp(0.08, 0.18, dim);
          haze.material.uniforms.hazeColor.value.copy(veil);
          nights.material.opacity = THREE.MathUtils.lerp(0.85, 0.05, dim);
          // cloud decks are lit by whatever still gets through, so they carry
          // the same red-then-grey-then-black arc as the sky above them
          clouds.material.color.setRGB(1, 1, 1).lerp(veil, dim * 0.92);
          highClouds.material.color.setHex(0xf4f7ff).lerp(veil, dim * 0.95);
          fogLayer.material.color.setHex(0xd8e4ee).lerp(veil, dim * 0.95);
          // insolation is the transmitted fraction; the fills keep a small
          // floor so the globe stays readable rather than going pure black
          sun.intensity = 1.85 * light;
          ambient.intensity = 0.03 + 0.13 * light;
          hemi.intensity = 0.06 + 0.26 * light;
          renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 0.34, ease(dim));
          atmo.material.uniforms.glowColor.value.setHex(0x6eb8ff).lerp(veil, dim * 0.9);
          atmo.material.uniforms.intensity.value = THREE.MathUtils.lerp(1.0, 0.25, dim);
          controls.autoRotateSpeed = 0.18 + dim * 0.12;
          // reads as cover, but it is the dimming: a fast climb while the veil
          // spreads, then a long crawl to full dark. Never a straight line.
          hud.dust.textContent = Math.round(clamp01(dim / 0.99) * 100) + '%';
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
        setDebrisProj();
        sizeGrain();
      });
