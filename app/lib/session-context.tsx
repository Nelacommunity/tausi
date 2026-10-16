"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SessionCtx {
  user: User | null;
  loadingUser: boolean;
}

const SessionContext = createContext<SessionCtx>({
  user: null,
  loadingUser: true,
});

/**
 * App-wide auth, fetched once per session.
 *
 * Mounted in the root layout, which never remounts across client-side
 * navigations — so `getUser()` and the auth subscription are set up a
 * single time instead of on every page (the old Header/dashboard
 * re-fetched them on each route change).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

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

  return (
    <SessionContext.Provider value={{ user, loadingUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
