import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi Privacy Policy";

export default function Image() {
  return ogImage({
    accent: "magenta",
    eyebrow: "Legal",
    title: "Privacy Policy",
    subtitle: "How Tausi collects, uses, and protects your data.",
  });
}
