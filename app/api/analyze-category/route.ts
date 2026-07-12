import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

interface ArticleInput {
  title: string;
  description: string;
  source: string;
  pubDate: string;
}

interface AIAnalysis {
  summary?: string;
  keyInsights?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore?: number;
  trendingTopics?: Array<{ topic: string; count: number; change: number }>;
  predictions?: string[];
}

function buildArticleMetrics(articles: ArticleInput[]) {
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
  const now = new Date();
  const timelineData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - (6 - index));
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const count = articles.filter((article) => {
      const published = new Date(article.pubDate);
      return !Number.isNaN(published.getTime()) && published >= dayStart && published < dayEnd;
    }).length;

    return {
      date: dayFormatter.format(date),
      articles: count,
      engagement: count,
    };
  });

  const sourceCounts = new Map<string, number>();
  for (const article of articles) {
    const source = article.source?.trim() || 'Unknown source';
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const palette = ['#2563eb', '#0f766e', '#d97706', '#dc2626', '#475569'];
  const sourceBreakdown = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], index) => ({ name, value, color: palette[index] }));

  return { timelineData, sourceBreakdown };
}

function extractJson(text: string): AIAnalysis {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};

  try {
    return JSON.parse(match[0]) as AIAnalysis;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category, articles } = (await request.json()) as {
      category: string;
      articles: ArticleInput[];
    };

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: 'No current articles are available for analysis.' },
        { status: 400 },
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'AI analysis is not configured.' },
        { status: 503 },
      );
    }

    const articleSample = articles.slice(0, 20);
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: 'You are a careful news analyst. Base every claim only on the supplied article metadata. Clearly reflect uncertainty and never invent events, sources, statistics, or quotations. Return valid JSON only.',
      prompt: `Analyze these current ${category} articles and return this exact JSON shape:
{
  "summary": "2-3 plain-language sentences",
  "keyInsights": ["four evidence-based insights"],
  "sentiment": "positive|negative|neutral|mixed",
  "sentimentScore": 0,
  "trendingTopics": [{"topic":"topic name","count":1,"change":0}],
  "predictions": ["up to three cautious developments to watch, phrased as possibilities"]
}

Use sentimentScore from 0 (very negative) to 100 (very positive). For topic counts, count appearances in the supplied stories. Use change 0 because no historical comparison is supplied.

${articleSample
        .map(
          (article, index) =>
            `${index + 1}. ${article.title}\nDescription: ${article.description || 'Not provided'}\nSource: ${article.source || 'Unknown'}\nPublished: ${article.pubDate || 'Unknown'}`,
        )
        .join('\n\n')}`,
    });

    const analysis = extractJson(text);
    const metrics = buildArticleMetrics(articles);

    return NextResponse.json({
      summary: analysis.summary ?? 'The AI could not summarize these stories reliably. Review the current headlines below.',
      keyInsights: Array.isArray(analysis.keyInsights) ? analysis.keyInsights.slice(0, 4) : [],
      sentiment: analysis.sentiment ?? 'neutral',
      sentimentScore: Math.min(100, Math.max(0, Number(analysis.sentimentScore) || 50)),
      trendingTopics: Array.isArray(analysis.trendingTopics) ? analysis.trendingTopics.slice(0, 5) : [],
      predictions: Array.isArray(analysis.predictions) ? analysis.predictions.slice(0, 3) : [],
      ...metrics,
    });
  } catch (error) {
    console.error('[v0] Gemini category analysis error:', error);
    return NextResponse.json(
      { error: 'AI analysis is temporarily unavailable.' },
      { status: 500 },
    );
  }
}
