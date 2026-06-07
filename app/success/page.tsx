import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/polar";

export const metadata: Metadata = {
  title: "Payment Successful — Welcome to Premium",
  robots: { index: false, follow: false },
};

async function getCheckoutDetails(checkoutId: string) {
  try {
    return await api.checkouts.get({ id: checkoutId });
  } catch {
    return null;
  }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { checkout_id } = await searchParams;
  const checkout = checkout_id ? await getCheckoutDetails(checkout_id) : null;

  const productName =
    (checkout as { productName?: string } | null)?.productName ??
    checkout?.product?.name ??
    "Tausi Premium";

  const amount =
    typeof checkout?.totalAmount === "number" && checkout?.currency
      ? formatCurrency(checkout.totalAmount, checkout.currency)
      : null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Animated glow blob */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Check icon */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-950 ring-1 ring-indigo-700/50 shadow-xl shadow-indigo-900/30">
          <svg
            className="h-10 w-10 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Payment successful!
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Welcome to <span className="text-indigo-400 font-semibold">Tausi Premium</span>.
          Your account has been upgraded.
        </p>

        {/* Order summary card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-6 mb-8 text-left space-y-4">
          <div className="flex items-center gap-3">
            {/* Star badge */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950 border border-indigo-800 shrink-0">
              <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{productName}</p>
              {amount && (
                <p className="text-xs text-gray-500">{amount} charged</p>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-800" />

          {/* What's included */}
          <div className="space-y-2.5">
            {[
              "25× higher monthly AI limits",
              "Priority AI processing",
              "All features unlocked",
              "Priority support",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 text-emerald-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 text-sm transition-colors shadow-lg shadow-indigo-600/25 text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/api/portal"
            className="block w-full rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-medium py-3 text-sm transition-colors text-center"
          >
            Manage subscription
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-600">
          Receipt sent to your email · Questions? Contact support via your dashboard.
        </p>
      </div>
    </div>
  );
}
