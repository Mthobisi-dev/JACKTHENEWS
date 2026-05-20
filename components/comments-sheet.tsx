'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Flag,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NewsArticle, Comment } from '@/lib/types';
import { useSocialStore } from '@/lib/stores/social-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatRelativeTime } from '@/lib/mock-data';

interface CommentsSheetProps {
  article: NewsArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SortOption = 'top' | 'newest' | 'replies';

export function CommentsSheet({ article, open, onOpenChange }: CommentsSheetProps) {
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('top');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isAuthenticated, openAuthModal, user } = useAuthStore();
  const { getComments, addComment, likeComment, dislikeComment } = useSocialStore();
  const comments = getComments(article.article_id);

  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'top':
        return b.likeCount - a.likeCount;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'replies':
        return b.replyCount - a.replyCount;
      default:
        return 0;
    }
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      openAuthModal('signup');
      return;
    }
    if (!comment.trim()) return;

    addComment(article.article_id, comment.trim(), replyingTo);
    setComment('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    if (!isAuthenticated) {
      openAuthModal('signup');
      return;
    }
    setReplyingTo(commentId);
    inputRef.current?.focus();
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-center">
            {comments.length} Comments
          </SheetTitle>
        </SheetHeader>

        {/* Sort options */}
        <div className="flex gap-2 py-3 border-b border-border">
          {(['top', 'newest', 'replies'] as SortOption[]).map((option) => (
            <Button
              key={option}
              variant={sortBy === option ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy(option)}
              className="capitalize"
            >
              {option === 'replies' ? 'Most Replied' : option}
            </Button>
          ))}
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[calc(85vh-200px)]">
          {sortedComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            sortedComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                articleId={article.article_id}
                onReply={handleReply}
                onLike={() => likeComment(article.article_id, c.id)}
                onDislike={() => dislikeComment(article.article_id, c.id)}
                isExpanded={expandedReplies.has(c.id)}
                onToggleReplies={() => toggleReplies(c.id)}
              />
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="border-t border-border pt-4 space-y-2">
          {replyingTo && (
            <div className="flex items-center justify-between text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
              <span>Replying to comment</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                placeholder={isAuthenticated ? "Write a comment..." : "Sign in to comment"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] pr-20 resize-none"
                disabled={!isAuthenticated}
                onClick={() => !isAuthenticated && openAuthModal('signup')}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="AI assist"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSubmit}
                  disabled={!comment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  onReply: (commentId: string) => void;
  onLike: () => void;
  onDislike: () => void;
  isExpanded: boolean;
  onToggleReplies: () => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  articleId,
  onReply,
  onLike,
  onDislike,
  isExpanded,
  onToggleReplies,
  isReply = false,
}: CommentItemProps) {
  const { likeComment, dislikeComment } = useSocialStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-2 ${isReply ? 'ml-10 pl-4 border-l-2 border-border' : ''}`}
    >
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user.avatarUrl || undefined} />
          <AvatarFallback>{comment.user.displayName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user.displayName}</span>
            <span className="text-xs text-muted-foreground">@{comment.user.username}</span>
            {comment.user.isVerified && (
              <span className="text-primary text-xs">✓</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm mt-1 text-foreground/90">{comment.content}</p>
          
          {/* Comment actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={onLike}
              className={`flex items-center gap-1 text-xs transition-colors ${
                comment.isLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />
              {comment.likeCount > 0 && comment.likeCount}
            </button>
            <button
              onClick={onDislike}
              className={`flex items-center gap-1 text-xs transition-colors ${
                comment.isDisliked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ThumbsDown className={`h-3.5 w-3.5 ${comment.isDisliked ? 'fill-current' : ''}`} />
              {comment.dislikeCount > 0 && comment.dislikeCount}
            </button>
            {!isReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Reply
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Replies toggle */}
          {!isReply && comment.replyCount > 0 && (
            <button
              onClick={onToggleReplies}
              className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {isExpanded ? 'Hide' : 'View'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {isExpanded && comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              onReply={onReply}
              onLike={() => likeComment(articleId, reply.id)}
              onDislike={() => dislikeComment(articleId, reply.id)}
              isExpanded={false}
              onToggleReplies={() => {}}
              isReply
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
