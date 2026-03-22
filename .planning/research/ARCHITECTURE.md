# Architecture Research

**Domain:** Browser-based piano learning application
**Researched:** 2026-03-22
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
+-----------------------------------------------------------------------+
|                         UI Layer (React)                              |
|  +-------------+  +--------------+  +------------+  +-----------+    |
|  | Piano Roll  |  | On-Screen    |  | Song       |  | Practice  |    |
|  | Canvas      |  | Keyboard     |  | Library    |  | Controls  |    |
|  +------+------+  +------+-------+  +-----+------+  +-----+-----+   |
|         |                |               |               |           |
+---------+----------------+---------------+---------------+-----------+
|                    Application Core (State + Logic)                   |
|  +-------------+  +--------------+  +-------------+  +-----------+   |
|  | Game Loop   |  | Song State   |  | Detection   |  | Practice  |   |
|  | Controller  |  | Manager      |  | Evaluator   |  | Session   |   |
|  +------+------+  +------+-------+  +------+------+  +-----+-----+  |
|         |                |                 |               |         |
+---------+----------------+-----------------+---------------+---------+
|                     Engine Layer (Non-React)                         |
|  +-----------------+  +------------------+  +------------------+     |
|  | Audio Pipeline  |  | MIDI Parser /    |  | Timing Engine    |     |
|  | (Web Audio API) |  | Song Model       |  | (rAF + clock)   |     |
|  +-----------------+  +------------------+  +------------------+     |
+----------------------------------------------------------------------+
|                     Data Layer (Local)                                |
|  +------------------+  +------------------+                          |
|  | Song Storage     |  | Progress Store   |                          |
|  | (IndexedDB)      |  | (localStorage)   |                          |
|  +------------------+  +------------------+                          |
+----------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Audio Pipeline | Capture mic input, run pitch detection, emit detected notes | Web Audio API + AudioWorklet + pitchy/autocorrelation |
| MIDI Parser / Song Model | Parse .mid files into structured note data with timing, tracks, and hand assignments | @tonejs/midi for parsing, custom model for runtime use |
| Timing Engine | Maintain a high-resolution clock that drives both visualization scroll and note evaluation | requestAnimationFrame loop with performance.now() |
| Game Loop Controller | Coordinate timing, visualization, and detection evaluation each frame | Central rAF loop dispatching to subsystems |
| Piano Roll Canvas | Render falling notes synchronized to current playback position | HTML5 Canvas 2D context, redrawn each frame |
| On-Screen Keyboard | Show which notes are expected and which are currently detected | React component with CSS-driven highlights |
| Song State Manager | Track current position in song, handle pause/resume/seek | Zustand or React context store |
| Detection Evaluator | Compare detected notes against expected notes, determine hit/miss | Pure function: (expected[], detected[]) => result |
| Practice Session | Manage wait mode, looping, hand selection, scoring | State machine coordinating song state and evaluator |
| Song Library | Import, list, and manage MIDI files | File input + IndexedDB for persistence |

## Recommended Project Structure

```
src/
├── audio/                  # Audio pipeline (non-React)
│   ├── AudioPipeline.ts    # Mic capture, AudioContext setup
│   ├── PitchDetector.ts    # Pitch detection algorithm wrapper
│   ├── NoteDetector.ts     # Convert frequencies to note events
│   └── worklet/
│       └── pitch-processor.ts  # AudioWorklet processor
├── midi/                   # MIDI parsing and song model
│   ├── MidiParser.ts       # Wrapper around @tonejs/midi
│   ├── SongModel.ts        # Normalized song data structure
│   └── TrackSplitter.ts    # Split tracks into left/right hand
├── engine/                 # Game loop and timing
│   ├── GameLoop.ts         # rAF loop coordinator
│   ├── TimingEngine.ts     # High-resolution clock
│   └── DetectionEvaluator.ts  # Note matching logic
├── visualization/          # Canvas rendering (non-React)
│   ├── PianoRollRenderer.ts   # Falling notes on canvas
│   ├── KeyboardRenderer.ts    # On-screen keyboard drawing
│   └── SheetMusicRenderer.ts  # Staff notation (future)
├── store/                  # Application state
│   ├── songStore.ts        # Current song, position, playback state
│   ├── sessionStore.ts     # Practice mode, hand selection, loop
│   └── libraryStore.ts     # Imported songs collection
├── components/             # React UI components
│   ├── PianoRoll.tsx       # Canvas host component
│   ├── Keyboard.tsx        # On-screen keyboard component
│   ├── SongLibrary.tsx     # Song list and import UI
│   ├── PracticeControls.tsx # Play/pause, loop, hand select
│   └── Layout.tsx          # Responsive shell
├── hooks/                  # React hooks bridging engine to UI
│   ├── useAudioPipeline.ts # Lifecycle for audio capture
│   ├── useGameLoop.ts      # rAF hook with cleanup
│   └── useSongPlayer.ts    # Song playback state hook
├── storage/                # Persistence layer
│   ├── songStorage.ts      # IndexedDB for MIDI files
│   └── progressStorage.ts  # localStorage for practice progress
├── utils/                  # Shared utilities
│   ├── noteUtils.ts        # MIDI note <-> frequency conversion
│   └── timeUtils.ts        # Tempo, tick, time conversions
├── App.tsx
└── main.tsx
```

