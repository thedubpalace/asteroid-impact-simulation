      const EARTH_R = 2.4;
      // True scale is ~0.0008 of Earth's radius — a sub-pixel speck. Keep it
      // readable as a fireball but well under the crater it digs.
      const ASTEROID_R = 0.02;
      // Chicxulub is ~180 km across: ~1.4% of Earth's diameter. This is a
      // ~4x cinematic lift on that (still a small basin, not a hemisphere
      // wound). CRATER_RELIEF keeps the depth-to-width profile fixed as the
      // radius changes, so the tuned bowl/rim shape is preserved.
      const CRATER_R = 0.10;
      const CRATER_RELIEF = CRATER_R / 0.42;
      const IMPACT_LAT = 21.4 * Math.PI / 180;
      const IMPACT_LON = -89.5 * Math.PI / 180;

      const PHASES = [
        { id: 'approach', name: 'Terminal approach', hud: 'Approach',
          copy: 'A ten-kilometre carbonaceous chondrite falls out of the late Cretaceous sky toward a shallow tropical sea.',
          t0: 0, t1: 9.2 },
        { id: 'entry', name: 'Atmospheric entry', hud: 'Atmospheric Entry',
          copy: 'Ram pressure strips the surface into a fireball. Speed holds near 20 km/s as the Yucatán fills the sky.',
          t0: 9.2, t1: 12.4 },
        { id: 'impact', name: 'Impact flash', hud: 'Impact',
          copy: 'Contact. A 100-million-megaton pulse excavates a crater 180 km across and briefly outshines the Sun.',
          t0: 12.4, t1: 14.2 },
        { id: 'shock', name: 'Global shockwave', hud: 'Shockwave',
          copy: 'A hypersonic ring races over Pangea’s broken coasts. Forests ignite. Tsunamis climb every nearby shore.',
          t0: 14.2, t1: 20.5 },
        { id: 'winter', name: 'Nuclear winter', hud: 'Global Winter',
          copy: 'Soot and pulverised bedrock veil the planet. Sunlight collapses. The long night of the K–Pg extinction begins.',
          t0: 20.5, t1: 34 },
        { id: 'extinction', name: 'The long night', hud: 'Extinction',
          copy: 'Down on the surface: no sunrise for years, acid rain in the dark. Photosynthesis stalls and food webs collapse from the plants up. Three in four species vanish — every non-avian dinosaur among them.',
          t0: 34, t1: 50 }
      ];

      const hud = {
        phase: document.getElementById('m-phase'),
        speed: document.getElementById('m-speed'),
        alt: document.getElementById('m-alt'),
        dust: document.getElementById('m-dust'),
        name: document.getElementById('phase-name'),
        copy: document.getElementById('phase-copy'),
        progress: document.getElementById('progress'),
        flash: document.getElementById('flash'),
        heat: document.getElementById('heat'),
        veil: document.getElementById('veil')
      };

      const startBtn = document.getElementById('start');
      const loadLabel = document.getElementById('load-label');
      const loadPct = document.getElementById('load-pct');
      const loadBar = document.getElementById('load-bar');
      const loadWrap = document.getElementById('gate-load');
      let worldReady = false;

      function setLoad(pct, label) {
        const p = Math.max(0, Math.min(100, pct));
        if (loadLabel) loadLabel.textContent = label;
        if (loadPct) loadPct.textContent = Math.round(p) + '%';
        if (loadBar) loadBar.style.width = p.toFixed(1) + '%';
        if (loadWrap) loadWrap.setAttribute('aria-label', label + ', ' + Math.round(p) + ' percent');
      }
      function yieldFrame() {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () { resolve(); });
        });
      }
      function placeholderTex(fill) {
        const c = document.createElement('canvas');
        c.width = 4; c.height = 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = fill || '#081018';
        ctx.fillRect(0, 0, 4, 2);
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
        return t;
      }
      setLoad(3, 'Opening the frame');

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const grain = document.getElementById('grain');
      const gctx = grain.getContext('2d', { alpha: true });
      let grainImg = null;
      function sizeGrain() {
        // tiny tiled noise — stretched full-screen via CSS, cheap to repaint
        grain.width = 160;
        grain.height = 90;
        grainImg = gctx.createImageData(grain.width, grain.height);
      }
      sizeGrain();
      function paintGrain() {
        if (reduceMotion) return;
        const d = grainImg.data;
        for (let i = 0; i < d.length; i += 4) {
          const n = 100 + ((Math.random() * 70) | 0);
          d[i] = d[i + 1] = d[i + 2] = n;
          d[i + 3] = 34 + ((Math.random() * 22) | 0);
        }
        gctx.putImageData(grainImg, 0, 0);
      }
      paintGrain();

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      // Cap DPR: retina * heavy transparent passes tanks frame time
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      // Soft globe lighting without real-time shadow maps (big fill-rate saver)
      renderer.shadowMap.enabled = false;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      document.body.prepend(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020308);
      scene.fog = new THREE.FogExp2(0x020308, 0.0085);

      const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.08, 400);
      camera.position.set(0.6, 1.8, 8.4);

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 3.4;
      controls.maxDistance = 28;
      controls.target.set(0, 0, 0);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.18;

      const sun = new THREE.DirectionalLight(0xfff2d8, 1.85);
      sun.position.set(-14, 7.5, 10);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x6a8cff, 0.18);
      fill.position.set(10, -4, -8);
      scene.add(fill);
      const ambient = new THREE.AmbientLight(0x0c1224, 0.16);
      scene.add(ambient);
      const hemi = new THREE.HemisphereLight(0x1a3a6a, 0x040308, 0.32);
      scene.add(hemi);
      const sunCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 28, 28),
        new THREE.MeshBasicMaterial({ color: 0xfff0c4 })
      );
      sunCore.position.copy(sun.position).multiplyScalar(1.55);
      scene.add(sunCore);
      const sunGlow = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 28, 28),
        new THREE.MeshBasicMaterial({ color: 0xffc878, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      sunGlow.position.copy(sunCore.position);
      scene.add(sunGlow);

