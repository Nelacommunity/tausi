"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SessionCtx {
  user: User | null;
  loadingUser: boolean;
  credits: number | null;
  setCredits: (n: number | null) => void;
  refreshCredits: () => Promise<void>;
}

const SessionContext = createContext<SessionCtx>({
  user: null,
  loadingUser: true,
  credits: null,
  setCredits: () => {},
  refreshCredits: async () => {},
});

/**
 * App-wide auth + credits, fetched once per session.
 *
 * Mounted in the root layout, which never remounts across client-side
 * navigations — so `getUser()`, the auth subscription, and the credits
 * balance are fetched a single time instead of on every page (the old
 * Header/dashboard re-fetched them on each route change).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setUser(user);
      setLoadingUser(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const r = await fetch("/api/credits");
      if (!r.ok) return;
      const d = await r.json();
      if (typeof d.credits === "number") setCredits(d.credits);
    } catch { /* ignore */ }
  }, []);

  // Fetch credits only when the actual user identity changes (not on every
  // token refresh, which re-emits the same user).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) { setCredits(null); return; }
    refreshCredits();
  }, [userId, refreshCredits]);

  return (
    <SessionContext.Provider value={{ user, loadingUser, credits, setCredits, refreshCredits }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
