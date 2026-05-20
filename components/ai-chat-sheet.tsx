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
  MessageCircle, 
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
  ExternalLink,
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

    // Simulate AI response with delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const response = generateAIResponse(text, article);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      relatedArticles: response.relatedArticles,
      suggestions: response.suggestions,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
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

function generateAIResponse(question: string, article?: NewsArticle): {
  content: string;
  relatedArticles?: RelatedArticle[];
  suggestions?: string[];
} {
  const q = question.toLowerCase();
  
  // Topic-specific queries
  if (q.includes('tech') || q.includes('technology')) {
    return {
      content: `Here's what's happening in tech today:\n\n**Top Stories:**\n1. AI companies continue to push boundaries with new language models\n2. Major tech layoffs continue as companies focus on efficiency\n3. New smartphone releases expected next quarter\n\n**Market Impact:**\nTech stocks showing mixed performance with AI-focused companies leading gains.\n\nWould you like me to dive deeper into any of these topics?`,
      relatedArticles: [
        { id: '1', title: 'AI Revolution: How Language Models Are Changing Everything', source: 'TechCrunch', category: 'Tech', imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400' },
        { id: '2', title: 'Tech Giants Report Q4 Earnings', source: 'Reuters', category: 'Business', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
      ],
      suggestions: ['More about AI', 'Tech earnings explained', 'Startup news'],
    };
  }
  
  if (q.includes('trend') || q.includes('popular') || q.includes('trending')) {
    return {
      content: `**Trending Right Now:**\n\n1. **Global Climate Summit** - World leaders gather for historic agreement\n2. **Economic Update** - Markets respond to latest Fed announcement\n3. **Sports Highlight** - Major championship results in\n4. **Entertainment** - Award season kicks off with surprises\n\nThese stories are generating the most engagement across our platform. Which topic interests you most?`,
      relatedArticles: [
        { id: '3', title: 'Climate Summit: A Historic Day for Global Action', source: 'AP News', category: 'World', imageUrl: 'https://images.unsplash.com/photo-1470723710355-95304d8aece4?w=400' },
        { id: '4', title: 'Fed Signals Rate Decision Coming', source: 'Bloomberg', category: 'Finance', imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400' },
      ],
      suggestions: ['Climate details', 'Market analysis', 'Full digest'],
    };
  }

  if (q.includes('break') || q.includes('urgent') || q.includes('latest')) {
    return {
      content: `**Breaking News Updates:**\n\n- **15 minutes ago:** Emergency response teams deployed to downtown area\n- **1 hour ago:** Major policy announcement from the White House\n- **2 hours ago:** International trade agreement signed\n\nI'm continuously monitoring news sources for updates. Would you like me to explain any of these stories?`,
      suggestions: ['Get details', 'Set up alerts', 'Related context'],
    };
  }

  if (q.includes('climate') || q.includes('environment') || q.includes('weather')) {
    return {
      content: `**Climate & Environment Update:**\n\n**Today's Headlines:**\n- Global Climate Summit reaches milestone agreement\n- New renewable energy records set this quarter\n- Scientists report updated climate projections\n\n**What This Means:**\nThe summit's agreement could mark a turning point in global climate policy, with major economies committing to new emission targets.\n\nI can provide more details on any of these developments.`,
      relatedArticles: [
        { id: '5', title: 'Climate Summit: Full Coverage', source: 'The Guardian', category: 'Environment', imageUrl: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=400' },
      ],
      suggestions: ['What was agreed?', 'Impact on economy', 'Local effects'],
    };
  }

  // Article-specific responses
  if (article) {
    if (q.includes('key fact') || q.includes('main point') || q.includes('summary')) {
      return {
        content: `**Key Facts from This Story:**\n\n1. **Main Topic:** ${article.title.split(' ').slice(0, 8).join(' ')}...\n2. **Source:** ${article.source_name || 'News outlet'}\n3. **Category:** ${article.category?.[0] || 'General News'}\n\n**Quick Summary:**\n${article.description?.slice(0, 200) || 'This story covers an important development in current events.'}\n\nWould you like me to explain any aspect in more detail?`,
        suggestions: ['Why does this matter?', 'What happens next?', 'Related stories'],
      };
    }
    
    if (q.includes('why') || q.includes('matter') || q.includes('important')) {
      return {
        content: `**Why This Story Matters:**\n\nThis story is significant because:\n\n1. **Public Impact** - It affects how people understand ${article.category?.[0] || 'current'} developments\n2. **Policy Implications** - Could influence decision-makers\n3. **Broader Context** - Part of larger ongoing trends\n\n**The Bigger Picture:**\nNews like this helps citizens stay informed about changes that might affect their daily lives, communities, or future planning.`,
        suggestions: ['Who is affected?', 'Historical context', 'Expert opinions'],
      };
    }
  }

  // Generic helpful response
  return {
    content: `Great question! Let me help you with that.\n\nI can provide information about:\n- Current news and trending stories\n- In-depth analysis of specific topics\n- Personalized news recommendations\n- Context and background on any story\n\nCould you tell me more specifically what you'd like to know about? For example, you could ask about:\n- "What's happening in tech today?"\n- "Explain the latest economic news"\n- "Give me a news digest"`,
    suggestions: ['Today\'s headlines', 'Tech news', 'World updates', 'Trending now'],
  };
}
