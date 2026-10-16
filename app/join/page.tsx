import type { Metadata } from "next";
import { JoinCode } from "./JoinCode";

export const metadata: Metadata = {
  title: "Join a session",
  description: "Enter the code on your teacher's screen to join a live practice session. No app to install.",
};

export default function JoinPage() {
  return <JoinCode />;
}
