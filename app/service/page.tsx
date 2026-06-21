import type { Metadata } from "next";
import { BRAND_KEYWORDS } from "@/app/lib/seo";
import { LegalArticle } from "@/app/components/LegalArticle";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Tausi — AI exam prediction for East African students. Available in English and Kiswahili.",
  keywords: [...BRAND_KEYWORDS, "Tausi terms of service", "Tausi terms", "Tausi terms of use"],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tausi.app/service" },
};

export default function ServicePage() {
  return <LegalArticle doc="terms" />;
}
