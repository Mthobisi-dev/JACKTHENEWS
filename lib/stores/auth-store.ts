import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';
import type { User, Category } from '../types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface SignupData {
  email: string;
  password: string;
  username: string;
  fullName: string;
  country?: string;
  countryFlag?: string;
  topics?: Category[];
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  authModalMode: 'login' | 'signup' | 'forgot';
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateTopics: (topics: Category[]) => Promise<void>;
  openAuthModal: (mode?: 'login' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'signup' | 'forgot') => void;
  setError: (error: string | null) => void;
  initializeAuth: () => () => void;
}

// Helper to create user profile from Supabase user
const createUserProfile = (supabaseUser: SupabaseUser, profile?: Record<string, unknown>): User => ({
  id: supabaseUser.id,
  username: (profile?.username as string) || supabaseUser.email?.split('@')[0] || 'user',
  displayName: (profile?.display_name as string) || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'News Reader',
  email: supabaseUser.email || '',
  avatarUrl: (profile?.avatar_url as string) || supabaseUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
  coverUrl: (profile?.cover_url as string) || null,
  bio: (profile?.bio as string) || '',
  country: (profile?.country as string) || 'US',
  countryFlag: (profile?.country_flag as string) || undefined,
  location: (profile?.location as string) || undefined,
  website: (profile?.website as string) || undefined,
  topics: (profile?.topics as Category[]) || ['technology', 'world'],
  isVerified: (profile?.is_verified as boolean) || false,
  isAIBot: false,
  articlesRead: (profile?.articles_read as number) || 0,
  commentsCount: (profile?.comments_count as number) || 0,
  resharesCount: (profile?.reshares_count as number) || 0,
  followersCount: (profile?.followers_count as number) || 0,
  followingCount: (profile?.following_count as number) || 0,
  createdAt: (profile?.created_at as string) || supabaseUser.created_at || new Date().toISOString(),
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      showAuthModal: false,
      authModalMode: 'login',
      error: null,

      initializeAuth: () => {
        if (!supabase || !isSupabaseConfigured) {
          console.warn('[v0] Supabase not configured, auth disabled');
          return () => {};
        }

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              session,
              user: createUserProfile(session.user, profile || undefined),
              isAuthenticated: true,
            });
          }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              session,
              user: createUserProfile(session.user, profile || undefined),
              isAuthenticated: true,
              showAuthModal: false,
              isLoading: false,
            });
          } else if (event === 'SIGNED_OUT') {
            set({
              session: null,
              user: null,
              isAuthenticated: false,
            });
          }
        });

        return () => subscription.unsubscribe();
      },

      login: async (email: string, password: string) => {
        if (!supabase) {
          set({ error: 'Supabase not configured. Please add environment variables.' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            set({
              session: data.session,
              user: createUserProfile(data.user, profile || undefined),
              isAuthenticated: true,
              isLoading: false,
              showAuthModal: false,
            });
            return true;
          }
          return false;
        } catch (error: unknown) {
          let errorMessage = 'Login failed. Please try again.';
          if (error instanceof Error) {
            if (error.message.includes('Invalid login credentials')) {
              errorMessage = 'Invalid email or password.';
            } else if (error.message.includes('Email not confirmed')) {
              errorMessage = 'Please verify your email before logging in.';
            } else {
              errorMessage = error.message;
            }
          }
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      signup: async (data: SignupData) => {
        if (!supabase) {
          set({ error: 'Supabase not configured. Please add environment variables.' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const emailRedirectTo = typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?next=/`
            : undefined;
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email.trim().toLowerCase(),
            password: data.password,
            options: {
              emailRedirectTo,
              data: {
                username: data.username,
                full_name: data.fullName,
                country: data.country || 'US',
                country_flag: data.countryFlag || null,
                topics: data.topics || ['technology', 'world'],
              },
            },
          });

          if (authError) throw authError;

          if (authData.user) {
            const user = createUserProfile(authData.user, {
              username: data.username,
              display_name: data.fullName,
              country: data.country,
              country_flag: data.countryFlag,
              topics: data.topics,
            });

            set({
              session: authData.session,
              user: authData.session ? user : null,
              isAuthenticated: !!authData.session,
              isLoading: false,
              showAuthModal: !authData.session,
            });
            return true;
          }
          return false;
        } catch (error: unknown) {
          let errorMessage = 'Signup failed. Please try again.';
          if (error instanceof Error) {
            if (error.message.includes('already registered')) {
              errorMessage = 'An account with this email already exists.';
            } else if (error.message.includes('password')) {
              errorMessage = 'Password is too weak. Use at least 6 characters.';
            } else {
              errorMessage = error.message;
            }
          }
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      loginWithGoogle: async () => {
        if (!supabase) {
          set({ error: 'Supabase not configured. Please add environment variables.' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
            (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined);
          
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });

          if (error) {
            // Handle provider not enabled error
            if (error.message?.includes('provider') || error.message?.includes('not enabled') || 
                error.message?.includes('Unsupported provider')) {
              throw new Error('Google login is not available. Please sign in with email and password.');
            }
            throw error;
          }
          
          // OAuth redirects, so loading state will be handled by auth state change
          return true;
        } catch (error: unknown) {
          let errorMessage = 'Google login is not available. Please use email and password.';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      resetPassword: async (email: string) => {
        if (!supabase) {
          set({ error: 'Supabase not configured.' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
          });

          if (error) throw error;
          
          set({ isLoading: false });
          return true;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      logout: async () => {
        try {
          if (supabase) await supabase.auth.signOut();
          set({ 
            user: null, 
            session: null,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      deleteAccount: async () => {
        const { user } = get();
        if (!user || !supabase) {
          set({ error: 'Not authenticated or Supabase not configured' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          // Delete user data from various tables
          await Promise.all([
            supabase.from('users').delete().eq('id', user.id),
            supabase.from('user_settings').delete().eq('user_id', user.id),
            supabase.from('follows').delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
            supabase.from('comments').delete().eq('user_id', user.id),
            supabase.from('reactions').delete().eq('user_id', user.id),
            supabase.from('bookmarks').delete().eq('user_id', user.id),
            supabase.from('stories').delete().eq('user_id', user.id),
            supabase.from('messages').delete().eq('sender_id', user.id),
            supabase.from('notifications').delete().eq('user_id', user.id),
          ]);
          
          // Sign out the user (this effectively "deletes" the auth account from the user's perspective)
          await supabase.auth.signOut();
          
          set({ 
            user: null, 
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          return true;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      updateProfile: async (data: Partial<User>) => {
        const { user } = get();
        if (!user || !supabase) return;
        
        try {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          
          if (data.displayName !== undefined) updates.display_name = data.displayName;
          if (data.username !== undefined) updates.username = data.username;
          if (data.bio !== undefined) updates.bio = data.bio;
          if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;
          if (data.coverUrl !== undefined) updates.cover_url = data.coverUrl;
          if (data.location !== undefined) updates.location = data.location;
          if (data.website !== undefined) updates.website = data.website;
          if (data.country !== undefined) updates.country = data.country;
          if (data.countryFlag !== undefined) updates.country_flag = data.countryFlag;
          if (data.topics !== undefined) updates.topics = data.topics;

          const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id);

          if (error) throw error;
          
          set({ user: { ...user, ...data } });
        } catch (error) {
          console.error('Update profile error:', error);
        }
      },

      updateTopics: async (topics: Category[]) => {
        const { user } = get();
        if (!user || !supabase) return;
        
        try {
          const { error } = await supabase
            .from('users')
            .update({ topics, updated_at: new Date().toISOString() })
            .eq('id', user.id);

          if (error) throw error;
          
          set({ user: { ...user, topics } });
        } catch (error) {
          console.error('Update topics error:', error);
        }
      },

      openAuthModal: (mode = 'login') => {
        set({ showAuthModal: true, authModalMode: mode, error: null });
      },

      closeAuthModal: () => {
        set({ showAuthModal: false, error: null });
      },

      setAuthModalMode: (mode) => {
        set({ authModalMode: mode, error: null });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'nowcast-auth',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
