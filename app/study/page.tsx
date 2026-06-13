"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import type { StudySession } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";

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
    <div className="min-h-screen bg-ink text-snow">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <div>
          <h1 className="font-display text-2xl font-bold text-snow mb-1">{S.heading}</h1>
          <p className="text-sm text-dim">{S.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-line bg-ink-2/50 p-6 space-y-5">

          <div>
            <label className="text-xs font-medium text-dim block mb-1.5">
              {S.sessionTitle} <span className="text-dim/60">({T.common.optional})</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={isCreating}
              placeholder={S.titlePlaceholder}
              className="w-full rounded-xl bg-ink border border-line focus:border-teal text-body placeholder-dim text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50" />
          </div>

          <div>
            <label className="text-xs font-medium text-dim block mb-1.5">
              Exam paper(s) or study documents <span className="text-bad">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging ? "border-teal bg-teal-deep/20" : "border-line hover:border-line-2 bg-ink-2/40"
              }`}
            >
              <svg className="w-9 h-9 text-dim mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-body font-medium">
                {T.dashboard.dropFiles} <span className="text-teal underline">{T.dashboard.browse}</span>
              </p>
              <p className="text-xs text-dim mt-1">{S.filesHint} — {S.files}</p>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple
                onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                className="hidden" />
            </div>

            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <li key={f.name + f.size}
                    className="flex items-center gap-2 text-xs text-dim bg-ink-3/60 border border-line rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 truncate text-body">{f.name}</span>
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} disabled={isCreating}
                      className="text-dim hover:text-bad transition-colors disabled:opacity-50">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-bad/50 bg-bad/10 px-4 py-2.5 text-sm text-bad">{error}</div>
          )}

          <button onClick={startSession} disabled={isCreating || !files.length}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-teal hover:bg-teal/90 disabled:bg-ink-3 disabled:text-dim text-ink font-semibold py-3 transition-all gen-pulse">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {isCreating ? <>{S.starting}<LoadingDots /></> : S.startSession}
          </button>
        </div>

        {/* Past sessions */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-dim">{S.prevSessions}</h2>
          {loadingSessions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 rounded-xl bg-ink-2/50 border border-line animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-line bg-ink-2/30 p-6 text-center text-sm text-dim">
              {S.noSessions}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map(s => (
                <a key={s.id} href={`/study/${s.id}`}
                  className="block rounded-xl border border-line bg-ink-2/50 hover:bg-ink-2 hover:border-line-2 p-4 transition-all group">
                  <h3 className="text-sm font-semibold text-body group-hover:text-snow truncate mb-1">{s.title}</h3>
                  <p className="text-xs text-dim truncate mb-1">{s.original_filenames?.join(", ")}</p>
                  <p className="text-xs text-dim/60">{formatDate(s.created_at)}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
