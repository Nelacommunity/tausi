import type { Metadata } from "next";
import { BRAND_KEYWORDS } from "@/app/lib/seo";
import { LegalArticle } from "@/app/components/LegalArticle";
import { siteUrl } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Tausi — learning diagnosis and practice. Available in English and Kiswahili.",
  keywords: [...BRAND_KEYWORDS, "Tausi terms of service", "Tausi terms", "Tausi terms of use"],
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl("/service") },
};

export default function ServicePage() {
  return <LegalArticle doc="terms" />;
}
