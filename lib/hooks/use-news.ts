'use client';

import useSWRInfinite from 'swr/infinite';
import type { NewsAPIResponse, Category } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<NewsAPIResponse>(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      dedupingInterval: 60000,
      parallel: true,
    }
  );

  // Flatten all pages of articles
  const articles = data ? data.flatMap(page => page.results || []) : [];
  const hasMore = data ? data[data.length - 1]?.nextPage !== undefined : false;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  };

  const refresh = async () => {
    await mutate();
  };

  return {
    articles,
    isLoading: isLoading && !data,
    isLoadingMore,
    isError: error,
    hasMore,
    loadMore,
    refresh,
    mutate,
    nextPage: data?.[data.length - 1]?.nextPage,
  };
}
