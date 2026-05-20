'use client';

import { useState, useEffect } from 'react';
import { CategoryTabs } from '@/components/category-tabs';
import { NewsFeed } from '@/components/news-feed';
import { BottomNav } from '@/components/bottom-nav';
import { Onboarding } from '@/components/onboarding';
import { AIChatSheet } from '@/components/ai-chat-sheet';
import { AuthModal } from '@/components/auth-modal';
import { AppHeader } from '@/components/app-header';
import { StoriesBar } from '@/components/stories-bar';
import { CreateStoryModal } from '@/components/create-story-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import type { Category } from '@/lib/types';

const ONBOARDING_KEY = 'jackthenews-onboarded';

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
    
    return () => unsubscribe();
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
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <CategoryTabs
        activeCategory={category}
        onCategoryChange={setCategory}
      />
      <div className="pt-[104px]">
        <StoriesBar onCreateStory={() => setShowCreateStory(true)} />
        <NewsFeed 
          category={category} 
          onOpenChat={() => setShowChat(true)}
        />
      </div>
      <BottomNav />
      <AIChatSheet 
        open={showChat} 
        onOpenChange={setShowChat}
      />
      <CreateStoryModal 
        open={showCreateStory} 
        onOpenChange={setShowCreateStory}
      />
      <AuthModal />
    </main>
  );
}
