# Phase 1: Audio + MIDI Foundation - Research

**Researched:** 2026-03-22
**Domain:** Web Audio API microphone capture, real-time pitch detection, MIDI file parsing
**Confidence:** HIGH

## Summary

Phase 1 establishes the three technical pillars: microphone audio capture via Web Audio API, real-time monophonic pitch detection using the pitchy library, and MIDI file parsing with @tonejs/midi. The project has not been scaffolded yet, so this phase also includes Vite + React + TypeScript project initialization.

The core technical risk is browser compatibility for microphone capture, particularly Safari/iOS AudioContext autoplay policies and getUserMedia quirks. Pitch detection for single notes is a well-solved problem using the McLeod Pitch Method (pitchy). MIDI parsing is straightforward with @tonejs/midi which returns pre-computed time-in-seconds values. The key integration point is converting pitch detection output (Hz) to note identifiers that can be compared against MIDI note data -- tonal provides this bridge.

**Primary recommendation:** Start with AnalyserNode-based pitch detection on the main thread (simpler), not AudioWorklet. pitchy + AnalyserNode.getFloatTimeDomainData() is sufficient for Phase 1's single-note detection. Defer AudioWorklet to Phase 2 when the game loop and canvas rendering compete for main thread time.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIO-01 | App captures microphone audio via Web Audio API with user permission | Web Audio API getUserMedia + AudioContext pipeline; Safari/iOS quirks documented; user-gesture requirement for AudioContext.resume() |
| AUDIO-02 | App detects single piano notes in real-time from microphone input | pitchy 4.1.0 McLeod Pitch Method; AnalyserNode.getFloatTimeDomainData(); tonal Note.fromFreq() for Hz-to-note conversion |
| SONG-01 | User can import standard MIDI files (.mid) as songs | @tonejs/midi 2.0.28 parses .mid to structured JSON with tracks, notes (midi number, time in seconds, duration, velocity, name) |
</phase_requirements>

## Standard Stack

### Core (Phase 1 specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pitchy | 4.1.0 | Monophonic pitch detection | McLeod Pitch Method, best accuracy/speed for real-time. Returns [frequency, clarity]. ESM-only, zero deps, ~3KB |
| @tonejs/midi | 2.0.28 | MIDI file parsing | De facto standard JS MIDI parser. Returns typed JSON with notes in seconds. Stable API (MIDI format doesn't change) |
| tonal | 6.4.3 | Music theory conversions | Note.fromFreq(hz), Note.midi(name), Note.freq(name), Note.fromMidi(num). Tree-shakeable, TypeScript |
| Web Audio API | Native | Microphone capture + analysis | Browser-native. getUserMedia() + AudioContext + AnalyserNode. No library needed |

### Project Scaffold (first-time setup)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Project constraint |
| TypeScript | 5.7+ | Type safety | Project constraint |
| Vite | 6.x | Build tool | Project constraint, `npm create vite@latest -- --template react-ts` |
| Zustand | 5.0.12 | State management | Project constraint. Needed from Phase 1 for audio state outside React |
| Tailwind CSS | 4.x | Styling | Project constraint |
| Vitest | 4.1.0 | Testing | Project constraint. Native Vite integration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pitchy | pitchfinder | pitchfinder bundles multiple algorithms but is heavier. pitchy's McLeod method is the best single algorithm |
| AnalyserNode (main thread) | AudioWorklet | AudioWorklet runs on audio thread (better perf) but adds complexity. Not needed until Phase 2 when canvas rendering competes for main thread |
| tonal Note.fromFreq | Manual Hz-to-MIDI math | `12 * Math.log2(freq/440) + 69` works but tonal handles edge cases, enharmonic naming, and is needed later for chord/scale utilities |

**Installation:**
```bash
# Scaffold project (run once)
npm create vite@latest web-piano-learner -- --template react-ts
cd web-piano-learner

# Phase 1 dependencies
npm install pitchy @tonejs/midi tonal zustand

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

## Architecture Patterns

### Phase 1 Project Structure

```
src/
  audio/
    AudioPipeline.ts       # Mic capture, AudioContext lifecycle
    PitchDetector.ts        # pitchy wrapper, frequency detection
    NoteDetector.ts         # Hz -> note name conversion, debouncing
  midi/
    MidiParser.ts           # @tonejs/midi wrapper, file loading
    SongModel.ts            # Normalized song data types
  store/
    audioStore.ts           # Detected note state (Zustand)
    songStore.ts            # Loaded song state (Zustand)
  components/
    MicrophoneSetup.tsx     # Permission request, live indicator
    NoteDisplay.tsx         # Shows detected note name
    MidiImport.tsx          # File input for .mid files
    App.tsx
  hooks/
    useAudioPipeline.ts     # Lifecycle: create/destroy audio pipeline
  utils/
    noteUtils.ts            # Shared note conversion helpers
  main.tsx
```

### Pattern 1: User-Gesture-Gated AudioContext

**What:** AudioContext must be created or resumed inside a user click/tap handler. Never create at module load time.

**When to use:** Always. All browsers enforce autoplay policy.

**Example:**
```typescript
// audio/AudioPipeline.ts
export class AudioPipeline {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;

  /** Must be called from a click handler */
  async start(): Promise<void> {
    // Create AudioContext on user gesture
    this.ctx = new AudioContext();

    // Safari may start suspended even on user gesture
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Request microphone
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,  // We want raw piano sound
        noiseSuppression: false,
        autoGainControl: false,
      }
    });

    // Connect mic -> analyser
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048; // 1024 samples for time-domain
    source.connect(this.analyser);
    // Do NOT connect analyser to destination (would create feedback)
  }

  stop(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
  }
}
```

### Pattern 2: pitchy + AnalyserNode Integration

**What:** Read time-domain data from AnalyserNode, pass to pitchy's PitchDetector.

**When to use:** Every analysis frame (~60Hz via requestAnimationFrame).

**Example:**
```typescript
// audio/PitchDetector.ts
import { PitchDetector as Pitchy } from 'pitchy';

