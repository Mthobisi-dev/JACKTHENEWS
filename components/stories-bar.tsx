'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Plus, Play, Eye, Radio, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useStoriesStore, type Story } from '@/lib/stores/stories-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatRelativeTime } from '@/lib/mock-data';

interface StoriesBarProps {
  onCreateStory: () => void;
}

export function StoriesBar({ onCreateStory }: StoriesBarProps) {
  const { stories, liveStories } = useStoriesStore();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Get unique stories by user (most recent)
  const uniqueStories = stories.reduce((acc, story) => {
    if (!acc.find(s => s.userId === story.userId)) {
      acc.push(story);
    }
    return acc;
  }, [] as Story[]);

  const handleOpenStory = (story: Story, index: number) => {
    setSelectedStory(story);
    setCurrentStoryIndex(index);
  };

  const handleNextStory = () => {
    // H19: use functional index update to avoid stale-closure reading
    // the old currentStoryIndex from before this render
    setCurrentStoryIndex(prev => {
      const next = prev + 1;
      if (next < uniqueStories.length) {
        setSelectedStory(uniqueStories[next]);
        return next;
      }
      setSelectedStory(null);
      return prev;
    });
  };

  const handlePrevStory = () => {
    setCurrentStoryIndex(prev => {
      const prevIdx = prev - 1;
      if (prevIdx >= 0) {
        setSelectedStory(uniqueStories[prevIdx]);
        return prevIdx;
      }
      return prev;
    });
  };

  const handleCreateStory = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    onCreateStory();
  };

  return (
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto hide-scrollbar">
        {/* Create Story Button */}
        <button
          onClick={handleCreateStory}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-dashed border-primary/50">
              <Plus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Add Story</span>
        </button>

        {/* Live Stories */}
        {liveStories.map((story) => (
          <button
            key={`live-${story.id}`}
            // H18: use findIndex by id — indexOf looks up by object reference and
            // liveStories items may not be the same object as uniqueStories items.
            onClick={() => handleOpenStory(story, Math.max(0, uniqueStories.findIndex(s => s.id === story.id)))}
            aria-label={`View live story by ${story.userDisplayName}`}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-br from-red-500 via-orange-500 to-red-500 animate-pulse">
                <Avatar className="h-full w-full border-2 border-background">
                  <AvatarImage src={story.userAvatar} />
                  <AvatarFallback>{story.userDisplayName[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 rounded-full flex items-center gap-0.5">
                <Radio className="h-2 w-2 text-white animate-pulse" />
                <span className="text-[10px] text-white font-medium">LIVE</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[64px]">
              {story.userDisplayName.split(' ')[0]}
            </span>
          </button>
        ))}

        {/* Regular Stories */}
        {uniqueStories.filter(s => !s.isLive).map((story, index) => (
          <button
            key={story.id}
            onClick={() => handleOpenStory(story, index)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              <div className={`h-16 w-16 rounded-full p-0.5 ${
                story.type === 'news' 
                  ? 'bg-gradient-to-br from-primary via-orange-500 to-primary'
                  : story.type === 'incident'
                  ? 'bg-gradient-to-br from-destructive via-orange-500 to-destructive'
                  : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'
              }`}>
                <Avatar className="h-full w-full border-2 border-background">
                  <AvatarImage src={story.userAvatar} />
                  <AvatarFallback>{story.userDisplayName[0]}</AvatarFallback>
                </Avatar>
              </div>
              {story.views > 1000 && (
                <div className="absolute -bottom-1 right-0 px-1 py-0.5 bg-secondary rounded-full flex items-center gap-0.5">
                  <Eye className="h-2 w-2" />
                  <span className="text-[10px]">{Math.floor(story.views / 1000)}k</span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[64px]">
              {story.userDisplayName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Progress bars */}
            <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
              {uniqueStories.map((_, idx) => (
                <div key={idx} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: idx < currentStoryIndex ? '100%' : '0%' }}
                    animate={{ width: idx === currentStoryIndex ? '100%' : idx < currentStoryIndex ? '100%' : '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    onAnimationComplete={() => {
                      if (idx === currentStoryIndex) handleNextStory();
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage src={selectedStory.userAvatar} />
                  <AvatarFallback>{selectedStory.userDisplayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium text-sm">{selectedStory.userDisplayName}</p>
                  <p className="text-white/70 text-xs">{formatRelativeTime(selectedStory.createdAt)}</p>
                </div>
                {selectedStory.isLive && (
                  <div className="px-2 py-1 bg-red-500 rounded-full flex items-center gap-1">
                    <Radio className="h-3 w-3 text-white animate-pulse" />
                    <span className="text-xs text-white font-medium">LIVE</span>
                    <span className="text-xs text-white/80">{selectedStory.viewerCount?.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setSelectedStory(null)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Story Content */}
            <div className="relative h-full w-full flex items-center justify-center">
              {selectedStory.mediaUrl && (
                <Image
                  src={selectedStory.mediaUrl}
                  alt={selectedStory.content}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
              
              {/* Story text */}
              <div className="absolute bottom-20 left-4 right-4">
                <p className="text-white text-lg font-medium text-center leading-relaxed">
                  {selectedStory.content}
                </p>
                {selectedStory.location && (
                  <p className="text-white/70 text-sm text-center mt-2">{selectedStory.location}</p>
                )}
              </div>

              {/* Navigation tap zones */}
              <button
                aria-label="Previous story"
                className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
                onClick={handlePrevStory}
              />
              <button
                aria-label="Next story"
                className="absolute right-0 top-0 bottom-0 w-1/3 z-20"
                onClick={handleNextStory}
              />
            </div>

            {/* Story stats */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {selectedStory.views.toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
