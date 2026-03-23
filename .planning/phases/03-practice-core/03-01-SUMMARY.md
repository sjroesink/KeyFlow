---
phase: 03-practice-core
plan: 01
subsystem: audio
tags: [fft, chord-detection, pitch-class, zustand, vitest]

requires:
  - phase: 01-audio-midi-foundation
    provides: PitchDetector, AnalyserNode, noteUtils, audio types
provides:
  - ChordDetector class for FFT peak-picking chord detection
  - NoteEvaluator pure function for pitch-class-set matching
  - Practice types (PracticeMode, LoopRegion, EvaluationResult)
  - practiceStore Zustand store for practice state management
affects: [03-practice-core, 04-ui-polish]

tech-stack:
  added: []
  patterns: [FFT peak-picking with harmonic filtering, pitch-class-set matching, TDD for pure logic]

key-files:
  created:
    - src/types/practice.ts
    - src/audio/ChordDetector.ts
    - src/audio/ChordDetector.test.ts
    - src/engine/NoteEvaluator.ts
    - src/engine/NoteEvaluator.test.ts
    - src/store/practiceStore.ts
    - src/store/practiceStore.test.ts
  modified: []

key-decisions:
  - "Single-note evaluations use threshold 1.0 (exact pitch-class match) while chords default to 0.75"
  - "ChordDetector sets fftSize=8192 for sufficient frequency resolution (~5.4 Hz/bin at 44.1kHz)"
  - "Harmonic filtering sorts peaks low-to-high and removes near-integer multiples (2x-8x within 5%)"

patterns-established:
  - "Pure function evaluator pattern: evaluateNotes is stateless for testability and rAF-loop safety"
  - "Loop region validation: minimum 1-second duration enforced in store setter"

requirements-completed: [AUDIO-03, PRAC-01, PRAC-02]

duration: 3min
completed: 2026-03-23
---

# Phase 03 Plan 01: Practice Core Types and Logic Summary

**FFT peak-picking ChordDetector, pitch-class NoteEvaluator, and practiceStore with loop region validation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T07:26:43Z
- **Completed:** 2026-03-23T07:30:12Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- ChordDetector detects multiple simultaneous notes from FFT frequency data with harmonic filtering
- NoteEvaluator matches detected notes against expected using pitch-class (mod 12) tolerance
- practiceStore manages practice mode, loop region (validated), chord detection results, and waiting state
- 21 unit tests covering all behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: Define practice types, ChordDetector, and NoteEvaluator with tests** - `f7ff861` (test: RED) + `7abb7ac` (feat: GREEN)
2. **Task 2: Create practiceStore with loop region validation** - `3f8eadb` (feat)

## Files Created/Modified
- `src/types/practice.ts` - PracticeMode, LoopRegion, EvaluationResult type contracts
- `src/audio/ChordDetector.ts` - FFT peak-picking chord detection with harmonic filtering
- `src/audio/ChordDetector.test.ts` - 4 tests: silence, single peak, harmonics, two-note
- `src/engine/NoteEvaluator.ts` - Pure function comparing expected vs detected notes
- `src/engine/NoteEvaluator.test.ts` - 9 tests: empty, exact, pitch-class, partial, wrong
- `src/store/practiceStore.ts` - Zustand store for practice state
- `src/store/practiceStore.test.ts` - 8 tests: initial state, mode, loop validation, waiting, reset

## Decisions Made
- Single-note evaluations enforce threshold 1.0 (exact pitch-class match required) while chords default to 0.75 -- prevents false positives on single notes while allowing tolerance for chords
- ChordDetector uses fftSize=8192 for ~5.4 Hz/bin resolution at 44.1kHz, sufficient for distinguishing semitones in the piano range
- Harmonic filtering processes peaks low-to-high, removing frequencies that are near-integer multiples (2x-8x within 5%) of retained fundamentals

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed floating-point threshold comparison in test**
- **Found during:** Task 1 (NoteEvaluator tests)
- **Issue:** Test expected 2/3 (0.6667) >= 0.67 to be true, but floating-point 2/3 is 0.66666... which is less than 0.67
- **Fix:** Changed test threshold from 0.67 to 0.66 to correctly test partial chord matching
- **Files modified:** src/engine/NoteEvaluator.test.ts
- **Verification:** All 13 tests pass
- **Committed in:** 7abb7ac (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test threshold correction. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Practice types, chord detection, note evaluation, and state store are ready for integration
- Plan 03-02 can wire ChordDetector into useAudioPipeline and NoteEvaluator into PlaybackEngine
- Plan 03-03 can add UI controls using practiceStore

## Self-Check: PASSED

All 8 files verified present. All 3 commits (f7ff861, 7abb7ac, 3f8eadb) verified in git log. 21 tests passing.

---
*Phase: 03-practice-core*
*Completed: 2026-03-23*