export class PitchDetector {
  private detector: ReturnType<typeof Pitchy.forFloat32Array>;
  private buffer: Float32Array;

  constructor(private analyser: AnalyserNode) {
    const bufferLength = analyser.fftSize; // e.g. 2048
    this.buffer = new Float32Array(bufferLength);
    this.detector = Pitchy.forFloat32Array(bufferLength);
  }

  /** Returns detected pitch or null if clarity too low */
  detect(): { frequency: number; clarity: number } | null {
    this.analyser.getFloatTimeDomainData(this.buffer);

    const [frequency, clarity] = this.detector.findPitch(
      this.buffer,
      this.analyser.context.sampleRate
    );

    // Clarity threshold: 0.9+ for confident single-note detection
    if (clarity < 0.9 || frequency < 27.5 || frequency > 4186) {
      return null; // Below A0 or above C8, or unclear
    }

    return { frequency, clarity };
  }
}
```

### Pattern 3: Hz-to-Note Conversion with tonal

**What:** Convert detected frequency to a note name for display and MIDI comparison.

**Example:**
```typescript
// utils/noteUtils.ts
import { Note } from 'tonal';

/** Convert Hz to nearest note name (e.g. 440 -> "A4") */
export function frequencyToNote(hz: number): string {
  return Note.fromFreq(hz);  // Returns "A4", "C#5", etc.
}

/** Convert Hz to MIDI number for comparison with MIDI file data */
export function frequencyToMidi(hz: number): number {
  return Math.round(12 * Math.log2(hz / 440) + 69);
}

/** Check if detected frequency matches expected MIDI note (within tolerance) */
export function isNoteMatch(
  detectedHz: number,
  expectedMidi: number,
  toleranceCents: number = 50  // Half a semitone
): boolean {
  const detectedMidi = 12 * Math.log2(detectedHz / 440) + 69;
  const diff = Math.abs(detectedMidi - expectedMidi);
  return diff < toleranceCents / 100;
}
```

### Pattern 4: MIDI File Import and Parsing

**What:** Accept .mid file from file input, parse with @tonejs/midi, normalize to SongModel.

**Example:**
```typescript
// midi/MidiParser.ts
import { Midi } from '@tonejs/midi';
import type { SongModel, SongNote } from './SongModel';

