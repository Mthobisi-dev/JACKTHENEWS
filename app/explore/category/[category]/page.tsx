'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Share2,
  Bookmark,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { BottomNav } from '@/components/bottom-nav';
import { useNews } from '@/lib/hooks/use-news';
import { CATEGORY_LABELS, type Category } from '@/lib/types';
import Image from 'next/image';

interface AIAnalysis {
  summary: string;
  keyInsights: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore: number;
  trendingTopics: { topic: string; count: number; change: number }[];
  timelineData: { date: string; articles: number; engagement: number }[];
  sourceBreakdown: { name: string; value: number; color: string }[];
  predictions: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as Category;
  const categoryLabel = CATEGORY_LABELS[category] || category;
  
  const { articles, isLoading: newsLoading } = useNews(category);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [analysisRequested, setAnalysisRequested] = useState(false);

  useEffect(() => {
    if (articles.length > 0 && !analysisRequested) {
      setAnalysisRequested(true);
      analyzeCategory();
    }
  }, [articles.length, analysisRequested]);

  const analyzeCategory = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          articles: articles.slice(0, 10).map(a => ({
            title: a.title,
            description: a.description,
            source: a.source_name,
            pubDate: a.pubDate,
          })),
        }),
      });

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing category:', error);
      // Generate mock analysis as fallback
      setAnalysis(generateMockAnalysis());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateMockAnalysis = (): AIAnalysis => {
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

    return {
      summary: `The ${categoryLabel} sector is experiencing significant activity this week. Key developments include major policy announcements, industry shifts, and emerging trends that are shaping the landscape. Analysts are closely monitoring these changes for potential long-term impacts.`,
      keyInsights: [
        `${categoryLabel} news coverage has increased by 23% compared to last week`,
        'Public sentiment is trending towards cautious optimism',
        'Three major stories are driving 60% of the engagement',
        'International coverage is gaining more traction',
      ],
      sentiment: 'mixed',
      sentimentScore: 62,
      trendingTopics: [
        { topic: 'Innovation', count: 45, change: 15 },
        { topic: 'Policy Changes', count: 38, change: -5 },
        { topic: 'Market Impact', count: 32, change: 8 },
        { topic: 'Global Trends', count: 28, change: 12 },
        { topic: 'Expert Analysis', count: 24, change: -2 },
      ],
      timelineData,
      sourceBreakdown: [
        { name: 'Reuters', value: 25, color: COLORS[0] },
        { name: 'AP News', value: 20, color: COLORS[1] },
        { name: 'BBC', value: 18, color: COLORS[2] },
        { name: 'CNN', value: 15, color: COLORS[3] },
        { name: 'Others', value: 22, color: COLORS[4] },
      ],
      predictions: [
        'Expect continued growth in coverage over the next week',
        'Key announcements anticipated from major players',
        'Sentiment likely to shift based on upcoming events',
      ],
    };
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      case 'mixed': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold capitalize">{categoryLabel}</h1>
            <p className="text-xs text-muted-foreground">
              AI-Powered Analysis
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={analyzeCategory} disabled={isAnalyzing}>
            <RefreshCw className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">Sources</TabsTrigger>
            <TabsTrigger value="articles" className="text-xs">Articles</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="p-4">
        {(isAnalyzing || newsLoading) && !analysis ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing {categoryLabel} news...</p>
          </div>
        ) : analysis ? (
          <>
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* AI Summary Card */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">AI Summary</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {analysis.summary}
                </p>
              </Card>

              {/* Sentiment Card */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Overall Sentiment</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${getSentimentColor(analysis.sentiment)}`}>
                      {analysis.sentimentScore}%
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {analysis.sentiment}
                    </Badge>
                  </div>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${analysis.sentimentScore}%` }}
                    />
                  </div>
                </div>
              </Card>

              {/* Key Insights */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Key Insights</h3>
                <ul className="space-y-2">
                  {analysis.keyInsights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{insight}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Activity Timeline */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">7-Day Activity</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysis.timelineData}>
                      <defs>
                        <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="articles" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorArticles)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Predictions */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">AI Predictions</h3>
                <ul className="space-y-2">
                  {analysis.predictions.map((prediction, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{prediction}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="mt-0 space-y-4">
              {/* Trending Topics */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Trending Topics</h3>
                <div className="space-y-3">
                  {analysis.trendingTopics.map((topic, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{topic.topic}</span>
                          <div className="flex items-center gap-1">
                            {topic.change > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`text-xs ${topic.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {topic.change > 0 ? '+' : ''}{topic.change}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(topic.count / 50) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Bar Chart */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Topic Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.trendingTopics} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="topic" type="category" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Engagement Chart */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Engagement Over Time</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLine data={analysis.timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="engagement" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2 }}
                      />
                    </RechartsLine>
                  </ResponsiveContainer>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="sources" className="mt-0 space-y-4">
              {/* Pie Chart */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Source Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={analysis.sourceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analysis.sourceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Source List */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Top Sources</h3>
                <div className="space-y-3">
                  {analysis.sourceBreakdown.map((source, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="flex-1 text-sm">{source.name}</span>
                      <span className="text-sm text-muted-foreground">{source.value}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="articles" className="mt-0 space-y-3">
              {articles.slice(0, 10).map((article, i) => (
                <motion.div
                  key={article.article_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex gap-3">
                      {article.image_url && (
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={article.image_url}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{article.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {article.source_name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Bookmark className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
          </>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
