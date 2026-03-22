# Feature Research

**Domain:** Web-based piano learning app (practice tool with mic-based note detection)
**Researched:** 2026-03-22
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features every piano learning app (Flowkey, Simply Piano, Synthesia) ships. Missing any of these makes the product feel broken or toy-like.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Falling notes (piano roll) visualization | Core interaction model users recognize from Synthesia/Flowkey/YouTube; this is "how piano apps work" in users' minds | MEDIUM | Render MIDI note events as rectangles falling toward a keyboard. Must be smooth 60fps with accurate timing. Canvas or WebGL, not DOM elements. |
| On-screen piano keyboard | Visual anchor showing which keys to press and which were detected; every competitor has this | LOW | Highlight expected notes (from MIDI) and detected notes (from mic) in different colors. 88 keys with scroll/zoom or fixed range. |
| Real-time note detection (mic) | The core value proposition per PROJECT.md; Flowkey and Simply Piano both do this | HIGH | Single-note pitch detection is well-solved (autocorrelation/YIN). Chord detection via microphone is significantly harder -- may need ML approach (CNN on spectrogram). This is the hardest technical problem in the entire project. |
| Wait Mode | Flowkey's signature feature and the primary UX reference; pauses playback until user plays correct note(s) | MEDIUM | Requires reliable note detection as prerequisite. Compare detected notes against expected notes from MIDI, advance only on match. Tolerance window needed for timing. |
| Hand separation (L/R hand practice) | Flowkey, Synthesia, and Simply Piano all offer this; MIDI files naturally encode hands as separate tracks/channels | LOW | Parse MIDI tracks to identify left/right hand. Let user choose which hand to practice; mute/autoplay the other hand. |
| Tempo/speed control | Every competitor offers slow practice mode; essential for learning difficult passages | LOW | Scale MIDI playback speed (0.25x to 1.5x). Affects note fall speed proportionally. |
| Loop/section repeat | Flowkey and Synthesia both have this; critical for drilling difficult passages | MEDIUM | User selects start/end points on the timeline. Playback loops between them. UI for selecting the range needs to be intuitive (drag handles on a progress bar). |
| MIDI file import | Synthesia's core model; massive free MIDI library online makes this the most accessible song format | MEDIUM | Parse Standard MIDI File format (Type 0 and Type 1). Extract tracks, tempo changes, time signatures, note events. Libraries exist (tone.js Midi, midi-parser-js). |
| Song progress bar / timeline | Users need to see where they are in a song and navigate to specific sections | LOW | Shows current position, allows seeking. Doubles as the loop selection UI. |
| Audio playback of backing track | When practicing one hand, the other hand needs to sound so the music makes sense; Flowkey plays accompaniment | MEDIUM | Synthesize MIDI notes to audio in real-time. Use Web Audio API oscillators or sampled piano sounds (SoundFont/samples). Sampled sounds strongly preferred for realism. |

### Differentiators (Competitive Advantage)

