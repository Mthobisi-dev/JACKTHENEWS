'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Sparkles, 
  User, 
  Loader2, 
  Search,
  TrendingUp,
  Newspaper,
  Globe,
  Zap,
  Clock,
} from 'lucide-react';
import type { NewsArticle } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  relatedArticles?: RelatedArticle[];
  suggestions?: string[];
}

interface RelatedArticle {
  id: string;
  title: string;
  source: string;
  category: string;
  imageUrl?: string;
}

interface AIChatSheetProps {
  article?: NewsArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: 'Trending news', query: 'What are the top trending news stories right now?' },
  { icon: Globe, label: 'World updates', query: 'Give me a summary of today\'s world news' },
  { icon: Zap, label: 'Breaking news', query: 'What breaking news has happened in the last hour?' },
  { icon: Clock, label: 'Today\'s digest', query: 'Give me a brief digest of today\'s most important news' },
];

const FOLLOW_UP_SUGGESTIONS = [
  'Tell me more about this',
  'What are the implications?',
  'How does this affect me?',
  'What happened before this?',
  'What do experts say?',
];

export function AIChatSheet({ article, open, onOpenChange }: AIChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Add initial AI message
      if (article) {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `I can help you understand this story about "${article.title.slice(0, 60)}..."\n\nAsk me anything about the facts, context, or implications!`,
            suggestions: ['What are the key facts?', 'Why does this matter?', 'Who is affected?', 'What happens next?'],
          },
        ]);
      } else {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `Hello! I'm your AI news assistant. I can help you:\n\n- Find and summarize news on any topic\n- Explain complex stories\n- Give you personalized news recommendations\n- Answer questions about current events\n\nHow can I help you today?`,
            suggestions: ['What\'s trending today?', 'Summarize tech news', 'Any breaking news?', 'News about climate'],
          },
        ]);
      }
    }
  }, [open, article, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build messages for API
      const apiMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user' as const, content: text });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          articleContext: article ? {
            title: article.title,
            description: article.description,
            source: article.source_name || 'Unknown',
          } : undefined,
        }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I apologize, but I could not generate a response.',
        suggestions: FOLLOW_UP_SUGGESTIONS.slice(0, 4),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        suggestions: ['Try again', 'Ask something else'],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl glass border-border flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span>AI News Assistant</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">Beta</Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Quick Actions */}
        {messages.length <= 1 && !article && (
          <div className="grid grid-cols-2 gap-2 py-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(action.query)}
                  className="justify-start gap-2 text-xs"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-primary'
                      : 'bg-gradient-to-br from-primary to-orange-500'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                </div>
              </div>

              {/* Related Articles */}
              {message.relatedArticles && message.relatedArticles.length > 0 && (
                <div className="ml-11 space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Newspaper className="h-3 w-3" />
                    Related articles
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {message.relatedArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex-shrink-0 w-48 rounded-lg border border-border overflow-hidden bg-card cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        {article.imageUrl && (
                          <div className="relative h-20 w-full">
                            <Image
                              src={article.imageUrl}
                              alt={article.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs font-medium line-clamp-2">{article.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">{article.source}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              {article.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="ml-11 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(suggestion)}
                      className="text-xs h-7"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analyzing news...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ask about any news topic..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
