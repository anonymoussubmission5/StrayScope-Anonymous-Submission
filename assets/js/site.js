/* StrayScope project page: demo player, charts, device matrix, stepper, tabs, lightbox, lazy video.
   Plain JavaScript, no dependencies, no network requests beyond this site's own files. */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
};
const SVGNS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const ICON = {
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>',
  slow: '<svg viewBox="0 0 16 16" aria-hidden="true"><text x="8" y="11.5" font-size="8.5" text-anchor="middle" fill="currentColor" font-family="sans-serif">½×</text></svg>',
  fail: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

/* ------------------------------------------------------------------ theme */
(function theme() {
  const btn = $(".theme-toggle");
  if (!btn) return;
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) { /* storage blocked */ }
  if (saved) document.documentElement.dataset.theme = saved;
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const label = () => btn.setAttribute("aria-label", isDark() ? "Use light theme" : "Use dark theme");
  label();
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
    label();
  });
})();

/* ------------------------------------------------------------------ nav: mark the section in view */
(function navSpy() {
  const links = $$(".site-nav a[href^='#']");
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const secs = $$("main [id]").filter((s) => map.has(s.id));
  if (!secs.length || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.removeAttribute("aria-current"));
      map.get(e.target.id).setAttribute("aria-current", "true");
    }
  }, { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach((s) => io.observe(s));
})();

/* ------------------------------------------------------------------ lazy, visibility-aware looping videos */
function lazyVideos(root = document) {
  const vids = $$("video[data-src]", root);
  if (!vids.length) return;
  const load = (v) => {
    if (v.dataset.loaded) return;
    v.src = v.dataset.src;
    v.dataset.loaded = "1";
  };
  if (!("IntersectionObserver" in window)) { vids.forEach(load); return; }
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      const v = e.target;
      if (e.isIntersecting) {
        load(v);
        if (v.hasAttribute("data-autoplay") && !reduceMotion && !v.dataset.userPaused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    }
  }, { rootMargin: "200px 0px" });
  vids.forEach((v) => {
    io.observe(v);
    v.addEventListener("click", () => {
      if (v.paused) { v.play().catch(() => {}); delete v.dataset.userPaused; }
      else { v.pause(); v.dataset.userPaused = "1"; }
    });
  });
}

/* ------------------------------------------------------------------ lightbox */
(function lightbox() {
  const dlg = el("dialog", { class: "lightbox", "aria-label": "Enlarged figure" });
  const img = el("img", { alt: "" });
  const cap = el("p");
  const close = el("button", { class: "btn close", type: "button" }, "Close");
  close.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.append(close, img, cap);
  document.body.append(dlg);
  document.addEventListener("click", (e) => {
    const t = e.target.closest("img.zoomable");
    if (!t) return;
    img.src = t.dataset.full || t.currentSrc || t.src;
    img.alt = t.alt;
    const fc = t.closest("figure")?.querySelector("figcaption");
    cap.textContent = fc ? fc.textContent.trim() : "";
    dlg.showModal();
  });
})();

/* ------------------------------------------------------------------ tabs */
function tabs(root) {
  const btns = $$("[role='tab']", root);
  const select = (b, focus) => {
    btns.forEach((x) => {
      const on = x === b;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      $("#" + x.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) b.focus();
    root.dispatchEvent(new CustomEvent("tabchange", { detail: b.getAttribute("aria-controls") }));
  };
  btns.forEach((b, i) => {
    b.addEventListener("click", () => select(b));
    b.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); select(btns[(i + d + btns.length) % btns.length], true); }
    });
  });
}
$$(".tabs").forEach(tabs);

