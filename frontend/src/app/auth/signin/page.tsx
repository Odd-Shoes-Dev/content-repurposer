'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{ deletionDate: string; email: string; password: string } | null>(null);
  const [reactivating, setReactivating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        name: isSignUp ? name : undefined,
        isSignUp: isSignUp ? 'true' : 'false',
      });
      if (result?.error) {
        if (result.error.startsWith('ACCOUNT_PENDING_DELETION:')) {
          const deletionDate = result.error.split(':')[1];
          setPendingDeletion({ deletionDate, email, password });
        } else {
          setError(result.error);
        }
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    if (!pendingDeletion) return;
    setReactivating(true);
    try {
      const res = await fetch('/api/user/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingDeletion.email, password: pendingDeletion.password }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Reactivation failed. Please try again.');
        return;
      }
      const result = await signIn('credentials', {
        redirect: false,
        email: pendingDeletion.email,
        password: pendingDeletion.password,
        isSignUp: 'false',
      });
      if (result?.error) {
        setError('Reactivation succeeded but sign-in failed. Please sign in again.');
        setPendingDeletion(null);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Reactivation failed. Please try again.');
    } finally {
      setReactivating(false);
    }
  }

  // Pending deletion reactivation screen
  if (pendingDeletion) {
    const deletionDate = new Date(pendingDeletion.deletionDate);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <div className="rounded-2xl border p-10" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(220,38,38,0.08)' }}>
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold mb-3" style={{ color: 'var(--color-text-head)' }}>
              Account Pending Deletion
            </h1>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-body)' }}>
              Your account is scheduled for permanent deletion on
            </p>
            <p className="font-semibold mb-6" style={{ color: 'var(--color-danger)' }}>
              {deletionDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs mb-8" style={{ color: 'var(--color-text-body)' }}>
              All your content history and account data will be permanently erased. Reactivate now to restore full access.
            </p>
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="w-full py-3 rounded-sm text-sm font-medium text-white mb-3 transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-brand)' }}
            >
              {reactivating ? 'Reactivating...' : 'Reactivate My Account'}
            </button>
            <button
              onClick={() => { setPendingDeletion(null); setPassword(''); }}
              className="w-full py-3 rounded-sm text-sm font-medium transition hover:opacity-70"
              style={{ color: 'var(--color-text-body)', backgroundColor: 'transparent' }}
            >
              No, proceed with deletion
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}>
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-head)' }}>
          Repurposer
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-head)' }}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>
              {isSignUp ? 'Start repurposing your content today' : 'Sign in to continue repurposing'}
            </p>
          </div>

          <div className="rounded-2xl p-8 border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-head)' }}>Name</label>
                  <input
                    id="name" type="text" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-sm border text-sm outline-none transition"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                    placeholder="Your name" required
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-head)' }}>Email</label>
                <input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-sm border text-sm outline-none transition"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                  placeholder="you@example.com" required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-head)' }}>Password</label>
                <input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-sm border text-sm outline-none transition"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                  placeholder="••••••••" required minLength={6}
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-center px-3 py-2 rounded-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                  {error}
                </motion.p>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-sm text-sm font-medium text-white transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-brand)' }}>
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--color-brand)' }}>
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>

          <p className="text-center mt-6 text-xs" style={{ color: 'var(--color-text-body)' }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">← Back to home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
