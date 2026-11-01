/* inteligentia · the box, rendered live in 3D (three.js, self-hosted).
   Modelled on the real case: anodized cobalt aluminium, hexagonal perforation on the
   top, front and sides, the chrome spiral on the front. It wakes with the homepage boot
   (html.booting -> html.lit): lights come up, the inside glows through the vents.
   Drag to turn it. If WebGL is unavailable, the poster image simply stays. */
import * as THREE from "../vendor/three.module.min.js";

const host = document.getElementById("box3d");
if (host) start(host).catch(() => { /* poster stays */ });

// a dark photo studio: a few soft-box strips, so metal has something bright to reflect
function studio() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x30384a);
  const strip = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); env.add(m);
  };
  strip(14, 5, 0xffffff, 4, [0, 7, 2], [0, 0, 0]);       // overhead soft box
  strip(2.4, 10, 0xffffff, 3.4, [-7, 2, 3], [0, 0, 0]);     // tall strip, left
  strip(2, 10, 0xbcd7ff, 2.8, [7, 1.5, -1], [0, 0, 0]);
  strip(10, 4, 0xe8eef8, 1.6, [2, 2, 8], [0, 0, 0]);       // big front fill   // cool strip, right
  strip(10, 1.2, 0x4a86ff, 1.6, [0, 1, -8], [0, 0, 0]);    // blue kicker behind
  strip(8, 3, 0x1a2230, 1, [0, -6, 0], [0, 0, 0]);         // dim floor bounce
  return env;
}

