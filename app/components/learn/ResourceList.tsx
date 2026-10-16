"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/app/lib/language-context";
import type { ResourceSummary } from "@/app/lib/learning/types";
import { api } from "./api";
import { Badge, Button, formatDate, Spinner } from "./ui";

const KIND_LABEL: Record<string, string> = { pdf: "PDF", docx: "Word", pptx: "PowerPoint", text: "Text" };

export function ResourceList({ items, onChanged, empty }: { items: ResourceSummary[]; onChanged: () => void; empty: string }) {
  const { T, lang } = useT();
  const L = T.learn;
  const [retrying, setRetrying] = useState<string | null>(null);

  const retry = async (id: string) => {
    setRetrying(id);
    await api(`/api/resources/${id}/process`, { method: "POST" }).catch(() => {});
    setRetrying(null);
    onChanged();
  };

  if (!items.length) return <p className="text-sm text-dim">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((r) => {
        const ready = r.status === "ready";
        const body = (
          <>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-snow truncate">{r.title}</p>
              <p className="text-xs text-dim mt-0.5 truncate">
                {KIND_LABEL[r.kind] ?? r.kind} · {formatDate(r.createdAt, lang)}
                {r.className ? ` · ${r.className}` : r.isOwner ? ` · ${L.privateOnly}` : ""}
              </p>
              {r.status === "failed" && r.error && <p className="text-[11px] text-bad mt-1">{r.error}</p>}
            </div>
            {ready ? <Badge tone="good">{L.statusReady}</Badge>
              : r.status === "failed" ? <Badge tone="bad">{L.statusFailed}</Badge>
              : <Badge tone="gold">{L.statusProcessing}</Badge>}
          </>
        );
        return (
          <li key={r.id}>
            {ready ? (
              <Link href={`/resources/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 hover:border-line-2 px-4 py-3 transition-colors">{body}</Link>
            ) : (
              <div className="rounded-xl border border-line bg-ink-2 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">{body}</div>
                {r.isOwner && r.status !== "processing" && (
                  <Button className="!py-1 !px-3 text-xs" onClick={() => retry(r.id)} disabled={retrying === r.id}>
                    {retrying === r.id && <Spinner className="w-3 h-3" />} {L.retryProcessing}
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
