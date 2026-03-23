# Phase 3: Practice Core - Research

**Researched:** 2026-03-23
**Domain:** Polyphonic pitch detection, practice state machine, loop playback
**Confidence:** MEDIUM (chord detection is exploratory; wait mode and looping are well-understood patterns)

## Summary

Phase 3 adds three capabilities on top of the existing playback engine: (1) polyphonic/chord detection from microphone input, (2) wait mode that pauses song progression until the user plays the correct note(s), and (3) loop selection for repeated section practice. The hardest problem by far is chord detection -- there is no reliable JS library for polyphonic pitch detection from microphone audio. The recommended approach is a custom FFT peak-picking algorithm with harmonic filtering, operating on the existing `AnalyserNode`, combined with a tolerant "pitch class set" matching strategy that accepts partial chord matches. Wait mode is a state machine extension to `PlaybackEngine` that freezes time advancement. Loop mode stores start/end boundaries and resets playback position on reaching the end.

The existing codebase is well-structured for these additions. `PlaybackEngine` already uses `AudioContext.currentTime` as its clock, `PianoKeyboard` already supports expected/detected/correct/error highlight states, and `useAudioPipeline` already runs a detection loop via rAF. The main integration challenge is merging the mic detection pipeline with the playback engine so that detected notes flow into the wait-mode evaluator each frame.

**Primary recommendation:** Build chord detection as a separate `ChordDetector` class that wraps the existing `AnalyserNode` with `getFloatFrequencyData()` + peak picking. Use pitch-class-set matching (ignore octave) with a threshold of "at least N-1 of N expected notes detected" for chords. Extend `PlaybackEngine` with a `PracticeMode` state machine (`playing | waiting | loopRestart`) rather than modifying the existing play/pause logic.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIO-03 | App detects chords (multiple simultaneous notes) from microphone input | ChordDetector class using FFT peak-picking with harmonic filtering; pitch-class-set matching for tolerance; existing AnalyserNode infrastructure reusable |
| PRAC-01 | Wait mode pauses song progression until user plays the correct note(s) | PracticeMode state machine in PlaybackEngine; NoteEvaluator compares expected vs detected; time freezes until match |
| PRAC-02 | User can select and loop a specific section of a song for repeated practice | LoopRegion stored in practiceStore; PlaybackEngine checks loop boundary in tick(); progress bar UI for loop selection |
</phase_requirements>

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Phase 3 Role |
|---------|---------|---------|--------------|
| Web Audio API (AnalyserNode) | native | FFT frequency data | `getFloatFrequencyData()` for chord detection peak-picking |
| pitchy | 4.1.0 | Monophonic pitch detection | Keep for single-note detection; chord detector supplements it |
| tonal | 6.4.3 | Music theory utilities | `Note.midi()`, `Note.chroma()` for pitch-class comparison |
| Zustand | 5.0.12 | State management | New `practiceStore` for mode, loop region, evaluation results |

### New (no new packages needed)

No new npm dependencies are required. Chord detection is custom code on top of existing `AnalyserNode`. The `tonal` library already provides `Note.chroma()` for pitch-class-set operations.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom FFT chord detection | essentia.js HPCP | essentia.js gives more accurate chromagram via WASM (~2MB bundle), but adds significant complexity. Start with custom FFT; fall back to essentia.js if accuracy is unacceptable |
| Pitch class set matching | Exact MIDI number matching | Octave errors are the #1 false negative in mic-based detection. Pitch-class matching (mod 12) dramatically improves perceived accuracy |
| Custom peak-picking | ML-based piano transcription | ML models (CREPE, basic-pitch) give better accuracy but require WASM/TF.js runtime. Overkill for v1 where tolerance-based matching suffices |

## Architecture Patterns

### Recommended New Files

