# Phase 2: Visualization + Playback - Research

**Researched:** 2026-03-22
**Domain:** Canvas 2D piano roll rendering, audio synthesis/playback, timing synchronization
**Confidence:** HIGH

## Summary

Phase 2 transforms the project from a microphone-input-only tool into a visual, playable experience. It requires three tightly coupled subsystems: (1) a Canvas 2D falling-notes piano roll renderer, (2) an on-screen piano keyboard with note highlighting, and (3) audio synthesis that plays back MIDI songs through the speakers. The critical architectural challenge is timing synchronization -- all three subsystems must share a single clock source (`AudioContext.currentTime`) to prevent visual-audio drift.

The existing Phase 1 code provides a solid foundation: `SongModel` with time-sorted notes, Zustand stores for song and audio state, and an `AudioPipeline` that already owns an `AudioContext`. Phase 2 builds on this by adding a playback engine (game loop + timing), a canvas renderer, a keyboard component, and a sampler instrument for sound output.

**Primary recommendation:** Use `smplr` (SplendidGrandPiano) for audio synthesis -- it is lightweight, uses AudioContext.currentTime for scheduling, includes high-quality piano samples with no server setup, and has a clean TypeScript API. Use Canvas 2D with requestAnimationFrame for the falling notes, reading `AudioContext.currentTime` each frame as the single source of truth for position.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIZ-01 | Falling notes (piano roll) display scrolls toward on-screen keyboard synced to song timing | Canvas 2D renderer driven by rAF loop reading AudioContext.currentTime; binary search for visible notes from SongModel |
| VIZ-02 | On-screen piano keyboard highlights expected notes and detected notes in distinct colors | React/CSS keyboard component receiving current expected notes from playback engine and detected notes from existing audioStore |
| AUDIO-04 | App plays song audio so user can hear what the piece should sound like | smplr SplendidGrandPiano schedules notes ahead using AudioContext.currentTime; supports play/pause/seek via stop-and-reschedule |
</phase_requirements>

## Standard Stack

### Core (New for Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| smplr | 0.19.0 | Piano audio synthesis/playback | Lightweight sampler with SplendidGrandPiano built-in. Uses AudioContext.currentTime for scheduling. No server needed -- samples hosted. Clean TypeScript API. ~50KB bundle + lazy-loaded samples. Successor to soundfont-player by the same author |
| Canvas 2D (native) | N/A | Falling notes rendering | Browser-native. Outperforms DOM by orders of magnitude for hundreds of moving rectangles. No library needed for simple colored rects |

### Existing (From Phase 1, reused)

| Library | Version | Purpose | Relevance to Phase 2 |
|---------|---------|---------|----------------------|
| Zustand | 5.x | State management | New playbackStore for play/pause/seek/position state |
| React | 19.x | UI framework | Keyboard component, playback controls, canvas host |
| tonal | 6.x | Note utilities | MIDI number to note name for keyboard labels |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| smplr | Tone.js (full) | Tone.js is 150KB+ and includes synthesis, effects, transport -- massive overkill. We only need sample playback. smplr is purpose-built for this |
| smplr | soundfont-player | soundfont-player is archived/unmaintained (last publish 2019). smplr is its spiritual successor by the same author |
| smplr | WebAudioFont | Lower-level, less ergonomic API. smplr wraps similar functionality with better DX |
| smplr | Custom oscillators | Sounds terrible for piano. Sampled audio is mandatory for acceptable quality |
| Canvas 2D | PixiJS/WebGL | Overkill for colored rectangles. Canvas 2D is simpler, smaller bundle, sufficient for piano roll |
| CSS keyboard | Canvas keyboard | CSS keyboard is simpler, more accessible, easier to style with Tailwind. No performance concern since only 88 static keys with highlight changes |

**Installation:**
```bash
npm install smplr
```

**Version verification:** smplr 0.19.0 confirmed via `npm view smplr version` on 2026-03-22.

## Architecture Patterns

