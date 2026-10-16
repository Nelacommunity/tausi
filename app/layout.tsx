import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { LanguageProvider } from "./lib/language-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "./lib/theme-context";
import { SessionProvider } from "./lib/session-context";
import { TAUSI_KEYWORDS } from "./lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const APP_URL = "https://tausi.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  applicationName: "Tausi",

  title: {
    default: "Tausi — Find weak areas, practise what matters",
    template: "%s | Tausi",
  },

  description:
    "Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.",

  keywords: Array.from(new Set([
    "Tausi", "tausi.app",
    "NECTA exams", "NECTA past papers", "NECTA mock exams",
    "KCSE past papers", "HSK practice", "HSK 1", "HSK 2",
    "mock exams Tanzania", "Tanzania education", "Tanzania exam papers",
    "East Africa education", "East African students",
    "learning diagnosis", "weak areas", "practice exams", "mastery tracking",
    "marking scheme generator", "AI tutor", "exam preparation",
    "live classroom quiz", "teacher exam builder", "curriculum-aligned questions",
    "UNEB exams", "form four exams Tanzania", "O level exams East Africa",
    "study assistant AI", "AI education",
    ...TAUSI_KEYWORDS,
  ])),

  authors: [{ name: "Tausi", url: APP_URL }],
  creator: "Tausi",
  publisher: "Tausi",

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "sw_TZ",
    url: APP_URL,
    siteName: "Tausi",
    title: "Tausi — Find weak areas, practise what matters",
    description:
      "Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.",
    // og:image is supplied by the file-based app/opengraph-image.tsx route.
  },

  // Twitter / X — image falls back to app/opengraph-image.tsx
  twitter: {
    card: "summary_large_image",
    site: "@tausiapp",
    creator: "@tausiapp",
    title: "Tausi — Find weak areas, practise what matters",
    description:
      "Tausi turns any curriculum into diagnosis and practice — helping students find their weak areas and helping teachers build curriculum-aligned practice exams.",
  },

  // App
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tausi",
  },

  // Icons
  icons: {
    apple: "/logo/apple-touch-icon.png",
    icon: [
      { url: "/logo/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  },

  // Verification — only emitted when the real token is set in the environment.
  // Set GOOGLE_SITE_VERIFICATION (and optionally BING_SITE_VERIFICATION) in your
  // host's env vars, then redeploy, then verify in Google Search Console.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },

  // Category for app stores / directories
  category: "education",
};

export const viewport: Viewport = {
  themeColor: "#171126",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        {/* Set theme class before paint to avoid a flash of the wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Preconnect to external domains for performance */}
        {/* The browser talks to Supabase for sign-in and live updates — warm that connection.
            (Fonts are self-hosted by next/font and AI calls are server-side, so no other preconnects.) */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} crossOrigin="anonymous" />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <SessionProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
