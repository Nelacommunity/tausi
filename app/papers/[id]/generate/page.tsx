"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GenerateFromPaper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState("");
  const [error, setError]     = useState("");
  const [phase, setPhase]     = useState<"generating" | "saving" | "done" | "error">("generating");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/papers/${id}/generate`, { method: "POST" });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Generation failed");
        }

        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          if (!cancelled) setPreview(full.replace(/<!--EXAM_ID:[^-]*-->/g, ""));
        }

        const match = full.match(/<!--EXAM_ID:([a-z0-9-]+)-->/);
        if (match?.[1]) {
          setPhase("done");
          if (!cancelled) router.push(`/exams/${match[1]}`);
        } else {
          throw new Error("Generation completed but exam could not be saved.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Generation failed");
          setPhase("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link href="/papers" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <span className="text-sm font-bold text-indigo-400">Tausi</span>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-400">Generating prediction…</span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        {phase !== "error" && (
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-200">
                {phase === "done" ? "Prediction ready — redirecting…" : "Generating predicted exam paper…"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">Tausi AI is analysing the exam and building a new paper</p>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-5">
            <p className="text-sm font-semibold text-red-300 mb-1">Generation failed</p>
            <p className="text-xs text-red-400 mb-4">{error}</p>
            <Link href="/papers"
              className="inline-block text-xs text-white bg-red-700 hover:bg-red-600 rounded-lg px-4 py-2 transition-colors">
              Back to Library
            </Link>
          </div>
        )}

        {preview && (
          <div className="rounded-xl border border-indigo-900/40 bg-gray-900 p-5 flex-1 overflow-y-auto">
            <p className="text-xs text-indigo-400 font-medium mb-3 uppercase tracking-wide">Live Preview</p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">
              {preview}
              {phase === "generating" && (
                <span className="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 rounded-sm" />
              )}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
