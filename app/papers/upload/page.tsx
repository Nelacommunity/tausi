"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";

const EXAM_TYPES = [
  { value: "NECTA",     label: "NECTA (Tanzania)" },
  { value: "KCSE",      label: "KCSE (Kenya)" },
  { value: "KCPE",      label: "KCPE (Kenya)" },
  { value: "IGCSE",     label: "IGCSE (Cambridge)" },
  { value: "CAMBRIDGE_ALEVEL", label: "A-Level (Cambridge)" },
  { value: "IEB",       label: "IEB (South Africa)" },
  { value: "NSC",       label: "NSC / Matric (South Africa)" },
  { value: "WAEC",      label: "WAEC" },
  { value: "NECO",      label: "NECO (Nigeria)" },
  { value: "ZIMSEC",    label: "ZIMSEC (Zimbabwe)" },
  { value: "UNEB",      label: "UNEB (Uganda)" },
  { value: "UACE",      label: "UACE (Uganda)" },
  { value: "JC",        label: "Junior Certificate" },
  { value: "OTHER",     label: "Other" },
];

const SUBJECTS = [
  "Mathematics", "Additional Mathematics", "Physics", "Chemistry", "Biology",
  "Combined Science", "English Language", "English Literature", "Kiswahili",
  "History", "Geography", "Economics", "Commerce", "Business Studies",
  "Accounting", "Computer Science", "Information Technology", "Agriculture",
  "Home Economics", "Religious Education", "Art & Design", "Music",
  "Physical Education", "French", "Arabic", "Chinese",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
    </span>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const { T } = useT();
  const U = T.upload;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName]         = useState("");
  const [examType, setExamType] = useState("");
  const [year, setYear]         = useState("");
  const [subject, setSubject]   = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [files, setFiles]       = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase]        = useState<"uploading" | "analysing">("uploading");
  const [error, setError]       = useState("");

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => ACCEPTED.includes(f.type));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...valid.filter(f => !existing.has(f.name + f.size))];
    });
  }, []);

  const submit = async () => {
    const resolvedSubject = subject === "Other" ? customSubject.trim() : subject;
    if (!name.trim())        { setError("Exam name is required"); return; }
    if (!examType)           { setError("Select an exam type"); return; }
    if (!year)               { setError("Select a year"); return; }
    if (!resolvedSubject)    { setError("Subject is required"); return; }
    if (!files.length)       { setError("Upload at least one file"); return; }

    setError(""); setUploading(true); setPhase("uploading");
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("exam_type", examType);
    fd.append("year", year);
    fd.append("subject", resolvedSubject);
    files.forEach(f => fd.append("files", f));

    try {
      const res = await fetch("/api/papers", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      // Phase 2: extract exam structure so library generation is instant next time
      setPhase("analysing");
      await fetch(`/api/papers/${data.id}/analyze`, { method: "POST" }).catch(() => {});

      router.push("/papers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/papers" className="hover:text-gray-300 transition-colors">{U.breadcrumb}</Link>
          <span>/</span>
          <span className="text-gray-300">{U.breadcrumbCurrent}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{U.heading}</h1>
          <p className="text-sm text-gray-500">{U.subtitle}</p>
        </div>

        <div className="space-y-5 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              {U.examName} <span className="text-red-400">{U.required}</span>
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)} disabled={uploading}
              placeholder={U.examNamePlaceholder}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Type + Year (two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                {U.examType} <span className="text-red-400">{U.required}</span>
              </label>
              <select
                value={examType} onChange={e => setExamType(e.target.value)} disabled={uploading}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 text-gray-200 text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50 appearance-none"
              >
                <option value="" disabled>{U.selectType}</option>
                {EXAM_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                {U.year} <span className="text-red-400">{U.required}</span>
              </label>
              <select
                value={year} onChange={e => setYear(e.target.value)} disabled={uploading}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 text-gray-200 text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50 appearance-none"
              >
                <option value="" disabled>{U.selectYear}</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              {U.subject} <span className="text-red-400">{U.required}</span>
            </label>
            <select
              value={subject} onChange={e => setSubject(e.target.value)} disabled={uploading}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 text-gray-200 text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50 appearance-none"
            >
              <option value="" disabled>{U.selectSubject}</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Other">{U.otherSubject}</option>
            </select>
            {subject === "Other" && (
              <input
                value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                placeholder={U.otherPlaceholder}
                className="mt-2 w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors"
              />
            )}
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              {U.examFiles} <span className="text-red-400">{U.required}</span>
              <span className="text-gray-600 font-normal ml-1">{U.fileTypes}</span>
            </label>
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                uploading ? "opacity-50 cursor-not-allowed" :
                dragging  ? "border-indigo-500 bg-indigo-950/20" :
                            "border-gray-700 hover:border-gray-500 bg-gray-900/40"
              }`}
            >
              <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-400 mb-1">{U.dropFiles} <span className="text-indigo-400 underline">{U.browse}</span></p>
              <p className="text-xs text-gray-600">{U.dropSub}</p>
              <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                className="hidden" disabled={uploading} />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={f.name + f.size}
                    className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-gray-600 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} disabled={uploading}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={submit} disabled={uploading}
              className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 transition-all"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {phase === "analysing" ? U.analysing : U.uploading}
                </>
              ) : (
                <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>{U.uploadBtn}</>
              )}
            </button>
            <Link href="/papers"
              className="px-5 py-3 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
              {U.cancel}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
