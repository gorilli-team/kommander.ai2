"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import { Mic, MicOff, Square, Play, Pause, Upload, Volume2 } from 'lucide-react';
import { toast } from '@/frontend/hooks/use-toast';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  duration: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
}

export default function VoiceRecorder({ onTranscriptionComplete, disabled = false }: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    duration: 0,
    audioUrl: null,
    audioBlob: null
  });
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'pending'>('pending');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check microphone permission on mount
    checkMicrophonePermission();

    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending');
      
      result.addEventListener('change', () => {
        setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'pending');
      });
    } catch (error) {
      console.warn('Permission API not supported');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          isPaused: false
        }));

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0
      }));

      setPermissionStatus('granted');

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);

      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionStatus('denied');
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      toast({
        title: "Recording stopped",
        description: "You can now play back or transcribe your recording",
      });
    }
  };

  const pauseResumeRecording = () => {
    if (mediaRecorderRef.current) {
      if (recordingState.isPaused) {
        mediaRecorderRef.current.resume();
        setRecordingState(prev => ({ ...prev, isPaused: false }));
        
        // Resume timer
        intervalRef.current = setInterval(() => {
          setRecordingState(prev => ({
            ...prev,
            duration: prev.duration + 1
          }));
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setRecordingState(prev => ({ ...prev, isPaused: true }));
        
        // Pause timer
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  };

  const playAudio = () => {
    if (recordingState.audioUrl && audioRef.current) {
      if (recordingState.isPlaying) {
        audioRef.current.pause();
        setRecordingState(prev => ({ ...prev, isPlaying: false }));
      } else {
        audioRef.current.play();
        setRecordingState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const transcribeAudio = async () => {
    if (!recordingState.audioBlob) {
      toast({
        title: "No audio to transcribe",
        description: "Please record audio first",
        variant: "destructive"
      });
      return;
    }

    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', recordingState.audioBlob, 'recording.webm');

      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const { text } = await response.json();
      
      if (text.trim()) {
        onTranscriptionComplete(text);
        toast({
          title: "Transcription complete",
          description: "Your speech has been converted to text",
        });
        
        // Reset recording state after successful transcription
        resetRecording();
      } else {
        toast({
          title: "No speech detected",
          description: "Please try recording again with clearer audio",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: "Unable to convert speech to text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const resetRecording = () => {
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      duration: 0,
      audioUrl: null,
      audioBlob: null
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (permissionStatus === 'denied') {
    return (
      <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
        <MicOff className="w-4 h-4 text-red-600" />
        <span className="text-sm text-red-600">Microphone access is required for voice input</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recording Controls */}
      <div className="flex items-center space-x-2">
        {!recordingState.isRecording ? (
          <Button
            onClick={startRecording}
            disabled={disabled || isTranscribing}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Mic className="w-4 h-4" />
            <span>Start Recording</span>
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Button
              onClick={pauseResumeRecording}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              {recordingState.isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              )}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </Button>
          </div>
        )}

        {/* Recording Status */}
        {recordingState.isRecording && (
          <div className="flex items-center space-x-2">
            <Badge variant={recordingState.isPaused ? "secondary" : "default"} className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${recordingState.isPaused ? 'bg-gray-500' : 'bg-red-500 animate-pulse'}`} />
              <span>{formatDuration(recordingState.duration)}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Audio Playback and Transcription */}
      {recordingState.audioUrl && (
        <div className="space-y-2">
          <audio
            ref={audioRef}
            src={recordingState.audioUrl}
            onEnded={() => setRecordingState(prev => ({ ...prev, isPlaying: false }))}
            className="hidden"
          />
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={playAudio}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              {recordingState.isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Play</span>
                </>
              )}
            </Button>

            <Button
              onClick={transcribeAudio}
              disabled={isTranscribing}
              variant="default"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isTranscribing ? 'Transcribing...' : 'Transcribe'}</span>
            </Button>

            <Button
              onClick={resetRecording}
              variant="ghost"
              size="sm"
            >
              Reset
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Duration: {formatDuration(recordingState.duration)}
          </div>
        </div>
      )}
    </div>
  );
}
