'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { config } from '@/lib/config';
import type { PlanKey } from '@/lib/payments';

type FontSize = 'small' | 'medium' | 'large';

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-5 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
        <div className="sm:w-48 flex-shrink-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-head)' }}>{label}</p>
          {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-body)' }}>{hint}</p>}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function StatusMsg({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="text-xs mt-2 px-3 py-2 rounded-sm"
      style={type === 'success'
        ? { backgroundColor: 'rgba(22,163,74,0.08)', color: '#16a34a' }
        : { backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)' }}>
      {msg}
    </motion.p>
  );
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const user = session?.user as { id?: string; name?: string; email?: string } | undefined;

  // Subscription plan — fetched from /api/payments/subscription, not session
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  useEffect(() => {
    fetch('/api/payments/subscription')
      .then(r => r.ok ? r.json() as Promise<{ plan: string }> : Promise.resolve({ plan: 'free' }))
      .then(d => setCurrentPlan(d.plan))
      .catch(() => {});
  }, []);

  // Name
  const [name, setName] = useState(user?.name ?? '');
  const [nameStatus, setNameStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [savingName, setSavingName] = useState(false);

  // Email
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailStatus, setEmailStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // Font size
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Billing
  const [checkoutLoading, setCheckoutLoading] = useState<PlanKey | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(
    (searchParams.get('payment') as 'success' | 'cancelled' | null) ?? null
  );

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem('fontSize') as FontSize) || 'medium';
    setFontSize(stored);
    document.documentElement.setAttribute('data-font-size', stored);
  }, []);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  function applyFontSize(size: FontSize) {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.setAttribute('data-font-size', size);
  }

  async function saveName() {
    if (!name.trim()) { setNameStatus({ msg: 'Name cannot be empty', type: 'error' }); return; }
    setSavingName(true);
    setNameStatus(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'name', value: name.trim() }),
      });
      const data = await res.json() as { name?: string; error?: string };
      if (!res.ok) { setNameStatus({ msg: data.error ?? 'Failed', type: 'error' }); return; }
      setNameStatus({ msg: 'Name updated', type: 'success' });
      await updateSession({ name: data.name });
    } catch { setNameStatus({ msg: 'Something went wrong', type: 'error' }); }
    finally { setSavingName(false); }
  }

  async function saveEmail() {
    if (!email.trim() || !emailPassword) { setEmailStatus({ msg: 'Email and current password required', type: 'error' }); return; }
    setSavingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'email', value: email.trim(), currentPassword: emailPassword }),
      });
      const data = await res.json() as { email?: string; error?: string };
      if (!res.ok) { setEmailStatus({ msg: data.error ?? 'Failed', type: 'error' }); return; }
      setEmailStatus({ msg: 'Email updated', type: 'success' });
      setEmailPassword('');
    } catch { setEmailStatus({ msg: 'Something went wrong', type: 'error' }); }
    finally { setSavingEmail(false); }
  }

  async function savePassword() {
    if (!currentPw || !newPw || !confirmPw) { setPwStatus({ msg: 'All fields required', type: 'error' }); return; }
    if (newPw !== confirmPw) { setPwStatus({ msg: 'New passwords do not match', type: 'error' }); return; }
    if (newPw.length < 6) { setPwStatus({ msg: 'New password must be at least 6 characters', type: 'error' }); return; }
    setSavingPw(true);
    setPwStatus(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'password', currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setPwStatus({ msg: data.error ?? 'Failed', type: 'error' }); return; }
      setPwStatus({ msg: 'Password updated', type: 'success' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { setPwStatus({ msg: 'Something went wrong', type: 'error' }); }
    finally { setSavingPw(false); }
  }

  async function startCheckout(planKey: PlanKey) {
    setCheckoutLoading(planKey);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        alert(data.error ?? 'Could not start checkout. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function deleteAccount() {
    if (!deletePw) { setDeleteStatus({ msg: 'Password required', type: 'error' }); return; }
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePw }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setDeleteStatus({ msg: data.error ?? 'Failed', type: 'error' }); return; }
      await signOut({ callbackUrl: '/auth/signin' });
    } catch { setDeleteStatus({ msg: 'Something went wrong', type: 'error' }); }
    finally { setDeleting(false); }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-sm border text-sm outline-none transition";
  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text-head)' }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>Manage your account and preferences.</p>
        </motion.div>

        {/* Profile section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06 }}
          className="rounded-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-head)' }}>Profile</h2>
          </div>
          <div className="px-6">
            {/* Name */}
            <FieldRow label="Display name" hint="Shown in your sidebar greeting">
              <div className="flex gap-2">
                <input className={inputClass} style={inputStyle} value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                />
                <button onClick={saveName} disabled={savingName}
                  className="px-4 py-2.5 rounded-sm text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-brand)' }}>
                  {savingName ? '...' : 'Save'}
                </button>
              </div>
              {nameStatus && <StatusMsg msg={nameStatus.msg} type={nameStatus.type} />}
            </FieldRow>

            {/* Email */}
            <FieldRow label="Email address" hint="Requires current password to change">
              <div className="space-y-2">
                <input className={inputClass} style={inputStyle} type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                  placeholder="New email"
                />
                <div className="flex gap-2">
                  <input className={inputClass} style={inputStyle} type="password" value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                    placeholder="Current password"
                  />
                  <button onClick={saveEmail} disabled={savingEmail}
                    className="px-4 py-2.5 rounded-sm text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-brand)' }}>
                    {savingEmail ? '...' : 'Save'}
                  </button>
                </div>
              </div>
              {emailStatus && <StatusMsg msg={emailStatus.msg} type={emailStatus.type} />}
            </FieldRow>
          </div>
        </motion.div>

        {/* Password section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-head)' }}>Password</h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            {[
              { label: 'Current password', value: currentPw, set: setCurrentPw },
              { label: 'New password', value: newPw, set: setNewPw },
              { label: 'Confirm new password', value: confirmPw, set: setConfirmPw },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-body)' }}>{f.label}</label>
                <input className={inputClass} style={inputStyle} type="password" value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>
            ))}
            {pwStatus && <StatusMsg msg={pwStatus.msg} type={pwStatus.type} />}
            <button onClick={savePassword} disabled={savingPw}
              className="px-5 py-2.5 rounded-sm text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-brand)' }}>
              {savingPw ? 'Saving...' : 'Update password'}
            </button>
          </div>
        </motion.div>

        {/* Preferences section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14 }}
          className="rounded-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-head)' }}>Preferences</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-head)' }}>Font size</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
                <button key={s} onClick={() => applyFontSize(s)}
                  className="px-4 py-2 rounded-sm text-sm font-medium transition border capitalize"
                  style={fontSize === s
                    ? { borderColor: 'var(--color-brand)', borderLeftWidth: '3px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-head)' }
                    : { borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-body)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Billing section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}
          className="rounded-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-head)' }}>Billing &amp; Plan</h2>
          </div>
          <div className="px-6 py-5">
            {/* Payment success / cancelled banner */}
            <AnimatePresence>
              {paymentStatus === 'success' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 px-4 py-3 rounded-sm text-sm flex items-center justify-between"
                  style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
                  <span>Payment successful! Your plan has been upgraded.</span>
                  <button onClick={() => setPaymentStatus(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
                </motion.div>
              )}
              {paymentStatus === 'cancelled' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 px-4 py-3 rounded-sm text-sm flex items-center justify-between"
                  style={{ backgroundColor: 'rgba(220,38,38,0.06)', color: 'var(--color-danger)' }}>
                  <span>Checkout was cancelled.</span>
                  <button onClick={() => setPaymentStatus(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current plan */}
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-body)' }}>
              Current plan: <span className="font-semibold capitalize" style={{ color: 'var(--color-text-head)' }}>
                {currentPlan}
              </span>
            </p>

            {/* Plan cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {((['free', 'basic', 'pro', 'agency'] as PlanKey[])).map((planKey) => {
                const plan = config.plans[planKey];
                const isCurrent = currentPlan === planKey;
                const isLoading = checkoutLoading === planKey;
                return (
                  <div key={planKey} className="rounded-sm border p-4 flex flex-col gap-3 relative"
                    style={{
                      borderColor: isCurrent ? 'var(--color-brand)' : 'var(--color-border)',
                      borderLeftWidth: isCurrent ? '3px' : '1px',
                      backgroundColor: isCurrent ? 'var(--color-bg-subtle)' : 'transparent',
                    }}>
                    {isCurrent && (
                      <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-sm font-medium"
                        style={{ backgroundColor: 'var(--color-brand)', color: '#fff' }}>
                        Current
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-head)' }}>{plan.label}</p>
                      <p className="text-xl font-bold font-[family-name:var(--font-playfair)] mt-0.5" style={{ color: 'var(--color-text-head)' }}>
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        {plan.price > 0 && <span className="text-xs font-normal" style={{ color: 'var(--color-text-body)' }}>/mo</span>}
                      </p>
                    </div>
                    <ul className="space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-body)' }}>
                          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="var(--color-brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {planKey !== 'free' && (
                      <button
                        onClick={() => startCheckout(planKey)}
                        disabled={isCurrent || isLoading}
                        className="mt-auto py-2 rounded-sm text-xs font-medium transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isCurrent ? 'transparent' : 'var(--color-brand)',
                          color: isCurrent ? 'var(--color-text-body)' : '#fff',
                          border: isCurrent ? '1px solid var(--color-border)' : 'none',
                        }}>
                        {isLoading ? 'Loading...' : isCurrent ? 'Active' : 'Upgrade'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs mt-4" style={{ color: 'var(--color-text-body)' }}>
              Payments are processed securely by Whop. You can cancel anytime from your Whop dashboard.
            </p>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
          className="rounded-sm border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(220,38,38,0.2)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(220,38,38,0.15)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>Danger Zone</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm mb-1" style={{ color: 'var(--color-text-head)' }}>Delete Account</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-body)' }}>
              Your account will be scheduled for permanent deletion in 30 days. You can reactivate within that window by signing in.
            </p>
            <button onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 rounded-sm text-sm font-medium border transition hover:opacity-80"
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent' }}>
              Delete my account
            </button>
          </div>
        </motion.div>

      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => { setShowDeleteModal(false); setDeletePw(''); setDeleteStatus(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-md rounded-sm border p-8 pointer-events-auto"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: 'rgba(220,38,38,0.08)' }}>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-center mb-2" style={{ color: 'var(--color-text-head)' }}>
                  Delete your account?
                </h3>
                <p className="text-sm text-center mb-6" style={{ color: 'var(--color-text-body)' }}>
                  Your account will be queued for deletion in 30 days. You can reactivate it by signing in during that period.
                </p>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>Enter your password to confirm</label>
                <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-sm border text-sm outline-none transition mb-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                  placeholder="Your password"
                />
                {deleteStatus && <StatusMsg msg={deleteStatus.msg} type={deleteStatus.type} />}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setShowDeleteModal(false); setDeletePw(''); setDeleteStatus(null); }}
                    className="flex-1 py-2.5 rounded-sm text-sm font-medium border transition hover:opacity-80"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-body)', backgroundColor: 'transparent' }}>
                    Cancel
                  </button>
                  <button onClick={deleteAccount} disabled={deleting}
                    className="flex-1 py-2.5 rounded-sm text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-danger)' }}>
                    {deleting ? 'Deleting...' : 'Delete account'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
