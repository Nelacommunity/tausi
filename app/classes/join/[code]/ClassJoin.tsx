"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/app/lib/language-context";
import { api } from "@/app/components/learn/api";
import { Card, Spinner } from "@/app/components/learn/ui";

/**
 * Where a class QR code / link lands. Sign-in is enforced by the middleware
 * (it redirects here afterwards), so by now the student has an account.
 */
export function ClassJoin({ code }: { code: string }) {
  const L = useT().T.learn;
  const [result, setResult] = useState<{ ok: true; name: string } | { ok: false; error: string } | null>(null);

  useEffect(() => {
    api<{ id: string; name: string }>("/api/classes/join", { method: "POST", json: { code } })
      .then((c) => setResult({ ok: true, name: c.name }))
      .catch((e: Error) => setResult({ ok: false, error: e.message }));
  }, [code]);

  return (
    <main className="min-h-screen bg-ink text-snow flex items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center space-y-4 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-12 h-12 rounded-xl mx-auto" />
        {!result ? (
          <p className="flex items-center justify-center gap-2 text-body"><Spinner /> {L.joiningClass}</p>
        ) : result.ok ? (
          <>
            <h1 className="font-display text-2xl font-bold">{L.joinedClassTitle}</h1>
            <p className="text-lg text-teal font-semibold">{result.name}</p>
            <Link href="/learn" className="inline-flex rounded-xl bg-gold text-on-gold font-semibold px-5 py-2.5 text-sm">{L.goToLearning}</Link>
          </>
        ) : (
          <>
            <p className="text-body">{result.error}</p>
            <Link href="/learn" className="text-sm text-teal">{L.goToLearning}</Link>
          </>
        )}
      </Card>
    </main>
  );
}
