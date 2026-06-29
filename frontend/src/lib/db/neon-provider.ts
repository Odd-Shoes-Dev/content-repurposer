import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { DBProvider, CreateUserInput, CreateSourceInput, CreateOutputInput } from './db-provider';
import type {
  User,
  ContentSource,
  GeneratedOutput,
  PromptTemplate,
  OutputFormat,
  Rating,
} from '@/types';

type Row = Record<string, unknown>;

function mapUser(row: Row): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    plan: row.plan as User['plan'],
    monthlyRequestsUsed: row.monthly_requests_used as number,
    monthlyRequestsResetAt: new Date(row.monthly_requests_reset_at as string),
    theme: row.theme as User['theme'],
    defaultFormats: (row.default_formats ?? []) as OutputFormat[],
    customInstructions: (row.custom_instructions ?? '') as string,
    onboardingCompleted: row.onboarding_completed as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapSource(row: Row): ContentSource {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    sourceType: row.source_type as string,
    content: row.content as string,
    wordCount: row.word_count as number,
    tone: row.tone as ContentSource['tone'],
    customInstructions: (row.custom_instructions ?? '') as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
  };
}

function mapOutput(row: Row): GeneratedOutput {
  return {
    id: row.id as string,
    contentSourceId: row.content_source_id as string,
    userId: row.user_id as string,
    format: row.format as OutputFormat,
    content: row.content as string,
    editedContent: row.edited_content as string | null,
    modelUsed: row.model_used as string,
    tokensInput: row.tokens_input as number,
    tokensOutput: row.tokens_output as number,
    generationTimeMs: row.generation_time_ms as number,
    isFavorite: row.is_favorite as boolean,
    rating: row.rating as Rating,
    createdAt: new Date(row.created_at as string),
  };
}

function mapTemplate(row: Row): PromptTemplate {
  return {
    id: row.id as string,
    format: row.format as OutputFormat,
    name: row.name as string,
    systemPrompt: row.system_prompt as string,
    userPromptTemplate: row.user_prompt_template as string,
    isDefault: row.is_default as boolean,
    createdBy: row.created_by as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class NeonDBProvider implements DBProvider {
  private sql: NeonQueryFunction<false, false>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  private async query(text: string, params: unknown[] = []): Promise<Row[]> {
    const result = await this.sql.query(text, params);
    return result as unknown as Row[];
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async getPasswordHash(email: string): Promise<string | null> {
    const rows = await this.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    return rows.length > 0 ? (rows[0].password_hash as string) : null;
  }

  async createUser(data: CreateUserInput): Promise<User> {
    const rows = await this.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [data.email, data.name, data.passwordHash]
    );
    return mapUser(rows[0]);
  }

  async updateUser(id: string, data: Partial<Pick<User, 'name' | 'theme' | 'defaultFormats' | 'customInstructions' | 'onboardingCompleted'>>): Promise<User> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
    if (data.theme !== undefined) { sets.push(`theme = $${idx++}`); values.push(data.theme); }
    if (data.defaultFormats !== undefined) { sets.push(`default_formats = $${idx++}`); values.push(JSON.stringify(data.defaultFormats)); }
    if (data.customInstructions !== undefined) { sets.push(`custom_instructions = $${idx++}`); values.push(data.customInstructions); }
    if (data.onboardingCompleted !== undefined) { sets.push(`onboarding_completed = $${idx++}`); values.push(data.onboardingCompleted); }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return mapUser(rows[0]);
  }

  async incrementRequestCount(userId: string): Promise<void> {
    await this.query(
      'UPDATE users SET monthly_requests_used = monthly_requests_used + 1 WHERE id = $1',
      [userId]
    );
  }

  async resetMonthlyRequests(userId: string): Promise<void> {
    await this.query(
      `UPDATE users SET monthly_requests_used = 0, monthly_requests_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month' WHERE id = $1`,
      [userId]
    );
  }

  async createSource(data: CreateSourceInput): Promise<ContentSource> {
    const rows = await this.query(
      'INSERT INTO content_sources (user_id, title, content, word_count, tone, custom_instructions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.userId, data.title, data.content, data.wordCount, data.tone, data.customInstructions]
    );
    return mapSource(rows[0]);
  }

  async getSourcesByUser(userId: string, limit = 20, offset = 0): Promise<ContentSource[]> {
    const rows = await this.query(
      'SELECT * FROM content_sources WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return rows.map(mapSource);
  }

  async getSourceById(id: string): Promise<ContentSource | null> {
    const rows = await this.query('SELECT * FROM content_sources WHERE id = $1', [id]);
    return rows.length > 0 ? mapSource(rows[0]) : null;
  }

  async deleteSource(id: string): Promise<void> {
    await this.query('DELETE FROM content_sources WHERE id = $1', [id]);
  }

  async createOutput(data: CreateOutputInput): Promise<GeneratedOutput> {
    const rows = await this.query(
      'INSERT INTO generated_outputs (content_source_id, user_id, format, content, model_used, tokens_input, tokens_output, generation_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [data.contentSourceId, data.userId, data.format, data.content, data.modelUsed, data.tokensInput, data.tokensOutput, data.generationTimeMs]
    );
    return mapOutput(rows[0]);
  }

  async getOutputsBySource(sourceId: string): Promise<GeneratedOutput[]> {
    const rows = await this.query(
      'SELECT * FROM generated_outputs WHERE content_source_id = $1 ORDER BY created_at ASC',
      [sourceId]
    );
    return rows.map(mapOutput);
  }

  async getOutputsByUser(userId: string, limit = 50, offset = 0): Promise<GeneratedOutput[]> {
    const rows = await this.query(
      'SELECT * FROM generated_outputs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return rows.map(mapOutput);
  }

  async updateOutputRating(outputId: string, rating: Rating): Promise<void> {
    await this.query('UPDATE generated_outputs SET rating = $1 WHERE id = $2', [rating, outputId]);
  }

  async updateOutputContent(outputId: string, editedContent: string): Promise<void> {
    await this.query('UPDATE generated_outputs SET edited_content = $1 WHERE id = $2', [editedContent, outputId]);
  }

  async toggleFavorite(outputId: string): Promise<void> {
    await this.query('UPDATE generated_outputs SET is_favorite = NOT is_favorite WHERE id = $1', [outputId]);
  }

  async deleteOutput(id: string): Promise<void> {
    await this.query('DELETE FROM generated_outputs WHERE id = $1', [id]);
  }

  async getTemplate(format: OutputFormat): Promise<PromptTemplate | null> {
    const rows = await this.query(
      'SELECT * FROM prompt_templates WHERE format = $1 AND is_default = TRUE LIMIT 1',
      [format]
    );
    return rows.length > 0 ? mapTemplate(rows[0]) : null;
  }

  async getDefaultTemplates(): Promise<PromptTemplate[]> {
    const rows = await this.query('SELECT * FROM prompt_templates WHERE is_default = TRUE ORDER BY format');
    return rows.map(mapTemplate);
  }

  async getMostUsedFormats(userId: string, limit = 5): Promise<{ format: OutputFormat; count: number }[]> {
    const rows = await this.query(
      'SELECT format, COUNT(*) as count FROM generated_outputs WHERE user_id = $1 GROUP BY format ORDER BY count DESC LIMIT $2',
      [userId, limit]
    );
    return rows.map((r) => ({ format: r.format as OutputFormat, count: Number(r.count) }));
  }
}
