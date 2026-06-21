import type { Metadata } from "next";
import { BRAND_KEYWORDS } from "@/app/lib/seo";
import { LegalArticle } from "@/app/components/LegalArticle";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Tausi uses cookies and local storage. We keep it minimal — no advertising or cross-site tracking. Available in English and Kiswahili.",
  keywords: [...BRAND_KEYWORDS, "Tausi cookie policy", "Tausi cookies"],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tausi.app/cookies" },
};

export default function CookiesPage() {
  return <LegalArticle doc="cookies" />;
}
