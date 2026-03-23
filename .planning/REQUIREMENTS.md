# Requirements: WebPianoLearner

**Defined:** 2026-03-22
**Core Value:** Real-time microphone-based note detection that reliably tells the user whether they played the right note

## v1 Requirements

### Audio Detection

- [x] **AUDIO-01**: App captures microphone audio via Web Audio API with user permission
- [x] **AUDIO-02**: App detects single piano notes in real-time from microphone input
- [ ] **AUDIO-03**: App detects chords (multiple simultaneous notes) from microphone input
- [x] **AUDIO-04**: App plays song audio so user can hear what the piece should sound like

### Visualization

- [x] **VIZ-01**: Falling notes (piano roll) display scrolls toward on-screen keyboard synced to song timing
- [x] **VIZ-02**: On-screen piano keyboard highlights expected notes and detected notes in distinct colors
- [ ] **VIZ-03**: Traditional sheet music view renders the current song with note highlighting

### Practice

- [ ] **PRAC-01**: Wait mode pauses song progression until user plays the correct note(s)
- [ ] **PRAC-02**: User can select and loop a specific section of a song for repeated practice

### Song Management

- [x] **SONG-01**: User can import standard MIDI files (.mid) as songs
- [ ] **SONG-02**: User can browse and select from imported songs in a library view
- [ ] **SONG-03**: App persists practice progress per song in browser storage

## v2 Requirements

### Practice Enhancements

- **PRAC-03**: User can select right hand, left hand, or both hands to practice separately
- **PRAC-04**: User can adjust playback tempo (slow down or speed up)

### Import Formats

- **SONG-04**: User can import MusicXML files as songs

### Platform

- **PLAT-01**: App works offline as an installable PWA

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Personal tool, no backend needed |
| MIDI keyboard input | Microphone-only for v1, most accessible |
| Social features / sharing | Single user tool |
| Song creation / editing | Import only |
| Video lessons / courses | Content business, not software feature |
| Mobile native app | Browser-based is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIO-01 | Phase 1 | Complete |
| AUDIO-02 | Phase 1 | Complete |
| AUDIO-03 | Phase 3 | Pending |
| AUDIO-04 | Phase 2 | Complete |
| VIZ-01 | Phase 2 | Complete |
| VIZ-02 | Phase 2 | Complete |
| VIZ-03 | Phase 4 | Pending |
| PRAC-01 | Phase 3 | Pending |
| PRAC-02 | Phase 3 | Pending |
| SONG-01 | Phase 1 | Complete |
| SONG-02 | Phase 4 | Pending |
| SONG-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation*
