import Groq from 'groq-sdk';
import type { AIProvider } from './ai-provider';
import type { GenerateOptions, GenerateResult, StreamChunk } from '@/types';

const GROQ_TOKEN_LIMIT = 12000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

function truncateToTokenLimit(systemPrompt: string, userContent: string, maxOutputTokens: number): { system: string; user: string } {
  const maxInputTokens = GROQ_TOKEN_LIMIT - maxOutputTokens;
  const systemTokens = Math.ceil(systemPrompt.length / CHARS_PER_TOKEN_ESTIMATE);
  const availableForUser = Math.max(500, maxInputTokens - systemTokens);
  const maxUserChars = availableForUser * CHARS_PER_TOKEN_ESTIMATE;

  if (userContent.length > maxUserChars) {
    return {
      system: systemPrompt,
      user: userContent.slice(0, maxUserChars) + '\n\n[Content truncated to fit token limits. Focus on the content provided above.]',
    };
  }

  return { system: systemPrompt, user: userContent };
}

export class GroqAIProvider implements AIProvider {
  private client: Groq;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'llama-3.3-70b-versatile') {
    this.client = new Groq({ apiKey });
    this.defaultModel = defaultModel;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const maxTokens = Math.min(options.maxTokens ?? 4000, 6000);
    const { system, user } = truncateToTokenLimit(options.systemPrompt, options.userContent, maxTokens);

    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }

  async *generateStream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const maxTokens = Math.min(options.maxTokens ?? 4000, 6000);
    const { system, user } = truncateToTokenLimit(options.systemPrompt, options.userContent, maxTokens);

    const stream = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    let fullContent = '';
    let model = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        yield { type: 'text', text: delta };
      }
      if (chunk.model) {
        model = chunk.model;
      }
    }

    yield {
      type: 'done',
      result: {
        content: fullContent,
        model,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }
}
