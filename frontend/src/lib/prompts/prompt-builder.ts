import type { PromptTemplate, Tone } from '@/types';

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: 'Use a professional, polished tone suitable for business audiences.',
  casual: 'Use a casual, friendly, conversational tone.',
  humorous: 'Use a witty, humorous tone while keeping the information accurate.',
  authoritative: 'Use an authoritative, expert tone that establishes thought leadership.',
};

export function buildPrompt(
  template: PromptTemplate,
  content: string,
  tone: Tone = 'professional',
  customInstructions: string = ''
): { systemPrompt: string; userPrompt: string } {
  let systemPrompt = template.systemPrompt;

  systemPrompt += `\n\n${TONE_INSTRUCTIONS[tone]}`;

  if (customInstructions.trim()) {
    systemPrompt += `\n\nAdditional instructions from the user: ${customInstructions}`;
  }

  const userPrompt = template.userPromptTemplate.replace('{{content}}', content);

  return { systemPrompt, userPrompt };
}
