import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './ai-provider';
import type { GenerateOptions, GenerateResult, StreamChunk } from '@/types';

export class ClaudeAIProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const response = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 16000,
      system: [
        {
          type: 'text',
          text: options.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: options.userContent }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');

    return {
      content: textBlock?.type === 'text' ? textBlock.text : '',
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async *generateStream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const stream = this.client.messages.stream({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 16000,
      system: [
        {
          type: 'text',
          text: options.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: options.userContent }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text', text: event.delta.text };
      }
    }

    const final = await stream.finalMessage();
    const textBlock = final.content.find((b) => b.type === 'text');

    yield {
      type: 'done',
      result: {
        content: textBlock?.type === 'text' ? textBlock.text : '',
        model: final.model,
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
      },
    };
  }
}
