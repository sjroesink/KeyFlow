import { describe, it, expect, beforeEach } from 'vitest';
import { usePracticeStore } from './practiceStore';

describe('practiceStore', () => {
  beforeEach(() => {
    usePracticeStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = usePracticeStore.getState();
    expect(state.mode).toBe('off');
    expect(state.loopRegion).toBeNull();
    expect(state.isWaiting).toBe(false);
    expect(state.detectedChord).toEqual([]);
    expect(state.lastEvaluation).toBeNull();
    expect(state.waitingForNotes).toEqual([]);
  });

  it('setMode updates mode to waitMode', () => {
    usePracticeStore.getState().setMode('waitMode');
    expect(usePracticeStore.getState().mode).toBe('waitMode');
  });

  it('setLoopRegion sets a valid region', () => {
    usePracticeStore.getState().setLoopRegion({ start: 5, end: 10 });
    const region = usePracticeStore.getState().loopRegion;
    expect(region).toEqual({ start: 5, end: 10 });
  });

  it('setLoopRegion rejects region shorter than 1 second', () => {
    usePracticeStore.getState().setLoopRegion({ start: 5, end: 5.5 });
    expect(usePracticeStore.getState().loopRegion).toBeNull();
  });

  it('setLoopRegion(null) clears region', () => {
    usePracticeStore.getState().setLoopRegion({ start: 5, end: 10 });
    usePracticeStore.getState().setLoopRegion(null);
    expect(usePracticeStore.getState().loopRegion).toBeNull();
  });

  it('setIsWaiting(true, notes) sets isWaiting and waitingForNotes', () => {
    usePracticeStore.getState().setIsWaiting(true, [60, 64]);
    const state = usePracticeStore.getState();
    expect(state.isWaiting).toBe(true);
    expect(state.waitingForNotes).toEqual([60, 64]);
  });

  it('setIsWaiting(false) clears isWaiting and waitingForNotes', () => {
    usePracticeStore.getState().setIsWaiting(true, [60, 64]);
    usePracticeStore.getState().setIsWaiting(false);
    const state = usePracticeStore.getState();
    expect(state.isWaiting).toBe(false);
    expect(state.waitingForNotes).toEqual([]);
  });

  it('reset returns all fields to defaults', () => {
    usePracticeStore.getState().setMode('waitMode');
    usePracticeStore.getState().setLoopRegion({ start: 2, end: 8 });
    usePracticeStore.getState().setIsWaiting(true, [60]);
    usePracticeStore.getState().setDetectedChord([60, 64]);

    usePracticeStore.getState().reset();

    const state = usePracticeStore.getState();
    expect(state.mode).toBe('off');
    expect(state.loopRegion).toBeNull();
    expect(state.isWaiting).toBe(false);
    expect(state.waitingForNotes).toEqual([]);
    expect(state.detectedChord).toEqual([]);
    expect(state.lastEvaluation).toBeNull();
  });
});