### Recommended New Files Structure
```
src/
├── engine/                     # NEW: Game loop and timing
│   ├── PlaybackEngine.ts       # Central rAF loop + AudioContext clock
│   └── NoteScheduler.ts        # Schedules notes to smplr ahead of playback
├── visualization/              # NEW: Canvas rendering (non-React)
│   ├── PianoRollRenderer.ts    # Falling notes on canvas
│   └── colors.ts               # Note color constants
├── components/                 # EXISTING + NEW
│   ├── PianoRoll.tsx           # NEW: Canvas host component
│   ├── PianoKeyboard.tsx       # NEW: On-screen keyboard with highlights
│   ├── PlaybackControls.tsx    # NEW: Play/pause/seek UI
│   ├── PracticeView.tsx        # NEW: Layout combining roll + keyboard + controls
│   ├── MicrophoneSetup.tsx     # existing
│   ├── MidiImport.tsx          # existing
│   ├── NoteDisplay.tsx         # existing
│   └── SongInfo.tsx            # existing
├── store/
│   ├── playbackStore.ts        # NEW: Playback state (isPlaying, position, etc.)
│   ├── songStore.ts            # existing
│   └── audioStore.ts           # existing
├── hooks/
│   ├── usePlaybackEngine.ts    # NEW: Lifecycle for playback engine
│   └── useAudioPipeline.ts     # existing
└── types/
    ├── playback.ts             # NEW: Playback-related types
    ├── song.ts                 # existing
    └── audio.ts                # existing
```

### Pattern 1: AudioContext as Single Clock Source
**What:** All timing reads from `AudioContext.currentTime`. The rAF loop reads this clock each frame to compute note positions, determine which notes to highlight, and know where the playhead is. No `performance.now()`, no `Date.now()`, no frame counting.
**When to use:** Always, for any audio-synchronized visualization.
**Why:** AudioContext.currentTime is the only clock that stays in perfect sync with audio output. Using a different clock causes drift over time (see Pitfall 5 in project pitfalls research).
**Example:**
```typescript
// engine/PlaybackEngine.ts
class PlaybackEngine {
  private audioContext: AudioContext;
  private startOffset = 0;      // where in the song we started from (seconds)
  private startClockTime = 0;   // AudioContext.currentTime when play was pressed
  private playing = false;

  get currentTime(): number {
    if (!this.playing) return this.startOffset;
    return this.startOffset + (this.audioContext.currentTime - this.startClockTime);
  }

  play(fromTime = 0) {
    this.startOffset = fromTime;
    this.startClockTime = this.audioContext.currentTime;
    this.playing = true;
    this.scheduleNotes(fromTime);
    this.tick();
  }

  pause() {
    this.startOffset = this.currentTime;
    this.playing = false;
    this.piano.stop(); // stop all scheduled notes
  }

  seek(toTime: number) {
    const wasPlaying = this.playing;
    this.pause();
    if (wasPlaying) this.play(toTime);
    else this.startOffset = toTime;
  }

  private tick = () => {
    if (!this.playing) return;
    const t = this.currentTime;

    // Render visible notes on canvas
    this.renderer.draw(t, this.song);

    // Update store (throttled to ~15Hz for React)
    this.syncToStore(t);

    // Schedule upcoming notes for audio
    this.scheduleAhead(t);

    requestAnimationFrame(this.tick);
  };
}
```

### Pattern 2: Look-Ahead Note Scheduling
**What:** Instead of triggering notes at the exact moment they should play, schedule them slightly ahead of time using `AudioContext.currentTime` offsets. This ensures sample-accurate playback even when rAF frames are delayed.
**When to use:** Always when playing back MIDI notes through a sampler.
**Example:**
```typescript
// engine/NoteScheduler.ts
const LOOKAHEAD = 0.1; // schedule 100ms ahead

class NoteScheduler {
  private scheduledUpTo = 0;
  private piano: SplendidGrandPiano;

  scheduleAhead(currentTime: number, song: SongModel, audioCtx: AudioContext) {
    const scheduleEnd = currentTime + LOOKAHEAD;
    // Find notes between scheduledUpTo and scheduleEnd
    const notes = getNotesInRange(song, this.scheduledUpTo, scheduleEnd);

    for (const note of notes) {
      const audioTime = audioCtx.currentTime + (note.startTime - currentTime);
      this.piano.start({
        note: note.midi,
        velocity: Math.round(note.velocity * 127),
        time: audioTime,
        duration: note.duration,
      });
    }
    this.scheduledUpTo = scheduleEnd;
  }
}
```

