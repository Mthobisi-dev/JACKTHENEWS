'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  BookmarkCheck,
  Share2,
  MessageCircle,
  ChevronUp,
  ExternalLink,
  Clock,
  Sparkles,
  Heart,
  Repeat2,
  Send,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { NewsArticle, Category, ReactionType } from '@/lib/types';
import { CATEGORY_COLORS, REACTIONS } from '@/lib/types';
import { useSocialStore } from '@/lib/stores/social-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AIExplainSheet } from './ai-explain-sheet';
import { CommentsSheet } from './comments-sheet';
import { ReshareSheet } from './reshare-sheet';
import { SendToUserSheet } from './send-to-user-sheet';
import { ReactionPicker } from './reaction-picker';

interface StoryCardProps {
  article: NewsArticle;
  onOpenChat?: () => void;
  resharedBy?: { username: string; commentary?: string | null } | null;
}

export function StoryCard({ article, onOpenChat, resharedBy }: StoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReshare, setShowReshare] = useState(false);
  const [showSendTo, setShowSendTo] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const { isAuthenticated, user, openAuthModal } = useAuthStore();
  const { getInteraction, toggleLike, setReaction, toggleBookmark } = useSocialStore();
  const interaction = getInteraction(article.article_id);

  const category = (article.category?.[0] || 'top') as Category;
  const categoryColor = CATEGORY_COLORS[category] || 'bg-gray-500';
  const timeAgo = getTimeAgo(article.pubDate);

  const requireAuth = useCallback((action: () => void) => {
    if (!isAuthenticated) {
      openAuthModal('signup');
      return;
    }
    action();
  }, [isAuthenticated, openAuthModal]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      requireAuth(() => {
        toggleLike(article.article_id, user?.id);
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 600);
      });
    }
    setLastTap(now);
  }, [lastTap, requireAuth, toggleLike, article.article_id, user?.id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description || '',
          url: article.link,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(article.link);
    }
  };

  const handleReaction = (reaction: ReactionType) => {
    requireAuth(() => {
      setReaction(article.article_id, interaction.reaction === reaction ? null : reaction, user?.id);
      setShowReactions(false);
    });
  };

  return (
    <div 
      className="snap-item relative w-full overflow-hidden bg-background"
      onClick={handleDoubleTap}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {article.image_url && (
          <Image
            src={article.image_url}
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      </div>

      {/* Heart burst animation */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <Heart className="h-32 w-32 text-red-500 fill-red-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-4 pb-24">
        {/* Reshare banner */}
        {resharedBy && (
          <div className="absolute left-4 right-20 top-16 flex items-center gap-2 text-white/80">
            <Repeat2 className="h-4 w-4" />
            <span className="text-sm">
              Reshared by <span className="font-semibold">@{resharedBy.username}</span>
            </span>
          </div>
        )}

        {/* Quote commentary */}
        {resharedBy?.commentary && (
          <div className="absolute left-4 right-20 top-24 glass rounded-lg p-3">
            <p className="text-sm text-white/90 line-clamp-2">{resharedBy.commentary}</p>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <Badge className={`${categoryColor} text-white border-0`}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-white/70">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Sentiment indicator */}
        {article.sentiment && (
          <div className="absolute left-4 top-12">
            <div className={`h-2 w-2 rounded-full ${
              article.sentiment === 'positive' ? 'bg-green-500' :
              article.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
          </div>
        )}

        {/* Main content area */}
        <div className="space-y-3 pr-16">
          {/* Source */}
          <div className="flex items-center gap-2">
            {article.source_icon && (
              <Image
                src={article.source_icon}
                alt={article.source_name}
                width={20}
                height={20}
                className="rounded-full object-cover"
                style={{ width: 'auto', height: 'auto' }}
                unoptimized
              />
            )}
            <span className="text-sm font-medium text-white/80">
              {article.source_name}
            </span>
            {article.country?.[0] && (
              <span className="text-sm">{getCountryFlag(article.country[0])}</span>
            )}
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl font-bold leading-tight text-white text-balance">
            {article.title}
          </h2>

          {/* Description - Expandable */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-sm leading-relaxed text-white/80">
                  {article.description}
                </p>
                {article.content && (
                  <p className="mt-2 text-sm leading-relaxed text-white/70 line-clamp-4">
                    {article.content}
                  </p>
                )}
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Read full article
                  <ExternalLink className="h-3 w-3" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand button */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="h-4 w-4" />
            </motion.span>
            {isExpanded ? 'Show less' : 'Read more'}
          </button>

          {/* Engagement stats */}
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>{formatCount(interaction.likeCount)} reactions</span>
            <span>{formatCount(interaction.commentCount)} comments</span>
            <span>{formatCount(interaction.reshareCount)} reshares</span>
          </div>
        </div>

        {/* Action buttons - Right side */}
        <div className="absolute bottom-28 right-4 flex flex-col items-center gap-3">
          {/* Reaction button with picker */}
          <div className="relative">
            <AnimatePresence>
              {showReactions && (
                <ReactionPicker
                  onSelect={handleReaction}
                  onClose={() => setShowReactions(false)}
                  currentReaction={interaction.reaction}
                />
              )}
            </AnimatePresence>
            <ActionButton
              icon={Heart}
              label={formatCount(interaction.likeCount)}
              active={interaction.isLiked}
              activeColor="text-red-500"
              emoji={interaction.reaction ? REACTIONS[interaction.reaction].emoji : undefined}
              onClick={(e) => { e.stopPropagation(); requireAuth(() => setShowReactions(!showReactions)); }}
              onLongPress={() => requireAuth(() => setShowReactions(true))}
            />
          </div>
          
          <ActionButton
            icon={MessageCircle}
            label={formatCount(interaction.commentCount)}
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          />
          
          <ActionButton
            icon={Repeat2}
            label={formatCount(interaction.reshareCount)}
            onClick={(e) => { e.stopPropagation(); requireAuth(() => setShowReshare(true)); }}
          />
          
          <ActionButton
            icon={Send}
            label="Send"
            onClick={(e) => { e.stopPropagation(); requireAuth(() => setShowSendTo(true)); }}
          />
          
          <ActionButton
            icon={Bot}
            label="AI"
            onClick={(e) => { e.stopPropagation(); setShowAI(true); }}
            highlight
          />
          
          <ActionButton
            icon={interaction.isBookmarked ? BookmarkCheck : Bookmark}
            label="Save"
            active={interaction.isBookmarked}
            onClick={(e) => { e.stopPropagation(); requireAuth(() => toggleBookmark(article.article_id, user?.id)); }}
          />
        </div>
      </div>

      {/* Sheets */}
      <AIExplainSheet article={article} open={showAI} onOpenChange={setShowAI} />
      <CommentsSheet article={article} open={showComments} onOpenChange={setShowComments} />
      <ReshareSheet article={article} open={showReshare} onOpenChange={setShowReshare} />
      <SendToUserSheet article={article} open={showSendTo} onOpenChange={setShowSendTo} />
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  activeColor?: string;
  highlight?: boolean;
  emoji?: string;
  onClick?: (e: React.MouseEvent) => void;
  onLongPress?: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  active,
  activeColor = 'text-primary',
  highlight,
  emoji,
  onClick,
  onLongPress,
}: ActionButtonProps) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    if (onLongPress) {
      const timer = setTimeout(() => onLongPress(), 500);
      setPressTimer(timer);
    }
  };

  const handleMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className="flex flex-col items-center gap-1 group"
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
          highlight
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
            : active
            ? `bg-white/20 ${activeColor}`
            : 'bg-white/10 text-white group-hover:bg-white/20'
        }`}
      >
        {emoji ? (
          <span className="text-lg">{emoji}</span>
        ) : (
          <Icon className={`h-5 w-5 ${active && !highlight ? 'fill-current' : ''}`} />
        )}
      </motion.div>
      <span className="text-[10px] text-white/70">{label}</span>
    </button>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    us: '🇺🇸', gb: '🇬🇧', uk: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', jp: '🇯🇵',
    cn: '🇨🇳', in: '🇮🇳', br: '🇧🇷', au: '🇦🇺', ca: '🇨🇦', kr: '🇰🇷',
    ng: '🇳🇬', za: '🇿🇦', ke: '🇰🇪', gh: '🇬🇭', eg: '🇪🇬', mx: '🇲🇽',
  };
  return flags[countryCode.toLowerCase()] || '🌍';
}
