import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = getDBProvider();

  const [sources, outputs, mostUsedFormats] = await Promise.all([
    db.getSourcesByUser(userId, 1000),
    db.getOutputsByUser(userId, 1000),
    db.getMostUsedFormats(userId, 5),
  ]);

  return Response.json({
    totalSources: sources.length,
    totalOutputs: outputs.length,
    mostUsedFormats,
  });
}