export async function parseMidiFile(file: File): Promise<SongModel> {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  const notes: SongNote[] = [];
  midi.tracks.forEach((track, trackIndex) => {
    // Skip percussion tracks (channel 9/10)
    if (track.instrument.percussion) return;

    track.notes.forEach(note => {
      notes.push({
        midi: note.midi,           // MIDI number (60 = C4)
        name: note.name,           // "C4"
        startTime: note.time,      // seconds (already converted by @tonejs/midi)
        duration: note.duration,   // seconds
        velocity: note.velocity,   // 0-1 (normalized by @tonejs/midi)
        track: trackIndex,
      });
    });
  });

  // Sort by start time for efficient runtime queries
  notes.sort((a, b) => a.startTime - b.startTime);

  return {
    name: midi.header.name || file.name.replace('.mid', ''),
    duration: midi.duration,
    bpm: midi.header.tempos[0]?.bpm ?? 120,
    timeSignature: midi.header.timeSignatures[0]
      ? [midi.header.timeSignatures[0].timeSignature[0],
         midi.header.timeSignatures[0].timeSignature[1]]
      : [4, 4],
    notes,
    trackCount: midi.tracks.length,
    trackNames: midi.tracks.map(t => t.name),
  };
}
```

```typescript
// midi/SongModel.ts
export interface SongNote {
  midi: number;
  name: string;
  startTime: number;  // seconds
  duration: number;    // seconds
  velocity: number;    // 0-1
  track: number;
}

export interface SongModel {
  name: string;
  duration: number;
  bpm: number;
  timeSignature: [number, number];
  notes: SongNote[];
  trackCount: number;
  trackNames: string[];
}
```

### Anti-Patterns to Avoid

- **Creating AudioContext at module load or in useEffect without user gesture:** Browser suspends it silently. AnalyserNode returns all zeros. Always gate behind a click handler.
- **Using getByteFrequencyData for pitch detection:** 8-bit resolution (0-255) loses detail. Use getFloatTimeDomainData for time-domain data that pitchy needs.
- **Calling getUserMedia multiple times on iOS Safari:** Second call mutes the first stream permanently. Request once, reuse via clone.
- **Not disabling echoCancellation/noiseSuppression:** Browser audio processing mangles piano waveforms, destroying pitch detection accuracy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pitch detection algorithm | Custom autocorrelation/FFT | pitchy 4.1.0 | McLeod Pitch Method is tuned for real-time. Edge cases around octave errors, noise rejection, and clarity scoring are subtle |
| MIDI file parsing | Custom binary parser | @tonejs/midi 2.0.28 | MIDI format has Format 0/1/2, variable-length quantities, running status, and many quirks. Library handles all of them |
| Hz <-> Note name conversion | Lookup table or manual math | tonal Note.fromFreq / Note.midi | Handles enharmonic naming, octave numbering, edge cases. Needed for many more things in later phases |
| Microphone permission UX | Raw getUserMedia error handling | Wrap in try/catch with specific error type checking | NotAllowedError vs NotFoundError vs OverconstrainedError need different user messages |

## Common Pitfalls

### Pitfall 1: AudioContext Autoplay Policy (All Browsers)

**What goes wrong:** AudioContext created outside user gesture stays "suspended". Mic appears to work but AnalyserNode returns zeros.
**Why it happens:** Browser autoplay policy. Safari is strictest.
**How to avoid:** Create AudioContext inside click handler. Always check `ctx.state` and call `ctx.resume()`. Show explicit "Start" button.
**Warning signs:** Works in dev (browser may auto-allow localhost) but breaks in production.

### Pitfall 2: iOS Safari Mic Routing to Speakers

**What goes wrong:** On iOS, calling getUserMedia routes audio output from headphones to built-in speakers.
**Why it happens:** iOS WebKit forces audio session category change when mic is activated.
**How to avoid:** Use AudioContext with proper media stream source. Test on actual iOS device. Document known iOS limitation for users.
**Warning signs:** Users report headphones stop working when practice mode starts.

### Pitfall 3: echoCancellation Destroys Piano Waveforms

**What goes wrong:** Pitch detection returns wrong notes or fails entirely. Works with external mic but not laptop mic.
**Why it happens:** Browser's echo cancellation, noise suppression, and auto gain control are designed for speech, not music. They alter the waveform enough to confuse pitch detection.
**How to avoid:** Set `{ echoCancellation: false, noiseSuppression: false, autoGainControl: false }` in getUserMedia constraints.
**Warning signs:** Detection works in some browsers but not others (different default processing).

### Pitfall 4: Float32Array Allocation on Every Frame

**What goes wrong:** GC pauses cause audio crackle and visual hitching after ~30 seconds.
**Why it happens:** Creating `new Float32Array(bufferSize)` on every analysis frame generates garbage.
**How to avoid:** Pre-allocate the buffer once in the constructor. Reuse it across all detect() calls. pitchy's PitchDetector already reuses internal buffers.
**Warning signs:** Performance degrades over time rather than being consistently slow.

### Pitfall 5: Low Piano Notes Unreliable on Laptop Microphones

**What goes wrong:** Notes below C3 (~130 Hz) detected incorrectly or not at all.
**Why it happens:** Laptop mics physically roll off below ~80-100 Hz. Additionally, FFT resolution at smaller sizes cannot distinguish adjacent bass notes.
**How to avoid:** Use fftSize of 2048+ (pitchy uses time-domain autocorrelation, which handles low frequencies better than FFT). Document limitation: "For best results below C3, use an external microphone." Accept this as a known limitation.
**Warning signs:** Middle octave notes work perfectly; bass register fails.

## Code Examples

### Complete Microphone Setup with Permission Handling

```typescript
// hooks/useAudioPipeline.ts
import { useRef, useCallback } from 'react';
import { AudioPipeline } from '../audio/AudioPipeline';
import { PitchDetector } from '../audio/PitchDetector';
import { useAudioStore } from '../store/audioStore';

