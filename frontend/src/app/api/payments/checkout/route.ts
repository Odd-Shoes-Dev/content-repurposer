import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPaymentProvider } from '@/lib/payments';
import type { PlanKey } from '@/lib/payments';
import { config } from '@/lib/config';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { planKey } = await request.json() as { planKey?: PlanKey };

  if (!planKey || planKey === 'free' || !(planKey in config.plans)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const headersList = await headers();
  const origin = headersList.get('origin') ?? config.nextAuthUrl;

  try {
    const checkout = await getPaymentProvider().createCheckoutSession({
      userId,
      planKey,
      successUrl: `${origin}/settings?payment=success&plan=${planKey}`,
      cancelUrl: `${origin}/settings?payment=cancelled`,
    });

    return Response.json({ sessionId: checkout.sessionId, url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return Response.json({ error: message }, { status: 500 });
  }
}
