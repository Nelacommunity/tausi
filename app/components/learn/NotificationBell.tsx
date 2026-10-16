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
export function NotificationBell({ side = false, compact = false }: {
  /** In the sidebar (which clips overflow): open as a fixed popover beside it. */
  side?: boolean;
  /** Small ghost button (sidebar header) instead of the bordered square. */
  compact?: boolean;
}) {
  const { T, lang } = useT();
  const L = T.learn;
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // In the sidebar (which clips overflow) the panel is a fixed popover beside the bell.
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

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
    // Unique topic per mount: the header renders this bell twice (sidebar + mobile bar)
    // and the browser client is shared, so a fixed name would hand back an
    // already-subscribed channel and adding a listener to it throws.
    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
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

  const toggle = () => {
    if (side && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const left = r.right + 12;
      // Open downwards from a bell near the top of the screen, upwards from one near the bottom.
      setPos(r.top < window.innerHeight / 2 ? { left, top: Math.max(12, r.top - 8) } : { left, bottom: Math.max(12, window.innerHeight - r.bottom - 8) });
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={boxRef} className="relative">
      <button ref={btnRef} type="button" onClick={toggle}
        aria-label={`${L.notifications}${unread ? ` (${unread})` : ""}`} aria-expanded={open} title={L.notifications}
        className={`relative flex items-center justify-center transition-colors cursor-pointer ${
          compact
            ? `p-1.5 rounded-lg ${open ? "text-snow bg-ink-3" : "text-dim hover:text-snow hover:bg-ink-3"}`
            : `w-9 h-9 rounded-xl bg-ink-3 border ${open ? "border-teal/50 text-snow" : "border-line text-dim hover:text-snow hover:border-line-2"}`
        }`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className={`absolute ${compact ? "-top-0.5 -right-0.5" : "-top-1 -right-1"} min-w-[16px] h-4 px-1 rounded-full bg-coral text-[9px] font-bold text-ink flex items-center justify-center ring-2 ring-ink-2`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={L.notifications}
          style={side && pos ? { left: pos.left, top: pos.top, bottom: pos.bottom } : undefined}
          className={`z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-ink-2 shadow-2xl shadow-black/40 overflow-hidden ${side ? "fixed" : "absolute right-0 top-11"}`}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
            <p className="flex items-center gap-2 text-sm font-semibold text-snow">
              {L.notifications}
              {unread > 0 && <span className="rounded-full bg-coral/15 text-coral text-[10px] font-bold px-1.5 py-0.5">{unread}</span>}
            </p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-[11px] font-semibold text-teal hover:underline cursor-pointer">{L.markAllRead}</button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-ink-3 border border-line flex items-center justify-center text-dim">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-sm text-dim">{L.noNotifications}</p>
            </div>
          ) : (
            <ul className="max-h-[26rem] overflow-y-auto p-1.5 space-y-0.5">
              {items.map((n) => {
                const live = !!n.sessionStatus && n.sessionStatus !== "finished";
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)}
                      className={`w-full text-left flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors cursor-pointer ${n.read ? "hover:bg-white/5" : "bg-teal/[0.07] hover:bg-teal/[0.12]"}`}>
                      <span className={`mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${live ? "bg-good/15 border-good/30 text-good" : "bg-ink-3 border-line text-dim"}`} aria-hidden="true">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={KIND_ICON[n.kind] ?? KIND_ICON.session} />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`text-sm truncate ${n.read ? "text-body" : "font-semibold text-snow"}`}>{n.title}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" aria-hidden="true" />}
                        </span>
                        <span className="block text-xs text-dim truncate mt-0.5">{n.body}</span>
                        <span className="flex items-center gap-2 mt-1.5">
                          {n.sessionStatus && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${live ? "bg-good/15 text-good" : "bg-ink-3 text-dim"}`}>
                              {live && <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" aria-hidden="true" />}
                              {live ? L.liveNow : L.ended}
                            </span>
                          )}
                          <span className="text-[10px] text-dim">{timeAgo(n.createdAt, lang)}</span>
                        </span>
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

const KIND_ICON: Record<string, string> = {
  session: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  class: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z",
  resource: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
};

/** "5 min ago" in the UI language. */
function timeAgo(iso: string, lang: string): string {
  const secs = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "zh" ? "zh-CN" : lang === "sw" ? "sw" : "en", { numeric: "auto" });
  const abs = Math.abs(secs);
  if (abs < 60) return rtf.format(secs, "second");
  if (abs < 3600) return rtf.format(Math.round(secs / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), "hour");
  return rtf.format(Math.round(secs / 86400), "day");
}
