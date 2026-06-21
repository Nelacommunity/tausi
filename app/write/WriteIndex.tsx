"use client";

import Link from "next/link";
import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import { CreateDocButton } from "./CreateDocButton";
import { useT } from "@/app/lib/language-context";

const WRITE_ICON = "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125";

interface Doc { id: string; title: string; created_at: string; updated_at: string }

function PenIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function WriteIndex({ docs }: { docs: Doc[] }) {
  const { T } = useT();
  const W = T.writer;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        <PageHero d={WRITE_ICON} accent="magenta" title={T.nav.aiWriter}
          subtitle={W.noDocumentsSub}
          action={<CreateDocButton />}
        />

        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center card-enter card-enter-1">
            <div className="w-20 h-20 rounded-3xl bg-ink-2 border border-line flex items-center justify-center mb-5 text-dim">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={WRITE_ICON} />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-body mb-2">{W.noDocuments}</h2>
            <p className="text-sm text-dim mb-8 max-w-xs">{W.noDocumentsSub}</p>
            <CreateDocButton firstDoc />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc, i) => (
              <Link key={doc.id} href={`/write/${doc.id}`}
                className={`group block bg-ink-2/50 border border-line hover:border-brand-magenta/40 hover:bg-ink-2 rounded-2xl p-5 transition-all cursor-pointer card-enter card-enter-${Math.min(i + 1, 5)}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-magenta/10 border border-brand-magenta/20 flex items-center justify-center shrink-0 text-brand-magenta group-hover:bg-brand-magenta/15 transition-colors">
                    <PenIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-body truncate group-hover:text-snow transition-colors leading-snug">
                      {doc.title}
                    </p>
                    <p className="text-xs text-dim mt-1">{W.updatedPrefix} {formatDate(doc.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dim">{formatDate(doc.created_at)}</span>
                  <svg className="w-4 h-4 text-dim group-hover:text-brand-magenta transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
