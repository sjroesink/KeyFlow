import type { SongNote } from '../types/song';

/**
 * Binary search for notes visible in the current view window.
 * Returns notes where: note.startTime + note.duration > currentTime AND note.startTime < currentTime + viewWindow
 * Uses binary search to find the start index, then linear scan forward.
 * O(log n + k) where k is visible notes.
 */
export function getVisibleNotes(
  notes: SongNote[],
  currentTime: number,
  viewWindow: number,
): SongNote[] {
  if (notes.length === 0) return [];

  // Binary search: find first note where startTime + duration > currentTime
  // (i.e., note hasn't ended yet)
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].startTime + notes[mid].duration <= currentTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Linear scan forward collecting visible notes
  const end = currentTime + viewWindow;
  const result: SongNote[] = [];
  for (let i = lo; i < notes.length; i++) {
    if (notes[i].startTime >= end) break;
    result.push(notes[i]);
  }
  return result;
}

/**
 * Returns MIDI numbers of notes currently "active" at the play line.
 * A note is active when: note.startTime <= currentTime < note.startTime + note.duration
 */
export function getActiveNotes(
  notes: SongNote[],
  currentTime: number,
): number[] {
  // Use a small window around currentTime to find candidates
  const visible = getVisibleNotes(notes, currentTime, 0.001);
  const active: number[] = [];
  for (const note of visible) {
    if (note.startTime <= currentTime && currentTime < note.startTime + note.duration) {
      if (!active.includes(note.midi)) {
        active.push(note.midi);
      }
    }
  }
  return active;
}
