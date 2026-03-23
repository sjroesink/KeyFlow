---
phase: 02-visualization-playback
verified: 2026-03-23T10:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 2: Visualization + Playback Verification Report

**Phase Goal:** User can watch a MIDI song play as falling notes on a piano roll with an on-screen keyboard and hear the song
**Verified:** 2026-03-23
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees notes from an imported MIDI file falling toward an on-screen piano keyboard in sync with song timing | VERIFIED | `PianoRollRenderer.draw()` called each rAF frame from `PlaybackEngine.tick()` with `AudioContext.currentTime` as sole clock; `getVisibleNotes` binary search feeds visible notes to canvas |
| 2 | On-screen keyboard highlights expected notes as they arrive at the play line | VERIFIED | `PianoKeyboard` reads `activeNotes` from `playbackStore`; engine calls `getActiveNotes` every ~67ms and writes result to store; secondary/tertiary/error highlight classes all present |
| 3 | User can play, pause, and seek through a song using playback controls | VERIFIED | `PlaybackControls` wires `onPlay/onPause/onSeek` props through to `usePlaybackEngine` callbacks, which call `engineRef.current.play/pause/seek`; progress bar `onClick` computes fraction and calls `onSeek` |
| 4 | User hears a synthesized audio rendition of the song during playback | VERIFIED | `usePlaybackEngine` creates `SplendidGrandPiano(audioContext)` from smplr; passed as `SchedulerInstrument` to `NoteScheduler`; `scheduleAhead` calls `instrument.start` with note/velocity/time/duration 100ms ahead |

**Score:** 4/4 success criteria truths verified

