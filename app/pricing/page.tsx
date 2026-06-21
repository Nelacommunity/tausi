import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";
import { withSharedKeywords } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Pricing & Credits — Tausi AI",
  description:
    "Pay-as-you-go credits for AI NECTA exam predictions (ACSEE, CSEE, FTNA, PSLE), marking schemes, AI marking, and study sessions. No subscriptions — pay with mobile money.",
  keywords: withSharedKeywords(
    "Tausi pricing", "Tausi credits", "buy credits Tanzania", "Tausi price",
    "exam prediction price", "mobile money M-Pesa Airtel", "pay as you go exam app",
  ),
  alternates: { canonical: "https://tausi.app/pricing" },
  openGraph: {
    url: "https://tausi.app/pricing",
    title: "Tausi Credits — AI for East African Students",
    description:
      "Start free with 5 credits. Buy more credit packs via mobile money — M-Pesa, Airtel, Mixx, Halotel.",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
