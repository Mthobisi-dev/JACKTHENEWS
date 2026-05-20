'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  MessageCircle,
  Users,
  Zap,
  MapPin,
  Trophy,
  Cpu,
  Send,
  Heart,
  ThumbsUp,
  ChevronLeft,
  Radio,
  Image as ImageIcon,
  Newspaper,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/bottom-nav';
import { AuthModal } from '@/components/auth-modal';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCommunityStore, type CommunityRoom, type CommunityMessage } from '@/lib/stores/community-store';
import { formatRelativeTime } from '@/lib/mock-data';

const ROOM_ICONS: Record<string, React.ElementType> = {
  MessageCircle,
  Zap,
  Cpu,
  MapPin,
  Trophy,
  Users,
};

export default function CommunityPage() {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { rooms, messages, activeRoom, setActiveRoom, sendMessage, reactToMessage, fetchRooms, fetchMessages, subscribeToMessages, isLoading } = useCommunityStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentRoom = rooms.find(r => r.id === activeRoom);
  const roomMessages = activeRoom ? (messages[activeRoom] || []) : [];
  
  // Calculate total online users from all rooms
  const onlineUsers = rooms.reduce((sum, room) => sum + (room.memberCount > 0 ? Math.floor(room.memberCount * 0.1) : 0), 1);

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Subscribe to messages when room changes
  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom);
      const unsubscribe = subscribeToMessages(activeRoom);
      return () => unsubscribe();
    }
  }, [activeRoom, fetchMessages, subscribeToMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !activeRoom) return;

    sendMessage(activeRoom, {
      roomId: activeRoom,
      userId: user.id,
      userDisplayName: user.displayName,
      userAvatar: user.avatarUrl || '',
      content: newMessage,
      type: 'text',
    });

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = () => {
    if (!audioBlob || !user || !activeRoom) return;

    // Create a URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);

    sendMessage(activeRoom, {
      roomId: activeRoom,
      userId: user.id,
      userDisplayName: user.displayName,
      userAvatar: user.avatarUrl || '',
      content: `Voice message (${formatDuration(recordingDuration)})`,
      type: 'voice',
      mediaUrl: audioUrl,
    });

    setAudioBlob(null);
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playVoiceMessage = (messageId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    
    if (isPlayingVoice === messageId) {
      setIsPlayingVoice(null);
      return;
    }
    
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlayingVoice(null);
    audio.play();
    setIsPlayingVoice(messageId);
  };

  // Room list view
  if (!activeRoom) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 glass border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Community</h1>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  {onlineUsers.toLocaleString()} online
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Featured rooms */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">CHAT ROOMS</h2>
            <div className="space-y-2">
              {rooms.map((room) => {
                const Icon = ROOM_ICONS[room.icon] || MessageCircle;
                return (
                  <motion.button
                    key={room.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      if (!isAuthenticated) {
                        openAuthModal('login');
                        return;
                      }
                      setActiveRoom(room.id);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left"
                  >
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      room.isOfficial ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      <Icon className={`h-6 w-6 ${room.isOfficial ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{room.name}</h3>
                        {room.isOfficial && (
                          <Badge variant="secondary" className="text-[10px]">Official</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{room.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.memberCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {room.messageCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        </div>

        <BottomNav />
        <AuthModal />
      </main>
    );
  }

  // Chat room view
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveRoom(null)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground">{currentRoom?.name}</h1>
            <p className="text-xs text-muted-foreground">
              {currentRoom?.memberCount.toLocaleString()} members
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {roomMessages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${
              message.userId === user?.id ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={message.userAvatar} />
              <AvatarFallback>{message.userDisplayName[0]}</AvatarFallback>
            </Avatar>
            <div className={`max-w-[75%] ${message.userId === user?.id ? 'items-end' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">{message.userDisplayName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(message.createdAt)}
                </span>
              </div>
              
              {message.type === 'news-share' ? (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  {message.newsImage && (
                    <div className="relative h-32 w-full">
                      <Image
                        src={message.newsImage}
                        alt={message.newsTitle || ''}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium">{message.newsTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1">{message.content}</p>
                  </div>
                </div>
              ) : message.type === 'voice' ? (
                <button
                  onClick={() => playVoiceMessage(message.id, message.mediaUrl)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    message.userId === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  {isPlayingVoice === message.id ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-0.5 rounded-full ${
                              message.userId === user?.id ? 'bg-primary-foreground/50' : 'bg-foreground/30'
                            }`}
                            style={{ height: `${Math.random() * 16 + 4}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs opacity-70">{message.content.match(/\d+:\d+/)?.[0] || '0:00'}</span>
                </button>
              ) : (
                <div className={`rounded-2xl px-4 py-2 ${
                  message.userId === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => reactToMessage(activeRoom, message.id, 'like')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ThumbsUp className="h-3 w-3" />
                  {message.reactions.like > 0 && message.reactions.like}
                </button>
                <button
                  onClick={() => reactToMessage(activeRoom, message.id, 'heart')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Heart className="h-3 w-3" />
                  {message.reactions.heart > 0 && message.reactions.heart}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 p-4 glass border-t border-border">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="text-destructive"
            >
              <MicOff className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording... {formatDuration(recordingDuration)}</span>
            </div>
            <Button onClick={stopRecording} size="icon" className="bg-primary">
              <Square className="h-4 w-4" />
            </Button>
          </div>
        ) : audioBlob ? (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setAudioBlob(null);
                setRecordingDuration(0);
              }}
              className="text-destructive"
            >
              <MicOff className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center justify-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Voice message ({formatDuration(recordingDuration)})</span>
            </div>
            <Button onClick={sendVoiceMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={startRecording}
              className="text-muted-foreground hover:text-foreground"
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AuthModal />
    </main>
  );
}
