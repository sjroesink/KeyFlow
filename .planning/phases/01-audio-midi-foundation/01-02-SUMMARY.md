---
phase: 01-audio-midi-foundation
plan: 02
subsystem: audio
tags: [web-audio-api, pitchy, pitch-detection, microphone, react-hooks, zustand]

# Dependency graph
requires:
  - phase: 01-audio-midi-foundation/01
    provides: "Type contracts (DetectedPitch, AudioPipelineStatus, PitchDetectorConfig), Zustand audioStore, Web Audio mocks, note utilities"
provides:
  - "AudioPipeline class for microphone capture with AudioContext lifecycle"
  - "PitchDetector class wrapping pitchy for real-time frequency detection"
  - "useAudioPipeline React hook managing pipeline lifecycle and rAF detection loop"
  - "MicrophoneSetup component with start/stop controls and permission error handling"
  - "NoteDisplay component showing detected note name, frequency, and clarity"
affects: [02-visualization-playback, 03-practice-core]

# Tech tracking
tech-stack:
  added: [pitchy]
  patterns: [rAF-based detection loop, user-gesture AudioContext creation, audio processing flags disabled]

key-files:
  created:
    - src/audio/AudioPipeline.ts
    - src/audio/PitchDetector.ts
    - src/audio/AudioPipeline.test.ts
    - src/audio/PitchDetector.test.ts
    - src/hooks/useAudioPipeline.ts
    - src/components/MicrophoneSetup.tsx
    - src/components/NoteDisplay.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Used pitchy PitchDetector.forFloat32Array for pitch detection with pre-allocated buffer"
  - "Audio processing flags (echoCancellation, noiseSuppression, autoGainControl) all disabled for accurate piano detection"
  - "AnalyserNode not connected to destination to prevent feedback loop"
  - "requestAnimationFrame loop for detection cadence instead of setInterval"

patterns-established:
  - "AudioPipeline pattern: create AudioContext in click handler, getUserMedia with processing disabled, connect source->analyser only"
  - "Detection loop pattern: rAF-based loop calling PitchDetector.detect() and pushing results to Zustand store"
  - "Error handling pattern: NotAllowedError and NotFoundError mapped to user-friendly messages via store status"

requirements-completed: [AUDIO-01, AUDIO-02]

# Metrics
duration: ~15min
completed: 2026-03-22
---

# Phase 01 Plan 02: Audio Capture Pipeline and Pitch Detection Summary

**Real-time microphone pitch detection using pitchy with rAF detection loop, clarity/range filtering, and React UI for start/stop control and live note display**

## Performance

- **Duration:** ~15 min (across checkpoint pause)
- **Started:** 2026-03-22
- **Completed:** 2026-03-22
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 8

## Accomplishments
- AudioPipeline captures microphone audio with all browser audio processing disabled for accurate piano input
- PitchDetector wraps pitchy with clarity threshold (0.9) and frequency range (27.5-4186 Hz) filtering
- useAudioPipeline hook manages full lifecycle: AudioContext creation, rAF detection loop, cleanup
- MicrophoneSetup component with start/stop buttons, loading state, and permission error display
- NoteDisplay component showing detected note name, frequency, and clarity percentage in real-time
- Human-verified: detection works correctly with real piano input

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for AudioPipeline and PitchDetector** - `2ea45bb` (test)
2. **Task 1 (GREEN): Implement AudioPipeline and PitchDetector** - `750931c` (feat)
3. **Task 2: Build hook, components, wire into App** - `504323e` (feat)
4. **Task 3: Human-verify checkpoint** - approved (no commit needed)

## Files Created/Modified
- `src/audio/AudioPipeline.ts` - Microphone capture and AudioContext lifecycle management
- `src/audio/PitchDetector.ts` - pitchy wrapper for frequency detection with clarity/range filtering
- `src/audio/AudioPipeline.test.ts` - Tests for AudioContext creation and mic connection
- `src/audio/PitchDetector.test.ts` - Tests for pitch detection with known inputs
- `src/hooks/useAudioPipeline.ts` - React hook managing pipeline lifecycle and rAF detection loop
- `src/components/MicrophoneSetup.tsx` - Start/Stop button with permission error handling
- `src/components/NoteDisplay.tsx` - Displays detected note name, frequency, and clarity
- `src/App.tsx` - Wired in MicrophoneSetup and NoteDisplay components

## Decisions Made
- Used pitchy with pre-allocated Float32Array buffer to avoid per-frame allocations
- Disabled all browser audio processing (echo cancellation, noise suppression, auto gain) for accurate piano detection
- AnalyserNode connected to source only, not destination, to prevent audio feedback
- requestAnimationFrame used for detection loop cadence (syncs with display refresh)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Audio pipeline and pitch detection fully operational
- Zustand store pattern established for audio state management
- Ready for Phase 2 visualization work that will consume detected pitch data

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 01-audio-midi-foundation*
*Completed: 2026-03-22*
