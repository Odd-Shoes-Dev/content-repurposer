import type { GenerateOptions, GenerateResult, StreamChunk } from '@/types';

export interface AIProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  generateStream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