export function useAudioPipeline() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const rafRef = useRef<number>(0);
  const setDetectedNote = useAudioStore(s => s.setDetectedNote);
  const setIsListening = useAudioStore(s => s.setIsListening);

  const start = useCallback(async () => {
    try {
      const pipeline = new AudioPipeline();
      await pipeline.start();
      pipelineRef.current = pipeline;
      detectorRef.current = new PitchDetector(pipeline.analyser!);
      setIsListening(true);

      // Detection loop
      const loop = () => {
        const result = detectorRef.current?.detect();
        if (result) {
          setDetectedNote(result.frequency, result.clarity);
        } else {
          setDetectedNote(null, 0);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          // User denied microphone permission
        } else if (err.name === 'NotFoundError') {
          // No microphone available
        }
      }
      throw err;
    }
  }, [setDetectedNote, setIsListening]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    pipelineRef.current?.stop();
    pipelineRef.current = null;
    detectorRef.current = null;
    setIsListening(false);
  }, [setIsListening]);

  return { start, stop };
}
```

### Zustand Audio Store

```typescript
// store/audioStore.ts
import { create } from 'zustand';
import { Note } from 'tonal';

interface AudioState {
  isListening: boolean;
  detectedFrequency: number | null;
  detectedNoteName: string | null;
  detectedClarity: number;
  setIsListening: (v: boolean) => void;
  setDetectedNote: (freq: number | null, clarity: number) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isListening: false,
  detectedFrequency: null,
  detectedNoteName: null,
  detectedClarity: 0,
  setIsListening: (isListening) => set({ isListening }),
  setDetectedNote: (freq, clarity) => set({
    detectedFrequency: freq,
    detectedNoteName: freq ? Note.fromFreq(freq) : null,
    detectedClarity: clarity,
  }),
}));
```

### MIDI File Import Component

```typescript
// components/MidiImport.tsx
import { useCallback } from 'react';
import { parseMidiFile } from '../midi/MidiParser';
import { useSongStore } from '../store/songStore';

