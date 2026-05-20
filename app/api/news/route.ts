import { NextRequest, NextResponse } from 'next/server';
import type { NewsAPIResponse, Category, Article } from '@/lib/types';

// Multiple API keys for fallback
const NEWS_APIS = {
  newsdata: {
    key: process.env.NEWSDATA_API_KEY || 'pub_38d7515157f243258e470e3706b56e98',
    baseUrl: 'https://newsdata.io/api/1/latest',
  },
  mediastack: {
    key: process.env.MEDIASTACK_API_KEY || '6ea6ac5bb32eb3379eb5c46fc5d47c36',
    baseUrl: 'http://api.mediastack.com/v1/news',
  },
  thenewsapi: {
    key: process.env.THENEWSAPI_KEY || 'f7a7a3fd6e599c5fb3fe8ffa83a01815f0a030ab22c397ae7667e1a8b95cf702',
    baseUrl: 'https://api.thenewsapi.com/v1/news/all',
  },
};

// Category mapping for different APIs
const categoryMapping: Record<string, { newsdata: string; mediastack: string; thenewsapi: string }> = {
  top: { newsdata: 'top', mediastack: 'general', thenewsapi: 'general' },
  world: { newsdata: 'world', mediastack: 'general', thenewsapi: 'general' },
  business: { newsdata: 'business', mediastack: 'business', thenewsapi: 'business' },
  technology: { newsdata: 'technology', mediastack: 'technology', thenewsapi: 'tech' },
  entertainment: { newsdata: 'entertainment', mediastack: 'entertainment', thenewsapi: 'entertainment' },
  sports: { newsdata: 'sports', mediastack: 'sports', thenewsapi: 'sports' },
  science: { newsdata: 'science', mediastack: 'science', thenewsapi: 'science' },
  health: { newsdata: 'health', mediastack: 'health', thenewsapi: 'health' },
  politics: { newsdata: 'politics', mediastack: 'general', thenewsapi: 'general' },
};

async function fetchFromNewsdata(category: string, query?: string, page?: string): Promise<NewsAPIResponse> {
  const params = new URLSearchParams({
    apikey: NEWS_APIS.newsdata.key,
    language: 'en',
    image: '1',
    removeduplicate: '1',
  });

  const mappedCategory = categoryMapping[category]?.newsdata || 'top';
  if (mappedCategory && mappedCategory !== 'top') {
    params.append('category', mappedCategory);
  }

  if (query) params.append('q', query);
  if (page) params.append('page', page);

  const response = await fetch(`${NEWS_APIS.newsdata.baseUrl}?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`NewsData API error: ${response.status}`);
  return response.json();
}

async function fetchFromMediastack(category: string, query?: string): Promise<NewsAPIResponse> {
  const params = new URLSearchParams({
    access_key: NEWS_APIS.mediastack.key,
    languages: 'en',
    limit: '50',
  });

  const mappedCategory = categoryMapping[category]?.mediastack || 'general';
  if (mappedCategory) params.append('categories', mappedCategory);
  if (query) params.append('keywords', query);

  const response = await fetch(`${NEWS_APIS.mediastack.baseUrl}?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`Mediastack API error: ${response.status}`);
  
  const data = await response.json();
  
  // Transform Mediastack format to our standard format
  const results: Article[] = (data.data || []).map((item: Record<string, unknown>, index: number) => ({
    article_id: `ms-${index}-${Date.now()}`,
    title: item.title as string,
    description: item.description as string,
    link: item.url as string,
    image_url: item.image as string | null,
    source_id: item.source as string,
    source_name: item.source as string,
    pubDate: item.published_at as string,
    category: [category],
    country: ['us'],
    language: 'en',
  }));

  return { status: 'success', results, nextPage: null };
}

async function fetchFromTheNewsAPI(category: string, query?: string): Promise<NewsAPIResponse> {
  const params = new URLSearchParams({
    api_token: NEWS_APIS.thenewsapi.key,
    language: 'en',
    limit: '50',
  });

  const mappedCategory = categoryMapping[category]?.thenewsapi || 'general';
  if (mappedCategory) params.append('categories', mappedCategory);
  if (query) params.append('search', query);

  const response = await fetch(`${NEWS_APIS.thenewsapi.baseUrl}?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`TheNewsAPI error: ${response.status}`);
  
  const data = await response.json();
  
  // Transform TheNewsAPI format to our standard format
  const results: Article[] = (data.data || []).map((item: Record<string, unknown>) => ({
    article_id: item.uuid as string,
    title: item.title as string,
    description: item.description as string || item.snippet as string,
    link: item.url as string,
    image_url: item.image_url as string | null,
    source_id: item.source as string,
    source_name: item.source as string,
    pubDate: item.published_at as string,
    category: [category],
    country: ['us'],
    language: 'en',
  }));

  return { status: 'success', results, nextPage: null };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = (searchParams.get('category') || 'top') as Category;
  const page = searchParams.get('page') || '';
  const query = searchParams.get('q') || '';

  let lastError: Error | null = null;

  // Try NewsData.io first (primary)
  try {
    const data = await fetchFromNewsdata(category, query, page);
    const filteredResults = data.results?.filter(
      (article) => article.image_url && article.title && article.description
    ) || [];

    if (filteredResults.length > 0) {
      return NextResponse.json({
        ...data,
        results: filteredResults,
      });
    }
  } catch (error) {
    console.error('NewsData API failed:', error);
    lastError = error as Error;
  }

  // Try TheNewsAPI as second fallback
  try {
    const data = await fetchFromTheNewsAPI(category, query);
    const filteredResults = data.results?.filter(
      (article) => article.image_url && article.title && article.description
    ) || [];

    if (filteredResults.length > 0) {
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('TheNewsAPI failed:', error);
    lastError = error as Error;
  }

  // Try Mediastack as last fallback
  try {
    const data = await fetchFromMediastack(category, query);
    const filteredResults = data.results?.filter(
      (article) => article.image_url && article.title
    ) || [];

    if (filteredResults.length > 0) {
      return NextResponse.json({
        ...data,
        results: filteredResults,
      });
    }
  } catch (error) {
    console.error('Mediastack API failed:', error);
    lastError = error as Error;
  }

  // All APIs failed
  console.error('All news APIs failed:', lastError);
  return NextResponse.json(
    { error: 'Failed to fetch news from all sources', status: 'error', results: [] },
    { status: 500 }
  );
}
