import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi Terms of Service";

export default function Image() {
  return ogImage({
    accent: "magenta",
    eyebrow: "Legal",
    title: "Terms of Service",
    subtitle: "The terms that govern your use of Tausi.",
  });
}
