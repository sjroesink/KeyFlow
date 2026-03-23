import type { SongNote } from '../types/song';
import { getVisibleNotes } from './noteSearch';
import { NOTE_COLORS, isBlackKey } from './colors';

const MIN_MIDI = 21;  // A0
const MAX_MIDI = 108; // C8
const WHITE_KEYS = 52; // 88-key piano has 52 white keys

/**
 * Build a normalized lookup table (0..1 range) mapping MIDI note to
 * fractional x-position and width relative to keyboard total width.
 */
function buildNormalizedPositions(): Map<number, { xFrac: number; wFrac: number }> {
  const positions = new Map<number, { xFrac: number; wFrac: number }>();
  // Black key width as fraction of white key width (from CSS: 20/30 or 26/40 ≈ 0.65)
  const blackFrac = 0.65;
  let whiteIndex = 0;

  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
    if (isBlackKey(midi)) {
      const bw = blackFrac / WHITE_KEYS;
      positions.set(midi, { xFrac: (whiteIndex / WHITE_KEYS) - bw / 2, wFrac: bw });
    } else {
      positions.set(midi, { xFrac: whiteIndex / WHITE_KEYS, wFrac: 1 / WHITE_KEYS });
      whiteIndex++;
    }
  }

  return positions;
}

const NORM_POSITIONS = buildNormalizedPositions();

export class PianoRollRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  draw(currentTime: number, notes: SongNote[], viewWindow: number = 4): void {
    const { ctx } = this;
    const w = ctx.canvas.clientWidth;
    const h = ctx.canvas.clientHeight;
    const playLineY = h - 2;

    // Clear
    ctx.fillStyle = NOTE_COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    // Draw visible notes — positioned using normalized fractions
    const visible = getVisibleNotes(notes, currentTime, viewWindow);
    for (const note of visible) {
      const pos = NORM_POSITIONS.get(note.midi);
      if (!pos) continue;

      const x = pos.xFrac * w;
      const noteWidth = pos.wFrac * w;

      const noteBottomY = playLineY - ((note.startTime - currentTime) / viewWindow) * playLineY;
      const noteTopY = noteBottomY - (note.duration / viewWindow) * playLineY;
      const noteHeight = Math.max(noteBottomY - noteTopY, 2);

      ctx.fillStyle = isBlackKey(note.midi)
        ? NOTE_COLORS.NOTE_BLACK_KEY
        : NOTE_COLORS.NOTE_WHITE_KEY;
      ctx.beginPath();
      ctx.roundRect(x + 1, noteTopY, noteWidth - 2, noteHeight, 3);
      ctx.fill();
    }

    // Play line with glow
    ctx.shadowColor = NOTE_COLORS.PLAY_LINE_GLOW;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = NOTE_COLORS.PLAY_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, playLineY);
    ctx.lineTo(w, playLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
