import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDBProvider } from '@/lib/db';
import { getAIProvider } from '@/lib/ai';
import { buildPrompt } from '@/lib/prompts/prompt-builder';
import { getDefaultTemplate } from '@/lib/prompts/format-prompts';
import type { OutputFormat, Tone } from '@/types';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const { id, action, value } = body as {
    id: string;
    action: 'rate' | 'edit' | 'favorite';
    value?: string;
  };

  const db = getDBProvider();

  if (action === 'rate') {
    await db.updateOutputRating(id, value as 'up' | 'down' | null);
  } else if (action === 'edit') {
    await db.updateOutputContent(id, value as string);
  } else if (action === 'favorite') {
    await db.toggleFavorite(id);
  }

  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { sourceId, format, tone = 'professional', customInstructions = '' } = body as {
    sourceId: string;
    format: OutputFormat;
    tone?: Tone;
    customInstructions?: string;
  };

  const db = getDBProvider();
  const ai = getAIProvider();

  const source = await db.getSourceById(sourceId);
  if (!source || source.userId !== userId) {
    return new Response(JSON.stringify({ error: 'Source not found' }), { status: 404 });
  }

  let template = await db.getTemplate(format);
  if (!template) {
    template = getDefaultTemplate(format);
  }

  const { systemPrompt, userPrompt } = buildPrompt(template, source.content, tone, customInstructions);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let fullContent = '';
      let resultData = { model: '', inputTokens: 0, outputTokens: 0 };

      try {
        for await (const chunk of ai.generateStream({ systemPrompt, userContent: userPrompt })) {
          if (chunk.type === 'text' && chunk.text) {
            fullContent += chunk.text;
            controller.enqueue(encoder.encode(`event: text\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`));
          } else if (chunk.type === 'done' && chunk.result) {
            fullContent = chunk.result.content;
            resultData = {
              model: chunk.result.model,
              inputTokens: chunk.result.inputTokens,
              outputTokens: chunk.result.outputTokens,
            };
          }
        }

        const output = await db.createOutput({
          contentSourceId: sourceId,
          userId,
          format,
          content: fullContent,
          modelUsed: resultData.model,
          tokensInput: resultData.inputTokens,
          tokensOutput: resultData.outputTokens,
          generationTimeMs: Date.now() - startTime,
        });

        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ outputId: output.id })}\n\n`));
      } catch (error) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Regeneration failed' })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  const db = getDBProvider();
  await db.deleteOutput(id);
  return new Response(null, { status: 204 });
}
