import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits Added — Tausi",
  robots: { index: false, follow: false },
};

// The page reads ?credits & ?pack via useSearchParams — render on demand.
export const dynamic = "force-dynamic";

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
