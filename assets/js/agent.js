/* inteligentia · the website is the agent.
   A scripted, browser-only demo of a personal agent. Memory lives in this browser's
   localStorage. The only network request is the reservation, and the visitor sees the
   exact packet before it is sent. */
(() => {
  "use strict";

  const LANG = (document.documentElement.lang || "en").slice(0, 2) === "ro" ? "ro" : "en";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? 0 : ms));
  const utf8 = (s) => new TextEncoder().encode(s).length;
  const fmtBytes = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith("ig.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } },
  };

  const SUPABASE_URL = "https://ntbteesmkkjdmxqigfac.supabase.co";
  const SUPABASE_KEY = "sb_publishable_EkQDDqTnly0mO4eshR-l8A_lAsTskUg"; // insert-only by row-level security
  const S = window.IG_STRINGS[LANG];

  /* ---------------- state ---------------- */
  const st = {
    name: store.get("ig.name", null),
    tier: store.get("ig.tier", null),
    mem: store.get("ig.mem", []),          // [{k, v}]
    seen: new Set(),
    sent: 0, kept: 48 * 1024,
    provider: "codex",
    expect: null,                           // handler for the next free-text answer
    reserved: store.get("ig.reserved", false),
    busy: false,
    oneMore: false,
  };
  const returning = !!st.name || st.mem.length > 0;

  /* ---------------- top bar: clock + exposure ---------------- */
  const clock = $("#clock");
  const tick = () => { const d = new Date(); if (clock) clock.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  tick(); setInterval(tick, 15000);
  function exposure(bump) {
    $("#exp-bytes").textContent = fmtBytes(st.sent);
    const c = $("#exp-chip");
    c.classList.toggle("live", st.sent > 0);
    if (bump && !REDUCED) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
  }

  /* ---------------- memory rail ---------------- */
  function remember(k, v) {
    const i = st.mem.findIndex((m) => m.k === k);
    if (i >= 0) st.mem[i].v = v; else st.mem.push({ k, v });
    store.set("ig.mem", st.mem);
    st.kept += utf8(k + v);
    renderMemory();
  }
  function renderMemory() {
    const ol = $("#mem-list"); ol.textContent = "";
    $("#mem-count").textContent = String(st.mem.length);
    $("#mem-toggle b").textContent = String(st.mem.length);
    if (!st.mem.length) { ol.appendChild(el("li", "empty", S.memEmpty)).style.borderLeft = "0"; return; }
    for (const m of st.mem) { const li = el("li"); li.append(el("small", null, m.k), document.createTextNode(m.v)); ol.appendChild(li); }
  }
  $("#mem-forget").addEventListener("click", () => {
    store.clear(); st.mem = []; st.name = null; st.tier = null; st.reserved = false;
    renderMemory();
    agent(S.forgot);
  });
  $("#mem-toggle").addEventListener("click", () => {
    const r = $("#rail"); const open = !r.classList.contains("open");
    r.classList.toggle("open", open); $("#mem-toggle").setAttribute("aria-expanded", String(open));
  });

  /* ---------------- conversation primitives ---------------- */
  const log = $("#log");
  const toBottom = () => { if (!REDUCED) scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); else scrollTo(0, document.body.scrollHeight); };

  function rich(text) { // **bold** and *blue* only; everything else is text
    const frag = document.createDocumentFragment();
    text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach((p) => {
      if (/^\*\*.+\*\*$/.test(p)) frag.appendChild(el("strong", null, p.slice(2, -2)));
      else if (/^\*.+\*$/.test(p)) frag.appendChild(el("em", null, p.slice(1, -1)));
      else if (p) frag.appendChild(document.createTextNode(p));
    });
    return frag;
  }
  async function typing(ms) {
    if (REDUCED) return;
    const t = el("div", "line agent typing-line");
    const d = el("div", "typing"); d.innerHTML = "<i></i><i></i><i></i>";
    t.appendChild(d); log.appendChild(t); toBottom();
    await wait(ms); t.remove();
  }
  async function agent(text, { big = false, ink = false, pause } = {}) {
    await typing(pause ?? Math.min(1100, 300 + text.length * 9));
    const line = el("div", `line agent${big ? " big" : ""}${ink ? " ink" : ""}`);
    if (!big) line.appendChild(el("span", "who", S.agentLabel));
    const t = el("div", "txt"); t.appendChild(rich(text)); line.appendChild(t);
    if (big && !REDUCED) line.classList.add("stamp", "in");
    log.appendChild(line); toBottom();
    await wait(big ? 500 : 180);
    return line;
  }
  async function card(node, label, opts = {}) {
    await typing(opts.pause ?? 500);
    const c = el("div", `card2 ${opts.cls || ""}`);
    if (label) { const hd = el("div", "hd"); hd.append(el("span", null, label), el("span", null, opts.right || S.onDevice)); c.appendChild(hd); }
    const bd = el("div", opts.flush ? "" : "bd"); bd.appendChild(node); c.appendChild(bd);
    log.appendChild(c); toBottom();
    await wait(200);
    return c;
  }
  function film(name, alt) {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !REDUCED; v.setAttribute("aria-label", alt);
    const tall = name === "ig-hero" && matchMedia("(max-width: 760px)").matches;
    const n = tall ? "ig-hero-tall" : name;
    v.poster = `assets/film/${n}.jpg`;
    if (tall) v.style.aspectRatio = "4/5";
    for (const [ext, type] of [["webm", "video/webm"], ["mp4", "video/mp4"]]) { const s = el("source"); s.src = `assets/film/${n}.${ext}`; s.type = type; v.appendChild(s); }
    return v;
  }

  /* ---------------- the filter (runs on everything the visitor types) ---------------- */
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
        if (kind === "PERSON" && NOT_PEOPLE.test(v)) continue;
        if (kind === "PERSON" && m.index === 0 && !/^(Dr|Mr|Mrs|Ms|dl|dna)\b/.test(v)) continue;
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
      parts.push({ t: text.slice(last, m.s) }, { t: m.v, tok });
      map.push([tok, m.v]); last = m.e;
    }
    parts.push({ t: text.slice(last) });
    const redacted = parts.map((p) => p.tok || p.t).join("");
    const cloud = CLOUD.test(text) || text.length > 140;
    return { parts, map, redacted, cloud };
  }

  function redactedNode(a) {
    const f = document.createDocumentFragment();
    for (const p of a.parts) {
      if (p.tok) f.appendChild(el("span", "red", p.tok)); else if (p.t) f.appendChild(document.createTextNode(p.t));
    }
    return f;
  }

  // live preview above the input
  const input = $("#say"), preview = $("#preview");
  input.addEventListener("input", () => {
    const v = input.value.trim();
    preview.textContent = "";
    if (!v || st.expect?.kind === "email" || st.expect?.kind === "name") { preview.classList.remove("on"); return; }
    const a = analyse(v);
    if (!a.map.length && !a.cloud) { preview.classList.remove("on"); return; }
    preview.classList.add("on");
    if (a.cloud) { preview.append(el("span", "k", S.previewCloud(providerName()))); preview.appendChild(redactedNode(a)); }
    else { preview.append(el("span", "k", S.previewHome)); preview.append(el("span", "home", S.previewHomeText(a.map.length))); }
  });

  function providerName() { return S.brains[st.provider]; }

  /* render the visitor's message, stamp PII, show routing */
  async function me(text, { scripted = false, raw = false } = {}) {
    const line = el("div", "line me");
    const b = el("div", "bubble");
    const a = raw ? { parts: [{ t: text }], map: [], redacted: text, cloud: false } : analyse(text);
    const spans = [];
    for (const p of a.parts) {
      if (p.tok) { const s = el("span", "pii", p.t); s.dataset.tok = p.tok; spans.push(s); b.appendChild(s); }
      else if (p.t) b.appendChild(document.createTextNode(p.t));
    }
    line.appendChild(b);
    const route = el("div", "route");
    line.appendChild(route);
    log.appendChild(line); toBottom();
    st.kept += utf8(text) * 4;

    if (raw) { route.appendChild(el("span", "tag filter", S.heldUntilSend)); return a; }
    if (scripted || !a.cloud) {
      route.appendChild(el("span", "tag local", S.atHome));
      return a;
    }
    await wait(350);
    for (const s of spans) { s.textContent = s.dataset.tok; s.classList.add("stamped"); await wait(160); }
    route.append(el("span", "tag filter", S.filtered(a.map.length)), el("span", "tag cloud", `↗ ${providerName()}`));
    const out = el("div", "outbound");
    out.append(el("span", "k", S.cloudSees(fmtBytes(utf8(a.redacted)))), redactedNode(a));
    line.appendChild(out);
    st.sent += utf8(a.redacted);
    exposure(true);
    toBottom();
    return a;
  }

  /* ---------------- chips ---------------- */
  const chipsEl = $("#chips");
  const TOPICS = ["telegram", "import", "trick", "diff", "box", "switch", "leaves", "price", "reserve"];
  function chips(list) {
    chipsEl.textContent = "";
    for (const id of list) {
      const b = el("button", id === "reserve" ? "hot" : "", S.chips[id]);
      b.type = "button";
      b.addEventListener("click", () => run(id, S.chips[id]));
      chipsEl.appendChild(b);
    }
  }
  function nextChips() {
    if (st.expect) return;
    const left = TOPICS.filter((t) => !st.seen.has(t) && !(t === "reserve" && st.reserved));
    const list = left.slice(0, 4);
    if (!list.includes("reserve") && !st.reserved) list.push("reserve");
    if (st.mem.length) list.push("memory");
    chips(list);
  }

  /* ---------------- topics ---------------- */
  const TOPIC = {
    async import() {
      await agent(S.import1, { big: true });
      await agent(S.import2);
      const tb = el("table", "spec");
      for (const [k, v] of S.importRows) { const tr = tb.insertRow(); tr.appendChild(el("th", null, k)); tr.insertCell().textContent = v; }
      await card(tb, S.importLabel, { flush: true, right: S.importDone });
      await agent(S.import3);
    },
    async telegram() {
      await agent(S.telegram1, { big: true });
      await agent(S.telegram2);
      await agent(S.telegram3);
    },
    async diff() {
      await agent(S.diff1, { big: true });
      await agent(S.diff2);
      const r = el("div", "receipt");
      r.append(el("h3", null, S.rcptTitle), el("p", "sub", S.rcptSub));
      const tb = el("table");
      const th = tb.createTHead().insertRow(); S.rcptHead.forEach((h) => th.appendChild(el("th", null, h)));
      const body = tb.createTBody();
      for (const row of S.rcptRows) {
        const tr = body.insertRow(); tr.className = "row" + (row.us ? " us" : "");
        row.c.forEach((c, i) => { const td = tr.insertCell(); td.textContent = c; if (!row.us && i === 3) td.className = "x"; });
      }
      r.appendChild(tb);
      const n = el("p", "note", S.rcptNote + " ");
      const a = el("a", null, S.sources); a.href = S.pages.security + "#sources"; n.appendChild(a);
      r.appendChild(n);
      await card(r, null, { flush: true });
      await agent(S.diff3);
    },
    async trick() {
      await agent(S.trick1);
      await card(film("ig-route", S.altRoute), S.filmRoute, { cls: "film-card", flush: true, right: "▶ 0:12" });
      await agent(S.trick2);
      st.expect = { kind: "trick" };
      input.placeholder = S.trickPlaceholder;
      chips([]);
      const b = el("button", "", S.trickExample); b.type = "button";
      b.addEventListener("click", () => { input.value = S.trickExampleText; input.dispatchEvent(new Event("input")); input.focus(); });
      chipsEl.appendChild(b);
      input.focus({ preventScroll: true });
    },
    async box() {
      await agent(S.box1, { big: true, ink: true, pause: 900 });
      const wrap = el("div", "box-reveal");
      const img = el("img"); img.src = "assets/img/box.jpg"; img.alt = S.altBox; img.loading = "lazy";
      const ul = el("ul");
      for (const [k, v] of S.specs) { const li = el("li"); li.append(el("b", null, k), document.createTextNode(v)); ul.appendChild(li); }
      wrap.append(img, ul);
      await card(wrap, S.boxLabel, { flush: true, right: "inteligentia" });
      await agent(S.box2);
    },
    async switch() {
      await agent(S.switch1);
      const wrap = el("div");
      const carts = el("div", "carts2");
      const mind = el("div", "mind2");
      const r1 = el("div", "row"); const brain = el("span", "brain", providerName()); r1.append(el("span", null, S.brainOnLoan), brain);
      const r2 = el("div", "row"); r2.append(el("span", null, S.q), el("span", null, ""));
      const ans = el("div", "a", S.answers[st.provider]);
      const r3 = el("div", "row"); const kept = el("span", null, S.memKept(st.mem.length + 14203)); r3.append(kept, el("span", null, S.chatsKept));
      mind.append(r1, r2, ans, r3);
      for (const p of ["codex", "openrouter", "next"]) {
        const c = el("button", "cart"); c.type = "button"; c.setAttribute("aria-pressed", String(p === st.provider));
        c.append(document.createTextNode(S.brains[p]), el("small", null, S.brainSub[p]));
        c.addEventListener("click", () => {
          st.provider = p;
          carts.querySelectorAll(".cart").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
          brain.textContent = S.brains[p]; brain.classList.remove("swap"); void brain.offsetWidth; brain.classList.add("swap");
          let i = 0; const t = S.answers[p]; clearInterval(ans._t);
          if (REDUCED) ans.textContent = t; else { ans.textContent = ""; ans._t = setInterval(() => { ans.textContent = t.slice(0, ++i); if (i >= t.length) clearInterval(ans._t); }, 12); }
          remember(S.memK.brain, S.brains[p]);
        });
        carts.appendChild(c);
      }
      wrap.append(carts, mind);
      await card(wrap, S.switchLabel);
      await card(film("ig-switch", S.altSwitch), S.filmSwitch, { cls: "film-card", flush: true, right: "▶ 0:08" });
      await agent(S.switch2);
    },
    async leaves() {
      await agent(S.leaves1, { big: true });
      const f = el("div", "flow2");
      S.flow.forEach(([h, p], i) => { const d = el("div"); d.append(el("span", "num", String(i + 1).padStart(2, "0")), el("b", null, h), document.createTextNode(p)); f.appendChild(d); });
      await card(f, S.flowLabel, { flush: true });
      await agent(S.leaves2);
      const a = el("a", "chip", S.finePrint + " →"); a.href = S.pages.security;
      const wrap = el("div", "actions"); wrap.appendChild(a);
      log.appendChild(wrap);
    },
    async price() {
      if (!st.oneMore) await oneMoreThing(); else await tiers();
    },
    async reserve() { await reserveFlow(); },
    async memory() {
      await agent(S.memory1(st.mem.length));
      await agent(S.memory2);
      if (matchMedia("(max-width: 1100px)").matches) { $("#rail").classList.add("open"); $("#mem-toggle").setAttribute("aria-expanded", "true"); }
    },
    async who() {
      await agent(S.who1);
      const wrap = el("div", "actions");
      for (const [t, h] of [[S.finePrint, S.pages.security], [S.proofLink, S.pages.proof], [S.investorsLink, S.pages.investors]]) { const a = el("a", "chip", t + " →"); a.href = h; wrap.appendChild(a); }
      log.appendChild(wrap); toBottom();
    },
  };

  async function oneMoreThing() {
    st.oneMore = true; st.seen.add("price");
    await agent(S.omt1, { big: true, ink: true, pause: 1200 });
    await agent(S.omt2);
    await tiers();
  }
  async function tiers() {
    const wrap = el("div", "tiers2");
    for (const t of ["1tb", "2tb"]) {
      const b = el("button", "tier2"); b.type = "button"; b.setAttribute("aria-pressed", String(st.tier === t));
      if (t === "2tb") b.appendChild(el("span", "tag filter ribbon", S.ribbon));
      const price = el("div", "price"); price.append(el("small", null, S.cur), document.createTextNode(S.prices[t]));
      b.append(el("span", "cap", S.tierCap[t]), price, el("p", null, S.tierText[t]));
      b.addEventListener("click", async () => {
        wrap.querySelectorAll(".tier2").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        st.tier = t; store.set("ig.tier", t); remember(S.memK.tier, S.tierCap[t]);
        if (!st.reserved && !st.expect) { await agent(S.tierPicked(S.tierCap[t])); chips(["reserve", ...TOPICS.filter((x) => !st.seen.has(x) && x !== "reserve" && x !== "price").slice(0, 3)]); }
      });
      wrap.appendChild(b);
    }
    await typing(400);
    log.appendChild(wrap); toBottom();
    await agent(S.priceNote);
  }

  /* ---------------- reservation ---------------- */
  async function reserveFlow() {
    if (st.reserved) { await agent(S.already(st.name || "")); return; }
    if (!st.name) { await agent(S.askNameFirst); st.expect = { kind: "name", then: reserveFlow }; input.placeholder = S.namePlaceholder; chips([]); return; }
    await agent(S.reserve1(st.name));
    st.expect = { kind: "email" }; input.type = "email"; input.placeholder = S.emailPlaceholder; input.autocomplete = "email";
    chips([]);
  }
  async function packet(email) {
    if (!st.tier) { st.tier = "2tb"; }
    const payload = {
      initiative_slug: "inteligentia",
      email: email.toLowerCase(),
      full_name: st.name,
      answers: { tier: st.tier, lang: LANG, topics: [...st.seen].slice(0, 8) },
      source: `site-${LANG}`,
    };
    await agent(S.packet1);
    const wrap = el("div", "packet");
    const pre = el("pre", null, JSON.stringify(payload, null, 2));
    const side = el("div", "side");
    const lab = el("label", "check"); const cb = el("input"); cb.type = "checkbox"; lab.append(cb, el("span", null, S.consent));
    const tierRow = el("div", "actions");
    for (const t of ["1tb", "2tb"]) {
      const b = el("button", "chip", S.tierCap[t]); b.type = "button"; if (t === st.tier) b.style.background = "var(--signal)";
      b.addEventListener("click", () => { st.tier = t; payload.answers.tier = t; pre.textContent = JSON.stringify(payload, null, 2); tierRow.querySelectorAll("button").forEach((x) => (x.style.background = x === b ? "var(--signal)" : "")); });
      tierRow.appendChild(b);
    }
    const send = el("button", "btn primary", S.sendIt); send.type = "button";
    const msg = el("p", "fine", S.dest);
    side.append(tierRow, lab, send, msg);
    wrap.append(pre, side);
    const c = await card(wrap, S.packetLabel, { flush: true, right: `${utf8(JSON.stringify(payload))} B` });
    send.addEventListener("click", async () => {
      if (!cb.checked) { msg.textContent = S.needConsent; msg.style.color = "var(--alarm)"; return; }
      send.disabled = true; msg.textContent = S.sending; msg.style.color = "";
      const body = JSON.stringify(payload);
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/early_access_requests`, {
          method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body,
        });
        if (r.status !== 201 && r.status !== 409) throw new Error(String(r.status));
        st.sent += utf8(body); exposure(true);
        st.reserved = true; store.set("ig.reserved", true); remember(S.memK.reserved, S.memV.reserved(S.tierCap[st.tier]));
        c.querySelector(".hd span:last-child").textContent = S.sentTag;
        send.remove(); msg.textContent = S.dest;
        await agent(r.status === 201 ? S.done1(st.name) : S.already(st.name), { big: r.status === 201 });
        if (r.status === 201) {
          await agent(S.done2);
          await card(film("ig-night", S.altNight), S.filmNight, { cls: "film-card", flush: true, right: "23:00" });
        }
        nextChips();
      } catch {
        send.disabled = false; msg.textContent = S.err; msg.style.color = "var(--alarm)";
      }
    });
  }

  /* ---------------- intent from free text ---------------- */
  function intent(t) {
    for (const [id, re] of S.intents) if (re.test(t)) return id;
    return null;
  }

  async function run(id, label) {
    if (st.busy) return;
    st.busy = true; chips([]);
    try {
      await me(label, { scripted: true });
      st.seen.add(id);
      if (id !== "memory" && id !== "reserve" && id !== "who") remember(S.memK.curious, [...st.seen].filter((x) => S.chips[x] && x !== "memory").map((x) => S.topicNames[x]).join(", "));
      await TOPIC[id]();
      if (!st.oneMore && st.seen.size >= 3 && id !== "price" && id !== "reserve" && !st.reserved) await oneMoreThing();
    } finally {
      st.busy = false;
      if (!st.expect) nextChips();
    }
  }

  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || st.busy) return;
    input.value = ""; preview.classList.remove("on"); preview.textContent = "";
    const ex = st.expect;
    st.busy = true;
    try {
      if (ex?.kind === "name") {
        await me(text, { scripted: true });
        const name = text.replace(/^(i'?m|i am|my name is|call me|sunt|mă numesc|numele meu e|spune-mi)\s+/i, "").split(/[\s,.!]+/)[0].slice(0, 40);
        const nice = name.charAt(0).toUpperCase() + name.slice(1);
        st.name = nice; store.set("ig.name", nice); remember(S.memK.name, nice);
        st.expect = null; input.placeholder = S.placeholder;
        await agent(S.nameSaved(nice));
        if (ex.then) { st.busy = false; await ex.then(); return; }
        await agent(S.afterName);
      } else if (ex?.kind === "email") {
        await me(text, { raw: true });
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) { await agent(S.badEmail); return; }
        st.expect = null; input.type = "text"; input.placeholder = S.placeholder; input.autocomplete = "off";
        await packet(text);
      } else if (ex?.kind === "trick") {
        st.expect = null; input.placeholder = S.placeholder;
        const a = await me(text);
        st.seen.add("trick");
        if (!a.cloud) await agent(a.map.length ? S.trickHomeMasked(a.map.length) : S.trickHome);
        else {
          await agent(a.map.length ? S.trickOut(a.map.length, fmtBytes(utf8(a.redacted)), providerName()) : S.trickOutClean(providerName()));
          if (a.map.length) {
            const tb = el("table", "spec");
            for (const [tok, v] of a.map) { const tr = tb.insertRow(); tr.appendChild(el("th", null, tok)); tr.insertCell().textContent = v; }
            await card(tb, S.staysHome, { flush: true });
          }
        }
        await agent(S.trickAfter);
      } else {
        const id = intent(text);
        if (id === "remember") {
          await me(text, { scripted: true });
          const fact = text.replace(S.rememberStrip, "").trim().slice(0, 120);
          remember(S.memK.fact, fact || text.slice(0, 120));
          await agent(S.remembered);
        } else if (id) {
          await me(text, { scripted: true });
          st.seen.add(id);
          st.busy = false;
          st.busy = true;
          await TOPIC[id]();
        } else {
          const a = await me(text);
          if (a.cloud) await agent(a.map.length ? S.unknownCloud(a.map.length, providerName()) : S.unknownCloudClean(providerName()));
          else await agent(S.unknownHome);
        }
      }
    } finally {
      st.busy = false;
      if (!st.expect) nextChips();
    }
  });

  /* ---------------- boot + opening ---------------- */
  async function boot() {
    const b = $("#boot");
    if (REDUCED || returning) { b.classList.add("gone"); return; }
    const pre = $("#boot-log");
    let skip = false;
    const end = () => { skip = true; };
    b.addEventListener("click", end); addEventListener("keydown", end, { once: true });
    for (const [label, val, cls] of S.boot) {
      if (skip) break;
      const row = el("div"); row.append(document.createTextNode("> " + label.padEnd(14, ".") + " "));
      const v = el("span", cls || "w", ""); row.appendChild(v); pre.appendChild(row);
      await wait(120);
      v.textContent = val;
      await wait(210);
    }
    if (!skip) await wait(500);
    b.classList.add("gone");
    await wait(400);
  }

  async function opening() {
    renderMemory(); exposure(false);
    input.placeholder = S.placeholder;
    await boot();
    if (returning && st.name) {
      await agent(S.welcomeBack(st.name), { big: true, pause: 300 });
      await agent(S.welcomeBack2(st.mem.length));
      nextChips();
      return;
    }
    await agent(S.hello, { big: true, pause: 250 });
    await agent(S.hello2);
    await card(film("ig-hero", S.altHero), S.filmHero, { cls: "film-card", flush: true, right: "▶ 0:10" });
    await agent(S.askName);
    st.expect = { kind: "name" };
    input.placeholder = S.namePlaceholder;
    const skipBtn = el("button", "", S.skipName); skipBtn.type = "button";
    skipBtn.addEventListener("click", async () => {
      if (st.busy) return; st.busy = true; st.expect = null; input.placeholder = S.placeholder;
      await me(S.skipName, { scripted: true });
      await agent(S.skipped);
      st.busy = false; nextChips();
    });
    chips([]); chipsEl.appendChild(skipBtn);
    if (!matchMedia("(pointer: coarse)").matches) input.focus({ preventScroll: true });
  }

  opening();
})();
