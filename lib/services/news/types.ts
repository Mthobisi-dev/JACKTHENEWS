import type { Category, NewsArticle } from '@/lib/types';

export interface NewsQueryOptions {
  category?: Category | string;
  query?: string;
  page?: string;
  limit?: number;
  language?: string;
  country?: string;
}

export interface ProviderHealth {
  name: string;
  isConfigured: boolean;
  status: 'operational' | 'degraded' | 'offline' | 'unconfigured';
  lastChecked: string;
  consecutiveFailures: number;
  latencyMs: number;
  error?: string;
}

export interface IngestedNewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  nextPage: string | null;
  provider: string;
  isCached?: boolean;
}

export interface INewsProvider {
  readonly name: string;
  isConfigured(): boolean;
  fetchLatest(options: NewsQueryOptions): Promise<IngestedNewsResponse>;
  checkHealth(): Promise<ProviderHealth>;
}
