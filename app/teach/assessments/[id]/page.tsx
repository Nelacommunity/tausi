import type { Metadata } from "next";
import { Builder } from "./Builder";

export const metadata: Metadata = { title: "Practice exam builder", robots: { index: false, follow: false } };

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Builder id={id} />;
}
