export type PlanKey = 'free' | 'basic' | 'pro' | 'agency';

export interface CheckoutSession {
  /** Pass to <WhopCheckoutEmbed sessionId={...} /> for embedded checkout */
  sessionId: string;
  /** Redirect the user here for hosted checkout */
  url: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface MembershipStatus {
  active: boolean;
  planKey: PlanKey;
  membershipId: string;
  providerPlanId: string;
}

export interface PaymentProvider {
  /**
   * Create a checkout session for a given plan.
   * Attach userId in metadata so the webhook can resolve the user.
   */
  createCheckoutSession(params: {
    userId: string;
    planKey: PlanKey;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;

  /**
   * Verify and parse an incoming webhook payload.
   * Throws on invalid signature — never call your handler with tampered data.
   */
  verifyWebhook(body: string, headers: Record<string, string>): WebhookEvent;

  /**
   * Fetch live membership status by the provider-side membership ID.
   */
  getMembership(membershipId: string): Promise<MembershipStatus | null>;
}
