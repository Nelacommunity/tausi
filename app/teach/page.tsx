import type { Metadata } from "next";
import { TeachHome } from "./TeachHome";

export const metadata: Metadata = {
  title: "Teach",
  description: "Build curriculum-aligned practice exams, host them live, and see your class's weak areas.",
  robots: { index: false, follow: false },
};

export default function TeachPage() {
  return <TeachHome />;
}
