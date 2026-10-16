import type { Metadata } from "next";
import { withSharedKeywords } from "@/app/lib/seo";
import { AboutClient } from "./AboutClient";
import { siteUrl } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "About Tausi",
  description:
    "Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.",
  keywords: withSharedKeywords(
    "About Tausi", "learning diagnosis", "practice exams",
    "who made Tausi", "Tausi company",
  ),
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl("/about") },
};

export default function AboutPage() {
  return <AboutClient />;
}
