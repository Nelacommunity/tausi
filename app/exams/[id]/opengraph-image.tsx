import { createClient } from "@supabase/supabase-js";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "AI-predicted exam paper on Tausi";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let title = "AI-Predicted Exam";
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from("exams")
        .select("title, is_public")
        .eq("id", id)
        .single();
      if (data?.is_public && data.title) {
        title = data.title.length > 80 ? `${data.title.slice(0, 77)}…` : data.title;
      }
    }
  } catch { /* fall back to default title */ }

  return ogImage({
    accent: "teal",
    eyebrow: "Predicted Exam",
    title,
    subtitle: "AI-predicted exam paper with full marking scheme — study free on Tausi.",
  });
}