export function MidiImport() {
  const setSong = useSongStore(s => s.setSong);

  const handleFileChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.mid') && !file.name.endsWith('.midi')) {
      // Show error to user
      return;
    }

    const song = await parseMidiFile(file);
    setSong(song);
  }, [setSong]);

  return (
    <input
      type="file"
      accept=".mid,.midi"
      onChange={handleFileChange}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode for audio processing | AnalyserNode (read-only) or AudioWorklet (processing) | Deprecated ~2020 | ScriptProcessorNode runs on main thread and is deprecated. AnalyserNode is sufficient for Phase 1 read-only analysis |
| webkitAudioContext prefix | Standard AudioContext | Safari 14.1+ (2021) | No prefix needed for modern Safari. Still wise to check: `window.AudioContext \|\| window.webkitAudioContext` for older iOS |
| Manual autocorrelation implementations | pitchy library (McLeod method) | pitchy stable since 2022 | No need to implement autocorrelation manually |
| Raw MIDI binary parsing | @tonejs/midi with structured JSON output | Stable for years | Notes already have time-in-seconds computed |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | None -- Wave 0 (Vitest reads from vite.config.ts by default) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIO-01 | AudioPipeline creates AudioContext and connects mic stream | unit (mock) | `npx vitest run src/audio/AudioPipeline.test.ts -t "creates context"` | -- Wave 0 |
| AUDIO-02 | PitchDetector returns correct note for known frequency | unit | `npx vitest run src/audio/PitchDetector.test.ts -t "detects pitch"` | -- Wave 0 |
| AUDIO-02 | noteUtils converts Hz to correct note name | unit | `npx vitest run src/utils/noteUtils.test.ts` | -- Wave 0 |
| SONG-01 | MidiParser parses .mid file to SongModel with correct note count, timing | unit | `npx vitest run src/midi/MidiParser.test.ts` | -- Wave 0 |
| SONG-01 | MidiImport component accepts .mid file | unit (mock) | `npx vitest run src/components/MidiImport.test.ts` | -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` or `vite.config.ts` with test config -- Vitest setup with jsdom environment
- [ ] `src/audio/AudioPipeline.test.ts` -- covers AUDIO-01 (mock getUserMedia + AudioContext)
- [ ] `src/audio/PitchDetector.test.ts` -- covers AUDIO-02 (feed known waveform, verify frequency)
- [ ] `src/utils/noteUtils.test.ts` -- covers AUDIO-02 (Hz to note name conversions)
- [ ] `src/midi/MidiParser.test.ts` -- covers SONG-01 (parse test .mid file)
- [ ] Test fixture: a small .mid file for parser tests
- [ ] Mock setup for Web Audio API (AudioContext, AnalyserNode, getUserMedia)

## Open Questions

1. **AudioWorklet in Phase 1?**
   - What we know: AnalyserNode-based detection on main thread works for single-note detection at 60fps when there is no canvas rendering competing.
   - What's unclear: Whether main-thread detection will cause any jank even without canvas (React re-renders during detection loop).
   - Recommendation: Start with AnalyserNode approach. Measure performance. Migrate to AudioWorklet in Phase 2 if needed. The AudioPipeline abstraction makes this swap isolated.

2. **Clarity threshold for pitchy**
   - What we know: pitchy returns clarity 0-1. Higher = more confident. The threshold determines false-positive vs false-negative tradeoff.
   - What's unclear: Optimal threshold for piano through laptop mic vs external mic. Literature suggests 0.8-0.95.
   - Recommendation: Start with 0.9, expose as a configurable constant. Tune during testing on real piano.

3. **Safari on iOS actual behavior**
   - What we know: getUserMedia works on iOS Safari but has audio routing quirks and permission re-prompting.
   - What's unclear: Exact behavior on current iOS 18+ Safari. Documentation is fragmented and version-specific.
   - Recommendation: Test on actual iOS device during Phase 1. Document any issues found. Use adapter.js polyfill only if needed.

## Sources

### Primary (HIGH confidence)

- [pitchy GitHub](https://github.com/ianprime0509/pitchy) - API: PitchDetector.forFloat32Array, findPitch returns [frequency, clarity]
- [@tonejs/midi GitHub README](https://github.com/Tonejs/Midi/blob/master/README.md) - Full Midi object structure with tracks, notes (midi, name, time, duration, velocity)
- [tonal GitHub](https://github.com/tonaljs/tonal) - Note.fromFreq(hz), Note.midi(name), Note.freq(name), Note.fromMidi(num), Note.fromFreqSharps(hz)
- [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) - getFloatTimeDomainData API
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - AudioContext, getUserMedia, autoplay policy
- npm registry (2026-03-22) - Verified versions: pitchy 4.1.0, @tonejs/midi 2.0.28, tonal 6.4.3, zustand 5.0.12, vitest 4.1.0

### Secondary (MEDIUM confidence)

- [Detecting pitch with Web Audio API and autocorrelation](https://alexanderell.is/posts/tuner/) - AnalyserNode + autocorrelation walkthrough
- [iOS Safari getUserMedia audio routing](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe) - iOS speaker routing quirk
- [getUserMedia complete guide 2026](https://blog.addpipe.com/getusermedia-getting-started/) - Cross-browser getUserMedia patterns

### Tertiary (LOW confidence)

- Clarity threshold (0.9) is based on general pitch detection literature, not pitchy-specific benchmarks. Needs tuning with real piano input.
- iOS Safari 18+ specific behavior -- documented issues may be resolved in latest versions. Needs device testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified on npm, APIs confirmed from official docs
- Architecture: HIGH - Patterns align with project-level ARCHITECTURE.md research and well-established Web Audio patterns
- Pitfalls: HIGH - AudioContext autoplay, Safari quirks, echo cancellation documented across multiple authoritative sources
- Validation: MEDIUM - Test structure defined but no existing infrastructure to verify against

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain, libraries unlikely to change)