```
src/
├── audio/
│   └── ChordDetector.ts       # FFT peak-picking, returns detected MIDI notes
├── engine/
│   ├── PlaybackEngine.ts       # MODIFIED: add practice mode state machine
│   └── NoteEvaluator.ts        # Pure function: compare expected vs detected
├── store/
│   └── practiceStore.ts        # Practice mode, loop region, evaluation state
├── components/
│   ├── PracticeView.tsx         # MODIFIED: add practice controls
│   └── PracticeControls.tsx     # MODIFIED: add wait mode toggle, loop controls
├── hooks/
│   └── useAudioPipeline.ts     # MODIFIED: add chord detection alongside pitch
└── types/
    └── practice.ts              # PracticeMode, LoopRegion, EvaluationResult types
```

### Pattern 1: Practice Mode State Machine

**What:** Extend `PlaybackEngine` with a practice mode that introduces a `waiting` state. When enabled, the engine checks detected notes against expected notes each frame. If they don't match, time stops advancing (the engine enters `waiting`). When they match, time resumes.

**When to use:** Any time the user toggles "Wait Mode" on.

**Key insight:** Do NOT modify `play()`/`pause()` semantics. Add a parallel state: `practiceMode: 'off' | 'playing' | 'waiting'`. The existing `playing` boolean stays true during wait mode -- only the time advancement freezes.

```typescript
// engine/PlaybackEngine.ts -- conceptual extension
private practiceMode: 'off' | 'playing' | 'waiting' = 'off';
private waitTarget: SongNote[] = []; // notes we're waiting for

private tick = (): void => {
  if (!this.playing || !this.song) return;

  if (this.practiceMode === 'waiting') {
    // Time does NOT advance. Keep rendering current frame.
    // Check if user played the correct notes.
    const detected = this.getDetectedNotes(); // from chord detector
    const matched = this.evaluator.evaluate(this.waitTarget, detected);
    if (matched) {
      this.practiceMode = 'playing';
      // Resume from where we paused
    }
    // Still render (frozen) and schedule next frame
    this.renderer?.draw(this.currentTime, this.song.notes);
    this.rafId = requestAnimationFrame(this.tick);
    return;
  }

  // Normal playback...
  const t = this.currentTime;

  // Check if we need to wait at this position
  if (this.practiceMode === 'playing') {
    const expected = getActiveNotes(this.song.notes, t);
    if (expected.length > 0 && !this.evaluator.evaluate(expected, detected)) {
      this.practiceMode = 'waiting';
      this.waitTarget = expected;
      this.freezeTime(); // stop clock advancement
    }
  }

  // Check loop boundary
  if (this.loopRegion && t >= this.loopRegion.end) {
    this.seek(this.loopRegion.start);
    return;
  }

  // ... rest of existing tick logic
};
```

### Pattern 2: FFT Peak-Picking Chord Detector

**What:** Analyze FFT frequency spectrum to find multiple simultaneous note peaks. Uses `getFloatFrequencyData()` (dB values per frequency bin), identifies local maxima above a threshold, filters harmonics, and maps peaks to MIDI note numbers.

**When to use:** Every detection frame when practice mode is active.

