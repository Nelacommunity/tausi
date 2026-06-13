import crypto from "node:crypto";

const SNIPPE_BASE_URL = "https://api.snippe.sh";

// ── Types ─────────────────────────────────────────────────────

export interface SnippePaymentRequest {
  amount: number;          // in TZS (integer)
  currency?: string;       // default "TZS"
  phone: string;           // e.g. "255712345678"
  provider: "mpesa" | "airtel" | "mixx" | "halotel";
  external_reference: string;  // our purchase ID
  description?: string;
  metadata?: Record<string, unknown>;
  webhook_url?: string;
}

export interface SnippePaymentResponse {
  status: string;
  data: {
    reference: string;
    external_reference?: string;
    status: string;
    payment_url?: string;
  };
}

export interface SnippeWebhookPayload {
  id: string;
  type: string;
  api_version: string;
  created_at: string;
  data: {
    reference: string;
    external_reference?: string;
    status: string;
    amount: { value: number; currency: string };
    customer: { phone?: string; name?: string; email?: string };
    metadata?: Record<string, unknown>;
  };
}

// ── Client functions ──────────────────────────────────────────

export async function createPayment(
  params: SnippePaymentRequest,
  idempotencyKey: string
): Promise<SnippePaymentResponse> {
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) throw new Error("SNIPPE_API_KEY is not configured");

  const res = await fetch(`${SNIPPE_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? "TZS",
      phone: params.phone,
      provider: params.provider,
      external_reference: params.external_reference,
      description: params.description ?? "Tausi credit purchase",
      metadata: params.metadata,
      webhook_url: params.webhook_url,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Snippe createPayment failed: ${res.status} — ${text}`);
  }

  return res.json() as Promise<SnippePaymentResponse>;
}

export async function getPaymentStatus(
  reference: string
): Promise<SnippePaymentResponse> {
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) throw new Error("SNIPPE_API_KEY is not configured");

  const res = await fetch(`${SNIPPE_BASE_URL}/v1/payments/${reference}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Snippe getPaymentStatus failed: ${res.status} — ${text}`);
  }

  return res.json() as Promise<SnippePaymentResponse>;
}

export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.SNIPPE_WEBHOOK_SECRET;
  if (!secret) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}
