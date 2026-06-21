import type { Metadata } from "next";
import { LandingClient } from "./LandingClient";
import { withSharedKeywords } from "./lib/seo";

/* ── Page-level metadata (overrides layout defaults) ─────────────────── */
export const metadata: Metadata = {
  title: "Tausi — AI NECTA Exam Prediction: ACSEE, CSEE, FTNA & PSLE",
  description:
    "Tausi AI predicts your NECTA exams — ACSEE, CSEE, FTNA & PSLE — plus KCSE, IGCSE & WAEC. Upload past papers to get a predicted exam, full marking scheme, and an AI tutor. Free for Tanzanian & East African students.",
  keywords: withSharedKeywords(
    "Tausi", "NECTA exams", "mock exams", "Tanzania education", "East Africa education",
    "exam creator", "exam prediction", "AI exam generator", "NECTA past papers",
    "KCSE past papers", "IGCSE predicted exam", "WAEC mock exam", "marking scheme",
    "AI tutor", "study assistant", "form four exams", "O level Tanzania",
    "predicted exam paper", "AI study tool East Africa", "tausi.app",
  ),
  alternates: { canonical: "https://tausi.app" },
  openGraph: {
    url: "https://tausi.app",
    title: "Tausi — AI NECTA Exam Prediction (ACSEE, CSEE, FTNA, PSLE)",
    description:
      "Upload past NECTA, KCSE or IGCSE papers. Get AI-predicted exams, full marking schemes, and an AI tutor — free for Tanzanian & East African students.",
  },
};

/* ── JSON-LD structured data ─────────────────────────────────────────── */
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://tausi.app/#website",
  url: "https://tausi.app",
  name: "Tausi",
  alternateName: ["Tausi AI", "Tausi App", "Tausi Tanzania", "tausi.app"],
  description: "AI-powered NECTA exam prediction (ACSEE, CSEE, FTNA, PSLE) and study platform for Tanzanian and East African students",
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
  alternateName: ["Tausi AI", "Tausi App", "Tausi Tanzania"],
  url: "https://tausi.app",
  logo: {
    "@type": "ImageObject",
    url: "https://tausi.app/logo/android-chrome-512x512.png",
    width: 512,
    height: 512,
  },
  description:
    "Tausi provides AI-powered exam prediction, marking scheme generation, answer-sheet marking, and AI tutoring for students preparing for NECTA (ACSEE, CSEE, FTNA, PSLE), KCSE, IGCSE, WAEC, and other East African examinations.",
  areaServed: ["Tanzania", "Kenya", "Uganda", "East Africa"],
  knowsAbout: [
    "NECTA examinations", "ACSEE", "CSEE", "FTNA", "PSLE",
    "KCSE", "IGCSE", "WAEC", "exam preparation",
    "AI tutoring", "marking schemes", "past papers",
  ],
  parentOrganization: {
    "@type": "Organization",
    name: "Vylos.co",
    url: "https://vylos.co",
  },
  founder: [
    { "@type": "Person", name: "Aaron Rweyongeza" },
    { "@type": "Person", name: "Brown Mafuru" },
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
        text: "Tausi supports all NECTA Tanzania examinations — ACSEE (Form 6), CSEE (Form 4), FTNA (Form 2), and PSLE (Standard 7) — plus KCSE and KCPE (Kenya), IGCSE, Cambridge A-Level, IEB and NSC (South Africa), WAEC, NECO (Nigeria), ZIMSEC (Zimbabwe), UNEB and UACE (Uganda), and any other past paper in PDF or image format.",
      },
    },
    {
      "@type": "Question",
      name: "Does Tausi predict ACSEE, CSEE, FTNA and PSLE exams?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Tausi predicts every NECTA examination level in Tanzania: ACSEE (Advanced Certificate of Secondary Education, Form 6), CSEE (Certificate of Secondary Education, Form 4), FTNA (Form Two National Assessment), and PSLE (Primary School Leaving Examination, Standard 7). Upload a past paper and Tausi AI generates a predicted exam in the same format with a full marking scheme.",
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
    {
      "@type": "Question",
      name: "Who made Tausi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tausi is built by Vylos.co, its parent company. Tausi was founded by Aaron Rweyongeza and Brown Mafuru.",
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
