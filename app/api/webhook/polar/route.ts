import { Webhooks } from "@polar-sh/nextjs";
import { createAdminClient } from "@/app/lib/supabase/admin";

type ProfileUpdate = {
  tier?: "free" | "premium";
  subscription_status?: string;
  subscription_end?: string | null;
};

async function updateProfileByExternalId(
  externalId: string | null | undefined,
  updates: ProfileUpdate
) {
  if (!externalId) return;
  const supabase = createAdminClient();
  await supabase.from("profiles").update(updates).eq("id", externalId);
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  // Subscription starts (new signup or recovered payment)
  onSubscriptionActive: async (payload) => {
    const sub = payload.data;
    await updateProfileByExternalId(sub.customer.externalId, {
      tier: "premium",
      subscription_status: "active",
      subscription_end: sub.currentPeriodEnd.toISOString(),
    });
  },

  // User cancels — lose premium access immediately
  onSubscriptionCanceled: async (payload) => {
    const sub = payload.data;
    await updateProfileByExternalId(sub.customer.externalId, {
      subscription_status: "canceled",
    });
  },

  // Subscription restored after cancellation
  onSubscriptionUncanceled: async (payload) => {
    const sub = payload.data;
    await updateProfileByExternalId(sub.customer.externalId, {
      subscription_status: "active",
      subscription_end: sub.currentPeriodEnd.toISOString(),
    });
  },

  // Access immediately terminated
  onSubscriptionRevoked: async (payload) => {
    const sub = payload.data;
    await updateProfileByExternalId(sub.customer.externalId, {
      tier: "free",
      subscription_status: "revoked",
      subscription_end: null,
    });
  },

  // Renewal payment received — refresh period end
  onOrderPaid: async (payload) => {
    const order = payload.data;
    if (!order.subscriptionId) return; // one-time order, not a subscription renewal
    await updateProfileByExternalId(order.customer.externalId, {
      tier: "premium",
      subscription_status: "active",
    });
  },
});
