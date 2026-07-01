import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';
import { config } from '@/lib/config';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDBProvider();

  // Apply history retention window based on plan
  const subscription = await db.getActiveSubscription(userId);
  const rawPlan = subscription?.plan ?? 'free';
  const planKey = (rawPlan in config.plans ? rawPlan : 'free') as keyof typeof config.plans;
  const historyDays = config.plans[planKey].historyDays;
  const since = historyDays > 0
    ? new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000)
    : null;

  const sources = await db.getSourcesByUser(userId, 200, 0, since);

  const sourcesWithOutputs = await Promise.all(
    sources.map(async (source) => {
      const outputs = await db.getOutputsBySource(source.id);
      return {
        id: source.id,
        title: source.title,
        wordCount: source.wordCount,
        createdAt: source.createdAt.toISOString(),
        outputs: outputs.map((o) => ({
          id: o.id,
          format: o.format,
          content: o.editedContent || o.content,
          createdAt: o.createdAt.toISOString(),
        })),
      };
    })
  );

  return Response.json(sourcesWithOutputs);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  const db = getDBProvider();
  const source = await db.getSourceById(id);

  if (!source || source.userId !== (session.user as { id: string }).id) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  await db.deleteSource(id);
  return new Response(null, { status: 204 });
}
