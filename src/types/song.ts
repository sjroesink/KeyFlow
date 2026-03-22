export interface SongNote {
  midi: number;        // MIDI number (60 = C4)
  name: string;        // "C4", "F#3", etc.
  startTime: number;   // seconds
  duration: number;    // seconds
  velocity: number;    // 0-1 normalized
  track: number;       // track index
}

export interface SongModel {
  name: string;
  duration: number;         // total duration in seconds
  bpm: number;
  timeSignature: [number, number];
  notes: SongNote[];        // sorted by startTime
  trackCount: number;
  trackNames: string[];
}
