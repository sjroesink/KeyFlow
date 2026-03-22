import { describe, it, expect } from 'vitest';
import { frequencyToNote, frequencyToMidi, isNoteMatch } from './noteUtils';

describe('frequencyToNote', () => {
  it('converts 440 Hz to A4', () => {
    expect(frequencyToNote(440)).toBe('A4');
  });
  it('converts 261.63 Hz to C4', () => {
    expect(frequencyToNote(261.63)).toBe('C4');
  });
  it('converts 329.63 Hz to E4', () => {
    expect(frequencyToNote(329.63)).toBe('E4');
  });
});

describe('frequencyToMidi', () => {
  it('converts 440 Hz to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });
  it('converts 261.63 Hz to MIDI 60', () => {
    expect(frequencyToMidi(261.63)).toBe(60);
  });
  it('converts 880 Hz to MIDI 81', () => {
    expect(frequencyToMidi(880)).toBe(81);
  });
});

describe('isNoteMatch', () => {
  it('returns true for exact match (440 Hz = MIDI 69)', () => {
    expect(isNoteMatch(440, 69)).toBe(true);
  });
  it('returns false for adjacent semitone (440 Hz != MIDI 70)', () => {
    expect(isNoteMatch(440, 70)).toBe(false);
  });
  it('returns true for slightly sharp within tolerance (442 Hz ~ MIDI 69)', () => {
    expect(isNoteMatch(442, 69, 50)).toBe(true);
  });
  it('returns true for slightly flat within tolerance (438 Hz ~ MIDI 69)', () => {
    expect(isNoteMatch(438, 69, 50)).toBe(true);
  });
});
