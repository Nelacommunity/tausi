import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Tausi account and usage stats.",
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
