import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIProvider } from '@/lib/ai';
import { getDBProvider } from '@/lib/db';
import { buildPrompt } from '@/lib/prompts/prompt-builder';
import { getDefaultTemplate } from '@/lib/prompts/format-prompts';
import { config } from '@/lib/config';
import { rateLimit } from '@/lib/rate-limit';
import type { OutputFormat, Tone } from '@/types';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { allowed } = rateLimit(`repurpose:${userId}`, 10, 60_000);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), { status: 429 });
  }

  const body = await request.json();
  const {
    content,
    formats,
    title,
    tone = 'professional',
    customInstructions = '',
  } = body as {
    content: string;
    formats: OutputFormat[];
    title?: string;
    tone?: Tone;
    customInstructions?: string;
  };

  if (!content?.trim() || !formats?.length) {
    return new Response(JSON.stringify({ error: 'Content and at least one format are required' }), { status: 400 });
  }

  const db = getDBProvider();
  const ai = getAIProvider();

  const user = await db.getUserById(userId);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  const planLimits = config.plans[user.plan];
  if (user.monthlyRequestsResetAt < new Date()) {
    await db.resetMonthlyRequests(userId);
    user.monthlyRequestsUsed = 0;
  }
  if (user.monthlyRequestsUsed >= planLimits.monthlyRequests) {
    return new Response(JSON.stringify({ error: 'Monthly request limit reached. Please upgrade your plan.' }), { status: 429 });
  }

  const wordCount = content.trim().split(/\s+/).length;
  const source = await db.createSource({
    userId,
    title: title || `Untitled - ${new Date().toLocaleDateString()}`,
    content,
    wordCount,
    tone,
    customInstructions,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < formats.length; i++) {
        const format = formats[i];
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
        let template = await db.getTemplate(format);
        if (!template) {
          template = getDefaultTemplate(format);
        }

        const { systemPrompt, userPrompt } = buildPrompt(template, content, tone, customInstructions);

        controller.enqueue(
          encoder.encode(`event: format-start\ndata: ${JSON.stringify({ format })}\n\n`)
        );

        const startTime = Date.now();
        let fullContent = '';
        let resultData = { model: '', inputTokens: 0, outputTokens: 0 };

        try {
          for await (const chunk of ai.generateStream({ systemPrompt, userContent: userPrompt })) {
            if (chunk.type === 'text' && chunk.text) {
              fullContent += chunk.text;
              controller.enqueue(
                encoder.encode(`event: text\ndata: ${JSON.stringify({ format, text: chunk.text })}\n\n`)
              );
            } else if (chunk.type === 'done' && chunk.result) {
              fullContent = chunk.result.content;
              resultData = {
                model: chunk.result.model,
                inputTokens: chunk.result.inputTokens,
                outputTokens: chunk.result.outputTokens,
              };
            }
          }

          const generationTimeMs = Date.now() - startTime;

          await db.createOutput({
            contentSourceId: source.id,
            userId,
            format,
            content: fullContent,
            modelUsed: resultData.model,
            tokensInput: resultData.inputTokens,
            tokensOutput: resultData.outputTokens,
            generationTimeMs,
          });

          controller.enqueue(
            encoder.encode(`event: format-done\ndata: ${JSON.stringify({ format })}\n\n`)
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ format, error: error instanceof Error ? error.message : 'Generation failed' })}\n\n`)
          );
        }
      }

      await db.incrementRequestCount(userId);

      controller.enqueue(encoder.encode(`event: complete\ndata: ${JSON.stringify({ sourceId: source.id })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
