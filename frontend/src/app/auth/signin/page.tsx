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
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F6F3', color: '#2D2A3E' }}>
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight"
          style={{ color: '#2D2A3E' }}
        >
          Repurposer
        </Link>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold tracking-tight mb-2"
              style={{ color: '#2D2A3E' }}
            >
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="text-sm" style={{ color: '#6B6580' }}>
              {isSignUp ? 'Start repurposing your content today' : 'Sign in to continue repurposing'}
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 border"
            style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.15)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: '#2D2A3E' }}>
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition"
                    style={{
                      borderColor: 'rgba(124,106,239,0.2)',
                      backgroundColor: '#F8F6F3',
                      color: '#2D2A3E',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
                    placeholder="Your name"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#2D2A3E' }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition"
                  style={{
                    borderColor: 'rgba(124,106,239,0.2)',
                    backgroundColor: '#F8F6F3',
                    color: '#2D2A3E',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#2D2A3E' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition"
                  style={{
                    borderColor: 'rgba(124,106,239,0.2)',
                    backgroundColor: '#F8F6F3',
                    color: '#2D2A3E',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-center px-3 py-2 rounded-xl"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full text-sm font-medium text-white transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7C6AEF' }}
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: '#7C6AEF' }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>

          <p className="text-center mt-6 text-xs" style={{ color: '#6B6580' }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">← Back to home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
