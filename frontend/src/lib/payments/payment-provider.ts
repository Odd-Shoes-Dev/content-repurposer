export interface PaymentProvider {
  createCheckoutSession(userId: string, plan: string): Promise<{ url: string }>;
  handleWebhook(payload: string, signature: string): Promise<{ userId: string; plan: string } | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
