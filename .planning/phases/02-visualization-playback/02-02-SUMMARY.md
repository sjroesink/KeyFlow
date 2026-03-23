---
phase: 02-visualization-playback
plan: 02
subsystem: engine
tags: [canvas2d, requestAnimationFrame, AudioContext, binary-search, piano-roll, playback]

requires:
  - phase: 02-visualization-playback/01
    provides: "Nocturne colors, playback store, playback types, isBlackKey utility"
  - phase: 01-audio-midi-foundation
    provides: "AudioPipeline, SongModel types, MIDI parsing"
provides:
  - "PlaybackEngine class with rAF game loop and AudioContext clock"
  - "NoteScheduler with 100ms look-ahead scheduling via SchedulerInstrument interface"
  - "PianoRollRenderer for Canvas 2D falling notes visualization"
  - "Binary search utilities (getVisibleNotes, getActiveNotes) for sorted note arrays"
  - "AudioPipeline.audioContext getter for shared context strategy"
affects: [02-visualization-playback/03, 03-practice-features]

tech-stack:
  added: []
  patterns: ["rAF game loop with AudioContext.currentTime as sole clock", "look-ahead audio scheduling", "binary search on sorted note arrays", "throttled store sync at ~15Hz"]

key-files:
  created:
    - src/engine/PlaybackEngine.ts
    - src/engine/PlaybackEngine.test.ts
    - src/engine/NoteScheduler.ts
    - src/engine/NoteScheduler.test.ts
    - src/visualization/noteSearch.ts
    - src/visualization/noteSearch.test.ts
    - src/visualization/PianoRollRenderer.ts
    - src/visualization/PianoRollRenderer.test.ts
  modified:
    - src/audio/AudioPipeline.ts

key-decisions:
  - "SchedulerInstrument interface abstracts smplr dependency out of NoteScheduler for testability"
  - "PlaybackEngine syncs to Zustand store at ~15Hz to avoid React re-render thrashing"

patterns-established:
  - "rAF loop pattern: tick -> render -> schedule -> sync store -> requestAnimationFrame"
  - "Binary search + linear scan for O(log n + k) visible note lookup"
  - "SchedulerInstrument interface for instrument abstraction"

requirements-completed: [VIZ-01, AUDIO-04]

duration: 4min
completed: 2026-03-23
---

# Phase 02 Plan 02: Playback Engine and Piano Roll Summary

**PlaybackEngine with AudioContext-clocked rAF loop, NoteScheduler with 100ms look-ahead, and Canvas 2D PianoRollRenderer with binary search note lookup**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T06:15:23Z
- **Completed:** 2026-03-23T06:19:19Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Binary search utilities for O(log n + k) visible note lookup from sorted arrays
- Canvas 2D falling notes renderer with Nocturne colors, gradient overlay, and gold play line with glow
- PlaybackEngine driving rAF game loop with AudioContext.currentTime as sole clock source
- NoteScheduler with 100ms look-ahead scheduling via abstract SchedulerInstrument interface
- Play/pause/seek with correct state transitions and throttled (~15Hz) Zustand store sync
- AudioPipeline extended with audioContext getter for shared context strategy

## Task Commits

Each task was committed atomically:

1. **Task 1: Binary search utilities and PianoRollRenderer** - `d8a8861` (feat)
2. **Task 2: PlaybackEngine, NoteScheduler, and AudioPipeline audioContext exposure** - `37a1e03` (feat)

## Files Created/Modified
- `src/visualization/noteSearch.ts` - Binary search for visible and active notes
- `src/visualization/noteSearch.test.ts` - 7 tests for search edge cases
- `src/visualization/PianoRollRenderer.ts` - Canvas 2D falling notes renderer
- `src/visualization/PianoRollRenderer.test.ts` - 4 tests for renderer behavior
- `src/engine/NoteScheduler.ts` - Look-ahead note scheduling with instrument abstraction
- `src/engine/NoteScheduler.test.ts` - 5 tests for scheduling and reset behavior
- `src/engine/PlaybackEngine.ts` - Central rAF game loop with AudioContext clock
- `src/engine/PlaybackEngine.test.ts` - 7 tests for state transitions and clock
- `src/audio/AudioPipeline.ts` - Added audioContext getter and static factory

## Decisions Made
- SchedulerInstrument interface abstracts smplr dependency out of NoteScheduler, enabling clean unit testing without loading sound fonts
- PlaybackEngine syncs to Zustand store at ~15Hz to avoid React re-render thrashing from 60fps updates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PlaybackEngine ready for React integration in Plan 03 (PlayerPage component)
- PianoRollRenderer ready for canvas ref attachment via setRenderer
- NoteScheduler ready for smplr SplendidGrandPiano via SchedulerInstrument interface
- All 57 tests passing, build succeeds

---
*Phase: 02-visualization-playback*
*Completed: 2026-03-23*
