import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const db = getDBProvider();

  const updatable: Record<string, unknown> = {};
  if (body.theme !== undefined) updatable.theme = body.theme;
  if (body.defaultFormats !== undefined) updatable.defaultFormats = body.defaultFormats;
  if (body.customInstructions !== undefined) updatable.customInstructions = body.customInstructions;
  if (body.onboardingCompleted !== undefined) updatable.onboardingCompleted = body.onboardingCompleted;

  const user = await db.updateUser(userId, updatable);
  return Response.json(user);
}
