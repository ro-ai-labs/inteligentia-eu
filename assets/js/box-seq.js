/* inteligentia · the box, path-traced (Blender Cycles) and played back as a turntable.
   assets/render/f00..f24.webp are 25 frames from -36° to +36°; positions.json holds where the
   dial window (its four corners) and the four LED windows land in each frame. The animated icon,
   a ring of LEDs around the spiral, is real DOM laid onto the window glass with a perspective
   transform, and the status LEDs are drawn live on top:
   the box wakes with the homepage boot (html.booting -> html.lit), the LEDs blink, and you
   can drag it. Neighbouring frames are cross-faded so the turn reads as continuous.
   Until the frames arrive (or if anything fails) the poster image simply stays. */
(() => {
  "use strict";
  const host = document.getElementById("box3d");
  if (!host) return;
  const H = document.documentElement;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BASE = "assets/render/";
  const N = 25, MID = 12;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  // the icon behind the glass: LED ring, a light running round it, the spiral
  const DS = 240;
  const dial = document.createElement("div");
  dial.className = "dial"; dial.setAttribute("aria-hidden", "true");
  dial.innerHTML = '<span class="ring"></span><span class="sweep"></span><span class="orb dial-orb"></span>';
  const ringEl = dial.firstChild, orbEl = dial.lastChild;
  const frames = new Array(N);
  let pos = null, ready = false;

  const load = (i) => new Promise((res) => {
    const im = new Image(); im.decoding = "async";
    im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { frames[i] = im; res(); }); };
    im.onerror = () => res();
    im.src = `${BASE}f${String(i).padStart(2, "0")}.webp`;
  });

  async function start() {
    try { pos = await (await fetch(BASE + "positions.json")).json(); } catch { return; }
    await load(MID);
    if (!frames[MID]) return;
    host.appendChild(canvas); host.appendChild(dial); size(); ready = true; host.classList.add("ready"); loop();
    // the rest, outward from the middle, after the page has settled
    const order = []; for (let k = 1; k <= MID; k++) order.push(MID - k, MID + k);
    for (const i of order) await load(i);
  }

  let W = 0, Hh = 0, dpr = 1;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = host.clientWidth; Hh = host.clientHeight || W;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
  }
  new ResizeObserver(() => { if (ready) size(); }).observe(host);

  let visible = true, running = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(host);

  // turntable position, in frames (float)
  let p = MID, vel = 0, dragging = false, lastX = 0, idle = 10;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); host.classList.add("grab"); loop(); });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const d = (e.clientX - lastX) / W * N * 0.9; lastX = e.clientX;
    p = Math.max(0, Math.min(N - 1, p - d)); vel = -d; idle = 0;
  });
  const up = () => { dragging = false; host.classList.remove("grab"); };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  const nearest = (i, dir) => { for (let k = i; k >= 0 && k < N; k += dir) if (frames[k]) return k; return MID; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const at = (key, i, j, t, k) => {
    const A = k == null ? pos[i][key] : pos[i][key][k], B = k == null ? pos[j][key] : pos[j][key][k];
    return [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];
  };

  const LED = [[70, 242, 164], [70, 242, 164], [255, 204, 77], [127, 184, 255]];
  const RATE = [0.7, 3.1, 1.6, 5.3];
  let power = H.classList.contains("booting") ? 0 : 1, flare = 0, wasLit = !H.classList.contains("booting");
  let last = performance.now(), t = 0;

  // projective map of the DS x DS dial element onto the window's quad (Heckbert, square -> quad)
  function place(q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
    dial.style.transform = `matrix3d(${a / DS},${d / DS},0,${g / DS},${b / DS},${e / DS},0,${h / DS},0,0,1,0,${x0},${y0},0,1)`;
  }
  let ringP = H.classList.contains("booting") ? 0 : 1;

  function glow(x, y, r, rgb, a) {
    if (a <= 0.01) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.18, `rgba(${rgb},${a * 0.9})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    const lit = !H.classList.contains("booting");
    const lights = document.querySelectorAll("#readout li.on").length;
    power += ((lit ? 1 : 0.1 + lights * 0.06) - power) * Math.min(1, dt * (lit ? 2.2 : 4));
    if (lit && !wasLit) flare = 1;
    wasLit = lit; flare = Math.max(0, flare - dt * 0.8);

    if (!dragging) {
      idle += dt; vel *= 0.9; p = Math.max(0, Math.min(N - 1, p + vel));
      if (!REDUCED && Math.abs(vel) < 0.01 && idle > 1.5) { // drift, like being turned slowly in a hand
        const target = MID + Math.sin(t * 0.32) * (MID - 1);
        p += (target - p) * Math.min(1, dt * 0.8);
      }
    }

    const i = Math.floor(p), j = Math.min(N - 1, i + 1), f = p - i;
    const a = frames[i] ? i : nearest(i, -1), b = frames[j] ? j : a;
    const S = Math.min(canvas.width, canvas.height), ox = (canvas.width - S) / 2, oy = (canvas.height - S) / 2;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1; ctx.drawImage(frames[a], ox, oy, S, S);
    if (b !== a && f > 0.01) { ctx.globalAlpha = f; ctx.drawImage(frames[b], ox, oy, S, S); ctx.globalAlpha = 1; }

    // the box is dark until it wakes: darken only where the box is
    if (power < 0.995) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = `rgba(3,5,10,${(1 - power) * 0.92})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    // the dial, in CSS pixels of the host
    const cs = 1 / dpr, quad = [0, 1, 2, 3].map((k) => { const [x, y] = at("dial", i, j, f, k); return [(ox + x * S) * cs, (oy + y * S) * cs]; });
    place(quad);
    ringP += ((lit ? 1 : lights / 4) - ringP) * Math.min(1, dt * 6);
    ringEl.style.setProperty("--p", ringP.toFixed(3));
    orbEl.style.filter = `brightness(${(0.16 + 0.84 * power).toFixed(3)}) saturate(${(0.2 + 0.8 * power).toFixed(3)})`;

    ctx.globalCompositeOperation = "lighter";
    const [lx, ly] = at("logo", i, j, f);
    glow(ox + lx * S, oy + ly * S, S * 0.16, "90,150,255", flare * 0.6);
    for (let k = 0; k < 4; k++) {
      let on = 0;
      if (lit) {
        on = REDUCED ? 0.85
          : k === 0 ? 0.75 + 0.25 * Math.sin(t * RATE[0])
          : k === 1 ? (Math.sin(t * RATE[1] * 2 + 1.7) > 0.55 ? 1 : 0.12)
          : k === 2 ? (Math.sin(t * RATE[2]) > 0 ? 0.95 : 0.2)
          : (Math.random() < 0.08 ? 1 : 0.1 + 0.08 * Math.sin(t * RATE[3]));
      } else if (k < lights) on = 0.9;
      const [x, y] = at("leds", i, j, f, k);
      glow(ox + x * S, oy + y * S, S * 0.018, LED[k].join(","), on);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function loop() {
    if (running || !ready) return;
    running = true;
    const tick = (now) => {
      if (!visible) { running = false; return; }
      frame(now);
      if (REDUCED && !dragging && power > 0.99) { running = false; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
})();
