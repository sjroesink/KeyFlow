import { Note } from 'tonal';

/** Convert Hz to nearest note name (e.g. 440 -> "A4") */
export function frequencyToNote(hz: number): string {
  return Note.fromFreq(hz);
}

/** Convert Hz to MIDI number for comparison with MIDI file data */
export function frequencyToMidi(hz: number): number {
  return Math.round(12 * Math.log2(hz / 440) + 69);
}

/**
 * Check if detected frequency matches expected MIDI note within tolerance.
 * @param detectedHz - detected frequency in Hz
 * @param expectedMidi - expected MIDI note number
 * @param toleranceCents - tolerance in cents (default 50 = half semitone)
 */
export function isNoteMatch(
  detectedHz: number,
  expectedMidi: number,
  toleranceCents: number = 50
): boolean {
  const detectedMidi = 12 * Math.log2(detectedHz / 440) + 69;
  const diff = Math.abs(detectedMidi - expectedMidi);
  return diff < toleranceCents / 100;
}
