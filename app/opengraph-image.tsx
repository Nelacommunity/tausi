import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tausi — find weak areas, practise what matters";

export default function Image() {
  return ogImage({
    accent: "teal",
    eyebrow: "Learning diagnosis & practice",
    title: "Find your weak areas. Practise what matters.",
    subtitle: "Curriculum-aligned diagnosis for students, teacher-reviewed practice exams for classes.",
  });
}
