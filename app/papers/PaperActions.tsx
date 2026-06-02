"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/app/lib/language-context";

export function PaperActions({ paperId }: { paperId: string }) {
  const router = useRouter();
  const { T } = useT();
  const L = T.library;
  const [deleting, setDeleting]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/papers/${paperId}`, { method: "DELETE" });
    router.refresh();
  };

  if (showConfirm) {
    return (
      <div className="pt-1 border-t border-gray-800">
        <p className="text-xs text-gray-400 mb-2 text-center">Delete this paper?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            {deleting ? L.deleting : T.examViewer.yes}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-xs font-semibold transition-colors"
          >
            {T.examViewer.no}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-1 border-t border-gray-800 flex items-center gap-2">
      <Link
        href={`/papers/${paperId}`}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
        title="View paper"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>

      <Link
        href={`/papers/${paperId}`}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors min-w-0"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {L.generatePrediction}
      </Link>

      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}
