import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import { Header } from "@/app/components/Header";
import type { Exam } from "@/app/lib/types";

const APP_URL = "https://tausi.app";

export const metadata: Metadata = {
  title: "Discover — Public AI-Predicted Exam Papers",
  description:
    "Browse community-shared AI-predicted exam papers for NECTA, KCSE, IGCSE, WAEC and more. Study from public exams created by East African students on Tausi.",
  alternates: { canonical: `${APP_URL}/discover` },
  openGraph: {
    url: `${APP_URL}/discover`,
    title: "Discover Public Exam Predictions | Tausi",
    description:
      "Browse AI-predicted exam papers shared by the Tausi community. NECTA, KCSE, IGCSE, WAEC and more.",
  },
};

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function DiscoverPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, user_id, title, original_filenames, is_public, created_at, predicted_exam")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(60);

  const publicExams = (exams ?? []) as Exam[];

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Public AI-Predicted Exam Papers on Tausi",
    description: "Community-shared AI-predicted exam papers for NECTA, KCSE, IGCSE, WAEC and other East African examinations.",
    url: `${APP_URL}/discover`,
    numberOfItems: publicExams.length,
    itemListElement: publicExams.slice(0, 50).map((exam, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${APP_URL}/exams/${exam.id}`,
      name: exam.title,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Tausi", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Discover", item: `${APP_URL}/discover` },
    ],
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <JsonLd data={breadcrumbSchema} />
    <div className="min-h-screen bg-ink text-snow md:pl-56">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-bottom-nav md:pb-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-snow mb-1">Discover</h1>
            <p className="text-sm text-dim">Browse AI-predicted exams shared by the community</p>
          </div>
          {!user && (
            <Link href="/signup"
              className="shrink-0 rounded-xl bg-teal hover:opacity-90 text-ink font-bold px-4 py-2 text-sm transition-opacity">
              Join free
            </Link>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-line">
          <div>
            <p className="text-xl font-bold text-snow">{publicExams.length}</p>
            <p className="text-xs text-dim">Public Exams</p>
          </div>
          <div className="w-px h-6 bg-line" />
          <div>
            <p className="text-xl font-bold text-snow">
              {new Set(publicExams.map((e) => e.user_id)).size}
            </p>
            <p className="text-xs text-dim">Contributors</p>
          </div>
          {!user && (
            <>
              <div className="w-px h-6 bg-line" />
              <p className="text-sm text-dim ml-2">
                <Link href="/login" className="text-teal hover:text-snow transition-colors">
                  Sign in
                </Link>{" "}
                to create and save your own exams
              </p>
            </>
          )}
        </div>

        {publicExams.length === 0 ? (
          <div className="rounded-2xl border border-line bg-ink-2/40 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-ink-3 border border-line flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-body mb-1">No public exams yet</p>
            <p className="text-xs text-dim mb-4">Be the first to share a predicted exam with the community.</p>
            {user && (
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-teal hover:text-snow font-medium transition-colors">
                Create an exam →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {publicExams.map((exam) => {
              const isOwn = user?.id === exam.user_id;
              const preview = exam.predicted_exam?.slice(0, 100).replace(/[#*`]/g, "").trim();

              return (
                <Link key={exam.id} href={`/exams/${exam.id}`}
                  className="block rounded-xl border border-line bg-ink-2/60 hover:bg-ink-2 hover:border-teal/40 p-5 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-body group-hover:text-snow line-clamp-2 leading-snug flex-1 transition-colors">
                      {exam.title}
                    </h3>
                    {isOwn && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-deep/60 text-teal border border-teal/20">
                        Mine
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="text-xs text-dim line-clamp-2 mb-3 leading-relaxed">
                      {preview}…
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-dim">
                    <span>{formatDate(exam.created_at)}</span>
                    <span className="flex items-center gap-1 text-good/80">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
                      </svg>
                      Public
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
</>
  );
}
