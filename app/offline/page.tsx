"use client";

import { useT } from "@/app/lib/language-context";

export default function OfflinePage() {
  const { T } = useT();
  const O = T.offline;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4 bg-ink text-snow">
      <h1 className="font-display text-2xl font-semibold">{O.title}</h1>
      <p className="text-dim max-w-sm">{O.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-teal text-ink font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        {O.retry}
      </button>
    </div>
  );
}
