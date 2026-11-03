import type { INewsProvider, NewsQueryOptions, IngestedNewsResponse, ProviderHealth } from '../types';
import type { NewsArticle, Category } from '@/lib/types';

export class NewsDataProvider implements INewsProvider {
  readonly name = 'NewsData.io';
  private readonly baseUrl = 'https://newsdata.io/api/1/latest';

  private getApiKey(): string | undefined {
    return process.env.NEWSDATA_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim() !== '' && !key.includes('your-'));
  }

  private mapCategory(category?: string): string {
    const mapping: Record<string, string> = {
      top: 'top',
      world: 'world',
      business: 'business',
      technology: 'technology',
      entertainment: 'entertainment',
      sports: 'sports',
      science: 'science',
      health: 'health',
      politics: 'politics',
    };
    return (category && mapping[category.toLowerCase()]) || 'top';
  }

  async fetchLatest(options: NewsQueryOptions): Promise<IngestedNewsResponse> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('NewsData API key is not configured');
    }

    const params = new URLSearchParams({
      apikey: key,
      language: options.language || 'en',
      image: '1',
      removeduplicate: '1',
    });

    const category = this.mapCategory(options.category);
    if (category && category !== 'top') {
      params.append('category', category);
    }

    if (options.query) params.append('q', options.query);
    if (options.page) params.append('page', options.page);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'JACKTHENEWS-Intelligence/1.0' },
      });

      if (!response.ok) {
        throw new Error(`NewsData API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.results?.message || 'NewsData API returned non-success status');
      }

      const articles: NewsArticle[] = (data.results || []).map((raw: any) => ({
        article_id: raw.article_id || `nd_${Math.random().toString(36).substring(2, 9)}`,
        title: raw.title || 'Untitled Article',
        link: raw.link || '',
        keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
        creator: Array.isArray(raw.creator) ? raw.creator : raw.creator ? [raw.creator] : null,
        video_url: raw.video_url || null,
        description: raw.description || null,
        content: raw.content || null,
        pubDate: raw.pubDate || new Date().toISOString(),
        pubDateTZ: raw.pubDateTZ || 'UTC',
        image_url: raw.image_url || null,
        source_id: raw.source_id || 'unknown',
        source_name: raw.source_name || raw.source_id || 'News Provider',
        source_url: raw.source_url || '',
        source_icon: raw.source_icon || null,
        source_priority: raw.source_priority || 0,
        country: Array.isArray(raw.country) ? raw.country : ['us'],
        category: Array.isArray(raw.category) ? raw.category : [options.category as Category || 'top'],
        language: raw.language || 'en',
        ai_tag: raw.ai_tag || null,
        sentiment: raw.sentiment || null,
        sentiment_stats: raw.sentiment_stats || null,
        ai_region: raw.ai_region || null,
        ai_org: raw.ai_org || null,
        duplicate: Boolean(raw.duplicate),
      }));

      return {
        articles,
        totalResults: data.totalResults || articles.length,
        nextPage: data.nextPage || null,
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
