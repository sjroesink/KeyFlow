import { describe, it, expect } from 'vitest';
import { evaluateNotes } from './NoteEvaluator';

describe('evaluateNotes', () => {
  it('returns matched=true for empty expected (trivially matched)', () => {
    const result = evaluateNotes([], []);
    expect(result.matched).toBe(true);
    expect(result.matchedCount).toBe(0);
    expect(result.totalExpected).toBe(0);
  });

  it('returns matched=true for single exact note match', () => {
    const result = evaluateNotes([60], [60]);
    expect(result.matched).toBe(true);
    expect(result.matchedCount).toBe(1);
  });

  it('returns matched=true with pitch-class matching (60 and 72 are both C)', () => {
    const result = evaluateNotes([60], [72]);
    expect(result.matched).toBe(true);
    expect(result.matchedCount).toBe(1);
  });

  it('returns matched=true for exact C major chord', () => {
    const result = evaluateNotes([60, 64, 67], [60, 64, 67]);
    expect(result.matched).toBe(true);
    expect(result.matchedCount).toBe(3);
  });

  it('returns matched=true for partial chord match at threshold 0.66', () => {
    // 2/3 = 0.6667 >= 0.66
    const result = evaluateNotes([60, 64, 67], [60, 64], { matchThreshold: 0.66 });
    expect(result.matched).toBe(true);
    expect(result.matchedCount).toBe(2);
  });

  it('returns matched=false for insufficient partial match at threshold 0.66', () => {
    // 1/3 = 0.333 < 0.66
    const result = evaluateNotes([60, 64, 67], [60], { matchThreshold: 0.66 });
    expect(result.matched).toBe(false);
    expect(result.matchedCount).toBe(1);
  });

  it('returns matched=false for wrong pitch classes', () => {
    const result = evaluateNotes([60, 64], [61, 65]);
    expect(result.matched).toBe(false);
    expect(result.matchedCount).toBe(0);
  });

  it('uses threshold 1.0 for single expected notes (exact pitch class required)', () => {
    // Single note: must match exactly (pitch class)
    const result = evaluateNotes([60], [61]);
    expect(result.matched).toBe(false);
  });

  it('populates expectedPitchClasses and detectedPitchClasses', () => {
    const result = evaluateNotes([60, 64], [60, 67]);
    expect(result.expectedPitchClasses).toContain(0);  // C
    expect(result.expectedPitchClasses).toContain(4);  // E
    expect(result.detectedPitchClasses).toContain(0);  // C
    expect(result.detectedPitchClasses).toContain(7);  // G
  });
});
