import type { AIProvider } from './ai-provider';
import { GroqAIProvider } from './groq-provider';
import { ClaudeAIProvider } from './claude-provider';
import { config } from '../config';

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!instance) {
    if (config.aiProvider === 'groq') {
      instance = new GroqAIProvider(config.aiApiKey, config.defaultModel);
    } else if (config.aiProvider === 'anthropic') {
      instance = new ClaudeAIProvider(config.aiApiKey, config.defaultModel);
    } else {
      throw new Error(`Unknown AI provider: ${config.aiProvider}. Set AI_PROVIDER to "groq" or "anthropic".`);
    }
  }
  return instance;
}

export type { AIProvider } from './ai-provider';
