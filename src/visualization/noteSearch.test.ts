import { describe, it, expect } from 'vitest';
import { getVisibleNotes, getActiveNotes } from './noteSearch';
import type { SongNote } from '../types/song';

function makeNote(overrides: Partial<SongNote> & { midi: number; startTime: number }): SongNote {
  return {
    name: 'C4',
    duration: 0.5,
    velocity: 0.8,
    track: 0,
    ...overrides,
  };
}

describe('getVisibleNotes', () => {
  it('returns empty array for empty notes', () => {
    expect(getVisibleNotes([], 0, 4)).toEqual([]);
  });

  it('returns notes within [currentTime, currentTime + viewWindow]', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 1.0, duration: 0.5 }),
      makeNote({ midi: 62, startTime: 2.0, duration: 0.5 }),
      makeNote({ midi: 64, startTime: 3.0, duration: 0.5 }),
    ];
    const result = getVisibleNotes(notes, 0, 4);
    expect(result).toHaveLength(3);
  });

  it('excludes notes entirely before currentTime', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 0, duration: 0.5 }),  // ends at 0.5
      makeNote({ midi: 62, startTime: 1, duration: 0.5 }),  // ends at 1.5
      makeNote({ midi: 64, startTime: 5, duration: 0.5 }),
    ];
    // At currentTime=2, the first two notes have ended
    const result = getVisibleNotes(notes, 2, 4);
    expect(result).toHaveLength(1);
    expect(result[0].midi).toBe(64);
  });

  it('excludes notes entirely after currentTime + viewWindow', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 1, duration: 0.5 }),
      makeNote({ midi: 62, startTime: 10, duration: 0.5 }), // far in the future
    ];
    const result = getVisibleNotes(notes, 0, 4);
    expect(result).toHaveLength(1);
    expect(result[0].midi).toBe(60);
  });

  it('includes notes partially overlapping the window (started before, still sounding)', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 0, duration: 3 }), // started at 0, ends at 3
    ];
    // At currentTime=2, this note is still sounding (0 + 3 > 2)
    const result = getVisibleNotes(notes, 2, 4);
    expect(result).toHaveLength(1);
    expect(result[0].midi).toBe(60);
  });
});

describe('getActiveNotes', () => {
  it('returns MIDI numbers of notes active at currentTime', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 1.0, duration: 1.0 }),  // active 1.0-2.0
      makeNote({ midi: 64, startTime: 1.5, duration: 1.0 }),  // active 1.5-2.5
      makeNote({ midi: 67, startTime: 3.0, duration: 0.5 }),  // not active at 1.5
    ];
    const result = getActiveNotes(notes, 1.5);
    expect(result).toContain(60);
    expect(result).toContain(64);
    expect(result).not.toContain(67);
  });

  it('returns empty array when no notes are active', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 5, duration: 0.5 }),
    ];
    expect(getActiveNotes(notes, 0)).toEqual([]);
  });

  it('returns unique MIDI numbers', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 1.0, duration: 1.0 }),
      makeNote({ midi: 60, startTime: 1.2, duration: 0.5 }),  // same MIDI, overlapping
    ];
    const result = getActiveNotes(notes, 1.3);
    expect(result).toEqual([60]);
  });
});
