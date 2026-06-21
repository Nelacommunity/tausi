import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Past Paper",
  description: "Add a past exam paper to your Tausi library to power AI exam predictions.",
  robots: { index: false, follow: false },
};

export default function PapersUploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