### Pattern 3: Canvas Host Component (React-Canvas Bridge)
**What:** A thin React component that manages a `<canvas>` element, passes the ref to an imperative renderer class, and handles resize/cleanup.
**When to use:** Whenever using Canvas 2D inside React.
**Example:**
```typescript
// components/PianoRoll.tsx
function PianoRoll({ song }: { song: SongModel }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PianoRollRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    rendererRef.current = new PianoRollRenderer(ctx);

    // Handle resize
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      rendererRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-[60vh]" />;
}
```

### Anti-Patterns to Avoid
- **React state for per-frame data:** Never put currentTime, visibleNotes, or note positions in React state. This triggers 60 re-renders/second. Use plain JS variables in the engine; only sync UI-relevant data (isPlaying, measure number) to Zustand at ~10-15Hz.
- **Multiple clock sources:** Never mix `performance.now()` and `AudioContext.currentTime`. Pick one (AudioContext), use it everywhere.
- **Scheduling all notes at play start:** For long songs, scheduling thousands of notes at once floods the Web Audio scheduler. Use look-ahead scheduling to only schedule notes 100-200ms ahead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Piano audio samples | OscillatorNode synthesis | smplr SplendidGrandPiano | Oscillators sound nothing like a real piano. Multi-sampled instruments with velocity layers are needed for acceptable quality |
| Binary search for visible notes | Linear scan each frame | Standard binary search utility | O(log n) vs O(n) per frame. With 10K+ notes in a long song, linear scan causes frame drops |
| DPI-aware canvas | Manual pixel ratio math | ResizeObserver + devicePixelRatio pattern | Getting canvas DPI right across displays is fiddly. The pattern above handles it correctly |
| MIDI note to key position mapping | Manual arithmetic | Lookup table (12-note pattern repeats per octave) | Black/white key layout has irregular spacing that is error-prone to compute |

**Key insight:** The smplr library eliminates the entire audio synthesis problem. Without it, you would need to load SoundFont files, decode them, build a sample player with velocity layers, handle note-on/note-off, and manage polyphony -- hundreds of lines of tricky audio code.

## Common Pitfalls

### Pitfall 1: Audio-Visual Sync Drift
**What goes wrong:** Falling notes gradually desync from audio output over a 3-minute song.
**Why it happens:** Using `performance.now()` or frame counting instead of `AudioContext.currentTime` for the animation clock. These clocks run at different rates.
**How to avoid:** Read `AudioContext.currentTime` on every rAF frame. Compute song position as `startOffset + (audioCtx.currentTime - startClockTime)`. Never accumulate deltas.
**Warning signs:** Notes feel "early" or "late" after 30+ seconds of playback.

### Pitfall 2: Canvas Blurry on Retina Displays
**What goes wrong:** Text and note rectangles look fuzzy on high-DPI screens.
**Why it happens:** Canvas pixel dimensions don't match CSS dimensions. A 400px CSS canvas renders at 400 device pixels, but retina screens have 2x+ pixel ratio.
**How to avoid:** Set `canvas.width = canvas.clientWidth * devicePixelRatio` and `ctx.scale(devicePixelRatio, devicePixelRatio)`. Use ResizeObserver to update on resize.
**Warning signs:** Everything looks sharp on a 1080p monitor but blurry on a MacBook.

### Pitfall 3: Seek Causes Audio Ghosts
**What goes wrong:** After seeking, previously-scheduled notes still play at their old times. User hears notes from the section they seeked away from.
**Why it happens:** Web Audio API schedules are irrevocable once committed. You cannot cancel a scheduled `start()` call on an AudioBufferSourceNode.
**How to avoid:** Call `piano.stop()` (stops ALL notes) on every seek/pause. Then reschedule from the new position. smplr's `stop()` method handles this.
**Warning signs:** Ghost notes playing after pause/seek operations.

### Pitfall 4: Overloading the Audio Scheduler
**What goes wrong:** App freezes briefly when pressing play on a long song.
**Why it happens:** Scheduling all 5000+ notes at once saturates the Web Audio thread.
**How to avoid:** Use look-ahead scheduling. Only schedule notes 100-200ms ahead of the current playback position. Advance the schedule window each frame.
**Warning signs:** Noticeable delay between pressing play and hearing audio on songs with many notes.

### Pitfall 5: AudioContext Shared Between Mic and Playback
**What goes wrong:** Creating a second AudioContext for playback while the mic has one causes issues (resource limits, Safari restrictions).
**Why it happens:** Browsers limit the number of active AudioContexts (typically 4-6). Safari is more restrictive.
**How to avoid:** Reuse the SAME AudioContext for both microphone input and synthesis output. The existing `AudioPipeline` creates one -- pass it to smplr. If the mic is not active, create a new AudioContext for playback-only mode.
**Warning signs:** Audio stops working after toggling mic on/off several times.

