export interface DetectedPitch {
  frequency: number;
  clarity: number;
  noteName: string;
  midiNumber: number;
}

export type AudioPipelineStatus = 'idle' | 'requesting' | 'listening' | 'error';

export interface AudioPipelineState {
  status: AudioPipelineStatus;
  error: string | null;
}

export interface PitchDetectorConfig {
  clarityThreshold: number;  // 0-1, default 0.9
  minFrequency: number;      // Hz, default 27.5 (A0)
  maxFrequency: number;      // Hz, default 4186 (C8)
}

export const DEFAULT_PITCH_CONFIG: PitchDetectorConfig = {
  clarityThreshold: 0.9,
  minFrequency: 27.5,
  maxFrequency: 4186,
};
