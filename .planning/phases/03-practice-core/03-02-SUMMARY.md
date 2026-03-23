---
phase: 03-practice-core
plan: 02
subsystem: engine
tags: [practice-mode, wait-mode, chord-detection, loop-playback, audio-pipeline]

requires:
  - phase: 03-practice-core/01
    provides: "ChordDetector, NoteEvaluator, practiceStore, practice types"
  - phase: 02-visualization-playback
    provides: "PlaybackEngine, PianoRollRenderer, usePlaybackEngine, useAudioPipeline"
provides:
  - "PlaybackEngine with practice mode state machine (wait + loop)"
  - "Chord detection in audio pipeline rAF loop"
  - "Multi-note highlighting on PianoKeyboard"
  - "Shared AudioContext between mic and playback"
affects: [03-practice-core/03, practice-ui]

tech-stack:
  added: []
  patterns: ["Practice mode freezes/resumes tick via frozenTime", "ChordDetector runs alongside PitchDetector in same rAF loop"]

key-files:
  created: []
  modified:
    - src/engine/PlaybackEngine.ts
    - src/hooks/usePlaybackEngine.ts
    - src/hooks/useAudioPipeline.ts
    - src/components/PianoKeyboard.tsx

key-decisions:
  - "Loop boundary check placed before auto-stop to avoid song-end reset on loop regions"
  - "Wait mode recalibrates AudioContext clock on resume to prevent time drift"

patterns-established:
  - "Practice state machine: frozenTime != null means waiting, null means normal playback"
  - "External AudioContext parameter in usePlaybackEngine for shared context between mic and playback"

requirements-completed: [AUDIO-03, PRAC-01, PRAC-02]

duration: 3min
completed: 2026-03-23
---

# Phase 03 Plan 02: Practice Engine Integration Summary

**PlaybackEngine wait mode freezes at notes until correct detection, loops at region boundaries, with ChordDetector running in audio pipeline for multi-note keyboard highlights**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T07:32:57Z
- **Completed:** 2026-03-23T07:35:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PlaybackEngine freezes time advancement when expected notes are not matched, resumes when NoteEvaluator confirms match
- Loop playback resets to loop region start when currentTime reaches end
- ChordDetector runs alongside PitchDetector in rAF loop when practice mode is active
- PianoKeyboard highlights multiple detected notes simultaneously (chord support)
- usePlaybackEngine accepts external AudioContext for shared context strategy

## Task Commits

Each task was committed atomically:

1. **Task 1: Add practice mode to PlaybackEngine and share AudioContext** - `c17f9fd` (feat)
2. **Task 2: Integrate ChordDetector into audio pipeline and update PianoKeyboard** - `19cfc52` (feat)

## Files Created/Modified
- `src/engine/PlaybackEngine.ts` - Practice mode state machine with wait/freeze/resume and loop boundary
- `src/hooks/usePlaybackEngine.ts` - External AudioContext parameter, setPracticeEnabled callback
- `src/hooks/useAudioPipeline.ts` - ChordDetector in rAF loop, getAudioContext getter
- `src/components/PianoKeyboard.tsx` - Multi-note detection highlight via detectedChord from practiceStore

## Decisions Made
- Loop boundary check placed before auto-stop check in tick() to ensure loop regions take priority over song-end reset
- Wait mode recalibrates startClockTime and startOffset on resume to prevent accumulated time drift
- ChordDetector sets fftSize=8192 on shared AnalyserNode which also benefits pitchy autocorrelation (more samples)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Practice mode state machine fully wired into engine tick loop
- Chord detection and evaluation pipeline complete end-to-end
- Ready for Plan 03 (PracticeView UI) to compose these hooks into the practice interface

---
*Phase: 03-practice-core*
*Completed: 2026-03-23*
