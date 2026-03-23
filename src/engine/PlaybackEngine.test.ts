import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackEngine } from './PlaybackEngine';
import type { SchedulerInstrument } from './NoteScheduler';
import { usePlaybackStore } from '../store/playbackStore';
import type { SongModel } from '../types/song';

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
  // Don't auto-call - tests control timing
  return 1;
}));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

function createMockAudioContext(startTime = 0): AudioContext {
  let _currentTime = startTime;
  return {
    get currentTime() {
      return _currentTime;
    },
    // Helper for tests to advance time
    _advanceTime(dt: number) {
      _currentTime += dt;
    },
  } as unknown as AudioContext;
}

function createMockInstrument(): SchedulerInstrument {
  return {
    start: vi.fn(),
    stop: vi.fn(),
  };
}

const testSong: SongModel = {
  name: 'Test Song',
  duration: 10,
  bpm: 120,
  timeSignature: [4, 4],
  notes: [
    { midi: 60, name: 'C4', startTime: 0.5, duration: 0.5, velocity: 0.8, track: 0 },
    { midi: 64, name: 'E4', startTime: 1.0, duration: 0.5, velocity: 0.8, track: 0 },
  ],
  trackCount: 1,
  trackNames: ['Piano'],
};

describe('PlaybackEngine', () => {
  let engine: PlaybackEngine;
  let audioCtx: AudioContext & { _advanceTime: (dt: number) => void };
  let instrument: SchedulerInstrument;

  beforeEach(() => {
    audioCtx = createMockAudioContext() as AudioContext & { _advanceTime: (dt: number) => void };
    instrument = createMockInstrument();
    engine = new PlaybackEngine(audioCtx, instrument);
    usePlaybackStore.getState().reset();
  });

  afterEach(() => {
    engine.dispose();
  });

  it('currentTime returns 0 when not playing', () => {
    expect(engine.currentTime).toBe(0);
  });

  it('play sets status to playing in store', () => {
    engine.setSong(testSong);
    engine.play();
    expect(usePlaybackStore.getState().status).toBe('playing');
  });

  it('pause sets status to paused and preserves currentTime', () => {
    engine.setSong(testSong);
    engine.play();
    audioCtx._advanceTime(2.5);
    engine.pause();

    expect(usePlaybackStore.getState().status).toBe('paused');
    expect(engine.currentTime).toBeCloseTo(2.5, 1);
  });

  it('seek updates startOffset and reschedules from new position', () => {
    engine.setSong(testSong);
    engine.seek(5.0);
    expect(engine.currentTime).toBeCloseTo(5.0, 1);
    expect(usePlaybackStore.getState().currentTime).toBeCloseTo(5.0, 1);
  });

  it('seek calls instrument.stop to clear scheduled notes', () => {
    engine.setSong(testSong);
    engine.play();
    engine.seek(3.0);
    expect(instrument.stop).toHaveBeenCalled();
  });

  it('setSong sets duration and status to ready', () => {
    engine.setSong(testSong);
    expect(usePlaybackStore.getState().duration).toBe(10);
    expect(usePlaybackStore.getState().status).toBe('ready');
  });

  it('stop resets everything', () => {
    engine.setSong(testSong);
    engine.play();
    audioCtx._advanceTime(2);
    engine.stop();
    expect(engine.currentTime).toBe(0);
    expect(usePlaybackStore.getState().status).toBe('idle');
  });
});
