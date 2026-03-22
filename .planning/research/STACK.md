# Technology Stack

**Project:** WebPianoLearner
**Researched:** 2026-03-22

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.x | UI framework | Project constraint (user preference). React 19 is stable, strong ecosystem for interactive UIs with hooks-based architecture ideal for real-time audio state | HIGH |
| TypeScript | 5.7+ | Type safety | Project constraint. Critical for complex audio/MIDI data structures; catches note-mapping bugs at compile time | HIGH |
| Vite | 6.x | Build tool | Industry standard for React+TS in 2025/2026. Near-instant HMR, native ESM, 5x faster builds than webpack. `npm create vite@latest -- --template react-ts` | HIGH |

### Audio & Pitch Detection

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Web Audio API (native) | N/A | Microphone input, audio graph | Browser-native. `getUserMedia()` + `AnalyserNode` provides the audio pipeline. No library needed for the plumbing layer | HIGH |
| pitchy | 4.1.0 | Monophonic pitch detection | McLeod Pitch Method -- best accuracy/speed tradeoff for real-time single-note detection. Returns frequency + clarity score (0-1) to filter noise. Pure JS, ESM-only, zero dependencies, ~3KB | HIGH |
| Custom FFT chord layer | N/A | Polyphonic note detection (chords) | **No good JS library exists for polyphonic pitch detection from microphone audio.** This is the hardest technical problem in the project. Strategy: use `AnalyserNode.getFloatFrequencyData()` to get FFT spectrum, then apply peak-picking with harmonic filtering to identify multiple simultaneous notes. Start with pitchy for single notes, layer chord detection on top | MEDIUM |

**Critical note on chord detection:** All available JS pitch detection libraries (pitchy, pitchfinder, pitch.js) are monophonic -- they detect one dominant pitch. Detecting chords from a piano microphone requires analyzing the FFT spectrum for multiple peaks, filtering harmonics, and matching against known note frequencies. This is a research-heavy area. essentia.js (WASM-based) has some chord detection but is heavyweight (~2MB WASM bundle) and better suited as a fallback if custom FFT approach fails.

### MIDI Parsing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tonejs/midi | 2.0.28 | MIDI file parsing | Parses .mid files to clean JSON with tracks, notes (pitch, time, duration, velocity), tempo, time signatures. TypeScript-friendly. Most used MIDI parser in the JS ecosystem (46+ dependents). Stable API despite last publish ~4 years ago -- MIDI format does not change | HIGH |
| tonal | 6.x | Music theory utilities | Convert between frequency/MIDI number/note name (`Note.freq("C4")` -> 261.63, `Note.midi("C4")` -> 60). Pure functions, tree-shakeable, TypeScript. Essential glue between pitch detection (Hz) and MIDI data (note numbers) | HIGH |

### Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| HTML5 Canvas (native) | N/A | Piano roll / falling notes | For the falling notes visualization, Canvas outperforms DOM by orders of magnitude when rendering hundreds of moving rectangles. Use raw Canvas 2D API -- no need for PixiJS/WebGL since we are drawing simple colored rectangles, not sprites or textures. Custom rendering loop with `requestAnimationFrame` gives full control over timing sync | HIGH |
| VexFlow | 5.x | Sheet music notation | The only serious music notation renderer for the web. TypeScript, renders to Canvas or SVG, supports standard Western notation (notes, rests, beams, ties, accidentals, dynamics). Active development. Use for the secondary "traditional sheet music" view | MEDIUM |

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.x | Global state | Minimal boilerplate (~3KB), centralized store pattern fits this app well (song state, playback position, detected notes, settings are all interconnected). No providers needed -- works outside React for audio callback integration. Simpler than Jotai for this use case since state is not highly atomic | HIGH |

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility-first CSS | CSS-first config in v4 (no tailwind.config.js). Vite plugin for zero-config setup. Rapid prototyping of responsive layouts. New Rust-based engine is 5x faster. Good for the UI chrome around the canvas-rendered piano roll | HIGH |

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 3.x | Unit/integration testing | Native Vite integration, same config, fast. Test pitch detection accuracy, MIDI parsing, note matching logic | HIGH |
| Playwright | 1.50+ | E2E testing | Cross-browser testing for audio permission flows, canvas rendering verification | MEDIUM |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tonal | 6.x | Note/frequency/MIDI conversions, scale/chord utilities | Every pitch detection cycle (Hz -> note name), MIDI display |
| idb-keyval | 6.x | IndexedDB wrapper | Storing imported MIDI files locally (too large for localStorage) |
| clsx | 2.x | Conditional classnames | Tailwind conditional styling in React components |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Pitch detection | pitchy | pitchfinder | pitchfinder bundles multiple algorithms (YIN, AMDF, etc.) but is heavier and less focused. pitchy's McLeod method is the best single algorithm for real-time monophonic detection |
| Pitch detection | pitchy | essentia.js | essentia.js is a full MIR toolkit (~2MB WASM). Overkill for pitch detection. Consider only if chord detection via FFT proves insufficient |
| MIDI parsing | @tonejs/midi | midi-parser-js | midi-parser-js last updated 7 years ago, no TypeScript support, less ergonomic API |
| MIDI parsing | @tonejs/midi | midi-json-parser | Less ecosystem adoption, @tonejs/midi is the de facto standard |
| Piano roll rendering | Canvas 2D | PixiJS | PixiJS adds WebGL overhead for what is essentially drawing colored rectangles. Canvas 2D is simpler, smaller bundle, sufficient performance for our use case |
| Piano roll rendering | Canvas 2D | DOM/CSS | DOM cannot handle hundreds of moving elements at 60fps. Canvas is mandatory for the falling notes visualization |
| Piano roll rendering | Canvas 2D | React components | Even React with virtualization cannot match Canvas performance for real-time animation of many elements |
| Sheet music | VexFlow | OpenSheetMusicDisplay (OSMD) | OSMD is MusicXML-focused and heavier. VexFlow gives lower-level control, better for programmatic generation from MIDI data |
| State management | Zustand | Redux Toolkit | Redux is overkill for a personal single-user app with moderate state complexity |
| State management | Zustand | Jotai | Jotai's atomic model is better for highly granular independent state. Our state (song, playback, detection) is interconnected -- centralized store fits better |
| State management | Zustand | React Context | Context re-renders entire subtree on changes. Audio detection state updates at 30-60Hz -- Context would cause performance disasters |
| Styling | Tailwind CSS | CSS Modules | Tailwind is faster for prototyping, consistent design system out of the box. CSS Modules are fine but slower to iterate |
| Build tool | Vite | Next.js | No server-side rendering needed. No backend. Vite is leaner for a pure client-side SPA |
| Build tool | Vite | Create React App | CRA is officially deprecated. Vite is the successor |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Tone.js (audio synthesis) | We are detecting audio, not generating it. Tone.js is a synthesis/scheduling library. Do not confuse with @tonejs/midi which is just the MIDI parser |
| ScriptProcessorNode | Deprecated Web Audio API node. Use AnalyserNode for frequency data or AudioWorklet for custom processing |
| Web MIDI API | For connecting hardware MIDI controllers. Project explicitly scopes to microphone input only |
| Three.js / WebGL | 3D rendering library. The piano roll is 2D. Massive overkill |
| Electron / Tauri | Project is browser-only. No native wrapper needed |
| Any backend framework | No backend. Pure client-side SPA with localStorage/IndexedDB |

## Installation

```bash
# Scaffold project
npm create vite@latest web-piano-learner -- --template react-ts

# Core dependencies
npm install @tonejs/midi tonal pitchy zustand vexflow idb-keyval clsx

# Tailwind CSS v4 (Vite plugin)
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

## Key Architecture Decisions Driven by Stack

1. **Audio processing runs outside React render cycle.** Zustand store is updated from `requestAnimationFrame` callbacks and `AnalyserNode` reads. React subscribes to store slices via selectors.

2. **Canvas rendering is imperative, not declarative.** The falling notes canvas is managed by a custom rendering class, not React components. React owns the container div and passes refs. This avoids React reconciliation overhead.

3. **Pitch detection happens on the main thread via AnalyserNode.** The `AnalyserNode` already runs on the audio thread internally. We read its frequency/time data on each animation frame. If performance is an issue, move pitch detection to an `AudioWorklet` -- but start simple.

4. **MIDI files stored in IndexedDB, not localStorage.** MIDI files can be hundreds of KB. localStorage has a 5-10MB limit and is synchronous (blocks main thread). IndexedDB via idb-keyval is async and has effectively unlimited storage.

## Sources

- [pitchy - GitHub](https://github.com/ianprime0509/pitchy) - McLeod Pitch Method implementation
- [@tonejs/midi - npm](https://www.npmjs.com/package/@tonejs/midi) - MIDI file parser
- [tonal - GitHub](https://github.com/tonaljs/tonal) - Music theory library
- [VexFlow](https://www.vexflow.com/) - Music notation rendering
- [Vite - Getting Started](https://vite.dev/guide/) - Build tool documentation
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Zustand - GitHub](https://github.com/pmndrs/zustand) - State management
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Audio processing
- [pitchfinder - GitHub](https://github.com/peterkhayes/pitchfinder) - Alternative pitch detection (considered)
- [essentia.js](https://mtg.github.io/essentia.js/) - Full MIR toolkit (fallback option for chord detection)
