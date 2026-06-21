import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import CustomCursor from "./components/CustomCursor";
import { LanguageProvider } from "./lib/language-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "./lib/theme-context";
import { SessionProvider } from "./lib/session-context";

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

  title: {
    default: "Tausi — AI Exam Prediction for NECTA, KCSE & East Africa",
    template: "%s | Tausi",
  },

  description:
    "AI-powered exam prediction, marking schemes, and AI tutoring for East African students. Supports NECTA, KCSE, IGCSE, WAEC, ZIMSEC and more. Free to use.",

  keywords: [
    "Tausi", "tausi.app",
    "NECTA exams", "NECTA past papers", "NECTA mock exams",
    "KCSE past papers", "KCSE prediction",
    "mock exams Tanzania", "Tanzania education", "Tanzania exam papers",
    "East Africa education", "East African students",
    "exam creator", "AI exam generator", "predicted exam",
    "marking scheme generator", "AI tutor", "exam preparation",
    "IGCSE predicted exam", "WAEC mock", "ZIMSEC past papers",
    "UNEB exams", "form four exams Tanzania", "O level exams East Africa",
    "study assistant AI", "AI education",
  ],

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
    title: "Tausi — AI Exam Prediction for East African Students",
    description:
      "Upload NECTA, KCSE, IGCSE or WAEC past papers. Get AI-predicted exams, marking schemes, and AI tutoring — free for East African students.",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Tausi — AI Exam Prediction for East African Students",
        type: "image/png",
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    site: "@tausiapp",
    creator: "@tausiapp",
    title: "Tausi — AI Exam Prediction for East African Students",
    description:
      "Upload NECTA, KCSE or IGCSE past papers. Get AI-predicted exams, marking schemes, and AI tutoring.",
    images: [`${APP_URL}/og-image.png`],
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

  // Verification (add your actual tokens when available)
  verification: {
    google: "REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_TOKEN",
    // bing: "REPLACE_WITH_BING_WEBMASTER_TOKEN",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <CustomCursor />
        <ThemeProvider>
          <SessionProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
