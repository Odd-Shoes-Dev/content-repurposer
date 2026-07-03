import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const sessionUser = session.user as { id: string; provider?: string };
  const userId = sessionUser.id;
  const isGoogleUser = sessionUser.provider === 'google';

  const body = await request.json() as { password?: string; confirm?: string };
  const db = getDBProvider();
  const user = await db.getUserById(userId);
  if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

  if (isGoogleUser) {
    // Google users confirm with typed text instead of password
    if (body.confirm !== 'delete') {
      return new Response(JSON.stringify({ error: 'Please type "delete" to confirm' }), { status: 400 });
    }
  } else {
    if (!body.password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), { status: 400 });
    }
    const hash = await db.getPasswordHash(user.email);
    if (!hash || !(await bcrypt.compare(body.password, hash))) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 403 });
    }
  }

  await db.softDeleteUser(userId);
  return new Response(JSON.stringify({ success: true }));
}
