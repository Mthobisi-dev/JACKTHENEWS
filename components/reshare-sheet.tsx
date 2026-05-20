'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Repeat2, 
  Quote, 
  Send, 
  Users, 
  MessageCircle, 
  Sparkles,
  ChevronLeft,
  Search,
  Camera,
  Check,
} from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { useSocialStore } from '@/lib/stores/social-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import { toast } from 'sonner';

interface ReshareSheetProps {
  article: NewsArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShareDestination = 'story' | 'friends' | 'group' | 'ai' | null;

// Mock friends list - in real app this would come from Firebase
const MOCK_FRIENDS = [
  { id: '1', username: 'sarah_j', displayName: 'Sarah Johnson', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah' },
  { id: '2', username: 'mike_c', displayName: 'Mike Chen', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike' },
  { id: '3', username: 'emma_w', displayName: 'Emma Wilson', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma' },
  { id: '4', username: 'alex_r', displayName: 'Alex Rodriguez', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' },
  { id: '5', username: 'lisa_m', displayName: 'Lisa Martinez', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa' },
];

// Mock groups
const MOCK_GROUPS = [
  { id: 'g1', name: 'Tech News Enthusiasts', members: 234, avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=tech' },
  { id: 'g2', name: 'Local Community', members: 567, avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=local' },
  { id: 'g3', name: 'Breaking News Alerts', members: 1234, avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=breaking' },
];

export function ReshareSheet({ article, open, onOpenChange }: ReshareSheetProps) {
  const [destination, setDestination] = useState<ShareDestination>(null);
  const [commentary, setCommentary] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  
  const { reshare } = useSocialStore();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { createStory } = useStoriesStore();

  const resetState = () => {
    setDestination(null);
    setCommentary('');
    setSearchQuery('');
    setSelectedFriends([]);
    setSelectedGroup(null);
    setAiQuestion('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleShareToStory = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    
    await createStory({
      userId: user.id,
      userDisplayName: user.displayName,
      userAvatar: user.avatarUrl || '',
      type: 'news',
      content: commentary || article.title,
      mediaUrl: article.image_url || undefined,
      mediaType: article.image_url ? 'image' : undefined,
      category: article.category?.[0],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    
    toast.success('Shared to your story!');
    handleClose();
  };

  const handleShareToFriends = () => {
    if (selectedFriends.length === 0) return;
    
    // In a real app, this would send DMs to selected friends
    toast.success(`Shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
    handleClose();
  };

  const handleShareToGroup = () => {
    if (!selectedGroup) return;
    
    const group = MOCK_GROUPS.find(g => g.id === selectedGroup);
    toast.success(`Shared to ${group?.name}!`);
    handleClose();
  };

  const handleShareToAI = () => {
    reshare(article.article_id, aiQuestion || 'Discuss this article');
    toast.success('Sent to AI for discussion!');
    handleClose();
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const filteredFriends = MOCK_FRIENDS.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shareOptions = [
    {
      id: 'story' as const,
      icon: Camera,
      title: 'Add to Story',
      description: 'Share to your story for 24 hours',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 'friends' as const,
      icon: Users,
      title: 'Send to Friends',
      description: 'Share directly with selected friends',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'group' as const,
      icon: MessageCircle,
      title: 'Share to Group',
      description: 'Post in a community group chat',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      id: 'ai' as const,
      icon: Sparkles,
      title: 'Discuss with AI',
      description: 'Start an AI conversation about this',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            {destination && (
              <Button variant="ghost" size="icon" onClick={() => setDestination(null)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <SheetTitle className="text-center flex-1">
              {destination === null && 'Share this story'}
              {destination === 'story' && 'Add to Story'}
              {destination === 'friends' && 'Send to Friends'}
              {destination === 'group' && 'Share to Group'}
              {destination === 'ai' && 'Discuss with AI'}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Article Preview */}
        <div className="p-3 rounded-xl bg-card border border-border mb-4">
          <div className="flex gap-3">
            {article.image_url && (
              <img 
                src={article.image_url} 
                alt="" 
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{article.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{article.source_name}</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Main Options */}
          {destination === null && (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {shareOptions.map((option, index) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setDestination(option.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${option.bgColor} ${option.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{option.title}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {/* Share to Story */}
          {destination === 'story' && (
            <motion.div
              key="story"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Textarea
                placeholder="Add a caption to your story... (optional)"
                value={commentary}
                onChange={(e) => setCommentary(e.target.value.slice(0, 150))}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Story expires in 24 hours</span>
                <span>{commentary.length}/150</span>
              </div>
              <Button onClick={handleShareToStory} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Add to Story
              </Button>
            </motion.div>
          )}

          {/* Share to Friends */}
          {destination === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedFriends.includes(friend.id) 
                          ? 'bg-primary/10 border border-primary' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback>{friend.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{friend.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                      {selectedFriends.includes(friend.id) && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <Textarea
                placeholder="Add a message... (optional)"
                value={commentary}
                onChange={(e) => setCommentary(e.target.value.slice(0, 280))}
                className="min-h-[80px] resize-none"
              />

              <Button 
                onClick={handleShareToFriends} 
                className="w-full"
                disabled={selectedFriends.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedFriends.length || ''} Friend{selectedFriends.length !== 1 ? 's' : ''}
              </Button>
            </motion.div>
          )}

          {/* Share to Group */}
          {destination === 'group' && (
            <motion.div
              key="group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {MOCK_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedGroup === group.id 
                          ? 'bg-primary/10 border border-primary' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={group.avatarUrl} />
                        <AvatarFallback>{group.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.members.toLocaleString()} members</p>
                      </div>
                      {selectedGroup === group.id && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <Textarea
                placeholder="Add a message to the group... (optional)"
                value={commentary}
                onChange={(e) => setCommentary(e.target.value.slice(0, 280))}
                className="min-h-[80px] resize-none"
              />

              <Button 
                onClick={handleShareToGroup} 
                className="w-full"
                disabled={!selectedGroup}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share to Group
              </Button>
            </motion.div>
          )}

          {/* Discuss with AI */}
          {destination === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span className="font-medium text-purple-500">AI Discussion</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Start a conversation with AI about this article. Ask questions, get summaries, or explore different perspectives.
                </p>
              </div>

              <Textarea
                placeholder="What would you like to discuss about this article?"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                className="min-h-[100px] resize-none"
              />

              <div className="flex flex-wrap gap-2">
                {['Summarize this', 'Explain the impact', 'Different perspectives', 'Related topics'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setAiQuestion(suggestion)}
                    className="px-3 py-1.5 rounded-full bg-secondary text-xs hover:bg-secondary/80 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <Button onClick={handleShareToAI} className="w-full bg-purple-500 hover:bg-purple-600">
                <Sparkles className="h-4 w-4 mr-2" />
                Start AI Discussion
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