### Structure Rationale

- **audio/:** Isolated from React entirely. The audio pipeline must run independently on the audio thread (AudioWorklet) and should have zero React dependencies. This is the most performance-sensitive code.
- **midi/:** Pure data transformation. Parsing a MIDI file produces a SongModel that the rest of the app consumes. No side effects, easily testable.
- **engine/:** The coordination layer. Game loop, timing, and note evaluation are plain TypeScript classes/functions -- not React components. This separation is critical because the game loop runs at ~60fps and must not trigger React re-renders on every frame.
- **visualization/:** Canvas renderers are imperative drawing code. They receive state (current time, visible notes, detected notes) and draw to a canvas. They do not own state. Keeping them as plain classes means they can be unit tested and swapped (e.g., WebGL later).
- **store/:** Zustand stores (or similar) bridge engine state to React. Only state that the UI needs to display gets put here. The game loop updates stores at a throttled rate (e.g., 10-15 Hz) rather than every frame.
- **components/:** Thin React components. PianoRoll.tsx just mounts a canvas and hands it to PianoRollRenderer. Most logic lives outside React.
- **hooks/:** Lifecycle management. useAudioPipeline handles requesting mic permission, creating AudioContext, and cleanup on unmount.

## Architectural Patterns

### Pattern 1: Engine-Driven Architecture (Not React-Driven)

**What:** The game loop (requestAnimationFrame) is the primary driver of the application, not React's render cycle. React is used only for UI chrome (buttons, lists, layout). The canvas, audio pipeline, and timing engine are all imperative code that React does not control.

**When to use:** Any real-time interactive application where frame-rate matters. Piano roll animation at 60fps with synchronized audio evaluation cannot be driven by React state updates without severe jank.

**Trade-offs:** More complex initial setup (bridging imperative engine to declarative React), but dramatically better performance and cleaner separation of concerns.

**Example:**
```typescript
// engine/GameLoop.ts -- runs outside React
class GameLoop {
  private running = false;
  private lastTime = 0;
  private renderer: PianoRollRenderer;
  private evaluator: DetectionEvaluator;
  private songState: SongStateStore;

  tick(timestamp: number) {
    if (!this.running) return;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Update song position
    this.songState.advance(dt);

    // Draw current frame
    this.renderer.draw(this.songState.visibleNotes, this.songState.currentTime);

    // Evaluate detected notes against expected
    const detected = this.audioInput.getCurrentNotes();
    const expected = this.songState.expectedNotes;
    this.evaluator.evaluate(expected, detected);

    requestAnimationFrame((t) => this.tick(t));
  }
}
```

### Pattern 2: Producer-Consumer Audio Pipeline

**What:** Audio capture and pitch detection run in an AudioWorklet (separate thread). The worklet produces detected frequency data and posts it to the main thread via MessagePort. The main thread consumes this data in the game loop for note evaluation.

**When to use:** Always, for real-time audio. Running pitch detection on the main thread blocks rendering.

**Trade-offs:** AudioWorklet code runs in a separate global scope with limited API access. Cannot use npm libraries directly in the worklet -- must either bundle detection code into the worklet or use AnalyserNode on the main thread as a simpler (but less performant) fallback.

