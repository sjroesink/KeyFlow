# Project Research Summary

**Project:** WebPianoLearner
**Domain:** Browser-based piano learning app with microphone pitch detection
**Researched:** 2026-03-22
**Confidence:** HIGH (stack, features, pitfalls); MEDIUM (chord detection, polyphonic architecture)

## Executive Summary

WebPianoLearner is a Synthesia-style piano practice tool that runs entirely in the browser, uses a microphone for real-time note detection, and accepts any user-imported MIDI file. Research confirms this is a well-understood product category with clear competitive examples (Flowkey, Simply Piano, Synthesia), a known technology stack, and documented architectural patterns. The recommended approach is an engine-driven React SPA built with Vite + TypeScript, where a requestAnimationFrame game loop drives canvas rendering and a Web Audio pipeline handles pitch detection — React is used only for UI chrome, never for frame-rate animation. The hardest single technical problem is polyphonic (chord) detection from microphone audio; the research recommendation is to ship single-note detection reliably at v1 and treat chord detection as a phased research effort.

The three most consequential decisions are: (1) using `AudioContext.currentTime` as the single timing clock for all audio-visual sync, never `performance.now()` or frame counting; (2) moving pitch detection to an AudioWorklet (off the main thread) from the start; and (3) pre-normalizing MIDI data to a flat `SongNote[]` array at import time rather than parsing raw MIDI events each frame. Getting any of these wrong creates technical debt that is expensive to retrofit. The architecture research provides explicit patterns for each; following them closely is more important than speed of implementation.

The key risk to the project is over-committing to chord detection accuracy before the UX is designed around realistic limitations. Polyphonic pitch detection from a laptop mic is an open problem — the app must be designed so the practice loop is genuinely useful with single-note detection alone. Chord detection should be layered on as a progressive enhancement with a tolerant matching strategy, not a hard prerequisite for the wait-mode feature.

## Key Findings

### Recommended Stack

The stack is dominated by browser-native APIs (Web Audio API, Canvas 2D, IndexedDB) plus a small set of well-chosen libraries. There are no controversial choices; every recommendation has a clear rationale and a tested alternative that was explicitly rejected. The only area of medium confidence is chord detection: no JS library solves polyphonic pitch detection from microphone audio well, and a custom FFT approach or a WASM toolkit (essentia.js) may be needed.

**Core technologies:**
- **React 19 + TypeScript 5.7 + Vite 6:** UI shell and build toolchain — project constraints, industry standard for React+TS SPAs in 2026
- **pitchy 4.1.0:** Monophonic pitch detection — McLeod Pitch Method, best accuracy/speed tradeoff for real-time single-note detection, 3KB, zero deps
- **Web Audio API (native):** Microphone capture and audio graph — no library needed for the plumbing layer; AnalyserNode or AudioWorklet for analysis
- **@tonejs/midi 2.0.28:** MIDI file parsing — de facto JS standard, TypeScript-friendly, produces clean JSON from .mid files
- **tonal 6.x:** Music theory / note conversions — bridges Hz (pitch detection output) to MIDI note numbers (song model), pure functions, tree-shakeable
- **Zustand 5.x:** Global state — minimal boilerplate, works outside React (critical for audio callback integration), throttled sync between game loop and UI
- **HTML5 Canvas 2D (native):** Piano roll / falling notes visualization — outperforms DOM for hundreds of moving rectangles; Canvas 2D is sufficient without WebGL
- **VexFlow 5.x:** Sheet music notation — deferred to v2, noted here because it is the only viable option if added later
- **Tailwind CSS 4.x:** Styling — rapid UI chrome prototyping, Vite plugin, CSS-first config in v4
- **idb-keyval 6.x:** IndexedDB wrapper — async storage for imported MIDI files (too large for localStorage)

See `.planning/research/STACK.md` for full alternatives analysis.

### Expected Features

The feature landscape is well-documented through competitor analysis (Flowkey, Simply Piano, Synthesia). Table stakes are clearly defined. The most defensible differentiator is free, unrestricted MIDI import with no subscription wall. The wait mode / microphone detection loop is the core value proposition that separates this from passive Synthesia-style playback.

