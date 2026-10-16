"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "student" | "teacher";

interface SessionCtx {
  user: User | null;
  loadingUser: boolean;
  role: Role | null;
  setRole: (r: Role) => void;
}

const SessionContext = createContext<SessionCtx>({
  user: null,
  loadingUser: true,
  role: null,
  setRole: () => {},
});

/**
 * App-wide auth and role, fetched once per session.
 *
 * Mounted in the root layout, which never remounts across client-side
 * navigations — so `getUser()` and the auth subscription are set up a
 * single time instead of on every page (the old Header/dashboard
 * re-fetched them on each route change).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

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

  // Role (student/teacher) only changes when the user identity does.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    createClient().from("profiles").select("role").eq("id", userId).maybeSingle()
      .then(({ data }) => { if (live) setRole((data?.role as Role) ?? "student"); });
    return () => { live = false; };
  }, [userId]);

  return (
    <SessionContext.Provider value={{ user, loadingUser, role: userId ? role : null, setRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
