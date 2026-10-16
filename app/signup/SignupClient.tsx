"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";

export default function SignupClient() {
  const router = useRouter();
  const { T } = useT();
  const A = T.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setCheckEmail(true);
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-deep border border-teal/30 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-snow mb-2">Check your email</h1>
        <p className="text-sm text-dim mb-6 max-w-xs">
          We sent a confirmation link to{" "}
          <span className="text-snow font-medium">{email}</span>. Click it to activate your account.
        </p>
        <Link href="/login" className="text-sm text-teal hover:text-snow transition-colors">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex">

      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-line bg-ink-2/60 p-10">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-10 h-10 rounded-xl" />
          <span className="font-display text-xl font-bold text-snow tracking-tight">Tausi</span>
        </Link>

        <div>
          <p className="font-display text-2xl font-bold text-snow leading-snug mb-3">
            Join thousands of East African students acing their exams
          </p>
          <p className="text-sm text-dim leading-relaxed">
            Sign up free to use AI exam prediction, marking, and study chat.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-ink-3/50 p-5">
          <p className="text-xs text-dim mb-3 uppercase tracking-wider font-semibold">Free to start</p>
          <div className="space-y-2">
            {[
              "AI Exam Prediction",
              "Marking Scheme Generator",
              "AI Answer Marking",
              "24/7 Study Chat",
              "Discover Public Exams",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-body">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-9 h-9 rounded-lg" />
          <span className="font-display text-lg font-bold text-snow">Tausi</span>
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-snow mb-1">{A.createAccount}</h1>
          <p className="text-sm text-dim mb-7">{A.signUpSubtitle}</p>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-line bg-ink-2 hover:bg-ink-3 hover:border-line-2 text-body font-medium py-2.5 text-sm transition-all mb-5 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {A.continueWithGoogle}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-dim">{A.or}</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dim block" htmlFor="email">{A.emailLabel}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={A.emailPlaceholder}
                className="w-full rounded-xl bg-ink-2 border border-line hover:border-line-2 text-snow placeholder-dim/50 text-sm px-4 py-2.5 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dim block" htmlFor="password">{A.passwordLabel}</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={A.passwordNew}
                className="w-full rounded-xl bg-ink-2 border border-line hover:border-line-2 text-snow placeholder-dim/50 text-sm px-4 py-2.5 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dim block" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-ink-2 border border-line hover:border-line-2 text-snow placeholder-dim/50 text-sm px-4 py-2.5 outline-none transition-all"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-2.5 text-sm text-bad">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold py-2.5 text-sm transition-all mt-2 cursor-pointer"
            >
              {loading ? A.creatingAccount : T.nav.signUp}
            </button>
          </form>

          <p className="text-center text-sm text-dim mt-6">
            {A.haveAccount}{" "}
            <Link href="/login" className="text-teal hover:text-snow font-medium transition-colors">
              {T.nav.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