**Must have (table stakes):**
- MIDI file import and parsing — foundation; nothing else works without it
- Falling notes (piano roll) visualization — the core interaction model users recognize
- On-screen piano keyboard with expected/detected note highlighting — visual anchor
- Single-note pitch detection via microphone — core value proposition
- Wait Mode — pauses playback until user plays correct note; the killer practice feature
- Hand separation (L/R) — essential for practicing real pieces
- Tempo/speed control — necessary for learning difficult passages
- Audio playback of non-practiced hand — accompaniment makes practice musical
- Song progress bar with seeking — navigation essential

**Should have (competitive/differentiating):**
- Loop/section repeat — users will immediately want this after Wait Mode works
- Visual accuracy feedback (green/yellow/red note coloring) — reinforces correct playing
- Practice statistics and progress tracking — motivation and retention, stored in localStorage
- Song library management (IndexedDB) — save imported songs, organize favorites
- Responsive mobile layout — desktop-first, then adapt
- Chord detection via microphone — phased approach; design for tolerance from the start

**Defer (v2+):**
- Sheet music view — HIGH complexity; requires MIDI quantization logic; VexFlow integration
- MIDI keyboard input — contradicts mic-first philosophy; Web MIDI API exists when needed
- Finger number hints — requires MIDI files with finger annotation (rare) or algorithmic assignment
- PWA/offline support — marginal benefit for a home-WiFi personal tool

See `.planning/research/FEATURES.md` for full competitor feature matrix and prioritization table.

### Architecture Approach

The architecture is engine-driven, not React-driven. A `requestAnimationFrame` game loop is the primary application driver; React handles layout and UI chrome only. This separation is non-negotiable for 60fps canvas animation with real-time audio evaluation. The app has four clear layers: UI (React components), Application Core (Zustand stores, game loop coordinator, detection evaluator), Engine (audio pipeline, MIDI/song model, timing engine — all pure TypeScript, zero React), and Data (IndexedDB for songs, localStorage for progress).

**Major components:**
1. **Audio Pipeline** (`src/audio/`) — mic capture via `getUserMedia`, pitch detection via AudioWorklet + pitchy, frequency-to-MIDI-note conversion; runs entirely off the React render cycle
2. **MIDI Parser + Song Model** (`src/midi/`) — parse `.mid` files with @tonejs/midi, normalize to flat `SongNote[]` array with absolute timestamps in seconds; hand assignment via track analysis + heuristic pitch-threshold splitting
3. **Timing Engine + Game Loop** (`src/engine/`) — `requestAnimationFrame` loop with `AudioContext.currentTime` as master clock; drives visualization scroll and note evaluation each frame
4. **Canvas Renderers** (`src/visualization/`) — imperative drawing classes (not React components); `PianoRollRenderer` receives state each frame and draws, owns no state itself
5. **Zustand Stores** (`src/store/`) — bridge between engine state (60Hz) and React UI (10-15Hz throttled sync)
6. **Practice Session State Machine** — coordinates Wait Mode, looping, hand selection on top of the game loop

See `.planning/research/ARCHITECTURE.md` for data flow diagrams, full project structure, and code examples.

### Critical Pitfalls

Six critical pitfalls were identified. The top five, in order of severity and phase relevance:

1. **Polyphonic detection is a fundamentally different problem than monophonic pitch detection** — harmonics from lower notes overlap with fundamentals of higher notes; 3-6 note chords from a laptop mic are unreliable even with good FFT code. Avoid by designing the evaluator to be tolerant from the start (chroma vector / pitch-class matching, partial credit for chords), not by trying to solve the hard problem perfectly.

2. **AudioContext autoplay policy and Safari restrictions break the app silently** — `AudioContext` created on page load will be silently suspended; iOS Safari has unique behaviors around `getUserMedia`. Avoid by always creating `AudioContext` inside a click handler, always checking `.state` and calling `.resume()`, and testing on Safari/iOS from day one, not as an afterthought.

3. **Audio-visual sync drift** — `requestAnimationFrame` and the Web Audio API use separate clocks; using `performance.now()` or frame counting causes drift over multi-minute songs. Avoid by using `AudioContext.currentTime` as the single source of truth for all timing; add a user-adjustable latency compensation slider.

4. **Pitch detection latency makes real-time feedback feel broken** — 150-500ms round-trip is common with naive buffer sizing; musicians notice >50ms. Avoid by using AudioWorklet (off main thread), overlapping analysis windows, and showing onset feedback immediately before pitch is fully resolved.

