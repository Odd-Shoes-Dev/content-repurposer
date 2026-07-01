import type { PaymentProvider } from './payment-provider';

export type { PaymentProvider, PlanKey, CheckoutSession, WebhookEvent, MembershipStatus } from './payment-provider';

let _provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;

  const providerName = process.env.PAYMENT_PROVIDER ?? 'whop';

  if (providerName === 'whop') {
    const { WhopProvider } = require('./whop-provider') as { WhopProvider: new () => PaymentProvider };
    _provider = new WhopProvider();
  } else {
    throw new Error(`Unknown payment provider: "${providerName}". Set PAYMENT_PROVIDER env var.`);
  }

  return _provider;
}
