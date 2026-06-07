import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";
import { api } from "@/lib/polar";

export const metadata: Metadata = {
  title: "Pricing — Free & Premium Plans",
  description:
    "Tausi is free for all East African students. Upgrade to Premium for higher AI usage limits on exam predictions, marking schemes, AI marking, and study sessions.",
  alternates: { canonical: "https://tausi.app/pricing" },
  openGraph: {
    url: "https://tausi.app/pricing",
    title: "Tausi Pricing — Free & Premium for East African Students",
    description:
      "Start free — no card needed. Upgrade for more AI exam predictions, marking schemes, and tutoring sessions.",
  },
};

async function getPolarProducts() {
  const productId = process.env.PRODUCT_ID;
  if (!productId) return [];
  try {
    const product = await api.products.get({ id: productId });
    return [product];
  } catch (err) {
    console.error("[polar] products.get failed:", err);
    return [];
  }
}

export default async function PricingPage() {
  const products = await getPolarProducts();
  return <PricingClient products={products} />;
}