5. **MIDI files do not reliably separate left and right hands** — Format 0 files merge both hands into one track; different export tools use channels, tracks, or voice names inconsistently. Avoid by implementing a pitch-threshold heuristic splitter (split at middle C) as a fallback and exposing a manual track-to-hand mapping UI after import.

See `.planning/research/PITFALLS.md` for full pitfall details, UX pitfalls, performance traps, and a "looks done but isn't" checklist.

## Implications for Roadmap

Based on the combined research, the dependency graph and pitfall-phase mapping strongly suggest a five-phase structure. The order is driven by: (a) the FEATURES.md dependency tree (everything requires MIDI parser; Wait Mode requires detection), (b) the ARCHITECTURE.md suggested build order, and (c) the PITFALLS.md phase-mapping table which identifies Phase 1 as where 4 of the 6 critical pitfalls must be addressed.

### Phase 1: Audio + Data Foundation

**Rationale:** The two hardest technical risks must be proven before any UI is built. Polyphonic detection is identified as the highest-risk item in both FEATURES.md and PITFALLS.md. AudioContext/Safari restrictions are the most common source of "works in Chrome, broken everywhere else" issues. Validating both early avoids building a product on a shaky audio foundation.

**Delivers:** A working audio pipeline (mic capture, pitch detection, frequency-to-note conversion) AND a working MIDI parser that produces a normalized SongModel. Neither is user-visible yet, but both are prerequisites for everything downstream.

**Addresses features:** MIDI file import/parsing (foundation), single-note pitch detection (core value)

**Avoids pitfalls:**
- Polyphonic detection complexity (build proof-of-concept now; design evaluator for tolerance)
- AudioContext autoplay + Safari restrictions (test on all browsers from day one)
- FFT resolution for bass notes (choose algorithm and buffer sizes correctly from the start)
- Pitch detection latency (use AudioWorklet from the start; do not use ScriptProcessorNode)

**Research flag:** This phase has the most technical unknowns. Consider a brief spike on chord detection approaches (chroma vector vs. FFT peak-picking vs. essentia.js) before committing to an architecture.

---

### Phase 2: Core Visualization Loop

**Rationale:** Once the data foundation exists (SongModel from Phase 1), the timing engine and piano roll renderer can be built. This is where the app first "feels real." Getting timing right here is critical — audio-visual sync drift is identified in PITFALLS.md as expensive to retrofit.

**Delivers:** A functional falling-notes display driven by a game loop synchronized to `AudioContext.currentTime`. The user can import a MIDI file and watch it play. No microphone interaction yet.

**Uses:** Canvas 2D (PianoRollRenderer), requestAnimationFrame game loop, AudioContext.currentTime as master clock, Zustand for throttled UI sync

**Implements:** TimingEngine, GameLoop, PianoRollRenderer, SongState Zustand store, basic playback controls (play/pause/seek), tempo control, song progress bar

**Addresses features:** Falling notes visualization, tempo/speed control, song progress bar

**Avoids pitfalls:**
- Audio-visual sync drift (use AudioContext.currentTime from the very first frame)
- React-driven animation anti-pattern (game loop is imperative from the start)
- MIDI re-parsing per frame (pre-normalized SongModel with binary search)

---

### Phase 3: Detection Integration + Practice Core

**Rationale:** With a working audio pipeline (Phase 1) and a working visualization loop (Phase 2), the DetectionEvaluator can be wired in to produce the core practice loop. Wait Mode is the product's signature feature and the main reason it is more valuable than passive Synthesia-style playback. This phase delivers the minimum viable practice experience.

**Delivers:** The complete practice loop: import MIDI, watch notes fall, play along with microphone, get visual feedback, Wait Mode pauses until correct note is played. This is the v1 MVP.

**Implements:** DetectionEvaluator (expected vs. detected note matching), Wait Mode state machine, on-screen keyboard with expected/detected highlights, hand separation (L/R), audio playback of non-practiced hand (MIDI synthesis using Web Audio oscillators or SoundFont samples), basic hit/miss visual feedback on notes

**Addresses features:** Wait Mode, hand separation, on-screen keyboard, audio playback (backing track), visual accuracy feedback

