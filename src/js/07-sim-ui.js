      function resetSim() {
        start = performance.now();
        flashPeak = 0;
        lastPhase = '';
        debrisBurst = 0;
        lastDebris = 0;
        simTime = 0;
        introT = 0;
        frameOpen = false;
        shake.set(0, 0, 0);
        document.body.classList.remove('is-open');
        hud.heat.style.opacity = 0;
        groundFog.material.uniforms.fogR.value = 0;
        groundFog.material.uniforms.fogA.value = 0;
        camera.fov = 42;
        camera.updateProjectionMatrix();
        asteroid.visible = true;
        asteroid.material.emissiveIntensity = 0.35;
        tail.visible = true;
        fireCore.material.opacity = 0;
        fireShell.material.opacity = 0;
        fireHalo.material.opacity = 0;
        plasmaShell.material.opacity = 0;
        plasmaHalo.material.opacity = 0;
        fireCore.visible = true;
        fireShell.visible = true;
        plasmaShell.visible = true;
        fireCore.scale.setScalar(ASTEROID_R * 1.42);
        fireShell.scale.setScalar(ASTEROID_R * 2.05);
        fireHalo.visible = false;
        fireHalo.scale.setScalar(ASTEROID_R * 0.01);
        plasmaShell.scale.setScalar(ASTEROID_R * 1.68);
        plasmaHalo.visible = false;
        plasmaHalo.scale.setScalar(ASTEROID_R * 0.01);
        heatLight.intensity = 0;
        dust.material.uniforms.dustR.value = 0;
        dust.material.uniforms.dustOpacity.value = 0;
        dust.material.uniforms.time.value = 0;
        scorch.material.uniforms.scorchR.value = 0;
        scorch.material.uniforms.scorchA.value = 0;
        shock.visible = false;
        shock.material.uniforms.waveR.value = 0;
        shock.material.uniforms.waveA.value = 0;
        tsunami.material.uniforms.waveR.value = 0;
        tsunami.material.uniforms.waveA.value = 0;
        impactBloom.material.uniforms.bloomR.value = 0;
        impactBloom.material.uniforms.bloomA.value = 0;
        craterGroup.visible = false;
        craterGroup.scale.setScalar(0.001);
        boulderGroup.scale.setScalar(1);
        craterFloor.material.emissiveIntensity = 0;
        craterFloor.material.emissive.set(0xff6a18);
        craterFloor.material.color.set(0xffffff);
        meltPool.material.opacity = 0;
        meltHalo.material.opacity = 0;
        meltOuter.material.opacity = 0;
        ejectaFan.material.opacity = 0;
        boulders.forEach((b) => { b.material.emissiveIntensity = 0; b.material.opacity = 0; });
        craterLight.intensity = 0;
        flashOrb.intensity = 0;
        fillOrb.intensity = 0;
        atmo.material.uniforms.impactGlow.value = 0;
        hud.flash.style.opacity = 0;
        renderer.toneMappingExposure = 1.05;
        sun.intensity = 1.85;
        ambient.intensity = 0.16;
        hemi.intensity = 0.32;
        renderer.toneMappingExposure = 1.05;
        atmo.material.uniforms.glowColor.value.set(0x6eb8ff);
        atmo.material.uniforms.intensity.value = 1.0;
        fogLayer.material.opacity = 0.3;
        fogLayer.material.color.set(0xd8e4ee);
        clouds.material.opacity = 0.68;
        clouds.material.color.set(0xffffff);
        highClouds.material.opacity = 0.34;
        highClouds.material.color.set(0xf4f7ff);
        haze.material.uniforms.hazeA.value = 0.08;
        haze.material.uniforms.hazeColor.value.set(0xa8d8ff);
        nights.material.opacity = 0.85;
        earthGroup.rotation.set(0, 0, 0);
        fogLayer.rotation.set(0, 0, 0);
        clouds.rotation.set(0, 0, 0);
        highClouds.rotation.set(0, 0, 0);
        asteroid.rotation.set(0, 0, 0);
        asteroid.scale.setScalar(1);
        asteroid.material.emissive.set(0xff3a08);
        hud.dust.textContent = '0%';
        hud.flash.style.opacity = 0;
        hud.heat.style.opacity = 0;
        controls.autoRotateSpeed = 0.18;
        for (let i = 0; i < TAIL; i++) {
          tailLife[i] = 0;
          tailPos[i * 3] = tailPos[i * 3 + 1] = tailPos[i * 3 + 2] = 80;
        }
        resetDebris(ejecta);
        resetDebris(smoke);
        resetDebris(soot);
        resetDebris(mistFine);
        ejecta.mat.uniforms.uOpacity.value = 0.95;
        smoke.mat.uniforms.uOpacity.value = 0.72;
        soot.mat.uniforms.uOpacity.value = 0.8;
        mistFine.mat.uniforms.uOpacity.value = 0.55;
        resetGround();
        if (typeof snapCamera === 'function') snapCamera();
      }
      const paneToggle = document.getElementById('pane-toggle');
      paneToggle.addEventListener('click', function () {
        const collapsed = document.body.classList.toggle('pane-min');
        paneToggle.textContent = collapsed ? '+' : '–';
        paneToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        paneToggle.title = collapsed ? 'Expand detail pane' : 'Minimize detail pane';
      });
      function swapMap(mesh, key, next) {
        const mat = mesh.material;
        const prev = mat[key];
        mat[key] = next;
        mat.needsUpdate = true;
        if (prev && prev !== next && prev.dispose) prev.dispose();
        return next;
      }

      async function boot() {
        setLoad(5, 'Opening the frame');
        await yieldFrame();
        await bakeElevation();

        setLoad(46, 'Painting continents');
        await yieldFrame();
        earthMap = swapMap(earth, 'map', canvasTex(paintCretaceous, 3072, 1536));

        setLoad(56, 'Carving relief');
        await yieldFrame();
        bumpMap = swapMap(earth, 'bumpMap', canvasTex(paintBump, 2560, 1280));

        setLoad(64, 'Polishing seas');
        await yieldFrame();
        specMap = swapMap(earth, 'roughnessMap', canvasTex(paintSpec, 1536, 768));
        // oceanGlint is a ShaderMaterial now — feed the real water mask into its
        // uniform instead of an alphaMap slot.
        const nextWater = canvasTex(paintWater, 1536, 768);
        const prevWater = oceanGlint.material.uniforms.waterMap.value;
        oceanGlint.material.uniforms.waterMap.value = nextWater;
        if (prevWater && prevWater !== nextWater && prevWater.dispose) prevWater.dispose();
        waterMap = nextWater;

        setLoad(74, 'Lighting the night side');
        await yieldFrame();
        nightMap = swapMap(nights, 'map', canvasTex(paintNight, 1280, 640));

        setLoad(82, 'Laying haze');
        await yieldFrame();
        fogMap = swapMap(fogLayer, 'alphaMap', canvasTex(paintFog, 768, 384));

        setLoad(88, 'Gathering clouds');
        await yieldFrame();
        cloudMap = swapMap(clouds, 'alphaMap', canvasTex((ctx, w, h) => paintClouds(ctx, w, h, 0.24, 1), 1536, 768));

        setLoad(95, 'High cirrus');
        await yieldFrame();
        highCloudMap = swapMap(highClouds, 'alphaMap', canvasTex((ctx, w, h) => paintClouds(ctx, w, h, 0.38, 1.7), 768, 384));

        setLoad(100, 'Ready');
        worldReady = true;
        document.body.classList.remove('is-loading');
        if (loadWrap) loadWrap.setAttribute('aria-busy', 'false');
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.textContent = 'Start';
        }
      }
      boot();

      document.getElementById('replay').addEventListener('click', function () {
        if (!playing) {
          if (worldReady) startBtn.click();
          return;
        }
        resetSim();
        document.body.classList.add('is-playing');
        window.setTimeout(function () { document.body.classList.add('is-open'); }, 180);
      });
      startBtn.addEventListener('click', function () {
        if (playing || !worldReady) return;
        playing = true;
        resetSim();
        document.body.classList.add('is-playing');
        window.setTimeout(function () { document.body.classList.add('is-open'); }, 280);
      });

