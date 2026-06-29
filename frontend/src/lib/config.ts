export const config = {
  aiProvider: (process.env.AI_PROVIDER || 'groq') as 'groq' | 'anthropic',
  aiApiKey: process.env.AI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  defaultModel: process.env.DEFAULT_AI_MODEL || 'llama-3.3-70b-versatile',
  maxTokens: parseInt(process.env.MAX_TOKENS || '16000', 10),
  freeMonthlyRequests: 3,
  plans: {
    free: { monthlyRequests: 3 },
    basic: { monthlyRequests: 50 },
    pro: { monthlyRequests: 200 },
    agency: { monthlyRequests: 1000 },
  },
} as const;
