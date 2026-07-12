import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const requestedNext = requestUrl.searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?message=Missing%20authentication%20code', requestUrl.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const message = error?.message || 'Unable to complete sign in';
    console.error('[v0] Auth callback error:', message);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(message)}`, requestUrl.origin),
    );
  }

  const metadata = data.user.user_metadata;
  const usernameBase =
    metadata.username ||
    metadata.preferred_username ||
    data.user.email?.split('@')[0] ||
    `user_${data.user.id.slice(0, 8)}`;

  const { error: profileError } = await supabase.from('users').upsert(
    {
      id: data.user.id,
      email: data.user.email || '',
      username: String(usernameBase).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      display_name: metadata.full_name || metadata.name || usernameBase,
      avatar_url:
        metadata.avatar_url ||
        metadata.picture ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
      country: metadata.country || 'US',
      country_flag: metadata.country_flag || null,
      topics: metadata.topics || ['technology', 'world'],
    },
    { onConflict: 'id', ignoreDuplicates: false },
  );

  if (profileError) {
    console.error('[v0] Profile sync error:', profileError.message);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
