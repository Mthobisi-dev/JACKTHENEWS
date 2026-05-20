'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import type { Category } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

const categories: Category[] = [
  'top',
  'world',
  'politics',
  'business',
  'technology',
  'entertainment',
  'sports',
  'science',
  'health',
  'culture',
];

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-foreground font-[var(--font-display)]">
          <span className="text-primary">JACK</span>THENEWS
        </h1>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 pb-3 hide-scrollbar"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className="relative flex-shrink-0"
            >
              {isActive && (
                <motion.div
                  layoutId="categoryPill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={`relative z-10 block px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[category]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
