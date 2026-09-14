# Source layout

`index.html` at the repo root is the **shipped artifact** and stays a single
self-contained file (PRODUCT.md: "zero friction to open"). It is **generated** —
edit the pieces here, not the root file.

```
src/
  index.template.html   HTML shell: <head>/<style>, body markup, CDN <script>s,
                        the IIFE open/close. Contains one line: // @@BUNDLE@@
  js/
    01-core.js          constants, PHASES, renderer/scene/camera/controls, loader helpers
    02-noise-terrain.js noise + fbm, lat/lon, elevation bake, field sampling
    03-textures.js      paintCretaceous / bump / spec / water / clouds / fog / night, canvasTex
    03a-impact-surface.js registered world/region/impact UV sampling, coastline masks, texture setup
    04-earth-crater.js  earth mesh + material, ocean glint, night lights, crater geo/mesh, melt, ejecta fan, boulders
    05-atmosphere.js    clouds, atmo shell, haze, dust, ground fog, shock + tsunami rings, scorch
    06-particles-layers.js sprite/debris systems, spawnBurst / stepDebris, layer toggles
    07-sim-ui.js        resetSim, HUD refs, Start handler, boot(), letterbox
    08-camera-timeline.js ease/clamp helpers, camera rigs, asteroidPath, currentPhase, emitTail
    09-ground-scene.js  extinction scene: scene/cam/lights/sky, instanced forest, rain, ash, smoke, T-Rex
    10-tick.js          main tick() loop + resize handler
```

The `js/` parts are **not ES modules** — they are ordered fragments of one
shared closure. Filename order (`01`…`10`) is the concat order and must stay
the top-to-bottom order the code expects.

## Build

```
node build.mjs           # regenerate ../index.html
node build.mjs --check    # exit 1 if ../index.html is stale (for CI / pre-commit)
```

The build stitches template + parts, syntax-checks the result, and writes
`index.html`. Commit the regenerated `index.html` together with the `src/`
change in the same commit.

## Texture verification

The default globe uses `textures/impact-first-v1/` and its measured
`registration.json`. The three source PNGs are sampled together on one surface;
the same sampler supplies water coverage to reflections, tsunami and scorch.
Older hybrid, original and procedural maps remain load-error fallbacks.

`node --test tests/globe-uv.test.mjs` checks geographic UV orientation.
`node tests/impact-surface.browser.cjs` checks native local-image dimensions,
impact anchoring, shallow-water coverage, shared effect uniforms, shader errors
and recovery when a new image fails to load. It uses Playwright; set
`PLAYWRIGHT_MODULE` to an existing package directory and optionally
`PLAYWRIGHT_EXECUTABLE` to Chromium when those are installed outside the project.
Screenshots go to the ignored `.cache/impact-surface-qa/` directory.
