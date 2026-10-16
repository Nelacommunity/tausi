import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generate from Paper",
  description: "Generate a fresh practice paper from this past paper on Tausi.",
  robots: { index: false, follow: false },
};

export default function PaperGenerateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
