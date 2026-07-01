export const config = {
  aiProvider: (process.env.AI_PROVIDER || 'groq') as 'groq' | 'anthropic',
  aiApiKey: process.env.AI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  defaultModel: process.env.DEFAULT_AI_MODEL || 'llama-3.3-70b-versatile',
  maxTokens: parseInt(process.env.MAX_TOKENS || '16000', 10),

  paymentProvider: (process.env.PAYMENT_PROVIDER || 'whop') as 'whop',

  plans: {
    free: {
      label: 'Free',
      price: 0,
      monthlyRequests: 5,
      maxFormatsPerRun: 2,
      historyDays: 7,
      features: [
        '5 repurposes / month',
        'Up to 2 formats at once',
        '7-day history',
      ],
    },
    basic: {
      label: 'Basic',
      price: 9,
      monthlyRequests: 50,
      maxFormatsPerRun: 3,
      historyDays: 90,
      features: [
        '50 repurposes / month',
        'Up to 3 formats at once',
        '90-day history',
        'Custom instructions',
      ],
    },
    pro: {
      label: 'Pro',
      price: 19,
      monthlyRequests: 200,
      maxFormatsPerRun: 8,   // all formats
      historyDays: 0,        // 0 = unlimited
      features: [
        '200 repurposes / month',
        'All formats, no cap per run',
        'Unlimited history',
        'Custom instructions',
        'Priority support',
      ],
    },
    agency: {
      label: 'Agency',
      price: 49,
      monthlyRequests: 99999, // effectively unlimited
      maxFormatsPerRun: 8,
      historyDays: 0,
      features: [
        'Unlimited repurposes',
        'All formats, no cap per run',
        'Unlimited history',
        'Custom instructions',
        '3 team seats',
        'Priority support & onboarding',
      ],
    },
  },
} as const;

export type PlanConfig = typeof config.plans[keyof typeof config.plans];
