import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../supabase';

export interface Story {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar: string;
  type: 'news' | 'user' | 'incident' | 'live';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  location?: string;
  category?: string;
  isLive?: boolean;
  viewerCount?: number;
  expiresAt: string;
  createdAt: string;
  views: number;
  reactions: {
    like: number;
    insightful: number;
    surprising: number;
    sad: number;
    outraged: number;
    important: number;
  };
}

export interface Incident {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar: string;
  title: string;
  description: string;
  type: 'accident' | 'emergency' | 'crime' | 'infrastructure' | 'weather' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  mediaUrls: string[];
  isVerified: boolean;
  upvotes: number;
  comments: number;
  createdAt: string;
  status: 'active' | 'resolved' | 'investigating';
}

interface StoriesState {
  stories: Story[];
  incidents: Incident[];
  liveStories: Story[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStories: () => Promise<void>;
  fetchLiveStories: () => Promise<void>;
  fetchIncidents: () => Promise<void>;
  createStory: (story: Omit<Story, 'id' | 'createdAt' | 'views' | 'reactions'>) => Promise<string | null>;
  createIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'isVerified' | 'upvotes' | 'comments' | 'status'>) => Promise<string | null>;
  viewStory: (storyId: string) => void;
  reactToStory: (storyId: string, reaction: keyof Story['reactions']) => void;
  upvoteIncident: (incidentId: string) => void;
}

