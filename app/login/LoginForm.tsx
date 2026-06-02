"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";

export function LoginForm() {
  const router = useRouter();
  const { T } = useT();
  const A = T.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-1 mb-4">
        <img
          src="/logo/android-chrome-192x192.png"
          alt="Tausi"
          className="w-20 h-20 rounded-lg"
        />
        <span className="text-2xl font-bold text-white tracking-tight">
          Tausi
        </span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-8">
          <h1 className="text-xl font-bold text-white mb-1">{A.welcomeBack}</h1>
          <p className="text-sm text-gray-500 mb-6">{A.signInSubtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-gray-400"
                htmlFor="email"
              >
                {A.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={A.emailPlaceholder}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-gray-400"
                htmlFor="password"
              >
                {A.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-2.5 text-sm transition-colors mt-2"
            >
              {loading ? A.signingIn : T.nav.signIn}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          {A.noAccount}{" "}
          <Link
            href="/signup"
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {T.nav.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
