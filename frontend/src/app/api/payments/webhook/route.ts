import { getPaymentProvider } from '@/lib/payments';
import { getDBProvider } from '@/lib/db';
import type { PlanKey } from '@/lib/payments';

// Must read raw body before any parsing — Whop signature covers the exact bytes
export async function POST(request: Request) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event;
  try {
    event = getPaymentProvider().verifyWebhook(body, headers);
  } catch {
    return new Response('Invalid webhook signature', { status: 401 });
  }

  const db = getDBProvider();

  try {
    if (event.type === 'membership.activated') {
      await handleMembershipActivated(event.data, db);
    } else if (event.type === 'membership.deactivated') {
      await handleMembershipDeactivated(event.data, db);
    } else if (event.type === 'refund.created') {
      await handleRefund(event.data, db);
    }
    // payment.succeeded is informational — membership.activated is the authoritative signal
  } catch (err) {
    console.error('[webhook] handler error:', err);
    // Return 200 so Whop does not retry endlessly
  }

  return new Response('OK', { status: 200 });
}

async function handleMembershipActivated(
  data: Record<string, unknown>,
  db: ReturnType<typeof getDBProvider>
) {
  const membershipId = data.id as string;
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const userId = metadata.userId;
  const planKey = (metadata.planKey as PlanKey) ?? 'free';
  const plan = data.plan as Record<string, unknown> | undefined;
  const providerPlanId = (data.plan_id ?? plan?.id ?? '') as string;

  if (!userId) {
    console.warn('[webhook] membership.activated: no userId in metadata, membershipId:', membershipId);
    return;
  }

  await db.upsertSubscription({
    userId,
    plan: planKey,
    provider: 'whop',
    providerMembershipId: membershipId,
    providerPlanId,
  });

  console.log(`[webhook] upgraded userId=${userId} → plan=${planKey} membership=${membershipId}`);
}

async function handleMembershipDeactivated(
  data: Record<string, unknown>,
  db: ReturnType<typeof getDBProvider>
) {
  const membershipId = data.id as string;
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const userId = metadata.userId;

  if (userId) {
    await db.deactivateSubscription(userId);
    console.log(`[webhook] downgraded userId=${userId} → free`);
    return;
  }

  // Fallback: find user via membership ID if metadata is missing
  const sub = await db.getSubscriptionByMembershipId(membershipId);
  if (sub) {
    await db.deactivateSubscription(sub.userId);
    console.log(`[webhook] downgraded userId=${sub.userId} → free (via membership lookup)`);
  }
}

async function handleRefund(
  data: Record<string, unknown>,
  db: ReturnType<typeof getDBProvider>
) {
  const metadata = (data.metadata ?? {}) as Record<string, string>;
  const userId = metadata.userId;
  if (userId) {
    await db.deactivateSubscription(userId);
    console.log(`[webhook] refund → downgraded userId=${userId} → free`);
  }
}