**Avoids pitfalls:**
- Wait mode stuck states (highlight expected note on keyboard; add skip button; auto-skip timeout)
- MIDI hand separation failures (heuristic pitch-threshold splitter + manual track assignment UI)

**Research flag:** Audio playback (MIDI synthesis to audio) has multiple implementation options: Web Audio oscillators (simple but unrealistic), SoundFont samples via WebAudioFont or similar (realistic but large bundle). Needs a brief research spike to choose the right approach before implementation.

---

### Phase 4: Polish + Practice Enhancements

**Rationale:** Once the core practice loop is validated, layer in features that improve retention and usability without changing the core architecture. These are the v1.x features from FEATURES.md.

**Delivers:** A more complete and motivating practice experience with loop practice, progress tracking, song management, and mobile support.

**Implements:** Loop/section repeat (drag handles on progress bar), practice statistics (accuracy %, time practiced, session history stored in IndexedDB), song library management (list, favorites, delete), responsive mobile layout

**Addresses features:** Loop/section repeat, practice statistics, song library management, mobile responsive layout

**Avoids pitfalls:**
- UX pitfall: no feedback when detection fails (show detected frequency/note always; add mic test screen)
- UX pitfall: binary correct/incorrect (tolerance spectrum: green/yellow/red with configurable strictness)

**Research flag:** Standard patterns for this phase; no additional research required.

---

### Phase 5: Chord Detection + Sheet Music (v2)

**Rationale:** The two highest-complexity features are deferred until the core experience is proven. Chord detection requires a dedicated research effort (chroma vector analysis, harmonic product spectrum, or TensorFlow.js CNN approach). Sheet music view requires MIDI quantization and VexFlow integration. Neither should block v1.

**Delivers:** Chord detection support (enabling Wait Mode for chords with tolerance-based matching) and an optional sheet music view alongside the piano roll.

**Implements:** Polyphonic pitch detection (chroma vector or ML-based), chord matching evaluator, VexFlow sheet music renderer with MIDI quantization

**Addresses features:** Chord detection via microphone, sheet music view

**Research flag:** Both sub-features in this phase need dedicated research spikes. Chord detection specifically has no clear off-the-shelf solution; essentia.js (WASM) is the best fallback option if custom FFT proves insufficient.

---

### Phase Ordering Rationale

- **Dependencies drive order:** MIDI parser must exist before visualization; detection must exist before Wait Mode; Wait Mode is the core feature the product is built around. The build order in ARCHITECTURE.md validates this sequencing.
- **Risk-first:** Phase 1 addresses 4 of 6 critical pitfalls and validates the most uncertain technical areas (chord detection, Safari audio compatibility) before any UI investment is made.
- **Architecture integrity:** Phases 1 and 2 establish the engine-driven architecture patterns that all subsequent phases depend on. If these patterns are compromised (React-driven animation, main-thread timing), the cost compounds in every later phase.
- **Deferral is safe:** Sheet music view and chord detection are explicitly independent of the piano roll architecture (both consume `SongModel` but render differently). They can be added in Phase 5 without touching Phase 2-4 code.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1:** Chord detection approach (chroma vector vs. FFT peak-picking vs. essentia.js WASM) — no clear off-the-shelf solution exists; needs a proof-of-concept spike before architecture is finalized
- **Phase 3:** MIDI-to-audio synthesis approach (Web Audio oscillators vs. SoundFont samples vs. WebAudioFont) — bundle size, realism, and latency tradeoffs need evaluation
- **Phase 5:** Polyphonic pitch detection from microphone — open research problem; the specific approach (ML model, harmonic product spectrum, chroma vector) needs dedicated investigation

**Phases with standard patterns (skip additional research):**
- **Phase 2:** Canvas 2D falling notes + rAF game loop — well-documented pattern, ARCHITECTURE.md provides code examples
- **Phase 4:** Practice statistics, loop UI, song library management — standard CRUD with IndexedDB; no novel problems

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major choices verified with official sources and multiple references; alternatives explicitly considered and rejected |
| Features | HIGH | Competitor feature analysis is comprehensive; table stakes and differentiators are clearly defined with complexity estimates |
| Architecture | HIGH | Patterns are well-documented; game loop + Canvas + AudioWorklet approach is proven for this class of application; data flow is explicit |
| Pitfalls | HIGH (monophonic) / MEDIUM (polyphonic) | Core Web Audio pitfalls are well-documented; polyphonic detection limitations are acknowledged but exact mitigation strategies are less settled |

