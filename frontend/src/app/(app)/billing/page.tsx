'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { config } from '@/lib/config';
import type { PlanKey } from '@/lib/payments';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [checkoutLoading, setCheckoutLoading] = useState<PlanKey | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(
    (searchParams.get('payment') as 'success' | 'cancelled' | null) ?? null
  );

  useEffect(() => {
    fetch('/api/payments/subscription')
      .then(r => r.ok ? r.json() as Promise<{ plan: string }> : Promise.resolve({ plan: 'free' }))
      .then(d => setCurrentPlan(d.plan))
      .catch(() => {});
  }, []);

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

  const planEntries = Object.entries(config.plans) as [PlanKey, typeof config.plans[PlanKey]][];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-7">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-bold tracking-tight mb-1"
            style={{ color: 'var(--color-text-head)' }}>
            Billing
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>
            Manage your plan. Current plan: <span className="font-semibold capitalize" style={{ color: 'var(--color-text-head)' }}>{currentPlan}</span>
          </p>
        </motion.div>

        {/* Payment status banners */}
        <AnimatePresence>
          {paymentStatus === 'success' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-3 rounded-sm text-sm flex items-center justify-between"
              style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
              <span>Payment successful — your plan has been upgraded.</span>
              <button onClick={() => setPaymentStatus(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
            </motion.div>
          )}
          {paymentStatus === 'cancelled' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-3 rounded-sm text-sm flex items-center justify-between"
              style={{ backgroundColor: 'rgba(220,38,38,0.06)', color: 'var(--color-danger)' }}>
              <span>Checkout was cancelled.</span>
              <button onClick={() => setPaymentStatus(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {planEntries.map(([planKey, plan], i) => {
            const isCurrent = currentPlan === planKey;
            const isLoading = checkoutLoading === planKey;

            return (
              <motion.div
                key={planKey}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-sm border flex flex-col relative overflow-hidden"
                style={{
                  backgroundColor: isCurrent ? 'var(--color-bg-subtle)' : 'var(--color-surface)',
                  borderColor: isCurrent ? 'var(--color-brand)' : 'var(--color-border)',
                  borderLeftWidth: isCurrent ? '3px' : '1px',
                }}
              >
                {planKey === 'pro' && !isCurrent && (
                  <div className="text-center text-xs font-medium py-1"
                    style={{ backgroundColor: 'var(--color-brand)', color: '#fff' }}>
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="text-center text-xs font-medium py-1"
                    style={{ backgroundColor: 'var(--color-brand)', color: '#fff' }}>
                    Your Plan
                  </div>
                )}

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Price */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                      style={{ color: 'var(--color-text-body)' }}>
                      {plan.label}
                    </p>
                    <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold"
                      style={{ color: 'var(--color-text-head)' }}>
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </p>
                    {plan.price > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-body)' }}>per month</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs"
                        style={{ color: 'var(--color-text-body)' }}>
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="var(--color-brand)" strokeWidth="1.2" />
                          <path d="M4.5 7l2 2 3-3" stroke="var(--color-brand)" strokeWidth="1.2"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {planKey !== 'free' && (
                    <button
                      onClick={() => startCheckout(planKey)}
                      disabled={isCurrent || isLoading}
                      className="w-full py-2.5 rounded-sm text-sm font-medium transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        backgroundColor: isCurrent ? 'transparent' : 'var(--color-brand)',
                        color: isCurrent ? 'var(--color-text-body)' : '#fff',
                        border: isCurrent ? '1px solid var(--color-border)' : 'none',
                      }}
                    >
                      {isLoading ? 'Loading...' : isCurrent ? 'Active' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer note */}
        <p className="text-xs text-center pb-4" style={{ color: 'var(--color-text-body)' }}>
          Payments are processed securely by Whop. Cancel anytime from your Whop dashboard.
        </p>

      </div>
    </div>
  );
}
