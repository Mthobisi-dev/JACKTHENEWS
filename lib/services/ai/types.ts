export interface ArticleContext {
  title: string;
  description?: string | null;
  source: string;
  link?: string;
  content?: string | null;
  pubDate?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MisinformationAssessment {
  riskScore: number; // 0 - 100
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high';
  unverifiedClaims: string[];
  conflictingReports: string[];
  evidenceQuality: 'strong' | 'moderate' | 'weak' | 'unsubstantiated';
  credibilityNotes: string;
}

export interface StructuredArticleAnalysis {
  summary: string;
  keyDevelopments: string[];
  verifiedFacts: string[];
  reportedClaims: string[];
  aiInterpretation: string;
  forwardPredictions: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore: number; // 0 - 100
  trendingTopics: Array<{ topic: string; relevance: number }>;
  misinformationAssessment: MisinformationAssessment;
  sourcesAttributed: string[];
  limitations: string;
}

export interface AIMetrics {
  totalRequests: number;
  totalTokensEstimated: number;
  failedRequests: number;
  averageLatencyMs: number;
  lastError?: string;
  model: string;
}