Features where WebPianoLearner can stand out, especially given its open/free/personal nature vs. subscription-locked competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Completely free and open, no subscription wall | Flowkey ($17/mo), Simply Piano ($14/mo), Synthesia ($40 one-time) all lock features behind paywalls; a free tool with full features is immediately compelling | N/A | Not a technical feature but a key differentiator for positioning. |
| Import ANY MIDI file (no curated library lock-in) | Flowkey limits to their 1,500 songs; Synthesia allows MIDI import but it's a paid feature; free unrestricted MIDI import is a major draw | LOW | Already planned. The web has millions of free MIDI files. |
| Sheet music view (secondary) | Flowkey offers this only on tablet in portrait mode; Synthesia has it as a toggle; offering both piano roll AND sheet music side-by-side or toggled is a genuine learning aid | HIGH | Rendering sheet music from MIDI is non-trivial. Libraries like VexFlow or OpenSheetMusicDisplay exist but mapping raw MIDI (quantized timing, no notation metadata) to readable sheet music requires intelligent quantization. Consider this a v1.x feature, not MVP. |
| Chord detection via microphone | Most competitors rely on MIDI input for reliable chord detection; robust chord recognition from audio alone would remove the hardware barrier entirely | HIGH | This is the hardest differentiator. Standard FFT can identify single notes well. Chords need harmonic analysis (CQT, harmonic product spectrum) or ML models (TensorFlow.js CNN). Start with single notes, iterate toward chords. |
| Browser-based, no install required | Synthesia requires desktop install; Flowkey/Simply Piano push native apps; a URL-only experience has zero friction | LOW | Already the plan. Ensure it works well on mobile browsers too (responsive layout). |
| Practice statistics and progress tracking (localStorage) | Flowkey tracks sessions but users report wanting more quantified progress; Simply Piano does better here; detailed practice stats (time per song, accuracy trends, streak tracking) add motivation | MEDIUM | Store in localStorage or IndexedDB. Track: notes hit/missed per session, accuracy percentage, time practiced, songs attempted. Show trends over time. |
| Visual feedback on accuracy (hit/miss coloring) | Show which notes were played correctly vs incorrectly in real-time on the piano roll, with post-session summary | LOW | Color-code falling notes green (hit), red (missed), yellow (late/early). Provides immediate visual learning feedback beyond just "correct/incorrect." |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but create outsized complexity, scope creep, or go against the project's constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Structured courses/lessons | Flowkey and Simply Piano both have guided curricula; users may expect a "learning path" | Requires massive content creation (video, curriculum design, pedagogy). This is a content business, not a software feature. A personal tool should not try to be a music school. | Curate external resources. Focus on being the best practice tool, not a course platform. |
| Video demonstrations | Flowkey shows professional pianists playing each song with finger placement | Requires recording/licensing video for every song. Impossible for user-imported MIDI files. Enormous storage/bandwidth for a no-backend app. | The falling notes visualization IS the demonstration. Optionally show finger numbers from MIDI data if available. |
| Social features (leaderboards, sharing) | Gamification and community drive engagement in commercial apps | Requires backend, user accounts, moderation. Explicitly out of scope per PROJECT.md. Adds complexity with no clear benefit for a personal tool. | Practice statistics provide self-motivation without social infrastructure. |
| MIDI keyboard input | More accurate than microphone, preferred by intermediate/advanced players | Adds a hardware dependency that contradicts the "most accessible" goal. Increases testing surface. MIDI keyboard users already have Synthesia. | Microphone-first for v1. MIDI input could be a v2 feature since Web MIDI API exists and is straightforward to add later. |
| MusicXML import | Richer notation data than MIDI (dynamics, articulations, lyrics) | Different parser, different data model, much more complex format. MIDI covers 95% of use cases and has vastly more freely available files. | Stick with MIDI. If sheet music rendering is added later, MusicXML could enhance it, but not for MVP. |
| AI-powered feedback on technique/musicality | "Tell me if my dynamics are good" or "Am I using the right fingering" | Microphone audio quality varies wildly. Detecting dynamics from phone mics is unreliable. Fingering detection is impossible from audio alone. Overpromising here destroys trust. | Stick to binary note correctness (right note/wrong note) and timing accuracy. These are reliable and useful. |
| Offline/PWA support | Play without internet | Adds service worker complexity, cache management, update mechanisms. For a personal tool used at home (where there's WiFi), the benefit is marginal. | Defer entirely. Can be added later with minimal architectural changes if needed. |

## Feature Dependencies

```
[MIDI File Parser]
    |
    +--requires--> [Falling Notes Visualization]
    |                   |
    |                   +--requires--> [Wait Mode]
    |                   |                   |
    |                   |                   +--requires--> [Note Detection (Mic)]
    |                   |
    |                   +--requires--> [Loop/Section Repeat]
    |                   |
    |                   +--enhances--> [Visual Accuracy Feedback (hit/miss)]
    |
    +--requires--> [On-Screen Piano Keyboard]
    |                   |
    |                   +--enhanced-by--> [Note Detection (Mic)]
    |
    +--requires--> [Hand Separation]
    |
    +--requires--> [Audio Playback (Backing Track)]
    |
    +--requires--> [Tempo/Speed Control]

[Note Detection (Mic)]
    |
    +--enhances--> [Wait Mode]
    +--enhances--> [Visual Accuracy Feedback]
    +--enhances--> [Practice Statistics]

[Sheet Music View] --independent-of--> [Falling Notes Visualization]
    (both consume MIDI data but render differently)

[Practice Statistics] --requires--> [Note Detection (Mic)]
    (needs accuracy data to track)
```

### Dependency Notes

- **Everything requires MIDI File Parser:** The parser is the data foundation. Without parsed MIDI, nothing else can render or play.
- **Wait Mode requires Note Detection:** Cannot pause/advance without knowing what the user played. This is the critical path: parser -> visualization -> detection -> wait mode.
- **Audio Playback is independent of Note Detection:** The backing track synthesis and the mic input are separate audio paths. Can be developed in parallel.
- **Sheet Music View is independent of Piano Roll:** Both read from the same parsed MIDI data but render completely differently. Sheet music can be added later without touching piano roll code.
- **Practice Statistics require Note Detection:** You need hit/miss data to compute accuracy. Statistics layer sits on top of the detection system.

## MVP Definition

### Launch With (v1)

Minimum viable product -- enough to sit at a piano, load a song, and practice with feedback.

- [ ] MIDI file import and parsing -- foundation for all features
- [ ] Falling notes (piano roll) visualization -- the primary UI
- [ ] On-screen piano keyboard with expected note highlighting -- visual reference
- [ ] Single-note pitch detection via microphone -- core value, start with monophonic
- [ ] Wait Mode -- the killer practice feature, pauses until correct note played
- [ ] Hand separation (L/R) -- essential for practicing real songs
- [ ] Tempo/speed control -- necessary for learning difficult passages
- [ ] Audio playback of non-practiced hand -- songs sound incomplete without it
- [ ] Basic song progress bar with seeking -- navigation essential

### Add After Validation (v1.x)

Features to add once the core detection and playback loop is solid.

- [ ] Loop/section repeat -- once users are practicing, they will immediately want this
- [ ] Chord detection via microphone -- extend from single notes; research ML approach
- [ ] Visual accuracy feedback (hit/miss coloring on notes) -- enhances the practice loop
- [ ] Practice statistics and progress tracking -- motivation and retention
- [ ] Responsive mobile layout -- desktop-first, then adapt for mobile
- [ ] Song library management (localStorage) -- save imported songs, organize favorites

### Future Consideration (v2+)

Features to defer until the core experience is proven.

- [ ] Sheet music view -- HIGH complexity, needs quantization logic or a library like VexFlow; defer until piano roll is rock-solid
- [ ] MIDI keyboard input -- straightforward via Web MIDI API but contradicts mic-first philosophy for v1
- [ ] Finger number hints -- requires MIDI files with finger annotation (rare) or algorithmic assignment (research-heavy)
- [ ] Metronome overlay -- useful but not critical when tempo control already exists
- [ ] Song difficulty rating -- auto-analyze MIDI complexity (note density, hand independence, tempo)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MIDI file import/parsing | HIGH | MEDIUM | P1 |
| Falling notes visualization | HIGH | MEDIUM | P1 |
| On-screen piano keyboard | HIGH | LOW | P1 |
| Single-note pitch detection (mic) | HIGH | HIGH | P1 |
| Wait Mode | HIGH | MEDIUM | P1 |
| Hand separation (L/R) | HIGH | LOW | P1 |
| Tempo/speed control | HIGH | LOW | P1 |
| Audio playback (backing track) | HIGH | MEDIUM | P1 |
| Song progress bar | MEDIUM | LOW | P1 |
| Loop/section repeat | HIGH | MEDIUM | P2 |
| Chord detection (mic) | HIGH | HIGH | P2 |
| Visual accuracy feedback | MEDIUM | LOW | P2 |
| Practice statistics | MEDIUM | MEDIUM | P2 |
| Mobile responsive layout | MEDIUM | MEDIUM | P2 |
| Song library management | MEDIUM | LOW | P2 |
| Sheet music view | MEDIUM | HIGH | P3 |
| MIDI keyboard input | LOW | LOW | P3 |
| Finger number hints | LOW | HIGH | P3 |
| Metronome | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Flowkey | Simply Piano | Synthesia | Our Approach |
|---------|---------|--------------|-----------|--------------|
| Song library | 1,500+ curated, subscription-locked | 5,000+ curated, subscription-locked | 150 included + paid store + MIDI import | Free MIDI import, unlimited; no curated library |
| Note detection | Mic or MIDI | Mic only | MIDI only (no mic) | Mic only for v1 |
| Wait Mode | Yes | Yes (similar) | Yes ("melody practice") | Yes, core feature |
| Hand separation | Yes | Yes | Yes | Yes |
| Speed control | Slow/Fast modes | Not prominent | Yes | Yes, continuous slider |
| Loop/repeat | Yes | Limited | Yes (bookmarks) | Yes, drag-to-select UI |
| Sheet music | Tablet portrait only | No | Optional toggle | Deferred to v2 |
| Video demos | Yes, professional recordings | Yes | No | No (anti-feature) |
| Courses/lessons | Yes, structured curriculum | Yes, 33+ courses | No | No (anti-feature) |
| Progress tracking | Basic (no quantified score) | Detailed (scores, streaks) | Basic (long-term tracking) | Detailed (accuracy %, time, trends) |
| Chord detection | Yes (via MIDI mainly) | Yes (mic, reported unreliable) | Via MIDI only | Via mic, phased approach |
| Platform | Web + iOS + Android | iOS + Android | Windows + Mac + iOS + Android | Web only (browser) |
| Price | $17/mo (Premium) | $14/mo | $40 one-time | Free |

## Sources

- [Flowkey Review - PianoDreamers](https://www.pianodreamers.com/flowkey-review/) -- feature overview, practice modes
- [Flowkey Review - Pianoers](https://pianoers.com/flowkey-review/) -- detailed feature analysis
- [Simply Piano Review - Pianoers](https://pianoers.com/simply-piano-review-the-honest-truth-about-learning-piano-with-an-app/) -- feature breakdown, limitations
- [Simply Piano Review - American Songwriter](https://americansongwriter.com/simply-piano-review/) -- 2026 review
- [Synthesia Review - Pianoers](https://pianoers.com/synthesia-piano-review/) -- feature analysis
- [Synthesia Official](https://synthesiagame.com/) -- feature list
- [Best Piano Learning Apps 2026 - ArtMaster](https://www.artmaster.com/articles/the-best-piano-learning-apps-i-tried-them-so-you-don-t-have-to) -- comparison
- [Best Piano Apps 2025 - Cooper Piano](https://cooperpiano.com/7-best-piano-apps-for-beginners-2025/) -- feature comparison
- [Flowkey vs Simply Piano - Midder Music](https://middermusic.com/flowkey-vs-simply-piano/) -- head-to-head
- [ChordNova: Real-Time Chord Detection](https://www.iescepublication.com/index.php/iesijmer/article/view/140) -- CQT/CNN approach for browser chord detection
- [Pitch Detection with Web Audio API - Alexander Ellis](https://alexanderell.is/posts/tuner/) -- autocorrelation method, limitations

---
*Feature research for: Web-based piano learning app*
*Researched: 2026-03-22*
