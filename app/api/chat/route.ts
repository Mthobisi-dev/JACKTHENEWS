import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, articleContext } = body as {
      messages: ChatMessage[];
      articleContext?: {
        title: string;
        description: string;
        source: string;
      };
    };

    // Build system message with article context if provided
    const systemMessage: ChatMessage = {
      role: 'system',
      content: articleContext
        ? `You are NowCast AI, a helpful and knowledgeable news assistant. You're currently helping the user understand and discuss this news article:

Title: ${articleContext.title}
Description: ${articleContext.description}
Source: ${articleContext.source}

Provide insightful analysis, answer questions about the article, explain complex topics in simple terms, and offer balanced perspectives. Be concise but informative. If asked about topics outside the article, you can help with general news-related questions.`
        : `You are NowCast AI, a helpful and knowledgeable news assistant. Help users understand current events, explain complex news topics in simple terms, provide balanced perspectives on issues, and answer questions about news and current affairs. Be concise, accurate, and engaging.`,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemMessage, ...messages],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return NextResponse.json({
      message: assistantMessage,
      usage: data.usage,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', message: 'I apologize, but I encountered an error. Please try again.' },
      { status: 500 }
    );
  }
}
