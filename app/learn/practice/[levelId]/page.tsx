import type { Metadata } from "next";
import { Practice } from "./Practice";

export const metadata: Metadata = { title: "Practice my weak areas", robots: { index: false, follow: false } };

export default async function PracticePage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  return <Practice levelId={levelId} />;
}
