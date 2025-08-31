'use client';

import React, { useCallback } from 'react';
import AudioUpload from '../components/AudioUpload';
import { ProcessingStatus } from '../components/ProcessingStatus';
import AudioResults from '../components/AudioResults';
import ThemeToggle from '../components/ThemeToggle';
import InstrumentDetection from '../components/InstrumentDetection';
import { useAudioProcessing } from '../hooks/useAudioProcessing';
import { useAuth } from '../contexts/AuthContext';
import { AUDIO_CONFIG } from '../constants/audio';
import { User, LogOut, LogIn } from 'lucide-react';

export default function Home() {
  const {
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
  } = useAudioProcessing();

  const { user, logout, isAuthenticated, isLoading } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 
      dark:bg-gray-900 py-12 
      transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 
              dark:text-white mb-4 
              transition-colors duration-300">
              MuseSlice
            </h1>
            <p className="text-xl text-gray-600 
              dark:text-gray-300 max-w-2xl mx-auto 
              transition-colors duration-300">
              Upload your music and separate it into individual tracks using audio filtering algorithms
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user?.name || user?.email}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <a
                    href="/dashboard"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    Dashboard
                  </a>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <a
                href="/auth"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </a>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {processingPhase === 'idle' && (
            <div className="space-y-6">
              <AudioUpload 
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                isProcessing={processingPhase !== 'idle'}
                selectedFile={selectedFile}
              />
              
              {selectedFile && (
                <div className="text-center">
                  <button
                    onClick={startDetection}
                    className="inline-flex items-center 
                      px-6 py-3 bg-indigo-600 
                      text-white font-medium rounded-lg 
                      hover:bg-indigo-700 transition-colors"
                  >
                    Detect Instruments
                  </button>
                </div>
              )}
            </div>
          )}

          {processingPhase === 'detecting' && (
            <ProcessingStatus
              phase="detecting"
              progress={progress}
              currentStep={currentStep}
              currentStepDetails={currentStepDetails}
              error={error || undefined}
            />
          )}

          {processingPhase === 'selecting' && (
            <InstrumentDetection
              detectedInstruments={detectedInstruments}
              onInstrumentsSelected={handleInstrumentsSelected}
              onBack={() => {
                resetAll();
              }}
            />
          )}

          {processingPhase === 'separating' && (
            <ProcessingStatus
              phase="separating"
              progress={progress}
              currentStep={currentStep}
              currentStepDetails={currentStepDetails}
              error={error || undefined}
            />
          )}

          {processingPhase === 'completed' && separatedTracks.length > 0 && (
            <div className="space-y-6">
              <AudioResults 
                tracks={separatedTracks}
                onDownload={handleDownload}
                onDownloadAll={handleDownloadAll}
              />
              
              <div className="text-center">
                <button
                  onClick={resetAll}
                  className="inline-flex items-center 
                    px-6 py-3 bg-gray-600 
                    text-white font-medium rounded-lg 
                    hover:bg-gray-700 transition-colors"
                >
                  Process Another File
                </button>
              </div>
            </div>
          )}

          {processingPhase === 'error' && (
            <div className="text-center space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border 
                border-red-200 dark:border-red-800 
                rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
                <button
                  onClick={resetAll}
                  className="inline-flex items-center px-4 py-2 
                    bg-red-600 text-white font-medium rounded-md 
                    hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 
            rounded-full p-3 w-16 h-16 mx-auto mb-4 flex 
            items-center justify-center">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" 
                fill="none" stroke="currentColor" 
                viewBox="0 0 24 24">
                <path strokeLinecap="round" 
                  strokeLinejoin="round" strokeWidth={2} 
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium 
              text-gray-900 dark:text-white mb-2 
              transition-colors duration-300">Easy Upload</h3>
            <p className="text-gray-600 dark:text-gray-300 
              transition-colors duration-300">
                Simply drag and drop your audio file to get started
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/30 
              rounded-full p-3 w-16 h-16 mx-auto mb-4 flex 
              items-center justify-center">
              <svg className="w-8 h-8 text-gray-600 
                dark:text-gray-400" 
                fill="none" stroke="currentColor" 
                viewBox="0 0 24 24">
                <path strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 
              dark:text-white mb-2 
              transition-colors duration-300">Fast Processing</h3>
            <p className="text-gray-600 
              dark:text-gray-300 
              transition-colors duration-300">
                Efficient frequency filtering separates music tracks quickly
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 dark:bg-purple-900/30 
              rounded-full p-3 w-16 h-16 mx-auto mb-4 flex 
              items-center justify-center">
              <svg className="w-8 h-8 text-purple-600 
                dark:text-purple-400" 
                fill="none" stroke="currentColor" 
                viewBox="0 0 24 24">
                <path strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 
              dark:text-white mb-2 
              transition-colors duration-300">Instant Download</h3>
            <p className="text-gray-600 dark:text-gray-400 
              transition-colors duration-300">
              Download tracks in high quality formats
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
