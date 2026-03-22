/** Colors for Canvas 2D rendering -- matches Nocturne design tokens */
export const NOTE_COLORS = {
  /** Falling note fill for white-key notes */
  NOTE_WHITE_KEY: '#b5c4ff',    // primary
  /** Falling note fill for black-key notes */
  NOTE_BLACK_KEY: '#8a9ad4',    // muted primary
  /** Active note (at play line) */
  NOTE_ACTIVE: '#e9c349',       // secondary (gold)
  /** Correct note (detected matches expected) */
  NOTE_CORRECT: '#66dd8b',      // tertiary (green)
  /** Error note (detected does not match expected) */
  NOTE_ERROR: '#ffb4ab',        // error (red)
  /** Play line */
  PLAY_LINE: '#e9c349',         // secondary
  /** Play line glow */
  PLAY_LINE_GLOW: 'rgba(233, 195, 73, 0.5)',
  /** Canvas background */
  CANVAS_BG: '#131b2e',         // surface-container-low
  /** Canvas bottom gradient overlay */
  CANVAS_GRADIENT_END: 'rgba(11, 19, 38, 0.4)', // surface/40
} as const;

/** Check if a MIDI note number is a black key */
export function isBlackKey(midi: number): boolean {
  const pc = midi % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}
