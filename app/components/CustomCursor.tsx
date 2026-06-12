"use client";

import { useEffect, useRef } from "react";

const DOT_SIZES = [5, 4, 3.5, 3, 2.5, 2];
const LERP_RING = 0.14;
const LERP_DOTS = [0.38, 0.30, 0.24, 0.19, 0.15, 0.12];

export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef({
    mx: -200, my: -200,
    rx: -200, ry: -200,
    dots: Array(6).fill(null).map(() => ({ x: -200, y: -200 })),
    hovering: false,
  });

  useEffect(() => {
    const state = stateRef.current;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      state.mx = e.clientX;
      state.my = e.clientY;
    };

    const onEnter = (e: MouseEvent) => {
      const el = e.target as Element;
      const interactive = el.closest('a, button, [role="button"], input, textarea, select, label, [tabindex]');
      if (interactive && !state.hovering) {
        state.hovering = true;
        ringRef.current?.classList.add("is-hovering");
      }
    };

    const onLeave = (e: MouseEvent) => {
      const el = e.target as Element;
      const interactive = el.closest('a, button, [role="button"], input, textarea, select, label, [tabindex]');
      if (interactive && state.hovering) {
        state.hovering = false;
        ringRef.current?.classList.remove("is-hovering");
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onEnter);
    document.addEventListener("mouseout", onLeave);

    const frame = () => {
      const { mx, my, dots } = state;

      // Lerp ring toward cursor
      state.rx += (mx - state.rx) * LERP_RING;
      state.ry += (my - state.ry) * LERP_RING;

      const ring = ringRef.current;
      if (ring) {
        const offset = state.hovering ? 18 : 11;
        ring.style.transform = `translate(${state.rx - offset}px, ${state.ry - offset}px)`;
      }

      // Dot 0 chases the cursor directly
      dots[0].x += (mx - dots[0].x) * LERP_DOTS[0];
      dots[0].y += (my - dots[0].y) * LERP_DOTS[0];

      // Each subsequent dot chases the one ahead
      for (let i = 1; i < 6; i++) {
        dots[i].x += (dots[i - 1].x - dots[i].x) * LERP_DOTS[i];
        dots[i].y += (dots[i - 1].y - dots[i].y) * LERP_DOTS[i];
      }

      const dotEls = dotRefs.current;
      for (let i = 0; i < 6; i++) {
        const el = dotEls[i];
        if (!el) continue;
        const s = DOT_SIZES[i];
        el.style.transform = `translate(${dots[i].x - s / 2}px, ${dots[i].y - s / 2}px)`;
        el.style.opacity = String(((6 - i) / 6) * 0.55);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onEnter);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} id="tausi-cursor-ring" aria-hidden="true" />
      {DOT_SIZES.map((size, i) => (
        <div
          key={i}
          ref={(el) => { dotRefs.current[i] = el; }}
          className="tausi-dot"
          aria-hidden="true"
          style={{ width: size, height: size, opacity: 0 }}
        />
      ))}
    </>
  );
}
