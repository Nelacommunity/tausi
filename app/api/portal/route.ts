import { CustomerPortal } from "@polar-sh/nextjs";
import { createClient } from "@/app/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tausi.app";

// Wraps CustomerPortal to inject the authenticated user's Supabase ID as the
// Polar externalCustomerId, so they land on their own subscription portal.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/pricing", request.url));
  }

  return CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
    returnUrl: `${APP_URL}/dashboard`,
    getExternalCustomerId: async () => user.id,
  })(request);
}
