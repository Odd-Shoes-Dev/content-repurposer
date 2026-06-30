export const config = {
  aiProvider: (process.env.AI_PROVIDER || 'groq') as 'groq' | 'anthropic',
  aiApiKey: process.env.AI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  defaultModel: process.env.DEFAULT_AI_MODEL || 'llama-3.3-70b-versatile',
  maxTokens: parseInt(process.env.MAX_TOKENS || '16000', 10),
  freeMonthlyRequests: 100,
  plans: {
    free: { monthlyRequests: 100 },
    basic: { monthlyRequests: 500 },
    pro: { monthlyRequests: 2000 },
    agency: { monthlyRequests: 10000 },
  },
} as const;
