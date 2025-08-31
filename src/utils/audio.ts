export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export const validateAudioFile = (file: File): { isValid: boolean; error?: string } => {
  if (file.size > 50 * 1024 * 1024) {
    return { isValid: false, error: 'File size must be less than 50MB' };
  }

  const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/x-flac'];
  if (!validTypes.includes(file.type)) {
    return { isValid: false, error: 'Please upload a valid audio file (MP3, WAV, FLAC)' };
  }

  return { isValid: true };
};

export const createAudioUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

export const revokeAudioUrl = (url: string): void => {
  URL.revokeObjectURL(url);
}; 