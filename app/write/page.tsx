import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import { WriteIndex } from "./WriteIndex";

export const metadata: Metadata = {
  title: "AI Writer",
  description: "Write essays, notes and summaries with Tausi's AI writing assistant.",
  robots: { index: false, follow: false },
};

export default async function WritePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: docs } = await supabase
    .from("write_documents")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return <WriteIndex docs={docs ?? []} />;
}
