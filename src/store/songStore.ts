import { create } from 'zustand';
import type { SongModel } from '../types/song';

interface SongStoreState {
  song: SongModel | null;
  isLoading: boolean;
  error: string | null;
  setSong: (song: SongModel) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string) => void;
  clearSong: () => void;
}

export const useSongStore = create<SongStoreState>((set) => ({
  song: null,
  isLoading: false,
  error: null,
  setSong: (song) => set({ song, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearSong: () => set({ song: null, error: null }),
}));
