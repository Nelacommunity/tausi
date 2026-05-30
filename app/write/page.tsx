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
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Writer</h1>
            <p className="text-sm text-gray-500 mt-1">
              Write, edit, and create documents with AI assistance
            </p>
          </div>
          <CreateDocButton label="New Document" />
        </div>

        {!docs || docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
              <PenIcon />
            </div>
            <p className="text-gray-300 font-medium mb-1">No documents yet</p>
            <p className="text-sm text-gray-600 mb-6">
              Create your first AI-powered document
            </p>
            <CreateDocButton label="Create Document" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <Link
                key={doc.id}
                href={`/write/${doc.id}`}
                className="group block bg-gray-900 border border-gray-800 hover:border-indigo-700 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-indigo-950/40"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-900/60 transition-colors">
                    <PenIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Updated {formatDate(doc.updated_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
