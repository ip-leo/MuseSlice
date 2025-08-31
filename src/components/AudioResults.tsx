'use client';

import React, { useState } from 'react';
import { Download, Mic, Drum, Guitar, Music } from 'lucide-react';
import { AudioResultsProps } from '../types/audio';
import AudioPlayer from './AudioPlayer';

const AudioResults: React.FC<AudioResultsProps> = ({ tracks, onDownload, onDownloadAll }) => {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'vocals':
        return <Mic className="h-5 w-5 text-blue-600" />;
      case 'drums':
        return <Drum className="h-5 w-5 text-red-600" />;
      case 'bass':
        return <Guitar className="h-5 w-5 text-green-600" />;
      default:
        return <Music className="h-5 w-5 text-purple-600" />;
    }
  };

  if (tracks.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Separated Tracks</h2>
        <p className="text-gray-600">
          Your audio has been successfully separated
        </p>
      </div>

      <div className="grid gap-6">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-white border border-gray-200 
              rounded-lg p-6 shadow-sm dark:bg-gray-800 
              dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTrackIcon(track.type)}
                <div>
                  <h3 className="text-lg font-medium 
                    text-gray-900 capitalize 
                    dark:text-white">
                    {track.name}
                  </h3>
                  {track.duration && (
                    <p className="text-sm text-gray-500">
                      Duration: {track.duration}s
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onDownload(track.id)}
                  className="flex items-center space-x-1 px-3 py-1 
                    bg-green-600 text-white rounded-md 
                    hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <AudioPlayer 
              audioUrl={track.url}
              title={track.name}
            />
          </div>
        ))}
      </div>

      <div className="text-center pt-6">
        <button
          onClick={async () => {
            if (onDownloadAll) {
              setDownloadingAll(true);
              try { onDownloadAll(); } finally { setDownloadingAll(false); }
              return;
            }
            
            setDownloadingAll(true);
            for (const track of tracks) {
              try { onDownload(track.id); } catch {}
              await new Promise(r => setTimeout(r, 400));
            }
            setDownloadingAll(false);
          }}
          disabled={downloadingAll}
          className="inline-flex items-center space-x-2 px-6 py-3 
            bg-gray-600 text-white rounded-lg hover:bg-gray-700 
            transition-colors disabled:opacity-60"
        >
          <Download className="h-5 w-5" />
          <span>{downloadingAll ? 'Preparing...' : 'Download All Tracks'}</span>
        </button>
      </div>
    </div>
  );
};

export default AudioResults; 
