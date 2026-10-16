import type { Metadata } from "next";
import { ResourceView } from "./ResourceView";

export const metadata: Metadata = { title: "Resource", robots: { index: false, follow: false } };

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResourceView id={id} />;
}
