# Phase 2: Visualization + Playback - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** Design mockups from stitch_interactieve_leerinterface_player/

<domain>
## Phase Boundary

Falling notes piano roll visualization, on-screen piano keyboard, song audio playback with play/pause/seek controls. The app transforms from a tech demo (Phase 1) into a visual, interactive music player.

</domain>

<decisions>
## Implementation Decisions

### Design System: Nocturne Framework
- Dark concert-hall aesthetic: base surface #0b1326, no pure black
- No 1px borders for sectioning — use background color shifts only
- Glassmorphism for floating controls: rgba(45, 52, 73, 0.6) with backdrop-blur 12px
- Typography: Manrope for headlines/titles, Inter for body/labels
- Minimum border-radius 0.5rem, pill buttons use 9999px
- No dividers — use spacing and surface tiers instead

### Color Palette (from DESIGN.md)
- Surface: #0b1326 (base), #131b2e (container-low), #222a3d (container-high), #2d3449 (container-highest)
- Primary: #b5c4ff, Primary-container: #2f63e6
- Secondary (gold): #e9c349 — used for progress, tempo, wait-mode accents
- Tertiary (green): #66dd8b — correct notes, with glow effect (box-shadow: 0 0 12px #66dd8b)
- Error (red): #ffb4ab — incorrect notes, no glow
- On-surface: #dae2fd, Outline: #8e90a2

### Player Layout (from interactieve_leerinterface_player mockup)
- Full-screen player view with fixed header (song title, progress bar, navigation)
- Sheet music / falling notes canvas area takes center of screen (max-w-5xl, aspect-ratio 16/7)
- Floating glassmorphism control bar below canvas: tempo slider, loop button, wait mode toggle
- Virtual piano keyboard fixed at bottom in footer area
- Playback progress bar (1.5px height) between canvas and keyboard
- Floating action buttons (metronome, settings) at bottom-right

### Piano Keyboard Design (from HTML)
- CSS/HTML-based, not Canvas — white keys 180px tall × 44px wide, black keys 110px × 28px
- White keys: bg-on-surface-variant/10 with border-r border-background/50
- Black keys: bg-surface-container-lowest
- Correct note highlight: bg-tertiary with inset shadow (inset 0 -10px 20px rgba(0,0,0,0.2))
- Waiting note: bg-secondary/90 with note label (e.g. "Ab4") at bottom center
- Error note: bg-error with inset shadow
- Keys have hover state: bg-surface-bright

### Falling Notes / Sheet Music Area
- Background: surface-container-low with rounded-xl
- Gradient overlay at bottom: from transparent to surface/40
- "Waiting for [note]" floating notification: glass-panel, pill-shaped, with pulsing pause icon in secondary color
- Note progress marker: vertical line in secondary/80 with glow shadow

### Playback Controls
- Progress bar: surface-container-highest track, primary fill with blue glow
- Tempo control: glass panel with range slider, secondary (gold) accent
- Loop button: glass panel with repeat icon
- Wait mode toggle: glass panel with secondary border, toggle switch in secondary color

### Claude's Discretion
- Exact Canvas 2D rendering implementation for falling notes
- Animation frame timing and sync with AudioContext.currentTime
- Audio synthesis library choice and configuration (research recommends smplr)
- Seek implementation details
- Mobile responsive adaptations of the keyboard

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `stitch_interactieve_leerinterface_player/nocturne_ivory/DESIGN.md` — Full Nocturne design system: colors, typography, elevation, components, do's/don'ts
- `stitch_interactieve_leerinterface_player/interactieve_leerinterface_player/code.html` — Player page HTML/CSS with exact Tailwind classes, piano key dimensions, glassmorphism styles
- `stitch_interactieve_leerinterface_player/interactieve_leerinterface_player/screen.png` — Player page visual mockup

### Existing Code (Phase 1)
- `src/types/song.ts` — SongModel and SongNote types used for visualization data
- `src/types/audio.ts` — DetectedPitch and AudioPipelineStatus types
- `src/store/songStore.ts` — Zustand store for current song state
- `src/store/audioStore.ts` — Zustand store for audio detection state

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- SongModel with notes[], tracks[], duration, bpm — direct data source for piano roll and playback
- SongNote with midi, name, startTime, duration, velocity — maps directly to falling note rectangles
- useAudioStore with detectedPitch — can be used to highlight detected notes on keyboard
- AudioPipeline's AudioContext — must be shared with playback engine (smplr)

### Established Patterns
- Zustand for state management — continue for playback state (isPlaying, currentTime, etc.)
- React components with hooks — continue for keyboard, controls
- Vite + TypeScript build pipeline

### Integration Points
- App.tsx currently has MicrophoneSetup, NoteDisplay, MidiImport, SongInfo — player view replaces/extends this
- songStore.currentSong provides the SongModel for visualization
- AudioContext from AudioPipeline needs to be extractable for smplr

</code_context>

<specifics>
## Specific Ideas

- The design is called "Nocturne" — a concert-hall aesthetic where "the only light falls precisely on the sheet music and the keys"
- The player mockup shows a sheet music view (not falling notes), but Phase 2 should implement falling notes as the primary view with the same layout structure
- Waiting note indicator shows "Waiting for Ab4" in a floating glass pill — this is Phase 3 but the UI shell should accommodate it
- The piano keyboard shows 3 octaves in the mockup — actual implementation should show relevant range based on song
- Gold (secondary #e9c349) is used extensively for progress and active states
- Green glow on correct notes gives a "vibrating in harmony" effect

</specifics>

<deferred>
## Deferred Ideas

- Dashboard/library page (stitch dashboard_bibliotheek) — Phase 4
- Song detail page (stitch song_detail_pagina) — Phase 4
- User profile/progress page (stitch gebruikersprofiel_voortgang) — Phase 4
- Wait mode integration — Phase 3
- Loop controls — Phase 3
- Tempo control — v2

</deferred>

---

*Phase: 02-visualization-playback*
*Context gathered: 2026-03-22 from design mockups*
