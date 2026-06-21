import type { Metadata } from "next";
import { BRAND_KEYWORDS } from "@/app/lib/seo";
import { LegalArticle } from "@/app/components/LegalArticle";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tausi collects, uses, and protects your personal data. Available in English and Kiswahili.",
  keywords: [...BRAND_KEYWORDS, "Tausi privacy policy", "Tausi data protection"],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tausi.app/privacy" },
};

export default function PrivacyPage() {
  return <LegalArticle doc="privacy" />;
}
