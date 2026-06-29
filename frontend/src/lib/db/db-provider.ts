import type {
  User,
  ContentSource,
  GeneratedOutput,
  PromptTemplate,
  OutputFormat,
  Tone,
  Rating,
} from '@/types';

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

export interface CreateSourceInput {
  userId: string;
  title: string;
  content: string;
  wordCount: number;
  tone: Tone;
  customInstructions: string;
}

export interface CreateOutputInput {
  contentSourceId: string;
  userId: string;
  format: OutputFormat;
  content: string;
  modelUsed: string;
  tokensInput: number;
  tokensOutput: number;
  generationTimeMs: number;
}

export interface DBProvider {
  // Users
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getPasswordHash(email: string): Promise<string | null>;
  createUser(data: CreateUserInput): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, 'name' | 'theme' | 'defaultFormats' | 'customInstructions' | 'onboardingCompleted'>>): Promise<User>;
  incrementRequestCount(userId: string): Promise<void>;
  resetMonthlyRequests(userId: string): Promise<void>;

  // Content Sources
  createSource(data: CreateSourceInput): Promise<ContentSource>;
  getSourcesByUser(userId: string, limit?: number, offset?: number): Promise<ContentSource[]>;
  getSourceById(id: string): Promise<ContentSource | null>;
  deleteSource(id: string): Promise<void>;

  // Generated Outputs
  createOutput(data: CreateOutputInput): Promise<GeneratedOutput>;
  getOutputsBySource(sourceId: string): Promise<GeneratedOutput[]>;
  getOutputsByUser(userId: string, limit?: number, offset?: number): Promise<GeneratedOutput[]>;
  updateOutputRating(outputId: string, rating: Rating): Promise<void>;
  updateOutputContent(outputId: string, editedContent: string): Promise<void>;
  toggleFavorite(outputId: string): Promise<void>;
  deleteOutput(id: string): Promise<void>;

  // Templates
  getTemplate(format: OutputFormat): Promise<PromptTemplate | null>;
  getDefaultTemplates(): Promise<PromptTemplate[]>;

  // Stats
  getMostUsedFormats(userId: string, limit?: number): Promise<{ format: OutputFormat; count: number }[]>;
}
