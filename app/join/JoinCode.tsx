"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/app/lib/language-context";
import { Button, Card } from "@/app/components/learn/ui";

/** Type a join code — the no-QR, no-link way into a live session. */
export function JoinCode() {
  const { T, lang, setLang } = useT();
  const L = T.learn;
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  return (
    <main className="min-h-screen bg-ink text-snow flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 max-w-md w-full mx-auto">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="" className="w-7 h-7 rounded-lg" />
          <span className="font-display text-sm font-bold">Tausi</span>
        </Link>
        <div className="flex items-center rounded-lg border border-line overflow-hidden">
          {([["en", "EN"], ["sw", "SW"], ["zh", "中"]] as const).map(([l, label]) => (
            <button key={l} onClick={() => setLang(l)} lang={l}
              className={`px-2 py-1 text-[11px] font-bold cursor-pointer ${lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"}`}>{label}</button>
          ))}
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md space-y-5 py-8">
          <div className="text-center space-y-1.5">
            <h1 className="font-display text-2xl font-bold">{L.joinTitle}</h1>
            <p className="text-sm text-dim">{L.joinSub}</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (clean.length >= 4) router.push(`/play/${clean}`); }} className="space-y-4">
            <input
              value={clean}
              onChange={(e) => setCode(e.target.value)}
              placeholder={L.codePh}
              aria-label={L.code}
              maxLength={12}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              className="w-full rounded-xl border-2 border-line bg-ink px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-teal placeholder:text-dim/40 outline-none focus:border-teal"
            />
            <Button type="submit" variant="primary" className="w-full py-3 text-base" disabled={clean.length < 4}>{L.join}</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
