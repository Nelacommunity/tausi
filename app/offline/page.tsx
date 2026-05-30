"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-gray-500 max-w-sm">
        No internet connection. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-black text-white rounded-lg text-sm"
      >
        Retry
      </button>
    </div>
  );
}
