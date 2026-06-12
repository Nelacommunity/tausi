import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Buy Credits — Tausi AI",
  description:
    "Pay-as-you-go credits for AI exam predictions, marking schemes, AI marking, and study sessions. No subscriptions — buy what you need.",
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
