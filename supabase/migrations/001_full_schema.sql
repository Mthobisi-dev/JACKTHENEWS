-- ============================================================
-- JACKTHENEWS — Full Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/iqkhvmjzulpktxkvsolx/sql
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  display_name text not null,
  role text not null default 'user' check (role in ('super_admin','admin','moderator','verified_contributor','user','guest')),
  status text not null default 'active' check (status in ('active','suspended')),
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  website text,
  country text default 'US',
  country_flag text,
  is_verified boolean default false,
  is_ai_bot boolean default false,
  topics text[] default '{}',
  articles_read integer default 0,
  comments_count integer default 0,
  reshares_count integer default 0,
  followers_count integer default 0,
  following_count integer default 0,
  hide_online_status boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view all profiles" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users
  for each row execute procedure update_updated_at_column();

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;
create policy "Anyone can view follows" on public.follows for select using (true);
create policy "Users can follow/unfollow" on public.follows for all using (auth.uid() = follower_id);

-- ============================================================
-- REACTIONS (Likes on articles)
-- ============================================================
create table if not exists public.reactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  article_id text not null,
  reaction_type text not null default 'like' check (reaction_type in ('like','love','fire','sad','angry','wow')),
  created_at timestamptz default now(),
  unique(user_id, article_id)
);

alter table public.reactions enable row level security;
create policy "Anyone can view reactions" on public.reactions for select using (true);
create policy "Users can manage own reactions" on public.reactions for all using (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  article_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  likes integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.comments enable row level security;
create policy "Anyone can view comments" on public.comments for select using (true);
create policy "Users can insert own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments
  for each row execute procedure update_updated_at_column();

-- ============================================================
-- COMMENT LIKES
-- ============================================================
create table if not exists public.comment_likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, comment_id)
);

alter table public.comment_likes enable row level security;
create policy "Anyone can view comment_likes" on public.comment_likes for select using (true);
create policy "Users can manage own comment_likes" on public.comment_likes for all using (auth.uid() = user_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
create table if not exists public.bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  article_id text not null,
  created_at timestamptz default now(),
  unique(user_id, article_id)
);

alter table public.bookmarks enable row level security;
create policy "Users can view own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users can manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id);

-- ============================================================
-- RESHARES
-- ============================================================
create table if not exists public.reshares (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  article_id text not null,
  commentary text,
  created_at timestamptz default now(),
  unique(user_id, article_id)
);

alter table public.reshares enable row level security;
create policy "Anyone can view reshares" on public.reshares for select using (true);
create policy "Users can manage own reshares" on public.reshares for all using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('like','comment','reply','follow','reshare','mention','breaking','system')),
  title text,
  message text not null,
  from_user_id uuid references public.users(id) on delete set null,
  article_id text,
  comment_id uuid references public.comments(id) on delete set null,
  is_read boolean default false,
  is_ai_recommendation boolean default false,
  reason text,
  relevance_score float,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Service can insert notifications" on public.notifications for insert with check (true);

-- ============================================================
-- COMMUNITY ROOMS
-- ============================================================
create table if not exists public.community_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  icon text,
  cover_url text,
  member_count integer default 0,
  is_private boolean default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.community_rooms enable row level security;
create policy "Anyone can view rooms" on public.community_rooms for select using (true);
create policy "Authenticated users can create rooms" on public.community_rooms for insert with check (auth.uid() is not null);

-- Room memberships
create table if not exists public.room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

alter table public.room_members enable row level security;
create policy "Anyone can view memberships" on public.room_members for select using (true);
create policy "Users can join/leave rooms" on public.room_members for all using (auth.uid() = user_id);

-- ============================================================
-- COMMUNITY MESSAGES
-- ============================================================
create table if not exists public.community_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  reactions jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.community_messages enable row level security;
create policy "Anyone can view community messages" on public.community_messages for select using (true);
create policy "Authenticated users can send messages" on public.community_messages for insert with check (auth.uid() = user_id);
create policy "Users can update own messages" on public.community_messages for update using (auth.uid() = user_id);

-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean default false,
  group_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

create table if not exists public.conversation_participants (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  unread_count integer default 0,
  created_at timestamptz default now(),
  unique(conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create table if not exists public.direct_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  article_id text,
  is_read boolean default false,
  reaction text,
  created_at timestamptz default now()
);

alter table public.direct_messages enable row level security;

-- RLS: users can only see conversations they participate in
create policy "Participants can view their conversations" on public.conversations
  for select using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
  );
create policy "Participants can view their participants" on public.conversation_participants
  for select using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
  );
create policy "Users can manage own participation" on public.conversation_participants
  for all using (auth.uid() = user_id);
create policy "Participants can view messages" on public.direct_messages
  for select using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
  );
create policy "Users can send messages" on public.direct_messages
  for insert with check (auth.uid() = sender_id);

-- ============================================================
-- STORIES
-- ============================================================
create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'user' check (type in ('live','news','user','incident')),
  content text not null,
  media_url text,
  media_type text check (media_type in ('image','video')),
  category text,
  location text,
  is_live boolean default false,
  viewer_count integer default 0,
  views integer default 0,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

alter table public.stories enable row level security;
create policy "Anyone can view active stories" on public.stories for select using (expires_at > now());
create policy "Users can manage own stories" on public.stories for all using (auth.uid() = user_id);

-- ============================================================
-- SEED: Default community rooms
-- ============================================================
insert into public.community_rooms (name, description, icon, member_count) values
  ('Tech Talk', 'Discussing the latest in technology, AI, and innovation', '💻', 0),
  ('World News', 'Global news and international affairs', '🌍', 0),
  ('Sports Hub', 'Sports news and live game discussions', '⚽', 0),
  ('Business & Markets', 'Finance, economy, and market updates', '📈', 0),
  ('Science & Health', 'Medical breakthroughs and scientific discoveries', '🔬', 0)
on conflict do nothing;

-- ============================================================
-- FUNCTION: get article interaction counts (called per article)
-- ============================================================
create or replace function get_article_counts(p_article_id text, p_user_id uuid default null)
returns json language plpgsql security definer as $$
declare
  v_like_count integer;
  v_comment_count integer;
  v_reshare_count integer;
  v_is_liked boolean;
  v_is_bookmarked boolean;
  v_reaction text;
begin
  select count(*) into v_like_count from public.reactions where article_id = p_article_id;
  select count(*) into v_comment_count from public.comments where article_id = p_article_id and parent_id is null;
  select count(*) into v_reshare_count from public.reshares where article_id = p_article_id;

  if p_user_id is not null then
    select exists(select 1 from public.reactions where article_id = p_article_id and user_id = p_user_id) into v_is_liked;
    select exists(select 1 from public.bookmarks where article_id = p_article_id and user_id = p_user_id) into v_is_bookmarked;
    select reaction_type into v_reaction from public.reactions where article_id = p_article_id and user_id = p_user_id;
  else
    v_is_liked := false;
    v_is_bookmarked := false;
    v_reaction := null;
  end if;

  return json_build_object(
    'likeCount', v_like_count,
    'commentCount', v_comment_count,
    'reshareCount', v_reshare_count,
    'isLiked', v_is_liked,
    'isBookmarked', v_is_bookmarked,
    'reaction', v_reaction
  );
end;
$$;
