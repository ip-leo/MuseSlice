export interface AudioTrack {
  id: string;
  name: string;
  type: 'vocals' | 'piano' | 'guitar' | 'drums' | 'bass' | 'strings' | 'brass' | 'other';
  url: string;
  duration?: number;
}

export interface AudioFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface ProcessingState {
  status: ProcessingStatus;
  progress: number;
  currentStep?: string;
  error?: string;
  estimatedTime?: number;
}

export interface AudioUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isProcessing?: boolean;
  selectedFile?: File | null;
}

export interface ProcessingStatusProps {
  status: ProcessingStatus;
  progress?: number;
  currentStep?: string;
  currentStepDetails?: string;
  error?: string;
  estimatedTime?: number;
  detectedInstruments?: Array<{
    name: string;
    confidence: number;
    type: 'vocals' | 'drums' | 'bass' | 'other';
  }>;
}

export interface AudioResultsProps {
  tracks: AudioTrack[];
  onDownload: (trackId: string) => void;
  onDownloadAll?: () => void;
}

export interface WaveformConfig {
  waveColor: string;
  progressColor: string;
  cursorColor: string;
  barWidth: number;
  barRadius: number;
  cursorWidth: number;
  height: number;
  barGap: number;
} 
