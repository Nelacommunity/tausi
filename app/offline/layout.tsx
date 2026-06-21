import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Reconnect to keep using Tausi.",
  robots: { index: false, follow: false },
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
