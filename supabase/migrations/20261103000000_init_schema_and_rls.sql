-- ==============================================================================
-- JACKTHENEWS: Production Database Schema & Row Level Security (RLS)
-- Migration: 20261103000000_init_schema_and_rls.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- Custom ENUM Types
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin',
        'admin',
        'moderator',
        'verified_contributor',
        'user',
        'guest'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_type AS ENUM (
        'accident',
        'crime',
        'fire',
        'weather',
        'infrastructure',
        'emergency',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'submitted',
        'under_review',
        'verified',
        'investigating',
        'resolved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    cover_url TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    country TEXT DEFAULT 'US',
    country_flag TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_ai_bot BOOLEAN NOT NULL DEFAULT false,
    topics TEXT[] NOT NULL DEFAULT ARRAY['technology', 'world']::TEXT[],
    articles_read INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    reshares_count INTEGER NOT NULL DEFAULT 0,
    followers_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    hide_online_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. USER SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system',
    push_notifications BOOLEAN NOT NULL DEFAULT true,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    breaking_news_alerts BOOLEAN NOT NULL DEFAULT true,
    personalized_news BOOLEAN NOT NULL DEFAULT true,
    hide_online_status BOOLEAN NOT NULL DEFAULT false,
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_settings_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

-- ------------------------------------------------------------------------------
-- 3. ARTICLES CACHE / INGESTION TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT,
    content TEXT,
    keywords TEXT[],
    creator TEXT[],
    image_url TEXT,
    source_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    source_icon TEXT,
    country TEXT[],
    category TEXT[] NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    pub_date TIMESTAMPTZ NOT NULL,
    ai_tag TEXT,
    sentiment TEXT,
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    reshare_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON public.articles(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON public.articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_article_id ON public.articles(article_id);

-- ------------------------------------------------------------------------------
-- 4. COMMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_comments_article ON public.comments(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);

-- ------------------------------------------------------------------------------
-- 5. REACTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_article_reaction UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_article ON public.reactions(article_id);

-- ------------------------------------------------------------------------------
-- 6. BOOKMARKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_article_bookmark UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. RESHARES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reshares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reshares_user ON public.reshares(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reshares_article ON public.reshares(article_id);

-- ------------------------------------------------------------------------------
-- 8. FOLLOWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_follow_pair UNIQUE (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ------------------------------------------------------------------------------
-- 9. STORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'user',
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    category TEXT,
    location TEXT,
    is_live BOOLEAN NOT NULL DEFAULT false,
    viewer_count INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories(expires_at DESC);

-- ------------------------------------------------------------------------------
-- 10. INCIDENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type incident_type NOT NULL DEFAULT 'other',
    severity incident_severity NOT NULL DEFAULT 'medium',
    status incident_status NOT NULL DEFAULT 'submitted',
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    media_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_verified BOOLEAN NOT NULL DEFAULT false,
    upvotes INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    moderation_notes TEXT,
    moderated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON public.incidents(location);

-- ------------------------------------------------------------------------------
-- 11. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    article_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_ai_recommendation BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    relevance_score NUMERIC(3, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;

-- ------------------------------------------------------------------------------
-- 12. CONVERSATIONS & DIRECT MESSAGES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_group BOOLEAN NOT NULL DEFAULT false,
    group_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_conv_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    article_context JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 13. COMMUNITY ROOMS & CHAT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    icon TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    is_official BOOLEAN NOT NULL DEFAULT false,
    is_private BOOLEAN NOT NULL DEFAULT false,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.community_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.community_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    media_url TEXT,
    reactions JSONB NOT NULL DEFAULT '{"like": 0, "heart": 0}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_messages_room ON public.community_messages(room_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 14. ADMIN AUDIT LOGS & SYSTEM METRICS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);

CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    tags JSONB NOT NULL DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reshares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. USERS POLICIES
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile, except role and status" 
    ON public.users FOR UPDATE USING (
        auth.uid() = id OR public.current_user_role() IN ('admin', 'super_admin')
    ) WITH CHECK (
        (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()) AND status = (SELECT status FROM public.users WHERE id = auth.uid()))
        OR public.current_user_role() IN ('admin', 'super_admin')
    );

-- 2. USER SETTINGS POLICIES
CREATE POLICY "Users can view their own settings" 
    ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can modify their own settings" 
    ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- 3. ARTICLES POLICIES
CREATE POLICY "Articles are readable by everyone" 
    ON public.articles FOR SELECT USING (true);

CREATE POLICY "Authenticated users or admins can manage articles" 
    ON public.articles FOR ALL USING (
        public.current_user_role() IN ('admin', 'super_admin', 'moderator')
    );

-- 4. COMMENTS POLICIES
CREATE POLICY "Comments are viewable by everyone" 
    ON public.comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" 
    ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
    ON public.comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users or moderators can delete comments" 
    ON public.comments FOR DELETE USING (
        auth.uid() = user_id OR public.current_user_role() IN ('admin', 'super_admin', 'moderator')
    );

-- 5. REACTIONS POLICIES
CREATE POLICY "Reactions are viewable by everyone" 
    ON public.reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage their own reactions" 
    ON public.reactions FOR ALL USING (auth.uid() = user_id);

-- 6. BOOKMARKS POLICIES
CREATE POLICY "Users can only view their own bookmarks" 
    ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bookmarks" 
    ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- 7. RESHARES POLICIES
CREATE POLICY "Reshares are viewable by everyone" 
    ON public.reshares FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reshares" 
    ON public.reshares FOR ALL USING (auth.uid() = user_id);

-- 8. FOLLOWS POLICIES
CREATE POLICY "Follows are viewable by everyone" 
    ON public.follows FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" 
    ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- 9. STORIES POLICIES
CREATE POLICY "Stories are viewable by everyone" 
    ON public.stories FOR SELECT USING (true);

CREATE POLICY "Users can manage their own stories" 
    ON public.stories FOR ALL USING (
        auth.uid() = user_id OR public.current_user_role() IN ('admin', 'super_admin', 'moderator')
    );

-- 10. INCIDENTS POLICIES
-- Verified or active incidents can be read publicly. Unverified/under-review incidents can only be seen by author or moderators/admins.
CREATE POLICY "Public incidents are viewable" 
    ON public.incidents FOR SELECT USING (
        status IN ('verified', 'investigating', 'resolved')
        OR auth.uid() = user_id
        OR public.current_user_role() IN ('admin', 'super_admin', 'moderator')
    );

CREATE POLICY "Authenticated users can submit incidents" 
    ON public.incidents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors or moderators can update incidents" 
    ON public.incidents FOR UPDATE USING (
        (auth.uid() = user_id AND status = 'submitted')
        OR public.current_user_role() IN ('admin', 'super_admin', 'moderator')
    );

-- 11. NOTIFICATIONS POLICIES
CREATE POLICY "Notifications are private to the recipient" 
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 12. CONVERSATIONS & MESSAGES
CREATE POLICY "Conversation participants can view conversations" 
    ON public.conversations FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can view conversation messages" 
    ON public.messages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" 
    ON public.messages FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
        )
    );

-- 13. COMMUNITY ROOMS & MESSAGES
CREATE POLICY "Community rooms are readable by all" 
    ON public.community_rooms FOR SELECT USING (true);

CREATE POLICY "Community messages are readable by all" 
    ON public.community_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post to community rooms" 
    ON public.community_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 14. ADMIN AUDIT LOGS & METRICS
CREATE POLICY "Admins can view audit logs" 
    ON public.admin_audit_logs FOR SELECT USING (
        public.current_user_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "Admins can insert audit logs" 
    ON public.admin_audit_logs FOR INSERT WITH CHECK (
        public.current_user_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "Admins can view system metrics" 
    ON public.system_metrics FOR SELECT USING (
        public.current_user_role() IN ('admin', 'super_admin')
    );
