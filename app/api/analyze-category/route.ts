import { NextRequest, NextResponse } from 'next/server';

interface ArticleInput {
  title: string;
  description: string;
  source: string;
  pubDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const { category, articles } = await request.json() as { 
      category: string; 
      articles: ArticleInput[] 
    };

    if (!articles || articles.length === 0) {
      return NextResponse.json(generateMockAnalysis(category));
    }

    // Try to use OpenAI for analysis if API key is available
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a news analyst AI. Analyze the given news articles and provide insights in JSON format. Include: summary (2-3 sentences), keyInsights (4 bullet points), sentiment (positive/negative/neutral/mixed), sentimentScore (0-100), trendingTopics (5 topics with count and change percentage), predictions (3 future predictions).`
            },
            {
              role: 'user',
              content: `Analyze these ${category} news articles:\n\n${articles.map(a => `Title: ${a.title}\nDescription: ${a.description}\nSource: ${a.source}`).join('\n\n')}`
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiAnalysis = JSON.parse(data.choices[0].message.content);
        
        // Merge AI analysis with mock data for charts
        const mockData = generateMockAnalysis(category);
        return NextResponse.json({
          ...mockData,
          summary: aiAnalysis.summary || mockData.summary,
          keyInsights: aiAnalysis.keyInsights || mockData.keyInsights,
          sentiment: aiAnalysis.sentiment || mockData.sentiment,
          sentimentScore: aiAnalysis.sentimentScore || mockData.sentimentScore,
          predictions: aiAnalysis.predictions || mockData.predictions,
        });
      }
      } catch (aiError) {
        console.error('OpenAI API error:', aiError);
      }
    }

    // Fallback to mock analysis
    return NextResponse.json(generateMockAnalysis(category));
    
  } catch (error) {
    console.error('Error analyzing category:', error);
    return NextResponse.json(
      { error: 'Failed to analyze category' },
      { status: 500 }
    );
  }
}

function generateMockAnalysis(category: string) {
  const today = new Date();
  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      articles: Math.floor(Math.random() * 50) + 20,
      engagement: Math.floor(Math.random() * 1000) + 500,
    };
  });

  const categoryInsights: Record<string, { summary: string; insights: string[] }> = {
    technology: {
      summary: 'The technology sector continues to evolve rapidly with AI advancements leading the charge. Major tech companies are announcing new products and services while navigating regulatory challenges.',
      insights: [
        'AI and machine learning dominate tech headlines',
        'Cybersecurity concerns are driving increased investment',
        'Cloud computing adoption continues to accelerate',
        'Tech layoffs have slowed compared to previous quarters',
      ],
    },
    business: {
      summary: 'Business news reflects a cautiously optimistic market sentiment. Economic indicators show mixed signals as companies adapt to changing consumer behaviors.',
      insights: [
        'Q4 earnings reports show resilience across sectors',
        'Interest rate decisions continue to impact markets',
        'Supply chain improvements boosting retail confidence',
        'ESG investments gaining mainstream traction',
      ],
    },
    world: {
      summary: 'Global events are shaping international relations and economic policies. Climate initiatives and diplomatic efforts are at the forefront of world news.',
      insights: [
        'Climate summit outcomes driving policy changes',
        'Trade agreements reshaping global commerce',
        'Humanitarian crises requiring international response',
        'Diplomatic tensions affecting regional stability',
      ],
    },
    default: {
      summary: `The ${category} sector is experiencing significant activity this week with multiple developments worth monitoring. Key stakeholders are responding to emerging trends and challenges.`,
      insights: [
        'Coverage has increased by 23% compared to last week',
        'Public sentiment is trending towards cautious optimism',
        'Three major stories are driving 60% of the engagement',
        'International coverage is gaining more traction',
      ],
    },
  };

  const { summary, insights } = categoryInsights[category] || categoryInsights.default;

  return {
    summary,
    keyInsights: insights,
    sentiment: 'mixed' as const,
    sentimentScore: Math.floor(Math.random() * 30) + 50,
    trendingTopics: [
      { topic: 'Innovation', count: 45, change: 15 },
      { topic: 'Policy Changes', count: 38, change: -5 },
      { topic: 'Market Impact', count: 32, change: 8 },
      { topic: 'Global Trends', count: 28, change: 12 },
      { topic: 'Expert Analysis', count: 24, change: -2 },
    ],
    timelineData,
    sourceBreakdown: [
      { name: 'Reuters', value: 25, color: '#3b82f6' },
      { name: 'AP News', value: 20, color: '#10b981' },
      { name: 'BBC', value: 18, color: '#f59e0b' },
      { name: 'CNN', value: 15, color: '#ef4444' },
      { name: 'Others', value: 22, color: '#8b5cf6' },
    ],
    predictions: [
      'Expect continued growth in coverage over the next week',
      'Key announcements anticipated from major players',
      'Sentiment likely to shift based on upcoming events',
    ],
  };
}
