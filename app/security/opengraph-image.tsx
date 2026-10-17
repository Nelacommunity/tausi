import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi Security";

export default function Image() {
  return ogImage({
    accent: "magenta",
    eyebrow: "Trust",
    title: "Security at Tausi",
    subtitle: "How we protect student and teacher data — and how to report an issue.",
  });
}
