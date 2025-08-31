'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Piano, Guitar, Drum, Music, CheckCircle, Loader2, Activity } from 'lucide-react';

interface DetectedInstrument {
  id: string;
  name: string;
  type: 'vocals' | 'piano' | 'guitar' | 'drums' | 'bass' | 'strings' | 'brass' | 'other';
  confidence: number;
  subParts?: string[];
  isSelected: boolean;
}

interface InstrumentDetectionProps {
  detectedInstruments: DetectedInstrument[];
  onInstrumentsSelected: (selectedInstruments: DetectedInstrument[]) => void;
  onBack: () => void;
}

const InstrumentDetection: React.FC<InstrumentDetectionProps> = ({
  detectedInstruments,
  onInstrumentsSelected,
  onBack
}) => {
  const [localInstruments, setLocalInstruments] = useState<DetectedInstrument[]>([]);

  useEffect(() => {
    setLocalInstruments(detectedInstruments);
  }, [detectedInstruments]);

  const toggleInstrumentSelection = (instrumentId: string) => {
    setLocalInstruments(prev => 
      prev.map(instrument => 
        instrument.id === instrumentId 
          ? { ...instrument, isSelected: !instrument.isSelected }
          : instrument
      )
    );
  };

  const handleStartSeparation = () => {
    const selectedInstruments = localInstruments.filter(instrument => instrument.isSelected);
    if (selectedInstruments.length > 0) {
      onInstrumentsSelected(selectedInstruments);
    }
  };

  const getInstrumentIcon = (type: string) => {
    switch (type) {
      case 'vocals': return <Mic className="h-5 w-5" />;
      case 'piano': return <Piano className="h-5 w-5" />;
      case 'guitar': return <Guitar className="h-5 w-5" />;
      case 'drums': return <Drum className="h-5 w-5" />;
      case 'bass': return <Music className="h-5 w-5" />;
      case 'strings': return <Music className="h-5 w-5" />;
      case 'brass': return <Music className="h-5 w-5" />;
      case 'other': return <Music className="h-5 w-5" />;
      default: return <Music className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Instruments Detected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select which instruments you want to separate
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Back
          </button>
        </div>

        {localInstruments.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading detected instruments...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {localInstruments.map((instrument) => (
              <div
                key={instrument.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${instrument.isSelected 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
                onClick={() => toggleInstrumentSelection(instrument.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      p-2 rounded-lg
                      ${instrument.isSelected 
                        ? 'bg-indigo-100 dark:bg-indigo-800' 
                        : 'bg-gray-100 dark:bg-gray-700'
                      }
                    `}>
                      {getInstrumentIcon(instrument.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {instrument.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${instrument.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {instrument.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {instrument.isSelected && (
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                </div>
                
                {instrument.subParts && instrument.subParts.length > 0 && (
                  <div className="mt-3 pl-11">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Sub-parts that will be separated:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {instrument.subParts.map((part, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded"
                        >
                          {part}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {localInstruments.filter(i => i.isSelected).length} instrument(s) selected
          </p>
          <button
            onClick={handleStartSeparation}
            disabled={localInstruments.filter(i => i.isSelected).length === 0}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Separation
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstrumentDetection; 