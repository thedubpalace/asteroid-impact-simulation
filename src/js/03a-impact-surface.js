      // Three registered image levels share the Earth's own UVs and depth.
      // Keeping the close-up separate preserves its native pixels at the site.
      const impactFirstUniforms = {
        surfaceEnabled: { value: 0 },
        surfaceWorldMap: { value: earthMap },
        surfaceRegionMap: { value: earthMap },
        surfaceImpactMap: { value: earthMap },
        surfaceWorldWater: { value: waterMap },
        surfaceRegionWater: { value: waterMap },
        surfaceImpactWater: { value: waterMap },
        surfaceWorldRoughness: { value: specMap },
        surfaceRegionRoughness: { value: specMap },
        surfaceImpactRoughness: { value: specMap },
        surfaceWorldToRegion: { value: new THREE.Matrix3() },
        surfaceWorldToImpact: { value: new THREE.Matrix3() },
        surfaceAnchorOffset: { value: new THREE.Vector2() },
        surfaceNorthColor: { value: new THREE.Vector3() },
        surfaceSouthColor: { value: new THREE.Vector3() }
      };

      const impactFirstGLSL = `
        uniform float surfaceEnabled;
        uniform sampler2D surfaceWorldMap, surfaceRegionMap, surfaceImpactMap;
        uniform sampler2D surfaceWorldWater, surfaceRegionWater, surfaceImpactWater;
        uniform sampler2D surfaceWorldRoughness, surfaceRegionRoughness, surfaceImpactRoughness;
        uniform mat3 surfaceWorldToRegion, surfaceWorldToImpact;
        uniform vec2 surfaceAnchorOffset;
        uniform vec3 surfaceNorthColor, surfaceSouthColor;

        float surfaceFeather(vec2 uv) {
          vec2 edge = min(uv, 1.0-uv);
          vec2 weight = smoothstep(vec2(0.0), vec2(0.16), edge);
          return weight.x * weight.y;
        }

        vec2 surfaceUV(vec2 globeUV) {
          // Anchor the original close-up's center to the simulated impact.
          // Taper latitude correction to zero at both poles.
          return vec2(fract(globeUV.x + surfaceAnchorOffset.x),
            clamp(globeUV.y + surfaceAnchorOffset.y * 4.0 * globeUV.y * (1.0-globeUV.y), 0.0, 1.0));
        }

        vec3 surfaceColor(vec2 globeUV) {
          vec2 uv = surfaceUV(globeUV);
          vec3 color = texture2D(surfaceWorldMap, uv).rgb;
          float seam = min(uv.x, 1.0-uv.x);
          if (seam < 0.006) {
            vec3 joinColor = 0.5 * (texture2D(surfaceWorldMap, vec2(0.002,uv.y)).rgb
              + texture2D(surfaceWorldMap, vec2(0.998,uv.y)).rgb);
            color = mix(joinColor, color, smoothstep(0.0,0.006,seam));
          }
          color = mix(surfaceSouthColor, color, smoothstep(0.0,0.006,uv.y));
          color = mix(surfaceNorthColor, color, smoothstep(0.0,0.006,1.0-uv.y));
          vec2 regionUV = (surfaceWorldToRegion * vec3(uv,1.0)).xy;
          vec2 impactUV = (surfaceWorldToImpact * vec3(uv,1.0)).xy;
          float regionWeight = surfaceFeather(regionUV);
          float impactWeight = surfaceFeather(impactUV);
          if (regionWeight > 0.0) color = mix(color, texture2D(surfaceRegionMap,clamp(regionUV,0.0,1.0)).rgb,regionWeight);
          if (impactWeight > 0.0) color = mix(color, texture2D(surfaceImpactMap,clamp(impactUV,0.0,1.0)).rgb,impactWeight);
          return color;
        }

        float surfaceScalar(sampler2D worldMap, sampler2D regionMap, sampler2D impactMap, vec2 globeUV) {
          vec2 uv = surfaceUV(globeUV);
          float value = texture2D(worldMap,uv).r;
          vec2 regionUV = (surfaceWorldToRegion * vec3(uv,1.0)).xy;
          vec2 impactUV = (surfaceWorldToImpact * vec3(uv,1.0)).xy;
          float regionWeight = surfaceFeather(regionUV);
          float impactWeight = surfaceFeather(impactUV);
          if (regionWeight > 0.0) value = mix(value,texture2D(regionMap,clamp(regionUV,0.0,1.0)).r,regionWeight);
          if (impactWeight > 0.0) value = mix(value,texture2D(impactMap,clamp(impactUV,0.0,1.0)).r,impactWeight);
          return value;
        }

        float surfaceWater(vec2 uv, float fallbackWater) {
          if (surfaceEnabled < 0.5) return fallbackWater;
          return surfaceScalar(surfaceWorldWater,surfaceRegionWater,surfaceImpactWater,uv);
        }

        float surfaceRoughness(vec2 uv, float fallbackRoughness) {
          if (surfaceEnabled < 0.5) return fallbackRoughness;
          return surfaceScalar(surfaceWorldRoughness,surfaceRegionRoughness,surfaceImpactRoughness,uv);
        }
      `;

      function imagePixelsToUV(width, height) {
        return new THREE.Matrix3().set(1/width,0,0, 0,-1/height,1, 0,0,1);
      }

      function configureImpactSurface(images, maps, records) {
        const [worldImage, regionImage, impactImage] = images;
        const localRecord = records.find(r => r.source === 'impact.png' && r.target === 'region.png');
        const regionRecord = records.find(r => r.source === 'region.png' && r.target === 'world.png');
        for (const [record, source, target] of [[localRecord,impactImage,regionImage],[regionRecord,regionImage,worldImage]]) {
          if (!record || record.inliers < 6 || record.source_hull_fraction < 0.1
            || record.source_size[0] !== source.width || record.source_size[1] !== source.height
            || record.target_size[0] !== target.width || record.target_size[1] !== target.height) {
            throw new Error('Impact texture registration does not match its source images');
          }
        }
        const regionToWorld = new THREE.Matrix3().set(...regionRecord.matrix.flat());
        const impactToWorld = regionToWorld.clone().multiply(new THREE.Matrix3().set(...localRecord.matrix.flat()));
        if (regionToWorld.determinant() <= 0 || impactToWorld.determinant() <= 0) {
          throw new Error('Impact texture registration must preserve orientation');
        }
        const worldUVToPixels = imagePixelsToUV(worldImage.width,worldImage.height).invert();
        impactFirstUniforms.surfaceWorldToRegion.value.copy(imagePixelsToUV(regionImage.width,regionImage.height))
          .multiply(regionToWorld.clone().invert()).multiply(worldUVToPixels);
        impactFirstUniforms.surfaceWorldToImpact.value.copy(imagePixelsToUV(impactImage.width,impactImage.height))
          .multiply(impactToWorld.clone().invert()).multiply(worldUVToPixels);
        const center = new THREE.Vector3(impactImage.width/2,impactImage.height/2,1).applyMatrix3(impactToWorld);
        const targetU = (IMPACT_LON + Math.PI)/(2*Math.PI), targetV = IMPACT_LAT/Math.PI + 0.5;
        impactFirstUniforms.surfaceAnchorOffset.value.set(center.x/worldImage.width-targetU,
          (1-center.y/worldImage.height-targetV)/(4*targetV*(1-targetV)));

        // Average edge colors eliminate the pinched polar stripe of a flat map.
        const sample = document.createElement('canvas'); sample.width = 32; sample.height = 2;
        const ctx = sample.getContext('2d');
        ctx.drawImage(worldImage,0,0,worldImage.width,2,0,0,32,1);
        ctx.drawImage(worldImage,0,worldImage.height-2,worldImage.width,2,0,1,32,1);
        const pixels = ctx.getImageData(0,0,32,2).data;
        for (let row=0;row<2;row++) {
          const color = row === 0 ? impactFirstUniforms.surfaceNorthColor.value : impactFirstUniforms.surfaceSouthColor.value;
          for (let x=0;x<32;x++) {
            const i=(row*32+x)*4; color.x+=pixels[i]/(255*32); color.y+=pixels[i+1]/(255*32); color.z+=pixels[i+2]/(255*32);
          }
        }
        const textures = images.map(img => {
          const tex=imgTex(img,false);
          tex.wrapS=THREE.ClampToEdgeWrapping;
          tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
          return tex;
        });
        function materialTextures(kind) {
          return maps[kind].map(img => {
            const tex=imgTex(img,true);
            tex.wrapS=THREE.ClampToEdgeWrapping;
            tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
            return tex;
          });
        }
        const waterTextures=materialTextures('water');
        const roughnessTextures=materialTextures('roughness');
        impactFirstUniforms.surfaceWorldMap.value=textures[0];
        impactFirstUniforms.surfaceRegionMap.value=textures[1];
        impactFirstUniforms.surfaceImpactMap.value=textures[2];
        impactFirstUniforms.surfaceWorldWater.value=waterTextures[0];
        impactFirstUniforms.surfaceRegionWater.value=waterTextures[1];
        impactFirstUniforms.surfaceImpactWater.value=waterTextures[2];
        impactFirstUniforms.surfaceWorldRoughness.value=roughnessTextures[0];
        impactFirstUniforms.surfaceRegionRoughness.value=roughnessTextures[1];
        impactFirstUniforms.surfaceImpactRoughness.value=roughnessTextures[2];
        earthMap=swapMap(earth,'map',textures[0]);
        bumpMap=swapMap(earth,'bumpMap',null);
        swapMap(earth,'normalMap',null);
        specMap=swapMap(earth,'roughnessMap',null);
        earth.material.metalness=0;
        impactFirstUniforms.surfaceEnabled.value=1;
      }
