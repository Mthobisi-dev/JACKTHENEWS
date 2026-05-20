import { NextRequest, NextResponse } from 'next/server';
import type { NewsAPIResponse, Category } from '@/lib/types';

const API_KEY = 'pub_38d7515157f243258e470e3706b56e98';
const BASE_URL = 'https://newsdata.io/api/1/latest';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = (searchParams.get('category') || 'top') as Category;
  const page = searchParams.get('page') || '';
  const query = searchParams.get('q') || '';

  try {
    const params = new URLSearchParams({
      apikey: API_KEY,
      language: 'en',
      image: '1',
      removeduplicate: '1',
    });

    if (category && category !== 'top') {
      params.append('category', category);
    }

    if (query) {
      params.append('q', query);
    }

    if (page) {
      params.append('page', page);
    }

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data: NewsAPIResponse = await response.json();

    // Filter out articles without images for better UX
    const filteredResults = data.results?.filter(
      (article) => article.image_url && article.title && article.description
    ) || [];

    return NextResponse.json({
      ...data,
      results: filteredResults,
    });
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', status: 'error', results: [] },
      { status: 500 }
    );
  }
}
