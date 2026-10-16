import type { Metadata } from "next";
import { PlayScreen } from "./PlayScreen";

export const metadata: Metadata = { title: "Live session", robots: { index: false, follow: false } };

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayScreen code={code.toUpperCase()} />;
}
