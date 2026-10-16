"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";
import { useSession } from "@/app/lib/session-context";
import { api } from "./api";

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  sessionStatus: string | null;
}

/**
 * Bell with unread count. New notifications arrive live through Supabase
 * Realtime (row inserts for this user), with a slow poll as a fallback.
 * Clicking a class-exam notification opens /play/<CODE>, where a signed-in
 * member joins in one tap.
 */
export function NotificationBell({ side = false }: { side?: boolean }) {
  const L = useT().T.learn;
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // In the sidebar (which clips overflow) the panel is a fixed popover beside the bell.
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  const load = useCallback(() => {
    api<{ unread: number; items: Item[] }>("/api/notifications")
      .then((d) => { setItems(d.items); setUnread(d.unread); })
      .catch(() => {});
  }, []);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    const poll = setInterval(load, 60_000);
    return () => { clearInterval(poll); supabase.removeChannel(channel); };
  }, [userId, load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!userId) return null;

  const openItem = (n: Item) => {
    setOpen(false);
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api("/api/notifications", { method: "POST", json: { ids: [n.id] } }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAll = () => {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    api("/api/notifications", { method: "POST", json: {} }).catch(() => {});
  };

  return (
    <div ref={boxRef} className="relative">
      <button ref={btnRef} type="button"
        onClick={() => {
          if (side && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ left: r.right + 12, bottom: Math.max(12, window.innerHeight - r.bottom) });
          }
          setOpen((o) => !o);
        }} aria-label={`${L.notifications}${unread ? ` (${unread})` : ""}`} aria-expanded={open}
        className="relative w-9 h-9 rounded-xl bg-ink-3 border border-line flex items-center justify-center text-dim hover:text-snow hover:border-line-2 transition-colors cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-[10px] font-bold text-ink flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={side && pos ? { left: pos.left, bottom: pos.bottom } : undefined}
          className={`z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-ink-2 shadow-xl shadow-black/30 overflow-hidden ${side ? "fixed" : "absolute right-0 top-11"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-sm font-semibold text-snow">{L.notifications}</p>
            {unread > 0 && <button type="button" onClick={markAll} className="text-[11px] text-teal cursor-pointer">{L.markAllRead}</button>}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-dim text-center">{L.noNotifications}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-line/60">
              {items.map((n) => {
                const live = n.sessionStatus && n.sessionStatus !== "finished";
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)} className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer ${n.read ? "" : "bg-teal/[0.05]"}`}>
                      <span className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal shrink-0" aria-hidden="true" />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-snow truncate">{n.title}</span>
                          <span className="block text-xs text-dim truncate">{n.body}</span>
                        </span>
                        {n.sessionStatus && (
                          <span className={`text-[10px] font-semibold shrink-0 ${live ? "text-good" : "text-dim"}`}>{live ? L.liveNow : L.ended}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
