# WebPianoLearner

## What This Is

A web-based piano learning app inspired by Flowkey. Users import songs (MIDI files), see notes visualized as a falling piano roll or traditional sheet music, and play along on a real piano while the app listens through the microphone to detect whether the correct notes were played. Built as a personal tool with React and TypeScript, responsive for desktop and mobile.

## Core Value

Real-time microphone-based note detection that reliably tells the user whether they played the right note — this is the foundation everything else depends on.

## Requirements

### Validated

- ✓ Microphone-based pitch/note detection (single notes) — Phase 1
- ✓ MIDI file import for song library — Phase 1

### Active

- [ ] Chord detection (multiple simultaneous notes)
- [ ] Falling notes (piano roll) visualization synced to song playback
- [ ] Traditional sheet music visualization as secondary view
- [ ] Wait Mode — app listens and pauses until user plays the correct note(s)
- [ ] Hand selection — practice right hand, left hand, or both
- [ ] Loop function — select a section and replay it until perfected
- [ ] On-screen piano keyboard showing expected and detected notes
- [ ] Responsive layout for desktop and mobile browsers

### Out of Scope

- User accounts / authentication — personal tool, no backend
- MIDI keyboard input — microphone only for v1
- MusicXML import — MIDI covers the need for now
- Offline/PWA support — browser-only is fine
- Social features / sharing — single user
- Song creation / editing — import only

## Context

- Flowkey is the primary UX reference — the app should feel similar in how it presents songs and responds to playing
- Microphone-based note detection is the hardest technical challenge; Web Audio API provides the foundation, but detecting chords via audio (vs MIDI) requires careful FFT/pitch detection work
- MIDI files naturally encode left-hand and right-hand parts (typically channels or tracks), which maps directly to the hand selection feature
- Progress persistence (remembering practice history) is a nice-to-have, achievable via localStorage — not critical for v1 but desirable

## Constraints

- **Tech stack**: React + TypeScript, browser-only (no backend server)
- **Audio input**: Microphone via Web Audio API — no MIDI hardware dependency
- **Platform**: Modern browsers (Chrome, Firefox, Safari) on desktop and mobile
- **Song format**: Standard MIDI files (.mid) as the song source

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Microphone over MIDI input | No hardware requirement, most accessible for casual use | — Pending |
| MIDI files as song format | Huge existing library, structured note data, simpler than MusicXML | — Pending |
| React + TypeScript | User preference, strong ecosystem for interactive UIs | — Pending |
| No backend | Personal tool, localStorage sufficient, simplifies deployment | — Pending |

---
*Last updated: 2026-03-22 after Phase 1 completion*