### Plan-level Must-Have Truths (02-01, 02-02, 02-03)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Nocturne color tokens available as Tailwind utility classes | VERIFIED | `src/index.css` has `@theme` block with 50+ tokens including `--color-surface: #0b1326`, `--color-tertiary: #66dd8b` |
| 2 | On-screen piano keyboard renders with Nocturne styling | VERIFIED | `PianoKeyboard.tsx` uses `piano-key-white`, `piano-key-black` CSS classes; `bg-on-surface-variant/10`, `bg-surface-container-lowest` for unlit keys |
| 3 | Keyboard highlights expected notes in secondary (#e9c349) and correct in tertiary (#66dd8b) | VERIFIED | `getWhiteKeyClasses`/`getBlackKeyClasses` switch on `HighlightState`; `bg-secondary/90`, `bg-tertiary`, `bg-error` all present |
| 4 | Playback state (isPlaying, currentTime, duration) available via Zustand store | VERIFIED | `src/store/playbackStore.ts` exports `usePlaybackStore` with `status`, `currentTime`, `duration`, `activeNotes`, `setStatus`, `setCurrentTime`, `setDuration`, `setActiveNotes`, `reset` |
| 5 | PlaybackEngine computes position from AudioContext.currentTime as sole clock | VERIFIED | `get currentTime()` returns `this.startOffset + (this.audioContext.currentTime - this.startClockTime)` |
| 6 | PlaybackEngine supports play, pause, and seek | VERIFIED | All three methods implemented with correct state transitions; seek calls `scheduler.stopAll()` before rescheduling |
| 7 | NoteScheduler schedules MIDI notes 100ms ahead | VERIFIED | `LOOKAHEAD = 0.1` constant; `scheduleAhead` loop schedules notes within `[scheduledUpTo, currentTime + LOOKAHEAD]` |
| 8 | PianoRollRenderer draws falling note rectangles on Canvas 2D | VERIFIED | `draw()` method clears canvas, calls `getVisibleNotes`, iterates visible notes with `roundRect`, draws gradient overlay and gold play line with glow |
| 9 | Binary search finds visible notes from sorted array | VERIFIED | `getVisibleNotes` uses lower-bound binary search on `startTime`, then linear scan; `getActiveNotes` delegates to `getVisibleNotes` with 1ms window |

**Score:** 9/9 plan must-have truths verified

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src/index.css` | VERIFIED | Exists, 85 lines; contains `@theme`, Nocturne color tokens, `.piano-key-white`/`.piano-key-black` CSS classes |
| `src/types/playback.ts` | VERIFIED | Exports `PlaybackStatus` and `PlaybackState` |
| `src/store/playbackStore.ts` | VERIFIED | Exports `usePlaybackStore` with full store state and actions |
| `src/components/PianoKeyboard.tsx` | VERIFIED | Exports `PianoKeyboard`; reads both stores; all 4 highlight states implemented |
| `src/visualization/colors.ts` | VERIFIED | Exports `NOTE_COLORS` const object and `isBlackKey` function |
| `src/visualization/noteSearch.ts` | VERIFIED | Exports `getVisibleNotes` and `getActiveNotes` |
| `src/visualization/PianoRollRenderer.ts` | VERIFIED | Exports `PianoRollRenderer` class with `draw()` method using `NOTE_COLORS`, `getVisibleNotes`, gold play line |
| `src/engine/PlaybackEngine.ts` | VERIFIED | Exports `PlaybackEngine`; rAF loop, AudioContext clock, play/pause/seek, store sync |
| `src/engine/NoteScheduler.ts` | VERIFIED | Exports `NoteScheduler` and `SchedulerInstrument` interface; `LOOKAHEAD = 0.1` |
| `src/hooks/usePlaybackEngine.ts` | VERIFIED | Exports `usePlaybackEngine`; creates `SplendidGrandPiano`, `PlaybackEngine`, canvas ref callback with ResizeObserver |
| `src/components/PianoRoll.tsx` | VERIFIED | Exports `PianoRoll`; canvas host with `aspect-[16/7]`, Nocturne surface styling, gradient overlay |
| `src/components/PlaybackControls.tsx` | VERIFIED | Exports `PlaybackControls`; progress bar with `bg-primary` fill and glow; play/pause toggle; seek on click |
| `src/components/PracticeView.tsx` | VERIFIED | Exports `PracticeView`; composes `PianoRoll`, `PlaybackControls`, `PianoKeyboard`; Nocturne layout |
| `src/App.tsx` | VERIFIED | Conditionally renders `<PracticeView />` when `song` is loaded |
| `src/audio/AudioPipeline.ts` | VERIFIED | `get audioContext()` getter and `static createAudioContext()` factory both present |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `PlaybackEngine.ts` | `NoteScheduler.ts` | `this.scheduler.scheduleAhead` each tick | WIRED | Line 110: `this.scheduler.scheduleAhead(t, this.song.notes, this.audioContext.currentTime)` |
| `PlaybackEngine.ts` | `PianoRollRenderer.ts` | `this.renderer?.draw` each tick | WIRED | Line 107: `this.renderer?.draw(t, this.song.notes)` |
| `PlaybackEngine.ts` | `playbackStore.ts` | `usePlaybackStore.getState()` syncs at ~15Hz | WIRED | `syncToStore` called every `STORE_SYNC_INTERVAL` (66ms); sets `currentTime` and `activeNotes` |
| `NoteScheduler.ts` | smplr | `instrument.start` schedules notes | WIRED | `this.instrument.start({ note, velocity, time, duration })` in `scheduleAhead` loop |
| `PianoRollRenderer.ts` | `noteSearch.ts` | `getVisibleNotes` for view window | WIRED | Line 33: `const visible = getVisibleNotes(notes, currentTime, viewWindow)` |
| `usePlaybackEngine.ts` | `PlaybackEngine.ts` | `new PlaybackEngine` creates instance | WIRED | Line 19: `const engine = new PlaybackEngine(audioContext, piano)` |
| `usePlaybackEngine.ts` | smplr | `SplendidGrandPiano` as instrument | WIRED | Lines 17, 19: `new SplendidGrandPiano(audioContext)` passed to `PlaybackEngine` |
| `PianoRoll.tsx` | `PianoRollRenderer.ts` | canvas ref passed to renderer | WIRED | `canvasRefCallback` in hook: `new PianoRollRenderer(ctx)` then `engineRef.current.setRenderer(renderer)` |
| `PlaybackControls.tsx` | `usePlaybackEngine.ts` | `engine.play/pause/seek` from button handlers | WIRED | `onPlay/onPause/onSeek` props wired in `PracticeView`; progress bar `onClick` calls `onSeek(fraction * duration)` |
| `PracticeView.tsx` | `PianoRoll.tsx` | composed as child | WIRED | Line 32: `<PianoRoll canvasRef={canvasRefCallback} />` |
| `PracticeView.tsx` | `PianoKeyboard.tsx` | composed in footer | WIRED | Line 44: `<PianoKeyboard />` |
| `App.tsx` | `PracticeView.tsx` | shown when song loaded | WIRED | Lines 11-13: `if (song) { return <PracticeView />; }` |
| `PianoKeyboard.tsx` | `playbackStore.ts` | `usePlaybackStore` for activeNotes | WIRED | Line 62: `const activeNotes = usePlaybackStore((s) => s.activeNotes)` |
| `PianoKeyboard.tsx` | `audioStore.ts` | `useAudioStore` for detectedPitch | WIRED | Line 63: `const detectedPitch = useAudioStore((s) => s.detectedPitch)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VIZ-01 | 02-02, 02-03 | Falling notes piano roll scrolls toward on-screen keyboard synced to song timing | SATISFIED | `PianoRollRenderer` maps `currentTime` to Y position; engine calls `draw` every rAF frame; canvas mounted in `PianoRoll` component inside `PracticeView` |
| VIZ-02 | 02-01, 02-03 | On-screen keyboard highlights expected and detected notes in distinct colors | SATISFIED | `PianoKeyboard` reads `activeNotes` from `playbackStore` (expected) and `detectedPitch.midiNumber` from `audioStore` (detected); secondary/tertiary/error distinguish states |
| AUDIO-04 | 02-02, 02-03 | App plays song audio so user can hear what the piece should sound like | SATISFIED | `SplendidGrandPiano` created in `usePlaybackEngine`; `NoteScheduler.scheduleAhead` calls `piano.start` 100ms ahead; samples loaded asynchronously before playback enabled |

All three phase 2 requirements are satisfied. No orphaned requirements found — REQUIREMENTS.md traceability table confirms VIZ-01, VIZ-02, AUDIO-04 all mapped to Phase 2.

### Anti-Patterns Found

No anti-patterns detected in phase 2 files:
- No TODO/FIXME/HACK/PLACEHOLDER comments
- No empty handler stubs (`=> {}` or `console.log`-only handlers)
- `return null` in `PracticeView` is a legitimate early return guarding the no-song case
- All API calls have response handling

### Test Coverage

All 57 tests pass across 9 test files. Phase 2 specific test files verified:
- `src/visualization/noteSearch.test.ts` — 7 tests covering empty array, window inclusion/exclusion, partial overlap, active notes
- `src/visualization/PianoRollRenderer.test.ts` — 4 tests covering fillRect per note, canvas clear, play line draw
- `src/engine/NoteScheduler.test.ts` — 5 tests covering scheduling, deduplication, reset
- `src/engine/PlaybackEngine.test.ts` — 7 tests covering state transitions, clock, seek behavior
- `src/components/PianoKeyboard.test.tsx` — 7 tests covering key counts, all 4 highlight states, store reads

Build: `npm run build` exits 0 with no TypeScript errors.

### Human Verification Required

The following behavior was reported as approved during the plan 03 execution checkpoint but cannot be verified programmatically:

**1. Audio-visual sync**
- **Test:** Import a MIDI file, press Play, watch falling notes against the gold play line while listening
- **Expected:** Notes arrive at the play line at the same moment they are heard in audio
- **Why human:** AudioContext timing drift over long playback cannot be asserted with grep

**2. Seek clears ghost notes**
- **Test:** Start playback, seek to a new position via progress bar click
- **Expected:** Audio stops cleanly before resuming from the new position with no stuck/ghost notes
- **Why human:** smplr's `piano.stop()` behavior and AudioContext scheduling cleanup require live audio testing

**3. Keyboard highlight timing**
- **Test:** Watch the piano keyboard during playback of a song with known notes
- **Expected:** Keys highlight in gold exactly when the corresponding note reaches the play line
- **Why human:** The 15Hz store sync throttle means up to 66ms latency; acceptable perception requires human judgment

**Note:** The plan 03 SUMMARY documents that human verification was completed and approved during execution (checkpoint task 2: "approved, no commit"). These items are noted for completeness, not as blocking gaps.

---

**Verification Summary**

Phase 2 goal is fully achieved. All 13 must-have artifacts are substantive and wired into the working system. All three requirements (VIZ-01, VIZ-02, AUDIO-04) are satisfied with concrete implementation evidence. The complete chain from MIDI note data through the rAF engine loop, canvas renderer, audio scheduler, store sync, and React UI is verified intact. 57 tests pass, build succeeds with no errors.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
