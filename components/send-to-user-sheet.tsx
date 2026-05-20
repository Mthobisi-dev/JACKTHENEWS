'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { MOCK_USERS } from '@/lib/mock-data';
import { useSocialStore } from '@/lib/stores/social-store';
import { useMessagesStore } from '@/lib/stores/messages-store';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SendToUserSheetProps {
  article: NewsArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendToUserSheet({ article, open, onOpenChange }: SendToUserSheetProps) {
  const [search, setSearch] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const { following } = useSocialStore();
  const { sendArticle } = useMessagesStore();

  // Get users the current user is following
  const followedUsers = useMemo(() => {
    return MOCK_USERS.filter((u) => following.has(u.id));
  }, [following]);

  // Filter by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return followedUsers;
    const query = search.toLowerCase();
    return followedUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query)
    );
  }, [followedUsers, search]);

  const handleSend = (userId: string) => {
    sendArticle(userId, article);
    setSentTo((prev) => new Set([...prev, userId]));
    toast.success('Story sent!');
  };

  const handleClose = () => {
    onOpenChange(false);
    setSentTo(new Set());
    setSearch('');
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Send to</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people you follow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Article preview */}
        <div className="p-3 rounded-xl bg-card border border-border mb-4">
          <p className="text-sm font-medium line-clamp-1">{article.title}</p>
          <p className="text-xs text-muted-foreground">{article.source_name}</p>
        </div>

        {/* User list */}
        <div className="space-y-2 overflow-y-auto max-h-[calc(70vh-220px)]">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{search ? 'No users found' : 'Follow users to send them stories'}</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.displayName}</span>
                      {user.isVerified && (
                        <span className="text-primary text-sm">✓</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      @{user.username}
                    </span>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {sentTo.has(user.id) ? (
                    <motion.div
                      key="sent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-green-500"
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.button
                      key="send"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => handleSend(user.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
