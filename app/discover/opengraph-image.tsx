import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Discover practice papers on Tausi";

export default function Image() {
  return ogImage({
    accent: "coral",
    eyebrow: "Community Library",
    title: "Discover practice papers",
    subtitle: "Browse practice papers shared by students — free to study.",
  });
}
