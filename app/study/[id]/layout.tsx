import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Session",
  description: "Your AI tutoring session on Tausi — ask questions and study your uploaded material.",
  robots: { index: false, follow: false },
};

export default function StudySessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
