// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its package path.
// PLAYWRIGHT_EXECUTABLE optionally selects an existing Chromium installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'.cache/impact-surface-qa');
fs.mkdirSync(output,{recursive:true});

// Expose diagnostics only in the served test copy, never in the shipped HTML.
const probe = `window.__surfaceQA = {
  ready: () => worldReady,
  status: () => ({ enabled: impactFirstUniforms.surfaceEnabled.value,
    mapWidth: earth.material.map.image.width, normal: !!earth.material.normalMap,
    materialMaps: {
      water: impactFirstUniforms.surfaceWorldWater.value.image.width,
      roughness: impactFirstUniforms.surfaceWorldRoughness.value.image.width,
      normal: false
    },
    masksShared: [oceanGlint,tsunami,scorch].every(mesh =>
      mesh.material.uniforms.surfaceWorldToImpact === impactFirstUniforms.surfaceWorldToImpact),
    impactSize: [impactFirstUniforms.surfaceImpactMap.value.image.width,impactFirstUniforms.surfaceImpactMap.value.image.height] }),
  anchor: () => {
    const u=(IMPACT_LON+Math.PI)/(2*Math.PI), v=IMPACT_LAT/Math.PI+0.5;
    const shift=impactFirstUniforms.surfaceAnchorOffset.value;
    const uv=new THREE.Vector3(u+shift.x,v+shift.y*4*v*(1-v),1)
      .applyMatrix3(impactFirstUniforms.surfaceWorldToImpact.value);
    const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;
    const ctx=canvas.getContext('2d'), img=impactFirstUniforms.surfaceImpactMap.value.image;
    ctx.drawImage(img,Math.floor(uv.x*img.width),Math.floor((1-uv.y)*img.height),1,1,0,0,1,1);
    return {uv:uv.toArray(),color:Array.from(ctx.getImageData(0,0,1,1).data)};
  },
  frame: (time,mode) => {
    resetSim();
    window.__runFrames=true;playing=true;introT=3;simTime=time;
    document.body.classList.add('is-playing','is-open','pane-min');
    camModeEl.value=mode;
    applyCamera(mode,time,worldImpact(),asteroidPath(Math.min(1,time/12.4)),true);
    tick(performance.now());window.__runFrames=false;
  },
  inspectGlobe: (longitude,latitude) => {
    window.__runFrames=false;
    scene.traverse(o=>{if(o.isMesh||o.isPoints||o.isSprite||o.isLine)o.visible=o===earth;});
    earthGroup.rotation.set(0,0,0);
    const n=latLonToVec(latitude*Math.PI/180,longitude*Math.PI/180,1);
    camera.position.copy(n).multiplyScalar(7.6);camera.up.set(0,1,0);camera.lookAt(0,0,0);
    renderer.render(scene,camera);
  }
};`;

const server = http.createServer((req,res)=>{
  if(req.url==='/favicon.ico'){res.statusCode=204;res.end();return;}
  const filename=path.resolve(root,'.'+decodeURIComponent(req.url==='/'?'/index.html':req.url));
  if(!filename.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
  try {
    let body=fs.readFileSync(filename);
    if(filename.endsWith('index.html'))body=body.toString()
      .replace('function tick(now) {','function tick(now) { if(window.__runFrames === false) return;')
      .replace('    })();\n  </script>',probe+'\n    })();\n  </script>');
    res.setHeader('Content-Type',({'.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'})[path.extname(filename)]||'application/octet-stream');
    res.end(body);
  }catch{res.statusCode=404;res.end();}
});

(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE||undefined,
      headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const errors=[],requested=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error' && /shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    page.on('request',req=>requested.push(req.url()));
    await page.goto('http://127.0.0.1:'+server.address().port,{timeout:60000});
    await page.waitForFunction(()=>window.__surfaceQA?.ready(),{},{timeout:120000});
    const status=await page.evaluate(()=>window.__surfaceQA.status());
    assert.equal(status.enabled,1);assert.equal(status.normal,false);assert.equal(status.masksShared,true);
    assert.deepEqual(status.impactSize,[1254,1254]);
    assert.deepEqual(status.materialMaps,{water:1774,roughness:1774,normal:false});
    assert.equal(requested.some(url=>url.includes('textures/hybrid8k')),false);
    for(const name of ['world-water.png','world-roughness.png']) {
      assert.equal(requested.some(url=>url.endsWith('/'+name)),true);
    }
    const anchor=await page.evaluate(()=>window.__surfaceQA.anchor());
    assert.ok(Math.abs(anchor.uv[0]-0.5)<1e-6 && Math.abs(anchor.uv[1]-0.5)<1e-6);
    assert.ok(Math.min(anchor.color[1]-anchor.color[0],anchor.color[2]-anchor.color[0])>24,'Impact must be on shallow water');
    console.log(JSON.stringify({primary:status,anchor}));
    await page.evaluate(()=>window.__surfaceQA.frame(11.8,'close'));
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('gate')).visibility==='hidden');
    await page.screenshot({path:path.join(output,'close.png')});
    await page.evaluate(()=>window.__surfaceQA.frame(14.8,'cinematic'));
    await page.screenshot({path:path.join(output,'impact.png')});
    await page.evaluate(()=>window.__surfaceQA.frame(19,'wide'));
    await page.screenshot({path:path.join(output,'wide.png')});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>window.__surfaceQA.frame(11.8,'close'));
    await page.screenshot({path:path.join(output,'mobile.png')});
    await page.setViewportSize({width:1000,height:1000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.addStyleTag({content:'body > :not(canvas) {visibility:hidden!important} canvas{visibility:visible!important} #grain{visibility:hidden!important}'});
    await page.evaluate(()=>window.__surfaceQA.inspectGlobe(180,0));
    await page.screenshot({path:path.join(output,'seam.png')});
    await page.route('**/impact-first-v1/region.png',route=>route.abort());
    await page.reload();
    await page.waitForFunction(()=>window.__surfaceQA?.ready(),{},{timeout:120000});
    const fallback=await page.evaluate(()=>window.__surfaceQA.status());
    assert.equal(fallback.enabled,0);assert.ok(fallback.mapWidth>=4096);
    await page.evaluate(()=>window.__surfaceQA.frame(14.8,'cinematic'));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({fallback,errors}));
  } finally {
    if(browser)await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
