import { NextRequest, NextResponse } from 'next/server';
import { newsAggregator } from '@/lib/services/news/aggregator';
import { sanitizeString } from '@/lib/utils';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = sanitizeString(searchParams.get('category') || 'top') as Category;
    const query = sanitizeString(searchParams.get('q') || '');
    const page = sanitizeString(searchParams.get('page') || '');

    // Input bounds validation
    if (query.length > 200) {
      return NextResponse.json(
        { error: 'Search query exceeds maximum length of 200 characters' },
        { status: 400 }
      );
    }

    const result = await newsAggregator.getNews({
      category,
      query: query || undefined,
      page: page || undefined,
    });

    return NextResponse.json({
      status: 'success',
      totalResults: result.totalResults,
      results: result.articles,
      nextPage: result.nextPage,
      provider: result.provider,
      cached: result.isCached || false,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API /api/news] Request failure:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Unable to retrieve news at this moment. Please try again shortly.',
        results: [],
        totalResults: 0,
        nextPage: null
      },
      { status: 500 }
    );
  }
}
