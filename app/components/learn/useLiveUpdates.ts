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
    let cancelled = false;
    let rows: RealtimeChannel | null = null;
    let broadcast: RealtimeChannel | null = null;

    // Row changes: listeners don't depend on the topic, so give it a unique one.
    rows = supabase
      .channel(`live-rows:${code}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` }, signal);
    if (host) {
      rows = rows
        .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` }, signal)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `session_id=eq.${sessionId}` }, signal);
    }
    rows.subscribe((status) => { if (!cancelled) setConnected(status === "SUBSCRIBED"); });

    // Broadcast must share the topic "live:<CODE>" with every other screen. The
    // browser client is shared, so first fully remove any stale copy (e.g. from
    // React's dev-mode double effect) — otherwise channel() returns the old,
    // already-subscribed channel and adding a listener throws.
    (async () => {
      const topic = `realtime:live:${code}`;
      await Promise.all(supabase.getChannels().filter((c) => c.topic === topic).map((c) => supabase.removeChannel(c)));
      if (cancelled) return;
      broadcast = supabase
        .channel(`live:${code}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "sync" }, signal)
        .subscribe();
      channelRef.current = broadcast;
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      setConnected(false);
      if (rows) supabase.removeChannel(rows);
      if (broadcast) supabase.removeChannel(broadcast);
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
