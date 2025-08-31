export const AUDIO_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  VALID_TYPES: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/x-flac'],
  PROCESSING_STEPS: ['Vocals', 'Drums', 'Bass', 'Other'] as const,
  ESTIMATED_PROCESSING_TIME: 120, // 2 minutes
} as const;

export const TRACK_TYPES = {
  VOCALS: 'vocals',
  DRUMS: 'drums',
  BASS: 'bass',
  OTHER: 'other',
} as const;

export const TRACK_COLORS = {
  vocals: { wave: '#3b82f6', progress: '#1d4ed8' },
  drums: { wave: '#ef4444', progress: '#dc2626' },
  bass: { wave: '#10b981', progress: '#059669' },
  other: { wave: '#8b5cf6', progress: '#7c3aed' },
} as const;

export const WAVEFORM_CONFIG = {
  DEFAULT: {
    waveColor: '#4f46e5',
    progressColor: '#7c3aed',
    cursorColor: '#1e293b',
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 80,
    barGap: 3,
    interact: true, // Enable clicking/dragging
    hideScrollbar: true,
    normalize: true,
    responsive: true,
  },
  TRACK: {
    waveColor: '#4f46e5',
    progressColor: '#7c3aed',
    cursorColor: '#1e293b',
    barWidth: 1.5,
    barRadius: 2,
    cursorWidth: 1,
    height: 60,
    barGap: 2,
    interact: true,
    hideScrollbar: true,
    normalize: true,
    responsive: true,
  },
} as const;

export const MOCK_TRACKS = [
  {
    id: 'vocals',
    name: 'Vocals',
    type: 'vocals' as const,
    url: '/api/audio/vocals',
    duration: 180,
  },
  {
    id: 'drums',
    name: 'Drums',
    type: 'drums' as const,
    url: '/api/audio/drums',
    duration: 180,
  },
  {
    id: 'bass',
    name: 'Bass',
    type: 'bass' as const,
    url: '/api/audio/bass',
    duration: 180,
  },
  {
    id: 'other',
    name: 'Other Instruments',
    type: 'other' as const,
    url: '/api/audio/other',
    duration: 180,
  },
] as const; 