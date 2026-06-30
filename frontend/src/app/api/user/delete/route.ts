import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { password } = await request.json() as { password: string };

  if (!password) {
    return new Response(JSON.stringify({ error: 'Password is required' }), { status: 400 });
  }

  const db = getDBProvider();
  const user = await db.getUserById(userId);
  if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

  const hash = await db.getPasswordHash(user.email);
  if (!hash || !(await bcrypt.compare(password, hash))) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 403 });
  }

  await db.softDeleteUser(userId);
  return new Response(JSON.stringify({ success: true }));
}