```typescript
// audio/ChordDetector.ts
export class ChordDetector {
  private analyser: AnalyserNode;
  private freqBuffer: Float32Array;
  private binHz: number;

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    // Use larger FFT for better frequency resolution
    this.analyser.fftSize = 8192;
    this.freqBuffer = new Float32Array(analyser.frequencyBinCount);
    this.binHz = analyser.context.sampleRate / analyser.fftSize;
  }

  detect(thresholdDb: number = -40): number[] {
    this.analyser.getFloatFrequencyData(this.freqBuffer);

    // 1. Find local maxima above threshold
    const peaks = this.findPeaks(thresholdDb);

    // 2. Filter harmonics (if peak at f and peak at 2f, remove 2f)
    const fundamentals = this.filterHarmonics(peaks);

    // 3. Map frequencies to MIDI numbers
    return fundamentals
      .map(f => Math.round(12 * Math.log2(f / 440) + 69))
      .filter(m => m >= 21 && m <= 108);
  }

  private findPeaks(thresholdDb: number): number[] {
    const peaks: number[] = [];
    for (let i = 2; i < this.freqBuffer.length - 2; i++) {
      const val = this.freqBuffer[i];
      if (val > thresholdDb
        && val > this.freqBuffer[i - 1]
        && val > this.freqBuffer[i - 2]
        && val > this.freqBuffer[i + 1]
        && val > this.freqBuffer[i + 2]) {
        // Parabolic interpolation for sub-bin accuracy
        const freq = this.interpolatePeak(i) * this.binHz;
        if (freq >= 27.5 && freq <= 4186) peaks.push(freq);
      }
    }
    return peaks;
  }

  private filterHarmonics(freqs: number[]): number[] {
    // Sort by amplitude (strongest first), then remove
    // frequencies that are near-integer multiples of a stronger one
    const sorted = [...freqs].sort((a, b) => a - b); // low to high
    const kept: number[] = [];
    for (const f of sorted) {
      const isHarmonic = kept.some(fundamental => {
        const ratio = f / fundamental;
        const nearestInt = Math.round(ratio);
        return nearestInt >= 2 && nearestInt <= 8
          && Math.abs(ratio - nearestInt) < 0.05;
      });
      if (!isHarmonic) kept.push(f);
    }
    return kept;
  }

  private interpolatePeak(bin: number): number {
    const y0 = this.freqBuffer[bin - 1];
    const y1 = this.freqBuffer[bin];
    const y2 = this.freqBuffer[bin + 1];
    const d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2));
    return bin + d;
  }
}
```

### Pattern 3: Tolerant Note Evaluator

**What:** Compare detected notes against expected notes using pitch-class sets (mod 12) rather than exact MIDI numbers. This handles octave errors gracefully. For chords, require a configurable fraction of expected notes to be present.

```typescript
// engine/NoteEvaluator.ts
export interface EvaluationResult {
  matched: boolean;
  expectedPitchClasses: number[];
  detectedPitchClasses: number[];
  matchedCount: number;
  totalExpected: number;
}

export function evaluateNotes(
  expectedMidi: number[],
  detectedMidi: number[],
  options: {
    matchThreshold?: number;  // fraction, default 0.75 (3/4 notes)
    useOctaveMatching?: boolean; // if true, exact MIDI; if false, pitch class
  } = {}
): EvaluationResult {
  const { matchThreshold = 0.75, useOctaveMatching = false } = options;

  if (expectedMidi.length === 0) {
    return { matched: true, expectedPitchClasses: [], detectedPitchClasses: [], matchedCount: 0, totalExpected: 0 };
  }

  const toSet = (midis: number[]) =>
    useOctaveMatching
      ? new Set(midis)
      : new Set(midis.map(m => m % 12));

  const expectedSet = toSet(expectedMidi);
  const detectedSet = toSet(detectedMidi);

  let matchedCount = 0;
  for (const pc of expectedSet) {
    if (detectedSet.has(pc)) matchedCount++;
  }

  const fraction = matchedCount / expectedSet.size;

  return {
    matched: fraction >= matchThreshold,
    expectedPitchClasses: [...expectedSet],
    detectedPitchClasses: [...detectedSet],
    matchedCount,
    totalExpected: expectedSet.size,
  };
}
```

### Pattern 4: Loop Region with Progress Bar Selection

**What:** Store loop start/end times. User selects by dragging on the progress bar or clicking start/end buttons. PlaybackEngine checks loop boundary in tick() and seeks back to start.

```typescript
// types/practice.ts
export interface LoopRegion {
  start: number;  // seconds
  end: number;    // seconds
}

export type PracticeMode = 'off' | 'waitMode';

export interface PracticeState {
  mode: PracticeMode;
  loopRegion: LoopRegion | null;
  lastEvaluation: EvaluationResult | null;
}
```

### Anti-Patterns to Avoid

