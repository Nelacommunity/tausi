import type { Metadata } from "next";
import { ClassJoin } from "./ClassJoin";

export const metadata: Metadata = { title: "Join class", robots: { index: false, follow: false } };

export default async function ClassJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClassJoin code={code.toUpperCase()} />;
}
