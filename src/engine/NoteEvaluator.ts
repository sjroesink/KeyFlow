import type { EvaluationResult } from '../types/practice';

export type { EvaluationResult };

export interface EvaluateNotesOptions {
  matchThreshold?: number;    // fraction, default 0.75 for chords
  useOctaveMatching?: boolean; // if true, exact MIDI; if false, pitch class (mod 12)
}

/**
 * Compare expected notes against detected notes using pitch-class matching.
 * Single expected notes require exact pitch-class match (threshold 1.0).
 * Chords use configurable threshold (default 0.75).
 */
export function evaluateNotes(
  expectedMidi: number[],
  detectedMidi: number[],
  options: EvaluateNotesOptions = {},
): EvaluationResult {
  const { useOctaveMatching = false } = options;

  if (expectedMidi.length === 0) {
    return {
      matched: true,
      expectedPitchClasses: [],
      detectedPitchClasses: [],
      matchedCount: 0,
      totalExpected: 0,
    };
  }

  const toSet = (midis: number[]) =>
    useOctaveMatching
      ? new Set(midis)
      : new Set(midis.map((m) => m % 12));

  const expectedSet = toSet(expectedMidi);
  const detectedSet = toSet(detectedMidi);

  let matchedCount = 0;
  for (const pc of expectedSet) {
    if (detectedSet.has(pc)) matchedCount++;
  }

  // Single notes always require exact pitch-class match (threshold 1.0)
  const threshold =
    expectedSet.size === 1 ? 1.0 : (options.matchThreshold ?? 0.75);

  const fraction = matchedCount / expectedSet.size;

  return {
    matched: fraction >= threshold,
    expectedPitchClasses: [...expectedSet],
    detectedPitchClasses: [...detectedSet],
    matchedCount,
    totalExpected: expectedSet.size,
  };
}
