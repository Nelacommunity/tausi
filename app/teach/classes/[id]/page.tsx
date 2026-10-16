import type { Metadata } from "next";
import { ClassReport } from "./ClassReport";

export const metadata: Metadata = { title: "Class report", robots: { index: false, follow: false } };

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassReport id={id} />;
}
