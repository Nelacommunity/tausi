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

  return (
    <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
      {/* Generate prediction */}
      <Link
        href={`/papers/${paperId}/generate`}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {L.generatePrediction}
      </Link>

      {/* Delete */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {deleting ? L.deleting : T.examViewer.yes}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs text-gray-400 border border-gray-700 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {T.examViewer.no}
          </button>
        </div>
      )}
    </div>
  );
}
