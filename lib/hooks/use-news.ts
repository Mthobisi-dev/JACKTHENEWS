'use client';

import useSWRInfinite from 'swr/infinite';
import type { NewsAPIResponse, Category } from '@/lib/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch news');
  }
  return res.json();
};

export function useNews(category: Category = 'top', query?: string) {
  const getKey = (pageIndex: number, previousPageData: NewsAPIResponse | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextPage) return null;

    const params = new URLSearchParams();
    params.append('category', category);
    if (query) {
      params.append('q', query);
    }
    
    // Use page cursor for pagination
    if (pageIndex > 0 && previousPageData?.nextPage) {
      params.append('page', previousPageData.nextPage);
    }

    return `/api/news?${params.toString()}`;
  };

  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite<NewsAPIResponse>(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      dedupingInterval: 120000, // Cache for 2 minutes
      parallel: true,
      keepPreviousData: true,
      errorRetryCount: 2,
      shouldRetryOnError: true,
    }
  );

  // Flatten all pages of articles
  const articles = data ? data.flatMap(page => page.results || []) : [];
  const lastPage = data?.[data.length - 1];
  const hasMore = lastPage ? lastPage.nextPage !== null && lastPage.nextPage !== undefined : true;
  const isLoadingMore = !isLoading && size > 1 && data && typeof data[size - 1] === 'undefined';

  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      setSize(size + 1);
    }
  };

  const refresh = async () => {
    await mutate(undefined, { revalidate: true });
  };

  return {
    articles,
    isLoading: isLoading && !data,
    isLoadingMore: isLoadingMore || false,
    isError: error,
    hasMore,
    loadMore,
    refresh,
    mutate,
    nextPage: lastPage?.nextPage,
  };
}
