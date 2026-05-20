import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';

export interface CommunityMessage {
  id: string;
  roomId: string;
  userId: string;
  userDisplayName: string;
  userAvatar: string;
  content: string;
  type: 'text' | 'news-share' | 'voice';
  newsTitle?: string;
  newsImage?: string;
  mediaUrl?: string;
  createdAt: string;
  reactions: {
    like: number;
    heart: number;
  };
}

export interface CommunityRoom {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  memberCount: number;
  messageCount: number;
  isOfficial: boolean;
  lastActivity: string;
}

interface CommunityState {
  rooms: CommunityRoom[];
  messages: Record<string, CommunityMessage[]>;
  activeRoom: string | null;
  onlineUsers: number;
  isLoading: boolean;
  
  // Actions
  fetchRooms: () => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  subscribeToMessages: (roomId: string) => () => void;
  setActiveRoom: (roomId: string | null) => void;
  sendMessage: (roomId: string, message: Omit<CommunityMessage, 'id' | 'createdAt' | 'reactions'>) => Promise<void>;
  reactToMessage: (roomId: string, messageId: string, reaction: 'like' | 'heart') => Promise<void>;
  createRoom: (room: Omit<CommunityRoom, 'id' | 'memberCount' | 'messageCount' | 'lastActivity'>) => Promise<string | null>;
}

