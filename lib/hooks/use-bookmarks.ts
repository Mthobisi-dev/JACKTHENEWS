'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { NewsArticle, BookmarkedArticle } from '@/lib/types';

const STORAGE_KEY = 'nowcast-bookmarks';

// In-memory store for SSR safety
let bookmarks: BookmarkedArticle[] = [];
let listeners: Set<() => void> = new Set();

function getSnapshot(): BookmarkedArticle[] {
  return bookmarks;
}

function getServerSnapshot(): BookmarkedArticle[] {
  return [];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

// Initialize from localStorage on client
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      bookmarks = JSON.parse(stored);
    }
  } catch {
    bookmarks = [];
  }
}

function persist() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }
}

export function useBookmarks() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addBookmark = useCallback((article: NewsArticle) => {
    const exists = bookmarks.some((b) => b.article_id === article.article_id);
    if (!exists) {
      bookmarks = [
        { ...article, bookmarkedAt: new Date().toISOString() },
        ...bookmarks,
      ];
      persist();
      emitChange();
    }
  }, []);

  const removeBookmark = useCallback((articleId: string) => {
    bookmarks = bookmarks.filter((b) => b.article_id !== articleId);
    persist();
    emitChange();
  }, []);

  const isBookmarked = useCallback(
    (articleId: string) => {
      return items.some((b) => b.article_id === articleId);
    },
    [items]
  );

  const toggleBookmark = useCallback(
    (article: NewsArticle) => {
      if (isBookmarked(article.article_id)) {
        removeBookmark(article.article_id);
      } else {
        addBookmark(article);
      }
    },
    [addBookmark, removeBookmark, isBookmarked]
  );

  return {
    bookmarks: items,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}