- **Modifying play/pause for wait mode:** Do NOT repurpose the existing `pause()` method for wait mode. Wait mode is conceptually different -- the song is still "playing" but time is frozen. Users should still be able to pause during wait mode. Keep these as orthogonal states.
- **Running chord detection every rAF frame unconditionally:** FFT analysis with 8192 bins is heavier than the pitchy single-note path. Only run chord detection when practice mode is active and we need to evaluate notes.
- **Exact MIDI number matching for chords:** Octave errors will make the app feel broken. Always use pitch-class matching (mod 12) for chord evaluation, with exact matching as an optional "strict" mode.
- **Blocking the tick loop during evaluation:** `evaluateNotes()` must be a pure, fast function (no async, no DOM). It runs inside the rAF loop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frequency-to-MIDI conversion | Custom math in chord detector | `frequencyToMidi()` from `src/utils/noteUtils.ts` | Already exists, tested, handles edge cases |
| Pitch class extraction | Manual modulo logic everywhere | `Note.chroma()` from `tonal` | Handles enharmonics correctly |
| Active note lookup at time T | Linear scan of all notes | `getActiveNotes()` from `src/visualization/noteSearch.ts` | Already exists with binary search, O(log n) |
| Progress bar time display | Manual formatting | `formatTime()` in `PlaybackControls.tsx` | Already exists |

## Common Pitfalls

### Pitfall 1: FFT Resolution vs Latency Tradeoff
**What goes wrong:** Using fftSize=8192 for chord detection gives good frequency resolution (~5.4 Hz per bin at 44.1kHz) but each FFT window takes ~186ms to fill. The app feels laggy.
**Why it happens:** Larger FFT = better pitch resolution = more latency. This is a fundamental physics constraint.
**How to avoid:** Use fftSize=8192 but set `AnalyserNode.smoothingTimeConstant = 0.3` (default is 0.8). This makes the analyzer more responsive to new input. In wait mode, latency is less critical since there's no beat to keep up with. For flowing playback, fall back to pitchy (monophonic) which uses time-domain autocorrelation and is faster.
**Warning signs:** Users play a note and the app takes >200ms to respond.

### Pitfall 2: Harmonic False Positives in Chord Detection
**What goes wrong:** Playing C3 causes the detector to report C3, C4, G4, C5 (harmonics). The app shows "correct" for notes that weren't played.
**Why it happens:** Piano strings produce strong harmonics. The 2nd harmonic (octave) and 3rd harmonic (octave + fifth) can be as loud as the fundamental.
**How to avoid:** Filter harmonics by checking if a detected frequency is a near-integer multiple (2x, 3x, 4x...) of a lower detected frequency. Keep the lower one. Sort peaks by frequency (low to high) and filter ascending. The `filterHarmonics()` method in ChordDetector handles this.
**Warning signs:** Detector reports more notes than were played. Works fine for single notes but gives 3-4 notes for a single key press.

### Pitfall 3: Wait Mode Gets Stuck
**What goes wrong:** User plays the wrong note, background noise triggers a detection, or the expected note is in the bass range where detection is unreliable. The app waits forever.
**Why it happens:** No timeout, no skip mechanism, no "close enough" tolerance.
**How to avoid:** (1) Add a "skip note" button visible during wait mode. (2) After configurable timeout (default 10s), auto-highlight the expected note more prominently and show a hint. (3) Use pitch-class matching so octave errors count as correct. (4) Show what the mic is hearing so the user can diagnose issues.
**Warning signs:** Users repeatedly press the same correct key with no response.

### Pitfall 4: Two Separate AudioContexts for Mic and Playback
**What goes wrong:** `useAudioPipeline` creates its own `AudioContext` (via `AudioPipeline.start()`), and `usePlaybackEngine` creates another one (via `AudioPipeline.createAudioContext()`). Two separate contexts mean separate clocks and potential resource conflicts.
**How to avoid:** Share a single `AudioContext` between the mic pipeline and the playback engine. The `AudioPipeline` class already exposes `audioContext` getter. Modify `usePlaybackEngine` to accept an external AudioContext from the mic pipeline. Or create a shared AudioContext provider at the app level.
**Warning signs:** Timing drift between playback audio and detection. Chrome limiting to 6 AudioContexts then silently failing.

