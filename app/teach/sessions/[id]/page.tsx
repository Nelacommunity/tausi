import type { Metadata } from "next";
import { SessionReport } from "./SessionReport";

export const metadata: Metadata = { title: "Session report", robots: { index: false, follow: false } };

export default async function SessionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionReport id={id} />;
}
