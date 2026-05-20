'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNotificationStore } from '@/lib/stores/notification-store';

export function AppHeader() {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0.5 text-lg font-bold">
          <span className="text-primary">JACK</span>
          <span className="text-foreground">THENEWS</span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link href="/notifications" className="relative p-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/profile">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {user?.displayName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <Button size="sm" onClick={() => openAuthModal('login')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
