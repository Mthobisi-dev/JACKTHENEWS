import type { INewsProvider, NewsQueryOptions, IngestedNewsResponse, ProviderHealth } from './types';
import { NewsDataProvider } from './providers/newsdata';
import { MediaStackProvider } from './providers/mediastack';
import { TheNewsApiProvider } from './providers/thenewsapi';
import type { NewsArticle } from '@/lib/types';

interface CachedEntry {
  data: IngestedNewsResponse;
  timestamp: number;
}

export class NewsAggregatorService {
  private static instance: NewsAggregatorService;
  private providers: INewsProvider[];
  private cache: Map<string, CachedEntry> = new Map();
  private readonly CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache
  private providerMetrics: Map<string, { requests: number; failures: number; lastError?: string }> = new Map();

  private constructor() {
    this.providers = [
      new NewsDataProvider(),
      new MediaStackProvider(),
      new TheNewsApiProvider(),
    ];

    this.providers.forEach(p => {
      this.providerMetrics.set(p.name, { requests: 0, failures: 0 });
    });
  }

  public static getInstance(): NewsAggregatorService {
    if (!NewsAggregatorService.instance) {
      NewsAggregatorService.instance = new NewsAggregatorService();
    }
    return NewsAggregatorService.instance;
  }

  /**
   * Generates a deterministic cache key for query options
   */
  private getCacheKey(options: NewsQueryOptions): string {
    return `${options.category || 'all'}:${options.query || ''}:${options.page || '1'}:${options.language || 'en'}`;
  }

  /**
   * Deduplicates articles based on normalized title and URL
   */
  public deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const result: NewsArticle[] = [];

    for (const article of articles) {
      const normalizedUrl = (article.link || '').trim().toLowerCase().replace(/\/$/, '');
      const normalizedTitle = (article.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 60);

      if (normalizedUrl && seenUrls.has(normalizedUrl)) {
        continue;
      }
      if (normalizedTitle && seenTitles.has(normalizedTitle)) {
        continue;
      }

      if (normalizedUrl) seenUrls.add(normalizedUrl);
      if (normalizedTitle) seenTitles.add(normalizedTitle);

      result.push(article);
    }

    return result;
  }

  /**
   * Validates publication dates, dropping invalid future dates or malformed timestamps
   */
  private validateAndSanitizeArticles(articles: NewsArticle[]): NewsArticle[] {
    const now = Date.now() + 1000 * 60 * 60 * 24; // allow up to 24 hours future for timezones
    return articles.filter(article => {
      if (!article.title || article.title.trim() === '') return false;
      if (!article.link || !article.link.startsWith('http')) return false;

      const pubTime = new Date(article.pubDate).getTime();
      if (isNaN(pubTime) || pubTime > now) {
        article.pubDate = new Date().toISOString();
      }
      return true;
    });
  }

  /**
   * Fetches latest news with provider fallback cascade, caching, and deduplication
   */
  public async getNews(options: NewsQueryOptions): Promise<IngestedNewsResponse> {
    const cacheKey = this.getCacheKey(options);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        ...cached.data,
        isCached: true,
      };
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      if (!provider.isConfigured()) {
        continue;
      }

      const metrics = this.providerMetrics.get(provider.name)!;
      metrics.requests += 1;

      try {
        const response = await provider.fetchLatest(options);
        const validArticles = this.validateAndSanitizeArticles(response.articles);
        const deduplicated = this.deduplicateArticles(validArticles);

        const normalizedResponse: IngestedNewsResponse = {
          articles: deduplicated,
          totalResults: response.totalResults || deduplicated.length,
          nextPage: response.nextPage,
          provider: provider.name,
          isCached: false,
        };

        // Cache successful response
        this.cache.set(cacheKey, {
          data: normalizedResponse,
          timestamp: Date.now(),
        });

        return normalizedResponse;
      } catch (err: any) {
        metrics.failures += 1;
        metrics.lastError = err.message;
        lastError = err;
        console.warn(`[NewsAggregator] Provider ${provider.name} failed:`, err.message);
      }
    }

    // If all configured providers fail or none are configured, check stale cache
    if (cached) {
      return {
        ...cached.data,
        isCached: true,
      };
    }

    // Return empty results with diagnostic warning rather than crashing
    return {
      articles: [],
      totalResults: 0,
      nextPage: null,
      provider: 'none (all providers unavailable or unconfigured)',
      isCached: false,
    };
  }

  /**
   * Health status for all registered news providers
   */
  public async getProvidersHealth(): Promise<ProviderHealth[]> {
    const healthPromises = this.providers.map(p => p.checkHealth());
    return Promise.all(healthPromises);
  }

  /**
   * Internal telemetry for admin dashboard
   */
  public getPipelineMetrics() {
    return Array.from(this.providerMetrics.entries()).map(([name, stats]) => ({
      name,
      requests: stats.requests,
      failures: stats.failures,
      lastError: stats.lastError || null,
      successRate: stats.requests > 0 ? (((stats.requests - stats.failures) / stats.requests) * 100).toFixed(1) + '%' : '100%',
    }));
  }
}

export const newsAggregator = NewsAggregatorService.getInstance();
