import { useState, useCallback } from 'react';
import { ProcessingStatus, AudioTrack } from '../types/audio';
import { AUDIO_CONFIG, MOCK_TRACKS } from '../constants/audio';
import axios from 'axios';
import { recordSeparation, recordDownload } from '@/lib/stats';

interface DetectedInstrument {
  id: string;
  name: string;
  type: 'vocals' | 'piano' | 'guitar' | 'drums' | 'bass' | 'strings' | 'brass' | 'other';
  confidence: number;
  subParts?: string[];
  isSelected: boolean;
}

type ProcessingPhase = 'idle' | 'detecting' | 'selecting' | 'separating' | 'completed' | 'error';

export const useAudioProcessing = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [currentStepDetails, setCurrentStepDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [separatedTracks, setSeparatedTracks] = useState<AudioTrack[]>([]);
  const [detectedInstruments, setDetectedInstruments] = useState<DetectedInstrument[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<DetectedInstrument[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [outputSessionId, setOutputSessionId] = useState<string | null>(null);
  const [prevAnonDetectSessionId, setPrevAnonDetectSessionId] = useState<string | null>(null);
  const [prevAnonOutputSessionId, setPrevAnonOutputSessionId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_AUDIO_SERVICE_URL || 'http://localhost:5002';
  

  const API_TIMEOUT = 300000;
  const MAX_RETRIES = 3;

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setProcessingPhase('idle');
    setError(null);
    setSeparatedTracks([]);
    setDetectedInstruments([]);
    setSelectedInstruments([]);
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setProcessingPhase('idle');
    setError(null);
    setSeparatedTracks([]);
    setDetectedInstruments([]);
    setSelectedInstruments([]);
    setSessionId(null);
    setOutputSessionId(null);
  }, []);

  const startDetection = useCallback(async () => {
    if (!selectedFile) return;

    setProcessingPhase('detecting');
    setProgress(0);
    setError(null);
    setCurrentStep('');
    setCurrentStepDetails('');

    try {
      let authed = false;
      try {
        const sess = await axios.get('/api/auth/session');
        authed = !!sess.data?.user?.email;
        setIsAuthenticated(authed);
        setMemberId(authed ? (sess.data?.user?.id ?? null) : null);
      } catch {
        authed = false;
        setIsAuthenticated(false);
        setMemberId(null);
      }

      if (!authed) {
        try {
          if (prevAnonDetectSessionId) {
            await axios.delete(`${API_BASE_URL}/cleanup/${prevAnonDetectSessionId}`, { timeout: 10000 });
          }
          if (prevAnonOutputSessionId) {
            await axios.delete(`${API_BASE_URL}/cleanup/${prevAnonOutputSessionId}`, { timeout: 10000 });
          }
        } catch (e) {
        }
      }
      setCurrentStep('Uploading audio file...');
      setProgress(5);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 25) {
            return prev + 2;
          }
          return prev;
        });
      }, 100);

      setCurrentStep('Analysing audio file...');
      setProgress(30);

      try {
        await axios.get(`${API_BASE_URL}/app-check`, { timeout: 5000 });
      } catch (error) {
        throw new Error('Audio service is not available. Please ensure the backend is running.');
      }

      const response = await axios.post(`${API_BASE_URL}/detect-instruments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_TIMEOUT,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const uploadProgress = (progressEvent.loaded / progressEvent.total) * 15;
            setProgress(25 + uploadProgress);
          }
        },
      });

      clearInterval(uploadInterval);
      setProgress(100);
      setCurrentStep('Detection completed!');

      const { session_id, instruments, tempo, duration, sample_rate } = response.data;
      setSessionId(session_id);
      if (!authed) {
        setPrevAnonDetectSessionId(session_id);
      }


      const detected = instruments.map((instrument: any, index: number) => ({
        id: `${instrument.name.toLowerCase()}-${index}`,
        name: instrument.name,
        type: instrument.name.toLowerCase() as any,
        confidence: Math.round(instrument.confidence * 100),
        subParts: instrument.sub_parts || [],
        isSelected: false
      }));

      setDetectedInstruments(detected);
      setProcessingPhase('selecting');

      if (selectedFile && authed) {
        try {
          await axios.post('/api/user/audio-files', {
            originalFileName: selectedFile.name,
            originalFileSize: selectedFile.size,
            originalFileType: selectedFile.type,
            sessionId: session_id,
            detectedInstruments: instruments,
            audioMetadata: { tempo, duration, sample_rate },
            processingStatus: 'processing'
          });
        } catch (error) {
          console.error('Failed to save detection results:', error);
        }
      }

    } catch (err: any) {
      console.error('Detection error:', err);
      let errorMessage = 'Detection failed. Please try again.';
      
      if (err.message?.includes('Audio service is not available')) {
        errorMessage = 'Audio service is not available. Please ensure the backend is running on 5002.';
      } else if (err.response?.status === 413) {
        errorMessage = 'File too large. Please try a smaller audio file.';
      } else if (err.response?.status === 415) {
        errorMessage = 'Unsupported file format. Please use WAV, MP3, FLAC, M4A, or OGG.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      setProcessingPhase('error');
    }
  }, [selectedFile, API_BASE_URL, isAuthenticated, prevAnonDetectSessionId, prevAnonOutputSessionId]);

  const startSeparation = useCallback(async (instruments: DetectedInstrument[]) => {
    if (!sessionId) {
      setError('No session found. Please upload a file first.');
      setProcessingPhase('error');
      return;
    }

    setProcessingPhase('separating');
    setProgress(0);
    setCurrentStep('');
    setCurrentStepDetails('');

    try {
      setCurrentStep('Preparing audio separation...');
      setProgress(10);

      const selectedInstrumentsForBackend = instruments.map(instrument => ({
        name: instrument.name,
        sub_parts: instrument.subParts || []
      }));

      setCurrentStep('Separating audio tracks...');
      setProgress(30);

      const progressStages = [
        { progress: 40, step: 'Preparing frequency filters...' },
        { progress: 50, step: 'Processing audio file...' },
        { progress: 60, step: 'Separating instrument tracks...' },
        { progress: 70, step: 'Applying separation filters...' },
        { progress: 80, step: 'Optimising audio quality...' },
        { progress: 90, step: 'Finalising tracks...' }
      ];
      
      let currentStage = 0;
      const progressInterval = setInterval(() => {
        if (currentStage < progressStages.length) {
          const stage = progressStages[currentStage];
          setProgress(stage.progress);
          setCurrentStep(stage.step);
          currentStage++;
        }
      }, 2000);

      let response;
      try {
        response = await axios.post(`${API_BASE_URL}/separate-audio`, {
          session_id: sessionId,
          selected_instruments: selectedInstrumentsForBackend
        }, {
          timeout: API_TIMEOUT
        });

        clearInterval(progressInterval);
        setProgress(100);
        setCurrentStep('Separation completed');

        const { session_id: outputSessionId, tracks } = response.data;
        setOutputSessionId(outputSessionId);
        if (!isAuthenticated) {
          setPrevAnonOutputSessionId(outputSessionId);
        }


        const generatedTracks: AudioTrack[] = tracks.map((track: any, index: number) => ({
          id: `${track.name.toLowerCase()}-${index}`,
          name: track.name,
          type: track.name.toLowerCase() as any,
          url: `${API_BASE_URL}${track.download_url}`,
          duration: track.duration,
          sampleRate: track.sample_rate,
          subParts: track.sub_parts || []
        }));

        setSeparatedTracks(generatedTracks);

        try {
          const fileName = selectedFile ? selectedFile.name : 'audio';
          const instrumentNames = instruments.map(i => i.name);
          const trackNames = tracks.map((t: any) => t.name);
          recordSeparation(fileName, instrumentNames, trackNames, memberId);
        } catch {}
        setProcessingPhase('completed');


        let authedAtSeparation = false;
        try {
          const sess = await axios.get('/api/auth/session');
          authedAtSeparation = !!sess.data?.user?.email;
          if (authedAtSeparation) setMemberId(sess.data?.user?.id ?? null);
        } catch {
          authedAtSeparation = false;
          setMemberId(null);
        }

        if (selectedFile && authedAtSeparation) {
          try {
            const retentionMinutes = Number(process.env.NEXT_PUBLIC_RETENTION_MINUTES || 120);
            const expiresAtIso = new Date(Date.now() + retentionMinutes * 60 * 1000).toISOString();

            await axios.post('/api/user/audio-files', {
              originalFileName: selectedFile.name,
              originalFileSize: selectedFile.size,
              originalFileType: selectedFile.type,
              sessionId: sessionId,
              outputSessionId: outputSessionId,
              detectedInstruments: detectedInstruments,
              selectedInstruments: instruments,
              separatedTracks: tracks,
              audioMetadata: { tempo: 0, duration: 0, sample_rate: 0 },
              processingStatus: 'completed',
              filesAvailable: true,
              fileExpiresAt: expiresAtIso
            });
          } catch (error) {
            console.error('Failed to save separation results:', error);
          }
        }
      } catch (separationError: any) {
        clearInterval(progressInterval);
        throw separationError;
      }

    } catch (err: any) {
      console.error('Separation error:', err);
      setError(err.response?.data?.error || 'Separation failed. Please try again.');
      setProcessingPhase('error');
    }
  }, [sessionId, API_BASE_URL, detectedInstruments, selectedFile]);


  const handleInstrumentsSelected = useCallback((instruments: DetectedInstrument[]) => {
    setSelectedInstruments(instruments);
    setProcessingPhase('separating');
    startSeparation(instruments);
  }, [startSeparation]);

  const resetAll = useCallback(() => {
    setSelectedFile(null);
    setProcessingPhase('idle');
    setProgress(0);
    setCurrentStep('');
    setCurrentStepDetails('');
    setError(null);
    setSeparatedTracks([]);
    setDetectedInstruments([]);
    setSelectedInstruments([]);
    setSessionId(null);
    setOutputSessionId(null);
  }, []);

  const handleDownload = useCallback((trackId: string) => {
    const track = separatedTracks.find(t => t.id === trackId);
    if (track && track.url) {
      if (isAuthenticated && outputSessionId) {
        try {
          if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
            const blob = new Blob([JSON.stringify({ outputSessionId })], { type: 'application/json' });
            navigator.sendBeacon('/api/user/audio-files/download', blob);
          } else {
            axios.post('/api/user/audio-files/download', { outputSessionId })
              .catch(() => {});
          }
        } catch {}
      }

      try { recordDownload(1, memberId); } catch {}

      const link = document.createElement('a');
      const url = track.url;
      link.href = url;
      link.download = `${track.name}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [separatedTracks, isAuthenticated, outputSessionId]);

  const handleDownloadAll = useCallback(async () => {
    if (!outputSessionId) return;

    if (isAuthenticated) {
      try {
        const count = separatedTracks.length || 1;
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify({ outputSessionId, count })], { type: 'application/json' });
          navigator.sendBeacon('/api/user/audio-files/download', blob);
        } else {
          await axios.post('/api/user/audio-files/download', { outputSessionId, count });
        }
      } catch {}
    }


    try {
      const count = separatedTracks.length || 1;
      recordDownload(count, memberId);
    } catch {}


    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/download-all/${outputSessionId}`;
    link.download = `tracks.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [API_BASE_URL, isAuthenticated, outputSessionId, separatedTracks.length, memberId]);

  return {
    selectedFile,
    processingPhase,
    progress,
    currentStep,
    currentStepDetails,
    error,
    separatedTracks,
    detectedInstruments,
    selectedInstruments,
    handleFileSelect,
    handleFileRemove,
    startDetection,
    handleInstrumentsSelected,
    resetAll,
    handleDownload,
    handleDownloadAll,
  };
}; 
