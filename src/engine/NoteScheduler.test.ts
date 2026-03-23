import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteScheduler, type SchedulerInstrument } from './NoteScheduler';
import type { SongNote } from '../types/song';

function makeNote(overrides: Partial<SongNote> & { midi: number; startTime: number }): SongNote {
  return {
    name: 'C4',
    duration: 0.5,
    velocity: 0.8,
    track: 0,
    ...overrides,
  };
}

describe('NoteScheduler', () => {
  let instrument: SchedulerInstrument;
  let scheduler: NoteScheduler;

  beforeEach(() => {
    instrument = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    scheduler = new NoteScheduler(instrument);
  });

  it('schedules notes within lookahead window', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 0.05, velocity: 0.8 }),
      makeNote({ midi: 64, startTime: 0.5, velocity: 0.6 }),
    ];
    // currentTime=0, lookahead=0.1 => schedule notes in [0, 0.1)
    scheduler.scheduleAhead(0, notes, 10.0);

    expect(instrument.start).toHaveBeenCalledTimes(1);
    expect(instrument.start).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 60,
        velocity: Math.round(0.8 * 127),
      }),
    );
  });

  it('does not re-schedule already-scheduled notes', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 0.05 }),
    ];
    scheduler.scheduleAhead(0, notes, 10.0);
    expect(instrument.start).toHaveBeenCalledTimes(1);

    // Call again at same time - note should not be scheduled again
    scheduler.scheduleAhead(0, notes, 10.0);
    expect(instrument.start).toHaveBeenCalledTimes(1);
  });

  it('reset clears scheduledUpTo pointer', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 0.05 }),
    ];
    scheduler.scheduleAhead(0, notes, 10.0);
    expect(instrument.start).toHaveBeenCalledTimes(1);

    // Reset and schedule again - should re-schedule
    scheduler.reset(0);
    scheduler.scheduleAhead(0, notes, 10.0);
    expect(instrument.start).toHaveBeenCalledTimes(2);
  });

  it('stopAll calls instrument.stop', () => {
    scheduler.stopAll();
    expect(instrument.stop).toHaveBeenCalledTimes(1);
  });

  it('never schedules in the past', () => {
    const notes = [
      makeNote({ midi: 60, startTime: 0.05, velocity: 0.7 }),
    ];
    const audioCtxTime = 10.0;
    scheduler.scheduleAhead(0, notes, audioCtxTime);

    const call = (instrument.start as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.time).toBeGreaterThanOrEqual(audioCtxTime);
  });
});
