"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";

/** Where to go after signing in: the ?next= path if it's a safe local path. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

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
  const [role, setRole] = useState<"student" | "teacher">("student");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError(A.passwordsMismatch); return; }
    if (password.length < 6) { setError(A.passwordTooShort); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role } } });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      router.push(nextPath());
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
        <h1 className="font-display text-2xl font-bold text-snow mb-2">{A.checkEmailTitle}</h1>
        <p className="text-sm text-dim mb-6 max-w-xs">
          {A.checkEmailBefore}{" "}
          <span className="text-snow font-medium">{email}</span>. {A.checkEmailAfter}
        </p>
        <Link href="/login" className="text-sm text-teal hover:text-snow transition-colors">
          {A.backToSignIn}
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
          <p className="font-display text-2xl font-bold text-snow leading-snug mb-3">{A.signupHeadline}</p>
          <p className="text-sm text-dim leading-relaxed">{A.signupSub}</p>
        </div>

        <div className="rounded-2xl border border-line bg-ink-3/50 p-5">
          <p className="text-xs text-dim mb-3 uppercase tracking-wider font-semibold">{A.freeLabel}</p>
          <div className="space-y-2">
            {A.signupPoints.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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


          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <legend className="text-xs font-medium text-dim mb-1.5">{T.learn.roleLabel}</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {(["student", "teacher"] as const).map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${role === r ? "border-teal bg-teal/10 text-snow" : "border-line text-dim hover:text-snow"}`}>
                    {r === "student" ? T.learn.roleStudent : T.learn.roleTeacher}
                  </button>
                ))}
              </div>
            </fieldset>
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
              <label className="text-xs font-medium text-dim block" htmlFor="confirm">{A.confirmPassword}</label>
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
