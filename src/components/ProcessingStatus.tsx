'use client';

import React, { useEffect, useState } from 'react';
import { Music, Sliders, Wrench, CheckCircle, Clock } from 'lucide-react';

interface ProcessingStatusProps {
  phase: 'idle' | 'detecting' | 'selecting' | 'separating' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  currentStepDetails?: string;
  error?: string | null;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  phase,
  progress,
  currentStep,
  currentStepDetails,
  error
}) => {
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (phase === 'detecting' || phase === 'separating') {
      if (!startTime) {
        setStartTime(Date.now());
      }
      
      if (startTime && progress > 5) { 
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedTotal = (elapsed / progress) * 100;
        const remaining = Math.max(0, estimatedTotal - elapsed);
        
        const bufferedRemaining = remaining * 1.3;
        
        if (bufferedRemaining > 120) {
          const minutes = Math.floor(bufferedRemaining / 60);
          setEstimatedTime(`${minutes}m`);
        } else if (bufferedRemaining > 60) {
          const minutes = Math.floor(bufferedRemaining / 60);
          const seconds = Math.floor(bufferedRemaining % 60);
          setEstimatedTime(`${minutes}m ${seconds}s`);
        } else if (bufferedRemaining > 15) {
          setEstimatedTime(`${Math.ceil(bufferedRemaining)}s`);
        } else {
          setEstimatedTime('Almost done...');
        }
      } else if (startTime && progress <= 5) {
        if (phase === 'detecting') {
          setEstimatedTime('15s - 45s');
        } else if (phase === 'separating') {
          setEstimatedTime('1m - 3m');
        }
      }
    } else {
      setStartTime(null);
      setEstimatedTime('');
    }
  }, [phase, progress, startTime]);

  if (phase === 'idle') {
    return null;
  }

  if (phase === 'error' && error) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Error</h3>
          </div>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <div className="flex justify-end">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getPhaseInfo = () => {
    switch (phase) {
      case 'detecting':
        return {
          title: 'Analysing Audio File',
          description: 'Detecting instruments and analysing audio...',
          icon: <Music className="w-5 h-5 text-purple-600" />
        };
      case 'selecting':
        return {
          title: 'Select Instruments',
          description: 'Choose which instruments to separate from the audio',
          icon: <Sliders className="w-5 h-5 text-purple-600" />
        };
      case 'separating':
        return {
          title: 'Separating Audio Tracks',
          description: 'Separating selected instruments with frequency-based filters...',
          icon: <Wrench className="w-5 h-5 text-purple-600" />
        };
      case 'completed':
        return {
          title: 'Processing Complete',
          description: 'Your audio tracks have been successfully separated',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />
        };
      default:
        return {
          title: 'Processing',
          description: 'Please wait...',
          icon: <Clock className="w-5 h-5 text-gray-500" />
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-lg">{phaseInfo.icon}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{phaseInfo.title}</h3>
        </div>
        
        <p className="text-gray-600 mb-4">{phaseInfo.description}</p>
        
        {currentStep && (
          <p className="text-sm text-gray-500 mb-4">{currentStep}</p>
        )}
        
        {currentStepDetails && (
          <p className="text-xs text-gray-400 mb-4">{currentStepDetails}</p>
        )}

        {(phase === 'detecting' || phase === 'separating') && (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {estimatedTime && (
              <p className="text-sm text-gray-500">
                Estimated time remaining: {estimatedTime}
              </p>
            )}
          </>
        )}

        {phase === 'completed' && (
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 
