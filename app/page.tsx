import type { Metadata } from "next";
import { LandingClient } from "./LandingClient";

/* ── Page-level metadata (overrides layout defaults) ─────────────────── */
export const metadata: Metadata = {
  title: "Tausi — AI Exam Prediction for NECTA, KCSE & East African Students",
  description:
    "Upload past NECTA, KCSE, IGCSE or WAEC exam papers. Tausi AI analyses the structure, predicts new exam questions, generates full marking schemes, and tutors you — free for all East African students.",
  keywords: [
    "Tausi", "NECTA exams", "mock exams", "Tanzania education", "East Africa education",
    "exam creator", "exam prediction", "AI exam generator", "NECTA past papers",
    "KCSE past papers", "IGCSE predicted exam", "WAEC mock exam", "marking scheme",
    "AI tutor", "study assistant", "form four exams", "O level Tanzania",
    "predicted exam paper", "AI study tool East Africa", "tausi.app",
  ],
  alternates: { canonical: "https://tausi.app" },
  openGraph: {
    url: "https://tausi.app",
    title: "Tausi — AI Exam Prediction for East African Students",
    description:
      "Upload NECTA, KCSE or IGCSE past papers. Get AI-predicted exams, full marking schemes, and an AI tutor — free for all East African students.",
  },
};

/* ── JSON-LD structured data ─────────────────────────────────────────── */
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://tausi.app/#website",
  url: "https://tausi.app",
  name: "Tausi",
  description: "AI-powered exam prediction and study platform for East African students",
  inLanguage: ["en", "sw"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://tausi.app/discover?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://tausi.app/#organization",
  name: "Tausi",
  url: "https://tausi.app",
  logo: {
    "@type": "ImageObject",
    url: "https://tausi.app/logo/android-chrome-512x512.png",
    width: 512,
    height: 512,
  },
  description:
    "Tausi provides AI-powered exam prediction, marking scheme generation, answer-sheet marking, and AI tutoring for students preparing for NECTA, KCSE, IGCSE, WAEC, and other East African examinations.",
  areaServed: ["Tanzania", "Kenya", "Uganda", "East Africa"],
  knowsAbout: [
    "NECTA examinations", "KCSE", "IGCSE", "WAEC", "exam preparation",
    "AI tutoring", "marking schemes", "past papers",
  ],
  sameAs: [],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Tausi",
  url: "https://tausi.app",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web, Android, iOS",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TZS",
      name: "Free plan",
    },
    {
      "@type": "Offer",
      price: "5000",
      priceCurrency: "TZS",
      billingPeriod: "P1M",
      name: "Premium plan",
    },
  ],
  description:
    "Upload past exam papers and let Tausi AI generate a predicted exam, full marking scheme, and provide AI tutoring. Supports NECTA, KCSE, IGCSE, WAEC and more.",
  featureList: [
    "AI exam prediction from past papers",
    "Automatic marking scheme generation",
    "AI answer-sheet marking",
    "AI tutor chat",
    "Study Room",
    "Exam Library",
    "Kiswahili and English interface",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Tausi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tausi is an AI-powered exam prediction platform for East African students. It analyses uploaded NECTA, KCSE, IGCSE, WAEC or other past exam papers and generates realistic predicted exams, full marking schemes, and provides an AI tutor — all for free.",
      },
    },
    {
      "@type": "Question",
      name: "How does Tausi predict NECTA exams?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tausi AI analyses the structure, section types, mark allocation, topics, and question patterns of uploaded past NECTA papers. It then generates a brand-new predicted exam that follows the same format with different questions.",
      },
    },
    {
      "@type": "Question",
      name: "Is Tausi free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Tausi has a free tier that includes AI exam predictions, marking scheme generation, AI answer-sheet marking, Study Room, and Exam Library. Premium plans (TZS 5,000/month) offer 25× higher usage limits.",
      },
    },
    {
      "@type": "Question",
      name: "Which exams does Tausi support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tausi supports NECTA (Tanzania), KCSE and KCPE (Kenya), IGCSE, Cambridge A-Level, IEB and NSC (South Africa), WAEC, NECO (Nigeria), ZIMSEC (Zimbabwe), UNEB and UACE (Uganda), and any other past paper in PDF or image format.",
      },
    },
    {
      "@type": "Question",
      name: "Can Tausi mark my answer sheet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Upload the question paper and your completed answer sheet (PDF or image). Tausi AI derives the marking criteria from the question paper and marks every question with detailed feedback, a total score, percentage, and grade.",
      },
    },
    {
      "@type": "Question",
      name: "Does Tausi work in Kiswahili?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Tausi's interface is fully available in both English and Kiswahili (Swahili). You can switch between languages at any time using the EN/SW toggle in the navigation bar.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to predict your NECTA or KCSE exam using Tausi",
  description: "Step-by-step guide to generating an AI-predicted exam from past papers using Tausi.",
  step: [
    {
      "@type": "HowToStep",
      name: "Upload your past exam papers",
      text: "Go to tausi.app, sign in, and upload up to 3 past NECTA, KCSE, or other exam papers as PDFs or images.",
    },
    {
      "@type": "HowToStep",
      name: "Tausi AI analyses the papers",
      text: "Tausi AI reads the exam structure, sections, question types, mark allocation, and topic distribution.",
    },
    {
      "@type": "HowToStep",
      name: "Receive your predicted exam",
      text: "A brand-new predicted exam is generated in real time — same format, same sections, new questions.",
    },
    {
      "@type": "HowToStep",
      name: "Generate a marking scheme",
      text: "Click 'Generate Marking Scheme' to get a full memo with per-question answers, mark breakdowns, and a weak-points analysis.",
    },
    {
      "@type": "HowToStep",
      name: "Study with your AI tutor",
      text: "Open the chat panel and ask Tausi AI to explain questions, walk through solutions, or plan your revision schedule.",
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
      <JsonLd data={howToSchema} />
      <LandingClient />
    </>
  );
}
