import { create } from 'zustand';
import type { LoopRegion, PracticeMode, EvaluationResult } from '../types/practice';

interface PracticeStoreState {
  mode: PracticeMode;
  loopRegion: LoopRegion | null;
  detectedChord: number[];
  lastEvaluation: EvaluationResult | null;
  isWaiting: boolean;
  waitingForNotes: number[];

  setMode: (mode: PracticeMode) => void;
  setLoopRegion: (region: LoopRegion | null) => void;
  setDetectedChord: (notes: number[]) => void;
  setLastEvaluation: (result: EvaluationResult | null) => void;
  setIsWaiting: (waiting: boolean, notes?: number[]) => void;
  reset: () => void;
}

const initialState = {
  mode: 'off' as PracticeMode,
  loopRegion: null as LoopRegion | null,
  detectedChord: [] as number[],
  lastEvaluation: null as EvaluationResult | null,
  isWaiting: false,
  waitingForNotes: [] as number[],
};

export const usePracticeStore = create<PracticeStoreState>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setLoopRegion: (region) => {
    // Validate minimum 1 second duration
    if (region !== null && region.end - region.start < 1.0) {
      return; // Reject invalid region
    }
    set({ loopRegion: region });
  },

  setDetectedChord: (detectedChord) => set({ detectedChord }),

  setLastEvaluation: (lastEvaluation) => set({ lastEvaluation }),

  setIsWaiting: (waiting, notes) => {
    if (waiting) {
      set({ isWaiting: true, waitingForNotes: notes ?? [] });
    } else {
      set({ isWaiting: false, waitingForNotes: [] });
    }
  },

  reset: () => set({ ...initialState }),
}));
