import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { Header } from "@/app/components/Header";
import { CreateDocButton } from "./CreateDocButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PenIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

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

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-bottom-nav md:pb-10">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10 page-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center shrink-0 text-teal">
              <PenIcon />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-snow">AI Writer</h1>
              <p className="text-sm text-dim mt-0.5">Write and edit documents with AI assistance</p>
            </div>
          </div>
          <CreateDocButton label="New Document" />
        </div>

        {!docs || docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center card-enter card-enter-1">
            <div className="w-20 h-20 rounded-3xl bg-ink-2 border border-line flex items-center justify-center mb-5 text-dim">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-body mb-2">No documents yet</h2>
            <p className="text-sm text-dim mb-8 max-w-xs">Your AI-powered documents will appear here. Create your first one to get started.</p>
            <CreateDocButton label="Create your first document" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc, i) => (
              <Link
                key={doc.id}
                href={`/write/${doc.id}`}
                className={`group block bg-ink-2/50 border border-line hover:border-teal/40 hover:bg-ink-2 rounded-2xl p-5 transition-all cursor-pointer card-enter card-enter-${Math.min(i + 1, 5)}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0 text-teal group-hover:bg-teal/15 transition-colors">
                    <PenIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-body truncate group-hover:text-snow transition-colors leading-snug">
                      {doc.title}
                    </p>
                    <p className="text-xs text-dim mt-1">Updated {formatDate(doc.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dim">{formatDate(doc.created_at)}</span>
                  <svg className="w-4 h-4 text-dim group-hover:text-teal transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
