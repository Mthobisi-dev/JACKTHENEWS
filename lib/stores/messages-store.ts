import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';
import type { Conversation, DirectMessage, User, NewsArticle } from '../types';

interface MessagesState {
  conversations: Conversation[];
  messages: Record<string, DirectMessage[]>;
  activeConversationId: string | null;
  totalUnreadCount: number;
  isLoading: boolean;
  
  // Actions
  fetchConversations: (userId: string) => Promise<void>;
  subscribeToConversations: (userId: string) => () => void;
  subscribeToMessages: (conversationId: string) => () => void;
  setActiveConversation: (conversationId: string | null) => void;
  sendMessage: (conversationId: string, content: string, senderId: string, sender: User, article?: NewsArticle | null) => Promise<void>;
  sendArticle: (userId: string, article: NewsArticle, currentUser: User) => Promise<void>;
  markConversationRead: (conversationId: string, userId: string) => Promise<void>;
  createConversation: (currentUser: User, participants: User[], groupName?: string | null) => Promise<string>;
  startChatWithUser: (currentUser: User, targetUser: User) => Promise<string>;
  addReaction: (conversationId: string, messageId: string, reaction: string) => Promise<void>;
  getConversation: (conversationId: string) => Conversation | undefined;
  getMessages: (conversationId: string) => DirectMessage[];
}

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      activeConversationId: null,
      totalUnreadCount: 0,
      isLoading: false,

      fetchConversations: async (userId: string) => {
        set({ isLoading: true });
        try {
          // Get conversation IDs where user is a participant
          const { data: participantData, error: participantError } = await supabase
            .from('conversation_participants')
            .select('conversation_id, unread_count')
            .eq('user_id', userId);

          if (participantError) throw participantError;

          const conversationIds = (participantData || []).map((p) => p.conversation_id);
          
          if (conversationIds.length === 0) {
            set({ conversations: [], isLoading: false, totalUnreadCount: 0 });
            return;
          }

          // Fetch conversation details
          const { data: conversationsData, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds)
            .order('updated_at', { ascending: false });

          if (convError) throw convError;

          // Build conversation objects with participants
          const conversations: Conversation[] = await Promise.all(
            (conversationsData || []).map(async (conv) => {
              // Fetch all participants for this conversation
              const { data: allParticipants } = await supabase
                .from('conversation_participants')
                .select(`
                  user_id,
                  unread_count,
                  users:user_id (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    is_verified,
                    is_ai_bot
                  )
                `)
                .eq('conversation_id', conv.id);

              const participants: User[] = (allParticipants || []).map((p) => {
                const userData = p.users as unknown as Record<string, unknown>;
                return {
                  id: (userData?.id as string) || p.user_id,
                  username: (userData?.username as string) || 'user',
                  displayName: (userData?.display_name as string) || 'User',
                  email: '',
                  avatarUrl: (userData?.avatar_url as string) || null,
                  isVerified: (userData?.is_verified as boolean) || false,
                  isAIBot: (userData?.is_ai_bot as boolean) || false,
                };
              });

              // Get last message
              const { data: lastMsgData } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const userParticipant = participantData?.find((p) => p.conversation_id === conv.id);

              return {
                id: conv.id,
                participants,
                participantIds: participants.map((p) => p.id),
                isGroup: conv.is_group,
                groupName: conv.group_name,
                lastMessage: lastMsgData
                  ? {
                      id: lastMsgData.id,
                      conversationId: lastMsgData.conversation_id,
                      senderId: lastMsgData.sender_id,
                      content: lastMsgData.content,
                      createdAt: lastMsgData.created_at,
                      readAt: lastMsgData.read_at,
                    }
                  : null,
                unreadCount: userParticipant?.unread_count || 0,
                createdAt: conv.created_at,
                updatedAt: conv.updated_at,
              };
            })
          );

          const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
          set({ conversations, isLoading: false, totalUnreadCount: totalUnread });
        } catch (error) {
          console.error('Error fetching conversations:', error);
          set({ isLoading: false });
        }
      },

      subscribeToConversations: (userId: string) => {
        const supabaseClient = supabase;
        if (!supabaseClient) return () => {};
        
        const channel = supabaseClient
          .channel(`conversations:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
            },
            () => {
              get().fetchConversations(userId);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'conversations',
            },
            () => {
              get().fetchConversations(userId);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },

      subscribeToMessages: (conversationId: string) => {
        const supabaseClient = supabase;
        if (!supabaseClient) return () => {};
        
        const channel = supabaseClient
          .channel(`messages:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            async (payload) => {
              const newMsg = payload.new as Record<string, unknown>;
              
              // Fetch sender info
              const { data: senderData } = await supabase
                .from('users')
                .select('id, username, display_name, avatar_url, is_ai_bot')
                .eq('id', newMsg.sender_id)
                .maybeSingle();

              const sender: User = senderData
                ? {
                    id: senderData.id,
                    username: senderData.username,
                    displayName: senderData.display_name,
                    email: '',
                    avatarUrl: senderData.avatar_url,
                    isAIBot: senderData.is_ai_bot,
                  }
                : { id: newMsg.sender_id as string, username: 'user', displayName: 'User', email: '' };

              const message: DirectMessage = {
                id: newMsg.id as string,
                conversationId: newMsg.conversation_id as string,
                senderId: newMsg.sender_id as string,
                sender,
                content: newMsg.content as string,
                articleId: (newMsg.article_id as string) || null,
                article: (newMsg.article as NewsArticle) || null,
                createdAt: newMsg.created_at as string,
                readAt: (newMsg.read_at as string) || null,
                reaction: (newMsg.reaction as string) || null,
              };

              set((state) => ({
                messages: {
                  ...state.messages,
                  [conversationId]: [...(state.messages[conversationId] || []), message],
                },
              }));
            }
          )
          .subscribe();

        // Initial fetch
        get().fetchMessages(conversationId);

        return () => {
          supabase.removeChannel(channel);
        };
      },

      fetchMessages: async (conversationId: string) => {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id (
                id,
                username,
                display_name,
                avatar_url,
                is_ai_bot
              )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(100);

          if (error) throw error;

          const messages: DirectMessage[] = (data || []).map((m) => {
            const senderData = m.sender as unknown as Record<string, unknown>;
            const sender: User = senderData
              ? {
                  id: (senderData.id as string) || m.sender_id,
                  username: (senderData.username as string) || 'user',
                  displayName: (senderData.display_name as string) || 'User',
                  email: '',
                  avatarUrl: (senderData.avatar_url as string) || null,
                  isAIBot: (senderData.is_ai_bot as boolean) || false,
                }
              : { id: m.sender_id, username: 'user', displayName: 'User', email: '' };

            return {
              id: m.id,
              conversationId: m.conversation_id,
              senderId: m.sender_id,
              sender,
              content: m.content,
              articleId: m.article_id || null,
              article: m.article || null,
              createdAt: m.created_at,
              readAt: m.read_at || null,
              reaction: m.reaction || null,
            };
          });

          set((state) => ({
            messages: { ...state.messages, [conversationId]: messages },
          }));
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      },

      setActiveConversation: (conversationId: string | null) => {
        set({ activeConversationId: conversationId });
      },

      sendMessage: async (conversationId: string, content: string, senderId: string, sender: User, article: NewsArticle | null = null) => {
        const tempId = `temp-${Date.now()}`;
        const newMessage: DirectMessage = {
          id: tempId,
          conversationId,
          senderId,
          sender,
          content,
          articleId: article?.article_id || null,
          article: article || null,
          createdAt: new Date().toISOString(),
          readAt: null,
          reaction: null,
        };

        // Optimistic update
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), newMessage],
          },
        }));

        try {
          const { data, error } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: senderId,
              content,
              article_id: article?.article_id || null,
              article: article ? {
                article_id: article.article_id,
                title: article.title,
                image_url: article.image_url,
              } : null,
            })
            .select()
            .single();

          if (error) throw error;

          // Update conversation's updated_at
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

          // Get other participants and increment their unread count
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, unread_count')
            .eq('conversation_id', conversationId)
            .neq('user_id', senderId);

          for (const p of participants || []) {
            await supabase
              .from('conversation_participants')
              .update({ unread_count: (p.unread_count || 0) + 1 })
              .eq('conversation_id', conversationId)
              .eq('user_id', p.user_id);
          }

          // Update message with real ID
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: (state.messages[conversationId] || []).map((m) =>
                m.id === tempId ? { ...m, id: data.id } : m
              ),
            },
          }));
        } catch (error) {
          console.error('Error sending message:', error);
          throw error;
        }
      },

      sendArticle: async (userId: string, article: NewsArticle, currentUser: User) => {
        const { conversations, startChatWithUser, sendMessage } = get();
        
        // Find existing conversation with user
        let conversation = conversations.find(
          (c) => !c.isGroup && c.participantIds?.includes(userId)
        );

        if (!conversation) {
          const targetUser: User = {
            id: userId,
            username: userId,
            displayName: userId,
            email: '',
          };
          const convId = await startChatWithUser(currentUser, targetUser);
          conversation = get().conversations.find((c) => c.id === convId);
        }

        if (conversation) {
          await sendMessage(
            conversation.id, 
            `Check out this story: ${article.title}`, 
            currentUser.id, 
            currentUser, 
            article
          );
        }
      },

      markConversationRead: async (conversationId: string, userId: string) => {
        try {
          // Mark messages as read
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .is('read_at', null);

          // Reset unread count
          await supabase
            .from('conversation_participants')
            .update({ unread_count: 0 })
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

          set((state) => {
            const conversation = state.conversations.find((c) => c.id === conversationId);
            if (!conversation || conversation.unreadCount === 0) return state;

            return {
              conversations: state.conversations.map((c) =>
                c.id === conversationId ? { ...c, unreadCount: 0 } : c
              ),
              totalUnreadCount: Math.max(0, state.totalUnreadCount - conversation.unreadCount),
            };
          });
        } catch (error) {
          console.error('Error marking conversation read:', error);
        }
      },

      createConversation: async (currentUser: User, participants: User[], groupName: string | null = null) => {
        try {
          // Create conversation
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              is_group: participants.length > 1,
              group_name: groupName,
            })
            .select()
            .single();

          if (convError) throw convError;

          // Add all participants
          const allParticipants = [currentUser, ...participants];
          const participantInserts = allParticipants.map((p) => ({
            conversation_id: newConv.id,
            user_id: p.id,
            unread_count: 0,
          }));

          await supabase.from('conversation_participants').insert(participantInserts);

          const newConversation: Conversation = {
            id: newConv.id,
            participants: allParticipants,
            participantIds: allParticipants.map((p) => p.id),
            isGroup: participants.length > 1,
            groupName,
            lastMessage: null,
            unreadCount: 0,
            createdAt: newConv.created_at,
            updatedAt: newConv.updated_at,
          };

          set((state) => ({
            conversations: [newConversation, ...state.conversations],
          }));

          return newConv.id;
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw error;
        }
      },

      startChatWithUser: async (currentUser: User, targetUser: User) => {
        const { conversations, createConversation } = get();
        
        // Check if conversation already exists
        const existingConv = conversations.find(
          (c) => !c.isGroup && 
            c.participantIds?.includes(currentUser.id) && 
            c.participantIds?.includes(targetUser.id)
        );
        
        if (existingConv) {
          return existingConv.id;
        }

        // Check in database too
        try {
          const { data: currentUserConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', currentUser.id);

          const currentUserConvIds = (currentUserConvs || []).map((p) => p.conversation_id);

          if (currentUserConvIds.length > 0) {
            const { data: targetUserConvs } = await supabase
              .from('conversation_participants')
              .select('conversation_id')
              .eq('user_id', targetUser.id)
              .in('conversation_id', currentUserConvIds);

            for (const p of targetUserConvs || []) {
              const { data: conv } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', p.conversation_id)
                .eq('is_group', false)
                .maybeSingle();

              if (conv) {
                // Refresh conversations
                await get().fetchConversations(currentUser.id);
                return conv.id;
              }
            }
          }
        } catch (error) {
          console.error('Error checking existing conversation:', error);
        }
        
        return await createConversation(currentUser, [targetUser]);
      },

      addReaction: async (conversationId: string, messageId: string, reaction: string) => {
        try {
          await supabase
            .from('messages')
            .update({ reaction })
            .eq('id', messageId);

          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: (state.messages[conversationId] || []).map((m) =>
                m.id === messageId ? { ...m, reaction } : m
              ),
            },
          }));
        } catch (error) {
          console.error('Error adding reaction:', error);
        }
      },

      getConversation: (conversationId: string) => {
        return get().conversations.find((c) => c.id === conversationId);
      },

      getMessages: (conversationId: string) => {
        return get().messages[conversationId] || [];
      },
    }),
    {
      name: 'nowcast-messages',
      partialize: (state) => ({
        conversations: state.conversations,
        totalUnreadCount: state.totalUnreadCount,
      }),
    }
  )
);
