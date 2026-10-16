import type { Metadata } from "next";
import { LandingClient } from "./LandingClient";
import { withSharedKeywords } from "./lib/seo";
import { SITE_URL, siteUrl } from "@/app/lib/site";

const POSITIONING =
  "Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.";

/* ── Page-level metadata (overrides layout defaults) ─────────────────── */
export const metadata: Metadata = {
  title: "Tausi — Find weak areas, practise what matters",
  description: POSITIONING,
  keywords: withSharedKeywords(
    "Tausi", "learning diagnosis", "weak areas", "mastery tracking", "practice exams",
    "curriculum-aligned questions", "HSK practice", "HSK 1", "HSK 2", "NECTA practice",
    "live classroom quiz", "teacher exam builder", "AI tutor", "tausi.app",
  ),
  alternates: { canonical: SITE_URL },
  openGraph: {
    url: SITE_URL,
    title: "Tausi — Find weak areas, practise what matters",
    description: POSITIONING,
  },
};

/* ── JSON-LD structured data ─────────────────────────────────────────── */
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Tausi",
  description: POSITIONING,
  inLanguage: ["en", "sw", "zh"],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Tausi",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: siteUrl("/logo/android-chrome-512x512.png"),
    width: 512,
    height: 512,
  },
  description: POSITIONING,
  knowsAbout: [
    "learning diagnosis", "knowledge points", "mastery tracking", "HSK Chinese",
    "NECTA", "practice exams", "formative assessment",
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Tausi",
  url: SITE_URL,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: [{ "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" }],
  description: POSITIONING,
  featureList: [
    "Weak-area diagnosis per knowledge point",
    "Readiness estimate per curriculum level",
    "Adaptive practice on weak areas",
    "Teacher-in-the-loop AI exam builder",
    "Live class sessions via QR code, link or join code",
    "Explanations in English, Kiswahili and Chinese",
    "Class and student reports for teachers",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Tausi?",
      acceptedAnswer: { "@type": "Answer", text: POSITIONING },
    },
    {
      "@type": "Question",
      name: "How does Tausi find my weak areas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every question is tagged with the curriculum's knowledge points. Each answer updates your mastery of those points, with recent answers counting most, so Tausi can show which topics are weak and how ready you are for a level.",
      },
    },
    {
      "@type": "Question",
      name: "Is Tausi free to use?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Every feature is free to use." },
    },
    {
      "@type": "Question",
      name: "Which curricula does Tausi support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tausi ships with HSK Chinese (levels 1–2) and a NECTA mathematics sample. Curricula are stored as data, so new syllabuses can be added without changing the app.",
      },
    },
    {
      "@type": "Question",
      name: "Do students need to install anything?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Students join a live session in the browser by scanning a QR code, opening a link, or typing a short join code.",
      },
    },
    {
      "@type": "Question",
      name: "Which languages does Tausi support?",
      acceptedAnswer: { "@type": "Answer", text: "The interface and answer explanations are available in English, Kiswahili and Chinese." },
    },
  ],
};

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function LandingPage() {
  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={softwareSchema} />
      <JsonLd data={faqSchema} />
      <LandingClient />
    </>
  );
}
