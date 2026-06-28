/* =========================================================================
   Ondo research note. Self-contained instrument layer.
   Builds the note's data visualisations (donut, unlock timeline, product
   bars, stat count-up), wires the risk accordion, and orchestrates motion.
   Motion split mirrors the portfolio: entrance/reveal slow; interaction fast.
   Every viz settles to a final state under prefers-reduced-motion.
   No em-dashes in any string. British spelling.
   ========================================================================= */
(function () {
  "use strict";

  const ns = "http://www.w3.org/2000/svg";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RM = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;
  function el(tag, attrs, txt) {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fmt(v, dec) {
    return dec > 0 ? Number(v).toFixed(dec) : Math.round(v).toLocaleString("en-GB");
  }

  /* ---- count-up (slow, eased); honours reduced motion ---- */
  function countUp(root) {
    $$(".num", root).forEach((numEl) => {
      const to = parseFloat(numEl.dataset.to);
      const dec = parseInt(numEl.dataset.dec || "0", 10);
      if (!isFinite(to)) return; // malformed data-to: leave the static HTML value in place
      if (RM()) { numEl.textContent = fmt(to, dec); return; }
      if (numEl._raf) cancelAnimationFrame(numEl._raf);
      if (numEl._fin) clearTimeout(numEl._fin);
      const dur = 2000, t0 = performance.now();
      // safety net: land on the final value even if rAF is throttled or stalls (e.g. backgrounded tab)
      numEl._fin = setTimeout(function () { if (numEl._raf) cancelAnimationFrame(numEl._raf); numEl._raf = null; numEl.textContent = fmt(to, dec); }, dur + 600);
      (function frame(t) {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        numEl.textContent = fmt(to * e, dec);
        if (p < 1) numEl._raf = requestAnimationFrame(frame);
        else { numEl._raf = null; if (numEl._fin) { clearTimeout(numEl._fin); numEl._fin = null; } numEl.textContent = fmt(to, dec); }
      })(t0);
    });
  }

  /* ---- product bars: width from data-w, relative to the largest (illustrative echo, no axis) ---- */
  function setStackWidths() {
    const rows = $$(".stack__row[data-w]");
    const max = rows.reduce((m, r) => Math.max(m, parseFloat(r.dataset.w) || 0), 0) || 1;
    rows.forEach((r) => {
      const w = parseFloat(r.dataset.w) || 0;
      // floor at 22% so the smallest bar still reads as a bar, not a sliver
      const pct = Math.max(22, Math.round((w / max) * 100));
      r.style.setProperty("--wpct", pct + "%");
    });
  }

  /* ---- tokenomics donut: 4 segments, labelled with the note's exact strings ---- */
  function buildDonut() {
    const wrap = $('[data-viz="donut"]');
    if (!wrap) return;
    const svg = $(".tok__svg", wrap);
    if (!svg) return;
    const segs = [
      { v: 52, c: "var(--cool)" },
      { v: 33, c: "var(--cool-2)" },
      { v: 13, c: "var(--warm-2)" },
      { v: 2, c: "var(--mid)" },
    ];
    const cx = 100, cy = 100, r = 72, sw = 16, C = 2 * Math.PI * r, gap = 3;
    svg.setAttribute("viewBox", "0 0 200 200");
    const g = el("g", { transform: `rotate(-90 ${cx} ${cy})` });
    let acc = 0;
    segs.forEach((s) => {
      const len = (s.v / 100) * C;
      const vis = Math.max(2, len - gap); // small gap between segments; keep the 2% slice visible
      const c = el("circle", { cx, cy, r, fill: "none", "stroke-width": sw, "stroke-linecap": "butt" });
      c.style.stroke = s.c;
      c.style.strokeDasharray = `${vis.toFixed(2)} ${(C - vis).toFixed(2)}`;
      c.style.strokeDashoffset = `${(-acc).toFixed(2)}`;
      g.appendChild(c);
      acc += len;
    });
    svg.appendChild(g);
  }

  /* ---- risk accordion (reuses .dt2 styling; one open at a time, toggle) ---- */
  function wireAccordion() {
    const root = $('[data-viz="risks"]');
    if (!root) return;
    const items = $$(".dt2__item", root);
    const setOpen = (target, on) => {
      target.classList.toggle("is-active", on);
      const h = $(".dt2__head", target);
      if (h) h.setAttribute("aria-expanded", on ? "true" : "false");
    };
    items.forEach((it) => {
      const head = $(".dt2__head", it);
      if (!head) return;
      head.addEventListener("click", () => {
        const willOpen = !it.classList.contains("is-active");
        items.forEach((other) => { if (other !== it) setOpen(other, false); });
        setOpen(it, willOpen);
      });
    });
  }

  /* ---- play dispatch + scroll arming ---- */
  function playViz(v) {
    if (v.classList.contains("is-in")) return; // one-shot: never restart a count-up mid-flight
    v.classList.add("is-in");
    const t = v.dataset.viz;
    if (t === "readout" || t === "ratepass") countUp(v);
  }
  function armVizzes() {
    const vz = $$("[data-viz]");
    if (RM() || !hasIO) { vz.forEach(playViz); return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { playViz(e.target); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0 }
    );
    vz.forEach((v) => {
      // already scrolled past at load (e.g. a deep link): settle it now so it is final when reached.
      if (v.getBoundingClientRect().bottom <= 0) playViz(v);
      else io.observe(v); // in view -> the observer fires immediately; below the fold -> on scroll
    });
  }

  /* ---- scroll-reveal for .reveal blocks ---- */
  function scrollReveal() {
    const items = $$(".reveal");
    if (RM() || !hasIO) { items.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    items.forEach((e) => io.observe(e));
  }

  /* ---- sticky nav: reveal past masthead, active-section highlight, back-to-top ---- */
  function stickyNav() {
    const topbar = $("#topbar"), masthead = $("#masthead"), toTop = $("#totop");
    const links = $$("#ondonav a");
    const sections = links
      .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
      .filter(Boolean);

    if (topbar && masthead && hasIO) {
      new IntersectionObserver((es) => es.forEach((e) => {
        topbar.classList.toggle("is-visible", !e.isIntersecting);
        topbar.setAttribute("aria-hidden", e.isIntersecting ? "true" : "false");
      }), { rootMargin: "-60px 0px 0px 0px", threshold: 0 }).observe(masthead);
    }

    if (sections.length && hasIO) {
      const setActive = (id) => links.forEach((a) =>
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
      }), { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      sections.forEach((s) => io.observe(s));
    }

    if (toTop) {
      let ticking = false;
      const update = () => { toTop.hidden = window.scrollY < window.innerHeight * 0.9; ticking = false; };
      window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: RM() ? "auto" : "smooth" }));
      update();
    }
  }

  function init() {
    setStackWidths();
    buildDonut();
    wireAccordion();
    scrollReveal();
    armVizzes();
    stickyNav();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
