import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — Free & Premium Plans",
  description:
    "Tausi is free for all East African students. Upgrade to Premium (TZS 5,000/month) for 25× higher AI usage limits on exam predictions, marking schemes, AI marking, and study sessions. Pay via M-Pesa, Airtel Money, or Tigo Cash.",
  alternates: { canonical: "https://tausi.app/pricing" },
  openGraph: {
    url: "https://tausi.app/pricing",
    title: "Tausi Pricing — Free & Premium for East African Students",
    description:
      "Start free — no card needed. Upgrade for 25× more AI exam predictions, marking schemes, and tutoring sessions. Pay via M-Pesa, Airtel Money, or Tigo Cash.",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
