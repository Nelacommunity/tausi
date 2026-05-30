import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tausi — AI Exam Prediction for East African Students";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.15)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(167,139,250,0.1)",
            filter: "blur(60px)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99,102,241,0.2)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: 100,
            padding: "6px 18px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#818cf8",
            }}
          />
          <span style={{ color: "#a5b4fc", fontSize: 16, fontWeight: 500 }}>
            Powered by Gemini 2.5 Flash
          </span>
        </div>

        {/* Logo + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "white",
            }}
          >
            T
          </div>
          <span
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            Tausi
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.3,
            marginBottom: 20,
          }}
        >
          AI Exam Prediction for{" "}
          <span style={{ color: "#818cf8" }}>East African Students</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 22,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          Upload NECTA · KCSE · IGCSE · WAEC past papers → get predicted exams, marking schemes & AI tutoring
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 48,
            fontSize: 18,
            color: "#475569",
            fontWeight: 600,
          }}
        >
          tausi.app
        </div>
      </div>
    ),
    { ...size }
  );
}
