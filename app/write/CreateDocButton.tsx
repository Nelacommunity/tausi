"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/app/lib/language-context";

function PenIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

export function CreateDocButton({ firstDoc = false }: { firstDoc?: boolean }) {
  const router = useRouter();
  const { T } = useT();
  const W = T.writer;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: W.untitled, content: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? W.createFailed);
        setLoading(false);
        return;
      }
      router.push(`/write/${data.id}`);
    } catch {
      setError(W.networkError);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={create}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-magenta hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-opacity cursor-pointer"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <PenIcon />
        )}
        {loading ? W.creating : firstDoc ? W.createFirst : W.newDocument}
      </button>
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}
