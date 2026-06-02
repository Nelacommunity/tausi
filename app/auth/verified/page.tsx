"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";

export default function VerifiedPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">

      {/* Animated checkmark */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-emerald-950 border-2 border-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40">
          <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-8 h-8 rounded-lg" />
        <span className="text-lg font-bold text-white">Tausi</span>
      </div>

      <h1 className="text-3xl font-extrabold text-white mb-3">Email verified!</h1>

      {email && (
        <p className="text-sm text-gray-400 mb-2">
          <span className="text-white font-medium">{email}</span> is now confirmed.
        </p>
      )}

      <p className="text-sm text-gray-500 mb-8">
        Your account is active. Sign in to start using Tausi.
      </p>

      <Link
        href="/login"
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-indigo-600/30"
      >
        Sign in to your account
      </Link>
    </div>
  );
}