**Example:**
```typescript
// Worklet approach (preferred):
// audio/worklet/pitch-processor.ts
class PitchProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]) {
    const input = inputs[0][0];
    if (input) {
      const frequency = detectPitch(input, sampleRate);
      this.port.postMessage({ frequency, confidence });
    }
    return true;
  }
}

// Simpler fallback using AnalyserNode on main thread:
// audio/PitchDetector.ts
class PitchDetector {
  private analyser: AnalyserNode;
  private buffer: Float32Array;

  detect(): { frequency: number; confidence: number } | null {
    this.analyser.getFloatTimeDomainData(this.buffer);
    return findPitch(this.buffer, this.analyser.context.sampleRate);
  }
}
```

### Pattern 3: Normalized Song Model

**What:** MIDI files are parsed once on import into a normalized, flat data structure optimized for runtime queries. Notes are stored in time-sorted arrays with absolute timestamps (seconds), not MIDI ticks. Each track is tagged with hand assignment (left/right/unknown).

**When to use:** Always. Raw MIDI data is tick-based and event-driven (note-on/note-off pairs), which is expensive to query at 60fps. Normalizing at import time means the game loop does simple array slicing.

**Trade-offs:** Slightly more memory (duplicated timing info), but orders of magnitude faster at runtime.

**Example:**
```typescript
// midi/SongModel.ts
interface SongNote {
  midi: number;          // MIDI note number (0-127)
  startTime: number;     // Absolute time in seconds
  duration: number;      // Duration in seconds
  velocity: number;      // 0-127
  hand: 'left' | 'right' | 'unknown';
  track: number;
}

interface SongModel {
  name: string;
  duration: number;      // Total duration in seconds
  bpm: number;
  timeSignature: [number, number];
  notes: SongNote[];     // Sorted by startTime
  tracks: TrackInfo[];
}

// Runtime query: get notes visible in current window
function getVisibleNotes(song: SongModel, currentTime: number, windowSize: number): SongNote[] {
  // Binary search for start index, then slice -- O(log n) per frame
  const startIdx = binarySearch(song.notes, currentTime - 0.5);
  const endIdx = binarySearch(song.notes, currentTime + windowSize);
  return song.notes.slice(startIdx, endIdx);
}
```

## Data Flow

### Main Data Flow

```
[Microphone]
    |
    v
[getUserMedia] --> [AudioContext] --> [AudioWorklet / AnalyserNode]
    |                                          |
    |                                   [Pitch Detection]
    |                                          |
    |                                   [Note Detection]
    |                                          |
    v                                          v
                  [Game Loop (rAF)]
                  /        |        \
                 v         v         v
    [Song State]    [Evaluator]    [Canvas Renderer]
    (advance time)  (match notes)  (draw falling notes)
         |              |                |
         v              v                v
    [Zustand Store] <-- results     [Canvas Element]
         |
         v
    [React UI] (controls, keyboard highlights, score)
```

### State Management

```
[Engine State] (updated every frame, ~60Hz)
    |-- currentTime: number
    |-- visibleNotes: SongNote[]
    |-- detectedNotes: number[]
    |-- expectedNotes: number[]
    |
    | (throttled sync, ~10-15Hz)
    v
[UI State] (Zustand stores, triggers React renders)
    |-- isPlaying: boolean
    |-- currentMeasure: number
    |-- score: { hits, misses }
    |-- detectedNoteNames: string[]
    |
    v
[React Components] (re-render on UI state change only)
```

### Key Data Flows

1. **MIDI Import Flow:** File Input --> ArrayBuffer --> @tonejs/midi parse --> raw MIDI JSON --> normalize to SongModel --> store in IndexedDB + load into song store

2. **Real-Time Detection Flow:** Microphone stream --> AudioWorklet (pitch detection at audio sample rate) --> MessagePort --> main thread NoteDetector (frequency-to-MIDI-note conversion, debouncing) --> game loop consumes current detected notes

3. **Frame Render Flow:** rAF fires --> TimingEngine advances currentTime --> SongModel queried for visible notes (binary search) --> PianoRollRenderer draws notes on canvas --> DetectionEvaluator compares expected vs detected --> results written to engine state --> throttled sync to Zustand store --> React re-renders UI controls

4. **Wait Mode Flow:** DetectionEvaluator finds mismatch --> TimingEngine pauses (currentTime stops advancing) --> canvas freezes on current frame --> NoteDetector continues listening --> correct note detected --> TimingEngine resumes --> animation continues

## Scaling Considerations

This is a personal tool with no backend, so "scaling" means complexity scaling, not user scaling.

