import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';
import type { ReactionType, Comment, Reshare, User } from '../types';

interface ArticleInteraction {
  isLiked: boolean;
  reaction: ReactionType | null;
  isBookmarked: boolean;
  likeCount: number;
  commentCount: number;
  reshareCount: number;
}

interface SocialState {
  interactions: Record<string, ArticleInteraction>;
  comments: Record<string, Comment[]>;
  reshares: Reshare[];
  following: Set<string>;
  followers: Set<string>;
  isLoadingComments: boolean;
  
  // Actions
  toggleLike: (articleId: string, userId?: string) => Promise<void>;
  setReaction: (articleId: string, reaction: ReactionType | null, userId?: string) => Promise<void>;
  toggleBookmark: (articleId: string, userId?: string) => Promise<void>;
  addComment: (articleId: string, content: string, user: User, parentId?: string | null) => Promise<void>;
  likeComment: (articleId: string, commentId: string, userId?: string) => Promise<void>;
  dislikeComment: (articleId: string, commentId: string, userId?: string) => Promise<void>;
  reshare: (articleId: string, userId?: string, commentary?: string | null) => Promise<void>;
  toggleFollow: (userId: string, currentUserId?: string) => Promise<void>;
  fetchFollowing: (userId: string) => Promise<void>;
  getInteraction: (articleId: string) => ArticleInteraction;
  getComments: (articleId: string) => Comment[];
  fetchComments: (articleId: string) => Promise<void>;
  fetchInteraction: (articleId: string, userId?: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
  loadUserInteractions: (userId: string) => Promise<void>;
}

const createDefaultInteraction = (): ArticleInteraction => ({
  isLiked: false,
  reaction: null,
  isBookmarked: false,
  likeCount: Math.floor(Math.random() * 500) + 10,
  commentCount: Math.floor(Math.random() * 100) + 5,
  reshareCount: Math.floor(Math.random() * 50) + 2,
});

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      interactions: {},
      comments: {},
      reshares: [],
      following: new Set<string>(),
      followers: new Set<string>(),
      isLoadingComments: false,

      loadUserInteractions: async (userId: string) => {
        if (!isSupabaseConfigured) return;
        try {
          // Load user's reactions
          const { data: reactionsData } = await supabase
            .from('reactions')
            .select('article_id, reaction_type')
            .eq('user_id', userId);

          const interactions: Record<string, ArticleInteraction> = {};
          
          (reactionsData || []).forEach((r) => {
            interactions[r.article_id] = {
              ...createDefaultInteraction(),
              isLiked: r.reaction_type !== null,
              reaction: r.reaction_type as ReactionType,
            };
          });

          // Load user's bookmarks
          const { data: bookmarksData } = await supabase
            .from('bookmarks')
            .select('article_id')
            .eq('user_id', userId);

          (bookmarksData || []).forEach((b) => {
            if (interactions[b.article_id]) {
              interactions[b.article_id].isBookmarked = true;
            } else {
              interactions[b.article_id] = {
                ...createDefaultInteraction(),
                isBookmarked: true,
              };
            }
          });

          set((state) => ({
            interactions: { ...state.interactions, ...interactions },
          }));
        } catch (error) {
          console.error('Error loading user interactions:', error);
        }
      },

