'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Search,
  Bot,
  Users,
  UserPlus,
  UserCheck,
  Sparkles,
  TrendingUp,
  Verified,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSocialStore } from '@/lib/stores/social-store';
import { useMessagesStore } from '@/lib/stores/messages-store';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@/lib/types';
import { toast } from 'sonner';

// AI Bots that users can follow
const AI_BOTS: User[] = [
  {
    id: 'ai-news-bot',
    username: 'jackai',
    displayName: 'JACK AI',
    email: '',
    avatarUrl: '/ai-avatar.png',
    bio: 'Your AI news assistant. I curate personalized news, explain complex topics, and keep you informed 24/7.',
    isVerified: true,
    isAIBot: true,
    articlesRead: 0,
    commentsCount: 0,
    resharesCount: 0,
    followersCount: 125430,
    followingCount: 0,
    createdAt: '2024-01-01',
  },
  {
    id: 'ai-fact-checker',
    username: 'factcheck_ai',
    displayName: 'FactCheck AI',
    email: '',
    avatarUrl: '/factcheck-avatar.png',
    bio: 'Automated fact-checking powered by AI. I verify claims and provide context on trending stories.',
    isVerified: true,
    isAIBot: true,
    articlesRead: 0,
    commentsCount: 0,
    resharesCount: 0,
    followersCount: 89234,
    followingCount: 0,
    createdAt: '2024-01-01',
  },
  {
    id: 'ai-breaking-news',
    username: 'breaking_ai',
    displayName: 'Breaking News AI',
    email: '',
    avatarUrl: '/breaking-avatar.png',
    bio: 'Real-time breaking news alerts. First to report, always accurate.',
    isVerified: true,
    isAIBot: true,
    articlesRead: 0,
    commentsCount: 0,
    resharesCount: 0,
    followersCount: 203456,
    followingCount: 0,
    createdAt: '2024-01-01',
  },
];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('suggested');
  
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { following, toggleFollow, fetchFollowing } = useSocialStore();
  const { startChatWithUser } = useMessagesStore();
  const router = useRouter();

  // Fetch suggested users from Supabase
  const fetchSuggestedUsers = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setSuggestedUsers([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(20);
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Users table not found in schema cache');
          setSuggestedUsers([]);
          return;
        }
        throw error;
      }
      
      const fetchedUsers = (data || [])
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          email: u.email,
          avatarUrl: u.avatar_url,
          coverUrl: u.cover_url,
          bio: u.bio,
          country: u.country,
          countryFlag: u.country_flag,
          location: u.location,
          website: u.website,
          topics: u.topics,
          isVerified: u.is_verified,
          isAIBot: false,
          articlesRead: u.articles_read || 0,
          commentsCount: u.comments_count || 0,
          resharesCount: u.reshares_count || 0,
          followersCount: u.followers_count || 0,
          followingCount: u.following_count || 0,
          createdAt: u.created_at,
        } as User))
        .filter(u => u.id !== user?.id);
      
      setSuggestedUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSuggestedUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  // Fetch following status
  useEffect(() => {
    if (user?.id) {
      fetchFollowing(user.id);
    }
  }, [user?.id, fetchFollowing]);

  // Search users in Supabase
  const handleSearch = async () => {
    if (!searchQuery.trim() || !supabase || !isSupabaseConfigured) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20);
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Users table not found in schema cache');
          setUsers([]);
          return;
        }
        throw error;
      }
      
      const fetchedUsers = (data || [])
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          email: u.email,
          avatarUrl: u.avatar_url,
          coverUrl: u.cover_url,
          bio: u.bio,
          country: u.country,
          countryFlag: u.country_flag,
          location: u.location,
          website: u.website,
          topics: u.topics,
          isVerified: u.is_verified,
          isAIBot: false,
          articlesRead: u.articles_read || 0,
          commentsCount: u.comments_count || 0,
          resharesCount: u.reshares_count || 0,
          followersCount: u.followers_count || 0,
          followingCount: u.following_count || 0,
          createdAt: u.created_at,
        } as User))
        .filter(u => u.id !== user?.id);
      
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (!user) return;

    const wasFollowing = following.has(targetUserId);
    try {
      await toggleFollow(targetUserId, user.id);
      toast.success(wasFollowing ? 'Unfollowed' : 'Now following');
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  const handleStartChat = async (targetUser: User) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (!user) return;

    try {
      await startChatWithUser(user.id, targetUser);
      router.push('/messages');
    } catch {
      toast.error('Failed to start chat');
    }
  };

  const isFollowing = (userId: string) => following.has(userId);

  const UserCard = ({ userData, index }: { userData: User; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={userData.avatarUrl || undefined} />
        <AvatarFallback>
          {userData.isAIBot ? <Bot className="h-5 w-5" /> : userData.displayName[0]}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{userData.displayName}</span>
          {userData.isVerified && (
            <Verified className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          {userData.isAIBot && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              AI
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">@{userData.username}</p>
        {userData.bio && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{userData.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {userData.followersCount?.toLocaleString() || 0} followers
        </p>
      </div>

      <div className="flex flex-col gap-2 flex-shrink-0">
        <Button
          variant={isFollowing(userData.id) ? "secondary" : "default"}
          size="sm"
          onClick={() => handleFollow(userData.id)}
        >
          {isFollowing(userData.id) ? (
            <>
              <UserCheck className="h-4 w-4 mr-1" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1" />
              Follow
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStartChat(userData)}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Message
        </Button>
      </div>
    </motion.div>
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Discover</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchSuggestedUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search Results */}
        {searchQuery && users.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">SEARCH RESULTS</h2>
            <div className="space-y-2">
              {users.map((userData, index) => (
                <UserCard key={userData.id} userData={userData} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Tabs for AI Bots and Users */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suggested" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Suggested
            </TabsTrigger>
            <TabsTrigger value="ai-bots" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Bots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="mt-4 space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">PEOPLE TO FOLLOW</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : suggestedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users found</p>
                <p className="text-sm">Be the first to join!</p>
              </div>
            ) : (
              suggestedUsers.map((userData, index) => (
                <UserCard key={userData.id} userData={userData} index={index} />
              ))
            )}
          </TabsContent>

          <TabsContent value="ai-bots" className="mt-4 space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">AI ASSISTANTS</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Follow AI bots to get personalized news recommendations and updates.
            </p>
            {AI_BOTS.map((bot, index) => (
              <UserCard key={bot.id} userData={bot} index={index} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
      <AuthModal />
    </main>
  );
}