### Pitfall 5: Loop Region Edge Cases
**What goes wrong:** Loop start equals loop end (zero-length loop). Loop region doesn't align with note boundaries, causing notes to be cut off. Seeking to loop start triggers wait mode on the first note before the user is ready.
**How to avoid:** (1) Enforce minimum loop duration (e.g., 1 second). (2) Snap loop boundaries to nearest note start times. (3) On loop restart, add a brief "grace period" (e.g., 500ms) before wait mode activates, giving the user time to prepare.

## Code Examples

### Integrating ChordDetector with existing useAudioPipeline

```typescript
// Modified useAudioPipeline.ts -- add chord detection
import { ChordDetector } from '../audio/ChordDetector';

export function useAudioPipeline() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const chordDetectorRef = useRef<ChordDetector | null>(null);
  // ... existing refs ...

  const start = useCallback(async () => {
    // ... existing pipeline setup ...
    detectorRef.current = new PitchDetector(pipeline.analyser!);
    chordDetectorRef.current = new ChordDetector(pipeline.analyser!);
    // Note: ChordDetector changes fftSize on the analyser.
    // This affects PitchDetector (which uses time-domain data, unaffected by fftSize).
    // pitchy reads getFloatTimeDomainData which always uses fftSize samples.
    // Increasing fftSize to 8192 means pitchy gets more samples per read -- still works.

    const loop = () => {
      // Single-note detection (always runs, fast)
      const pitch = detectorRef.current?.detect();
      if (pitch) {
        setDetectedNote(pitch.frequency, pitch.clarity);
      } else {
        setDetectedNote(null, 0);
      }

      // Chord detection (only when practice mode active)
      const practiceMode = usePracticeStore.getState().mode;
      if (practiceMode !== 'off') {
        const chords = chordDetectorRef.current?.detect() ?? [];
        usePracticeStore.getState().setDetectedChord(chords);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [setDetectedNote, setStatus]);

  // ... rest unchanged ...
}
```

### PracticeStore

```typescript
// store/practiceStore.ts
import { create } from 'zustand';
import type { LoopRegion, PracticeMode } from '../types/practice';
import type { EvaluationResult } from '../engine/NoteEvaluator';

interface PracticeStoreState {
  mode: PracticeMode;
  loopRegion: LoopRegion | null;
  detectedChord: number[];      // MIDI numbers from ChordDetector
  lastEvaluation: EvaluationResult | null;
  isWaiting: boolean;            // true when engine is in waiting state

  setMode: (mode: PracticeMode) => void;
  setLoopRegion: (region: LoopRegion | null) => void;
  setDetectedChord: (notes: number[]) => void;
  setLastEvaluation: (result: EvaluationResult | null) => void;
  setIsWaiting: (waiting: boolean) => void;
}

export const usePracticeStore = create<PracticeStoreState>((set) => ({
  mode: 'off',
  loopRegion: null,
  detectedChord: [],
  lastEvaluation: null,
  isWaiting: false,

  setMode: (mode) => set({ mode }),
  setLoopRegion: (loopRegion) => set({ loopRegion }),
  setDetectedChord: (detectedChord) => set({ detectedChord }),
  setLastEvaluation: (lastEvaluation) => set({ lastEvaluation }),
  setIsWaiting: (isWaiting) => set({ isWaiting }),
}));
```

### Extending PlaybackEngine for Practice Mode

Key modification points in `PlaybackEngine.ts`:

```typescript
// Key additions to PlaybackEngine constructor/fields:
private evaluator = evaluateNotes; // pure function import
private practiceEnabled = false;
private waitingForNotes: number[] = [];
private frozenTime: number | null = null;

// In tick(), before normal time advancement:
if (this.practiceEnabled && this.frozenTime !== null) {
  // We are waiting. Check detected notes.
  const detected = usePracticeStore.getState().detectedChord;
  const result = this.evaluator(this.waitingForNotes, detected);
  usePracticeStore.getState().setLastEvaluation(result);

  if (result.matched) {
    // Unfreeze: adjust clock so currentTime resumes from frozen position
    this.startClockTime = this.audioContext.currentTime;
    this.startOffset = this.frozenTime;
    this.frozenTime = null;
    usePracticeStore.getState().setIsWaiting(false);
  } else {
    // Stay frozen, keep rendering
    this.renderer?.draw(this.frozenTime, this.song!.notes);
    this.rafId = requestAnimationFrame(this.tick);
    return;
  }
}

// After computing currentTime `t`, check for loop boundary:
const loop = usePracticeStore.getState().loopRegion;
if (loop && t >= loop.end) {
  this.play(loop.start); // seek + restart
  return;
}

// Check if we need to freeze for wait mode:
if (this.practiceEnabled) {
  const expected = getActiveNotes(this.song!.notes, t);
  if (expected.length > 0) {
    const detected = usePracticeStore.getState().detectedChord;
    const result = this.evaluator(expected, detected);
    if (!result.matched) {
      this.frozenTime = t;
      this.waitingForNotes = expected;
      usePracticeStore.getState().setIsWaiting(true);
    }
  }
}
```

### Keyboard Highlight Enhancement for Chord Detection

The existing `PianoKeyboard` already handles multi-note highlighting via `activeNotes` (array) and single `detectedMidi`. For chords, change `detectedMidi` from a single number to an array:

```typescript
// In PianoKeyboard.tsx getHighlight():
function getHighlight(
  midi: number,
  activeNotes: number[],
  detectedMidis: number[],  // Changed from single to array
): HighlightState {
  const isExpected = activeNotes.includes(midi);
  const isDetected = detectedMidis.includes(midi);
  // ... rest identical
}
```

The `audioStore` currently stores a single `DetectedPitch`. For Phase 3, the `practiceStore.detectedChord: number[]` provides the multi-note detected set. The keyboard component can read from both stores.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monophonic only (pitchy) | FFT peak-picking + harmonic filter for chords | Phase 3 | Enables chord practice. Accuracy ~70-80% for 2-3 note chords on good mic |
| Binary correct/wrong matching | Pitch-class-set matching with threshold | Phase 3 | Dramatically reduces false negatives from octave errors |
| Continuous playback only | Wait mode state machine | Phase 3 | Enables self-paced practice |
| Full-song playback | Selectable loop regions | Phase 3 | Enables targeted section practice |

**Key insight on chord detection accuracy:** Perfect polyphonic detection from a laptop microphone is not achievable with current browser-based technology. The best ML-based systems achieve ~85-90% frame-level note accuracy on clean recordings. Our FFT approach on real-world mic input will be lower. The UX must be designed around tolerance, not perfection. Pitch-class matching and partial-chord acceptance are the critical design decisions that make the feature feel usable despite imperfect detection.

## Open Questions

1. **FFT size for chord detection vs existing pitchy detection**
   - What we know: ChordDetector wants fftSize=8192 for resolution; pitchy uses `getFloatTimeDomainData()` which reads `fftSize` samples. Changing fftSize on the shared AnalyserNode affects both.
   - What's unclear: Does pitchy's McLeod algorithm degrade with 8192 samples (more data = slower but possibly more accurate)?
   - Recommendation: Test with fftSize=8192. pitchy should handle it fine -- more samples generally helps autocorrelation. If latency is an issue, consider two AnalyserNodes (one for each detector) connected to the same source.

2. **Shared AudioContext between mic and playback**
   - What we know: Currently `useAudioPipeline` creates one AudioContext and `usePlaybackEngine` creates another. Both work independently.
   - What's unclear: Whether sharing a single context causes timing/resource conflicts.
   - Recommendation: Refactor to share a single AudioContext. This is architecturally cleaner and avoids the Chrome 6-context limit. The mic's AnalyserNode and the playback's destination node can coexist on the same context.

