'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Users, MessageCircle, ChevronRight, ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Category } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'AI-Powered Understanding',
    description: 'Get instant explanations written like a brilliant friend explaining over coffee. Never robotic, always enlightening.',
  },
  {
    icon: Zap,
    title: 'Swipe Through the World',
    description: 'Discover news in a familiar TikTok-style feed. Swipe up for the next story, double-tap to react.',
  },
  {
    icon: Users,
    title: 'Join the Conversation',
    description: 'Comment, reshare, and connect with other readers. News is better when shared.',
  },
  {
    icon: MessageCircle,
    title: 'Send Stories to Friends',
    description: 'Share articles directly with friends on JACKTHENEWS. Start conversations around the stories that matter.',
  },
];

const interestCategories: Category[] = [
  'technology',
  'business',
  'science',
  'politics',
  'sports',
  'entertainment',
  'health',
  'world',
];

// Sample headlines for the swipe calibration
const sampleHeadlines = [
  { title: 'AI Breakthrough: New Model Achieves Human-Level Reasoning', category: 'technology' },
  { title: 'Global Climate Summit Reaches Historic Agreement', category: 'world' },
  { title: 'Tech Giants Report Record Quarterly Earnings', category: 'business' },
  { title: 'Scientists Discover New Species in Deep Ocean', category: 'science' },
  { title: 'Major Policy Shift Announced in Healthcare Reform', category: 'politics' },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<Category[]>([]);
  const [calibrationIndex, setCalibrationIndex] = useState(0);
  const [swipedHeadlines, setSwipedHeadlines] = useState<{ title: string; liked: boolean }[]>([]);

  const totalSteps = steps.length + 2; // steps + interests + calibration

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleInterest = (category: Category) => {
    setSelectedInterests((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSwipe = (liked: boolean) => {
    setSwipedHeadlines([...swipedHeadlines, { title: sampleHeadlines[calibrationIndex].title, liked }]);
    if (calibrationIndex < sampleHeadlines.length - 1) {
      setCalibrationIndex((prev) => prev + 1);
    } else {
      handleNext();
    }
  };

  const isInterestsStep = currentStep === steps.length;
  const isCalibrationStep = currentStep === steps.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 flex items-center gap-0.5 text-xl font-bold"
      >
        <span className="text-primary">JACK</span>
        <span className="text-foreground">THENEWS</span>
      </motion.div>

      <AnimatePresence mode="wait">
        {currentStep < steps.length ? (
          // Feature steps
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm text-center"
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-12">
              {[...Array(totalSteps)].map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index <= currentStep ? 'bg-primary w-8' : 'bg-secondary w-4'
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mb-8 flex justify-center"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20">
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="h-12 w-12 text-primary" />;
                })()}
              </div>
            </motion.div>

            {/* Content */}
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">
              {steps[currentStep].title}
            </h2>
            <p className="text-muted-foreground mb-12 leading-relaxed">
              {steps[currentStep].description}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1" size="lg">
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : isInterestsStep ? (
          // Interests selection
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm"
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {[...Array(totalSteps)].map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index <= currentStep ? 'bg-primary w-8' : 'bg-secondary w-4'
                  }`}
                />
              ))}
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
              What interests you?
            </h2>
            <p className="text-muted-foreground mb-8 text-center">
              Select at least 3 topics to personalize your feed
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {interestCategories.map((category) => (
                <motion.button
                  key={category}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleInterest(category)}
                >
                  <Badge
                    variant={selectedInterests.includes(category) ? 'default' : 'secondary'}
                    className="px-4 py-2 text-sm cursor-pointer transition-all"
                  >
                    {CATEGORY_LABELS[category]}
                  </Badge>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
                size="lg"
                disabled={selectedInterests.length < 3}
              >
                {selectedInterests.length < 3
                  ? `Select ${3 - selectedInterests.length} more`
                  : 'Continue'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          // Calibration step - swipe headlines
          <motion.div
            key="calibration"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm"
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {[...Array(totalSteps)].map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index <= currentStep ? 'bg-primary w-8' : 'bg-secondary w-4'
                  }`}
                />
              ))}
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
              Train your feed
            </h2>
            <p className="text-muted-foreground mb-6 text-center">
              Swipe on {sampleHeadlines.length} headlines to help us learn your preferences
            </p>

            {/* Headline card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={calibrationIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 rounded-2xl bg-card border border-border mb-8"
              >
                <Badge variant="secondary" className="mb-3">
                  {sampleHeadlines[calibrationIndex].category}
                </Badge>
                <p className="text-lg font-semibold text-foreground leading-snug">
                  {sampleHeadlines[calibrationIndex].title}
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  {calibrationIndex + 1} of {sampleHeadlines.length}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Swipe buttons */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSwipe(false)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <ThumbsDown className="h-6 w-6" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSwipe(true)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
              >
                <ThumbsUp className="h-6 w-6" />
              </motion.button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Not interested / Interested
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-sm text-muted-foreground"
      >
        Read it. Feel it. Share it.
      </motion.p>
    </div>
  );
}
