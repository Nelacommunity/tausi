"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "./lib/language-context";
import { CREDIT_COSTS } from "./lib/usage";

/* ── Scroll reveal + progress bar ──────────────────────────────────────────
   Injected client-side only so SSR HTML never contains them. */
function useReveal() {
  useEffect(() => {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    const root = document.documentElement;
    root.classList.add("tausi-js");
    const els = Array.from(document.querySelectorAll(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("tausi-js");
      bar.remove();
    };
  }, []);
}


/* ── How-it-works: step detail panels ───────────────────────────────────── */
function UploadDetail() {
  return (
    <div className="mt-5 rounded-xl bg-ink border border-line/60 p-4">
      <div className="border-2 border-dashed border-line/60 rounded-lg p-4 mb-4 flex flex-col items-center gap-1.5 step-animate" style={{ animationDelay: "0.1s" }}>
        <svg className="w-8 h-8 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-xs text-dim">Drop PDFs or images — or browse</p>
      </div>
      <div className="space-y-2">
        {[
          { name: "Physics_2023.pdf", pages: "12 pages", board: "NECTA" },
          { name: "Physics_2022.pdf", pages: "14 pages", board: "NECTA" },
          { name: "Physics_2021.pdf", pages: "11 pages", board: "NECTA" },
        ].map((f, i) => (
          <div key={i} className="step-animate flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-3 border border-line/50"
            style={{ animationDelay: `${0.3 + i * 0.18}s` }}>
            <svg className="w-3.5 h-3.5 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-xs text-body flex-1 truncate">{f.name}</span>
            <span className="font-mono text-[9px] text-dim">{f.pages}</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-teal-deep/30 text-teal">{f.board}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-good shrink-0" />
          </div>
        ))}
      </div>
      <div className="step-animate mt-4 rounded-lg bg-ink-3 border border-line/50 px-3 py-2.5" style={{ animationDelay: "0.85s" }}>
        <p className="text-[9px] font-mono text-dim mb-1">Custom instructions (optional)</p>
        <p className="text-xs text-body/70">
          &ldquo;Focus on thermodynamics and form four difficulty&rdquo;
          <span className="inline-block w-[2px] h-[11px] bg-teal ml-[2px] rounded-sm align-middle" style={{ animation: "cursor-blink 1s step-end infinite" }} />
        </p>
      </div>
    </div>
  );
}

function AnalysisDetail() {
  const sections = [
    { label: "Section A — Short Answers", pct: 40, color: "bg-teal/55" },
    { label: "Section B — Structured Essays", pct: 35, color: "bg-gold/55" },
    { label: "Section C — Problem Solving",  pct: 25, color: "bg-coral/55" },
  ];
  return (
    <div className="mt-5 rounded-xl bg-ink border border-line/60 p-4">
      <p className="step-animate font-mono text-[10px] text-dim mb-4" style={{ animationDelay: "0.1s" }}>
        Analysing structure...
      </p>
      <div className="space-y-3 mb-5">
        {sections.map((s, i) => (
          <div key={i} className="step-animate" style={{ animationDelay: `${0.2 + i * 0.18}s` }}>
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-body">{s.label}</span>
              <span className="font-mono text-dim">{s.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-ink-3 overflow-hidden">
              <div className={`step-bar h-full rounded-full ${s.color}`}
                style={{ width: `${s.pct}%`, animationDelay: `${0.25 + i * 0.2}s` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="step-animate grid grid-cols-3 gap-2" style={{ animationDelay: "0.75s" }}>
        {[
          { label: "Questions", val: "24" },
          { label: "Topics", val: "8" },
          { label: "Total marks", val: "100" },
        ].map(({ label, val }) => (
          <div key={label} className="rounded-lg bg-ink-3 border border-line/50 py-3 text-center">
            <p className="font-display text-xl font-bold text-teal">{val}</p>
            <p className="text-[9px] text-dim mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamDetail() {
  const lines: { text: string; cls: string; delay: number }[] = [
    { text: "FORM FOUR EXAMINATION — PHYSICS — 2026",    cls: "font-bold text-[11px] text-center text-body tracking-wide", delay: 0.1 },
    { text: "Time: 3 Hours  ·  Maximum Marks: 100",      cls: "text-[9px] text-center text-dim",                            delay: 0.35 },
    { text: "SECTION A — Short Answers (40 Marks)",      cls: "font-semibold text-teal mt-1",                               delay: 0.6 },
    { text: "1. A body of mass 4 kg moves at 6 m/s. Calculate its momentum. (4 marks)", cls: "text-body", delay: 0.85 },
    { text: "2. State Newton's Third Law and give one example. (3 marks)",               cls: "text-body", delay: 1.1 },
  ];
  return (
    <div className="mt-5 rounded-xl bg-ink border border-line/60 p-4 font-mono text-[10px] space-y-2">
      {lines.map(({ text, cls, delay }, i) => (
        <div key={i} className={`step-animate ${cls}`} style={{ animationDelay: `${delay}s` }}>{text}</div>
      ))}
      <div className="step-animate flex items-baseline text-body" style={{ animationDelay: "1.35s" }}>
        <span>3. R&#8321;&nbsp;=&nbsp;4&#937;, R&#8322;&nbsp;=&nbsp;6&#937; in series. Calculate total resistance</span>
        <span className="inline-block w-[2px] h-[11px] bg-teal ml-[2px] rounded-sm align-middle"
          style={{ animation: "cursor-blink 1s step-end infinite" }} />
      </div>
    </div>
  );
}

function TutorDetail() {
  return (
    <div className="mt-5 rounded-xl bg-ink border border-line/60 p-4 space-y-3">
      <div className="step-animate flex justify-end" style={{ animationDelay: "0.1s" }}>
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-teal-deep/50 border border-teal-deep/70 px-3 py-2">
          <p className="text-xs text-body">How do I calculate resistance in a parallel circuit?</p>
        </div>
      </div>
      <div className="step-animate flex gap-2 items-start" style={{ animationDelay: "0.4s" }}>
        <div className="w-6 h-6 rounded-full bg-teal-deep border border-teal/40 flex items-center justify-center shrink-0 mt-0.5">
          <span className="font-bold text-[8px] text-teal">T</span>
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-ink-3 border border-line px-3 py-2 space-y-1.5">
          <p className="text-xs text-body leading-relaxed">
            Use: <span className="font-mono text-teal text-[10px]">1/R = 1/R&#8321; + 1/R&#8322;</span>
          </p>
          <p className="text-xs text-body leading-relaxed">
            For 4&#937; and 6&#937;: 1/R = 1/4 + 1/6 = 5/12, so R = 2.4&#937;
          </p>
        </div>
      </div>
      <div className="step-animate flex justify-end" style={{ animationDelay: "0.85s" }}>
        <div className="max-w-[65%] rounded-2xl rounded-tr-sm bg-teal-deep/30 border border-teal-deep/50 px-3 py-2">
          <p className="text-xs text-body">What if there are 3 resistors?</p>
        </div>
      </div>
      <div className="step-animate flex gap-2 items-center" style={{ animationDelay: "1.05s" }}>
        <div className="w-6 h-6 rounded-full bg-teal-deep border border-teal/40 flex items-center justify-center shrink-0">
          <span className="font-bold text-[8px] text-teal">T</span>
        </div>
        <div className="flex items-center gap-1 bg-ink-3 border border-line rounded-2xl rounded-bl-sm px-3 py-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const STEP_DETAILS = [UploadDetail, AnalysisDetail, ExamDetail, TutorDetail];

/* ── Canvas: starfield + mathematical curves ────────────────────────────────
   Paints the full background on every frame:
   • 240 twinkling stars  (sine-wave alpha)
   • 2 composite sine interference waves  (teal + purple)
   • Lissajous figure  3:2 ratio, slowly rotating phase
   • Spirograph  slowly shifting
   All at very low opacity — atmospheric depth, not distraction.          */
function BackgroundCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0;

    const setSize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    // Wang hash — uniform distribution across full canvas (no LCG clustering)
    const wh = (n: number) => {
      let v = Math.imul(n + 1, 0x9e3779b9) | 0;
      v ^= v >>> 16;
      v = Math.imul(v, 0x85ebca6b) | 0;
      v ^= v >>> 13;
      return (v >>> 0) / 0x100000000;
    };

    const stars = Array.from({ length: 360 }, (_, i) => ({
      x: wh(i),
      y: wh(i + 1000),
      r: wh(i + 2000) < 0.62 ? 0.5 : wh(i + 2000) < 0.88 ? 1.0 : 1.8,
      phase: wh(i + 3000) * Math.PI * 2,
      speed: 0.8 + wh(i + 4000) * 2.5,
      vx: 0, vy: 0,
    }));

    let mx = -9999, my = -9999;
    const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMouseMove);

    // Shooting stars pool
    const shoots: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }> = [];
    let shootDelay = 280;

    let t = 0;
    let raf: number;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ctx is guaranteed non-null here; alias to avoid re-checking inside the loop
    const c = ctx;

    function frame() {
      c.clearRect(0, 0, w, h);

      // Background
      c.fillStyle = "oklch(0.14 0.008 240)";
      c.fillRect(0, 0, w, h);

      // Stars — cursor vortex + twinkling
      for (const s of stars) {
        if (!reduced) {
          // Tangential vortex force: stars orbit around cursor, never converge
          const sx = s.x * w, sy = s.y * h;
          const cdx = sx - mx, cdy = sy - my;
          const dist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (dist > 2 && dist < 350) {
            const inv = 1 / dist;
            s.vx += (-cdy * inv) * 0.4 / Math.sqrt(dist);
            s.vy += (cdx * inv) * 0.4 / Math.sqrt(dist);
          }
          s.vx *= 0.972; s.vy *= 0.972;
          s.x += s.vx / w; s.y += s.vy / h;
          if (s.x < 0) s.x += 1; else if (s.x > 1) s.x -= 1;
          if (s.y < 0) s.y += 1; else if (s.y > 1) s.y -= 1;
        }
        const cycle = (Math.sin(s.phase + t * s.speed) + 1) / 2;
        const a     = reduced ? 0.45 : 0.08 + 0.82 * cycle;
        const pulse = reduced ? 1    : 0.55 + 0.45 * cycle;
        c.beginPath();
        c.arc(s.x * w, s.y * h, s.r * pulse, 0, Math.PI * 2);
        c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        c.fill();
      }

      if (!reduced) {
        c.lineWidth = 1.4;

        // Teal composite wave
        c.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = h * 0.38
            + 72 * Math.sin((x / w) * Math.PI * 4 + t * 0.28)
            + 33 * Math.sin((x / w) * Math.PI * 9 + t * 0.50);
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.strokeStyle = "rgba(40,185,165,0.045)";
        c.stroke();

        // Purple wave
        c.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = h * 0.63
            + 57 * Math.cos((x / w) * Math.PI * 3 + t * 0.21)
            + 29 * Math.sin((x / w) * Math.PI * 7 + t * 0.43);
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.strokeStyle = "rgba(40,185,165,0.036)";
        c.stroke();

        // Lissajous 3:2
        {
          const lw = Math.min(w * 0.27, 300);
          const lh = Math.min(h * 0.21, 195);
          c.beginPath();
          for (let i = 0; i <= 1200; i++) {
            const th = (i / 1200) * Math.PI * 2;
            const px = w / 2 + lw * Math.sin(3 * th + t * 0.15);
            const py = h / 2 + lh * Math.sin(2 * th);
            i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
          }
          c.closePath();
          c.strokeStyle = "rgba(40,185,165,0.022)";
          c.lineWidth = 0.85;
          c.stroke();
        }

        // Spirograph
        {
          const R = Math.min(w, h) * 0.19;
          const r = R * 0.35;
          const d = r * 0.92;
          c.beginPath();
          for (let i = 0; i <= 3000; i++) {
            const th = (i / 3000) * Math.PI * 24;
            const px = w / 2 + (R - r) * Math.cos(th) + d * Math.cos(((R - r) / r) * th + t * 0.06);
            const py = h / 2 + (R - r) * Math.sin(th) - d * Math.sin(((R - r) / r) * th + t * 0.06);
            i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
          }
          c.strokeStyle = "rgba(40,185,165,0.015)";
          c.lineWidth = 0.7;
          c.stroke();
        }

        // Shooting stars — subtle diagonal streaks, one every 5–9 s
        shootDelay--;
        if (shootDelay <= 0) {
          const ang = 0.32 + (Math.random() - 0.5) * 0.3;
          const spd = 14 + Math.random() * 10;
          shoots.push({
            x: Math.random() * w * 0.75,
            y: Math.random() * h * 0.45,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0,
            maxLife: 44 + Math.floor(Math.random() * 28),
          });
          shootDelay = 290 + Math.floor(Math.random() * 260);
        }
        for (let si = shoots.length - 1; si >= 0; si--) {
          const ss = shoots[si];
          const prog = ss.life / ss.maxLife;
          const alpha = 0.42 * (1 - prog) * Math.min(1, ss.life / 7);
          const spd2 = Math.hypot(ss.vx, ss.vy);
          const nx = ss.vx / spd2;
          const ny = ss.vy / spd2;
          const tail = 52 + ss.life * 1.6;
          const tx = ss.x - nx * tail;
          const ty = ss.y - ny * tail;
          const g = c.createLinearGradient(tx, ty, ss.x, ss.y);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(1, `rgba(255,255,255,${alpha.toFixed(3)})`);
          c.beginPath();
          c.moveTo(tx, ty);
          c.lineTo(ss.x, ss.y);
          c.strokeStyle = g;
          c.lineWidth = 1.4;
          c.stroke();
          ss.x += ss.vx;
          ss.y += ss.vy;
          ss.life++;
          if (ss.life >= ss.maxLife) shoots.splice(si, 1);
        }

        t += 0.012;
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", setSize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

/* ── Peacock-arc decoration ─────────────────────────────────────────────── */
function FeatherArcs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" fill="none" className={className} aria-hidden="true">
      <path d="M470 470 A 430 430 0 0 0 40 40" stroke="var(--tausi-teal)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <path d="M470 470 A 360 360 0 0 0 110 110" stroke="var(--tausi-gold)" strokeOpacity="0.30" strokeWidth="2" strokeLinecap="round" />
      <path d="M470 470 A 290 290 0 0 0 180 180" stroke="var(--tausi-coral)" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <path d="M470 470 A 220 220 0 0 0 250 250" stroke="var(--tausi-magenta)" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "text-good" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/* ── Hero product window ────────────────────────────────────────────────────
   Animated mock of the Tausi dashboard: 3D-floating, text streams in,
   cursor blinks — the product visibly working, not a static image.       */
function HeroProductWindow() {
  const DELAYS = ["0.3s", "1.0s", "1.7s", "2.3s", "3.0s", "3.6s"];
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovering, setHovering] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = outerRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width  - 0.5) * 2;
    const y = ((e.clientY - top)  / height - 0.5) * 2;
    setTilt({ rx: -y * 7, ry: x * 10 });
    if (!hovering) setHovering(true);
  };
  const handleLeave = () => { setTilt({ rx: 0, ry: 0 }); setHovering(false); };

  return (
    <div ref={outerRef} className="relative w-full" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {/* 3D floating window */}
      <div
        className="relative rounded-2xl border border-line/80 bg-ink-2 shadow-2xl shadow-black/70 overflow-hidden"
        style={
          hovering
            ? { transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition: "transform 0.08s ease-out", boxShadow: "0 40px 100px -20px rgba(0,0,0,0.85), 0 0 0 1px oklch(0.72 0.20 192 / 0.12)" }
            : { animation: "float-product 9s ease-in-out infinite" }
        }
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-ink-3 border-b border-line">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-bad/80" />
            <span className="w-3 h-3 rounded-full bg-gold/80" />
            <span className="w-3 h-3 rounded-full bg-good/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-ink rounded-md px-3 py-1 text-[11px] text-dim font-mono">
              tausi.app/dashboard
            </div>
          </div>
        </div>

        {/* Two-panel content */}
        <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[160px_1fr] divide-x divide-line/60">
          {/* Left: controls */}
          <div className="p-3 bg-ink/40 flex flex-col gap-2 min-h-[260px] sm:min-h-[300px]">
            <p className="text-[10px] text-dim mb-1">Source file</p>
            <div className="flex items-start gap-1.5 rounded-lg bg-teal-deep/30 border border-teal-deep/70 px-2 py-1.5">
              <svg className="w-3.5 h-3.5 text-teal mt-px shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div>
                <p className="text-[10px] font-medium text-body leading-tight">Physics_2023.pdf</p>
                <p className="font-mono text-[9px] text-dim mt-0.5">NECTA · 12 pages</p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-teal-deep/40 text-teal">NECTA</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-ink-3 text-dim">Form 4</span>
            </div>
            <div className="flex items-center gap-1.5 mt-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-good" />
              <span className="font-mono text-[9px] text-good">Structure ready</span>
            </div>
            <button
              className="gen-pulse rounded-lg bg-gold/20 border border-gold/50 px-2 py-2 text-center cursor-pointer"
              aria-label="Generate predicted exam"
            >
              <p className="text-[10px] font-bold text-gold leading-none">Generate Exam</p>
              <p className="font-mono text-[9px] text-gold/70 mt-0.5">AI powered</p>
            </button>
          </div>

          {/* Right: streaming exam output */}
          <div className="p-4 font-mono text-[10px] leading-relaxed space-y-1.5 overflow-hidden">
            <div className="stream-line font-bold text-[11px] text-center text-body tracking-wide" style={{ animationDelay: DELAYS[0] }}>
              FORM FOUR EXAMINATION — PHYSICS — 2026
            </div>
            <div className="stream-line text-[9px] text-center text-dim" style={{ animationDelay: DELAYS[1] }}>
              Time: 3 Hours &nbsp;·&nbsp; Maximum Marks: 100
            </div>
            <div className="stream-line h-px bg-line/60 my-2" style={{ animationDelay: DELAYS[1] }} />
            <div className="stream-line font-semibold text-[10px] text-teal" style={{ animationDelay: DELAYS[2] }}>
              SECTION A — Short Answers (40 Marks)
            </div>
            <div className="stream-line text-body" style={{ animationDelay: DELAYS[3] }}>
              1. A body of mass 4 kg moves at 6 m/s. Calculate its momentum and state the SI unit.&nbsp;
              <span className="text-dim">(4 marks)</span>
            </div>
            <div className="stream-line text-body" style={{ animationDelay: DELAYS[4] }}>
              2. State Newton&apos;s Third Law and give one practical example.&nbsp;
              <span className="text-dim">(3 marks)</span>
            </div>
            <div className="stream-line flex items-center text-body" style={{ animationDelay: DELAYS[5] }}>
              3. R₁&nbsp;=&nbsp;4Ω, R₂&nbsp;=&nbsp;6Ω in series. Calculate total resistance
              <span
                className="inline-block w-[2px] h-[12px] bg-teal ml-[2px] rounded-sm"
                style={{ animation: "cursor-blink 1s step-end infinite" }}
              />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 bg-ink-3 border-t border-line flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-teal font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            Streaming...
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">tausi.app</span>
        </div>
      </div>

      {/* Floating status chips */}
      <div
        className="hidden lg:flex absolute -right-3 bottom-16 z-10 items-center gap-1.5 rounded-lg border border-gold/50 bg-ink-3/95 backdrop-blur-sm px-2.5 py-1.5 shadow-lg text-[11px] font-medium whitespace-nowrap pointer-events-none"
        style={{ animation: "float-bob 5.2s ease-in-out infinite", animationDelay: "1.4s" }}
      >
        <CheckIcon className="text-good !w-3.5 !h-3.5" />
        <span className="text-body">Marking ready</span>
      </div>
      <div
        className="hidden lg:flex absolute -left-3 top-[42%] z-10 items-center gap-1.5 rounded-lg border border-brand-magenta/40 bg-ink-3/95 backdrop-blur-sm px-2.5 py-1.5 shadow-lg text-[11px] font-medium text-body whitespace-nowrap pointer-events-none"
        style={{ animation: "float-bob 3.8s ease-in-out infinite", animationDelay: "0.6s" }}
      >
        <span className="font-mono text-[9px] font-bold text-brand-magenta">PHY</span>
        Physics · Form 4
      </div>
    </div>
  );
}

/* ── Feature card visuals ──────────────────────────────────────────────── */
function PredictVisual() {
  return (
    <div className="flex items-center justify-center gap-4 py-2" aria-hidden="true">
      {/* Past paper */}
      <div className="w-[72px] rounded-md bg-[oklch(0.88_0.005_220)] p-2.5 rotate-[-4deg] shadow-md shadow-black/40 shrink-0">
        <p className="font-serif text-[6px] text-center text-[oklch(0.45_0.01_240)] tracking-wide mb-1.5">PAST PAPER 2023</p>
        {[11, 9, 12, 8].map((w, i) => (
          <div key={i} className="h-[3px] rounded-sm bg-[oklch(0.7_0.005_240)] mb-1" style={{ width: `${w * 7}%` }} />
        ))}
      </div>

      {/* Arrow */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12l-7.5 7.5M21 12H3" />
        </svg>
        <span className="font-mono text-[8px] text-teal">AI</span>
      </div>

      {/* Predicted paper */}
      <div className="relative w-[72px] rounded-md bg-white p-2.5 rotate-[2.5deg] shadow-md shadow-black/40 shrink-0">
        <p className="font-serif text-[6px] text-center text-[oklch(0.3_0.01_240)] font-bold tracking-wide mb-1.5">PREDICTED 2026</p>
        {[9, 12, 10, 11].map((w, i) => (
          <div key={i} className="h-[3px] rounded-sm bg-[oklch(0.55_0.01_240)] mb-1" style={{ width: `${w * 7}%` }} />
        ))}
        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-teal shadow-md">
          <svg className="w-2.5 h-2.5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function MarkingVisual() {
  const rows = [
    { q: "Q1", pct: "92%", ok: true },
    { q: "Q2", pct: "76%", ok: true },
    { q: "Q3", pct: "38%", ok: false },
    { q: "Q4", pct: "88%", ok: true },
  ];
  return (
    <div className="mx-auto w-full max-w-[220px] rounded-xl border border-line bg-ink p-3.5" aria-hidden="true">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-mono text-[10px] text-dim">student_answers.pdf</span>
        <span className="font-mono text-sm font-bold text-gold">42<span className="text-[10px] text-dim">/50</span></span>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`font-mono text-[9px] w-5 shrink-0 ${r.ok ? "text-good" : "text-coral"}`}>{r.q}</span>
            <div className="h-1.5 flex-1 rounded-full bg-ink-3 overflow-hidden">
              <div
                className={`score-bar score-bar-${i + 1} h-full rounded-full ${r.ok ? "bg-good/70" : "bg-coral/70"}`}
                style={{ width: r.pct }}
              />
            </div>
            <span className={`font-mono text-[9px] w-6 text-right ${r.ok ? "text-good" : "text-coral"}`}>{r.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TutorVisual() {
  return (
    <div className="space-y-2 py-1" aria-hidden="true">
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-teal-deep/50 border border-teal-deep px-3 py-1.5">
          <p className="text-[10px] text-body">What is Ohm&apos;s Law?</p>
        </div>
      </div>
      <div className="flex gap-2 items-end">
        <span className="w-5 h-5 rounded-full bg-teal-deep border border-teal-deep flex items-center justify-center shrink-0">
          <span className="font-bold text-[7px] text-teal">T</span>
        </span>
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-ink-3 border border-line px-3 py-1.5">
          <p className="text-[10px] text-body leading-snug">V = IR. Voltage equals current times resistance. Here&apos;s a worked example...</p>
        </div>
      </div>
    </div>
  );
}

function LibraryVisual() {
  const papers = [
    { label: "Physics 2023", rot: "-4deg", top: "10px", left: "4px" },
    { label: "Physics 2022", rot: "-1.5deg", top: "6px", left: "2px" },
    { label: "Physics 2024", rot: "1.5deg", top: "0px", left: "0px" },
  ];
  return (
    <div className="flex justify-center items-end gap-4 py-2 pb-3" aria-hidden="true">
      <div className="relative h-[72px] w-[56px]">
        {papers.map((p, i) => (
          <div
            key={i}
            className="absolute w-[52px] rounded-sm bg-[oklch(0.9_0.004_240)] p-1.5 shadow-sm"
            style={{ transform: `rotate(${p.rot})`, top: p.top, left: p.left, zIndex: i }}
          >
            <p className="font-serif text-[6px] text-[oklch(0.4_0.01_240)] leading-tight">{p.label}</p>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-bold text-teal">150+</p>
        <p className="font-mono text-[9px] text-dim">past papers</p>
      </div>
    </div>
  );
}

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Economics", "Accounting", "History", "Geography", "Law",
  "Statistics", "Engineering", "Medicine", "Business Studies", "Psychology",
];

const BOARDS = ["NECTA", "KCSE", "IGCSE", "WAEC", "ZIMSEC", "UNEB", "NSC"];

/* ── How-it-works: orbital signal canvas ─────────────────────────────── */
// 4 nodes on a vertical S-curve path; each emits expanding rings.
// Active node pulses brighter. A particle traces the path as steps advance.
const HIW_NODES = [
  [0.5,  0.12],
  [0.14, 0.37],
  [0.86, 0.63],
  [0.5,  0.88],
] as const;

function HowItWorksCanvas({
  activeStep, onStepClick, stepTitles,
}: { activeStep: number; onStepClick: (i: number) => void; stepTitles: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(activeStep);
  useEffect(() => { activeRef.current = activeStep; }, [activeStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement!;
    let W = 0, H = 0, raf = 0;

    const resize = () => {
      W = canvas.width = parent.offsetWidth;
      H = canvas.height = parent.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    let t = 0;
    const TAU = Math.PI * 2;

    // Control points for the S-curve Bezier segments
    // Each segment: quadratic bezier from node[i] to node[i+1]
    const CPS = [
      [0.14, 0.12],  // 0 → 1
      [0.86, 0.37],  // 1 → 2
      [0.14, 0.63],  // 2 → 3
    ] as const;

    // Evaluate a quadratic bezier at parameter u ∈ [0,1]
    const qbez = (p0: number, p1: number, p2: number, u: number) =>
      (1 - u) * (1 - u) * p0 + 2 * (1 - u) * u * p1 + u * u * p2;

    const frame = () => {
      t += 0.013;
      ctx.clearRect(0, 0, W, H);

      const active = activeRef.current;
      const nodes = HIW_NODES.map(([nx, ny]) => ({ x: nx * W, y: ny * H }));

      // Bezier path segments (faint dashed flow lines)
      for (let i = 0; i < 3; i++) {
        const n1 = nodes[i], n2 = nodes[i + 1];
        const cp = CPS[i];
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.quadraticCurveTo(cp[0] * W, cp[1] * H, n2.x, n2.y);
        ctx.setLineDash([5, 11]);
        ctx.lineDashOffset = -(t * 22) % 16;
        const segActive = i === active || i + 1 === active;
        ctx.strokeStyle = segActive ? "rgba(40,185,165,0.28)" : "rgba(40,185,165,0.08)";
        ctx.lineWidth = segActive ? 1.2 : 0.7;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Traveling particle along path: position depends on fractional active step
      // Moves from node[active-1] to node[active] over time
      {
        const cp = CPS[Math.min(active, 2)];
        const u = (Math.sin(t * 1.2) + 1) / 2;
        if (active > 0) {
          const px = qbez(nodes[active - 1].x, cp[0] * W, nodes[active].x, u);
          const py = qbez(nodes[active - 1].y, cp[1] * H, nodes[active].y, u);
          const gp = ctx.createRadialGradient(px, py, 0, px, py, 10);
          gp.addColorStop(0, "rgba(40,185,165,0.90)");
          gp.addColorStop(1, "rgba(40,185,165,0)");
          ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU);
          ctx.fillStyle = gp; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU);
          ctx.fillStyle = "rgba(200,245,238,1)"; ctx.fill();
        }
      }

      // Nodes: expanding rings + core glow
      for (let i = 0; i < 4; i++) {
        const { x, y } = nodes[i];
        const isActive = i === active;
        const alpha = isActive ? 0.75 : 0.2;
        const maxR = isActive ? 90 : 55;
        const numRings = isActive ? 4 : 2;
        const speed = isActive ? 0.45 : 0.18;

        for (let k = 0; k < numRings; k++) {
          const phase = ((t * speed + k / numRings) % 1) * maxR;
          const a = alpha * (1 - phase / maxR);
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.5, phase), 0, TAU);
          ctx.strokeStyle = `rgba(40,185,165,${a.toFixed(3)})`;
          ctx.lineWidth = isActive ? 1.1 : 0.6;
          ctx.stroke();
        }

        // Core glow
        const coreR = isActive ? 9 : 5;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, coreR * 2.5);
        glow.addColorStop(0, isActive ? "rgba(40,185,165,0.90)" : "rgba(40,185,165,0.28)");
        glow.addColorStop(1, "rgba(40,185,165,0)");
        ctx.beginPath(); ctx.arc(x, y, coreR * 2.5, 0, TAU);
        ctx.fillStyle = glow; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, coreR, 0, TAU);
        ctx.fillStyle = isActive ? "rgba(180,240,230,1)" : "rgba(40,185,165,0.38)";
        ctx.fill();

        // Step number
        ctx.font = `bold 10px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = isActive ? "rgba(150,235,220,1)" : "rgba(40,140,130,0.45)";
        ctx.fillText(`0${i + 1}`, x, y - coreR - 10);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      {/* Invisible click targets over each node */}
      {HIW_NODES.map(([nx, ny], i) => (
        <button
          key={i}
          onClick={() => onStepClick(i)}
          className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${nx * 100}%`, top: `${ny * 100}%` }}
          aria-label={stepTitles[i]}
        />
      ))}
      {/* Step labels */}
      {HIW_NODES.map(([nx, ny], i) => {
        const isLeft = nx < 0.5;
        return (
          <div
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              left: isLeft ? `${nx * 100 + 8}%` : undefined,
              right: isLeft ? undefined : `${(1 - nx) * 100 + 8}%`,
              top: `${ny * 100}%`,
              transform: "translateY(-50%)",
            }}
          >
            <p className={`text-xs font-medium whitespace-nowrap transition-colors duration-300 ${activeStep === i ? "text-snow" : "text-dim"}`}>
              {stepTitles[i]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── FAQ accordion ────────────────────────────────────────────────────── */
function FaqAccordion() {
  const { T } = useT();
  const L = T.landing;
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    [L.faqQ1, L.faqA1], [L.faqQ2, L.faqA2], [L.faqQ3, L.faqA3],
    [L.faqQ4, L.faqA4], [L.faqQ5, L.faqA5], [L.faqQ6, L.faqA6],
  ] as [string, string][];

  return (
    <div className="reveal max-w-2xl mx-auto mt-20">
      <h3 className="font-display text-xl font-bold mb-8 text-snow">Common questions</h3>
      <div>
        {items.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="border-b border-line/30">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-4 py-5 text-left group"
              >
                <span className="font-mono text-[10px] text-dim/60 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`flex-1 text-sm font-semibold transition-colors duration-200 ${isOpen ? "text-teal" : "text-snow group-hover:text-teal"}`}>
                  {q}
                </span>
                <svg
                  className={`w-4 h-4 text-dim shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div
                className="overflow-hidden transition-all duration-350 ease-out"
                style={{ maxHeight: isOpen ? "200px" : "0px", opacity: isOpen ? 1 : 0, transition: "max-height 0.35s ease-out, opacity 0.25s ease" }}
              >
                <p className="text-sm text-body leading-relaxed pb-5 pl-9 pr-4">{a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Lissajous SVG decoration (per card) ──────────────────────────────── */
function LissajousDecor({ a, b, delta, className }: { a: number; b: number; delta: number; className?: string }) {
  const d = useMemo(() => {
    const N = 360;
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const tt = (i / N) * Math.PI * 2;
      const x = (40 + 36 * Math.sin(a * tt + delta)).toFixed(2);
      const y = (20 + 16 * Math.sin(b * tt)).toFixed(2);
      pts.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
    }
    return pts.join(" ") + " Z";
  }, [a, b, delta]);

  return (
    <svg viewBox="0 0 80 40" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
        className="pricing-lissajous" />
    </svg>
  );
}

/* ── Individual credit card ────────────────────────────────────────────── */
function CreditCard({
  title, credits, packCredits, price, badge, highlighted,
  la, lb, ldelta, accentClass, borderClass, ctaClass,
}: {
  title: string; credits: string; packCredits: number; price: string; badge?: string; highlighted: boolean;
  la: number; lb: number; ldelta: number;
  accentClass: string; borderClass: string; ctaClass: string;
}) {
  const { T } = useT();
  const L = T.landing;
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hover, setHover] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 2;
    const y = ((e.clientY - top) / height - 0.5) * 2;
    setTilt({ rx: -y * 5, ry: x * 7 });
    if (!hover) setHover(true);
  };
  const handleLeave = () => { setTilt({ rx: 0, ry: 0 }); setHover(false); };

  const costs: [string, number][] = [
    [L.costPredict, CREDIT_COSTS.exam_prediction],
    [L.costMark,    CREDIT_COSTS.ai_marking],
    [L.costTutor,   CREDIT_COSTS.study_chat],
    [L.costPaper,   CREDIT_COSTS.paper_prediction],
  ];

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`reveal relative rounded-2xl ${borderClass} bg-ink-2/90 p-7 flex flex-col ${highlighted ? "md:-mt-5 md:pb-9 md:pt-9" : ""}`}
      style={{
        transform: hover
          ? `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.09s ease-out, box-shadow 0.2s ease",
        boxShadow: hover && highlighted
          ? "0 30px 80px -20px rgba(40,185,165,0.18)"
          : undefined,
      }}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className={`text-[10px] font-bold px-4 py-1 rounded-full whitespace-nowrap tracking-widest ${highlighted ? "bg-teal text-ink" : "bg-gold text-on-gold"}`}>
            {badge}
          </span>
        </div>
      )}

      <LissajousDecor a={la} b={lb} delta={ldelta}
        className={`w-full h-8 mb-5 transition-opacity duration-300 ${accentClass} ${hover ? "opacity-60" : "opacity-25"}`} />

      <p className={`font-mono text-[10px] tracking-[0.18em] uppercase mb-2 ${accentClass}`}>{title}</p>
      <p className="font-display text-[2.8rem] font-bold leading-none text-snow mb-1">{credits}</p>
      <p className={`text-2xl font-semibold mb-7 ${accentClass}`}>TZS {price}</p>

      <div className="space-y-0 mb-7 flex-1">
        {costs.map(([label, cost]) => (
          <div key={label} className="flex items-center justify-between py-2.5 border-b border-line/30">
            <span className="text-sm text-body">{label}</span>
            <span className={`font-mono text-xs font-bold ${accentClass}`}>
              {cost} {L.creditUnit} · ≈{Math.floor(packCredits / cost)} uses
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-dim text-center mb-3 leading-snug">{L.payPrompt}</p>
      <button
        type="button"
        className={`w-full text-center rounded-xl font-semibold py-3 text-sm transition-colors ${ctaClass}`}
      >
        {L.buyBtn}
      </button>
    </div>
  );
}

/* ── Main landing page ────────────────────────────────────────────────────── */
export function LandingClient() {
  const { T, lang, setLang } = useT();
  const L = T.landing;
  useReveal();
  const [howStep, setHowStep] = useState(0);
  const [howPaused, setHowPaused] = useState(false);

  useEffect(() => {
    if (howPaused) return;
    const id = setInterval(() => setHowStep((s) => (s + 1) % L.steps.length), 4800);
    return () => clearInterval(id);
  }, [howPaused, L.steps.length]);

  const pickStep = (i: number) => {
    setHowStep(i);
    setHowPaused(true);
  };

  const lead = [L.features[0], L.features[4]];
  const mid  = [L.features[1], L.features[2], L.features[5]];
  const compact = [L.features[3], L.features[6], L.features[7]];

  return (
    <>
      <BackgroundCanvas />

      <div className="relative min-h-screen text-snow" style={{ zIndex: 1 }}>

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 rounded-full border border-line/70 bg-ink/70 backdrop-blur-xl shadow-xl shadow-black/40 max-w-[calc(100vw-1.5rem)]">
          <Link href="/" className="flex items-center gap-2 px-1 mr-1 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-7 h-7 rounded-md shrink-0" />
            <span className="hidden sm:inline font-display text-[15px] font-bold tracking-tight whitespace-nowrap">Tausi</span>
          </Link>
          <div className="hidden md:flex items-center text-sm text-body">
            <Link href="/discover" className="hover:text-snow px-3 py-2 rounded-full hover:bg-snow/10 transition-colors whitespace-nowrap">{T.nav.discover}</Link>
            <Link href="#features" className="hover:text-snow px-3 py-2 rounded-full hover:bg-snow/10 transition-colors whitespace-nowrap">{L.featuresTitle}</Link>
            <Link href="#pricing" className="hover:text-snow px-3 py-2 rounded-full hover:bg-snow/10 transition-colors whitespace-nowrap">{L.pricingTitle}</Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <div className="flex items-center rounded-full border border-line overflow-hidden">
              {(["en", "sw"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer ${lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"}`}>
                  {l === "en" ? "EN" : "SW"}
                </button>
              ))}
            </div>
            <Link href="/login" className="hidden md:block text-sm text-body hover:text-snow px-3.5 py-2 rounded-full hover:bg-snow/10 transition-colors whitespace-nowrap">
              {T.nav.signIn}
            </Link>
            <Link href="/signup" className="text-xs sm:text-sm font-semibold text-on-gold bg-gold hover:bg-gold-hover px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors whitespace-nowrap">
              {T.nav.signUp}
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative pt-32 sm:pt-40 pb-20 px-4 overflow-visible">
          {/* Iridescent glow — purely atmospheric */}
          <div className="iridescent opacity-70 pointer-events-none" aria-hidden="true" />
          {/* Feather arc — top-right decoration */}
          <div className="absolute -top-24 -right-24 w-[480px] h-[480px] pointer-events-none opacity-60" aria-hidden="true">
            <FeatherArcs className="feather-spin w-full h-full" />
          </div>

          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.05fr] gap-14 lg:gap-10 items-center">
            {/* Text column */}
            <div className="text-center lg:text-left">
              <div className="hero-rise hero-rise-1 inline-flex items-center gap-2 rounded-full border border-teal-deep bg-teal-deep/20 px-4 py-1.5 text-xs text-teal font-medium mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                {L.badge}
              </div>

              <h1 className="hero-rise hero-rise-2 font-display text-[clamp(2.4rem,4.5vw+0.5rem,4.5rem)] leading-[1.04] font-bold tracking-tight mb-6">
                {L.headline1}
                <br />
                <span className="text-teal">{L.headline2}</span>
              </h1>

              <p className="hero-rise hero-rise-3 text-base sm:text-lg text-body max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed">
                {L.subheadline}
              </p>

              <div className="hero-rise hero-rise-4 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                <Link href="/signup"
                  className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-on-gold font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-black/30 hover:-translate-y-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {L.ctaPrimary}
                </Link>
                <Link href="/discover"
                  className="flex items-center gap-2 border border-line-2 hover:border-teal text-body hover:text-snow font-medium px-7 py-3.5 rounded-xl transition-all duration-200 text-sm hover:-translate-y-0.5">
                  {L.ctaSecondary}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <p className="hero-rise hero-rise-4 text-xs text-dim mt-6">{L.proofLine}</p>
            </div>

            {/* Animated product window column */}
            <div className="hero-rise hero-rise-3 px-4 sm:px-8 lg:px-0">
              <HeroProductWindow />
            </div>
          </div>

          {/* Exam boards strip */}
          <div className="relative max-w-6xl mx-auto mt-20 pt-8 border-t border-line/40">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {BOARDS.map((b) => (
                <span key={b} className="font-mono text-xs sm:text-sm tracking-[0.2em] text-dim">{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section id="features" className="py-24 px-4 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <div className="reveal max-w-2xl mb-14">
              <h2 className="font-display text-3xl sm:text-[2.6rem] sm:leading-tight font-bold mb-4">{L.featuresHeading}</h2>
              <p className="text-body">{L.featuresSub}</p>
            </div>

            {/* Two lead feature panels */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="reveal feat-card-teal feat-accent-teal rounded-2xl border border-line bg-ink-2/90 p-7 flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.18em] text-teal-deep uppercase mb-4 block">Exam Prediction</span>
                <PredictVisual />
                <h3 className="font-display text-xl font-bold mt-5 mb-2 text-snow">{lead[0].title}</h3>
                <p className="text-sm text-body leading-relaxed flex-1">{lead[0].desc}</p>
              </div>
              <div className="reveal feat-card-gold feat-accent-gold rounded-2xl border border-line bg-ink-2/90 p-7 flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.18em] text-gold/50 uppercase mb-4 block">AI Marking</span>
                <MarkingVisual />
                <h3 className="font-display text-xl font-bold mt-5 mb-2 text-snow">{lead[1].title}</h3>
                <p className="text-sm text-body leading-relaxed flex-1">{lead[1].desc}</p>
              </div>
            </div>

            {/* Three supporting feature cards */}
            <div className="grid sm:grid-cols-3 gap-5 mb-10">
              <div className="reveal feat-card-teal feat-accent-teal rounded-2xl border border-line bg-ink-2/90 p-6 flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.18em] text-teal-deep uppercase mb-3 block">Intelligent Tutor</span>
                <TutorVisual />
                <h3 className="font-display text-base font-bold mb-1.5 mt-4 text-snow">{mid[0].title}</h3>
                <p className="text-sm text-body leading-relaxed flex-1">{mid[0].desc}</p>
              </div>

              <div className="reveal feat-card-coral feat-accent-coral rounded-2xl border border-line bg-ink-2/90 p-6 flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.18em] text-coral/60 uppercase mb-3 block">Past Papers</span>
                <LibraryVisual />
                <h3 className="font-display text-base font-bold mb-1.5 text-snow">{mid[1].title}</h3>
                <p className="text-sm text-body leading-relaxed flex-1">{mid[1].desc}</p>
              </div>

              <div className="reveal feat-card-magenta feat-accent-magenta rounded-2xl border border-line bg-ink-2/90 p-6 flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.18em] text-brand-magenta/50 uppercase mb-3 block">Study Room</span>
                <div className="mx-auto w-full max-w-[180px] rounded-lg border border-line bg-ink p-3 space-y-2 py-3" aria-hidden="true">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-brand-magenta/30 shrink-0" />
                    <div className="h-1.5 flex-1 rounded-sm bg-line" />
                  </div>
                  <div className="h-1.5 w-full rounded-sm bg-teal-deep/60" />
                  <div className="h-1.5 w-10/12 rounded-sm bg-line" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-teal-deep/40 shrink-0" />
                    <div className="h-1.5 flex-1 rounded-sm bg-teal-deep/50" />
                  </div>
                  <div className="h-1.5 w-9/12 rounded-sm bg-line" />
                </div>
                <h3 className="font-display text-base font-bold mb-1.5 mt-4 text-snow">{mid[2].title}</h3>
                <p className="text-sm text-body leading-relaxed flex-1">{mid[2].desc}</p>
              </div>
            </div>

            {/* Compact feature checklist */}
            <div className="reveal grid sm:grid-cols-3 gap-x-8 gap-y-6 rounded-2xl border border-line/50 bg-ink-2/30 p-8">
              {compact.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <CheckIcon className="text-teal mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold mb-1 text-snow">{f.title}</h3>
                    <p className="text-[13px] text-dim leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="border-t border-line/40 py-24 px-4">
          <div className="max-w-6xl mx-auto">

            {/* Heading */}
            <div className="reveal mb-10">
              <h2 className="font-display text-3xl sm:text-[2.6rem] font-bold leading-tight mb-3">{L.howHeading}</h2>
              <p className="text-sm text-body max-w-md">
                Four steps from raw past papers to a predicted exam, fully marked and ready to study.
              </p>
            </div>

            {/* Step tab bar — auto-cycles, click to lock */}
            <div className="reveal flex rounded-xl border border-line overflow-hidden mb-10">
              {L.steps.map((s, i) => {
                const on = howStep === i;
                return (
                  <button
                    key={i}
                    onClick={() => pickStep(i)}
                    className={`relative flex-1 flex flex-col gap-0.5 py-3.5 px-3 sm:px-4 text-left transition-colors border-r border-line last:border-r-0 overflow-hidden ${
                      on ? "bg-ink-2 text-snow" : "text-dim hover:text-body hover:bg-ink-2/40"
                    }`}
                  >
                    <span className="font-mono text-[9px] text-dim/60">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-xs sm:text-[13px] font-semibold leading-tight">{s.title}</span>
                    {/* Auto-cycle progress bar */}
                    {on && !howPaused && (
                      <span
                        key={howStep}
                        className="absolute bottom-0 left-0 h-[2px] bg-teal"
                        style={{ animation: "hiw-progress 4.8s linear forwards" }}
                      />
                    )}
                    {on && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal/20" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main content */}
            <div className="reveal grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 items-start">

              {/* Left: orbital signal canvas (hidden on mobile) */}
              <div className="hidden lg:block relative rounded-2xl border border-line/50 bg-ink-2/40 overflow-hidden" style={{ height: "480px" }}>
                <HowItWorksCanvas
                  activeStep={howStep}
                  onStepClick={pickStep}
                  stepTitles={L.steps.map((s) => s.title)}
                />
              </div>

              {/* Right: step detail panel */}
              <div className="relative" style={{ minHeight: "480px" }}>
                {L.steps.map((s, i) => {
                  const Detail = STEP_DETAILS[i];
                  const on = i === howStep;
                  return (
                    <div
                      key={i}
                      className="absolute inset-0 rounded-2xl border border-line/70 bg-ink-2/90 overflow-y-auto"
                      style={{
                        opacity: on ? 1 : 0,
                        transform: `translateY(${on ? 0 : i < howStep ? -16 : 16}px)`,
                        transition: "opacity 0.4s cubic-bezier(0.25,1,0.5,1), transform 0.4s cubic-bezier(0.25,1,0.5,1)",
                        pointerEvents: on ? "auto" : "none",
                      }}
                    >
                      <div className="px-7 pt-7 pb-3">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="font-display text-[3.8rem] font-black leading-none text-teal/12 select-none tabular-nums mt-0.5 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="pt-2">
                            <h3 className="font-display text-xl font-bold text-snow leading-tight">{s.title}</h3>
                            <p className="text-sm text-body leading-relaxed mt-1.5">{s.desc}</p>
                          </div>
                        </div>
                      </div>
                      {on && (
                        <div className="px-7 pb-7 step-detail">
                          <Detail key={howStep} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Resume auto-cycle hint (shows when paused) */}
            {howPaused && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setHowPaused(false)}
                  className="text-xs text-dim hover:text-teal transition-colors"
                >
                  Resume auto-play
                </button>
              </div>
            )}

          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────── */}
        <section id="pricing" className="relative py-28 px-4 border-t border-line/40 scroll-mt-24 overflow-hidden">

          <div className="relative max-w-5xl mx-auto">
            <div className="reveal text-center mb-16">
              <h2 className="font-display text-3xl sm:text-[2.6rem] sm:leading-tight font-bold mb-4 text-snow">{L.pricingHeading}</h2>
              <p className="text-body max-w-lg mx-auto text-sm leading-relaxed">{L.pricingSub}</p>
            </div>

            {/* Credit pack cards — Scholar elevated in center */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center mb-12">
              <CreditCard
                title={L.starterTitle}
                credits={L.starterCredits}
                packCredits={20}
                price="2,500"
                highlighted={false}
                la={1} lb={2} ldelta={Math.PI / 2}
                accentClass="text-teal"
                borderClass="border border-teal/20"
                ctaClass="border border-teal/40 hover:border-teal text-body hover:text-snow"
              />
              <CreditCard
                title={L.scholarTitle}
                credits={L.scholarCredits}
                packCredits={60}
                price="6,000"
                badge={L.scholarBadge}
                highlighted={true}
                la={3} lb={2} ldelta={Math.PI / 4}
                accentClass="text-teal"
                borderClass="border-2 border-teal/60"
                ctaClass="bg-teal text-ink hover:bg-teal/90 font-bold"
              />
              <CreditCard
                title={L.championTitle}
                credits={L.championCredits}
                packCredits={175}
                price="15,000"
                highlighted={false}
                la={3} lb={5} ldelta={Math.PI / 3}
                accentClass="text-gold"
                borderClass="border border-gold/30"
                ctaClass="border border-gold/40 hover:border-gold text-body hover:text-snow"
              />
            </div>

            <p className="text-center text-xs text-dim mb-20">Accepted: {L.payMethods}</p>

            {/* FAQ accordion */}
            <FaqAccordion />
          </div>
        </section>

        {/* ── Subjects ticker ───────────────────────────────────── */}
        <section className="py-16 border-t border-line/40 overflow-hidden">
          <p className="reveal text-center text-sm text-dim mb-8 px-4">{L.subjectsHeading}</p>
          <div className="ticker-mask overflow-hidden">
            <div className="ticker-track flex w-max gap-2.5 px-1.5">
              {SUBJECTS.map((s) => (
                <span key={s} className="shrink-0 px-4 py-2 rounded-full border border-line bg-ink-2/80 text-sm text-body whitespace-nowrap">{s}</span>
              ))}
              <span className="ticker-dup flex gap-2.5" aria-hidden="true">
                {SUBJECTS.map((s) => (
                  <span key={s} className="shrink-0 px-4 py-2 rounded-full border border-line bg-ink-2/80 text-sm text-body whitespace-nowrap">{s}</span>
                ))}
              </span>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="py-24 px-4">
          <div className="reveal relative max-w-5xl mx-auto overflow-hidden rounded-3xl bg-gold px-6 py-16 sm:py-20 text-center text-on-gold">
            <FeatherArcs className="absolute -bottom-40 -left-40 w-[480px] h-[480px] opacity-60 [&_path]:stroke-[oklch(0.21_0.04_80)] pointer-events-none" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5">{L.ctaBannerHeading}</h2>
              <p className="text-on-gold/80 mb-9 max-w-lg mx-auto text-sm sm:text-base">{L.ctaBannerSub}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup"
                  className="flex items-center gap-2 bg-ink text-snow hover:bg-ink-3 font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-xl shadow-black/20 hover:-translate-y-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {L.ctaBannerBtn}
                </Link>
                <Link href="/login" className="text-sm font-medium text-on-gold/80 hover:text-on-gold transition-colors underline underline-offset-4 decoration-on-gold/40">
                  {L.alreadyAccount}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="border-t border-line/40 py-10 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-6 h-6 rounded-md" />
              <span className="font-display text-sm font-semibold text-body">Tausi</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-dim">
              <Link href="/discover" className="hover:text-snow transition-colors">{T.nav.discover}</Link>
              <Link href="/pricing" className="hover:text-snow transition-colors">{L.pricingTitle}</Link>
              <Link href="/login" className="hover:text-snow transition-colors">{T.nav.signIn}</Link>
              <Link href="/signup" className="hover:text-snow transition-colors">{T.nav.signUp}</Link>
            </div>
            <p className="text-xs text-dim">{L.poweredBy}</p>
          </div>
        </footer>
      </div>
    </>
  );
}
