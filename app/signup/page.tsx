import type { Metadata } from "next";
import SignupClient from "./SignupClient";
import { withSharedKeywords } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Sign Up — Create Your Free Tausi Account",
  description:
    "Create a free Tausi account to find your weak areas, practise with your class, and track your readiness.",
  keywords: withSharedKeywords(
    "Tausi sign up", "Tausi register", "free Tausi account", "create Tausi account",
    "Tausi login", "join Tausi",
  ),
  alternates: { canonical: "https://tausi.app/signup" },
  robots: { index: true, follow: true },
};

export default function SignupPage() {
  return <SignupClient />;
}
