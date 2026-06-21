import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi — AI Exam Prediction for East African Students";

export default function Image() {
  return ogImage({
    accent: "teal",
    eyebrow: "AI Exam Predictor",
    title: "Predict your exams with AI",
    subtitle: "Upload past papers → get predicted exams, marking schemes & an AI tutor. Free for East African students.",
  });
}
