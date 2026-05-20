'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Search, Users, Bell, User } from 'lucide-react';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useMessagesStore } from '@/lib/stores/messages-store';

const navItems = [
  { href: '/', icon: Home, label: 'Feed' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/community', icon: Users, label: 'Community' },
  { href: '/notifications', icon: Bell, label: 'Alerts', badgeKey: 'notifications' as const },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { unreadCount: notificationCount } = useNotificationStore();
  const { totalUnreadCount: messageCount } = useMessagesStore();

  const getBadgeCount = (key?: 'messages' | 'notifications') => {
    if (key === 'messages') return messageCount;
    if (key === 'notifications') return notificationCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badgeCount = getBadgeCount(item.badgeKey);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center py-2 px-3"
            >
              {isActive && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-2 h-0.5 w-6 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </motion.div>
                {badgeCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 pulse-badge"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </motion.span>
                )}
              </div>
              <span
                className={`mt-1 text-[10px] transition-colors ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