/* ------------------------------------------------------------------ dumbbell chart (attacked -> corrected) */
function dumbbell(host, rows, opt = {}) {
  const max = opt.max ?? 100, min = opt.min ?? 0;
  const unit = opt.unit ?? "";
  const W = 640, lab = opt.labelWidth ?? 150, right = opt.noteWidth ?? 90, rowH = 38, top = 26;
  const H = top + rows.length * rowH + 6;
  const x = (v) => lab + ((v - min) / (max - min)) * (W - lab - right);
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opt.aria || "Scores under attack and after correction" });
  const g = svg("g", { class: "grid" });
  for (let v = min; v <= max + 1e-9; v += opt.step ?? 20) {
    g.append(svg("line", { x1: x(v), x2: x(v), y1: top - 8, y2: H }));
    const t = svg("text", { x: x(v), y: top - 12, "text-anchor": "middle" });
    t.textContent = `${v}${unit}`;
    g.append(t);
  }
  s.append(g);
  const fmt = (v) => (opt.fmt ? opt.fmt(v) : v.toFixed(1));
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2;
    const l = svg("text", { x: 0, y: y + 4.5, class: "lab" });
    l.textContent = r.label;
    s.append(l);
    s.append(svg("line", { x1: x(r.a), x2: x(r.c), y1: y, y2: y, class: "bar" }));
    s.append(svg("circle", { cx: x(r.a), cy: y, r: 6.5, class: "att" }));
    s.append(svg("circle", { cx: x(r.c), cy: y, r: 7.5, class: "cor" }));
    const left = r.a <= r.c;
    const ta = svg("text", { x: x(r.a) + (left ? -11 : 11), y: y + 4.5, class: "val a", "text-anchor": left ? "end" : "start" });
    ta.textContent = fmt(r.a);
    const tc = svg("text", { x: x(r.c) + (left ? 12 : -12), y: y + 4.5, class: "val c", "text-anchor": left ? "start" : "end" });
    tc.textContent = fmt(r.c);
    s.append(ta, tc);
    if (r.note) {
      const n = svg("text", { x: W, y: y + 4.5, class: "note", "text-anchor": "end" });
      n.textContent = r.note;
      s.append(n);
    }
    const tt = svg("title");
    tt.textContent = `${r.label}: ${fmt(r.a)}${unit} under attack, ${fmt(r.c)}${unit} after correction${r.note ? " (" + r.note + ")" : ""}`;
    s.append(tt);
  });
  host.append(s);
}

/* ------------------------------------------------------------------ device matrix */
function deviceMatrix(host, data) {
  const feats = ["Person", "Face", "Package", "Motion"];
  const t = el("table");
  const h1 = el("tr", {}, el("th", { scope: "col" }, ""), ...feats.map((f) => el("th", { scope: "colgroup", colspan: 2 }, f)));
  const h2 = el("tr", { class: "sub" }, el("th", {}, ""), ...feats.flatMap(() => [el("th", { scope: "col" }, "Static"), el("th", { scope: "col" }, "Rolling")]));
  t.append(el("thead", {}, h1, h2));
  const tb = el("tbody");
  for (const d of data) {
    const tr = el("tr", {}, el("th", { scope: "row" }, d.device));
    for (const f of feats) {
      for (const k of ["s", "r"]) {
        const v = d[f.toLowerCase()][k];
        const cls = v === null ? "na" : v ? "ok" : "fail";
        const text = v === null ? "Feature not available" : v ? "Detected" : "Failed";
        const td = el("td", { class: cls, title: `${d.device}, ${f}, ${k === "s" ? "static" : "rolling-shutter"} injection: ${text}` });
        td.innerHTML = v === null ? "–" : v ? ICON.ok : ICON.fail;
        td.append(el("span", { class: "sr-only" }, text));
        tr.append(td);
      }
    }
    tb.append(tr);
  }
  t.append(tb);
  host.append(t);
}

