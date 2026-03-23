import type { SongNote } from '../types/song';
import { getVisibleNotes } from './noteSearch';
import { NOTE_COLORS, isBlackKey } from './colors';

const MIN_MIDI = 21;  // A0
const MAX_MIDI = 108; // C8
const WHITE_KEY_WIDTH = 44; // px — matches CSS .piano-key-white

/**
 * Build a lookup table mapping MIDI note number to x-position and width
 * that matches the CSS piano keyboard layout exactly.
 * White keys: 44px wide, laid out sequentially.
 * Black keys: 28px wide, centered between their adjacent white keys.
 */
function buildKeyPositions(): Map<number, { x: number; width: number }> {
  const positions = new Map<number, { x: number; width: number }>();
  let whiteX = 0;

  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
    if (isBlackKey(midi)) {
      // Black key sits between the previous and next white key
      const bw = 28;
      positions.set(midi, { x: whiteX - bw / 2, width: bw });
    } else {
      positions.set(midi, { x: whiteX, width: WHITE_KEY_WIDTH });
      whiteX += WHITE_KEY_WIDTH;
    }
  }

  return positions;
}

const KEY_POSITIONS = buildKeyPositions();

export class PianoRollRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw falling notes for the given song time.
   * Notes fall from top to bottom. Play line at very bottom.
   * viewWindow = seconds of song visible above the play line (default 4s).
   */
  draw(currentTime: number, notes: SongNote[], viewWindow: number = 4): void {
    const { ctx } = this;
    const w = ctx.canvas.clientWidth;
    const h = ctx.canvas.clientHeight;
    const playLineY = h - 2;

    // Clear with background color
    ctx.fillStyle = NOTE_COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    // Scale factor: canvas width vs keyboard pixel width (52 white keys * 44px)
    const keyboardWidth = 52 * WHITE_KEY_WIDTH; // 2288
    const scale = w / keyboardWidth;

    // Draw visible notes — positioned to match the keyboard below
    const visible = getVisibleNotes(notes, currentTime, viewWindow);
    for (const note of visible) {
      const keyPos = KEY_POSITIONS.get(note.midi);
      if (!keyPos) continue;

      const x = keyPos.x * scale;
      const noteWidth = keyPos.width * scale;

      // Map time to Y: currentTime -> playLineY, future -> 0
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
