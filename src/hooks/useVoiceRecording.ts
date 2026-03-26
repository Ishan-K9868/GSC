/**
 * useVoiceRecording Hook
 * PRD: 5.1.1 Voice-First Intake
 * 
 * Handles voice recording using the Web Audio API and MediaRecorder.
 * Supports push-to-talk interaction pattern.
 */

import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecordingOptions {
  maxDuration?: number; // Max recording duration in ms (default: 60000)
  onTranscript?: (transcript: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  isSupported: boolean;
}

export function useVoiceRecording(
  options: UseVoiceRecordingOptions = {}
): UseVoiceRecordingReturn {
  const { maxDuration = 60000, onTranscript } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Check browser support
  const isSupported = typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.MediaRecorder;

  // Initialize speech recognition if available
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Default to Hindi, can be changed
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      const fullTranscript = finalTranscript || interimTranscript;
      setTranscript(fullTranscript);
      onTranscript?.(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      // Don't set error - speech recognition is optional
    };

    return recognition;
  }, [onTranscript]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser');
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];
      setTranscript('');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        const finalBlob = blob.size > 0 ? blob : null;
        setAudioBlob(finalBlob);

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        if (finalBlob) {
          setAudioUrl(URL.createObjectURL(finalBlob));
        } else {
          setAudioUrl(null);
        }

        stopResolverRef.current?.(finalBlob);
        stopResolverRef.current = null;
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);

      // Start speech recognition (optional)
      try {
        recognitionRef.current = initSpeechRecognition();
        recognitionRef.current?.start();
      } catch {
        // Speech recognition not available - continue without it
      }
    } catch (err: any) {
      console.error('Recording error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  }, [isSupported, maxDuration, initSpeechRecognition]);

  // Stop recording
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(audioBlob);
        return;
      }

      stopResolverRef.current = resolve;

      try {
        mediaRecorderRef.current.requestData();
      } catch {
        // Some browsers may not support requestData here.
      }

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }

      streamRef.current?.getTracks().forEach(track => track.stop());
    });
  }, [isRecording, audioBlob]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      recognitionRef.current?.stop();
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      try {
        recognitionRef.current?.start();
      } catch {
        // Ignore
      }
    }
  }, [isRecording, isPaused]);

  // Reset recording
  const resetRecording = useCallback(() => {
    stopRecording();
    setDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setTranscript('');
    setError(null);
    chunksRef.current = [];
  }, [stopRecording, audioUrl]);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    transcript,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    isSupported,
  };
}

// Format duration as MM:SS
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
