import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const sub = await getDBProvider().getActiveSubscription(userId);

  return Response.json({
    plan: sub?.plan ?? 'free',
    status: sub?.status ?? 'active',
    providerMembershipId: sub?.providerMembershipId ?? null,
    activatedAt: sub?.activatedAt ?? null,
  });
}
