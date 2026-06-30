import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { field, value, currentPassword, newPassword } = body as {
    field: 'name' | 'email' | 'password';
    value?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const db = getDBProvider();

  if (field === 'name') {
    if (!value?.trim()) {
      return new Response(JSON.stringify({ error: 'Name cannot be empty' }), { status: 400 });
    }
    const user = await db.updateUser(userId, { name: value.trim() });
    return new Response(JSON.stringify({ name: user.name }));
  }

  if (field === 'email') {
    if (!value?.trim() || !currentPassword) {
      return new Response(JSON.stringify({ error: 'Email and current password are required' }), { status: 400 });
    }

    const user = await db.getUserById(userId);
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

    const hash = await db.getPasswordHash(user.email);
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 403 });
    }

    const existing = await db.getUserByEmail(value.trim());
    if (existing && existing.id !== userId) {
      return new Response(JSON.stringify({ error: 'This email is already in use' }), { status: 409 });
    }

    const updated = await db.updateUserEmail(userId, value.trim());
    return new Response(JSON.stringify({ email: updated.email }));
  }

  if (field === 'password') {
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Current and new passwords are required' }), { status: 400 });
    }
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'New password must be at least 6 characters' }), { status: 400 });
    }

    const user = await db.getUserById(userId);
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

    const hash = await db.getPasswordHash(user.email);
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      return new Response(JSON.stringify({ error: 'Incorrect current password' }), { status: 403 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.updateUserPassword(userId, newHash);
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: 'Invalid field' }), { status: 400 });
}
