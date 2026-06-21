import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import type { ExamPaper } from "@/app/lib/types";
import { PaperView } from "./PaperView";

export const metadata: Metadata = {
  title: "Exam Paper",
  description: "View an uploaded past paper and its AI-analysed structure on Tausi.",
  robots: { index: false, follow: false },
};

export default async function PaperViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: paper, error } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !paper) notFound();

  const { data: urlData } = await supabase.storage
    .from("exam-papers")
    .createSignedUrls(paper.file_paths as string[], 3600);

  const signedUrls = (urlData ?? [])
    .map((u) => u.signedUrl ?? "")
    .filter(Boolean);

  return <PaperView paper={paper as ExamPaper} signedUrls={signedUrls} />;
}
