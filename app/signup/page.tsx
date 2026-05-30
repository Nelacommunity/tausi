"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";

export default function SignupPage() {
  const router = useRouter();
  const { T } = useT();
  const A = T.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      // Email confirmation disabled — logged in immediately
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation required
      setCheckEmail(true);
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">
          We sent a confirmation link to <span className="text-white font-medium">{email}</span>. Click it to activate your account.
        </p>
        <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white select-none">
          T
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">Tausi</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-8">
          <h1 className="text-xl font-bold text-white mb-1">{A.createAccount}</h1>
          <p className="text-sm text-gray-500 mb-6">{A.signUpSubtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400" htmlFor="email">{A.emailLabel}</label>
              <input id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder={A.emailPlaceholder}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400" htmlFor="password">{A.passwordLabel}</label>
              <input id="password" type="password" autoComplete="new-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={A.passwordNew}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400" htmlFor="confirm">{A.passwordLabel} (confirm)</label>
              <input id="confirm" type="password" autoComplete="new-password" required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors" />
            </div>
            {error && <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-2.5 text-sm transition-colors mt-2">
              {loading ? A.creatingAccount : T.nav.signUp}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          {A.haveAccount}{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">{T.nav.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
