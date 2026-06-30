import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const db = getDBProvider();

  // Try session-based reactivation first (for authenticated users)
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const userId = (session.user as { id: string }).id;
    await db.reactivateUser(userId);
    return new Response(JSON.stringify({ success: true }));
  }

  // Unauthenticated path: email + password required (pending-deletion users have no session)
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
  }

  const hash = await db.getPasswordHash(email);
  if (!hash) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  await db.reactivateUser(user.id);
  return new Response(JSON.stringify({ success: true }));
}
