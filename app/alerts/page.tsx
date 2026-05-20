'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  TrendingUp, 
  Newspaper, 
  MapPin,
  Clock,
  Check,
  Trash2,
  Settings,
  Filter,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: 'breaking' | 'trending' | 'local' | 'topic' | 'follow';
  title: string;
  message: string | null;
  category: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const alertIcons = {
  breaking: AlertTriangle,
  trending: TrendingUp,
  local: MapPin,
  topic: Newspaper,
  follow: Bell,
};

const alertColors = {
  breaking: 'text-red-500 bg-red-500/10',
  trending: 'text-orange-500 bg-orange-500/10',
  local: 'text-blue-500 bg-blue-500/10',
  topic: 'text-purple-500 bg-purple-500/10',
  follow: 'text-green-500 bg-green-500/10',
};

export default function AlertsPage() {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [settings, setSettings] = useState({
    breaking: true,
    trending: true,
    local: true,
    topics: true,
    follows: true,
  });

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Alerts table not found in schema cache');
          setAlerts([]);
        } else {
          throw error;
        }
      } else {
        setAlerts(data || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    if (!supabase) return;

    try {
      await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      setAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!supabase || !user) return;

    try {
      await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('user_id', user.id);

      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!supabase) return;

    try {
      await supabase.from('alerts').delete().eq('id', alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !alert.is_read;
    return alert.type === activeTab;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Alerts</h1>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bell className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Stay Updated</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Sign in to receive personalized alerts for breaking news, trending topics, and updates from people you follow.
          </p>
          <Button onClick={() => openAuthModal('signup')}>
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Alerts</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Alert Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Breaking News</p>
                      <p className="text-sm text-muted-foreground">Major news alerts</p>
                    </div>
                    <Switch 
                      checked={settings.breaking} 
                      onCheckedChange={(v) => setSettings(s => ({ ...s, breaking: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Trending Topics</p>
                      <p className="text-sm text-muted-foreground">Hot stories in your interests</p>
                    </div>
                    <Switch 
                      checked={settings.trending} 
                      onCheckedChange={(v) => setSettings(s => ({ ...s, trending: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Local News</p>
                      <p className="text-sm text-muted-foreground">News from your area</p>
                    </div>
                    <Switch 
                      checked={settings.local} 
                      onCheckedChange={(v) => setSettings(s => ({ ...s, local: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Topic Updates</p>
                      <p className="text-sm text-muted-foreground">Updates on followed topics</p>
                    </div>
                    <Switch 
                      checked={settings.topics} 
                      onCheckedChange={(v) => setSettings(s => ({ ...s, topics: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Follow Activity</p>
                      <p className="text-sm text-muted-foreground">When people you follow post</p>
                    </div>
                    <Switch 
                      checked={settings.follows} 
                      onCheckedChange={(v) => setSettings(s => ({ ...s, follows: v }))}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
            <TabsTrigger value="breaking" className="text-xs">Breaking</TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No alerts yet</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'unread' 
                ? "You're all caught up!" 
                : "We'll notify you when something important happens"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredAlerts.map((alert, index) => {
              const Icon = alertIcons[alert.type] || Bell;
              const colorClass = alertColors[alert.type] || 'text-muted-foreground bg-muted';
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !alert.is_read ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${!alert.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {alert.title}
                            </p>
                            {alert.message && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                {alert.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                              </span>
                              {alert.category && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  {alert.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!alert.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAlert(alert.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
