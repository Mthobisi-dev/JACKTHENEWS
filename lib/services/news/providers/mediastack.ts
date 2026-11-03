import type { INewsProvider, NewsQueryOptions, IngestedNewsResponse, ProviderHealth } from '../types';
import type { NewsArticle, Category } from '@/lib/types';

export class MediaStackProvider implements INewsProvider {
  readonly name = 'MediaStack';
  private readonly baseUrl = 'https://api.mediastack.com/v1/news';

  private getApiKey(): string | undefined {
    return process.env.MEDIASTACK_API_KEY;
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
      technology: 'technology',
      entertainment: 'entertainment',
      sports: 'sports',
      science: 'science',
      health: 'health',
      politics: 'general',
    };
    return (category && mapping[category.toLowerCase()]) || 'general';
  }

  async fetchLatest(options: NewsQueryOptions): Promise<IngestedNewsResponse> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('MediaStack API key is not configured');
    }

    const params = new URLSearchParams({
      access_key: key,
      languages: options.language || 'en',
      sort: 'published_desc',
      limit: String(options.limit || 25),
    });

    const category = this.mapCategory(options.category);
    if (category) params.append('categories', category);
    if (options.query) params.append('keywords', options.query);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'JACKTHENEWS-Intelligence/1.0' },
      });

      if (!response.ok) {
        throw new Error(`MediaStack API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'MediaStack API returned an error');
      }

      const articles: NewsArticle[] = (data.data || []).map((raw: any) => ({
        article_id: `ms_${Buffer.from(raw.url || raw.title || Math.random().toString()).toString('base64').substring(0, 16)}`,
        title: raw.title || 'Untitled Article',
        link: raw.url || '',
        keywords: [],
        creator: raw.author ? [raw.author] : null,
        video_url: null,
        description: raw.description || null,
        content: null,
        pubDate: raw.published_at || new Date().toISOString(),
        pubDateTZ: 'UTC',
        image_url: raw.image || null,
        source_id: raw.source || 'mediastack',
        source_name: raw.source || 'MediaStack Provider',
        source_url: raw.url ? new URL(raw.url).origin : '',
        source_icon: null,
        source_priority: 0,
        country: raw.country ? [raw.country] : ['us'],
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
        totalResults: data.pagination?.total || articles.length,
        nextPage: null,
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
