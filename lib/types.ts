// News Article Types
export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  keywords: string[] | null;
  creator: string[] | null;
  video_url: string | null;
  description: string | null;
  content: string | null;
  pubDate: string;
  pubDateTZ: string;
  image_url: string | null;
  source_id: string;
  source_name: string;
  source_url: string;
  source_icon: string | null;
  source_priority: number;
  country: string[];
  category: string[];
  language: string;
  ai_tag: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  sentiment_stats: string | null;
  ai_region: string | null;
  ai_org: string | null;
  duplicate: boolean;
  // Social engagement counts
  likeCount?: number;
  commentCount?: number;
  reshareCount?: number;
  // User interaction state
  isLiked?: boolean;
  isBookmarked?: boolean;
  userReaction?: ReactionType | null;
}

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  results: NewsArticle[];
  nextPage: string | null;
}

export type Category = 
  | 'top'
  | 'world'
  | 'politics'
  | 'business'
  | 'technology'
  | 'entertainment'
  | 'sports'
  | 'science'
  | 'health'
  | 'culture';

export const CATEGORY_COLORS: Record<Category, string> = {
  top: 'bg-orange-500',
  world: 'bg-orange-400',
  politics: 'bg-red-600',
  business: 'bg-amber-400',
  technology: 'bg-blue-500',
  entertainment: 'bg-purple-500',
  sports: 'bg-lime-500',
  science: 'bg-teal-500',
  health: 'bg-rose-500',
  culture: 'bg-purple-500',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Top Stories',
  world: 'World',
  politics: 'Politics',
  business: 'Business',
  technology: 'Technology',
  entertainment: 'Entertainment',
  sports: 'Sports',
  science: 'Science',
  health: 'Health',
  culture: 'Culture',
};

export interface BookmarkedArticle extends NewsArticle {
  bookmarkedAt: string;
}

// Reaction Types
export type ReactionType = 'like' | 'insightful' | 'surprising' | 'sad' | 'outraged' | 'important';

export const REACTIONS: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: '❤️', label: 'Like' },
  insightful: { emoji: '🔥', label: 'Insightful' },
  surprising: { emoji: '😮', label: 'Surprising' },
  sad: { emoji: '😢', label: 'Sad' },
  outraged: { emoji: '😡', label: 'Outraged' },
  important: { emoji: '👏', label: 'Important' },
};

// User Roles & Access Control
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'moderator'
  | 'verified_contributor'
  | 'user'
  | 'guest';

export type UserStatus = 'active' | 'suspended' | 'pending';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  moderator: 50,
  verified_contributor: 20,
  user: 10,
  guest: 0,
};

export function hasRoleAtLeast(userRole: UserRole | undefined | null, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole || 'guest'] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// Incident Workflow Status
export type IncidentStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'investigating'
  | 'resolved'
  | 'rejected';

// User Types
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  countryFlag?: string;
  location?: string | null;
  website?: string | null;
  isVerified?: boolean;
  isAIBot?: boolean;
  createdAt?: string;
  topics?: Category[];
  // Stats
  articlesRead?: number;
  commentsCount?: number;
  resharesCount?: number;
  followersCount?: number;
  followingCount?: number;
  // Relations
  isFollowing?: boolean;
  isFollowedBy?: boolean;
}

export interface UserPreferences {
  likedCategories: Category[];
  likedSources: string[];
  likedKeywords: string[];
  dislikedTopics: string[];
  sentimentPreference: 'positive' | 'negative' | 'neutral' | 'any';
  regionAffinity: string[];
  interactionHistory: InteractionEvent[];
}

export interface InteractionEvent {
  articleId: string;
  type: 'view' | 'like' | 'comment' | 'bookmark' | 'reshare' | 'dismiss';
  timestamp: string;
  duration?: number; // Time spent on article in seconds
}

// Comment Types
export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  parentId: string | null;
  replies?: Comment[];
  isFlagged?: boolean;
  flagReason?: string;
}

// Reshare Types
export interface Reshare {
  id: string;
  articleId: string;
  article: NewsArticle;
  userId: string;
  user: User;
  commentary: string | null;
  createdAt: string;
  isQuoteReshare: boolean;
}

// Direct Message Types
export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string | null;
  articleId: string | null;
  article: NewsArticle | null;
  createdAt: string;
  readAt: string | null;
  reaction: string | null;
}

export interface Conversation {
  id: string;
  participants: User[];
  participantIds?: string[];
  isGroup: boolean;
  groupName: string | null;
  lastMessage: DirectMessage | { content: string; senderId: string; createdAt: unknown } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export type NotificationType = 
  | 'like'
  | 'comment'
  | 'reply'
  | 'reshare'
  | 'follow'
  | 'mention'
  | 'message'
  | 'breaking'
  | 'briefing';

export interface Notification {
  id: string;
  type: NotificationType | 'system';
  title?: string;
  userId?: string;
  fromUser?: User | null;
  articleId?: string | null;
  article?: NewsArticle | null;
  commentId?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    isAIRecommendation?: boolean;
    reason?: string;
    relevanceScore?: number;
  };
}

// Community Space Types
export interface CommunitySpace {
  id: string;
  name: string;
  description: string;
  hashtag: string;
  iconUrl: string | null;
  coverUrl: string | null;
  memberCount: number;
  pinnedArticle: NewsArticle | null;
  createdAt: string;
  isJoined?: boolean;
}

// Auth Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  country?: string;
  topics?: Category[];
  avatarUrl?: string;
}

// AI Types
export interface AIExplanation {
  whatHappened: string;
  whoIsInvolved: string;
  whyItMatters: string;
  whatsNext: string;
  followUpQuestions: string[];
  relatedConcepts: string[];
  biasRating: number; // 0-100, 50 is neutral
  sentimentRating: number; // 0-100, 50 is neutral
}

export interface MorningBriefing {
  id: string;
  date: string;
  content: string;
  articles: NewsArticle[];
  createdAt: string;
}

// Feed Types
export interface FeedItem {
  type: 'article' | 'reshare';
  article: NewsArticle;
  reshare?: Reshare;
  relevanceScore?: number;
}
