import type { Metadata } from "next";
import { BRAND_KEYWORDS } from "@/app/lib/seo";
import { LegalArticle } from "@/app/components/LegalArticle";
import { siteUrl } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "How Tausi protects student and teacher data — encryption, access rules, upload checks — and how to report a vulnerability.",
  keywords: [...BRAND_KEYWORDS, "Tausi security", "report a vulnerability"],
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl("/security") },
};

export default function SecurityPage() {
  return <LegalArticle doc="security" />;
}
