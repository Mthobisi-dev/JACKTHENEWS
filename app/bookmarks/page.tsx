'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Trash2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/bottom-nav';
import { useBookmarks } from '@/lib/hooks/use-bookmarks';
import { CATEGORY_COLORS } from '@/lib/types';
import type { Category } from '@/lib/types';

export default function BookmarksPage() {
  const { bookmarks, removeBookmark } = useBookmarks();

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Saved Stories</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {bookmarks.length} {bookmarks.length === 1 ? 'article' : 'articles'} saved
        </p>
      </div>

      <div className="p-4">
        {bookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No saved stories</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Tap the bookmark icon on any story to save it for later reading
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {bookmarks.map((article, index) => {
                const category = (article.category?.[0] || 'top') as Category;
                const categoryColor = CATEGORY_COLORS[category] || 'bg-gray-500';

                return (
                  <motion.div
                    key={article.article_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative overflow-hidden rounded-xl bg-card"
                  >
                    <div className="flex gap-3 p-3">
                      {article.image_url && (
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
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
                        <div className="flex items-start justify-between gap-2">
                          <Badge className={`${categoryColor} text-white border-0 text-xs`}>
                            {category}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeBookmark(article.article_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="mt-1 text-sm font-medium text-foreground line-clamp-2">
                          {article.title}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {article.source_name}
                          </span>
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Read
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
