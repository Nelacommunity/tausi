import type { Metadata } from "next";
import { LearnHome } from "./LearnHome";

export const metadata: Metadata = {
  title: "My learning",
  description: "Your weak areas, mastery per topic and readiness per level.",
  robots: { index: false, follow: false },
};

export default function LearnPage() {
  return <LearnHome />;
}
