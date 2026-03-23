import type { SongModel } from '../types/song';
import { NoteScheduler, type SchedulerInstrument } from './NoteScheduler';
import { PianoRollRenderer } from '../visualization/PianoRollRenderer';
import { getActiveNotes } from '../visualization/noteSearch';
import { usePlaybackStore } from '../store/playbackStore';
import { usePracticeStore } from '../store/practiceStore';
import { evaluateNotes } from './NoteEvaluator';

const STORE_SYNC_INTERVAL = 1000 / 15; // ~15Hz sync to React

export class PlaybackEngine {
  private audioContext: AudioContext;
  private scheduler: NoteScheduler;
  private renderer: PianoRollRenderer | null = null;
  private song: SongModel | null = null;

  private startOffset = 0;       // song position when play was pressed
  private startClockTime = 0;    // AudioContext.currentTime when play was pressed
  private playing = false;
  private rafId: number | null = null;
  private lastStoreSync = 0;

  // Practice mode state
  private practiceEnabled = false;
  private frozenTime: number | null = null;
  private waitingForNotes: number[] = [];

  constructor(audioContext: AudioContext, instrument: SchedulerInstrument) {
    this.audioContext = audioContext;
    this.scheduler = new NoteScheduler(instrument);
  }

  /** Attach canvas renderer (called when canvas ref is ready) */
  setRenderer(renderer: PianoRollRenderer): void {
    this.renderer = renderer;
  }

  /** Load a song for playback */
  setSong(song: SongModel): void {
    this.song = song;
    usePlaybackStore.getState().setDuration(song.duration);
    usePlaybackStore.getState().setStatus('ready');
  }

  /** Current song position in seconds */
  get currentTime(): number {
    if (!this.playing) return this.startOffset;
    return this.startOffset + (this.audioContext.currentTime - this.startClockTime);
  }

  play(fromTime?: number): void {
    if (!this.song) return;
    if (fromTime !== undefined) this.startOffset = fromTime;
    this.startClockTime = this.audioContext.currentTime;
    this.playing = true;
    this.scheduler.reset(this.startOffset);
    usePlaybackStore.getState().setStatus('playing');
    this.tick();
  }

  pause(): void {
    this.startOffset = this.currentTime;
    this.playing = false;
    this.scheduler.stopAll();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    usePlaybackStore.getState().setStatus('paused');
  }

  seek(toTime: number): void {
    const wasPlaying = this.playing;
    if (wasPlaying) {
      this.playing = false;
      this.scheduler.stopAll();
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
    this.startOffset = Math.max(0, Math.min(toTime, this.song?.duration ?? 0));
    this.syncToStore(this.startOffset);
    if (wasPlaying) this.play();
    else usePlaybackStore.getState().setCurrentTime(this.startOffset);
  }

  stop(): void {
    this.pause();
    this.startOffset = 0;
    this.frozenTime = null;
    this.waitingForNotes = [];
    usePlaybackStore.getState().reset();
  }

  dispose(): void {
    this.stop();
    this.frozenTime = null;
    this.waitingForNotes = [];
    this.renderer = null;
    this.song = null;
  }

  /** Enable or disable practice (wait) mode */
  setPracticeEnabled(enabled: boolean): void {
    this.practiceEnabled = enabled;
    if (!enabled) {
      this.frozenTime = null;
      usePracticeStore.getState().setIsWaiting(false);
    }
  }

  /** Expose AudioContext for sharing with mic pipeline */
  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  private tick = (): void => {
    if (!this.playing || !this.song) return;

    // Wait-mode resume check: if frozen, see if user played correct notes
    if (this.practiceEnabled && this.frozenTime !== null) {
      const detected = usePracticeStore.getState().detectedChord;
      const result = evaluateNotes(this.waitingForNotes, detected);
      usePracticeStore.getState().setLastEvaluation(result);
      if (result.matched) {
        // Resume: recalibrate clock from frozen position
        this.startClockTime = this.audioContext.currentTime;
        this.startOffset = this.frozenTime;
        this.frozenTime = null;
        usePracticeStore.getState().setIsWaiting(false);
      } else {
        // Stay frozen: render at frozen time, schedule next frame, return
        this.renderer?.draw(this.frozenTime, this.song.notes);
        this.rafId = requestAnimationFrame(this.tick);
        return;
      }
    }

    const t = this.currentTime;

    // Loop boundary check
    const loopRegion = usePracticeStore.getState().loopRegion;
    if (loopRegion && t >= loopRegion.end) {
      this.seek(loopRegion.start);
      return;
    }

    // Auto-stop at end of song
    if (t >= this.song.duration) {
      this.pause();
      this.startOffset = 0;
      usePlaybackStore.getState().setCurrentTime(0);
      usePlaybackStore.getState().setStatus('ready');
      return;
    }

    // Wait-mode freeze check: freeze if expected notes don't match detected
    if (this.practiceEnabled) {
      const expected = getActiveNotes(this.song.notes, t);
      if (expected.length > 0) {
        const detected = usePracticeStore.getState().detectedChord;
        const result = evaluateNotes(expected, detected);
        usePracticeStore.getState().setLastEvaluation(result);
        if (!result.matched) {
          this.frozenTime = t;
          this.waitingForNotes = expected;
          usePracticeStore.getState().setIsWaiting(true, expected);
          // Sync active notes so keyboard highlights expected keys while waiting
          this.syncToStore(t);
          // Render frozen frame and continue loop
          this.renderer?.draw(t, this.song.notes);
          this.rafId = requestAnimationFrame(this.tick);
          return;
        }
      }
    }

    // Render canvas
    this.renderer?.draw(t, this.song.notes);

    // Schedule audio ahead
    this.scheduler.scheduleAhead(t, this.song.notes, this.audioContext.currentTime);

    // Sync to store at throttled rate
    const now = performance.now();
    if (now - this.lastStoreSync > STORE_SYNC_INTERVAL) {
      this.syncToStore(t);
      this.lastStoreSync = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private syncToStore(t: number): void {
    if (!this.song) return;
    const store = usePlaybackStore.getState();
    store.setCurrentTime(t);
    store.setActiveNotes(getActiveNotes(this.song.notes, t));
  }
}
