import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi Cookie Policy";

export default function Image() {
  return ogImage({
    accent: "magenta",
    eyebrow: "Legal",
    title: "Cookie Policy",
    subtitle: "How Tausi uses cookies and local storage — minimal, with no ad tracking.",
  });
}
