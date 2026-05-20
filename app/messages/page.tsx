'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import {
  MessageCircle,
  Search,
  PenSquare,
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Users,
  Bot,
} from 'lucide-react';
import { useMessagesStore } from '@/lib/stores/messages-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatRelativeTime } from '@/lib/mock-data';
import type { Conversation, DirectMessage, User } from '@/lib/types';

export default function MessagesPage() {
  const [search, setSearch] = useState('');
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const { conversations, getMessages, sendMessage, markConversationRead, fetchConversations, subscribeToConversations, isLoading } = useMessagesStore();
  const { isAuthenticated, openAuthModal, user } = useAuthStore();

  // Fetch conversations on mount
  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id);
      const unsubscribe = subscribeToConversations(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, fetchConversations, subscribeToConversations]);

  const filteredConversations = search
    ? conversations.filter((c) =>
        c.participants.some(
          (p) =>
            p.id !== user?.id &&
            (p.displayName?.toLowerCase().includes(search.toLowerCase()) ||
              p.username?.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : conversations;

  const handleOpenConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    markConversationRead(conversationId);
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-40 glass border-b border-border">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your messages</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            Sign in to send and receive messages with other readers.
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

  // Show conversation detail
  if (activeConversation) {
    const conversation = conversations.find((c) => c.id === activeConversation);
    if (!conversation) return null;

    return (
      <ConversationView
        conversation={conversation}
        onBack={() => setActiveConversation(null)}
        messages={getMessages(activeConversation)}
        onSendMessage={(content) => sendMessage(activeConversation, content, user?.id || '')}
        currentUserId={user?.id || ''}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <Button variant="ghost" size="icon">
            <PenSquare className="h-5 w-5" />
          </Button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Conversations list */}
      <div className="divide-y divide-border">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start a conversation by sharing a story!</p>
          </div>
        ) : (
          filteredConversations.map((conversation, index) => {
            const otherParticipants = conversation.participants.filter((p) => p.id !== user?.id);
            const displayUser = otherParticipants[0];
            const isAIBot = displayUser?.isAIBot;

            return (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleOpenConversation(conversation.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
                  conversation.unreadCount > 0 ? 'bg-primary/5' : ''
                }`}
              >
                <div className="relative">
                  {conversation.isGroup ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={displayUser?.avatarUrl || undefined} />
                      <AvatarFallback>{displayUser?.displayName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">
                      {conversation.isGroup
                        ? conversation.groupName
                        : displayUser?.displayName || 'Unknown'}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <div className="flex items-center gap-1">
                      {conversation.lastMessage.senderId === 'current' && (
                        conversation.lastMessage.readAt ? (
                          <CheckCheck className="h-3 w-3 text-primary flex-shrink-0" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )
                      )}
                      <p className={`text-sm truncate ${
                        conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {conversation.lastMessage.article
                          ? `Shared: ${conversation.lastMessage.article.title}`
                          : conversation.lastMessage.content}
                      </p>
                    </div>
                  )}
                </div>

                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground px-1">
                    {conversation.unreadCount}
                  </span>
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

interface ConversationViewProps {
  conversation: Conversation;
  onBack: () => void;
  messages: DirectMessage[];
  onSendMessage: (content: string) => void;
  currentUser: typeof CURRENT_USER;
}

function ConversationView({
  conversation,
  onBack,
  messages,
  onSendMessage,
  currentUser,
}: ConversationViewProps) {
  const [message, setMessage] = useState('');
  const otherParticipants = conversation.participants.filter((p) => p.id !== 'current');
  const displayUser = otherParticipants[0];

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage('');
  };

  // Combine stored messages with the lastMessage for display
  const allMessages = conversation.lastMessage 
    ? [...messages.filter(m => m.id !== conversation.lastMessage?.id), conversation.lastMessage]
    : messages;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-2 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={displayUser?.avatarUrl || undefined} />
            <AvatarFallback>{displayUser?.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {conversation.isGroup ? conversation.groupName : displayUser?.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversation.isGroup
                ? `${conversation.participants.length} members`
                : `@${displayUser?.username}`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          allMessages.map((msg) => {
            const isOwn = msg.senderId === 'current';
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={msg.sender?.avatarUrl || undefined} />
                    <AvatarFallback>{msg.sender?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : ''}`}>
                  {msg.article ? (
                    <div className="p-3 rounded-2xl bg-card border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Shared article</p>
                      <p className="text-sm font-medium line-clamp-2">{msg.article.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{msg.article.source_name}</p>
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-secondary rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  )}
                  <div className={`flex items-center gap-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                    {isOwn && (
                      msg.readAt ? (
                        <CheckCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Check className="h-3 w-3 text-muted-foreground" />
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 glass border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
