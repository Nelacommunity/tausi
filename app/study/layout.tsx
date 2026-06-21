import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Room",
  description: "Chat with Tausi's AI tutor about your notes and past papers — explanations, summaries and practice.",
  robots: { index: false, follow: false },
};

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
