'use client';

import useSWR from 'swr';
import type { NewsAPIResponse, Category } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useNews(category: Category = 'top', query?: string) {
  const params = new URLSearchParams();
  params.append('category', category);
  if (query) {
    params.append('q', query);
  }

  const { data, error, isLoading, mutate } = useSWR<NewsAPIResponse>(
    `/api/news?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    articles: data?.results || [],
    isLoading,
    isError: error,
    mutate,
    nextPage: data?.nextPage,
  };
}
