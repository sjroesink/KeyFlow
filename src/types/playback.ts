export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  currentTime: number;     // song position in seconds, synced from engine ~15Hz
  duration: number;        // song total duration in seconds
  activeNotes: number[];   // MIDI numbers of notes currently at the play line
}
