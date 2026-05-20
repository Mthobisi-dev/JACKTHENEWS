import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';

interface SettingsState {
  // Theme
  theme: 'dark' | 'light' | 'system';
  
  // Privacy
  hideOnlineStatus: boolean;
  hideReadingActivity: boolean;
  
  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  aiRecommendations: boolean;
  breakingNews: boolean;
  communityAlerts: boolean;
  
  // Content preferences
  autoplayVideos: boolean;
  showExplicitContent: boolean;
  language: string;
  
  // Sync status
  isSyncing: boolean;
  
  // Actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  toggleOnlineStatus: () => void;
  toggleReadingActivity: () => void;
  togglePushNotifications: () => void;
  toggleEmailNotifications: () => void;
  toggleAIRecommendations: () => void;
  toggleBreakingNews: () => void;
  toggleCommunityAlerts: () => void;
  toggleAutoplayVideos: () => void;
  toggleExplicitContent: () => void;
  setLanguage: (language: string) => void;
  
  // Supabase sync
  syncToFirebase: (userId: string) => Promise<void>;
  loadFromFirebase: (userId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default values
      theme: 'dark',
      hideOnlineStatus: false,
      hideReadingActivity: false,
      pushNotifications: true,
      emailNotifications: true,
      aiRecommendations: true,
      breakingNews: true,
      communityAlerts: true,
      autoplayVideos: true,
      showExplicitContent: false,
      language: 'en',
      isSyncing: false,

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },

      toggleOnlineStatus: () => set((state) => ({ hideOnlineStatus: !state.hideOnlineStatus })),
      toggleReadingActivity: () => set((state) => ({ hideReadingActivity: !state.hideReadingActivity })),
      togglePushNotifications: () => set((state) => ({ pushNotifications: !state.pushNotifications })),
      toggleEmailNotifications: () => set((state) => ({ emailNotifications: !state.emailNotifications })),
      toggleAIRecommendations: () => set((state) => ({ aiRecommendations: !state.aiRecommendations })),
      toggleBreakingNews: () => set((state) => ({ breakingNews: !state.breakingNews })),
      toggleCommunityAlerts: () => set((state) => ({ communityAlerts: !state.communityAlerts })),
      toggleAutoplayVideos: () => set((state) => ({ autoplayVideos: !state.autoplayVideos })),
      toggleExplicitContent: () => set((state) => ({ showExplicitContent: !state.showExplicitContent })),
      setLanguage: (language) => set({ language }),
      
      syncToFirebase: async (userId: string) => {
        if (!supabase) return;
        set({ isSyncing: true });
        try {
          const state = get();
          await supabase.from('user_settings')
            .upsert({
              user_id: userId,
              theme: state.theme,
              hide_online_status: state.hideOnlineStatus,
              hide_reading_activity: state.hideReadingActivity,
              push_notifications: state.pushNotifications,
              email_notifications: state.emailNotifications,
              ai_recommendations: state.aiRecommendations,
              breaking_news: state.breakingNews,
              community_alerts: state.communityAlerts,
              autoplay_videos: state.autoplayVideos,
              show_explicit_content: state.showExplicitContent,
              language: state.language,
              updated_at: new Date().toISOString(),
            });
        } catch (error) {
          console.error('Error syncing settings to Supabase:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
      
      loadFromFirebase: async (userId: string) => {
        if (!supabase) return;
        set({ isSyncing: true });
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (!error && data) {
            set({
              theme: data.theme || 'dark',
              hideOnlineStatus: data.hide_online_status ?? false,
              hideReadingActivity: data.hide_reading_activity ?? false,
              pushNotifications: data.push_notifications ?? true,
              emailNotifications: data.email_notifications ?? true,
              aiRecommendations: data.ai_recommendations ?? true,
              breakingNews: data.breaking_news ?? true,
              communityAlerts: data.community_alerts ?? true,
              autoplayVideos: data.autoplay_videos ?? true,
              showExplicitContent: data.show_explicit_content ?? false,
              language: data.language || 'en',
            });
          }
        } catch (error) {
          console.error('Error loading settings from Supabase:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'nowcast-settings',
    }
  )
);
