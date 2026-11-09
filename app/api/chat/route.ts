import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/services/ai/ai-service';
import type { ChatMessage, ArticleContext } from '@/lib/services/ai/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // C5: Fail fast if the AI service is not configured
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured', isBaseline: true },
      { status: 503 }
    );
  }

  // M1: Proper JSON parse error handling
  let body: { messages?: ChatMessage[]; articleContext?: ArticleContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const { messages, articleContext } = body;

    // H1: Strip any system-role messages supplied by the client (prompt injection guard)
    const safeMessages = (messages || []).filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    if (!safeMessages || !Array.isArray(safeMessages) || safeMessages.length === 0) {
      return NextResponse.json(
        { error: 'Valid chat messages array is required' },
        { status: 400 }
      );
    }

    // Limit conversation payload size
    if (safeMessages.length > 20) {
      return NextResponse.json(
        { error: 'Conversation history exceeds maximum turn limit of 20' },
        { status: 400 }
      );
    }

    const result = await aiService.chatWithAssistant(safeMessages, articleContext);

    // M3: Detect fallback/error strings returned by the AI service and signal 503
    const isBaseline =
      result.startsWith('AI intelligence services are operating in baseline mode') ||
      result.startsWith('AI service temporarily unavailable');

    if (isBaseline) {
      return NextResponse.json(
        { message: result, isBaseline: true },
        { status: 503 }
      );
    }

    return NextResponse.json({
      message: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/chat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI chat request' },
      { status: 500 }
    );
  }
}
