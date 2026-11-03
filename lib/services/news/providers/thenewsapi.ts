import type { INewsProvider, NewsQueryOptions, IngestedNewsResponse, ProviderHealth } from '../types';
import type { NewsArticle, Category } from '@/lib/types';

export class TheNewsApiProvider implements INewsProvider {
  readonly name = 'TheNewsAPI';
  private readonly baseUrl = 'https://api.thenewsapi.com/v1/news/all';

  private getApiKey(): string | undefined {
    return process.env.THENEWSAPI_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim() !== '' && !key.includes('your-'));
  }

  private mapCategory(category?: string): string {
    const mapping: Record<string, string> = {
      top: 'general',
      world: 'general',
      business: 'business',
      technology: 'tech',
      entertainment: 'entertainment',
      sports: 'sports',
      science: 'science',
      health: 'health',
      politics: 'politics',
    };
    return (category && mapping[category.toLowerCase()]) || 'general';
  }

  async fetchLatest(options: NewsQueryOptions): Promise<IngestedNewsResponse> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('TheNewsAPI key is not configured');
    }

    const params = new URLSearchParams({
      api_token: key,
      language: options.language || 'en',
      limit: String(options.limit || 25),
    });

    const category = this.mapCategory(options.category);
    if (category) params.append('categories', category);
    if (options.query) params.append('search', options.query);
    if (options.page) params.append('page', options.page);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'JACKTHENEWS-Intelligence/1.0' },
      });

      if (!response.ok) {
        throw new Error(`TheNewsAPI HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const articles: NewsArticle[] = (data.data || []).map((raw: any) => ({
        article_id: raw.uuid || `tna_${Math.random().toString(36).substring(2, 9)}`,
        title: raw.title || 'Untitled Article',
        link: raw.url || '',
        keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
        creator: raw.source ? [raw.source] : null,
        video_url: null,
        description: raw.description || raw.snippet || null,
        content: null,
        pubDate: raw.published_at || new Date().toISOString(),
        pubDateTZ: 'UTC',
        image_url: raw.image_url || null,
        source_id: raw.source || 'thenewsapi',
        source_name: raw.source || 'TheNewsAPI Provider',
        source_url: raw.url ? new URL(raw.url).origin : '',
        source_icon: null,
        source_priority: 0,
        country: ['us'],
        category: [options.category as Category || 'top'],
        language: raw.language || 'en',
        ai_tag: null,
        sentiment: null,
        sentiment_stats: null,
        ai_region: null,
        ai_org: null,
        duplicate: false,
      }));

      return {
        articles,
        totalResults: data.meta?.found || articles.length,
        nextPage: data.meta?.page ? String(data.meta.page + 1) : null,
        provider: this.name,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    const isConfigured = this.isConfigured();
    if (!isConfigured) {
      return {
        name: this.name,
        isConfigured: false,
        status: 'unconfigured',
        lastChecked: new Date().toISOString(),
        consecutiveFailures: 0,
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      await this.fetchLatest({ limit: 1 });
      return {
        name: this.name,
        isConfigured: true,
        status: 'operational',
        lastChecked: new Date().toISOString(),
        consecutiveFailures: 0,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        name: this.name,
        isConfigured: true,
        status: 'degraded',
        lastChecked: new Date().toISOString(),
        consecutiveFailures: 1,
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
  }
}
