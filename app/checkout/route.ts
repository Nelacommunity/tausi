import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { api } from "@/lib/polar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tausi.app";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const productId = searchParams.get("productId") ?? process.env.PRODUCT_ID;

  if (!productId) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=/pricing`, request.url)
    );
  }

  // Check if already premium
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (profile?.tier === "premium" && profile?.subscription_status === "active") {
    return NextResponse.redirect(new URL("/api/portal", request.url));
  }

  try {
    const checkout = await api.checkouts.create({
      products: [productId],
      customerEmail: user.email ?? undefined,
      externalCustomerId: user.id,
      successUrl: `${APP_URL}/success?checkout_id={CHECKOUT_ID}`,
      returnUrl: `${APP_URL}/pricing`,
    });

    return NextResponse.redirect(checkout.url);
  } catch (err) {
    console.error("[checkout] Polar error:", err);
    return NextResponse.redirect(
      new URL("/pricing?error=checkout_failed", request.url)
    );
  }
}
