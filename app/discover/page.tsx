import Link from "next/link";
import type { Metadata } from "next";
import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import { withSharedKeywords } from "@/app/lib/seo";
import type { Exam } from "@/app/lib/types";
import { SITE_URL } from "@/app/lib/site";

const DISCOVER_ICON = "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z";

const APP_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Discover — Public Practice Papers",
  description:
    "Browse community-shared practice papers. Study from public practice exams created by students on Tausi.",
  keywords: withSharedKeywords(
    "discover exam papers", "public practice papers", "browse NECTA papers",
    "ACSEE past papers", "CSEE past papers", "shared exam papers Tanzania",
    "free past papers", "practice papers East Africa",
  ),
  alternates: { canonical: `${APP_URL}/discover` },
  openGraph: {
    url: `${APP_URL}/discover`,
    title: "Discover Public Practice Papers | Tausi",
    description:
      "Browse practice papers shared by the Tausi community.",
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

  const user = await getAuthUser(supabase);

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
    name: "Public Practice Papers on Tausi",
    description: "Community-shared practice papers.",
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
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ── Page hero ───────────────────────────────────── */}
        <PageHero d={DISCOVER_ICON} accent="coral" title="Discover"
          subtitle="Browse practice papers shared by the community"
          action={!user && (
            <Link href="/signup"
              className="shrink-0 rounded-xl bg-coral hover:opacity-90 text-white font-bold px-4 py-2.5 text-sm transition-opacity cursor-pointer">
              Join free
            </Link>
          )}
        />

        {/* ── Stats tiles (bento) ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 card-enter card-enter-1">
          <div className="rounded-2xl border border-coral/20 bg-coral/10 text-coral p-4 flex flex-col gap-1">
            <span className="font-display text-2xl font-bold leading-none">{publicExams.length}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Public exams</span>
          </div>
          <div className="rounded-2xl border border-teal/20 bg-teal/10 text-teal p-4 flex flex-col gap-1">
            <span className="font-display text-2xl font-bold leading-none">{new Set(publicExams.map((e) => e.user_id)).size}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Contributors</span>
          </div>
          {!user ? (
            <Link href="/login"
              className="rounded-2xl border border-line bg-ink-2/40 hover:bg-ink-2 hover:border-teal/30 p-4 flex flex-col justify-center gap-1 transition-all col-span-2 sm:col-span-1 cursor-pointer group">
              <span className="text-sm font-bold text-body group-hover:text-snow transition-colors">Sign in →</span>
              <span className="text-[11px] text-dim">to create &amp; save your own exams</span>
            </Link>
          ) : (
            <Link href="/dashboard"
              className="rounded-2xl border border-gold/20 bg-gold/10 hover:bg-gold/15 p-4 flex flex-col justify-center gap-1 transition-all col-span-2 sm:col-span-1 cursor-pointer group text-gold">
              <span className="text-sm font-bold transition-colors">Create exam →</span>
              <span className="text-[11px] opacity-70">build a practice paper</span>
            </Link>
          )}
        </div>

        {publicExams.length === 0 ? (
          <div className="rounded-2xl border border-line bg-ink-2/40 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-ink-3 border border-line flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-body mb-1">No public exams yet</p>
            <p className="text-xs text-dim mb-4">Be the first to share a practice paper with the community.</p>
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
                  className="block rounded-xl border border-line bg-ink-2/60 hover:bg-ink-2 hover:border-coral/40 p-5 transition-all group cursor-pointer">
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