export const useStoriesStore = create<StoriesState>()(
  persist(
    (set, get) => ({
      stories: [],
      incidents: [],
      liveStories: [],
      isLoading: false,
      error: null,

      fetchStories: async () => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            set({ stories: [], isLoading: false });
            return;
          }
          const { data, error } = await supabase.from('stories')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;

          const stories = (data || []).map(s => ({
            id: s.id,
            userId: s.user_id,
            userDisplayName: s.user_display_name,
            userAvatar: s.user_avatar,
            type: s.type as Story['type'],
            content: s.content,
            mediaUrl: s.media_url,
            mediaType: s.media_type as Story['mediaType'],
            location: s.location,
            category: s.category,
            isLive: s.is_live,
            viewerCount: s.viewer_count,
            expiresAt: s.expires_at,
            createdAt: s.created_at,
            views: s.views || 0,
            reactions: s.reactions || { like: 0, insightful: 0, surprising: 0, sad: 0, outraged: 0, important: 0 },
          }));
          
          set({ stories, isLoading: false });
        } catch (error) {
          console.error('Error fetching stories:', error);
          set({ stories: [], isLoading: false });
        }
      },

      fetchLiveStories: async () => {
        const { stories } = get();
        const liveStories = stories.filter(s => s.isLive);
        set({ liveStories });
      },

      fetchIncidents: async () => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            set({ incidents: [], isLoading: false });
            return;
          }
          const { data, error } = await supabase
            .from('incidents')
            .select('*')
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;

          const incidents = (data || []).map(i => ({
            id: i.id,
            userId: i.user_id,
            userDisplayName: i.user_display_name,
            userAvatar: i.user_avatar,
            title: i.title,
            description: i.description,
            type: i.type as Incident['type'],
            severity: i.severity as Incident['severity'],
            location: i.location,
            coordinates: i.coordinates,
            mediaUrls: i.media_urls || [],
            isVerified: i.is_verified,
            upvotes: i.upvotes || 0,
            comments: i.comments || 0,
            createdAt: i.created_at,
            status: i.status as Incident['status'],
          }));
          
          set({ incidents, isLoading: false });
        } catch (error) {
          console.error('Error fetching incidents:', error);
          set({ incidents: [], isLoading: false });
        }
      },

      createStory: async (storyData) => {
        set({ isLoading: true, error: null });
        try {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          
          const { data, error } = await supabase
            .from('stories')
            .insert({
              user_id: storyData.userId,
              user_display_name: storyData.userDisplayName,
              user_avatar: storyData.userAvatar,
              type: storyData.type,
              content: storyData.content,
              media_url: storyData.mediaUrl,
              media_type: storyData.mediaType,
              location: storyData.location,
              category: storyData.category,
              is_live: storyData.isLive || false,
              viewer_count: storyData.viewerCount || 0,
              expires_at: expiresAt,
              views: 0,
              reactions: { like: 0, insightful: 0, surprising: 0, sad: 0, outraged: 0, important: 0 },
            })
            .select()
            .single();

          if (error) throw error;
          
          const localStory: Story = {
            id: data.id,
            userId: data.user_id,
            userDisplayName: data.user_display_name,
            userAvatar: data.user_avatar,
            type: data.type,
            content: data.content,
            mediaUrl: data.media_url,
            mediaType: data.media_type,
            location: data.location,
            category: data.category,
            isLive: data.is_live,
            viewerCount: data.viewer_count,
            expiresAt: data.expires_at,
            createdAt: data.created_at,
            views: 0,
            reactions: { like: 0, insightful: 0, surprising: 0, sad: 0, outraged: 0, important: 0 },
          };
          
          set((state) => ({
            stories: [localStory, ...state.stories],
            isLoading: false,
          }));
          
          return data.id;
        } catch (error) {
          console.error('Error creating story:', error);
          set({ isLoading: false, error: 'Failed to create story' });
          return null;
        }
      },

      createIncident: async (incidentData) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('incidents')
            .insert({
              user_id: incidentData.userId,
              user_display_name: incidentData.userDisplayName,
              user_avatar: incidentData.userAvatar,
              title: incidentData.title,
              description: incidentData.description,
              type: incidentData.type,
              severity: incidentData.severity,
              location: incidentData.location,
              coordinates: incidentData.coordinates,
              media_urls: incidentData.mediaUrls,
              is_verified: false,
              upvotes: 0,
              comments: 0,
              status: 'active',
            })
            .select()
            .single();

          if (error) throw error;
          
          const localIncident: Incident = {
            id: data.id,
            userId: data.user_id,
            userDisplayName: data.user_display_name,
            userAvatar: data.user_avatar,
            title: data.title,
            description: data.description,
            type: data.type,
            severity: data.severity,
            location: data.location,
            coordinates: data.coordinates,
            mediaUrls: data.media_urls || [],
            isVerified: false,
            upvotes: 0,
            comments: 0,
            createdAt: data.created_at,
            status: 'active',
          };
          
          set((state) => ({
            incidents: [localIncident, ...state.incidents],
            isLoading: false,
          }));
          
          return data.id;
        } catch (error) {
          console.error('Error creating incident:', error);
          set({ isLoading: false, error: 'Failed to report incident' });
          return null;
        }
      },

      viewStory: (storyId) => {
        set((state) => ({
          stories: state.stories.map((story) =>
            story.id === storyId ? { ...story, views: story.views + 1 } : story
          ),
        }));
        
        // Update in database
        supabase.rpc('increment_story_views', { story_id: storyId }).catch(console.error);
      },

      reactToStory: (storyId, reaction) => {
        const { stories } = get();
        const story = stories.find(s => s.id === storyId);
        if (!story) return;

        const newReactions = {
          ...story.reactions,
          [reaction]: story.reactions[reaction] + 1,
        };

        set((state) => ({
          stories: state.stories.map((s) =>
            s.id === storyId ? { ...s, reactions: newReactions } : s
          ),
        }));

        // Update in database
        supabase
          ?.from('stories')
          .update({ reactions: newReactions })
          .eq('id', storyId)
          .then(() => {})
          .catch(console.error);
      },

      upvoteIncident: (incidentId) => {
        set((state) => ({
          incidents: state.incidents.map((incident) =>
            incident.id === incidentId
              ? { ...incident, upvotes: incident.upvotes + 1 }
              : incident
          ),
        }));

        // Update in database
        supabase.rpc('increment_incident_upvotes', { incident_id: incidentId }).catch(console.error);
      },
    }),
    {
      name: 'nowcast-stories',
      partialize: (state) => ({
        stories: state.stories.slice(0, 10),
        incidents: state.incidents.slice(0, 10),
      }),
    }
  )
);