| Concern | Now (v1) | Future Enhancement |
|---------|----------|-------------------|
| Song complexity | Simple piano pieces, 2 tracks | Multi-instrument MIDI (filter to piano tracks only) |
| Visualization | Canvas 2D piano roll | WebGL for smoother rendering, sheet music view |
| Pitch detection | Monophonic (single note) | Polyphonic chord detection (significantly harder, see anti-patterns) |
| Song library | 10-50 imported MIDIs | Categorization, search, cloud sync |
| Mobile performance | May struggle with canvas + audio | Reduce canvas resolution, simpler detection algo |

### Scaling Priorities

1. **First bottleneck: Polyphonic detection accuracy.** Detecting single notes via autocorrelation is well-proven. Detecting chords via microphone audio is an open research problem. Start with single-note detection and a "close enough" tolerance for chords (detect any note in the chord as a partial match).

2. **Second bottleneck: Mobile performance.** Canvas rendering + real-time audio analysis + pitch detection on mobile browsers will be CPU-intensive. Profile early on mobile Chrome. Consider reducing canvas frame rate to 30fps on mobile or using OffscreenCanvas if supported.

## Anti-Patterns

### Anti-Pattern 1: React-Driven Animation

**What people do:** Use React state to drive canvas animation. Set state with detected notes on every audio callback, causing React to re-render 60+ times per second.
**Why it's wrong:** React's reconciliation is not designed for 60fps animation. Each setState triggers virtual DOM diffing, which adds latency and causes dropped frames. Audio callbacks firing into React state create cascading re-renders.
**Do this instead:** Keep all per-frame state in plain JavaScript objects. Only sync to React (Zustand) at 10-15Hz for UI elements that need it (score display, measure counter). Canvas rendering reads from engine state directly, never from React state.

### Anti-Pattern 2: Pitch Detection on Main Thread

**What people do:** Use AnalyserNode.getFloatTimeDomainData() in the rAF loop and run autocorrelation on the main thread.
**Why it's wrong:** Autocorrelation over a 2048-sample buffer is O(n^2). On slower devices this blocks the frame, causing visible jank in the piano roll animation. Worse, if the main thread is blocked, audio callbacks queue up.
**Do this instead:** Use AudioWorklet for pitch detection (runs on audio thread). If AudioWorklet is too complex initially, use AnalyserNode but keep the FFT size small (1024) and profile on target devices. Migrate to AudioWorklet when needed.

### Anti-Pattern 3: Re-parsing MIDI Every Frame

**What people do:** Query the raw MIDI event stream each frame to find current notes, iterating through all events.
**Why it's wrong:** MIDI files can have thousands of events. Linear scanning per frame is O(n) per frame, which compounds with song length.
**Do this instead:** Pre-process MIDI into a sorted SongNote[] array at import time. Use binary search (O(log n)) to find the visible window each frame. Cache the last search index since frames are sequential (often O(1) amortized).

### Anti-Pattern 4: Attempting Full Polyphonic Detection via Microphone

**What people do:** Try to build a system that reliably identifies all notes in a chord played on an acoustic piano through a laptop microphone.
**Why it's wrong:** Polyphonic pitch detection from real-world audio is an unsolved problem in the general case. Harmonics overlap, room acoustics add noise, and laptop microphones have poor frequency response below 100Hz. Building the app around perfect chord detection leads to a system that never feels reliable.
**Do this instead:** Design the evaluator to be tolerant. For chords, detect the presence of *any* expected note as a partial success. Use a confidence threshold. Show visual feedback that is encouraging rather than punitive. Consider adding optional MIDI keyboard input in a future version for users who want precise chord detection.

## Integration Points

### External APIs / Browser APIs

