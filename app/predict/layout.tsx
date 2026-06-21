import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Predict Exam",
  description: "Upload past papers and let Tausi AI predict your next exam, complete with a marking scheme.",
  robots: { index: false, follow: false },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