3. **Threshold tuning for chord detection**
   - What we know: The -40dB threshold and 0.75 match fraction are starting points.
   - What's unclear: Optimal values depend on microphone quality and room acoustics.
   - Recommendation: Make thresholds configurable. Ship with conservative defaults (-35dB threshold, 0.67 match fraction). Add a debug overlay showing FFT spectrum during development.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (test block) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIO-03 | ChordDetector detects multiple peaks from FFT data | unit | `npx vitest run src/audio/ChordDetector.test.ts -x` | No -- Wave 0 |
| AUDIO-03 | Harmonic filtering removes overtones | unit | `npx vitest run src/audio/ChordDetector.test.ts -x` | No -- Wave 0 |
| PRAC-01 | NoteEvaluator matches expected vs detected with tolerance | unit | `npx vitest run src/engine/NoteEvaluator.test.ts -x` | No -- Wave 0 |
| PRAC-01 | PlaybackEngine freezes time in wait mode when notes don't match | unit | `npx vitest run src/engine/PlaybackEngine.test.ts -x` | Yes (extend) |
| PRAC-01 | PlaybackEngine resumes when correct notes detected | unit | `npx vitest run src/engine/PlaybackEngine.test.ts -x` | Yes (extend) |
| PRAC-02 | PlaybackEngine loops back to start when reaching loop end | unit | `npx vitest run src/engine/PlaybackEngine.test.ts -x` | Yes (extend) |
| PRAC-02 | Loop region enforces minimum duration | unit | `npx vitest run src/store/practiceStore.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/audio/ChordDetector.test.ts` -- covers AUDIO-03 (mock AnalyserNode with synthetic FFT data)
- [ ] `src/engine/NoteEvaluator.test.ts` -- covers PRAC-01 (pure function, no mocks needed)
- [ ] `src/store/practiceStore.test.ts` -- covers PRAC-02 loop region validation

## Sources

### Primary (HIGH confidence)
- [MDN: AnalyserNode.getFloatFrequencyData()](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData) - FFT frequency data API
- [MDN: AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - fftSize, smoothingTimeConstant parameters
- Existing codebase: `PlaybackEngine.ts`, `PitchDetector.ts`, `AudioPipeline.ts`, `PianoKeyboard.tsx` -- current implementation examined directly

### Secondary (MEDIUM confidence)
- [Harmonic Pitch Class Profiles - Wikipedia](https://en.wikipedia.org/wiki/Harmonic_pitch_class_profiles) - Chroma/HPCP theory
- [Chroma feature - Wikipedia](https://en.wikipedia.org/wiki/Chroma_feature) - Pitch class profile concepts
- [Essentia.js HPCP docs](https://mtg.github.io/essentia.js/docs/api/Essentia.html) - WASM-based HPCP as fallback option
- [Detecting pitch with Web Audio API](https://alexanderell.is/posts/tuner/) - FFT limitations and autocorrelation tradeoffs
- [Midiano](https://midiano.com/) - Reference implementation of wait mode and loop practice
- [apankrat/note-detector](https://github.com/apankrat/note-detector) - Consensus-based pitch detection, confirms chords are hard

### Tertiary (LOW confidence)
- [PolyScribe](https://aiqiliu.github.io/polyscribe/) - Polyphonic transcription tool (web-based, approach unverified)
- WebSearch results on ML-based transcription accuracy (~85-90%) -- needs validation with specific benchmarks

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, building on existing proven infrastructure
- Architecture (wait mode, loop): HIGH - well-understood state machine patterns; existing PlaybackEngine is clean and extensible
- Architecture (chord detection): MEDIUM - custom FFT peak-picking is the right approach but accuracy is uncertain until tested with real audio
- Pitfalls: HIGH - well-documented from Phase 1/2 research and real-world piano apps

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (30 days -- stable domain, no fast-moving dependencies)
