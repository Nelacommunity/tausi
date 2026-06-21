import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import { withSharedKeywords } from "@/app/lib/seo";
import type { Exam, ChatMessage } from "@/app/lib/types";
import { ExamViewer } from "./ExamViewer";

const APP_URL = "https://tausi.app";

/* ── Dynamic metadata for public exam pages ──────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, original_filenames, is_public, created_at")
    .eq("id", id)
    .single();

  if (!exam || !exam.is_public) {
    return { title: "Exam" };
  }

  const subjectHint = exam.original_filenames?.[0]
    ?.replace(/\.[^/.]+$/, "")
    .replace(/[_-]/g, " ")
    .trim();

  const title = `${exam.title} — AI Predicted Exam`;
  const description = `AI-predicted exam paper for "${exam.title}". Includes full marking scheme and weak-points analysis. Study free on Tausi.${subjectHint ? ` Based on: ${subjectHint}.` : ""}`;
  const url = `${APP_URL}/exams/${id}`;

  return {
    title,
    description,
    keywords: withSharedKeywords(
      exam.title, "predicted exam", "AI exam", "marking scheme",
      "KCSE", "East Africa", "past paper prediction",
    ),
    alternates: { canonical: url },
    // og:image / twitter:image are supplied by the dynamic
    // app/exams/[id]/opengraph-image.tsx route (per-exam title card).
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: exam.created_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* ── JSON-LD helpers ──────────────────────────────────────────────────── */
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function buildLearningResourceSchema(exam: Exam) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${APP_URL}/exams/${exam.id}`,
    name: `${exam.title} — AI Predicted Exam`,
    url: `${APP_URL}/exams/${exam.id}`,
    description: `AI-generated predicted exam paper for "${exam.title}" based on past papers. Includes marking scheme and weak-points analysis.`,
    learningResourceType: ["Practice problem set", "Exam"],
    educationalUse: ["Practice", "Self-assessment"],
    inLanguage: "en",
    isAccessibleForFree: true,
    dateCreated: exam.created_at,
    datePublished: exam.created_at,
    provider: {
      "@type": "Organization",
      name: "Tausi",
      url: APP_URL,
    },
    author: {
      "@type": "Organization",
      name: "Tausi AI",
      url: APP_URL,
    },
  };
}

function buildBreadcrumbSchema(exam: Exam) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Tausi",
        item: APP_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Discover",
        item: `${APP_URL}/discover`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: exam.title,
        item: `${APP_URL}/exams/${exam.id}`,
      },
    ],
  };
}

/* ── Page component ───────────────────────────────────────────────────── */
export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("tier").eq("id", user.id).single()
    : { data: null };

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (examError || !exam) notFound();

  if (!exam.is_public && exam.user_id !== user?.id) {
    if (!user) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-gray-300 text-sm mb-3">This exam is private. Sign in to view it.</p>
            <a href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2">
              Sign in
            </a>
          </div>
        </div>
      );
    }
    notFound();
  }

  const messagesQuery = supabase
    .from("chat_messages")
    .select("*")
    .eq("exam_id", id)
    .order("created_at", { ascending: true });

  if (user) messagesQuery.eq("user_id", user.id);

  const sourcePaths: string[] = (exam.pdf_storage_paths as string[] | null) ?? [];
  const [messagesResult, sourceUrlResult] = await Promise.all([
    messagesQuery,
    sourcePaths.length && user
      ? supabase.storage.from("exam-papers").createSignedUrls(sourcePaths, 3600)
      : Promise.resolve({ data: null }),
  ]);

  const sourceSignedUrls = ((sourceUrlResult as { data: { signedUrl: string }[] | null }).data ?? [])
    .map((u) => u.signedUrl ?? "")
    .filter(Boolean);

  return (
    <>
      {/* Inject rich structured data for public exams so Google can index them */}
      {exam.is_public && (
        <>
          <JsonLd data={buildLearningResourceSchema(exam as Exam)} />
          <JsonLd data={buildBreadcrumbSchema(exam as Exam)} />
        </>
      )}
      <ExamViewer
        exam={exam as Exam}
        initialMessages={(messagesResult.data ?? []) as ChatMessage[]}
        isOwner={user?.id === exam.user_id}
        userTier={(profile?.tier ?? "free") as "free" | "premium"}
        sourceSignedUrls={sourceSignedUrls}
      />
    </>
  );
}
