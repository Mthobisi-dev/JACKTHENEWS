import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/services/ai/ai-service';
import type { ChatMessage, ArticleContext } from '@/lib/services/ai/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messages, articleContext } = body as {
      messages?: ChatMessage[];
      articleContext?: ArticleContext;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Valid chat messages array is required' },
        { status: 400 }
      );
    }

    // Limit conversation payload size
    if (messages.length > 20) {
      return NextResponse.json(
        { error: 'Conversation history exceeds maximum turn limit of 20' },
        { status: 400 }
      );
    }

    const response = await aiService.chatWithAssistant(messages, articleContext);

    return NextResponse.json({
      message: response,
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
