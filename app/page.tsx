'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { CategoryTabs } from '@/components/category-tabs';
import { NewsFeed } from '@/components/news-feed';
import { BottomNav } from '@/components/bottom-nav';
import { AppHeader } from '@/components/app-header';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import type { Category } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const Onboarding = lazy(() => import('@/components/onboarding').then(m => ({ default: m.Onboarding })));
const AIChatSheet = lazy(() => import('@/components/ai-chat-sheet').then(m => ({ default: m.AIChatSheet })));
const AuthModal = lazy(() => import('@/components/auth-modal').then(m => ({ default: m.AuthModal })));
const StoriesBar = lazy(() => import('@/components/stories-bar').then(m => ({ default: m.StoriesBar })));
const CreateStoryModal = lazy(() => import('@/components/create-story-modal').then(m => ({ default: m.CreateStoryModal })));

const ONBOARDING_KEY = 'jackthenews-onboarded';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState<Category>('top');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const fetchStories = useStoriesStore((state) => state.fetchStories);

  useEffect(() => {
    setMounted(true);
    // Initialize Firebase auth listener
    const unsubscribe = initializeAuth();
    
    // Fetch stories
    fetchStories();
    
    // Check if user has completed onboarding
    const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
    if (!hasOnboarded) {
      setShowOnboarding(true);
    }
    
    return () => {
      // H22: initializeAuth returns undefined when Supabase is not configured.
      // Guard the call so cleanup doesn't throw a TypeError.
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [initializeAuth, fetchStories]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (showOnboarding) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </Suspense>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <CategoryTabs
        activeCategory={category}
        onCategoryChange={setCategory}
      />
      <div className="pt-[104px]">
        <Suspense fallback={<LoadingFallback />}>
          <StoriesBar onCreateStory={() => setShowCreateStory(true)} />
        </Suspense>
        <NewsFeed 
          category={category} 
          onOpenChat={() => setShowChat(true)}
        />
      </div>
      <BottomNav />
      <Suspense fallback={null}>
        <AIChatSheet 
          open={showChat} 
          onOpenChange={setShowChat}
        />
      </Suspense>
      <Suspense fallback={null}>
        <CreateStoryModal 
          open={showCreateStory} 
          onOpenChange={setShowCreateStory}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
    </main>
  );
}