/* ------------------------------------------------------------------ demo player */
class Player {
  constructor(host, demos, opt = {}) {
    this.host = host;
    this.demos = demos;
    this.opt = opt;
    this.split = 0.5;
    this.mode = "side";
    this.series = null;
    this.build();
    if (window.matchMedia("(max-width: 700px)").matches) this.setMode("wipe");   // three panes are too small on phones
    this.load(opt.start ?? demos[0].id, false);
    const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => {
      for (const e of es) {
        this.visible = e.isIntersecting;
        if (e.isIntersecting) {
          if (!this.video.src) this.video.src = this.cur.video;
          if (!reduceMotion && !this.userPaused) this.video.play().catch(() => {});
        } else this.video.pause();
      }
    }, { rootMargin: "100px 0px" }) : null;
    if (io) io.observe(this.host); else this.video.src = this.cur.video;
  }

  build() {
    const p = el("div", { class: "player", "data-mode": "side" });
    this.title = el("h3", { class: "player-title" });
    const seg = el("div", { class: "seg", role: "group", "aria-label": "View" });
    this.bSide = el("button", { type: "button", "aria-pressed": "true" }, "Side by side");
    this.bWipe = el("button", { type: "button", "aria-pressed": "false" }, "Wipe");
    this.bSide.addEventListener("click", () => this.setMode("side"));
    this.bWipe.addEventListener("click", () => this.setMode("wipe"));
    seg.append(this.bSide, this.bWipe);
    p.append(el("div", { class: "player-top" }, this.title, seg));

    this.heads = {};
    const panes = el("div", { class: "panes" });
    for (const [k, name] of [["clean", "Clean"], ["attacked", "Attacked"], ["corrected", "Corrected"]]) {
      const c = el("span", { class: "count", "aria-live": "off" });
      const h = el("div", { class: "pane-head", "data-k": k }, el("b", {}, name), c);
      this.heads[k] = c;
      panes.append(h);
    }
    p.append(panes);

    this.video = el("video", { muted: true, playsinline: true, loop: true, preload: "metadata", "aria-label": "Demo video" });
    this.video.muted = true;
    this.canvas = el("canvas", { tabindex: "0", "aria-label": "Attacked and corrected streams; use the left and right arrow keys to move the divider" });
    const screen = el("div", { class: "screen" }, this.video, this.canvas, el("div", { class: "wipe-hint" }, "Drag the line to compare"));
    p.append(screen);

    this.playBtn = el("button", { class: "icon-btn", type: "button", "aria-label": "Pause" });
    this.playBtn.innerHTML = ICON.pause;
    this.playBtn.addEventListener("click", () => this.toggle());
    this.slowBtn = el("button", { class: "icon-btn", type: "button", "aria-label": "Play at half speed", "aria-pressed": "false" });
    this.slowBtn.innerHTML = ICON.slow;
    this.slowBtn.addEventListener("click", () => {
      const slow = this.video.playbackRate === 1;
      this.video.playbackRate = slow ? 0.5 : 1;
      this.slowBtn.setAttribute("aria-pressed", slow);
    });
    this.tl = el("div", { class: "timeline", role: "slider", tabindex: "0", "aria-label": "Seek", "aria-valuemin": "0", "aria-valuemax": "100" });
    this.tlSvg = svg("svg", { viewBox: "0 0 1000 100", preserveAspectRatio: "none" });
    this.tl.append(this.tlSvg);
    p.append(el("div", { class: "controls" }, this.playBtn, this.slowBtn, this.tl));
    this.tlLabel = el("div", { class: "timeline-label" });
    p.append(this.tlLabel);
    this.legend = el("div", { class: "legend-boxes" });
    p.append(this.legend);
    this.desc = el("p");
    this.dl = el("div", { class: "dl" });
    p.append(el("div", { class: "player-foot" }, this.desc, this.dl));
    if (this.demos.length > 1 && !this.opt.noChips) {
      this.chips = el("div", { class: "chips", role: "group", "aria-label": "Choose a demo" });
      for (const d of this.demos) {
        const c = el("button", { class: "chip", type: "button", "aria-pressed": "false", "data-id": d.id },
          d.chip || d.title, d.chipTag ? el("span", { class: "tag" }, d.chipTag) : null);
        c.addEventListener("click", () => this.load(d.id, true));
        this.chips.append(c);
      }
      p.append(this.chips);
    }
    this.root = p;
    this.host.append(p);

    // seeking
    const seek = (e) => {
      const r = this.tl.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (this.video.duration) this.video.currentTime = f * this.video.duration;
      this.draw();
    };
    let drag = false;
    this.tl.addEventListener("pointerdown", (e) => { drag = true; this.tl.setPointerCapture(e.pointerId); seek(e); });
    this.tl.addEventListener("pointermove", (e) => { if (drag) seek(e); });
    this.tl.addEventListener("pointerup", () => { drag = false; });
    this.tl.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 2 : 0.5;
      if (e.key === "ArrowRight") this.video.currentTime = Math.min(this.video.duration || 0, this.video.currentTime + step);
      else if (e.key === "ArrowLeft") this.video.currentTime = Math.max(0, this.video.currentTime - step);
      else if (e.key === " ") { e.preventDefault(); this.toggle(); return; } else return;
      e.preventDefault();
      this.draw();
    });
    // wipe divider
    let wdrag = false;
    const setSplit = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.split = Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width));
      this.paint();
    };
    this.canvas.addEventListener("pointerdown", (e) => { wdrag = true; this.canvas.setPointerCapture(e.pointerId); setSplit(e); });
    this.canvas.addEventListener("pointermove", (e) => { if (wdrag) setSplit(e); });
    this.canvas.addEventListener("pointerup", () => { wdrag = false; });
    this.canvas.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 0.04 : e.key === "ArrowLeft" ? -0.04 : 0;
      if (!d) return;
      e.preventDefault();
      this.split = Math.min(0.98, Math.max(0.02, this.split + d));
      this.paint();
    });
    this.video.addEventListener("play", () => { this.playBtn.innerHTML = ICON.pause; this.playBtn.setAttribute("aria-label", "Pause"); this.loop(); });
    this.video.addEventListener("pause", () => { this.playBtn.innerHTML = ICON.play; this.playBtn.setAttribute("aria-label", "Play"); });
    this.video.addEventListener("seeked", () => this.draw());
    this.video.addEventListener("timeupdate", () => { if (this.video.paused) this.draw(); });
    this.video.addEventListener("loadeddata", () => this.draw());
    if (reduceMotion) { this.playBtn.innerHTML = ICON.play; this.playBtn.setAttribute("aria-label", "Play"); }
  }

  toggle() {
    if (this.video.paused) { this.userPaused = false; this.video.play().catch(() => {}); }
    else { this.userPaused = true; this.video.pause(); }
  }

  setMode(m) {
    this.mode = m;
    this.root.dataset.mode = m;
    this.bSide.setAttribute("aria-pressed", m === "side");
    this.bWipe.setAttribute("aria-pressed", m === "wipe");
    this.paint();
    if (!this.video.paused) requestAnimationFrame(() => this.loop());
  }

  async load(id, play) {
    const d = this.demos.find((x) => x.id === id) || this.demos[0];
    this.cur = d;
    this.series = null;
    if (this.chips) $$(".chip", this.chips).forEach((c) => c.setAttribute("aria-pressed", c.dataset.id === d.id));
    this.title.innerHTML = "";
    this.title.append(d.title, d.model ? el("span", {}, `  ${d.model}`) : null);
    this.desc.textContent = d.desc || "";
    this.video.poster = d.poster || "";
    if (this.video.src || play) {
      this.video.src = d.video;
      if (play && !reduceMotion) { this.userPaused = false; this.video.play().catch(() => {}); }
    }
    this.dl.innerHTML = "";
    if (d.downloads) {
      this.dl.append("Download");
      for (const [k, v] of Object.entries(d.downloads)) this.dl.append(el("a", { href: v, download: "" }, k));
    }
    const kinds = d.task === "pose" ? [["found", "pose matches clean output"], ["missed", "missed person"], ["ghost", "spurious person"]]
      : d.task === "facerec" ? [["found", "same identity as clean output"], ["missed", "missed face"], ["wrong", "misidentified"], ["ghost", "spurious face"]]
      : [["found", "matches clean output"], ["missed", "missed"], ["ghost", "spurious (ghost)"], ["wrong", "incorrect label"]];
    this.legend.innerHTML = "";
    for (const [k, t] of kinds) this.legend.append(el("span", { class: "lb-" + k }, el("i"), t));
    this.tlLabel.innerHTML = "";
    this.tlLabel.append(
      el("span", {}, el("span", { class: "sw", style: "background:#e2524b" }), "Attacked"),
      el("span", {}, el("span", { class: "sw", style: "background:#3fae64" }), "Corrected"),
      el("span", {}, d.metric || "Per-frame match with the model's output on the clean video (higher is better)"));
    try { this.series = await getJSON(d.series); } catch (e) { this.series = null; }
    if (this.cur !== d) return;
    this.drawTimeline();
    this.draw();
  }

  drawTimeline() {
    const s = this.series, g = this.tlSvg;
    g.innerHTML = "";
    if (!s) return;
    const n = s.n, Y = (v) => 92 - v * 84;
    g.append(svg("line", { x1: 0, x2: 1000, y1: 92, y2: 92, class: "axis" }));
    g.append(svg("line", { x1: 0, x2: 1000, y1: 8, y2: 8, class: "axis", "stroke-dasharray": "2 4" }));
    if (s.onset != null) g.append(svg("line", { x1: (s.onset / n) * 1000, x2: (s.onset / n) * 1000, y1: 0, y2: 100, class: "onset" }));
    const path = (arr) => {
      let d = "", pen = false;
      const k = s.smooth || Math.max(1, Math.round((s.fps || 30) / 5));
      arr.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        let acc = 0, c = 0;
        for (let j = Math.max(0, i - k); j <= Math.min(arr.length - 1, i + k); j++) if (arr[j] != null) { acc += arr[j]; c++; }
        const x = ((s.t ? s.t[i] : i) / n) * 1000;
        d += `${pen ? "L" : "M"}${x.toFixed(1)},${Y(acc / c).toFixed(1)}`;
        pen = true;
      });
      return d;
    };
    g.append(svg("path", { d: path(s.att), class: "ln-att", "vector-effect": "non-scaling-stroke" }));
    g.append(svg("path", { d: path(s.cor), class: "ln-cor", "vector-effect": "non-scaling-stroke" }));
    this.headLine = svg("line", { x1: 0, x2: 0, y1: 0, y2: 100, class: "head", "vector-effect": "non-scaling-stroke" });
    g.append(this.headLine);
  }

  loop() {
    if (this.video.paused) return;
    this.draw();
    // a hidden <video> (wipe view) may not present frames, so the wipe view repaints on animation frames
    if (this.mode !== "wipe" && "requestVideoFrameCallback" in this.video) this.video.requestVideoFrameCallback(() => this.loop());
    else requestAnimationFrame(() => this.loop());
  }

  frameIndex() {
    const s = this.series;
    if (!s) return 0;
    return Math.min(s.n - 1, Math.max(0, Math.floor(this.video.currentTime * s.fps + 1e-3)));
  }

  draw() {
    const s = this.series;
    if (s && this.headLine) {
      const f = this.frameIndex();
      const x = (f / s.n) * 1000;
      this.headLine.setAttribute("x1", x);
      this.headLine.setAttribute("x2", x);
      this.tl.setAttribute("aria-valuenow", Math.round((f / s.n) * 100));
      const idx = s.t ? Math.max(0, s.t.findIndex((t) => t >= f)) : f;
      const c = s.counts[idx] || null;
      if (c) this.setCounts(c);
    }
    this.paint();
  }

  setCounts(c) {
    // c = [n_clean, foundA, missedA, ghostA, wrongA, foundC, missedC, ghostC, wrongC]
    const t = this.cur.task;
    const noun = t === "pose" ? "people" : t === "facerec" ? "known faces" : "objects";
    this.heads.clean.innerHTML = `<i>${c[0]}</i> ${noun}`;
    const fmt = (f, m, g, w) => t === "pose"
      ? `<i>${f}</i> matched, <i>${m}</i> missed, <i>${g}</i> spurious`
      : t === "facerec"
        ? `<i>${f}</i> correct, <i>${m}</i> missed, <i>${w}</i> misidentified`
        : `<i>${f}</i> found, <i>${m}</i> missed, <i>${g}</i> spurious, <i>${w}</i> mislabeled`;
    this.heads.attacked.innerHTML = fmt(c[1], c[2], c[3], c[4]);
    this.heads.corrected.innerHTML = fmt(c[5], c[6], c[7], c[8]);
  }

  paint() {
    if (this.mode !== "wipe") return;
    const v = this.video;
    if (!v.videoWidth) return;
    const pw = v.videoWidth / 3, ph = v.videoHeight;
    const cv = this.canvas;
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const ctx = cv.getContext("2d");
    const sx = Math.round(this.split * pw);
    ctx.drawImage(v, pw, 0, sx, ph, 0, 0, sx, ph);                       // attacked (left)
    ctx.drawImage(v, 2 * pw + sx, 0, pw - sx, ph, sx, 0, pw - sx, ph);    // corrected (right)
    // the divider is drawn like one sensor row being read out: a thin bright line with a soft glow
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.7)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx - 1, 0, 2, ph);
    ctx.restore();
    const r = Math.max(14, ph * 0.035);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(sx, ph / 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(sx - r * 0.55, ph / 2); ctx.lineTo(sx - r * 0.15, ph / 2 - r * 0.38); ctx.lineTo(sx - r * 0.15, ph / 2 + r * 0.38); ctx.closePath();
    ctx.moveTo(sx + r * 0.55, ph / 2); ctx.lineTo(sx + r * 0.15, ph / 2 - r * 0.38); ctx.lineTo(sx + r * 0.15, ph / 2 + r * 0.38); ctx.closePath();
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ stepper (one frame, step by step) */
function stepper(root) {
  const btns = $$("[role='tab']", root);
  const img = $("img", root), h = $("h4", root), p = $(".step-text", root);
  const steps = JSON.parse($("script[type='application/json']", root).textContent);
  let i = 0;
  const show = (k, focus) => {
    i = (k + steps.length) % steps.length;
    const s = steps[i];
    img.src = s.img; img.alt = s.alt;
    h.textContent = s.title;
    p.textContent = s.text;
    btns.forEach((b, j) => { b.setAttribute("aria-selected", j === i); b.tabIndex = j === i ? 0 : -1; });
    if (focus) btns[i].focus();
  };
  btns.forEach((b, j) => {
    b.addEventListener("click", () => show(j));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1, true); }
    });
  });
  $(".prev", root)?.addEventListener("click", () => show(i - 1));
  $(".next", root)?.addEventListener("click", () => show(i + 1));
  steps.forEach((s) => { const im = new Image(); im.src = s.img; });
  show(0);
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  lazyVideos();
  $$(".stepper").forEach(stepper);
  let data = null;
  try { data = await getJSON("assets/data/site.json"); } catch (e) { console.warn(e); }
  if (!data) return;
  for (const host of $$("[data-player]")) {
    const ids = host.dataset.player.split(",");
    const list = ids[0] === "*" ? data.demos : ids.map((id) => data.demos.find((d) => d.id === id)).filter(Boolean);
    if (list.length) host.player = new Player(host, list, { noChips: host.hasAttribute("data-nochips") });
  }
  for (const host of $$("[data-chart]")) {
    const c = data.charts[host.dataset.chart];
    if (c) dumbbell(host, c.rows, c.opt || {});
  }
  const m = $("[data-matrix]");
  if (m) deviceMatrix(m, data.devices);
  const atl = $("[data-atlas]");
  if (atl && data.atlas) {
    const lab = el("div", { class: "atlas-labels", "aria-hidden": "true" });
    data.atlas.forEach((t) => lab.append(el("span", {}, t.label)));
    atl.append(lab);
  }
  const gal = $("[data-gallery]");
  if (gal) gallery(gal, data.demos);

  // paper figures: thumbnails that open full size, and in-text links to a figure
  const fl = $("[data-figlist]");
  if (fl && data.figures) {
    for (const f of data.figures) {
      fl.append(el("figure", { class: "card" },
        el("img", { class: "zoomable", src: f.src, alt: f.title, loading: "lazy", style: "aspect-ratio:auto;object-fit:contain;background:#fff;border-radius:4px" }),
        el("figcaption", {}, el("b", {}, f.title + ". "), f.caption)));
    }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-fig]");
    if (!a || !data.figures) return;
    e.preventDefault();
    const f = data.figures.find((x) => x.src.includes(a.dataset.fig));
    if (!f) return;
    const tmp = el("figure", { style: "display:none" }, el("img", { class: "zoomable", src: f.src, alt: f.title }),
      el("figcaption", {}, `${f.title}. ${f.caption}`));
    document.body.append(tmp);
    tmp.querySelector("img").click();
    setTimeout(() => tmp.remove(), 0);
  });

  // vision-language example
  const vx = $("#vlm-example");
  if (vx && data.vlm) {
    const v = data.vlm;
    vx.append(el("h3", { style: "margin-top:2rem" }, `${v.model} descriptions of a ${v.recording}`),
      el("div", { class: "vlm" },
        el("div", { style: "--c:var(--clean)" }, el("b", {}, "Clean video"), el("p", {}, `“${v.clean}”`)),
        el("div", { style: "--c:var(--attacked)" }, el("b", {}, `Attacked (judge score ${v.scores[0]})`), el("p", {}, `“${v.attacked}”`)),
        el("div", { style: "--c:var(--corrected)" }, el("b", {}, `Corrected (judge score ${v.scores[1]})`), el("p", {}, `“${v.corrected}”`))),
      el("p", { class: "small muted", style: "margin-top:0.9rem" }, "Excerpts from the model's descriptions of the same recording. Under attack, the model omits the person crossing the parking lot and describes the injected light as a decorative border; on the corrected video, it again reports the person."));
  }
}

