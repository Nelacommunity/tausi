"use client";

import Link from "next/link";
import { useT } from "@/app/lib/language-context";

export function PapersHeader() {
  const { T } = useT();
  const L = T.library;
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{L.heading}</h1>
        <p className="text-sm text-gray-500">{L.subtitle}</p>
      </div>
      <Link
        href="/papers/upload"
        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {L.uploadBtn}
      </Link>
    </div>
  );
}

export function PapersEmpty() {
  const { T } = useT();
  const L = T.library;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="text-gray-300 font-medium mb-1">{L.noExams}</p>
      <p className="text-sm text-gray-600 mb-6">{L.noExamsSub}</p>
      <Link href="/papers/upload"
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
        {L.uploadFirst}
      </Link>
    </div>
  );
}
