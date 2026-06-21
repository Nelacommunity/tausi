import type { Metadata } from "next";
import { withSharedKeywords } from "@/app/lib/seo";
import { AboutClient } from "./AboutClient";

export const metadata: Metadata = {
  title: "About Tausi — A Vylos.co Product",
  description:
    "Tausi is built and operated by Vylos.co, its parent company. Tausi was founded by Aaron Rweyongeza and Brown Mafuru.",
  keywords: withSharedKeywords(
    "About Tausi", "Vylos.co", "Tausi founders", "Aaron Rweyongeza", "Brown Mafuru",
    "who made Tausi", "Tausi company",
  ),
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tausi.app/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
