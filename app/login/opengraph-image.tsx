import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Sign in to Tausi";

export default function Image() {
  return ogImage({
    accent: "teal",
    eyebrow: "Welcome back",
    title: "Sign in to Tausi",
    subtitle: "Continue finding weak areas and practising what matters.",
  });
}
