import type { Metadata } from "next";
import { StudentDetail } from "./StudentDetail";

export const metadata: Metadata = { title: "Student", robots: { index: false, follow: false } };

export default async function StudentPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  return <StudentDetail classId={id} studentId={studentId} />;
}
