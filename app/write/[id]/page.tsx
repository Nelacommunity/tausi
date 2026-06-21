import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import type { WriteDocument } from "@/app/lib/types";
import { WritePage } from "./WritePage";

export const metadata: Metadata = {
  title: "Document",
  description: "Write and edit your document with Tausi's AI writing assistant.",
  robots: { index: false, follow: false },
};

export default async function WriteDocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const { data: doc, error } = await supabase
    .from("write_documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !doc) notFound();

  return (
    <WritePage
      document={doc as WriteDocument}
      userTier={(profile?.tier ?? "free") as "free" | "premium"}
    />
  );
}
