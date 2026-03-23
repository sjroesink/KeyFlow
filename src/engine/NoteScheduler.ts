import type { SongNote } from '../types/song';

const LOOKAHEAD = 0.1; // schedule 100ms ahead

export interface SchedulerInstrument {
  start(options: { note: number; velocity: number; time: number; duration: number }): void;
  stop(): void;
}

export class NoteScheduler {
  private scheduledUpTo = 0;
  private instrument: SchedulerInstrument;

  constructor(instrument: SchedulerInstrument) {
    this.instrument = instrument;
  }

  /**
   * Schedule notes that fall within [scheduledUpTo, currentTime + LOOKAHEAD].
   * Must be called every rAF frame.
   */
  scheduleAhead(currentTime: number, notes: SongNote[], audioCtxTime: number): void {
    const scheduleEnd = currentTime + LOOKAHEAD;
    for (const note of notes) {
      if (note.startTime >= this.scheduledUpTo && note.startTime < scheduleEnd) {
        const audioTime = audioCtxTime + (note.startTime - currentTime);
        this.instrument.start({
          note: note.midi,
          velocity: Math.round(note.velocity * 127),
          time: Math.max(audioTime, audioCtxTime), // never schedule in the past
          duration: note.duration,
        });
      }
    }
    this.scheduledUpTo = scheduleEnd;
  }

  /** Reset schedule pointer (after seek or stop) */
  reset(fromTime: number = 0): void {
    this.scheduledUpTo = fromTime;
  }

  /** Stop all currently playing notes */
  stopAll(): void {
    this.instrument.stop();
  }
}
