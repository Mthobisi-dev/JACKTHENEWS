'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  ChevronRight,
  Settings,
  Edit,
  LogOut,
  Bookmark,
  MessageCircle,
  Repeat2,
  Heart,
  Calendar,
  MapPin,
  BadgeCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import { EditProfileModal } from '@/components/edit-profile-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSocialStore } from '@/lib/stores/social-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useTheme } from 'next-themes';
import type { Category, User as UserType } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import { formatRelativeTime } from '@/lib/mock-data';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { toast } from 'sonner';

const settingsItems = [
  { icon: Bell, label: 'Notifications', hasArrow: true, href: '/settings' },
  { icon: Shield, label: 'Privacy', hasArrow: true, href: '/settings' },
  { icon: HelpCircle, label: 'Help & Support', hasArrow: true },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('activity');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<UserType[]>([]);

  const { user, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const { interactions, following, toggleFollow, fetchFollowing } = useSocialStore();
  const { syncToFirebase } = useSettingsStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get bookmarked articles count
  const bookmarkedCount = Object.values(interactions).filter(i => i.isBookmarked).length;

  // Fetch suggested users from Firebase
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('followersCount', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        
        const users = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as UserType))
          .filter(u => u.id !== user?.id);
        
        setSuggestedUsers(users.slice(0, 4));
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      }
    };

    fetchSuggestedUsers();
  }, [user?.id]);

  // Fetch following status
  useEffect(() => {
    if (user?.id) {
      fetchFollowing(user.id);
    }
  }, [user?.id, fetchFollowing]);

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      await toggleFollow(targetUserId, user.id);
      toast.success(following.has(targetUserId) ? 'Unfollowed' : 'Now following');
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 glass border-b border-border p-4">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Join JACKTHENEWS</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            Create an account to save articles, follow writers, and join the conversation.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => openAuthModal('login')}>
              Log In
            </Button>
            <Button onClick={() => openAuthModal('signup')}>
              Sign Up
            </Button>
          </div>
        </div>
        <BottomNav />
        <AuthModal />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover photo */}
          <div className="h-32 bg-gradient-to-br from-primary/30 to-primary/10" />
          
          {/* Avatar */}
          <div className="px-4">
            <div className="relative -mt-12 flex items-end justify-between">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {user?.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="mb-2" onClick={() => setShowEditProfile(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
            </div>

            {/* User info */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{user?.displayName}</h2>
                {user?.isVerified && (
                  <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
                )}
              </div>
              <p className="text-muted-foreground">@{user?.username}</p>
              
              {user?.bio && (
                <p className="mt-2 text-sm">{user.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {user?.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {user.countryFlag} {user.country}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {user?.createdAt ? formatRelativeTime(user.createdAt) : 'recently'}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-6 mt-4 py-4 border-y border-border"
            >
              <div className="text-center">
                <p className="text-lg font-bold">{user?.articlesRead || 0}</p>
                <p className="text-xs text-muted-foreground">Articles Read</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{user?.commentsCount || 0}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{user?.resharesCount || 0}</p>
                <p className="text-xs text-muted-foreground">Reshares</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{user?.followersCount || 0}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{user?.followingCount || 0}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="activity" className="text-xs py-2">Activity</TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs py-2">Saved</TabsTrigger>
            <TabsTrigger value="reshares" className="text-xs py-2">Reshares</TabsTrigger>
            <TabsTrigger value="comments" className="text-xs py-2">Comments</TabsTrigger>
            <TabsTrigger value="likes" className="text-xs py-2">Likes</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your recent activity will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{bookmarkedCount > 0 ? `${bookmarkedCount} saved articles` : 'No saved articles yet'}</p>
            </div>
          </TabsContent>

          <TabsContent value="reshares" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Repeat2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your reshares will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your comments will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="likes" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Articles you&apos;ve liked will appear here</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* People you may know */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">People you may know</h3>
            <Link href="/discover" className="text-xs text-primary hover:underline flex items-center gap-1">
              See all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {suggestedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No users to suggest yet</p>
              <Link href="/discover">
                <Button variant="outline" size="sm" className="mt-3">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Discover Users
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {suggestedUsers.map((suggestedUser) => (
                <motion.div
                  key={suggestedUser.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center p-4 rounded-xl bg-card border border-border min-w-[140px]"
                >
                  <Avatar className="h-16 w-16 mb-2">
                    <AvatarImage src={suggestedUser.avatarUrl || undefined} />
                    <AvatarFallback>{suggestedUser.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm truncate w-full text-center">
                    {suggestedUser.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate w-full text-center">
                    @{suggestedUser.username}
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-2 w-full"
                    variant={following.has(suggestedUser.id) ? "secondary" : "default"}
                    onClick={() => handleFollow(suggestedUser.id)}
                  >
                    {following.has(suggestedUser.id) ? 'Following' : 'Follow'}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Interests */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4"
        >
          <h3 className="font-semibold text-foreground mb-3">Your Interests</h3>
          <div className="flex flex-wrap gap-2">
            {(user?.topics || ['technology', 'world', 'science'] as Category[]).map((interest) => (
              <Badge key={interest} variant="secondary">
                {CATEGORY_LABELS[interest as Category]}
              </Badge>
            ))}
            <Badge variant="outline" className="cursor-pointer hover:bg-secondary">
              + Add more
            </Badge>
          </div>
        </motion.section>

        {/* Quick Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4"
        >
          <h3 className="font-semibold text-foreground mb-3">Quick Settings</h3>
          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {mounted && resolvedTheme === 'dark' ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">Dark Mode</span>
              </div>
              <Switch
                checked={mounted && resolvedTheme === 'dark'}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light');
                  if (user?.id) syncToFirebase(user.id);
                }}
              />
            </div>
            
            {/* Settings Links */}
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
              
              if (item.href) {
                return (
                  <Link key={item.label} href={item.href} className="block hover:bg-secondary/50 transition-colors">
                    {content}
                  </Link>
                );
              }
              
              return <div key={item.label}>{content}</div>;
            })}
          </div>
        </motion.section>

        {/* Logout */}
        <div className="px-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>

        {/* Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-muted-foreground pb-4"
        >
          JACKTHENEWS v1.0.0
        </motion.p>
      </div>

      <BottomNav />
      <AuthModal />
      <EditProfileModal 
        open={showEditProfile} 
        onOpenChange={setShowEditProfile} 
      />
    </main>
  );
}
