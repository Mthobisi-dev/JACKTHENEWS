'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { StoryCard } from './story-card';
import { useNews } from '@/lib/hooks/use-news';
import type { Category } from '@/lib/types';

interface NewsFeedProps {
  category: Category;
  onOpenChat?: () => void;
}

export function NewsFeed({ category, onOpenChat }: NewsFeedProps) {
  const { articles, isLoading, isError } = useNews(category);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      setCurrentIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset scroll when category changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setCurrentIndex(0);
    }
  }, [category]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading stories...</p>
        </motion.div>
      </div>
    );
  }

  if (isError || !articles.length) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-lg font-medium text-foreground">No stories found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different category or check back later
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Progress indicator */}
      <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex flex-col gap-1">
        {articles.slice(0, 10).map((_, index) => (
          <motion.div
            key={index}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-primary h-4 w-1.5'
                : index < currentIndex
                ? 'bg-white/50'
                : 'bg-white/20'
            }`}
            layoutId={`indicator-${index}`}
          />
        ))}
      </div>

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="snap-container hide-scrollbar"
      >
        {articles.map((article) => (
          <div key={article.article_id}>
            <StoryCard
              article={article}
              onOpenChat={onOpenChat}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
