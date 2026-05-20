import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create client with the credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export a getter function to safely access the client
export const getSupabase = (): SupabaseClient => supabase;

// Database types
export interface DbUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  country: string | null;
  country_flag: string | null;
  is_verified: boolean;
  is_ai_bot: boolean;
  topics: string[];
  articles_read: number;
  comments_count: number;
  reshares_count: number;
  followers_count: number;
  following_count: number;
  hide_online_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFollow {
  id: string;
  follower_id: string;
  following_id: string;
  is_ai_bot: boolean;
  created_at: string;
}

export interface DbConversation {
  id: string;
  is_group: boolean;
  group_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  unread_count: number;
  created_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface DbStory {
  id: string;
  user_id: string;
  type: 'live' | 'news' | 'user';
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  category: string | null;
  location: string | null;
  is_live: boolean;
  viewer_count: number;
  views: number;
  expires_at: string;
  created_at: string;
}

export interface DbIncident {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: 'accident' | 'crime' | 'fire' | 'weather' | 'infrastructure' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  latitude: number | null;
  longitude: number | null;
  media_urls: string[];
  is_verified: boolean;
  upvotes: number;
  comments_count: number;
  status: 'active' | 'investigating' | 'resolved';
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  message: string;
  from_user_id: string | null;
  article_id: string | null;
  is_read: boolean;
  is_ai_recommendation: boolean;
  reason: string | null;
  relevance_score: number | null;
  created_at: string;
}

export interface DbComment {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes: number;
  created_at: string;
}

export interface DbReaction {
  id: string;
  user_id: string;
  article_id: string;
  reaction_type: string;
  created_at: string;
}

export interface DbBookmark {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
}

export interface DbReshare {
  id: string;
  user_id: string;
  article_id: string;
  comment: string | null;
  created_at: string;
}

export interface DbCommunityRoom {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  member_count: number;
  is_private: boolean;
  created_at: string;
}

export interface DbCommunityMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  reactions: Record<string, number>;
  created_at: string;
}

export interface DbUserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  push_notifications: boolean;
  email_notifications: boolean;
  breaking_news_alerts: boolean;
  personalized_news: boolean;
  hide_online_status: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}
