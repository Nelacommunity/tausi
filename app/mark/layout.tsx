import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Marker",
  description: "Upload a question paper and your answers — Tausi AI grades them with a score and feedback.",
  robots: { index: false, follow: false },
};

export default function MarkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
