import crypto from "node:crypto";

const SNIPPE_BASE_URL = "https://api.snippe.sh";

// ── Types ─────────────────────────────────────────────────────

export interface SnippeMobilePaymentRequest {
  amount: number;
  phoneNumber: string;
  customer: {
    firstname: string;
    lastname: string;
    email: string;
  };
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SnippePaymentData {
  reference: string;
  external_reference?: string;
  status: string;
  payment_url?: string;
  amount?: number;
  expires_at?: string;
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

// ── Helpers ────────────────────────────────────────────────────

/** Normalise any TZ phone format → 255XXXXXXXXX */
export function formatPhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "255" + p.slice(1);
  else if (!p.startsWith("255")) p = "255" + p;
  return p;
}

/** Alphanumeric idempotency key, max 30 chars */
function idempotencyKey(prefix = ""): string {
  return (prefix + Date.now().toString(36) + Math.random().toString(36).slice(2))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 30);
}

/** Snippe rejects http:// webhook URLs — omit them in dev */
function httpsWebhook(url?: string): string | undefined {
  return url?.startsWith("https://") ? url : undefined;
}

// ── Payment functions ──────────────────────────────────────────

/**
 * Initiate a mobile-money USSD push payment.
 * Snippe auto-detects the carrier from the phone number — no provider field is sent.
 */
export async function createMobilePayment(
  params: SnippeMobilePaymentRequest,
  idempKey?: string
): Promise<SnippePaymentData> {
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) throw new Error("SNIPPE_API_KEY is not configured");

  const webhook = httpsWebhook(params.webhookUrl);

  const res = await fetch(`${SNIPPE_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": idempKey ?? idempotencyKey("mob"),
    },
    body: JSON.stringify({
      payment_type: "mobile",
      details: { amount: Math.round(params.amount), currency: "TZS" },
      phone_number: formatPhone(params.phoneNumber),
      customer: {
        firstname: params.customer.firstname,
        lastname: params.customer.lastname,
        email: params.customer.email,
      },
      ...(webhook && { webhook_url: webhook }),
      metadata: params.metadata ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `Snippe error ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j?.message || j?.error || text || msg;
    } catch {
      msg = text || msg;
    }
    throw new Error(msg);
  }

  const json = await res.json() as { data: SnippePaymentData };
  return json.data;
}

export async function getPaymentStatus(reference: string): Promise<SnippePaymentData> {
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) throw new Error("SNIPPE_API_KEY is not configured");

  const res = await fetch(`${SNIPPE_BASE_URL}/v1/payments/${reference}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Snippe getPaymentStatus failed: ${res.status} — ${text}`);
  }

  const json = await res.json() as { data: SnippePaymentData };
  return json.data;
}

/**
 * Verify the X-Webhook-Signature header.
 * Formula: hex(HMAC-SHA256(secret, "{timestamp}.{rawBody}"))
 * Returns true when SNIPPE_WEBHOOK_SECRET is not set (dev bypass).
 * Rejects events with timestamps older than 5 minutes.
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.SNIPPE_WEBHOOK_SECRET;
  if (!secret) return true; // dev: skip verification

  if (!timestamp || !signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    console.warn("[snippe] Rejected stale webhook (timestamp too old)");
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}
