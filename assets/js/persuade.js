/* inteligentia · persuasion layer: plays "a day with your agent", animates the masking wire, shows the sticky reserve bar. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---- a day with your agent ---- */
  const log = $("#day-log");
  if (log) {
    const scenes = $$(".scene", log);
    const tabs = $$(".day-times button");
    const clock = $("#day-clock");
    let idx = 0, token = 0, visible = false, started = false;
    const beat = (n) => (n.classList.contains("me") ? 900 : n.classList.contains("tl") ? 500 : 1100 + Math.min(1400, n.textContent.length * 14));
    const sceneTime = (sc) => [...sc.children].reduce((t, n) => t + beat(n) + 250, 0) + 2600;
    log.classList.add("live");

    function select(i) {
      idx = (i + scenes.length) % scenes.length;
      scenes.forEach((s, k) => { s.classList.toggle("on", k === idx); s.classList.toggle("past", k < idx); });
      tabs.forEach((b, k) => { b.setAttribute("aria-pressed", String(k === idx)); b.classList.remove("run"); });
      clock.textContent = scenes[idx].dataset.t;
      const tab = tabs[idx];
      if (tab && matchMedia("(max-width: 980px)").matches) {
        const row = tab.closest("ol"); row.scrollTo({ left: tab.parentElement.offsetLeft - 16, behavior: REDUCED ? "auto" : "smooth" });
      }
    }
    async function play(i) {
      const my = ++token;
      select(i);
      const sc = scenes[idx]; const items = [...sc.children];
      items.forEach((n) => n.classList.remove("shown"));
      $(".typing", log)?.remove();
      if (REDUCED) { items.forEach((n) => n.classList.add("shown")); return; }
      const tab = tabs[idx]; tab.style.setProperty("--dur", sceneTime(sc) + "ms"); void tab.offsetWidth; tab.classList.add("run");
      for (const n of items) {
        if (my !== token) return;
        if (n.classList.contains("ag")) {
          const t = document.createElement("span"); t.className = "typing"; t.innerHTML = "<i></i><i></i><i></i>";
          sc.insertBefore(t, n); t.classList.add("shown");
          await wait(beat(n) - 400); t.remove();
        } else await wait(beat(n));
        if (my !== token) return;
        n.classList.add("shown");
        await wait(250);
      }
      await wait(2600);
      while (my === token && !visible) await wait(400);
      if (my === token) play(idx + 1);
    }
    tabs.forEach((b, k) => b.addEventListener("click", () => play(k)));
    select(0);
    if (REDUCED) scenes[0].querySelectorAll("*").forEach((n) => n.classList.add("shown"));
    new IntersectionObserver((es) => es.forEach((e) => {
      visible = e.isIntersecting;
      if (visible && !started) { started = true; play(0); }
    }), { threshold: 0.35 }).observe(log);
  }

  /* ---- masking wire: real values scramble into placeholders ---- */
  const wire = $("#wire");
  if (wire && !REDUCED) {
    const src = $$(".wire-step:first-child mark", wire);
    const out = $$(".wire-step.out mark", wire);
    const GLYPHS = "▓▒░#%&@$*+=?";
    async function scramble(m, from, to) {
      const steps = 14;
      for (let k = 0; k <= steps; k++) {
        const n = Math.round(from.length + (to.length - from.length) * (k / steps));
        const keep = Math.floor(to.length * (k / steps));
        let s = to.slice(0, keep);
        for (let j = keep; j < n; j++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        m.textContent = s; await wait(38);
      }
      m.textContent = to;
    }
    let running = false;
    async function cycle() {
      if (running) return; running = true;
      out.forEach((m, i) => { m.textContent = src[i].textContent; m.classList.add("real-in"); });
      await wait(700);
      for (let i = 0; i < out.length; i++) { src[i].classList.add("scr"); await scramble(out[i], src[i].textContent, src[i].dataset.ph); src[i].classList.remove("scr"); await wait(120); }
      running = false;
    }
    let timer = null;
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { cycle(); timer = setInterval(cycle, 9000); }
      else { clearInterval(timer); }
    }), { threshold: 0.4 }).observe(wire);
  }

  /* ---- sticky reserve bar on phones ---- */
  const bar = $("#sticky-cta");
  if (bar) {
    bar.hidden = false;
    const hero = $(".hero"), targets = [$("#hardware"), $(".finale")].filter(Boolean);
    let heroIn = true; const tIn = new Set();
    const upd = () => bar.classList.toggle("show", !heroIn && tIn.size === 0);
    new IntersectionObserver((es) => es.forEach((e) => { heroIn = e.isIntersecting; upd(); }), { threshold: 0.05 }).observe(hero);
    const tio = new IntersectionObserver((es) => es.forEach((e) => { e.isIntersecting ? tIn.add(e.target) : tIn.delete(e.target); upd(); }), { threshold: 0.05 });
    targets.forEach((t) => tio.observe(t));
  }
})();
