import { create } from 'zustand';
import type { PlaybackStatus } from '../types/playback';

interface PlaybackStoreState {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  activeNotes: number[];
  setStatus: (status: PlaybackStatus) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setActiveNotes: (notes: number[]) => void;
  reset: () => void;
}

export const usePlaybackStore = create<PlaybackStoreState>((set) => ({
  status: 'idle',
  currentTime: 0,
  duration: 0,
  activeNotes: [],
  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setActiveNotes: (activeNotes) => set({ activeNotes }),
  reset: () => set({ status: 'idle', currentTime: 0, duration: 0, activeNotes: [] }),
}));
