import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Tausi account to see your weak areas, practise, and run live class sessions.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://tausi.app/login" },
};

export default function LoginPage() {
  return <LoginForm />;
}