| API | Integration Pattern | Notes |
|-----|---------------------|-------|
| Web Audio API (AudioContext) | Created once on user gesture, shared across pipeline | Must be created/resumed after user interaction (browser autoplay policy). Safari requires webkit prefix check. |
| getUserMedia (Microphone) | Request permission once, connect stream to AudioContext | Permission prompt blocks. Handle denial gracefully. Stream must be stopped on cleanup. |
| AudioWorklet | Register processor, connect to audio graph | Worklet file must be served as separate JS file (not bundled inline). Vite handles this with `?worker` or explicit URL. |
| IndexedDB | Store/retrieve MIDI file blobs and parsed SongModel | Use idb wrapper library for promise-based API. Key by filename + hash for dedup. |
| requestAnimationFrame | Game loop driver | Cancel on unmount. Pauses when tab is hidden (good for battery, but must handle resume). |
| Canvas 2D | Rendering target for piano roll | Get context once, reuse. Set willReadFrequently: false. Handle DPI scaling for retina displays. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| AudioWorklet <-> Main Thread | MessagePort (postMessage) | Structured clone overhead. Send frequency + confidence, not raw audio buffers. |
| Engine (GameLoop) <-> React (UI) | Zustand store (write from engine, read from React) | Throttle writes to 10-15Hz. Never let React drive the engine. |
| MIDI Parser <-> Song Model | Function call (sync, one-time) | Parse is a pure transform. Returns SongModel. No ongoing connection. |
| Canvas Renderer <-> Engine | Method call per frame (renderer.draw(state)) | Renderer is stateless -- receives everything it needs each frame. |
| Storage <-> App | Async (IndexedDB is async) | Load song list on app start. Import is infrequent, latency acceptable. |

## Suggested Build Order

Based on component dependencies, here is the recommended build order for phasing:

1. **MIDI Parser + Song Model** -- No dependencies. Parse a .mid file, produce a SongModel. This is the data foundation everything else reads from. Can be built and tested in isolation.

2. **Audio Pipeline (Microphone + Pitch Detection)** -- No dependency on MIDI. Capture mic, detect pitch, display frequency. Prove the hardest technical risk early. Start with AnalyserNode approach (simpler), upgrade to AudioWorklet later.

3. **Timing Engine + Game Loop** -- Depends on Song Model (needs notes to scroll). Build the rAF loop, advance a clock, query visible notes from SongModel.

4. **Piano Roll Canvas Renderer** -- Depends on Game Loop + Song Model. Render falling notes. This is where the app starts feeling real.

5. **Detection Evaluator + Note Matching** -- Depends on Audio Pipeline + Song Model. Compare what the user plays against what is expected. Wire audio detection output into the game loop.

6. **Practice Features (Wait Mode, Looping, Hand Selection)** -- Depends on Detection Evaluator + Timing Engine. These are state machine behaviors on top of the core loop.

7. **Song Library + Persistence** -- Depends on MIDI Parser. Add import UI, IndexedDB storage, song list management.

8. **On-Screen Keyboard** -- Depends on Detection Evaluator (to highlight detected notes) + Song Model (to highlight expected notes). Relatively simple rendering.

9. **Sheet Music View** -- Most complex visualization. Depends on Song Model. Build last or defer.

## Sources

- [Detecting pitch with Web Audio API and autocorrelation](https://alexanderell.is/posts/tuner/) -- Detailed walkthrough of autocorrelation-based pitch detection in the browser
- [A Web Audio experiment: detecting piano notes (David Gilbertson)](https://david-gilbertson.medium.com/a-web-audio-experiment-666743e16679) -- Practical piano note detection with consensus algorithm
- [pitchy on npm](https://www.npmjs.com/package/pitchy) -- Lightweight pitch detection library for browser and Node
- [pitchfinder on GitHub](https://github.com/peterkhayes/pitchfinder) -- Collection of pitch detection algorithms (YIN, AMDF, etc.)
- [@tonejs/midi on npm](https://www.npmjs.com/package/@tonejs/midi) -- MIDI file parser producing structured JSON
- [MDN: Background audio processing using AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet) -- Official AudioWorklet documentation
- [MDN: Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) -- Audio visualization patterns
- [Canvas vs SVG performance (Boris Smus)](https://smus.com/canvas-vs-svg-performance/) -- Performance comparison justifying Canvas for high-element-count animation
- [html-midi-player](https://cifkao.github.io/html-midi-player/) -- Reference implementation of MIDI visualization (piano-roll, waterfall, staff types)
- [WaveRoll: MIDI Piano-Roll Visualization library](https://arxiv.org/abs/2511.09562) -- Academic paper on comparative MIDI piano roll visualization
- [Using requestAnimationFrame with React Hooks (CSS-Tricks)](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) -- Pattern for bridging rAF with React lifecycle
- [Performant Game Loops in JavaScript](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) -- Fixed timestep vs variable timestep game loop patterns

---
*Architecture research for: browser-based piano learning application*
*Researched: 2026-03-22*
