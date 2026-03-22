import { create } from 'zustand';
import type { DetectedPitch, AudioPipelineStatus } from '../types/audio';
import { frequencyToNote, frequencyToMidi } from '../utils/noteUtils';

interface AudioStoreState {
  status: AudioPipelineStatus;
  error: string | null;
  detectedPitch: DetectedPitch | null;
  isListening: boolean;
  setStatus: (status: AudioPipelineStatus, error?: string | null) => void;
  setDetectedNote: (frequency: number | null, clarity: number) => void;
}

export const useAudioStore = create<AudioStoreState>((set) => ({
  status: 'idle',
  error: null,
  detectedPitch: null,
  isListening: false,
  setStatus: (status, error = null) => set({
    status,
    error,
    isListening: status === 'listening',
  }),
  setDetectedNote: (frequency, clarity) => set({
    detectedPitch: frequency
      ? {
          frequency,
          clarity,
          noteName: frequencyToNote(frequency),
          midiNumber: frequencyToMidi(frequency),
        }
      : null,
  }),
}));
