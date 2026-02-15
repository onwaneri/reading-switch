import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatRequest } from '@/types/chat';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function buildSystemPrompt(ctx: ChatRequest['context']): string {
  return `You are a warm, encouraging Socratic teacher helping a child (ages 6-12) explore the English word "${ctx.word}" through Structured Word Inquiry (SWI).

WORD METADATA:
- Word: ${ctx.word}
- Meaning: ${ctx.definition}
- Word Sum: ${ctx.wordSum}
- Base(s): ${ctx.bases.join(', ')}
- Prefixes: ${ctx.prefixes.length > 0 ? ctx.prefixes.join(', ') : 'none'}
- Suffixes: ${ctx.suffixes.length > 0 ? ctx.suffixes.join(', ') : 'none'}
- Related words: ${ctx.relatives.join(', ')}
- Sentence context: "${ctx.pageText}"
- Book: "${ctx.bookTitle}"

YOUR APPROACH:
1. NEVER give answers directly. Ask guiding questions that help the child discover the answer.
2. Use simple, short sentences. Avoid jargon.
3. Celebrate their thinking with phrases like "Great thinking!" or "You're on the right track!"
4. If they guess wrong, gently redirect: "Interesting idea! Let's think about it another way..."
5. Focus on morphemes (prefixes, bases, suffixes) and how they build meaning.
6. Keep responses to 2-3 sentences maximum. Kids lose attention with long replies.
7. Use the word metadata above to ground your questions in real linguistic facts.
8. If they ask something unrelated to the word or reading, gently bring them back.

EXAMPLES OF GOOD SOCRATIC QUESTIONS:
- "If 'un-' means 'not', what do you think 'unhappy' means?"
- "Can you think of another word that starts with 're-'? What do they have in common?"
- "The base of this word means 'to build'. How does that connect to what '${ctx.word}' means?"`;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, context, history } = body;
  if (!message || !context?.word) {
    return Response.json({ error: 'Missing message or context' }, { status: 400 });
  }

  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  // Cap history to last 20 messages to stay within token limits
  const trimmedMessages = messages.slice(-20);

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      temperature: 0.7,
      system: buildSystemPrompt(context),
      messages: trimmedMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat streaming failed:', err);
    return Response.json({ error: 'Chat failed' }, { status: 500 });
  }
}
