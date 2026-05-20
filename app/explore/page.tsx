'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Clock, ArrowRight, Sparkles, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/bottom-nav';
import { useNews } from '@/lib/hooks/use-news';
import type { Category } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

const trendingTopics = [
  'Climate Summit',
  'Tech Layoffs',
  'Space Mission',
  'AI Regulation',
  'Economic Policy',
];

const categories: Category[] = [
  'politics',
  'business',
  'technology',
  'entertainment',
  'sports',
  'science',
  'health',
  'world',
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { articles } = useNews('top');

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <h1 className="mb-4 text-xl font-bold text-foreground font-[var(--font-display)]">Explore</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Trending Topics */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Trending</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic, index) => (
              <motion.div
                key={topic}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  {topic}
                </Badge>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Browse by Category</h2>
            <div className="flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" />
              <span>AI Analysis</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/explore/category/${category}`}
                  className={`block p-4 rounded-xl ${CATEGORY_COLORS[category]} bg-opacity-20 hover:bg-opacity-30 transition-all relative overflow-hidden group`}
                >
                  <span className="font-medium text-foreground">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs text-muted-foreground">View insights</span>
                  </div>
                  <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Stories */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Recent Stories</h2>
          </div>
          <div className="space-y-3">
            {articles.slice(0, 5).map((article, index) => (
              <motion.a
                key={article.article_id}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 p-3 rounded-xl bg-card hover:bg-card/80 transition-colors"
              >
                {article.image_url && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={article.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {article.source_name}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
