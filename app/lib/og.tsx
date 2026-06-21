import { ImageResponse } from "next/og";

/**
 * Shared Open Graph image template for Tausi.
 *
 * Every public route's `opengraph-image.tsx` calls `ogImage(...)` so all social
 * cards share one on-brand (charcoal + teal) design. Colours are plain hex/rgb
 * because Satori (the renderer behind next/og) doesn't support oklch.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type Accent = "teal" | "gold" | "coral" | "magenta";

const ACCENTS: Record<Accent, { glow: string; solid: string; light: string; pillBg: string; pillBorder: string }> = {
  teal:    { glow: "rgba(40,185,165,0.20)",  solid: "#28b9a5", light: "#5fd6c6", pillBg: "rgba(40,185,165,0.15)",  pillBorder: "rgba(40,185,165,0.45)" },
  gold:    { glow: "rgba(240,168,48,0.18)",  solid: "#f0a830", light: "#f6c66a", pillBg: "rgba(240,168,48,0.15)",  pillBorder: "rgba(240,168,48,0.45)" },
  coral:   { glow: "rgba(232,122,92,0.18)",  solid: "#e87a5c", light: "#f0a18a", pillBg: "rgba(232,122,92,0.15)",  pillBorder: "rgba(232,122,92,0.45)" },
  magenta: { glow: "rgba(214,64,154,0.18)",  solid: "#d6409a", light: "#e87ac0", pillBg: "rgba(214,64,154,0.15)",  pillBorder: "rgba(214,64,154,0.45)" },
};

export function ogImage(opts: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  accent?: Accent;
}) {
  const a = ACCENTS[opts.accent ?? "teal"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0a0f13 0%, #0c1719 55%, #081f1d 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent glows */}
        <div style={{ position: "absolute", top: -220, right: -160, width: 620, height: 620, borderRadius: "50%", background: a.glow, filter: "blur(90px)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -200, left: -160, width: 520, height: 520, borderRadius: "50%", background: "rgba(40,185,165,0.10)", filter: "blur(80px)", display: "flex" }} />

        {/* Top row — logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "linear-gradient(135deg, #28b9a5 0%, #1a7f8e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 900,
              color: "#06110f",
            }}
          >
            T
          </div>
          <span style={{ fontSize: 40, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>Tausi</span>
        </div>

        {/* Center — eyebrow + title + subtitle */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 10,
              background: a.pillBg,
              border: `1px solid ${a.pillBorder}`,
              borderRadius: 100,
              padding: "8px 18px",
              marginBottom: 28,
            }}
          >
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: a.solid, display: "flex" }} />
            <span style={{ color: a.light, fontSize: 20, fontWeight: 600 }}>{opts.eyebrow}</span>
          </div>

          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.08,
              letterSpacing: "-1.5px",
              display: "flex",
            }}
          >
            {opts.title}
          </div>

          {opts.subtitle && (
            <div style={{ fontSize: 28, color: "#9fb0ad", lineHeight: 1.4, marginTop: 24, display: "flex", maxWidth: 920 }}>
              {opts.subtitle}
            </div>
          )}
        </div>

        {/* Bottom row — url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, color: "#5b6b69", fontWeight: 600 }}>tausi.app</span>
          <span style={{ fontSize: 18, color: a.light, fontWeight: 600 }}>NECTA · KCSE · IGCSE · WAEC · ZIMSEC</span>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
