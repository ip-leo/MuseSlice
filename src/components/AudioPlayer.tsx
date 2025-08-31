'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { formatDuration } from '../utils/audio';
import { useWaveform } from '../hooks/useWaveform';
import { WAVEFORM_CONFIG } from '../constants/audio';
import { useTheme } from '../contexts/ThemeContext';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title, className = '' }) => {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  

  const waveformConfig = useMemo(() => {
    const baseConfig = WAVEFORM_CONFIG.DEFAULT;
    
    if (theme === 'dark') {
      return {
        ...baseConfig,
        waveColor: '#6366f1',      
        progressColor: '#8b5cf6',     
        cursorColor: '#f1f5f9',      
      };
    }
    
    return {
      ...baseConfig,
      waveColor: '#4f46e5',         
      progressColor: '#7c3aed',      
      cursorColor: '#1e293b',      
    };
  }, [theme]);
  
  const { 
    containerRef, 
    loadAudio, 
    playPause, 
    stop, 
    seekTo, 
    getCurrentTime, 
    getDuration,
    setWaveformVolume,
    getWaveformVolume
  } = useWaveform(waveformConfig);

  useEffect(() => {
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  }, [audioUrl, loadAudio]);

  useEffect(() => {
    setWaveformVolume(volume);
  }, [volume, setWaveformVolume]);


  useEffect(() => {
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  }, [theme, audioUrl, loadAudio]);


  useEffect(() => {
    console.log('AudioPlayer: audioUrl changed to', audioUrl);
    console.log('AudioPlayer: theme is', theme);
  }, [audioUrl, theme]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        const time = getCurrentTime();
        const dur = getDuration();
        setCurrentTime(time);
        setDuration(dur);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, getCurrentTime, getDuration]);

  const handlePlayPause = () => {
    playPause();
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickPercent = clickX / progressWidth;
    
    const newTime = clickPercent * duration;
    seekTo(newTime);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setWaveformVolume(newVolume);
  };

  const formatTime = (time: number) => {
    return formatDuration(time);
  };

  return (
    <div className={`audio-player ${className}`}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 
          dark:text-white mb-3 transition-colors duration-300">
            {title}
        </h3>
      )}
      
      <div 
        ref={containerRef}
        className="waveform-container mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600"
        style={{ minHeight: '80px' }}
      >
      </div>
      
      <div className="mb-4">
        <div
          ref={progressRef}
          className="progress-bar w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors duration-300"
          onClick={handleProgressClick}
        >
          <div
            className="progress-fill bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-100 ease-out relative"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="progress-handle" />
          </div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2 transition-colors duration-300">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="audio-controls">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayPause}
            className="control-button primary w-10 h-10"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>
          
          <button
            onClick={handleStop}
            className="control-button secondary w-8 h-8"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="volume-control">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className="control-button tertiary w-8 h-8"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          
          {showVolume && (
            <div
              ref={volumeRef}
              className="volume-popup"
            >
              <div className="flex items-center space-x-2">
                <Volume2 className="h-4 w-4 text-gray-600 dark:text-gray-400 transition-colors duration-300" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 slider bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 transition-colors duration-300">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer; 