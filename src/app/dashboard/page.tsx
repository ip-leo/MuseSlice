'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { LogOut, User, Music, Download, Calendar, FileAudio } from 'lucide-react';
import { loadStats, deriveSimpleFromAudioFiles, SimpleHistoryItem } from '@/lib/stats';

interface AudioFile {
  id: string;
  originalFileName: string;
  originalFileSize: number;
  originalFileType: string;
  uploadedAt: string;
  processingStatus: string;
  detectedInstruments: string;
  selectedInstruments: string;
  downloadCount: number;
  lastDownloadedAt: string | null;
}

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [simpleTotalFiles, setSimpleTotalFiles] = useState<number>(0);
  const [simpleTotalDownloads, setSimpleTotalDownloads] = useState<number>(0);
  const [simpleHistory, setSimpleHistory] = useState<SimpleHistoryItem[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  const fetchUserAudioFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/user/audio-files');
      if (response.ok) {
        const data = await response.json();
        setAudioFiles(data.audioFiles);
        try {
          const s = deriveSimpleFromAudioFiles(data.audioFiles || []);
          setSimpleTotalFiles(s.totalFiles);
          setSimpleTotalDownloads(s.totalDownloads);
          setSimpleHistory(s.history);
        } catch {}
      }
    } catch (error) {
      console.error('Error fetching audio files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserAudioFiles();
    }

    try {
      const s = loadStats(user?.id);
      setSimpleTotalFiles(s.totalFiles);
      setSimpleTotalDownloads(s.totalDownloads);
      setSimpleHistory(s.history);
    } catch {}
  }, [user, fetchUserAudioFiles]);


  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/');
  }, [logout, router]);

  const handleClearHistory = useCallback(async () => {
    if (!user) return;
    const confirmed = typeof window === 'undefined' ? true : window.confirm('Clear your processing history? This cannot be undone.');
    if (!confirmed) return;
    try {
      setIsClearing(true);
      const res = await fetch('/api/user/audio-files/clear', { method: 'DELETE' });
      if (!res.ok) {
        console.error('Failed to clear history');
      }

      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`ms_stats:${user.id}`);
          localStorage.removeItem('ms_stats:anon');
          localStorage.removeItem('vs_stats');
        }
      } catch {}

      setSimpleTotalFiles(0);
      setSimpleTotalDownloads(0);
      setSimpleHistory([]);
      await fetchUserAudioFiles();
    } finally {
      setIsClearing(false);
    }
  }, [user, fetchUserAudioFiles]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  }, []);

  const totalDownloadsDb = useMemo(() => 
    audioFiles.reduce((sum, file) => sum + file.downloadCount, 0), 
    [audioFiles]
  );

  const totalFilesDisplay = simpleTotalFiles || audioFiles.length;
  const totalDownloadsDisplay = simpleTotalDownloads || totalDownloadsDb;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <ThemeToggle />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors duration-300">
              Welcome back, {user.name || user.email}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <Music className="w-4 h-4 mr-2" />
              New Processing
            </button>
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {isClearing ? 'Clearing…' : 'Clear History'}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileAudio className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Files
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {totalFilesDisplay}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Downloads
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {totalDownloadsDisplay}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Member Since
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Shows your latest processed files (account)</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {simpleHistory.length === 0 ? (
              <div className="p-6 text-center">
                <FileAudio className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Process an audio file to see it here.</p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Process Audio
                  </button>
                </div>
              </div>
            ) : (
              simpleHistory.map((item, idx) => (
                <div key={`${item.timestamp}-${idx}`} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <FileAudio className="h-5 w-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.fileName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Instruments: {item.instruments.join(', ')}</p>
                          <p className="text-xs text-gray-400">Tracks: {item.tracks.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 dark:text-white">{formatDate(item.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
