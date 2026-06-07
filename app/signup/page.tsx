import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Sign Up — Create Your Free Tausi Account",
  description:
    "Create a free Tausi account to access AI exam prediction, marking schemes, and AI tutoring for NECTA, KCSE, IGCSE, and other East African exams.",
  alternates: { canonical: "https://tausi.app/signup" },
  robots: { index: true, follow: true },
};

export default function SignupPage() {
  return <SignupClient />;
}
