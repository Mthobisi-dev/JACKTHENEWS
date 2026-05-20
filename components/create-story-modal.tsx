'use client';

import { useState, useRef, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  AlertTriangle,
  Newspaper,
  User,
  X,
  Video,
  SwitchCamera,
  Circle,
  Square,
  Upload,
  Trash2,
} from 'lucide-react';
import { useStoriesStore } from '@/lib/stores/stories-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StoryType = 'user' | 'news' | 'incident';
type CaptureMode = 'photo' | 'video';
type InputMode = 'select' | 'camera' | 'form';

export function CreateStoryModal({ open, onOpenChange }: CreateStoryModalProps) {
  const { createStory, createIncident, isLoading } = useStoriesStore();
  const { user, openAuthModal } = useAuthStore();
  
  const [inputMode, setInputMode] = useState<InputMode>('select');
  const [type, setType] = useState<StoryType>('user');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [capturedMediaType, setCapturedMediaType] = useState<'image' | 'video'>('image');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [incidentType, setIncidentType] = useState<'accident' | 'emergency' | 'crime' | 'infrastructure' | 'weather' | 'other'>('other');
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: captureMode === 'video',
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, [facingMode, captureMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
  }, []);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(startCamera, 100);
  }, [stopCamera, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedMedia(dataUrl);
      setCapturedMediaType('image');
      stopCamera();
      setInputMode('form');
    }
  }, [stopCamera]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCapturedMedia(url);
      setCapturedMediaType('video');
      stopCamera();
      setInputMode('form');
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      toast.error('Please select an image or video file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedMedia(e.target?.result as string);
      setCapturedMediaType(isVideo ? 'video' : 'image');
      setInputMode('form');
    };
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setCapturedMedia(null);
    setMediaUrl('');
  };

  const handleSubmit = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    
    const finalMediaUrl = capturedMedia || mediaUrl || undefined;
    const finalMediaType = capturedMedia ? capturedMediaType : (mediaUrl ? 'image' : undefined);
    
    if (type === 'incident') {
      const result = await createIncident({
        userId: user.id,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl || '',
        title: incidentTitle,
        description: content,
        type: incidentType,
        severity: incidentSeverity,
        location,
        mediaUrls: finalMediaUrl ? [finalMediaUrl] : [],
      });
      
      if (result) {
        toast.success('Incident reported successfully');
        resetForm();
        onOpenChange(false);
      }
    } else {
      const result = await createStory({
        userId: user.id,
        userDisplayName: user.displayName,
        userAvatar: user.avatarUrl || '',
        type,
        content,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        location: location || undefined,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      
      if (result) {
        toast.success('Story posted successfully');
        resetForm();
        onOpenChange(false);
      }
    }
  };

  const resetForm = () => {
    setInputMode('select');
    setType('user');
    setContent('');
    setLocation('');
    setMediaUrl('');
    setCapturedMedia(null);
    setIncidentTitle('');
    setIncidentSeverity('medium');
    setIncidentType('other');
    stopCamera();
  };

  const handleClose = () => {
    stopCamera();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {/* Mode Selection */}
          {inputMode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-4">
                <DialogTitle>Create Story</DialogTitle>
                <DialogDescription className="sr-only">
                  Choose how to create your story
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setInputMode('camera');
                    setCaptureMode('photo');
                    setTimeout(startCamera, 100);
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <span className="font-medium">Take Photo</span>
                </button>
                
                <button
                  onClick={() => {
                    setInputMode('camera');
                    setCaptureMode('video');
                    setTimeout(startCamera, 100);
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Video className="h-7 w-7 text-red-500" />
                  </div>
                  <span className="font-medium">Record Video</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Upload className="h-7 w-7 text-blue-500" />
                  </div>
                  <span className="font-medium">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                
                <button
                  onClick={() => setInputMode('form')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Newspaper className="h-7 w-7 text-green-500" />
                  </div>
                  <span className="font-medium">Text Only</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Camera View */}
          {inputMode === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative bg-black"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[3/4] object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Controls Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between p-4">
                {/* Top Controls */}
                <div className="flex justify-between items-start">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 text-white hover:bg-black/70"
                    onClick={handleClose}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 text-white hover:bg-black/70"
                    onClick={switchCamera}
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Bottom Controls */}
                <div className="flex flex-col items-center gap-4">
                  {/* Mode Toggle */}
                  <div className="flex gap-4 bg-black/50 rounded-full p-1">
                    <button
                      onClick={() => {
                        setCaptureMode('photo');
                        if (isRecording) stopRecording();
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        captureMode === 'photo' ? 'bg-white text-black' : 'text-white'
                      }`}
                    >
                      Photo
                    </button>
                    <button
                      onClick={() => setCaptureMode('video')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        captureMode === 'video' ? 'bg-white text-black' : 'text-white'
                      }`}
                    >
                      Video
                    </button>
                  </div>
                  
                  {/* Capture Button */}
                  <button
                    onClick={captureMode === 'photo' ? capturePhoto : (isRecording ? stopRecording : startRecording)}
                    className={`h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                      isRecording ? 'bg-red-500' : 'bg-transparent'
                    }`}
                  >
                    {captureMode === 'photo' ? (
                      <Circle className="h-16 w-16 fill-white text-white" />
                    ) : isRecording ? (
                      <Square className="h-8 w-8 fill-white text-white" />
                    ) : (
                      <Circle className="h-16 w-16 fill-red-500 text-red-500" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Form View */}
          {inputMode === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-4">
                <DialogTitle>Create Story</DialogTitle>
                <DialogDescription className="sr-only">
                  Post a story or report an incident
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Captured Media Preview */}
                {capturedMedia && (
                  <div className="relative rounded-xl overflow-hidden">
                    {capturedMediaType === 'video' ? (
                      <video src={capturedMedia} className="w-full aspect-video object-cover" controls />
                    ) : (
                      <img src={capturedMedia} alt="Captured" className="w-full aspect-video object-cover" />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={clearMedia}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Story Type Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setType('user')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      type === 'user'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <User className={`h-5 w-5 ${type === 'user' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs">Personal</span>
                  </button>
                  <button
                    onClick={() => setType('news')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      type === 'news'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Newspaper className={`h-5 w-5 ${type === 'news' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs">News</span>
                  </button>
                  <button
                    onClick={() => setType('incident')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      type === 'incident'
                        ? 'border-destructive bg-destructive/10'
                        : 'border-border hover:border-destructive/50'
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 ${type === 'incident' ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <span className="text-xs">Incident</span>
                  </button>
                </div>

                {/* Incident-specific fields */}
                <AnimatePresence mode="wait">
                  {type === 'incident' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="incidentTitle">Incident Title</Label>
                        <Input
                          id="incidentTitle"
                          placeholder="Brief description of the incident"
                          value={incidentTitle}
                          onChange={(e) => setIncidentTitle(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Incident Type</Label>
                        <div className="flex flex-wrap gap-2">
                          {(['accident', 'emergency', 'crime', 'infrastructure', 'weather', 'other'] as const).map((t) => (
                            <Badge
                              key={t}
                              variant={incidentType === t ? 'default' : 'outline'}
                              className="cursor-pointer capitalize"
                              onClick={() => setIncidentType(t)}
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setIncidentSeverity(s)}
                              className={`px-3 py-2 rounded-lg text-xs capitalize transition-all ${
                                incidentSeverity === s
                                  ? s === 'critical'
                                    ? 'bg-red-500 text-white'
                                    : s === 'high'
                                    ? 'bg-orange-500 text-white'
                                    : s === 'medium'
                                    ? 'bg-yellow-500 text-black'
                                    : 'bg-green-500 text-white'
                                  : 'bg-secondary'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">
                    {type === 'incident' ? 'Description' : 'Your Story'}
                  </Label>
                  <Textarea
                    id="content"
                    placeholder={
                      type === 'incident'
                        ? 'Describe what happened, any details that would help others...'
                        : "What's happening?"
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Add location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Media URL (if no captured media) */}
                {!capturedMedia && (
                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl">Image URL (optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="mediaUrl"
                          placeholder="https://example.com/image.jpg"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setInputMode('select')}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => capturedMedia ? clearMedia() : setInputMode('select')}
                    className="flex-1"
                  >
                    {capturedMedia ? 'Clear Media' : 'Back'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !content || (type === 'incident' && !incidentTitle)}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Spinner className="h-4 w-4" />
                    ) : type === 'incident' ? (
                      'Report Incident'
                    ) : (
                      'Post Story'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
