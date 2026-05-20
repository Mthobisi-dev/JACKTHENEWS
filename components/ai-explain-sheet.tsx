'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Search,
  Users,
  Lightbulb,
  Telescope,
  MessageCircle,
  ArrowRight,
  Scale,
  Heart,
  Sparkles,
  Zap,
  GraduationCap,
} from 'lucide-react';
import type { NewsArticle } from '@/lib/types';

interface AIExplainSheetProps {
  article: NewsArticle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AIExplanation {
  whatHappened: string;
  whoIsInvolved: string;
  whyItMatters: string;
  whatsNext: string;
  followUpQuestions: string[];
  relatedConcepts: string[];
  biasRating: number;
  sentimentRating: number;
}

export function AIExplainSheet({ article, open, onOpenChange }: AIExplainSheetProps) {
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState<string>('');
  const [simplifyLevel, setSimplifyLevel] = useState<'normal' | 'eli10' | 'deeper'>('normal');

  useEffect(() => {
    if (open && !explanation) {
      generateExplanation();
    }
  }, [open]);

  const generateExplanation = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    setExplanation({
      whatHappened: generateWhatHappened(article),
      whoIsInvolved: generateWhoIsInvolved(article),
      whyItMatters: generateWhyItMatters(article),
      whatsNext: generateWhatsNext(article),
      followUpQuestions: [
        "What's the history behind this?",
        "How does this affect me?",
        "What do experts say?",
      ],
      relatedConcepts: generateRelatedConcepts(article),
      biasRating: Math.floor(Math.random() * 30) + 35, // 35-65 range (near neutral)
      sentimentRating: article.sentiment === 'positive' ? 70 : article.sentiment === 'negative' ? 30 : 50,
    });
    setIsLoading(false);
  };

  const handleFollowUp = async (question: string) => {
    setActiveFollowUp(question);
    setFollowUpAnswer('');
    
    // Simulate streaming response
    const answer = generateFollowUpAnswer(question, article);
    for (let i = 0; i <= answer.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      setFollowUpAnswer(answer.slice(0, i));
    }
  };

