"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import { api } from "@/app/components/learn/api";
import { PracticeRunner, type PracticeSet } from "@/app/components/learn/PracticeRunner";
import { ErrorNote, Spinner } from "@/app/components/learn/ui";

/** "Practice my weak areas": an adaptive set, then the review and how mastery moved. */
export function Practice({ levelId }: { levelId: string }) {
  const L = useT().T.learn;
  const [set, setSet] = useState<PracticeSet | null>(null);
  const [round, setRound] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<PracticeSet>(`/api/practice?levelId=${levelId}`)
      .then((s) => { setSet(s); setRound((r) => r + 1); })
      .catch((e: Error) => setError(e.message));
  }, [levelId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href="/learn" className="text-xs text-dim hover:text-snow">← {L.backToLearn}</Link>
        <ErrorNote message={error} />
        {!set ? <div className="flex justify-center py-16 text-dim"><Spinner className="w-6 h-6" /></div>
          : <PracticeRunner key={round} set={set} levelId={levelId} onAgain={() => { setSet(null); load(); }} />}
      </main>
    </div>
  );
}
