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
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
    // OAuth redirects the full page — no need to handle result here
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
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3.5 rounded-sm text-base font-medium transition-all flex items-center justify-center gap-3 mb-6 border hover:opacity-80 disabled:opacity-50 cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-head)' }}
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-body)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

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
