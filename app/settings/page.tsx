'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Globe,
  Shield,
  Sparkles,
  Zap,
  Users,
  Volume2,
  Play,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Check,
  Loader2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { setTheme: setNextTheme, theme: currentTheme, resolvedTheme } = useTheme();
  const { user, isAuthenticated, logout, openAuthModal, deleteAccount, isLoading: authLoading } = useAuthStore();
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const {
    theme,
    setTheme,
    hideOnlineStatus,
    hideReadingActivity,
    pushNotifications,
    emailNotifications,
    aiRecommendations,
    breakingNews,
    communityAlerts,
    autoplayVideos,
    toggleOnlineStatus,
    toggleReadingActivity,
    togglePushNotifications,
    toggleEmailNotifications,
    toggleAIRecommendations,
    toggleBreakingNews,
    toggleCommunityAlerts,
    toggleAutoplayVideos,
    language,
    setLanguage,
    syncToFirebase,
    loadFromFirebase,
    isSyncing,
  } = useSettingsStore();

  // Handle mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load settings from Firebase when user logs in
  useEffect(() => {
    if (user?.id) {
      loadFromFirebase(user.id);
    }
  }, [user?.id, loadFromFirebase]);

  // Sync theme changes with next-themes
  useEffect(() => {
    if (mounted) {
      setNextTheme(theme);
    }
  }, [theme, setNextTheme, mounted]);

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    if (user?.id) {
      syncToFirebase(user.id);
    }
  };

  const handleSettingToggle = (toggleFn: () => void) => {
    toggleFn();
    // Sync immediately for fast feedback
    if (user?.id) {
      syncToFirebase(user.id);
    }
  };

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    setShowLanguageDialog(false);
    toast.success(`Language changed to ${LANGUAGES.find(l => l.code === langCode)?.name}`);
    if (user?.id) {
      syncToFirebase(user.id);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    const success = await deleteAccount();
    if (success) {
      setShowDeleteDialog(false);
      toast.success('Your account has been deleted');
      router.push('/');
    } else {
      toast.error('Failed to delete account. Please try again.');
    }
  };

  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          {isSyncing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Theme Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3">APPEARANCE</h2>
          <div className="rounded-xl bg-card overflow-hidden">
            <div className="p-4">
              <p className="text-sm font-medium mb-3">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    theme === 'light'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs">Light</span>
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs">Dark</span>
                </button>
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    theme === 'system'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Monitor className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs">System</span>
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Privacy Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3">PRIVACY</h2>
          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {hideOnlineStatus ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">Hide Online Status</p>
                  <p className="text-xs text-muted-foreground">Others won&apos;t see when you&apos;re active</p>
                </div>
              </div>
              <Switch 
                checked={hideOnlineStatus} 
                onCheckedChange={() => handleSettingToggle(toggleOnlineStatus)} 
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hide Reading Activity</p>
                  <p className="text-xs text-muted-foreground">Don&apos;t show what articles you read</p>
                </div>
              </div>
              <Switch 
                checked={hideReadingActivity} 
                onCheckedChange={() => handleSettingToggle(toggleReadingActivity)} 
              />
            </div>
          </div>
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3">NOTIFICATIONS</h2>
          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {pushNotifications ? (
                  <Bell className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive notifications on your device</p>
                </div>
              </div>
              <Switch 
                checked={pushNotifications} 
                onCheckedChange={() => handleSettingToggle(togglePushNotifications)} 
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">AI Recommendations</p>
                  <p className="text-xs text-muted-foreground">Get personalized news suggestions</p>
                </div>
              </div>
              <Switch 
                checked={aiRecommendations} 
                onCheckedChange={() => handleSettingToggle(toggleAIRecommendations)} 
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Breaking News</p>
                  <p className="text-xs text-muted-foreground">Alerts for major news events</p>
                </div>
              </div>
              <Switch 
                checked={breakingNews} 
                onCheckedChange={() => handleSettingToggle(toggleBreakingNews)} 
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Community Alerts</p>
                  <p className="text-xs text-muted-foreground">Local incidents and updates</p>
                </div>
              </div>
              <Switch 
                checked={communityAlerts} 
                onCheckedChange={() => handleSettingToggle(toggleCommunityAlerts)} 
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Daily digest and important updates</p>
                </div>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={() => handleSettingToggle(toggleEmailNotifications)} 
              />
            </div>
          </div>
        </motion.section>

        {/* Content Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3">CONTENT</h2>
          <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Play className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Autoplay Videos</p>
                  <p className="text-xs text-muted-foreground">Videos play automatically in feed</p>
                </div>
              </div>
              <Switch 
                checked={autoplayVideos} 
                onCheckedChange={() => handleSettingToggle(toggleAutoplayVideos)} 
              />
            </div>
            <button 
              onClick={() => setShowLanguageDialog(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Language</p>
                  <p className="text-xs text-muted-foreground">Content and interface language</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currentLanguage.flag} {currentLanguage.name}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          </div>
        </motion.section>

        {/* Account Section */}
        {isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3">ACCOUNT</h2>
            <div className="rounded-xl bg-card overflow-hidden divide-y divide-border">
              <button 
                onClick={() => setShowDeleteDialog(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-destructive">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete your account</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <Button
              variant="destructive"
              className="w-full mt-4"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </motion.section>
        )}

        {!isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">Log in to sync your settings across devices</p>
              <Button onClick={() => openAuthModal('login')}>Log In</Button>
            </div>
          </motion.section>
        )}

        {/* Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground pt-4"
        >
          JACKTHENEWS v1.0.0
        </motion.p>
      </div>

      {/* Language Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Language</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  language === lang.code
                    ? 'bg-primary/10 border border-primary'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </div>
                {language === lang.code && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This action cannot be undone. 
              All your data, including your profile, comments, bookmarks, and settings will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
      <AuthModal />
    </main>
  );
}
