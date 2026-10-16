import type { Metadata } from "next";
import { HostScreen } from "./HostScreen";

export const metadata: Metadata = { title: "Live session", robots: { index: false, follow: false } };

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostScreen code={code.toUpperCase()} />;
}
