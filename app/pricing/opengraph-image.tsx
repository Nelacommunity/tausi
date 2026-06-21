import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi pricing — pay-as-you-go credits";

export default function Image() {
  return ogImage({
    accent: "gold",
    eyebrow: "Simple credits",
    title: "Pay as you go — no subscriptions",
    subtitle: "Buy credits for exam predictions, marking, tutoring & writing. Starter from TZS 2,500.",
  });
}