      toggleLike: async (articleId: string, userId?: string) => {
        const current = get().interactions[articleId] || { ...createDefaultInteraction() };
        const isLiked = !current.isLiked;

        // Optimistic update
        set((state) => ({
          interactions: {
            ...state.interactions,
            [articleId]: {
              ...current,
              isLiked,
              reaction: isLiked ? 'like' : null,
              likeCount: current.likeCount + (isLiked ? 1 : -1),
            },
          },
        }));

        if (userId) {
          try {
            if (isLiked) {
              await supabase.from('reactions').upsert({
                user_id: userId,
                article_id: articleId,
                reaction_type: 'like',
              }, { onConflict: 'user_id,article_id' });
            } else {
              await supabase
                .from('reactions')
                .delete()
                .eq('user_id', userId)
                .eq('article_id', articleId);
            }
          } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on error
            set((state) => ({
              interactions: { ...state.interactions, [articleId]: current },
            }));
          }
        }
      },

      setReaction: async (articleId: string, reaction: ReactionType | null, userId?: string) => {
        const current = get().interactions[articleId] || { ...createDefaultInteraction() };
        const wasLiked = current.isLiked;
        const isLiked = reaction !== null;

        // Optimistic update
        set((state) => ({
          interactions: {
            ...state.interactions,
            [articleId]: {
              ...current,
              isLiked,
              reaction,
              likeCount: current.likeCount + (isLiked && !wasLiked ? 1 : !isLiked && wasLiked ? -1 : 0),
            },
          },
        }));

        if (userId) {
          try {
            if (reaction) {
              await supabase.from('reactions').upsert({
                user_id: userId,
                article_id: articleId,
                reaction_type: reaction,
              }, { onConflict: 'user_id,article_id' });
            } else {
              await supabase
                .from('reactions')
                .delete()
                .eq('user_id', userId)
                .eq('article_id', articleId);
            }
          } catch (error) {
            console.error('Error setting reaction:', error);
          }
        }
      },

      toggleBookmark: async (articleId: string, userId?: string) => {
        const current = get().interactions[articleId] || { ...createDefaultInteraction() };
        const isBookmarked = !current.isBookmarked;

        // Optimistic update
        set((state) => ({
          interactions: {
            ...state.interactions,
            [articleId]: { ...current, isBookmarked },
          },
        }));

        if (userId) {
          try {
            if (isBookmarked) {
              await supabase.from('bookmarks').insert({
                user_id: userId,
                article_id: articleId,
              });
} else {
              await supabase.from('bookmarks')
                .delete()
                .eq('user_id', userId)
                .eq('article_id', articleId);
            }
          } catch (error) {
            console.error('Error toggling bookmark:', error);
            // Revert on error
            set((state) => ({
              interactions: { ...state.interactions, [articleId]: current },
            }));
          }
        }
      },

      fetchComments: async (articleId: string) => {
        set({ isLoadingComments: true });

        try {
          // Fetch top-level comments with user data
          const { data: commentsData, error } = await supabase
            .from('comments')
            .select(`
              id,
              article_id,
              user_id,
              parent_id,
              content,
              like_count,
              dislike_count,
              created_at,
              updated_at,
              users:user_id (
                id,
                username,
                display_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('article_id', articleId)
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;

          // Fetch replies
          const { data: repliesData } = await supabase
            .from('comments')
            .select(`
              id,
              article_id,
              user_id,
              parent_id,
              content,
              like_count,
              dislike_count,
              created_at,
              updated_at,
              users:user_id (
                id,
                username,
                display_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('article_id', articleId)
            .not('parent_id', 'is', null)
            .order('created_at', { ascending: true });

          const fetchedComments: Comment[] = (commentsData || []).map((c) => {
            const userData = c.users as unknown as Record<string, unknown>;
            const user: User = {
              id: (userData?.id as string) || c.user_id,
              username: (userData?.username as string) || 'user',
              displayName: (userData?.display_name as string) || 'User',
              email: '',
              avatarUrl: (userData?.avatar_url as string) || null,
              isVerified: (userData?.is_verified as boolean) || false,
            };

            const replies = (repliesData || [])
              .filter((r) => r.parent_id === c.id)
              .map((r) => {
                const replyUserData = r.users as unknown as Record<string, unknown>;
                const replyUser: User = {
                  id: (replyUserData?.id as string) || r.user_id,
                  username: (replyUserData?.username as string) || 'user',
                  displayName: (replyUserData?.display_name as string) || 'User',
                  email: '',
                  avatarUrl: (replyUserData?.avatar_url as string) || null,
                  isVerified: (replyUserData?.is_verified as boolean) || false,
                };
                return {
                  id: r.id,
                  articleId: r.article_id,
                  userId: r.user_id,
                  user: replyUser,
                  content: r.content,
                  createdAt: r.created_at,
                  updatedAt: r.updated_at,
                  likeCount: r.like_count || 0,
                  dislikeCount: r.dislike_count || 0,
                  replyCount: 0,
                  parentId: r.parent_id,
                };
              });

            return {
              id: c.id,
              articleId: c.article_id,
              userId: c.user_id,
              user,
              content: c.content,
              createdAt: c.created_at,
              updatedAt: c.updated_at,
              likeCount: c.like_count || 0,
              dislikeCount: c.dislike_count || 0,
              replyCount: replies.length,
              parentId: null,
              replies,
            };
          });

          set((state) => ({
            comments: { ...state.comments, [articleId]: fetchedComments },
            isLoadingComments: false,
          }));
        } catch (error) {
          console.error('Error fetching comments:', error);
          set({ isLoadingComments: false });
        }
      },

      fetchInteraction: async (articleId: string, userId?: string) => {
        try {
          let userInteraction = { isLiked: false, reaction: null as ReactionType | null, isBookmarked: false };

          if (userId) {
            const [reactionRes, bookmarkRes] = await Promise.all([
              supabase
                ?.from('reactions')
                .select('reaction_type')
                .eq('user_id', userId)
                .eq('article_id', articleId)
                .maybeSingle(),
              supabase
                ?.from('bookmarks')
                .select('id')
                .eq('user_id', userId)
                .eq('article_id', articleId)
                .maybeSingle(),
            ]);

            if (reactionRes.data) {
              userInteraction.isLiked = true;
              userInteraction.reaction = reactionRes.data.reaction_type as ReactionType;
            }
            if (bookmarkRes.data) {
              userInteraction.isBookmarked = true;
            }
          }

          // Get counts
          const [likesRes, commentsRes, resharesRes] = await Promise.all([
            supabase.from('reactions').select('id', { count: 'exact', head: true }).eq('article_id', articleId),
            supabase.from('comments').select('id', { count: 'exact', head: true }).eq('article_id', articleId),
            supabase.from('reshares').select('id', { count: 'exact', head: true }).eq('article_id', articleId),
          ]);

          const baseline = createDefaultInteraction();
          set((state) => ({
            interactions: {
              ...state.interactions,
              [articleId]: {
                ...baseline,
                ...userInteraction,
                likeCount: likesRes.count ?? baseline.likeCount,
                commentCount: commentsRes.count ?? baseline.commentCount,
                reshareCount: resharesRes.count ?? baseline.reshareCount,
              },
            },
          }));
        } catch (error) {
          console.error('Error fetching interaction:', error);
        }
      },

      addComment: async (articleId: string, content: string, user: User, parentId: string | null = null) => {
        const tempId = `temp-${Date.now()}`;
        const newComment: Comment = {
          id: tempId,
          articleId,
          userId: user.id,
          user,
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          likeCount: 0,
          dislikeCount: 0,
          replyCount: 0,
          parentId,
        };

        // Optimistic update
        set((state) => {
          const articleComments = state.comments[articleId] || [];
          let updatedComments: Comment[];

          if (parentId) {
            updatedComments = articleComments.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...(c.replies || []), newComment], replyCount: c.replyCount + 1 }
                : c
            );
          } else {
            updatedComments = [newComment, ...articleComments];
          }

          const interaction = state.interactions[articleId] || { ...createDefaultInteraction() };
          return {
            comments: { ...state.comments, [articleId]: updatedComments },
            interactions: {
              ...state.interactions,
              [articleId]: { ...interaction, commentCount: interaction.commentCount + 1 },
            },
          };
        });

        try {
          const { data, error } = await supabase
            .from('comments')
            .insert({
              article_id: articleId,
              user_id: user.id,
              content,
              parent_id: parentId,
              like_count: 0,
              dislike_count: 0,
            })
            .select()
            .single();

          if (error) throw error;

          // Update comment with real ID
          set((state) => {
            const articleComments = state.comments[articleId] || [];
            const updateCommentId = (comments: Comment[]): Comment[] =>
              comments.map((c) => {
                if (c.id === tempId) return { ...c, id: data.id };
                if (c.replies) return { ...c, replies: updateCommentId(c.replies) };
                return c;
              });

            return { comments: { ...state.comments, [articleId]: updateCommentId(articleComments) } };
          });

          // Update user's comment count
          await supabase
            .from('users')
            .update({ comments_count: (user.commentsCount ?? 0) + 1 })
            .eq('id', user.id);
        } catch (error) {
          console.error('Error adding comment:', error);
        }
      },

      likeComment: async (articleId: string, commentId: string, userId?: string) => {
        set((state) => {
          const articleComments = state.comments[articleId] || [];
          const updateComment = (comment: Comment): Comment => {
            if (comment.id === commentId) {
              return { ...comment, isLiked: !comment.isLiked, likeCount: comment.likeCount + (comment.isLiked ? -1 : 1) };
            }
            if (comment.replies) {
              return { ...comment, replies: comment.replies.map(updateComment) };
            }
            return comment;
          };
          return { comments: { ...state.comments, [articleId]: articleComments.map(updateComment) } };
        });

        if (userId) {
          try {
            // Fetch current like_count then increment by 1 (avoids embedding a Promise in .update())
            const { data: commentRow } = await supabase
              .from('comments')
              .select('like_count')
              .eq('id', commentId)
              .single();
            const newLikeCount = (commentRow?.like_count ?? 0) + 1;
            await supabase
              .from('comments')
              .update({ like_count: newLikeCount })
              .eq('id', commentId);
          } catch (error) {
            console.error('Error liking comment:', error);
          }
        }
      },

      dislikeComment: async (articleId: string, commentId: string, userId?: string) => {
        set((state) => {
          const articleComments = state.comments[articleId] || [];
          const updateComment = (comment: Comment): Comment => {
            if (comment.id === commentId) {
              return { ...comment, isDisliked: !comment.isDisliked, dislikeCount: comment.dislikeCount + (comment.isDisliked ? -1 : 1) };
            }
            if (comment.replies) {
              return { ...comment, replies: comment.replies.map(updateComment) };
            }
            return comment;
          };
          return { comments: { ...state.comments, [articleId]: articleComments.map(updateComment) } };
        });
      },

      reshare: async (articleId: string, userId?: string, commentary: string | null = null) => {
        set((state) => {
          const interaction = state.interactions[articleId] || { ...createDefaultInteraction() };
          return {
            reshares: [
              {
                id: `reshare-${Date.now()}`,
                articleId,
                article: {} as never,
                userId: userId || 'current',
                user: {} as User,
                commentary,
                createdAt: new Date().toISOString(),
                isQuoteReshare: commentary !== null,
              },
              ...state.reshares,
            ],
            interactions: {
              ...state.interactions,
              [articleId]: { ...interaction, reshareCount: interaction.reshareCount + 1 },
            },
          };
        });

        if (userId) {
          try {
            await supabase.from('reshares').insert({
              article_id: articleId,
              user_id: userId,
              comment: commentary,
            });

            // Fetch current reshares_count then increment by 1 (avoids embedding a Promise in .update())
            const { data: userRow } = await supabase
              .from('users')
              .select('reshares_count')
              .eq('id', userId)
              .single();
            const newResharesCount = (userRow?.reshares_count ?? 0) + 1;
            await supabase
              .from('users')
              .update({ reshares_count: newResharesCount })
              .eq('id', userId);
          } catch (error) {
            console.error('Error resharing:', error);
          }
        }
      },

      toggleFollow: async (targetUserId: string, currentUserId?: string) => {
        const wasFollowing = get().following.has(targetUserId);
        const isAIBot = targetUserId.startsWith('ai-');

        // Optimistic update
        set((state) => {
          const newFollowing = new Set(state.following);
          if (newFollowing.has(targetUserId)) {
            newFollowing.delete(targetUserId);
          } else {
            newFollowing.add(targetUserId);
          }
          return { following: newFollowing };
        });

        if (currentUserId) {
          try {
            if (wasFollowing) {
              await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUserId)
                .eq('following_id', targetUserId);
            } else {
              await supabase.from('follows').insert({
                follower_id: currentUserId,
                following_id: targetUserId,
                is_ai_bot: isAIBot,
              });
            }
          } catch (error) {
            console.error('Error toggling follow:', error);
            // Revert on error
            set((state) => {
              const newFollowing = new Set(state.following);
              if (wasFollowing) {
                newFollowing.add(targetUserId);
              } else {
                newFollowing.delete(targetUserId);
              }
              return { following: newFollowing };
            });
          }
        }
      },

      fetchFollowing: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);

          if (error) throw error;

          const following = new Set<string>((data || []).map((f) => f.following_id));
          set({ following });
        } catch (error) {
          console.error('Error fetching following:', error);
        }
      },

      getInteraction: (articleId: string) => {
        return get().interactions[articleId] || { ...createDefaultInteraction() };
      },

      getComments: (articleId: string) => {
        return get().comments[articleId] || [];
      },

      isFollowing: (userId: string) => {
        return get().following.has(userId);
      },
    }),
    {
      name: 'nowcast-social',
      partialize: (state) => ({
        interactions: state.interactions,
        following: Array.from(state.following),
        followers: Array.from(state.followers),
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Record<string, unknown>),
        following: new Set((persisted as { following?: string[] })?.following || []),
        followers: new Set((persisted as { followers?: string[] })?.followers || []),
      }),
    }
  )
);