## Code Examples

### Piano Roll Renderer (Core Drawing Logic)
```typescript
// visualization/PianoRollRenderer.ts
// Draws falling notes as colored rectangles on a Canvas 2D context

const TOTAL_KEYS = 88;
const MIN_MIDI = 21; // A0
const MAX_MIDI = 108; // C8

class PianoRollRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  draw(currentTime: number, song: SongModel, viewWindow: number = 4) {
    const { ctx } = this;
    const w = ctx.canvas.clientWidth;
    const h = ctx.canvas.clientHeight;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Key width = canvas width / number of keys
    const keyWidth = w / TOTAL_KEYS;

    // Notes fall from top to bottom. Play line is at the bottom.
    // currentTime maps to bottom edge. currentTime + viewWindow maps to top.
    for (const note of getVisibleNotes(song, currentTime, viewWindow)) {
      const x = (note.midi - MIN_MIDI) * keyWidth;
      const noteTop = h - ((note.startTime - currentTime + note.duration) / viewWindow) * h;
      const noteHeight = (note.duration / viewWindow) * h;

      ctx.fillStyle = isBlackKey(note.midi) ? '#6366f1' : '#818cf8';
      ctx.fillRect(x, noteTop, keyWidth - 1, Math.max(noteHeight, 2));
    }

    // Draw play line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.stroke();
  }
}

function isBlackKey(midi: number): boolean {
  const pc = midi % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}
```

### On-Screen Keyboard (CSS Approach)
```typescript
// components/PianoKeyboard.tsx
// React component with CSS-styled keys, highlight via className

interface KeyProps {
  midi: number;
  isExpected: boolean;   // note should be played now (from song)
  isDetected: boolean;   // note is currently heard (from mic)
}

function PianoKey({ midi, isExpected, isDetected }: KeyProps) {
  const black = isBlackKey(midi);
  const base = black
    ? 'bg-gray-900 h-[60%] w-[60%] z-10 -mx-[3%]'
    : 'bg-white h-full w-full border border-gray-300';

  const highlight = isExpected && isDetected
    ? 'bg-green-500'        // correct: both expected and detected
    : isExpected
    ? 'bg-amber-400'        // expected but not yet played
    : isDetected
    ? 'bg-blue-400'         // detected but not expected
    : '';

  return (
    <div className={`relative inline-block ${base} ${highlight} rounded-b transition-colors`} />
  );
}
```

### Playback Store
```typescript
// store/playbackStore.ts
import { create } from 'zustand';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;     // synced from engine at ~15Hz
  duration: number;        // song duration
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
}));
```

