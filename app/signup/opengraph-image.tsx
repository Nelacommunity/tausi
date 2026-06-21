import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Create your free Tausi account";

export default function Image() {
  return ogImage({
    accent: "teal",
    eyebrow: "Get started free",
    title: "Create your free Tausi account",
    subtitle: "5 free credits on signup. Predict exams, mark answers, and study with AI.",
  });
}
