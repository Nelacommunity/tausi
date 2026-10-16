import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "About Tausi";

export default function Image() {
  return ogImage({
    accent: "gold",
    eyebrow: "About",
    title: "Learning diagnosis & practice",
    subtitle: "Find weak areas. Practise what matters.",
  });
}
