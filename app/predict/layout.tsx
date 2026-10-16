import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice paper",
  description: "Upload past papers and Tausi builds a new practice paper in the same format, with a marking scheme and weak-points analysis.",
  robots: { index: false, follow: false },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
