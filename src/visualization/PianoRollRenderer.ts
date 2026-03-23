import type { SongNote } from '../types/song';
import { getVisibleNotes } from './noteSearch';
import { NOTE_COLORS, isBlackKey } from './colors';

const MIN_MIDI = 21;  // A0
const MAX_MIDI = 108; // C8
const TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1; // 88

export class PianoRollRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Draw falling notes for the given song time.
   * Notes fall from top to bottom. Play line at ~90% from top (10% from bottom).
   * viewWindow = seconds of song visible above the play line (default 4s).
   */
  draw(currentTime: number, notes: SongNote[], viewWindow: number = 4): void {
    const { ctx } = this;
    const w = ctx.canvas.clientWidth;
    const h = ctx.canvas.clientHeight;
    const playLineY = h - 2; // Play line at very bottom — notes fall onto the keyboard below
    const keyWidth = w / TOTAL_KEYS;

    // Clear with background color
    ctx.fillStyle = NOTE_COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    // Draw visible notes
    const visible = getVisibleNotes(notes, currentTime, viewWindow);
    for (const note of visible) {
      const x = (note.midi - MIN_MIDI) * keyWidth;
      // Map time to Y: currentTime -> playLineY, currentTime + viewWindow -> 0
      const noteBottomY = playLineY - ((note.startTime - currentTime) / viewWindow) * playLineY;
      const noteTopY = noteBottomY - (note.duration / viewWindow) * playLineY;
      const noteHeight = Math.max(noteBottomY - noteTopY, 2);

      ctx.fillStyle = isBlackKey(note.midi)
        ? NOTE_COLORS.NOTE_BLACK_KEY
        : NOTE_COLORS.NOTE_WHITE_KEY;
      // Rounded rect with 3px radius
      ctx.beginPath();
      ctx.roundRect(x + 1, noteTopY, keyWidth - 2, noteHeight, 3);
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
