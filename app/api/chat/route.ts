import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, articleContext } = (await request.json()) as {
      messages: ChatMessage[];
      articleContext?: {
        title: string;
        description: string;
        source: string;
      };
    };

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'AI is not configured.', message: 'AI assistance is temporarily unavailable.' },
        { status: 503 },
      );
    }

    const system = articleContext
      ? `You are NowCast AI, a careful news assistant helping a user understand this article.

Title: ${articleContext.title}
Description: ${articleContext.description}
Source: ${articleContext.source}

Explain complex ideas plainly, distinguish verified facts from interpretation, note uncertainty, and provide balanced perspectives. Keep answers concise and relevant to the article.`
      : 'You are NowCast AI, a careful news assistant. Explain current events plainly, distinguish facts from interpretation, mention uncertainty, and provide balanced, concise answers.';

    const conversation = messages
      .filter((message) => message.role !== 'system')
      .slice(-12)
      .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
      .join('\n\n');

    const { text, usage } = await generateText({
      model: google('gemini-2.5-flash'),
      system,
      prompt: conversation || 'Introduce yourself and ask how you can help explain the news.',
    });

    return NextResponse.json({ message: text, usage });
  } catch (error) {
    console.error('[v0] Gemini chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', message: 'AI assistance is temporarily unavailable. Please try again.' },
      { status: 500 },
    );
  }
}
