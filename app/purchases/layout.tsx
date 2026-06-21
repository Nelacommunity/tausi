import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase History",
  description: "Review your Tausi credit top-ups and payment history.",
  robots: { index: false, follow: false },
};

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
