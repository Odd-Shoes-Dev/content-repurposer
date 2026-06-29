export type OutputFormat =
  | 'blog'
  | 'linkedin'
  | 'twitter_thread'
  | 'video_script'
  | 'newsletter'
  | 'quote_graphics'
  | 'carousel'
  | 'takeaways';

export type Tone = 'professional' | 'casual' | 'humorous' | 'authoritative';

export type Plan = 'free' | 'basic' | 'pro' | 'agency';

export type Theme = 'light' | 'dark';

export type Rating = 'up' | 'down' | null;

export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  monthlyRequestsUsed: number;
  monthlyRequestsResetAt: Date;
  theme: Theme;
  defaultFormats: OutputFormat[];
  customInstructions: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentSource {
  id: string;
  userId: string;
  title: string;
  sourceType: string;
  content: string;
  wordCount: number;
  tone: Tone;
  customInstructions: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface GeneratedOutput {
  id: string;
  contentSourceId: string;
  userId: string;
  format: OutputFormat;
  content: string;
  editedContent: string | null;
  modelUsed: string;
  tokensInput: number;
  tokensOutput: number;
  generationTimeMs: number;
  isFavorite: boolean;
  rating: Rating;
  createdAt: Date;
}

export interface PromptTemplate {
  id: string;
  format: OutputFormat;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateOptions {
  systemPrompt: string;
  userContent: string;
  model?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface StreamChunk {
  type: 'text' | 'done';
  text?: string;
  result?: GenerateResult;
}

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  blog: 'Blog Article',
  linkedin: 'LinkedIn Posts',
  twitter_thread: 'X/Twitter Thread',
  video_script: 'Video Scripts',
  newsletter: 'Email Newsletter',
  quote_graphics: 'Quote Graphics',
  carousel: 'Carousel Post',
  takeaways: 'Key Takeaways & FAQs',
};

export const FORMAT_CHAR_LIMITS: Partial<Record<OutputFormat, number>> = {
  twitter_thread: 280,
  linkedin: 3000,
};
