'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { StoryCard } from './story-card';
import { useNews } from '@/lib/hooks/use-news';
import type { Category } from '@/lib/types';

interface NewsFeedProps {
  category: Category;
  onOpenChat?: () => void;
}

export function NewsFeed({ category, onOpenChat }: NewsFeedProps) {
  const { articles, isLoading, isLoadingMore, hasMore, loadMore, refresh, isError } = useNews(category);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Handle scroll for pagination and index tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      setCurrentIndex(newIndex);

      // Load more when near the end
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      if (scrollTop + clientHeight >= scrollHeight - itemHeight * 2) {
        if (hasMore && !isLoadingMore) {
          loadMore();
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, loadMore]);

  // Reset scroll when category changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setCurrentIndex(0);
    }
  }, [category]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const touchY = e.touches[0].clientY;
    const distance = Math.max(0, (touchY - touchStartY.current) * 0.5);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    
    isPulling.current = false;
    
    if (pullDistance >= 60) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      try {
        await refresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refresh]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-180px)] items-center justify-center">
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
      <div className="flex h-[calc(100vh-180px)] items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-lg font-medium text-foreground">No stories found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different category or check back later
          </p>
          <button
            onClick={() => refresh()}
            className="mt-4 flex items-center gap-2 mx-auto text-primary hover:underline"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-30 flex justify-center"
            style={{ paddingTop: pullDistance }}
          >
            <div className="flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-4 py-2">
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <motion.div
                  animate={{ rotate: pullDistance >= 60 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-primary" />
                </motion.div>
              )}
              <span className="text-sm text-primary">
                {isRefreshing ? 'Refreshing...' : pullDistance >= 60 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex flex-col gap-1">
        {articles.slice(0, Math.min(articles.length, 15)).map((_, index) => (
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
        {articles.length > 15 && (
          <div className="text-[8px] text-white/50 text-center mt-1">
            +{articles.length - 15}
          </div>
        )}
      </div>

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="snap-container hide-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {articles.map((article) => (
          <div key={article.article_id}>
            <StoryCard
              article={article}
              onOpenChat={onOpenChat}
            />
          </div>
        ))}
        
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="snap-item flex items-center justify-center bg-background">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading more stories...</p>
            </motion.div>
          </div>
        )}

        {/* End of feed indicator */}
        {!hasMore && articles.length > 0 && (
          <div className="snap-item flex items-center justify-center bg-background">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-8"
            >
              <p className="text-lg font-medium text-foreground">You&apos;re all caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for more stories
              </p>
              <button
                onClick={() => refresh()}
                className="mt-4 flex items-center gap-2 mx-auto text-primary hover:underline"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh feed
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
