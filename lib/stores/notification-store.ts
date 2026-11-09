import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';
import type { Notification, NotificationType } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  fetchNotifications: (userId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  clearNotifications: () => void;
  getFilteredNotifications: (type?: NotificationType | 'all') => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      fetchNotifications: async (userId: string) => {
        if (!isSupabaseConfigured) return;
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;

          const notifications: Notification[] = (data || []).map(n => ({
            id: n.id,
            type: n.type as NotificationType,
            title: n.title,
            userId: n.user_id,
            fromUser: n.from_user,
            articleId: n.article_id,
            message: n.message,
            isRead: n.is_read,
            createdAt: n.created_at,
            metadata: n.metadata,
          }));
          
          const unreadCount = notifications.filter(n => !n.isRead).length;
          set({ notifications, unreadCount, isLoading: false });
        } catch (error) {
          console.error('Error fetching notifications:', error);
          set({ isLoading: false });
        }
      },

      subscribeToNotifications: (userId: string) => {
        const supabaseClient = supabase;
        if (!supabaseClient) return () => {};
        
        const channel = supabaseClient
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const n = payload.new as any;
              const newNotification: Notification = {
                id: n.id,
                type: n.type as NotificationType,
                title: n.title,
                userId: n.user_id,
                fromUser: n.from_user,
                articleId: n.article_id,
                message: n.message,
                isRead: n.is_read,
                createdAt: n.created_at,
                metadata: n.metadata,
              };
              
              set((state) => ({
                notifications: [newNotification, ...state.notifications],
                unreadCount: state.unreadCount + 1,
              }));
            }
          )
          .subscribe();
        
        return () => {
          supabaseClient.removeChannel(channel);
        };
      },

      addNotification: async (notification) => {
        if (!isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase.from('notifications')
            .insert({
              type: notification.type,
              title: notification.title,
              user_id: notification.userId,
              from_user: notification.fromUser,
              article_id: notification.articleId,
              message: notification.message,
              is_read: false,
              metadata: notification.metadata,
            })
            .select()
            .single();

          if (error) throw error;
          
          const newNotification: Notification = {
            id: data.id,
            type: data.type as NotificationType,
            title: data.title,
            userId: data.user_id,
            fromUser: data.from_user,
            articleId: data.article_id,
            message: data.message,
            isRead: false,
            createdAt: data.created_at,
            metadata: data.metadata,
          };
          
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        } catch (error) {
          console.error('Error adding notification:', error);
        }
      },

      markAsRead: async (notificationId: string) => {
        // Optimistic update
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId);
          if (!notification || notification.isRead) return state;
          
          return {
            notifications: state.notifications.map(n =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });

        if (!isSupabaseConfigured) return;
        try {
          await supabase.from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      },

      markAllAsRead: async (userId: string) => {
        // Optimistic update
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));

        if (!isSupabaseConfigured) return;
        try {
          await supabase.from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);
        } catch (error) {
          console.error('Error marking all as read:', error);
        }
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      getFilteredNotifications: (type = 'all') => {
        const { notifications } = get();
        if (type === 'all') return notifications;
        return notifications.filter(n => n.type === type);
      },
    }),
    {
      name: 'nowcast-notifications',
      partialize: (state) => ({ 
        notifications: state.notifications.slice(0, 20),
        unreadCount: state.unreadCount,
      }),
    }
  )
);