/* ------------------------------------------------------------------ gallery page */
function gallery(host, demos) {
  const playerHost = $("[data-gallery-player]");
  const player = new Player(playerHost, demos, { noChips: true });
  const state = { task: "all", source: "all" };
  const grid = el("div", { class: "cards" });
  const render = () => {
    grid.innerHTML = "";
    for (const d of demos) {
      if (state.task !== "all" && d.task !== state.task) continue;
      if (state.source !== "all" && d.source !== state.source) continue;
      const b = el("button", { class: "thumb", type: "button", "aria-label": `Play: ${d.title}` }, el("img", { src: d.poster, alt: "", loading: "lazy" }));
      b.addEventListener("click", () => {
        player.load(d.id, true);
        playerHost.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
      grid.append(el("article", { class: "card" }, b, el("h4", {}, d.title),
        el("p", {}, d.desc || ""), el("p", { class: "facts" }, [d.model, d.sourceLabel, d.band].filter(Boolean).join(", "))));
    }
  };
  const mk = (key, opts) => {
    const fs = el("fieldset", {}, el("legend", {}, key === "task" ? "Task" : "Injection"));
    for (const [v, t] of opts) {
      const b = el("button", { type: "button", "aria-pressed": state[key] === v }, t);
      b.addEventListener("click", () => {
        state[key] = v;
        $$("button", fs).forEach((x) => x.setAttribute("aria-pressed", x === b));
        render();
      });
      fs.append(b);
    }
    return fs;
  };
  host.append(el("div", { class: "filters" },
    mk("task", [["all", "All tasks"], ["facerec", "Face recognition"], ["det", "Object detection"], ["seg", "Instance segmentation"], ["pose", "Pose estimation"]]),
    mk("source", [["all", "All attacks"], ["simulated", "Simulated injection"], ["physical", "Physical injection"]])), grid);
  render();
}

boot();