async function start(host) {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const H = document.documentElement;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(location.search.includes("hires") ? 2 : Math.min(devicePixelRatio || 1, 2)); // ?hires: used to render the poster image
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.02).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(3.05, 2.15, 4.5);
  camera.lookAt(0, -0.1, 0);
  camera.zoom = 1.1;

  // lights: a soft key from above-left, a cool rim from behind, a warm-neutral fill
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fb8ff, 2.4); rim.position.set(2, 1.5, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6); fill.position.set(4, 0.5, 3); scene.add(fill);

  // ---------- dimensions (units ≈ 10 cm), from the real case ----------
  const W = 1.62, Hh = 0.72, D = 1.5;
  const TEX = 1024;

  // perforation alpha maps: white = metal, black = hole
  function hexPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    ctx.closePath();
  }
  function plate(wu, hu, { r, gap, margin, keepOut, rows }) {
    const cw = TEX, ch = Math.round(TEX * hu / wu);
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, cw, ch);
    x.fillStyle = "#000";
    const px = cw / wu; // pixels per unit
    const R = r * px, dx = Math.sqrt(3) * R + gap * px, dy = 1.5 * R + gap * px * 0.87;
    const m = margin * px;
    const nRows = rows || Math.floor((ch - 2 * m) / dy);
    const y0 = (ch - (nRows - 1) * dy) / 2;
    for (let j = 0; j < nRows; j++) {
      const y = y0 + j * dy, off = (j % 2) * dx / 2;
      for (let xx = m + R + off; xx <= cw - m - R + 0.1; xx += dx) {
        if (keepOut && [].concat(keepOut).some((k) => Math.hypot(xx / px - k.x * wu, y / px - k.y * hu) < k.r)) continue;
        hexPath(x, xx, y, R); x.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  const brushed = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "rgb(120,120,120)"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const v = 90 + Math.random() * 70; x.fillStyle = `rgba(${v},${v},${v},.35)`; x.fillRect(0, Math.random() * 512, 512, Math.random() * 1.6); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
  })();
  const caseMat = (alphaMap) => new THREE.MeshPhysicalMaterial({
    color: 0x1d5ccc, metalness: 0.78, roughness: 0.34, roughnessMap: brushed,
    anisotropy: 0.65, clearcoat: 0.6, clearcoatRoughness: 0.18, iridescence: 0.08,
    alphaMap, alphaTest: 0.5, side: THREE.DoubleSide,
  });

  const box = new THREE.Group();
  scene.add(box);

  // the inside: dark, with a light that comes on when the agent is awake
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 0.9, metalness: 0, emissive: 0x2f7bff, emissiveIntensity: 0 });
  const inner = new THREE.Mesh(new THREE.BoxGeometry(W - 0.07, Hh - 0.07, D - 0.07), innerMat);
  box.add(inner);
  const board = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.04, D - 0.3), new THREE.MeshStandardMaterial({ color: 0x0b1a12, roughness: 0.6, metalness: 0.3 }));
  board.position.y = -Hh / 2 + 0.12; box.add(board);

  const face = (w, h, tex, pos, rotY = 0, rotX = 0) => {
    const g = new THREE.Group();
    for (const inset of [0, 0.022]) { // outer skin + a matte black inner skin = wall thickness through the holes
      const mat = inset ? new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1, metalness: 0, alphaMap: tex, alphaTest: 0.5, side: THREE.DoubleSide }) : caseMat(tex);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.z = -inset; g.add(m);
    }
    g.position.copy(pos); g.rotation.set(rotX, rotY, 0, "YXZ");
    box.add(g);
    return g;
  };

  const logoCenter = { x: 0.5, y: 0.5 };
  const frontTex = plate(W, Hh, { r: 0.058, gap: 0.016, margin: 0.06, rows: 4, keepOut: [{ ...logoCenter, r: 0.31 }, { x: 0.84, y: 0.86, r: 0.17 }] });
  const sideTex = plate(D, Hh, { r: 0.05, gap: 0.014, margin: 0.07, rows: 4 });
  const topTex = plate(W, D, { r: 0.046, gap: 0.018, margin: 0.1 });
  const solid = (() => { const c = document.createElement("canvas"); c.width = c.height = 4; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 4, 4); return new THREE.CanvasTexture(c); })();

  face(W, Hh, frontTex, new THREE.Vector3(0, 0, D / 2));
  face(W, Hh, sideTex, new THREE.Vector3(0, 0, -D / 2), Math.PI);
  face(D, Hh, sideTex, new THREE.Vector3(W / 2, 0, 0), Math.PI / 2);
  face(D, Hh, sideTex, new THREE.Vector3(-W / 2, 0, 0), -Math.PI / 2);
  face(W, D, topTex, new THREE.Vector3(0, Hh / 2, 0), 0, -Math.PI / 2);
  face(W, D, solid, new THREE.Vector3(0, -Hh / 2, 0), 0, Math.PI / 2);

  // edges: thin rounded rails so the corners read as machined aluminium, not paper
  const railMat = new THREE.MeshPhysicalMaterial({ color: 0x2a66cf, metalness: 1, roughness: 0.18, clearcoat: 0.8 });
  const rail = (len, axis, x, y, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, len, 12), railMat);
    if (axis === "x") m.rotation.z = Math.PI / 2; if (axis === "z") m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z); box.add(m);
  };
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) rail(W, "x", 0, sy * Hh / 2, sz * D / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rail(Hh, "y", sx * W / 2, 0, sz * D / 2);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) rail(D, "z", sx * W / 2, sy * Hh / 2, 0);

  // the chrome spiral, raised: a mask for its shape, a blurred copy as relief
  const maskImg = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = new URL("../img/mark-mask.png", import.meta.url).href; });
  const mk = (blur) => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, 512, 512);
    if (blur) x.filter = `blur(${blur}px)`;
    // the mask is white-on-transparent: draw it as white on black
    x.drawImage(maskImg, 0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  };
  const logoSize = Hh * 0.82;
  const logoMat = new THREE.MeshPhysicalMaterial({ color: 0xe6ebf2, metalness: 1, roughness: 0.07, alphaMap: mk(0), alphaTest: 0.45, bumpMap: mk(6), bumpScale: 5, envMapIntensity: 1.6 });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoSize, logoSize), logoMat);
  logo.position.set((logoCenter.x - 0.5) * W, 0, D / 2 + 0.014);
  box.add(logo);
  const logoShadow = new THREE.Mesh(new THREE.PlaneGeometry(logoSize, logoSize), new THREE.MeshBasicMaterial({ color: 0x020814, alphaMap: mk(3), transparent: true, opacity: 0.55, depthWrite: false }));
  logoShadow.position.set(logo.position.x + 0.01, -0.012, D / 2 + 0.004);
  box.add(logoShadow);
  // a glow that blooms over the spiral when it wakes
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, "rgba(220,236,255,1)"); g.addColorStop(0.25, "rgba(110,170,255,.55)"); g.addColorStop(1, "rgba(46,116,222,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(logoSize * 1.9, logoSize * 1.9), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(logo.position.x, 0, D / 2 + 0.03);
  box.add(glow);

  // status LEDs: they come on with the boot, then blink like a working machine
  const ledColors = [0x46f2a4, 0x46f2a4, 0xffcc4d, 0x7fb8ff];
  const ledTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, "rgba(255,255,255,.8)"); g.addColorStop(0.45, "rgba(255,255,255,.18)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const leds = ledColors.map((col, i) => {
    const g = new THREE.Group();
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), new THREE.MeshBasicMaterial({ color: 0x0b0e14 }));
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: ledTex, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.z = 0.003; g.add(lens, halo);
    g.position.set(W / 2 - 0.13 - i * 0.07, -Hh / 2 + 0.085, D / 2 + 0.006);
    box.add(g);
    return { lens, halo, col: new THREE.Color(col), seed: Math.random() * 10, rate: [0.7, 3.1, 1.6, 5.3][i] };
  });

  // a soft shadow on the "table"
  const shTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.1, D * 2.1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -Hh / 2 - 0.02;
  scene.add(shadow);

  box.position.y = 0.02;

  // ---------- sizing, visibility, interaction ----------
  host.appendChild(canvas);
  const size = () => {
    const w = host.clientWidth, h = host.clientHeight || w;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  size();
  new ResizeObserver(size).observe(host);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(host);

  let yaw = -0.18, vel = 0, dragging = false, lastX = 0, idle = 0;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); host.classList.add("grab"); });
  canvas.addEventListener("pointermove", (e) => { if (!dragging) return; const d = (e.clientX - lastX) / host.clientWidth; lastX = e.clientX; yaw += d * 3.2; vel = d * 3.2; idle = 0; });
  const up = () => { dragging = false; host.classList.remove("grab"); };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  // ---------- the wake ----------
  let power = H.classList.contains("booting") ? 0 : 1;
  let flare = 0, wasLit = !H.classList.contains("booting");
  const clock = new THREE.Clock();
  let running = false;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const lit = !H.classList.contains("booting");
    const lights = document.querySelectorAll("#readout li.on").length;
    const target = lit ? 1 : 0.12 + lights * 0.07;
    power += (target - power) * Math.min(1, dt * (lit ? 2.2 : 4));
    if (lit && !wasLit) flare = 1;
    wasLit = lit;
    flare = Math.max(0, flare - dt * 0.8);

    renderer.toneMappingExposure = 0.25 + power * 0.85;
    scene.environmentIntensity = 0.12 + power * 0.9;
    key.intensity = 0.3 + power * 2.6; fill.intensity = power * 0.6; rim.intensity = 0.8 + power * 1.6;
    const breathe = REDUCED ? 0 : Math.sin(t * 1.3) * 0.08;
    innerMat.emissiveIntensity = (lit ? 0.07 + breathe * 0.3 : lights * 0.02) + flare * 0.9;
    glow.material.opacity = (lit ? 0.18 + breathe * 0.6 : 0) + flare * 0.9;
    leds.forEach((l, i) => {
      let on = 0;
      if (lit) {
        on = i === 0 ? 0.75 + 0.25 * Math.sin(t * l.rate)                      // power: steady breathing
          : i === 1 ? (Math.sin(t * l.rate * 2 + l.seed) > 0.55 ? 1 : 0.15)      // disk activity
          : i === 2 ? (Math.sin(t * l.rate) > 0 ? 0.95 : 0.25)                   // filter: slow blink
          : (Math.random() < 0.08 ? 1 : 0.12 + 0.1 * Math.sin(t * l.rate));      // network flicker
        if (REDUCED) on = 0.85;
      } else if (i < lights) on = 0.9;
      l.lens.material.color.copy(l.col).multiplyScalar(0.15 + on * 0.85);
      l.halo.material.opacity = on;
    });

    if (!dragging) {
      idle += dt;
      vel *= 0.94;
      yaw += vel;
      if (!REDUCED && Math.abs(vel) < 0.002) { // slow drift back and forth, like being turned in a hand
        const home = -0.18 + Math.sin(t * 0.35) * 0.32;
        yaw += (home - yaw) * Math.min(1, dt * (idle > 2 ? 0.6 : 0.1));
      }
    }
    box.rotation.y = yaw;
    shadow.rotation.z = yaw;
    renderer.render(scene, camera);
    if (!host.classList.contains("ready")) host.classList.add("ready");
  }
  function loop() {
    if (running) return;
    running = true;
    const tick = () => {
      if (!visible) { running = false; return; }
      frame();
      if (REDUCED && !dragging && power > 0.99) { running = false; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if (REDUCED) canvas.addEventListener("pointerdown", loop);
  loop();
}
