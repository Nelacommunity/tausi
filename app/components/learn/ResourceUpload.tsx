"use client";

import { useRef, useState } from "react";
import { useT } from "@/app/lib/language-context";
import { createClient } from "@/app/lib/supabase/client";
import { api } from "./api";
import { Button, ErrorNote, Field, inputClass, Spinner } from "./ui";

const ACCEPT = ".pdf,.docx,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown";
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Upload notes/slides/documents: create the record, send the file straight to
 * Storage with a signed URL, then ask the server to extract text and topics.
 */
export function ResourceUpload({ classes, onDone, compact = false }: {
  classes: { id: string; name: string }[];
  onDone: (resourceId: string) => void;
  compact?: boolean;
}) {
  const L = useT().T.learn;
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | null) => {
    setError(null);
    if (f && f.size > MAX_BYTES) { setError(L.uploadHint); return; }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setStage("uploading");
    let id: string | null = null;
    try {
      const start = await api<{ id: string; path: string; token: string; contentType: string }>("/api/resources", {
        method: "POST",
        json: { title: title.trim() || file.name, fileName: file.name, mimeType: file.type, size: file.size, classId: classId || null },
      });
      id = start.id;
      const { error: upError } = await createClient().storage.from("resources")
        .uploadToSignedUrl(start.path, start.token, file, { contentType: start.contentType });
      if (upError) throw new Error(upError.message);

      setStage("processing");
      await api(`/api/resources/${start.id}/process`, { method: "POST" });
      setFile(null); setTitle(""); if (fileRef.current) fileRef.current.value = "";
      onDone(start.id);
    } catch (err) {
      setError((err as Error).message);
      if (id) onDone(id); // show the failed entry so it can be retried
    }
    setStage("idle");
  };

  const busy = stage !== "idle";
  return (
    <form onSubmit={upload} className="space-y-3">
      <label className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 text-center cursor-pointer transition-colors ${file ? "border-teal/60 bg-teal/5" : "border-line hover:border-line-2"} ${compact ? "py-4" : "py-6"}`}>
        <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" disabled={busy}
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <span className="text-sm font-semibold text-snow">{file ? file.name : L.chooseFile}</span>
        <span className="text-[11px] text-dim">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : L.uploadHint}</span>
      </label>
      {file && (
        <>
          <Field label={L.resourceTitle}>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.resourceTitlePh} maxLength={200} disabled={busy} />
          </Field>
          {classes.length > 0 && (
            <Field label={L.shareWith}>
              <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)} disabled={busy}>
                <option value="">{L.privateOnly}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </>
      )}
      <ErrorNote message={error} />
      <Button type="submit" variant="teal" className="w-full" disabled={!file || busy}>
        {busy ? <><Spinner /> {stage === "uploading" ? L.uploading : L.processingFile}</> : L.upload}
      </Button>
    </form>
  );
}