**Overall confidence:** HIGH for v1 (monophonic detection, piano roll, practice modes); MEDIUM for polyphonic chord detection and sheet music view

### Gaps to Address

- **Chord detection implementation strategy:** The research confirms the problem is hard but does not resolve which approach to use. During Phase 1 planning, allocate a spike task to prototype: (a) FFT peak-picking with harmonic filtering, (b) chroma vector (Pitch Class Profile), and (c) essentia.js. Evaluate on real piano recordings before committing.

- **MIDI synthesis / audio playback library choice:** For backing track audio, the tradeoff between Web Audio oscillators (low bundle, poor realism) and SoundFont samples (realistic, 10-30MB) needs a concrete decision. During Phase 3 planning, define the acceptable bundle size budget and pick accordingly.

- **Safari iOS compatibility depth:** The research flags iOS Safari as having unique and version-specific behaviors around AudioContext and getUserMedia. Actual testing on physical iOS devices will surface issues that research alone cannot predict. Treat Safari/iOS as a first-class test target from Phase 1.

- **Minimum viable chord tolerance threshold:** The evaluator design needs a concrete decision on what counts as "a chord was played" (e.g., 2 of 4 notes, any note in chord, root note only). This affects Wait Mode UX significantly and cannot be resolved without user testing.

## Sources

### Primary (HIGH confidence)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — AudioContext, AudioWorklet, AnalyserNode, autoplay policy
- [pitchy — GitHub](https://github.com/ianprime0509/pitchy) — McLeod Pitch Method, monophonic detection
- [@tonejs/midi — npm](https://www.npmjs.com/package/@tonejs/midi) — MIDI parsing, TypeScript API
- [tonal — GitHub](https://github.com/tonaljs/tonal) — frequency/MIDI/note conversions
- [Zustand — GitHub](https://github.com/pmndrs/zustand) — state management outside React render cycle
- [Vite — Getting Started](https://vite.dev/guide/) — build toolchain
- [Tailwind CSS v4](https://tailwindcss.com/) — CSS framework
- [Background audio processing using AudioWorklet — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet) — AudioWorklet patterns

### Secondary (MEDIUM confidence)
- [Detecting pitch with Web Audio API and autocorrelation — Alexander Ellis](https://alexanderell.is/posts/tuner/) — practical FFT/autocorrelation comparison
- [A Web Audio experiment: detecting piano notes — David Gilbertson](https://david-gilbertson.medium.com/a-web-audio-experiment-666743e16679) — consensus pitch detection approach
- [Flowkey Review — Pianoers](https://pianoers.com/flowkey-review/) — competitor feature analysis
- [Synthesia Review — Pianoers](https://pianoers.com/synthesia-piano-review/) — competitor feature analysis
- [Best Piano Learning Apps 2026 — ArtMaster](https://www.artmaster.com/articles/the-best-piano-learning-apps-i-tried-them-so-you-don-t-have-to) — feature comparison
- [Keeping audio and visuals in sync with Web Audio API — Jamie on Keys](https://www.jamieonkeys.dev/posts/web-audio-api-output-latency/) — timing synchronization
- [Performant Game Loops in JavaScript — Aleksandr Hovhannisyan](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — rAF loop patterns
- [Canvas vs SVG performance — Boris Smus](https://smus.com/canvas-vs-svg-performance/) — justification for Canvas choice

### Tertiary (MEDIUM-LOW confidence)
- [ChordNova: Real-Time Chord Detection — IESIJ](https://www.iescepublication.com/index.php/iesijmer/article/view/140) — CQT/CNN approach for browser chord detection
- [Techniques for Note Identification in Polyphonic Music — Stanford CCRMA](https://ccrma.stanford.edu/~cc/pub/pdf/noteID.pdf) — academic treatment of polyphonic detection
- [essentia.js](https://mtg.github.io/essentia.js/) — WASM MIR toolkit; fallback for chord detection if custom FFT insufficient
- [PianoBooster MIDI hand assignment issue — GitHub](https://github.com/captnfab/PianoBooster/issues/228) — real-world MIDI track-to-hand mapping problems

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*
