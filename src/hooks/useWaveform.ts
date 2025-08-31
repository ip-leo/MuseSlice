import { useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { WaveformConfig } from '../types/audio';

export const useWaveform = (config: WaveformConfig) => {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initializeWaveform = useCallback(() => {
    console.log('useWaveform: initializeWaveform called');
    console.log('useWaveform: containerRef.current', containerRef.current);
    console.log('useWaveform: wavesurferRef.current', wavesurferRef.current);
    
    if (containerRef.current && !wavesurferRef.current) {
      try {
        console.log('useWaveform: Creating Wave with config', config);
        wavesurferRef.current = WaveSurfer.create({
          container: containerRef.current,
          ...config,
        });
        console.log('useWaveform: Wave created successfully');
      } catch (error) {
        console.error('useWaveform: Error creating Wave', error);
      }
    }
  }, [config]);

  const loadAudio = useCallback((url: string) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.load(url);
    }
  }, []);

  const playPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  const play = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(time);
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    if (wavesurferRef.current) {
      return wavesurferRef.current.getCurrentTime();
    }
    return 0;
  }, []);

  const getDuration = useCallback(() => {
    if (wavesurferRef.current) {
      return wavesurferRef.current.getDuration();
    }
    return 0;
  }, []);

  const setWaveformVolume = useCallback((volume: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, []);

  const getWaveformVolume = useCallback(() => {
    if (wavesurferRef.current) {
      return wavesurferRef.current.getVolume();
    }
    return 1;
  }, []);

  const destroy = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
  }, []);

  useEffect(() => {
    initializeWaveform();

    return () => {
      destroy();
    };
  }, [initializeWaveform, destroy]);

  return {
    containerRef,
    wavesurferRef,
    loadAudio,
    playPause,
    play,
    pause,
    stop,
    seekTo,
    getCurrentTime,
    getDuration,
    setWaveformVolume,
    getWaveformVolume,
    destroy,
  };
}; 