/* inteligentia · homepage
   1. The product page (facts, reservation form with a visible outgoing packet).
   2. "Meet your agent": an interactive, scripted preview that runs only in this browser.
   Memory lives in localStorage. The only network request is the reservation. */
(() => {
  "use strict";

  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ro" ? "ro" : "en";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? 0 : ms));
  const utf8 = (s) => new TextEncoder().encode(s).length;
  const fmtBytes = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith("ig.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } },
  };
  const S = window.IG_STRINGS[LANG];

  const SUPABASE_URL = "https://ntbteesmkkjdmxqigfac.supabase.co";
  const SUPABASE_KEY = "sb_publishable_EkQDDqTnly0mO4eshR-l8A_lAsTskUg"; // insert-only by row-level security

  /* ======================= product page ======================= */

  // the opening: the real box, dark, wakes up: its status lights come on one by one, the logo glows, then it speaks.
  // Full sequence on a first visit (about 2 s), a quick flicker afterwards; any tap, key or scroll skips.
  (async function heroBoot() {
    const H = document.documentElement;
    const done = () => { H.classList.remove("booting"); H.classList.add("lit", "booted"); };
    if (!H.classList.contains("booting")) { done(); return; }
    const items = $$("#readout li");
    const fast = store.get("ig.hero", false);
    store.set("ig.hero", true); store.set("ig.booted", true);
    let skip = false;
    const sk = () => { skip = true; };
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"];
    evs.forEach((e) => addEventListener(e, sk, { passive: true, once: true }));
    const pause = (ms) => (skip ? Promise.resolve() : wait(ms));
    await pause(fast ? 80 : 420);
    for (let i = 0; i < items.length; i++) {
      items[i].classList.add("on");
      await pause(fast ? 90 : 360);
    }
    H.classList.add("lit");
    await pause(fast ? 120 : 420);
    done();
    evs.forEach((e) => removeEventListener(e, sk));
  })();

  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$(".rv").forEach((n) => io.observe(n));

  const filmIO = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.dataset.loaded) {
        for (const [ext, type] of [["webm", "video/webm"], ["mp4", "video/mp4"]]) { const s = el("source"); s.src = `assets/film/${v.dataset.film}.${ext}`; s.type = type; v.appendChild(s); }
        v.dataset.loaded = "1"; v.load();
      }
      if (!REDUCED) v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: "200px 0px" });
  $$("video[data-film]").forEach((v) => filmIO.observe(v));

  // reservation form
  const form = $("#reserve-form");
  let tier = store.get("ig.tier", "2tb");
  const val = (id) => ($(id)?.value || "").trim();
  const payload = () => ({
    initiative_slug: "inteligentia",
    email: val("#f-email").toLowerCase(),
    full_name: val("#f-name"),
    answers: { tier, lang: LANG },
    source: `site-${LANG}`,
  });
  function renderPayload() { const p = $("#payload"); if (p) p.textContent = JSON.stringify(payload(), null, 2); }
  function setTier(t) {
    tier = t; store.set("ig.tier", t);
    $$(".tier").forEach((x) => x.setAttribute("aria-checked", String(x.dataset.tier === t)));
    renderPayload();
  }
  $$(".tier").forEach((b) => b.addEventListener("click", () => setTier(b.dataset.tier)));
  if (form) {
    const n = store.get("ig.name", null); if (n) $("#f-name").value = n;
    setTier(tier);
    form.addEventListener("input", renderPayload);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $("#form-msg"); msg.className = "form-msg";
      const p = payload();
      if (!p.full_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) || !$("#f-consent").checked) { msg.textContent = form.dataset.need; msg.classList.add("err"); return; }
      const first = p.full_name.split(/\s+/)[0];
      const done = (text) => { const box = el("div", "done"); box.append(el("p", "d d-m", form.dataset.doneTitle), el("p", "lede", text)); form.replaceWith(box); };
      if (val("#f-web")) { done(form.dataset.ok.replace("{n}", first)); return; } // honeypot
      const btn = $("#f-submit"); btn.disabled = true; msg.textContent = form.dataset.sending;
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/early_access_requests`, {
          method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(p),
        });
        if (r.status !== 201 && r.status !== 409) throw new Error(String(r.status));
        store.set("ig.name", first);
        done((r.status === 201 ? form.dataset.ok : form.dataset.dup).replace("{n}", first));
      } catch {
        msg.textContent = form.dataset.err; msg.classList.add("err"); btn.disabled = false;
      }
    });
  }

  /* ======================= interactive preview ======================= */

  const layer = $("#agent");
  if (!layer) return;
  const log = $("#log");
  const input = $("#say");
  const preview = $("#preview");
  const chipsEl = $("#chips");
  const st = {
    name: store.get("ig.name", null),
    mem: store.get("ig.mem", []),
    seen: new Set(),
    sent: 0,
    provider: "codex",
    expect: null,
    busy: false,
    started: false,
  };
  const waiting = []; // moments requested while busy

  /* open / close */
  let lastFocus = null;
  function openAgent(moment) {
    if (!layer.hidden) { if (moment) run(moment); return; }
    lastFocus = document.activeElement;
    layer.hidden = false;
    document.documentElement.classList.add("agent-open");
    if (location.hash !== "#agent") history.pushState(null, "", "#agent");
    if (!st.started) { st.started = true; opening(moment); }
    else if (moment) run(moment);
    setTimeout(() => (matchMedia("(pointer: coarse)").matches ? $("#agent-close") : input).focus({ preventScroll: true }), 60);
  }
  function closeAgent(toHash) {
    if (layer.hidden) return;
    setRail(false);
    layer.hidden = true;
    document.documentElement.classList.remove("agent-open");
    if (toHash) { history.replaceState(null, "", toHash); $(toHash)?.scrollIntoView(); }
    else if (location.hash === "#agent") history.replaceState(null, "", location.pathname);
    lastFocus?.focus?.({ preventScroll: true });
  }
  $$("[data-open-agent]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); openAgent(b.dataset.moment || null); }));
  $("#agent-close").addEventListener("click", () => closeAgent());
  $$("#agent [data-nav]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); closeAgent(a.getAttribute("href")); }));
  addEventListener("keydown", (e) => { if (e.key !== "Escape" || layer.hidden) return; if (railOpen()) setRail(false); else closeAgent(); });
  addEventListener("popstate", () => { if (location.hash === "#agent") openAgent(); else closeAgent(); });

  /* telemetry + memory */
  function telemetry() {
    $("#exp-bytes").textContent = fmtBytes(st.sent);
    const c = $("#exp-chip"); c.classList.toggle("live", st.sent > 0);
    if (!REDUCED) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
  }
  function remember(k, v) {
    const i = st.mem.findIndex((m) => m.k === k);
    if (i >= 0) st.mem[i].v = v; else st.mem.push({ k, v });
    store.set("ig.mem", st.mem);
    renderMemory();
  }
  function renderMemory() {
    const ol = $("#mem-list"); ol.textContent = "";
    $("#mem-count").textContent = String(st.mem.length);
    $("#mem-toggle b").textContent = String(st.mem.length);
    if (!st.mem.length) { ol.appendChild(el("li", "empty", S.memEmpty)); return; }
    for (const m of st.mem) { const li = el("li"); li.append(el("small", null, m.k), document.createTextNode(m.v)); ol.appendChild(li); }
  }
  $("#mem-forget").addEventListener("click", async () => {
    store.clear(); st.mem = []; st.name = null; renderMemory();
    if (!st.busy) { st.busy = true; await agent(S.forgot); st.busy = false; }
  });
  /* on narrow screens the memory panel floats over the chat: tap outside, ✕, Esc, or any new message closes it */
  const rail = $("#rail"), memToggle = $("#mem-toggle");
  const railOpen = () => rail.classList.contains("open");
  function setRail(open) { rail.classList.toggle("open", open); memToggle.setAttribute("aria-expanded", String(open)); }
  memToggle.addEventListener("click", () => setRail(!railOpen()));
  $("#mem-close").addEventListener("click", () => { setRail(false); memToggle.focus({ preventScroll: true }); });
  layer.addEventListener("pointerdown", (e) => { if (railOpen() && !rail.contains(e.target) && !memToggle.contains(e.target)) setRail(false); });
  renderMemory();

  /* conversation primitives */
  const scroller = $("#agent-scroll");
  const toBottom = () => scroller.scrollTo({ top: scroller.scrollHeight, behavior: REDUCED ? "auto" : "smooth" });
  function rich(text) {
    const f = document.createDocumentFragment();
    text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach((p) => {
      if (/^\*\*.+\*\*$/.test(p)) f.appendChild(el("strong", null, p.slice(2, -2)));
      else if (/^\*.+\*$/.test(p)) f.appendChild(el("em", null, p.slice(1, -1)));
      else if (p) f.appendChild(document.createTextNode(p));
    });
    return f;
  }
  async function typing(ms) {
    if (REDUCED) return;
    const t = el("div", "line agent typing-line"); const d = el("div", "typing"); d.innerHTML = "<i></i><i></i><i></i>";
    const orb = $("#agent-orb"); orb?.classList.add("think");
    t.appendChild(d); log.appendChild(t); toBottom(); await wait(ms); t.remove();
    orb?.classList.remove("think");
  }
  async function agent(text, { big = false, meta = null, pause } = {}) {
    await typing(pause ?? Math.min(900, 250 + text.length * 6));
    const line = el("div", `line agent${big ? " big" : ""}`);
    const t = el("div", "txt"); t.appendChild(rich(text)); line.appendChild(t);
    if (meta) line.appendChild(el("div", "meta", meta));
    log.appendChild(line); toBottom();
    await wait(big ? 350 : 150);
    return line;
  }
  async function card(node, label, right) {
    await typing(380);
    const c = el("div", "card2");
    if (label) { const hd = el("div", "hd"); hd.append(el("span", null, label), el("span", null, right || "")); c.appendChild(hd); }
    c.appendChild(node); log.appendChild(c); toBottom(); await wait(150);
    return c;
  }
  function divider(text) { log.appendChild(el("div", "gap", text)); toBottom(); }

  /* the filter */
  const DETECT = [
    ["IBAN", /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g],
    ["EMAIL", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
    ["ID", /\b[1-8]\d{12}\b/g],
    ["CARD", /\b(?:\d{4}[ -]?){3}\d{4}\b/g],
    ["PHONE", /(?:\+|\b0)\d[\d\s().-]{7,}\d\b/g],
    ["ADDRESS", /\b(?:Str\.|Strada|Bd\.|Bulevardul|Calea|Aleea|Street|St\.|Avenue|Ave\.|Road|Rd\.)\s+[A-ZĂÂÎȘȚ][\wăâîșțĂÂÎȘȚ-]+(?:\s+[A-ZĂÂÎȘȚ][\wăâîșț-]+)*,?\s*(?:nr\.?\s*)?\d+[A-Za-z]?/g],
    ["PERSON", /\b(?:Dr\.?\s+|Mr\.?\s+|Mrs\.?\s+|Ms\.?\s+|dl\.?\s+|dna\.?\s+)?[A-ZĂÂÎȘȚ][a-zăâîșț]+(?:[ -][A-ZĂÂÎȘȚ][a-zăâîșț]+)+\b/g],
  ];
  const NOT_PEOPLE = /^(OpenAI|Open Router|OpenRouter|Claude|Grok|Meta|Google|Microsoft|Apple|Jetson|Nvidia|NVIDIA|New York|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Compare|Write|Draft|Scrie|Compară|Where|Unde|Mention|My |Is |Can |Please|Hi |Hello|Bună)/;
  const CLOUD = /\b(draft|write|compare|analy[sz]e|plan|translate|explain|summari[sz]e|reply|email|code|rewrite|negotiate|calculate|scrie|compară|redactează|analizează|explică|traduce|rezumă|răspuns|planifică|calculează)\b/i;
  function analyse(text) {
    const marks = [];
    for (const [kind, re] of DETECT) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(text))) {
        const v = m[0].trim();
        if (kind === "PERSON" && (NOT_PEOPLE.test(v) || (m.index === 0 && !/^(Dr|Mr|Mrs|Ms|dl|dna)\b/.test(v)))) continue;
        const s = m.index, e = s + m[0].length;
        if (marks.some((k) => s < k.e && e > k.s)) continue;
        marks.push({ kind, s, e, v });
      }
    }
    marks.sort((a, b) => a.s - b.s);
    const count = {}; const map = []; const parts = []; let last = 0;
    for (const m of marks) {
      count[m.kind] = (count[m.kind] || 0) + 1;
      const tok = `[${m.kind}_${count[m.kind]}]`;
      parts.push({ t: text.slice(last, m.s) }, { t: m.v, tok }); map.push([tok, m.v]); last = m.e;
    }
    parts.push({ t: text.slice(last) });
    return { parts, map, redacted: parts.map((p) => p.tok || p.t).join(""), cloud: CLOUD.test(text) || text.length > 140 };
  }
  function redactedNode(a) {
    const f = document.createDocumentFragment();
    for (const p of a.parts) { if (p.tok) f.appendChild(el("span", "red", p.tok)); else if (p.t) f.appendChild(document.createTextNode(p.t)); }
    return f;
  }
  const providerName = () => S.brains[st.provider];
  input.addEventListener("input", () => {
    const v = input.value.trim(); preview.textContent = "";
    if (!v || st.expect?.kind === "name") { preview.classList.remove("on"); return; }
    const a = analyse(v);
    if (!a.cloud) { preview.classList.remove("on"); return; }
    preview.classList.add("on");
    preview.append(el("span", "k", S.previewCloud(providerName())), redactedNode(a));
  });

  /* the visitor's message */
  async function me(text, { scripted = false, plain = false } = {}) {
    const line = el("div", "line me"); const b = el("div", "bubble");
    const a = plain ? { parts: [{ t: text }], map: [], redacted: text, cloud: false } : analyse(text);
    const spans = [];
    for (const p of a.parts) {
      if (p.tok) { const s = el("span", "pii", p.t); s.dataset.tok = p.tok; spans.push(s); b.appendChild(s); }
      else if (p.t) b.appendChild(document.createTextNode(p.t));
    }
    line.appendChild(b); log.appendChild(line); toBottom();
    if (plain || scripted) return a;
    if (!a.cloud) { line.appendChild(el("div", "meta", S.atHome)); return a; }
    await wait(300);
    for (const s of spans) { s.textContent = s.dataset.tok; s.classList.add("stamped"); await wait(140); }
    line.appendChild(el("div", "meta", `${S.filtered(a.map.length)} · ↗ ${providerName()}`));
    const out = el("div", "outbound");
    out.append(el("span", "k", S.cloudSees(fmtBytes(utf8(a.redacted)))), redactedNode(a));
    line.appendChild(out);
    st.sent += utf8(a.redacted); telemetry(); toBottom();
    return a;
  }

  /* chips */
  const ORDER = ["remember", "find", "continue", "telegram", "import", "trick", "diff", "hardware", "reserve"];
  function chips(list) {
    chipsEl.textContent = "";
    for (const id of list) {
      const b = el("button", id === "reserve" ? "hot" : "", S.chips[id]); b.type = "button";
      b.addEventListener("click", () => run(id));
      chipsEl.appendChild(b);
    }
  }
  function nextChips() {
    if (st.expect) return;
    const list = ORDER.filter((t) => !st.seen.has(t) && t !== "reserve").slice(0, 4);
    list.push("reserve");
    if (st.mem.length) list.push("memory");
    chips(list);
  }

  /* topics */
  const TOPIC = {
    async remember() {
      await me(S.m1q1, { scripted: true });
      for (const [k, v] of S.m1mem) remember(k, v);
      await agent(S.m1a1);
      divider(S.m1gap);
      await wait(300);
      await me(S.m1q2, { scripted: true });
      await agent(S.m1a2, { meta: S.m1tag });
    },
    async find() {
      await me(S.m2q, { scripted: true });
      await agent(S.m2a, { meta: S.m2tag });
      const q = el("div", "cite"); q.append(el("p", "file", S.m2file), el("blockquote", null, S.m2quote));
      await card(q, null);
      await agent(S.m2after);
    },
    async continue() {
      st.provider = "codex";
      await me(S.m3q1, { scripted: true });
      await agent(S.m3a1, { meta: S.brainLabel(S.brains.codex) });
      divider(S.m3switch(S.brains.codex, S.brains.openrouter));
      st.provider = "openrouter";
      await wait(250);
      await me(S.m3q2, { scripted: true });
      await agent(S.m3a2, { meta: `${S.brainLabel(S.brains.openrouter)} · ${S.m3tag}` });
      await agent(S.m3try);
      await card(switcher(), S.switchLabel);
    },
    async telegram() { await me(S.chips.telegram, { scripted: true }); await agent(S.telegram1, { big: true }); await agent(S.telegram2); },
    async import() {
      await me(S.chips.import, { scripted: true });
      await agent(S.import1, { big: true }); await agent(S.import2);
      const tb = el("table", "spec");
      for (const [k, v] of S.importRows) { const tr = tb.insertRow(); tr.appendChild(el("th", null, k)); tr.insertCell().textContent = v; }
      await card(tb, S.importLabel);
    },
    async trick() {
      await me(S.chips.trick, { scripted: true });
      await agent(S.trick1); await agent(S.trick2);
      st.expect = { kind: "trick" }; input.placeholder = S.trickPlaceholder;
      chips([]);
      const b = el("button", "", S.trickExample); b.type = "button";
      b.addEventListener("click", () => { input.value = S.trickExampleText; input.dispatchEvent(new Event("input")); input.focus(); });
      chipsEl.appendChild(b);
    },
    async diff() {
      await me(S.chips.diff, { scripted: true });
      await agent(S.diff1, { big: true }); await agent(S.diff2);
      const r = el("div", "receipt");
      r.append(el("h3", null, S.rcptTitle), el("p", "sub", S.rcptSub));
      const tb = el("table"); const th = tb.createTHead().insertRow(); S.rcptHead.forEach((h) => th.appendChild(el("th", null, h)));
      const body = tb.createTBody();
      for (const row of S.rcptRows) { const tr = body.insertRow(); tr.className = "row in" + (row.us ? " us" : ""); row.c.forEach((c, i) => { const td = tr.insertCell(); td.textContent = c; if (!row.us && i === 3) td.className = "x"; }); }
      r.appendChild(tb);
      const n = el("p", "note", S.rcptNote + " "); const a = el("a", null, S.sources); a.href = S.pages.security + "#sources"; n.appendChild(a); r.appendChild(n);
      await card(r, null); await agent(S.diff3);
    },
    async hardware() {
      await me(S.chips.hardware, { scripted: true });
      await agent(S.hardware1);
      await card($("#tpl-hardware").content.cloneNode(true), null);
      linkOut("#hardware", S.hardwareCta);
    },
    async reserve() {
      await me(S.chips.reserve, { scripted: true });
      await agent(S.reserve1);
      linkOut("#reserve", S.reserveCta, true);
    },
    async memory() {
      await me(S.chips.memory, { scripted: true });
      await agent(S.memory1(st.mem.length)); await agent(S.memory2);
      if (matchMedia("(max-width: 1100px)").matches) setRail(true);
    },
  };
  function linkOut(hash, label, primary) {
    const b = el("a", `btn${primary ? " primary" : ""}`, label + " →"); b.href = hash;
    b.addEventListener("click", (e) => { e.preventDefault(); closeAgent(hash); });
    const w = el("div", "actions"); w.appendChild(b); log.appendChild(w); toBottom();
  }
  function switcher() {
    const wrap = el("div", "switcher");
    const carts = el("div", "carts2"); const mind = el("div", "mind2");
    const r1 = el("div", "row"); const brain = el("span", "brain", providerName()); r1.append(el("span", null, S.brainOnLoan), brain);
    const ans = el("div", "a", S.answers[st.provider] || S.answers.codex);
    mind.append(r1, el("div", "q", S.q), ans);
    for (const p of ["codex", "openrouter", "next"]) {
      const c = el("button", "cart"); c.type = "button"; c.setAttribute("aria-pressed", String(p === st.provider));
      c.append(document.createTextNode(S.brains[p]), el("small", null, S.brainSub[p]));
      c.addEventListener("click", () => {
        st.provider = p;
        carts.querySelectorAll(".cart").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
        brain.textContent = S.brains[p]; brain.classList.remove("swap"); void brain.offsetWidth; brain.classList.add("swap");
        let i = 0; const t = S.answers[p]; clearInterval(ans._t);
        if (REDUCED) ans.textContent = t; else { ans.textContent = ""; ans._t = setInterval(() => { ans.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(ans._t); }, 12); }
      });
      carts.appendChild(c);
    }
    wrap.append(carts, mind);
    return wrap;
  }

  async function run(id) {
    if (!TOPIC[id]) return;
    if (st.busy) { if (!waiting.includes(id)) waiting.push(id); return; }
    if (st.expect?.kind === "name") { st.expect = null; input.placeholder = S.placeholder; }
    st.busy = true; chips([]);
    try { st.seen.add(id); await TOPIC[id](); }
    finally {
      st.busy = false;
      const nx = waiting.shift();
      if (nx) run(nx); else if (!st.expect) nextChips();
    }
  }

  /* free text */
  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || st.busy) return;
    input.value = ""; preview.classList.remove("on"); preview.textContent = "";
    const ex = st.expect;
    st.busy = true;
    let next = null;
    try {
      if (ex?.kind === "name") {
        await me(text, { plain: true });
        const name = text.replace(/^(i'?m|i am|my name is|call me|sunt|mă numesc|numele meu e|spune-mi)\s+/i, "").split(/[\s,.!]+/)[0].slice(0, 40);
        const nice = name.charAt(0).toUpperCase() + name.slice(1);
        st.name = nice; store.set("ig.name", nice); remember(S.memK.name, nice);
        const fn = $("#f-name"); if (fn && !fn.value) { fn.value = nice; renderPayload(); }
        st.expect = null; input.placeholder = S.placeholder;
        await agent(S.nameSaved(nice));
        await agent(S.start);
      } else if (ex?.kind === "trick") {
        st.expect = null; input.placeholder = S.placeholder;
        const a = await me(text);
        if (!a.cloud) await agent(S.trickHome);
        else {
          await agent(a.map.length ? S.trickOut(a.map.length, fmtBytes(utf8(a.redacted)), providerName()) : S.trickOutClean(providerName()));
          if (a.map.length) {
            const tb = el("table", "spec");
            for (const [tok, v] of a.map) { const tr = tb.insertRow(); tr.appendChild(el("th", null, tok)); tr.insertCell().textContent = v; }
            await card(tb, S.staysHome);
          }
        }
        await agent(S.trickAfter);
      } else {
        let id = null;
        for (const [k, re] of S.intents) if (re.test(text)) { id = k; break; }
        if (id === "remember") {
          await me(text, { scripted: true });
          remember(S.memK.fact, text.replace(S.rememberStrip, "").trim().slice(0, 120) || text.slice(0, 120));
          await agent(S.remembered);
        } else if (id) {
          next = id === "memoryq" ? "memory" : id;
        } else {
          const a = await me(text);
          if (a.cloud) await agent(a.map.length ? S.unknownCloud(a.map.length, providerName()) : S.unknownCloudClean(providerName()));
          else await agent(S.unknownHome);
        }
      }
    } finally {
      st.busy = false;
      if (next) run(next); else if (!st.expect) nextChips();
    }
  });

  /* boot (first time only, short, skippable) + opening */
  async function boot() {
    const b = $("#boot");
    if (REDUCED || store.get("ig.booted", false)) return;
    store.set("ig.booted", true);
    b.hidden = false;
    const pre = $("#boot-log"); let skip = false;
    b.addEventListener("click", () => { skip = true; }, { once: true });
    for (const [label, v] of S.boot) {
      if (skip) break;
      pre.appendChild(el("div", null, `> ${label.padEnd(10, ".")} ${v}`));
      await wait(150);
    }
    if (!skip) await wait(250);
    b.classList.add("gone"); await wait(350); b.hidden = true;
  }

  async function opening(moment) {
    st.busy = true;
    input.placeholder = S.placeholder;
    await boot();
    const returning = !!st.name || st.mem.length > 0;
    if (returning) {
      await agent(S.welcomeBack(st.name), { big: true, pause: 200 });
      await agent(S.welcomeBack2(st.mem.length));
      await agent(S.disclaimer);
      st.busy = false;
      if (moment) run(moment); else nextChips();
      return;
    }
    await agent(S.hello, { big: true, pause: 200 });
    await agent(S.disclaimer);
    if (moment) { st.busy = false; run(moment); return; }
    await agent(S.askName);
    st.expect = { kind: "name" }; input.placeholder = S.namePlaceholder;
    st.busy = false;
    chips([]);
    const rather = el("button", "equal", S.rather); rather.type = "button";
    rather.addEventListener("click", async () => {
      if (st.busy) return;
      st.busy = true; st.expect = null; input.placeholder = S.placeholder;
      await me(S.rather, { plain: true });
      await agent(S.ratherReply);
      await agent(S.start);
      st.busy = false; nextChips();
    });
    chipsEl.appendChild(rather);
    for (const id of ["remember", "find", "continue"]) {
      const b = el("button", "", S.chips[id]); b.type = "button"; b.addEventListener("click", () => run(id)); chipsEl.appendChild(b);
    }
  }

  if (location.hash === "#agent") openAgent();
})();
