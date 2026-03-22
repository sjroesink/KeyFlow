---
phase: 02-visualization-playback
plan: 01
subsystem: ui
tags: [tailwind, zustand, react, piano-keyboard, design-system, nocturne]

# Dependency graph
requires:
  - phase: 01-audio-midi-foundation
    provides: audioStore, songStore, noteUtils, tonal
provides:
  - Nocturne design tokens as Tailwind v4 @theme CSS custom properties
  - PlaybackStatus and PlaybackState types
  - Zustand playbackStore with activeNotes, currentTime, duration, status
  - PianoKeyboard component with 4 highlight states (none, expected, correct, error)
  - NOTE_COLORS canvas color constants and isBlackKey utility
  - smplr dependency installed for future soundfont playback
affects: [02-02, 02-03, 03-practice-features]

# Tech tracking
tech-stack:
  added: [smplr]
  patterns: [Tailwind v4 @theme tokens, CSS piano key layout with negative margins]

key-files:
  created:
    - src/types/playback.ts
    - src/store/playbackStore.ts
    - src/visualization/colors.ts
    - src/components/PianoKeyboard.tsx
    - src/components/PianoKeyboard.test.tsx
  modified:
    - src/index.css
    - package.json

key-decisions:
  - "Used Tailwind v4 @theme syntax for Nocturne tokens instead of tailwind.config.js extend"
  - "Piano key CSS dimensions in plain CSS classes (.piano-key-white, .piano-key-black) matching HTML mockup exactly"
  - "PianoKeyboard reads stores internally rather than accepting highlight state as props for simpler API"

patterns-established:
  - "Nocturne color tokens: use bg-surface, bg-primary, text-on-surface etc. as Tailwind utilities"
  - "Piano key highlight states: none/expected/correct/error with consistent class patterns"
  - "Canvas colors: use NOTE_COLORS constants for any Canvas 2D rendering"

requirements-completed: [VIZ-02]

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 02 Plan 01: Nocturne Design System + Piano Keyboard Summary

**Nocturne design tokens in Tailwind v4, Zustand playback store, and 88-key CSS piano keyboard with expected/correct/error note highlighting**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-22T20:54:03Z
- **Completed:** 2026-03-22T20:58:58Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Nocturne color palette (50+ tokens) defined as Tailwind v4 @theme CSS custom properties
- Playback types and Zustand store ready for engine integration
- 88-key PianoKeyboard component renders with all 4 highlight states matching mockup
- Canvas color constants exported for waterfall/note visualization

## Task Commits

Each task was committed atomically:

1. **Task 1: Nocturne Tailwind theme, playback types, playback store, and canvas color constants** - `3805471` (feat)
2. **Task 2 RED: PianoKeyboard failing tests** - `0ce1aa8` (test)
3. **Task 2 GREEN: PianoKeyboard implementation** - `7196873` (feat)

## Files Created/Modified
- `src/index.css` - Nocturne @theme tokens, Google Fonts import, piano key CSS classes
- `src/types/playback.ts` - PlaybackStatus and PlaybackState type definitions
- `src/store/playbackStore.ts` - Zustand store with status, currentTime, duration, activeNotes
- `src/visualization/colors.ts` - NOTE_COLORS for canvas rendering, isBlackKey utility
- `src/components/PianoKeyboard.tsx` - 88-key piano with highlight logic reading from stores
- `src/components/PianoKeyboard.test.tsx` - 7 tests covering key counts and all highlight states
- `package.json` - smplr dependency added

## Decisions Made
- Used Tailwind v4 @theme syntax for Nocturne tokens (native CSS custom properties, no config file needed)
- Piano key dimensions defined in plain CSS classes matching the HTML mockup exactly (180px/44px white, 110px/28px black)
- PianoKeyboard reads activeNotes and detectedPitch from stores internally for simpler consumer API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Nocturne theme tokens available for all subsequent UI components
- Playback store ready for engine integration in Plan 02 (falling notes + playback engine)
- PianoKeyboard ready to render live note highlights driven by playback and audio stores
- Canvas colors ready for waterfall renderer

---
*Phase: 02-visualization-playback*
*Completed: 2026-03-22*
