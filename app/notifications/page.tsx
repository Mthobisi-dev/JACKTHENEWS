'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import {
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  AtSign,
  Send,
  Zap,
  Newspaper,
  Check,
  Bell,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatRelativeTime } from '@/lib/mock-data';
import type { NotificationType } from '@/lib/types';

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  like: Heart,
  comment: MessageCircle,
  reply: MessageCircle,
  reshare: Repeat2,
  follow: UserPlus,
  mention: AtSign,
  message: Send,
  breaking: Zap,
  briefing: Newspaper,
};

const FILTER_OPTIONS: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mention', label: 'Mentions' },
  { value: 'reply', label: 'Replies' },
  { value: 'reshare', label: 'Reshares' },
  { value: 'follow', label: 'Follows' },
  { value: 'message', label: 'Messages' },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');
  const { notifications, markAsRead, markAllAsRead, unreadCount, getFilteredNotifications, fetchNotifications, isLoading } = useNotificationStore();
  const { isAuthenticated, openAuthModal, user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, fetchNotifications]);

  const allNotifications = notifications;
  const filteredNotifications = filter === 'all' 
    ? allNotifications 
    : allNotifications.filter(n => n.type === filter);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-40 glass border-b border-border">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <Bell className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Stay in the loop</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            Sign in to see notifications about reactions, comments, and followers.
          </p>
          <Button onClick={() => openAuthModal('signup')}>
            Join JACKTHENEWS
          </Button>
        </div>
        <BottomNav />
        <AuthModal />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead(user.id)}
                className="text-primary hover:text-primary/80 gap-1"
              >
                <Check className="h-4 w-4" />
                Mark all read
              </Button>
            )}
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(option.value)}
              className="whitespace-nowrap"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="divide-y divide-border">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => {
            const isAIRecommendation = notification.metadata?.isAIRecommendation;
            const notifType = notification.type as NotificationType;
            const Icon = isAIRecommendation ? Sparkles : (NOTIFICATION_ICONS[notifType] || Bell);
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => markAsRead(notification.id)}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
                  !notification.isRead ? 'bg-primary/5' : ''
                } ${isAIRecommendation ? 'border-l-2 border-l-primary' : ''}`}
              >
                {notification.fromUser ? (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={notification.fromUser.avatarUrl || undefined} />
                    <AvatarFallback>
                      {notification.fromUser.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                    isAIRecommendation 
                      ? 'bg-gradient-to-br from-primary to-orange-500' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <Icon className={`h-5 w-5 ${isAIRecommendation ? 'text-white' : ''}`} />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  {isAIRecommendation && (
                    <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                      AI Recommended
                    </span>
                  )}
                  <p className="text-sm">
                    {notification.fromUser && (
                      <span className="font-semibold">
                        @{notification.fromUser.username}{' '}
                      </span>
                    )}
                    <span className={isAIRecommendation ? 'text-foreground' : 'text-muted-foreground'}>
                      {notification.message}
                    </span>
                  </p>
                  {isAIRecommendation && notification.metadata?.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.metadata.reason}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>

                {!notification.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <BottomNav />
      <AuthModal />
    </main>
  );
}
