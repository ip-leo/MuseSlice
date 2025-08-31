export type SimpleHistoryItem = {
  timestamp: string; 
  fileName: string;
  instruments: string[]; 
  tracks: string[];
};

export type SimpleStats = {
  totalFiles: number;
  totalDownloads: number;
  history: SimpleHistoryItem[];
};

const LEGACY_KEY = 'vs_stats';

function keyFor(memberId?: string | null) {
  if (memberId && memberId.trim().length > 0) return `ms_stats:${memberId}`;
  return 'ms_stats:anon';
}

export function loadStats(memberId?: string | null): SimpleStats {
  if (typeof window === 'undefined') return { totalFiles: 0, totalDownloads: 0, history: [] };
  try {
    const bucketKey = keyFor(memberId);
    let raw = window.localStorage.getItem(bucketKey);
    if (!raw) {
      const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          const migrated: SimpleStats = {
            totalFiles: Number(parsedLegacy.totalFiles) || 0,
            totalDownloads: Number(parsedLegacy.totalDownloads) || 0,
            history: Array.isArray(parsedLegacy.history) ? parsedLegacy.history : [],
          };
          window.localStorage.removeItem(LEGACY_KEY);
          return migrated;
        } catch {
          window.localStorage.removeItem(LEGACY_KEY);
        }
      }
    }

    if (!raw) return { totalFiles: 0, totalDownloads: 0, history: [] };
    const parsed = JSON.parse(raw);
    return {
      totalFiles: Number(parsed.totalFiles) || 0,
      totalDownloads: Number(parsed.totalDownloads) || 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { totalFiles: 0, totalDownloads: 0, history: [] };
  }
}

export function saveStats(stats: SimpleStats, memberId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(memberId), JSON.stringify(stats));
  } catch {}
}

export function recordSeparation(fileName: string, instruments: string[], tracks: string[], memberId?: string | null) {
  const s = loadStats(memberId);
  s.totalFiles += 1;
  s.history.unshift({ timestamp: new Date().toISOString(), fileName, instruments, tracks });
  if (s.history.length > 20) s.history = s.history.slice(0, 20);
  saveStats(s, memberId);
}

export function recordDownload(count: number = 1, memberId?: string | null) {
  const s = loadStats(memberId);
  s.totalDownloads += count;
  saveStats(s, memberId);
}

export function deriveSimpleFromAudioFiles(audioFiles: any[]): SimpleStats {
  try {
    const totalFiles = Array.isArray(audioFiles) ? audioFiles.length : 0;
    const totalDownloads = Array.isArray(audioFiles)
      ? audioFiles.reduce((sum: number, f: any) => sum + (Number(f.downloadCount) || 0), 0)
      : 0;

    const history: SimpleHistoryItem[] = (audioFiles || []).slice(0, 20).map((f: any) => {
      const ts = f.processingCompletedAt || f.uploadedAt || new Date().toISOString();
      const fileName = f.originalFileName || f.name || 'audio';
      let instruments: string[] = [];
      const sel = f.selectedInstruments || f.detectedInstruments || [];
      try {
        if (typeof sel === 'string') {
          const parsed = JSON.parse(sel);
          instruments = Array.isArray(parsed) ? parsed.map((x: any) => x.name || String(x)) : [];
        } else if (Array.isArray(sel)) {
          instruments = sel.map((x: any) => x.name || String(x));
        }
      } catch { instruments = []; }
      let tracks: string[] = [];
      const sep = f.separatedTracks || [];
      try {
        if (typeof sep === 'string') {
          const parsed = JSON.parse(sep);
          tracks = Array.isArray(parsed) ? parsed.map((t: any) => t.name || String(t)) : [];
        } else if (Array.isArray(sep)) {
          tracks = sep.map((t: any) => t.name || String(t));
        }
      } catch { tracks = []; }

      return { timestamp: new Date(ts).toISOString(), fileName, instruments, tracks };
    });

    return { totalFiles, totalDownloads, history };
  } catch {
    return { totalFiles: 0, totalDownloads: 0, history: [] };
  }
}

