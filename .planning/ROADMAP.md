# Roadmap: WebPianoLearner

## Overview

WebPianoLearner delivers a browser-based piano practice tool in four phases, ordered by technical dependency. Phase 1 proves the two hardest technical foundations (microphone pitch detection and MIDI parsing). Phase 2 makes the app visual and audible (falling notes, on-screen keyboard, song playback). Phase 3 wires detection into the visualization to deliver the core practice loop (wait mode, chord detection, looping). Phase 4 completes the experience with song library management, progress tracking, and sheet music view.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Audio + MIDI Foundation** - Microphone capture, single-note pitch detection, and MIDI file parsing
- [ ] **Phase 2: Visualization + Playback** - Falling notes piano roll, on-screen keyboard, and song audio playback
- [ ] **Phase 3: Practice Core** - Wait mode, chord detection, and loop practice integrated with the visualization
- [ ] **Phase 4: Library + Sheet Music** - Song library management, progress persistence, and sheet music view

## Phase Details

### Phase 1: Audio + MIDI Foundation
**Goal**: User can import a MIDI file and hear detected notes from their microphone confirmed by the app
**Depends on**: Nothing (first phase)
**Requirements**: AUDIO-01, AUDIO-02, SONG-01
**Success Criteria** (what must be TRUE):
  1. User grants microphone permission and sees a live indicator that the app is hearing audio
  2. User plays a single note on a real piano and sees the detected note name displayed correctly in real-time
  3. User selects a .mid file from their computer and the app accepts it without error
  4. Detection works in Chrome, Firefox, and Safari (including iOS Safari mic permission flow)
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold project, define type contracts, stores, utilities, and test infrastructure
- [ ] 01-02-PLAN.md — Audio capture pipeline, pitch detection, microphone UI with human verification
- [ ] 01-03-PLAN.md — MIDI file parser, import component, and song info display

### Phase 2: Visualization + Playback
**Goal**: User can watch a MIDI song play as falling notes on a piano roll with an on-screen keyboard and hear the song
**Depends on**: Phase 1
**Requirements**: VIZ-01, VIZ-02, AUDIO-04
**Success Criteria** (what must be TRUE):
  1. User sees notes from an imported MIDI file falling toward an on-screen piano keyboard in sync with song timing
  2. On-screen keyboard highlights expected notes as they arrive at the play line
  3. User can play, pause, and seek through a song using playback controls
  4. User hears a synthesized audio rendition of the song during playback
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Practice Core
**Goal**: User can practice a song with real-time feedback -- the app listens, evaluates, waits, and loops
**Depends on**: Phase 2
**Requirements**: AUDIO-03, PRAC-01, PRAC-02
**Success Criteria** (what must be TRUE):
  1. In wait mode, the song pauses at each note until the user plays the correct note on their piano, then advances
  2. On-screen keyboard highlights both the expected note (what to play) and the detected note (what was played) in distinct colors simultaneously
  3. User can play chords and the app detects multiple simultaneous notes with reasonable tolerance
  4. User can select a section of the song and loop it, with the loop repeating automatically until stopped
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Library + Sheet Music
**Goal**: User has a complete practice environment with song management, progress tracking, and an alternative notation view
**Depends on**: Phase 3
**Requirements**: VIZ-03, SONG-02, SONG-03
**Success Criteria** (what must be TRUE):
  1. User sees a library view listing all previously imported songs and can select one to practice
  2. Imported songs persist across browser sessions (stored in IndexedDB)
  3. User sees their practice progress per song (accuracy, time practiced) and progress persists across sessions
  4. User can switch to a traditional sheet music view that renders the current song with note positions highlighted
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audio + MIDI Foundation | 0/3 | Planning complete | - |
| 2. Visualization + Playback | 0/0 | Not started | - |
| 3. Practice Core | 0/0 | Not started | - |
| 4. Library + Sheet Music | 0/0 | Not started | - |
