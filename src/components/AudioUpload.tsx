'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music, AlertCircle, X } from 'lucide-react';
import { AudioUploadProps } from '../types/audio';
import { validateAudioFile, formatFileSize, createAudioUrl, revokeAudioUrl } from '../utils/audio';
import { AUDIO_CONFIG } from '../constants/audio';
import AudioPlayer from './AudioPlayer';

const AudioUpload: React.FC<AudioUploadProps> = ({ onFileSelect, onFileRemove, isProcessing = false, selectedFile }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      setError('Please upload a valid audio file (MP3, WAV, FLAC)');
      return;
    }

    const file = acceptedFiles[0];
    const validation = validateAudioFile(file);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    if (audioUrl) {
      revokeAudioUrl(audioUrl);
    }

    const url = createAudioUrl(file);
    setAudioUrl(url);
    onFileSelect(file);
  }, [onFileSelect, audioUrl]);

  const handleRemoveFile = useCallback(() => {
    if (audioUrl) {
      revokeAudioUrl(audioUrl);
    }
    setAudioUrl(null);
    setError(null);
    onFileRemove();
  }, [audioUrl, onFileRemove]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 
          text-center cursor-pointer 
          transition-all duration-200
          ${isDragActive 
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {!selectedFile ? (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {isDragActive ? 'Drop your audio file here' : 'Upload your audio file'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Drag and drop an MP3, WAV, or FLAC file, or click to browse
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Maximum file size: {formatFileSize(AUDIO_CONFIG.MAX_FILE_SIZE)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Music className="mx-auto h-12 w-12 text-green-500 dark:text-green-400" />
              <button
                onClick={handleRemoveFile}
                disabled={isProcessing}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {selectedFile && audioUrl && (
        <AudioPlayer
          audioUrl={audioUrl}
          title="Audio Preview"
        />
      )}
    </div>
  );
};

export default AudioUpload; 