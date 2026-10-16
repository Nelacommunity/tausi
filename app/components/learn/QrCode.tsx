"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR code for a join URL, rendered client-side as SVG (dark modules on white for reliable scanning). */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })
      .then((s) => { if (live) setSvg(s); })
      .catch(() => {});
    return () => { live = false; };
  }, [value]);
  return (
    <div role="img" aria-label={label} className="rounded-2xl bg-white p-3 shadow-sm" style={{ width: size, height: size }}>
      {svg && <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
}
