'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  AlertTriangle,
  MapPin,
  Clock,
  ChevronUp,
  MessageCircle,
  BadgeCheck,
  Car,
  Flame,
  Shield,
  Wrench,
  CloudRain,
  HelpCircle,
  Plus,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import { CreateStoryModal } from '@/components/create-story-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useStoriesStore, type Incident } from '@/lib/stores/stories-store';
import { formatRelativeTime } from '@/lib/mock-data';

const INCIDENT_ICONS: Record<string, React.ElementType> = {
  accident: Car,
  emergency: Flame,
  crime: Shield,
  infrastructure: Wrench,
  weather: CloudRain,
  other: HelpCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-500 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  critical: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-red-500',
  investigating: 'bg-yellow-500',
  resolved: 'bg-green-500',
};

export default function IncidentsPage() {
  const { isAuthenticated, openAuthModal } = useAuthStore();
  const { incidents, fetchIncidents, upvoteIncident } = useStoriesStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const filteredIncidents = incidents.filter((incident) => {
    if (filter === 'all') return true;
    if (filter === 'active') return incident.status === 'active' || incident.status === 'investigating';
    return incident.status === 'resolved';
  });

  const handleUpvote = (incidentId: string) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    upvoteIncident(incidentId);
  };

  const handleReport = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setShowCreateModal(true);
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Local Incidents
            </h1>
            <p className="text-xs text-muted-foreground">Community-reported incidents near you</p>
          </div>
          <Button size="sm" onClick={handleReport}>
            <Plus className="h-4 w-4 mr-1" />
            Report
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          {(['all', 'active', 'resolved'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No incidents reported</p>
            <Button className="mt-4" onClick={handleReport}>
              Report an Incident
            </Button>
          </div>
        ) : (
          filteredIncidents.map((incident, index) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              index={index}
              onUpvote={() => handleUpvote(incident.id)}
            />
          ))
        )}
      </div>

      <BottomNav />
      <AuthModal />
      <CreateStoryModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </main>
  );
}

function IncidentCard({ 
  incident, 
  index, 
  onUpvote 
}: { 
  incident: Incident; 
  index: number;
  onUpvote: () => void;
}) {
  const Icon = INCIDENT_ICONS[incident.type] || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl bg-card border border-border overflow-hidden"
    >
      {/* Image */}
      {incident.mediaUrls.length > 0 && (
        <div className="relative h-48 w-full">
          <Image
            src={incident.mediaUrls[0]}
            alt={incident.title}
            fill
            className="object-cover"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className={SEVERITY_COLORS[incident.severity]}>
              {incident.severity.toUpperCase()}
            </Badge>
            <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[incident.status]}`} />
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            incident.severity === 'critical' || incident.severity === 'high'
              ? 'bg-destructive/10'
              : 'bg-secondary'
          }`}>
            <Icon className={`h-5 w-5 ${
              incident.severity === 'critical' || incident.severity === 'high'
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{incident.title}</h3>
              {incident.isVerified && (
                <BadgeCheck className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {incident.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatRelativeTime(incident.createdAt)}
          </span>
        </div>

        {/* Reporter */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={incident.userAvatar} />
            <AvatarFallback>{incident.userDisplayName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Reported by {incident.userDisplayName}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUpvote}
            className="flex items-center gap-1"
          >
            <ChevronUp className="h-4 w-4" />
            {incident.upvotes}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {incident.comments}
          </Button>
          <Badge variant="outline" className="ml-auto capitalize">
            {incident.status}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}