### Sharing AudioContext Between Mic and Playback
```typescript
// audio/AudioPipeline.ts -- modification needed
// Expose the AudioContext so playback engine can reuse it

export class AudioPipeline {
  private ctx: AudioContext | null = null;
  // ...existing code...

  /** Expose AudioContext for reuse by playback engine */
  get audioContext(): AudioContext | null {
    return this.ctx;
  }
}

// OR: Create a shared AudioContext provider
// engine/PlaybackEngine.ts
class PlaybackEngine {
  constructor(audioContext: AudioContext) {
    // Reuse existing context from AudioPipeline if available,
    // otherwise create new one
    this.audioContext = audioContext;
    this.piano = new SplendidGrandPiano(audioContext);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| soundfont-player for web MIDI playback | smplr (same author, modern rewrite) | ~2022 | Better API, maintained, TypeScript, CacheStorage for samples |
| Tone.js for simple playback | smplr for sample-only use cases | Ongoing | 150KB+ savings if you only need sample playback, not synthesis |
| ScriptProcessorNode for audio | AudioWorklet | 2018+ | Already handled in Phase 1 architecture decisions |
| setInterval animation | requestAnimationFrame | Long established | Already in project architecture |

**Note on STACK.md:** The project stack research lists "Tone.js (audio synthesis) - Do not use" under "What NOT to Use." This was correct for Phase 1 (detection only), but Phase 2 needs audio output. The recommendation is smplr rather than Tone.js -- it is much lighter for the playback-only use case. The STACK.md guidance remains valid: do not use Tone.js.

## Open Questions

1. **AudioContext sharing strategy**
   - What we know: Both mic capture and playback need an AudioContext. Browsers limit active contexts (4-6). Sharing is preferred.
   - What's unclear: If user starts playback without mic, then later enables mic, do we need to rewire? Or always create context on first user gesture?
   - Recommendation: Create a shared AudioContext on the first user interaction (either mic or play). Pass it to both AudioPipeline and PlaybackEngine. If mic is not needed, the context still works for playback alone.

2. **Sample loading latency**
   - What we know: smplr's SplendidGrandPiano loads samples lazily from a CDN. First load may take 1-3 seconds.
   - What's unclear: Exact load time on slow connections. Whether CacheStorage is used by default.
   - Recommendation: Show a loading indicator. Call `await piano.load` before enabling the play button. Samples are cached by the browser after first load.

3. **Piano roll scroll direction and play line position**
   - What we know: Most piano learning apps (Synthesia, Simply Piano) have notes falling downward with the play line at the bottom.
   - What's unclear: Whether play line should be at exact bottom or slightly offset to give visual "landing zone."
   - Recommendation: Place play line ~10% from bottom to give notes visual space to "land." This is a UX tuning detail that can be adjusted.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (test section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIZ-01 | Piano roll renders visible notes for a given time | unit | `npx vitest run src/visualization/PianoRollRenderer.test.ts -x` | No - Wave 0 |
| VIZ-01 | getVisibleNotes returns correct slice via binary search | unit | `npx vitest run src/engine/PlaybackEngine.test.ts -x` | No - Wave 0 |
| VIZ-02 | Keyboard highlights expected and detected notes distinctly | unit | `npx vitest run src/components/PianoKeyboard.test.tsx -x` | No - Wave 0 |
| AUDIO-04 | NoteScheduler schedules notes with correct AudioContext times | unit | `npx vitest run src/engine/NoteScheduler.test.ts -x` | No - Wave 0 |
| AUDIO-04 | PlaybackEngine play/pause/seek updates state correctly | unit | `npx vitest run src/engine/PlaybackEngine.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/visualization/PianoRollRenderer.test.ts` -- covers VIZ-01 rendering logic (mock canvas context)
- [ ] `src/engine/PlaybackEngine.test.ts` -- covers VIZ-01 timing, AUDIO-04 play/pause/seek
- [ ] `src/engine/NoteScheduler.test.ts` -- covers AUDIO-04 look-ahead scheduling
- [ ] `src/components/PianoKeyboard.test.tsx` -- covers VIZ-02 highlight behavior

Note: Canvas rendering tests will mock `CanvasRenderingContext2D`. Audio scheduling tests will mock `AudioContext` and smplr instrument. These tests verify logic, not visual output.

## Sources

### Primary (HIGH confidence)
- [smplr GitHub README](https://github.com/danigb/smplr) - Full API documentation, SplendidGrandPiano usage, AudioContext.currentTime scheduling
- [smplr npm](https://www.npmjs.com/package/smplr) - Version 0.19.0 confirmed
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - Animation frame timing
- [MDN: AudioContext.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime) - High-precision audio clock

### Secondary (MEDIUM confidence)
- [Tone.js](https://tonejs.github.io/) - Evaluated and rejected for this use case (too heavy)
- [Canvas animation in React (DEV)](https://dev.to/ptifur/animation-with-canvas-and-requestanimationframe-in-react-5ccj) - React-Canvas bridge patterns
- [webaudio-pianoroll](https://github.com/g200kg/webaudio-pianoroll) - Reference implementation for piano roll with Web Audio sync
- [Web Audio timing article](https://www.jamieonkeys.dev/posts/web-audio-api-output-latency/) - Output latency compensation strategies

### Tertiary (LOW confidence)
- [soundfont-player](https://github.com/danigb/soundfont-player) - Archived predecessor to smplr, confirmed unmaintained

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - smplr verified on npm, API confirmed via README, AudioContext.currentTime scheduling confirmed
- Architecture: HIGH - Canvas 2D + rAF + AudioContext clock pattern is well-established and documented in project architecture research
- Pitfalls: HIGH - Audio-visual sync drift and shared AudioContext issues are well-documented in project pitfalls research; seek ghost-notes verified from Web Audio API behavior

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable domain, libraries have infrequent releases)
