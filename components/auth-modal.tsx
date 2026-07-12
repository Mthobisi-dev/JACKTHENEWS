'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff, Mail, Lock, User, AtSign, Globe, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Category } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

export function AuthModal() {
  const {
    showAuthModal,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    signup,
    loginWithGoogle,
    resetPassword,
    isLoading,
    error,
  } = useAuthStore();

  return (
    <Dialog open={showAuthModal} onOpenChange={closeAuthModal}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {authModalMode === 'login' && (
            <LoginForm 
              key="login" 
              onSwitchMode={setAuthModalMode} 
              onSubmit={login}
              onGoogleLogin={loginWithGoogle}
              isLoading={isLoading}
              error={error}
            />
          )}
          {authModalMode === 'signup' && (
            <SignupForm 
              key="signup" 
              onSwitchMode={setAuthModalMode} 
              onSubmit={signup}
              isLoading={isLoading}
              error={error}
            />
          )}
          {authModalMode === 'forgot' && (
            <ForgotPasswordForm 
              key="forgot" 
              onSwitchMode={setAuthModalMode}
              onResetPassword={resetPassword}
              isLoading={isLoading}
              error={error}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

interface LoginFormProps {
  onSwitchMode: (mode: 'login' | 'signup' | 'forgot') => void;
  onSubmit: (email: string, password: string) => Promise<boolean>;
  onGoogleLogin: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

function LoginForm({ onSwitchMode, onSubmit, onGoogleLogin, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-6"
    >
      <DialogHeader className="mb-6">
        <div className="flex items-center justify-center gap-1 text-2xl font-bold mb-2">
          <span className="text-primary">JACK</span>
          <span>THENEWS</span>
        </div>
        <DialogTitle className="text-center text-muted-foreground font-normal">
          Welcome back
        </DialogTitle>
        <DialogDescription className="sr-only">
          Log in to your JACKTHENEWS account
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => onSwitchMode('forgot')}
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Spinner className="h-4 w-4" /> : 'Log In'}
        </Button>

        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
            or continue with
          </span>
        </div>

        <Button 
          variant="outline" 
          type="button" 
          className="w-full gap-2"
          onClick={onGoogleLogin}
          disabled={isLoading}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {"Don't have an account? "}
        <button
          onClick={() => onSwitchMode('signup')}
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </button>
      </p>
    </motion.div>
  );
}

interface SignupFormProps {
  onSwitchMode: (mode: 'login' | 'signup' | 'forgot') => void;
  onSubmit: (data: any) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

function SignupForm({ onSwitchMode, onSubmit, isLoading, error }: SignupFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    country: 'US',
    topics: [] as Category[],
  });
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    const succeeded = await onSubmit(formData);
    if (succeeded) {
      setStep(3);
    }
  };

  const toggleTopic = (topic: Category) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  if (step === 3) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 p-8 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <DialogTitle>Check your email</DialogTitle>
          <DialogDescription className="text-pretty">
            We sent a verification link to {formData.email}. Open it to activate your account, then sign in.
          </DialogDescription>
        </div>
        <Button className="w-full" onClick={() => onSwitchMode('login')}>
          Back to sign in
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <DialogHeader className="mb-6">
        <div className="flex items-center justify-center gap-1 text-2xl font-bold mb-2">
          <span className="text-primary">JACK</span>
          <span>THENEWS</span>
        </div>
        <DialogTitle className="text-center text-muted-foreground font-normal">
          {step === 1 ? 'Join the conversation' : 'Choose your interests'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Create a new JACKTHENEWS account
        </DialogDescription>
      </DialogHeader>

      {/* Progress indicators */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 w-12 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="Your name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="yourhandle"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signupEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupPassword">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signupPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.level
                            ? passwordStrength.color
                            : 'bg-secondary'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NG">Nigeria</option>
                  <option value="KE">Kenya</option>
                  <option value="ZA">South Africa</option>
                  <option value="IN">India</option>
                  <option value="JP">Japan</option>
                  <option value="BR">Brazil</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Select at least 3 topics you&apos;re interested in
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTopic(key)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    formData.topics.includes(key)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">{label}</span>
                  {formData.topics.includes(key) && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {step === 2 && (
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading || (step === 2 && formData.topics.length < 3)}
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : step === 1 ? 'Continue' : 'Create Account'}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <button
          onClick={() => onSwitchMode('login')}
          className="text-primary hover:underline font-medium"
        >
          Log in
        </button>
      </p>
    </motion.div>
  );
}

interface ForgotPasswordFormProps {
  onSwitchMode: (mode: 'login' | 'signup' | 'forgot') => void;
  onResetPassword: (email: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

function ForgotPasswordForm({ onSwitchMode, onResetPassword, isLoading, error }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onResetPassword(email);
    if (success) {
      setSent(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <DialogHeader className="mb-6">
        <DialogTitle className="text-center">Reset your password</DialogTitle>
        <DialogDescription className="sr-only">
          Reset your JACKTHENEWS account password
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center mb-4">
          {error}
        </div>
      )}

      {sent ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <p className="text-muted-foreground">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <Button onClick={() => onSwitchMode('login')} className="w-full">
            Back to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          <div className="space-y-2">
            <Label htmlFor="resetEmail">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="resetEmail"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Spinner className="h-4 w-4" /> : 'Send reset link'}
          </Button>
        </form>
      )}

      {!sent && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{' '}
          <button
            onClick={() => onSwitchMode('login')}
            className="text-primary hover:underline font-medium"
          >
            Log in
          </button>
        </p>
      )}
    </motion.div>
  );
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
  if (score === 2) return { level: 2, label: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-500' };
  if (score === 3) return { level: 3, label: 'Good', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
  return { level: 4, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-500' };
}