// Default rooms to create if none exist
const DEFAULT_ROOMS: Omit<CommunityRoom, 'id'>[] = [
  {
    name: 'General Discussion',
    description: 'Talk about anything news-related',
    category: 'general',
    icon: 'MessageCircle',
    memberCount: 0,
    messageCount: 0,
    isOfficial: true,
    lastActivity: new Date().toISOString(),
  },
  {
    name: 'Breaking News',
    description: 'Real-time breaking news updates',
    category: 'news',
    icon: 'Zap',
    memberCount: 0,
    messageCount: 0,
    isOfficial: true,
    lastActivity: new Date().toISOString(),
  },
  {
    name: 'Local Community',
    description: 'Share local news and incidents',
    category: 'local',
    icon: 'MapPin',
    memberCount: 0,
    messageCount: 0,
    isOfficial: false,
    lastActivity: new Date().toISOString(),
  },
];

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      rooms: [],
      messages: {},
      activeRoom: null,
      onlineUsers: 0,
      isLoading: false,

      fetchRooms: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('community_rooms')
            .select('*')
            .order('last_activity', { ascending: false });

          if (error) {
            // Handle schema cache miss
            if (error.code === 'PGRST205') {
              console.warn('community_rooms table not found in schema cache');
              set({ rooms: [], isLoading: false });
              return;
            }
            throw error;
          }
          
          let rooms: CommunityRoom[] = (data || []).map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            category: r.category,
            icon: r.icon,
            memberCount: r.member_count || 0,
            messageCount: r.message_count || 0,
            isOfficial: r.is_official,
            lastActivity: r.last_activity,
          }));
          
          // If no rooms exist, create default rooms
          if (rooms.length === 0) {
            for (const room of DEFAULT_ROOMS) {
              const { data: newRoom, error: insertError } = await supabase
                .from('community_rooms')
                .insert({
                  name: room.name,
                  description: room.description,
                  category: room.category,
                  icon: room.icon,
                  member_count: 0,
                  message_count: 0,
                  is_official: room.isOfficial,
                  last_activity: new Date().toISOString(),
                })
                .select()
                .single();

              if (!insertError && newRoom) {
                rooms.push({
                  id: newRoom.id,
                  name: newRoom.name,
                  description: newRoom.description,
                  category: newRoom.category,
                  icon: newRoom.icon,
                  memberCount: 0,
                  messageCount: 0,
                  isOfficial: newRoom.is_official,
                  lastActivity: newRoom.last_activity,
                });
              }
            }
          }
          
          set({ rooms, isLoading: false });
        } catch (error) {
          console.error('Error fetching rooms:', error);
          set({ isLoading: false });
        }
      },

      fetchMessages: async (roomId: string) => {
        try {
          const { data, error } = await supabase
            .from('community_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .limit(100);

          if (error) {
            // Handle schema cache miss
            if (error.code === 'PGRST205') {
              console.warn('community_messages table not found in schema cache');
              set((state) => ({
                messages: { ...state.messages, [roomId]: [] },
              }));
              return;
            }
            throw error;
          }

          const messages: CommunityMessage[] = (data || []).map(m => ({
            id: m.id,
            roomId: m.room_id,
            userId: m.user_id,
            userDisplayName: m.user_display_name,
            userAvatar: m.user_avatar,
            content: m.content,
            type: m.type as CommunityMessage['type'],
            newsArticleId: m.news_article_id,
            newsTitle: m.news_title,
            newsImage: m.news_image,
            createdAt: m.created_at,
            reactions: m.reactions || { like: 0, heart: 0 },
          }));
          
          set((state) => ({
            messages: { ...state.messages, [roomId]: messages },
          }));
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      },

      subscribeToMessages: (roomId: string) => {
        const supabaseClient = supabase;
        if (!supabaseClient) return () => {};
        
        const channel = supabaseClient
          .channel(`community:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'community_messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              const m = payload.new as any;
              const newMessage: CommunityMessage = {
                id: m.id,
                roomId: m.room_id,
                userId: m.user_id,
                userDisplayName: m.user_display_name,
                userAvatar: m.user_avatar,
                content: m.content,
                type: m.type,
                newsArticleId: m.news_article_id,
                newsTitle: m.news_title,
                newsImage: m.news_image,
                createdAt: m.created_at,
                reactions: m.reactions || { like: 0, heart: 0 },
              };
              
              set((state) => {
                const existing = state.messages[roomId] || [];
                if (existing.some(msg => msg.id === m.id)) {
                  return state;
                }
                return {
                  messages: { ...state.messages, [roomId]: [...existing, newMessage] },
                };
              });
            }
          )
          .subscribe();
        
        return () => {
          supabase.removeChannel(channel);
        };
      },

      setActiveRoom: (roomId) => {
        set({ activeRoom: roomId });
      },

      sendMessage: async (roomId, messageData) => {
        const tempId = `temp-${Date.now()}`;
        
        // Optimistically add message
        const newMessage: CommunityMessage = {
          ...messageData,
          id: tempId,
          roomId,
          createdAt: new Date().toISOString(),
          reactions: { like: 0, heart: 0 },
        };
        
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: [...(state.messages[roomId] || []), newMessage],
          },
        }));

        try {
          const { data, error } = await supabase
            .from('community_messages')
            .insert({
              room_id: roomId,
              user_id: messageData.userId,
              user_display_name: messageData.userDisplayName,
              user_avatar: messageData.userAvatar,
              content: messageData.content,
              type: messageData.type,
              news_article_id: messageData.newsArticleId,
              news_title: messageData.newsTitle,
              news_image: messageData.newsImage,
              reactions: { like: 0, heart: 0 },
            })
            .select()
            .single();

          if (error) throw error;
          
          // Update room's last activity and message count
          await supabase?.from('community_rooms')
            .update({
              last_activity: new Date().toISOString(),
            })
            .eq('id', roomId);
          
          // Replace temp message with real one
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map(m =>
                m.id === tempId ? { ...newMessage, id: data.id, createdAt: data.created_at } : m
              ),
            },
          }));
        } catch (error) {
          console.error('Error sending message:', error);
          // Remove temp message on error
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).filter(m => m.id !== tempId),
            },
          }));
        }
      },

      reactToMessage: async (roomId, messageId, reaction) => {
        // Optimistic update
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((msg) =>
              msg.id === messageId
                ? { ...msg, reactions: { ...msg.reactions, [reaction]: msg.reactions[reaction] + 1 } }
                : msg
            ),
          },
        }));

        try {
          const { data: current } = await supabase
            .from('community_messages')
            .select('reactions')
            .eq('id', messageId)
            .single();

          if (current) {
            const reactions = current.reactions || { like: 0, heart: 0 };
            reactions[reaction] = (reactions[reaction] || 0) + 1;

            await supabase
              .from('community_messages')
              .update({ reactions })
              .eq('id', messageId);
          }
        } catch (error) {
          console.error('Error reacting to message:', error);
        }
      },

      createRoom: async (roomData) => {
        try {
          const { data, error } = await supabase
            .from('community_rooms')
            .insert({
              name: roomData.name,
              description: roomData.description,
              category: roomData.category,
              icon: roomData.icon,
              member_count: 1,
              message_count: 0,
              is_official: roomData.isOfficial,
              last_activity: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;
          
          const newRoom: CommunityRoom = {
            id: data.id,
            name: data.name,
            description: data.description,
            category: data.category,
            icon: data.icon,
            memberCount: 1,
            messageCount: 0,
            isOfficial: data.is_official,
            lastActivity: data.last_activity,
          };
          
          set((state) => ({
            rooms: [newRoom, ...state.rooms],
          }));
          
          return data.id;
        } catch (error) {
          console.error('Error creating room:', error);
          return null;
        }
      },
    }),
    {
      name: 'nowcast-community',
      partialize: (state) => ({ activeRoom: state.activeRoom }),
    }
  )
);
