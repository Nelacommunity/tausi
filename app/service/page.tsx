import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Tausi — AI exam prediction for East African students.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tausi.app/service" },
};

const LAST_UPDATED = "6 June 2025";

export default function ServicePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-10">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back to Tausi
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm leading-7">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Acceptance of terms</h2>
            <p className="text-gray-400">
              By accessing or using Tausi (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service. These terms apply to all visitors, registered users, and anyone else who accesses Tausi.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Description of service</h2>
            <p className="text-gray-400">
              Tausi is an AI-powered study platform that allows students to upload past exam papers, generate predicted exam questions,
              create marking schemes, and interact with an AI tutor. The service is provided free of charge to East African students.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Accounts</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must be at least 13 years old to create an account.</li>
              <li>One person may hold one account. Creating multiple accounts to circumvent limits is prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Acceptable use</h2>
            <p className="text-gray-400 mb-3">You agree not to:</p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>Upload files you do not have the right to share or that infringe copyright.</li>
              <li>Use the Service to generate content that is illegal, harmful, or misleading.</li>
              <li>Attempt to reverse-engineer, scrape, or automate the Service in ways that harm its availability.</li>
              <li>Share account access with others or resell the Service.</li>
              <li>Use the Service for commercial tutoring businesses without our written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. AI-generated content disclaimer</h2>
            <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-amber-300/80 mb-3">
              Tausi generates predicted exam questions and marking schemes using AI. These are for study purposes only and are not official exam materials.
              We make no guarantee that any predicted content will appear in actual exams.
            </div>
            <p className="text-gray-400">
              AI-generated content may contain errors. Always verify important information with your teacher or official study materials.
              Tausi is a supplementary study tool, not a replacement for formal education.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Your content</h2>
            <p className="text-gray-400">
              You retain ownership of the files you upload. By uploading them, you grant Tausi a limited licence to process them solely for the purpose of providing the Service to you.
              We do not use your uploaded content to train AI models, and we do not share it with other users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Intellectual property</h2>
            <p className="text-gray-400">
              The Tausi name, logo, and platform design are our intellectual property. You may not use them without our written permission.
              Generated exam content is provided for your personal study use; redistribution for commercial purposes is not permitted.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Service availability</h2>
            <p className="text-gray-400">
              We aim to keep Tausi available at all times but do not guarantee uninterrupted access. We may modify, suspend, or discontinue any part of the Service
              with reasonable notice where possible. We are not liable for any loss arising from downtime.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Limitation of liability</h2>
            <p className="text-gray-400">
              To the fullest extent permitted by law, Tausi is provided &ldquo;as is&rdquo; without warranties of any kind.
              We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service,
              including reliance on AI-generated exam predictions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">10. Termination</h2>
            <p className="text-gray-400">
              We may suspend or terminate your account if you violate these terms. You may delete your account at any time from your profile settings.
              Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">11. Changes to these terms</h2>
            <p className="text-gray-400">
              We may update these terms from time to time. We will notify you of significant changes via email or an in-app notice at least 14 days before they take effect.
              Continued use of Tausi after that date constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">12. Contact</h2>
            <p className="text-gray-400">
              Questions about these terms? Email us at{" "}
              <a href="mailto:legal@tausi.app" className="text-indigo-400 hover:text-indigo-300">legal@tausi.app</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-wrap gap-4 text-xs text-gray-600">
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-gray-400 transition-colors">tausi.app</Link>
        </div>
      </div>
    </div>
  );
}
