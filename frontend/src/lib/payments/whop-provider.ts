import crypto from 'crypto';
import type { PaymentProvider, PlanKey, CheckoutSession, WebhookEvent, MembershipStatus } from './payment-provider';

// Plan IDs come from the Whop dashboard checkout links (e.g. plan_xxxxxxxxxxxx).
// Whop checkout URLs are static — no API call needed to redirect a user to checkout.
const PLAN_ID_MAP: Record<Exclude<PlanKey, 'free'>, string> = {
  basic:  process.env.WHOP_PLAN_ID_BASIC  ?? '',
  pro:    process.env.WHOP_PLAN_ID_PRO    ?? '',
  agency: process.env.WHOP_PLAN_ID_AGENCY ?? '',
};

function planKeyFromPlanId(planId: string): PlanKey {
  for (const [key, id] of Object.entries(PLAN_ID_MAP)) {
    if (id && id === planId) return key as PlanKey;
  }
  return 'free';
}

export class WhopProvider implements PaymentProvider {

  createCheckoutSession({ userId, planKey, successUrl, cancelUrl }: {
    userId: string;
    planKey: PlanKey;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    if (planKey === 'free') {
      throw new Error('Cannot create a checkout session for the free plan');
    }

    const planId = PLAN_ID_MAP[planKey];
    if (!planId) {
      throw new Error(
        `No Whop plan ID configured for plan "${planKey}". ` +
        `Set WHOP_PLAN_ID_${planKey.toUpperCase()} in your environment variables.`
      );
    }

    // Whop checkout links are static — just append redirect params.
    // userId is passed via redirect so the success page can refresh the session.
    const url = new URL(`https://whop.com/checkout/${planId}/`);
    url.searchParams.set('redirect_url', successUrl);
    url.searchParams.set('d', userId); // metadata carried through redirect

    return Promise.resolve({
      sessionId: planId,
      url: url.toString(),
    });
  }

  verifyWebhook(body: string, headers: Record<string, string>): WebhookEvent {
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) throw new Error('WHOP_WEBHOOK_SECRET is not set');

    const msgId        = headers['webhook-id'];
    const msgTimestamp = headers['webhook-timestamp'];
    const msgSig       = headers['webhook-signature'];

    if (!msgId || !msgTimestamp || !msgSig) {
      throw new Error('Missing webhook signature headers');
    }

    // Reject timestamps older than 5 minutes to block replay attacks
    const ts = parseInt(msgTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      throw new Error('Webhook timestamp too old');
    }

    // Standard Webhooks spec: HMAC-SHA256 over "{id}.{timestamp}.{body}"
    const signedContent = `${msgId}.${msgTimestamp}.${body}`;
    const secretBytes   = Buffer.from(secret, 'base64');
    const expected      = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64');

    // Signature header may contain multiple values: "v1,<sig1> v1,<sig2>"
    const valid = msgSig.split(' ').some((part) => {
      const [, sig] = part.split(',');
      return sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    });

    if (!valid) throw new Error('Invalid webhook signature');

    const data = JSON.parse(body) as { type: string; data: Record<string, unknown> };
    return { type: data.type, data: data.data };
  }

  async getMembership(membershipId: string): Promise<MembershipStatus | null> {
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      console.warn('[WhopProvider] WHOP_API_KEY not set — skipping getMembership');
      return null;
    }

    try {
      const res = await fetch(`https://api.whop.com/api/v2/memberships/${membershipId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return null;

      const m = await res.json() as {
        id: string;
        status: string;
        plan_id: string;
      };

      return {
        active: m.status === 'active',
        planKey: planKeyFromPlanId(m.plan_id),
        membershipId: m.id,
        providerPlanId: m.plan_id,
      };
    } catch {
      return null;
    }
  }
}
