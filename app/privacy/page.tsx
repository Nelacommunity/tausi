import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tausi collects, uses, and protects your personal data.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tausi.app/privacy" },
};

const LAST_UPDATED = "6 June 2025";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-10">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back to Tausi
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm leading-7">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Who we are</h2>
            <p>
              Tausi (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is an AI-powered exam preparation platform for East African students.
              We operate the website <strong className="text-gray-200">tausi.app</strong> and any associated services.
              If you have privacy questions, contact us at{" "}
              <a href="mailto:privacy@tausi.app" className="text-indigo-400 hover:text-indigo-300">privacy@tausi.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Information we collect</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li><span className="text-gray-300">Account data</span> — email address and password (hashed) when you create an account.</li>
              <li><span className="text-gray-300">Uploaded files</span> — PDF exam papers you upload for analysis. These are stored securely and linked to your account.</li>
              <li><span className="text-gray-300">Generated content</span> — predicted exams, marking schemes, and chat messages produced during your sessions.</li>
              <li><span className="text-gray-300">Usage data</span> — pages visited, features used, and general interaction patterns (collected in aggregate, no personal identifiers).</li>
              <li><span className="text-gray-300">Device &amp; technical data</span> — browser type, operating system, and IP address for security and debugging.</li>
            </ul>
            <p className="mt-3 text-gray-400">We do not collect payment information directly; any future billing is handled by third-party processors.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. How we use your information</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>To provide, operate, and improve the Tausi service.</li>
              <li>To process your uploaded PDFs through Google&rsquo;s Gemini AI model to generate predicted exams and marking schemes.</li>
              <li>To store your exams and chat history so you can access them across sessions.</li>
              <li>To send transactional emails (account confirmation, password reset).</li>
              <li>To detect and prevent abuse, fraud, and security incidents.</li>
            </ul>
            <p className="mt-3 text-gray-400">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Third-party services</h2>
            <div className="space-y-3 text-gray-400">
              <p>
                <span className="text-gray-300">Supabase</span> — our database and authentication provider. Your account credentials and all stored data reside on Supabase infrastructure.
                See <a href="https://supabase.com/privacy" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a>.
              </p>
              <p>
                <span className="text-gray-300">Google Gemini AI</span> — uploaded PDFs and chat messages are sent to Google&rsquo;s Gemini API for AI processing.
                See <a href="https://ai.google.dev/terms" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">Google AI Terms</a>.
              </p>
              <p>
                <span className="text-gray-300">Google OAuth</span> — if you sign in with Google, your name and email are shared with us by Google under their OAuth flow.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Data retention</h2>
            <p className="text-gray-400">
              We retain your account data and uploaded files for as long as your account is active. You may delete your account at any time from your profile settings,
              which will permanently remove your personal data and uploaded files within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Cookies</h2>
            <p className="text-gray-400">
              We use a single authentication session cookie to keep you logged in. We do not use advertising cookies or cross-site tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Your rights</h2>
            <p className="text-gray-400">
              You have the right to access, correct, or delete the personal data we hold about you. To exercise these rights, email{" "}
              <a href="mailto:privacy@tausi.app" className="text-indigo-400 hover:text-indigo-300">privacy@tausi.app</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Children&rsquo;s privacy</h2>
            <p className="text-gray-400">
              Tausi is intended for students aged 13 and above. We do not knowingly collect personal data from children under 13.
              If you believe a child has provided us with personal information, contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Changes to this policy</h2>
            <p className="text-gray-400">
              We may update this policy from time to time. Material changes will be communicated via email or a notice on the platform.
              Continued use of Tausi after changes constitutes acceptance of the updated policy.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-wrap gap-4 text-xs text-gray-600">
          <Link href="/service" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-gray-400 transition-colors">tausi.app</Link>
        </div>
      </div>
    </div>
  );
}
