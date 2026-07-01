import type { OutputFormat, PromptTemplate } from '@/types';

const VARIATION_SEP = '\n---\n';

/**
 * Formats that benefit from multiple ready-to-post variations.
 * The prompt instructs the AI to output exactly 3 variations separated by VARIATION_SEP.
 * All other formats produce a single structured output.
 */
export const MULTI_VARIATION_FORMATS: OutputFormat[] = ['linkedin', 'twitter_thread', 'video_script'];

export { VARIATION_SEP };

const DEFAULTS: Record<OutputFormat, Pick<PromptTemplate, 'name' | 'systemPrompt' | 'userPromptTemplate'>> = {
  blog: {
    name: 'Blog Article',
    systemPrompt: 'You are an expert content writer. Transform the provided content into a well-structured blog article. Include a compelling title, introduction, subheadings, and a conclusion. Maintain the key ideas from the original. Write in a clear, engaging style. No emojis. Output the article directly with no preamble.',
    userPromptTemplate: 'Transform the following content into a blog article:\n\n{{content}}',
  },
  linkedin: {
    name: 'LinkedIn Post',
    systemPrompt: 'You are a LinkedIn content strategist. Write 3 distinct LinkedIn post variations based on the provided content. Rules: no emojis, no preamble or intro sentence, each post is self-contained and under 3000 characters, professional yet conversational tone, end with a question or call-to-action. Separate each variation with exactly this on its own line:\n---\nDo not number them or add any labels.',
    userPromptTemplate: 'Write 3 LinkedIn post variations from the following content:\n\n{{content}}',
  },
  twitter_thread: {
    name: 'X/Twitter Thread',
    systemPrompt: 'You are a Twitter/X content expert. Write 3 distinct thread variations based on the provided content. Rules: no emojis, no preamble, each thread has 5-8 tweets, each tweet is under 280 characters, number tweets as 1/ 2/ 3/ etc., the first tweet is a hook, end with a call-to-action. Separate each thread variation with exactly this on its own line:\n---\nDo not add any labels or headings.',
    userPromptTemplate: 'Write 3 X/Twitter thread variations from the following content:\n\n{{content}}',
  },
  video_script: {
    name: 'Short-Form Video Script',
    systemPrompt: 'You are a short-form video content creator. Write 3 distinct video script variations (TikTok / Reels / Shorts) based on the provided content. Rules: no emojis, no preamble, each script is 30-60 seconds when spoken, include a hook in the first 3 seconds, add visual/action cues in brackets, end with a strong call-to-action. Separate each script with exactly this on its own line:\n---\nDo not number or label them.',
    userPromptTemplate: 'Write 3 short-form video script variations from the following content:\n\n{{content}}',
  },
  newsletter: {
    name: 'Email Newsletter',
    systemPrompt: 'You are an email marketing expert. Transform the provided content into a complete email newsletter. Include a subject line, preview text, a greeting, well-organized sections with brief paragraphs, and a clear call-to-action. No emojis. Output directly with no preamble.',
    userPromptTemplate: 'Create an email newsletter from the following content:\n\n{{content}}',
  },
  quote_graphics: {
    name: 'Quote Graphics',
    systemPrompt: 'You are a visual content strategist. Extract 6-8 powerful, standalone quotes from the provided content suitable for social media quote graphics. Each quote must be impactful, under 150 characters, and meaningful without context. No emojis. Output each quote on its own line, no numbering, no preamble.',
    userPromptTemplate: 'Extract shareable quotes from the following content:\n\n{{content}}',
  },
  carousel: {
    name: 'Carousel Post',
    systemPrompt: 'You are a social media carousel expert. Transform the provided content into a carousel post with 8-12 slides. Slide 1 is the hook/title. Each subsequent slide covers one key point concisely (under 100 words). The final slide is a call-to-action. No emojis. Format as "Slide 1:" "Slide 2:" etc. Output directly with no preamble.',
    userPromptTemplate: 'Create a carousel post from the following content:\n\n{{content}}',
  },
  takeaways: {
    name: 'Key Takeaways & FAQs',
    systemPrompt: 'You are a content analyst. Extract the key takeaways and create a FAQ from the provided content. Output 5-10 key takeaways as concise bullet points, then 5-8 questions with clear answers. No emojis. Output directly with no preamble.',
    userPromptTemplate: 'Extract key takeaways and create FAQs from the following content:\n\n{{content}}',
  },
};

export function getDefaultTemplate(format: OutputFormat): PromptTemplate {
  const d = DEFAULTS[format];
  return {
    id: `default-${format}`,
    format,
    name: d.name,
    systemPrompt: d.systemPrompt,
    userPromptTemplate: d.userPromptTemplate,
    isDefault: true,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function getAllDefaultTemplates(): PromptTemplate[] {
  return (Object.keys(DEFAULTS) as OutputFormat[]).map(getDefaultTemplate);
}
