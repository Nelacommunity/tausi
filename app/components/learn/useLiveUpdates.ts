"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/client";

/**
 * Keeps a live-session screen in sync. Any signal just calls `refresh`, so the
 * server stays the source of truth:
 *   1. Supabase Realtime postgres_changes on the session row (and, for the
 *      host, on participants and answers)
 *   2. Supabase Realtime Broadcast on "live:<CODE>" — every client pings it
 *      after acting, a backup for when row events lag
 *   3. A poll: every 3 s while realtime is down, every 20 s otherwise
 * Refreshes are throttled so a burst of 40 answers costs one refetch.
 */
export function useLiveUpdates({
  code, sessionId, host = false, refresh,
}: {
  code: string;
  sessionId: string | null;
  host?: boolean;
  refresh: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signal = useCallback(() => {
    if (pending.current) return;
    pending.current = setTimeout(() => { pending.current = null; refreshRef.current(); }, 300);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    let channel = supabase
      .channel(`live:${code}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "sync" }, signal)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` }, signal);
    if (host) {
      channel = channel
        .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` }, signal)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `session_id=eq.${sessionId}` }, signal);
    }
    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [code, sessionId, host, signal]);

  useEffect(() => {
    const id = setInterval(() => refreshRef.current(), connected ? 20_000 : 3_000);
    return () => clearInterval(id);
  }, [connected]);

  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);

  /** Tell everyone else on the session to refetch. */
  const ping = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "sync", payload: {} }).catch(() => {});
  }, []);

  return { connected, ping };
}
