import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/services/ai/ai-service';
import type { ArticleContext } from '@/lib/services/ai/types';

export const dynamic = 'force-dynamic';

const SOURCE_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#eab308'
];

export async function POST(request: NextRequest) {
  // M2: Proper JSON parse error handling
  let body: { category?: string; articles?: ArticleContext[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const { category, articles } = body;

    const targetCategory = category || 'general';
    const safeArticles: ArticleContext[] = Array.isArray(articles) ? articles : [];

    // Run modular AI analysis with source grounding and misinformation risk detection
    const aiAnalysis = await aiService.analyzeArticles(targetCategory, safeArticles);

    // Compute genuine source breakdown from ingested articles
    const sourceCounts = new Map<string, number>();
    safeArticles.forEach(a => {
      const src = a.source || 'Other';
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
    });

    const totalSources = safeArticles.length || 1;
    const sourceBreakdown = Array.from(sourceCounts.entries()).slice(0, 6).map(([name, count], idx) => ({
      name,
      value: Math.round((count / totalSources) * 100),
      color: SOURCE_COLORS[idx % SOURCE_COLORS.length],
    }));

    if (sourceBreakdown.length === 0) {
      sourceBreakdown.push({ name: 'Verified Sources', value: 100, color: SOURCE_COLORS[0] });
    }

    // Compute genuine publication distribution over the last 7 days
    const today = new Date();
    const dayBuckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }); // M5: use UTC to avoid server-TZ drift
      dayBuckets[key] = 0;
    }

    safeArticles.forEach(a => {
      if (a.pubDate) {
        const d = new Date(a.pubDate);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }); // M5: use UTC to avoid server-TZ drift
          if (dayBuckets[key] !== undefined) {
            dayBuckets[key] += 1;
          }
        }
      }
    });

    const timelineData = Object.entries(dayBuckets).map(([date, count]) => ({
      date,
      articles: count,
      engagement: count * 15, // estimated readership interest factor
    }));

    // Format trending topics
    const trendingTopics = (aiAnalysis.trendingTopics || []).map((t) => ({
      topic: t.topic,
      count: t.relevance * 5,
      change: 0, // Real trend direction requires historical data
    }));

    // M4: When analysis is baseline (AI not configured or fell back), signal 207 Partial Content
    const isBaseline = !aiService.isConfigured() ||
      (aiAnalysis.limitations || '').includes('Live OpenAI inference key not configured');

    return NextResponse.json({
      summary: aiAnalysis.summary,
      keyInsights: aiAnalysis.keyDevelopments,
      verifiedFacts: aiAnalysis.verifiedFacts,
      reportedClaims: aiAnalysis.reportedClaims,
      aiInterpretation: aiAnalysis.aiInterpretation,
      predictions: aiAnalysis.forwardPredictions,
      sentiment: aiAnalysis.sentiment,
      sentimentScore: aiAnalysis.sentimentScore,
      trendingTopics,
      timelineData,
      sourceBreakdown,
      misinformationAssessment: aiAnalysis.misinformationAssessment,
      sourcesAttributed: aiAnalysis.sourcesAttributed,
      limitations: aiAnalysis.limitations,
      ...(isBaseline && { isBaseline: true }),
    }, { status: isBaseline ? 207 : 200 });
  } catch (error: any) {
    console.error('[API /api/analyze-category] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze category' },
      { status: 500 }
    );
  }
}