  const handleSimplify = async (level: 'eli10' | 'deeper') => {
    setSimplifyLevel(level);
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    if (explanation) {
      setExplanation({
        ...explanation,
        whatHappened: level === 'eli10' 
          ? generateELI10(article)
          : generateDeeperAnalysis(article),
      });
    }
    setIsLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            Deep AI Explain
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(85vh-100px)] py-4 space-y-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : explanation ? (
            <>
              {/* Main explanation sections */}
              <ExplanationSection
                icon={Search}
                title="What happened"
                content={explanation.whatHappened}
                color="text-blue-500"
              />
              
              <ExplanationSection
                icon={Users}
                title="Who's involved"
                content={explanation.whoIsInvolved}
                color="text-green-500"
              />
              
              <ExplanationSection
                icon={Lightbulb}
                title="Why it matters"
                content={explanation.whyItMatters}
                color="text-amber-500"
              />
              
              <ExplanationSection
                icon={Telescope}
                title="What's next"
                content={explanation.whatsNext}
                color="text-purple-500"
              />

              {/* Simplify buttons */}
              <div className="flex gap-2">
                <Button
                  variant={simplifyLevel === 'eli10' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSimplify('eli10')}
                  className="flex-1"
                >
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Explain like I&apos;m 10
                </Button>
                <Button
                  variant={simplifyLevel === 'deeper' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSimplify('deeper')}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Go deeper
                </Button>
              </div>

              {/* Bias & Sentiment meters */}
              <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Analysis Metrics
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Political Lean</span>
                      <span className="font-medium">
                        {explanation.biasRating < 40 ? 'Left-leaning' : 
                         explanation.biasRating > 60 ? 'Right-leaning' : 'Neutral'}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-500 via-gray-400 to-red-500">
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white border-2 border-foreground shadow-md"
                        style={{ left: `calc(${explanation.biasRating}% - 8px)` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Left</span>
                      <span>Center</span>
                      <span>Right</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Emotional Tone</span>
                      <span className="font-medium">
                        {explanation.sentimentRating < 40 ? 'Negative' : 
                         explanation.sentimentRating > 60 ? 'Positive' : 'Neutral'}
                      </span>
                    </div>
                    <Progress value={explanation.sentimentRating} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Negative</span>
                      <span>Positive</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-up questions */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Ask a follow-up
                </h3>
                <div className="flex flex-wrap gap-2">
                  {explanation.followUpQuestions.map((question) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      onClick={() => handleFollowUp(question)}
                      className="text-xs"
                    >
                      {question}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  ))}
                </div>

                <AnimatePresence>
                  {activeFollowUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                    >
                      <p className="text-sm font-medium text-primary mb-2">{activeFollowUp}</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {followUpAnswer}
                        {followUpAnswer.length > 0 && followUpAnswer.length < 200 && (
                          <span className="animate-pulse">|</span>
                        )}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Related concepts */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Related topics to explore
                </h3>
                <div className="flex flex-wrap gap-2">
                  {explanation.relatedConcepts.map((concept) => (
                    <Badge key={concept} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ExplanationSectionProps {
  icon: React.ElementType;
  title: string;
  content: string;
  color: string;
}

function ExplanationSection({ icon: Icon, title, content, color }: ExplanationSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <h3 className={`font-semibold flex items-center gap-2 ${color}`}>
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <p className="text-sm text-foreground/80 leading-relaxed">{content}</p>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Content generation functions
function generateWhatHappened(article: NewsArticle): string {
  return `${article.description || article.title}\n\nThis story is developing as ${article.source_name} reports on the situation. The key facts that have emerged paint a picture of a significant development that's capturing public attention.`;
}

function generateWhoIsInvolved(article: NewsArticle): string {
  const category = article.category?.[0] || 'general';
  const stakeholders: Record<string, string> = {
    politics: 'Government officials, lawmakers, and political analysts are closely monitoring this situation. The public, as constituents, are key stakeholders whose lives may be affected by resulting policies.',
    business: 'Major corporations, investors, market analysts, and consumers all have stakes in this development. Employees and shareholders are particularly attentive to how this unfolds.',
    technology: 'Tech companies, developers, regulators, and everyday users are all part of this story. Privacy advocates and industry leaders are watching closely.',
    science: 'Researchers, academic institutions, funding bodies, and the broader scientific community are engaged. The general public benefits from or is affected by these findings.',
    health: 'Healthcare providers, patients, pharmaceutical companies, and public health officials are central to this story. Policymakers may need to respond to the implications.',
  };
  
  return stakeholders[category] || 'Various stakeholders from government, industry, and civil society are involved in or affected by this development. The story touches multiple sectors and communities.';
}

function generateWhyItMatters(article: NewsArticle): string {
  return `This story matters because it represents a shift in how we understand or approach this issue. The implications extend beyond the immediate news cycle.\n\nFor everyday people, this could mean changes in policy, market conditions, or social norms. It's worth paying attention to how this develops and what responses emerge from key decision-makers.`;
}

function generateWhatsNext(article: NewsArticle): string {
  return `Watch for follow-up coverage and official statements in the coming days. Key developments to monitor include:\n\n• Official responses and policy announcements\n• Expert analysis and commentary\n• Public reaction and social discourse\n• Related developments in adjacent areas\n\nStay informed as this story evolves.`;
}

function generateRelatedConcepts(article: NewsArticle): string[] {
  const category = article.category?.[0] || 'general';
  const concepts: Record<string, string[]> = {
    politics: ['Policy Analysis', 'Political History', 'Public Opinion', 'Legislative Process'],
    business: ['Market Trends', 'Economic Indicators', 'Industry Analysis', 'Investment Strategy'],
    technology: ['Digital Innovation', 'Privacy & Security', 'Tech Regulation', 'Future of Work'],
    science: ['Research Methods', 'Peer Review', 'Scientific Ethics', 'Public Understanding'],
    health: ['Public Health', 'Medical Research', 'Healthcare Policy', 'Wellness Trends'],
  };
  
  return concepts[category] || ['Current Events', 'Media Literacy', 'Critical Thinking', 'Global Context'];
}

function generateFollowUpAnswer(question: string, article: NewsArticle): string {
  if (question.includes('history')) {
    return `This topic has a rich history that helps contextualize today's news. The roots of this issue can be traced back decades, with key moments shaping how we arrived at the current situation. Understanding this background helps us see patterns and anticipate potential outcomes. The historical context shows how similar situations have played out before and what lessons we might apply today.`;
  }
  if (question.includes('affect me')) {
    return `This development could impact your daily life in several ways. Depending on your location, occupation, and circumstances, you might see effects on your finances, access to services, or the policies that govern your community. While not everyone will be directly affected, staying informed helps you prepare for changes and participate meaningfully in public discourse about the issue.`;
  }
  return `Experts are weighing in on this topic with various perspectives. Some emphasize the potential benefits and opportunities, while others urge caution about possible risks. The consensus seems to be that this is a significant development worth monitoring. Leading voices in the field suggest that the long-term implications will depend on how key stakeholders respond in the coming weeks and months.`;
}

function generateELI10(article: NewsArticle): string {
  return `Imagine you're reading about something happening in the world that grown-ups are talking about.\n\nBasically, ${article.title.toLowerCase()}. This is like when something big happens at school and everyone wants to know about it.\n\nThe main thing to understand is that this affects people in different ways. Some people think it's good news, and some people are worried about it. That's normal when something important happens!\n\nThe reason people are paying attention is because it might change how things work for a lot of people.`;
}

function generateDeeperAnalysis(article: NewsArticle): string {
  return `This story warrants deeper analysis given its complexity and far-reaching implications.\n\n**Structural Context:** The development represents a significant shift within the broader institutional and systemic framework. Historical precedents suggest potential trajectories, though unique contemporary factors may alter expected outcomes.\n\n**Power Dynamics:** Multiple stakeholders with competing interests are engaged in this issue. Understanding their relative positions and leverage points helps predict how the situation might evolve.\n\n**Second-Order Effects:** Beyond the immediate implications, consider the cascading effects on adjacent systems, markets, or communities. These ripple effects often prove more significant than primary impacts.\n\n**Critical Assessment:** While the reporting appears factual, it's worth considering what perspectives or data points may be underrepresented in current coverage.`;
}
