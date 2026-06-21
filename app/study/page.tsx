"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import type { StudySession } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";

const STUDY_ICON = "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

export default function StudyPage() {
  const router = useRouter();
  const { T } = useT();
  const S = T.study;
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/study").then(r => r.json()).then(d => { if (Array.isArray(d)) setSessions(d); }).finally(() => setLoadingSessions(false));
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(f.type));
    setFiles(p => { const ex = new Set(p.map(f => f.name + f.size)); return [...p, ...valid.filter(f => !ex.has(f.name + f.size))]; });
  }, []);

  const startSession = async () => {
    if (!files.length) { setError("Upload at least one exam paper or study document."); return; }
    setError(""); setIsCreating(true);
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    fd.append("title", title || files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    try {
      const res = await fetch("/api/study", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
      const { id } = await res.json();
      router.push(`/study/${id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); setIsCreating(false); }
  };

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ── Page hero ───────────────────────────────────── */}
        <PageHero d={STUDY_ICON} accent="gold" title={S.heading} subtitle={S.subtitle}
          action={
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gold border border-gold/30 bg-gold/5 px-2.5 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              {S.aiTutor}
            </span>
          }
        />

        {/* ── New session form + side panel (bento) ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 card-enter card-enter-1">
        <div className="lg:col-span-2 rounded-2xl border border-line bg-ink-2/40 p-6 sm:p-8 space-y-6">

          <div>
            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-2">
              {S.sessionTitle} <span className="normal-case font-normal opacity-60">({T.common.optional})</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={isCreating}
              placeholder={S.titlePlaceholder}
              className="w-full rounded-xl bg-ink border border-line focus:border-teal text-body placeholder:text-dim/50 text-sm px-4 py-3 outline-none transition-colors disabled:opacity-50" />
          </div>

          <div>
            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-2">
              Documents <span className="text-teal normal-case font-normal">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all select-none ${
                isDragging ? "border-teal bg-teal/5 scale-[1.01]" : "border-line hover:border-teal/40 bg-ink-2/20"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 transition-colors ${
                isDragging ? "bg-teal/20 border-teal/40" : "bg-ink-3 border-line"
              }`}>
                <svg className={`w-7 h-7 transition-colors ${isDragging ? "text-teal" : "text-dim"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-body mb-1">
                Drop files here, or <span className="text-teal">browse</span>
              </p>
              <p className="text-xs text-dim">{S.filesHint} · PDF, PNG, JPG, WEBP</p>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple
                onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                className="hidden" />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li key={f.name + f.size}
                    className="flex items-center gap-3 bg-ink border border-line rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <span className="flex-1 truncate text-sm text-body font-medium">{f.name}</span>
                    <span className="text-xs text-dim shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} disabled={isCreating}
                      className="p-1 rounded-md text-dim hover:text-bad hover:bg-bad/10 transition-colors disabled:opacity-50 cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-bad/30 bg-bad/8 px-4 py-3 text-sm text-bad">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <button onClick={startSession} disabled={isCreating || !files.length}
            className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-teal hover:opacity-90 disabled:bg-ink-3 disabled:text-dim disabled:cursor-not-allowed text-ink font-bold py-4 text-base transition-all cursor-pointer">
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-ink/40 border-t-ink rounded-full animate-spin" />
                {S.starting}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                {S.startSession}
              </>
            )}
          </button>
        </div>

          {/* ── Side panel (bento) ─────────────────────────── */}
          <div className="grad-side-gold rounded-2xl border border-line overflow-hidden relative">
            <div className="relative p-5 flex flex-col gap-4 h-full">
              <p className="text-xs font-bold text-dim uppercase tracking-widest">{S.studySmarter}</p>

              <div className="rounded-xl border border-gold/20 bg-gold/10 text-gold p-4 flex items-center gap-3">
                <span className="font-display text-3xl font-bold leading-none">
                  {loadingSessions ? "—" : sessions.length}
                </span>
                <span className="text-xs font-semibold leading-tight">{S.studySessions}</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-ink/40 p-4 space-y-3 flex-1">
                <p className="text-xs font-semibold text-snow">{S.whatYouCanDo}</p>
                {[
                  { d: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z", t: S.sTip1 },
                  { d: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25", t: S.sTip2 },
                  { d: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", t: S.sTip3 },
                ].map(({ d, t }) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
                    </svg>
                    <p className="text-xs text-dim leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Past sessions ─────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-dim uppercase tracking-widest">{S.prevSessions}</h2>
            {sessions.length > 0 && (
              <span className="text-xs font-semibold text-dim bg-ink-3 border border-line rounded-full px-2 py-0.5">{sessions.length}</span>
            )}
          </div>

          {loadingSessions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-line bg-ink-2/20 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-ink-3 border border-line flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-body">{S.noSessions}</p>
              <p className="text-xs text-dim mt-1">Upload a paper above to start your first session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map((s, i) => (
                <a key={s.id} href={`/study/${s.id}`}
                  className={`group block rounded-2xl border border-line bg-ink-2/40 hover:bg-ink-2 hover:border-teal/30 p-5 transition-all card-enter card-enter-${Math.min(i + 1, 5)}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-body group-hover:text-snow truncate transition-colors">{s.title}</h3>
                      {s.original_filenames?.length > 0 && (
                        <p className="text-xs text-dim truncate mt-0.5">{s.original_filenames.join(", ")}</p>
                      )}
                      <p className="text-xs text-dim/60 mt-1">{formatDate(s.created_at)}</p>
                    </div>
                    <svg className="w-4 h-4 text-dim group-hover:text-teal transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
