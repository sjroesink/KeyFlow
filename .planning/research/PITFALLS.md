# Pitfalls Research

**Domain:** Browser-based piano learning app with microphone pitch detection
**Researched:** 2026-03-22
**Confidence:** HIGH (core Web Audio / pitch detection pitfalls well-documented; polyphonic detection pitfalls MEDIUM)

## Critical Pitfalls

### Pitfall 1: Polyphonic Detection Is a Different Problem Than Pitch Detection

**What goes wrong:**
Developers build a monophonic pitch detector (autocorrelation or FFT peak-picking), confirm it detects single notes, then assume chords will "just work" by finding multiple peaks. In reality, polyphonic note recognition from audio is an unsolved-in-general problem. Harmonics of lower notes overlap with fundamentals of higher notes (e.g., the 3rd harmonic of C3 at 393 Hz is close to G4 at 392 Hz). The system reports phantom notes, misses notes in chords, or produces octave errors constantly.

**Why it happens:**
Monophonic pitch detection demos are abundant and look easy. The leap from "detect one note" to "detect a chord of 3-6 simultaneous notes from a laptop mic" is enormous, but project plans typically allocate the same effort to both.

**How to avoid:**
- Accept that microphone-based polyphonic detection will never be 100% accurate. Design the UX around tolerance (e.g., "3 of 4 notes correct" is a pass).
- Use Pitch Class Profile (chroma vector) approaches rather than trying to identify exact MIDI note numbers in chords. Compare detected pitch classes against expected pitch classes from the MIDI file.
- Consider a tiered approach: strict matching for single notes (wait mode), fuzzy matching for chords (detect if "most" notes present).
- Evaluate ML-based approaches (e.g., pre-trained models for piano transcription) if rule-based FFT analysis proves insufficient.

**Warning signs:**
- Single-note detection works great in demos but chord detection accuracy drops below 70%.
- Excessive false positives (detecting notes that weren't played).
- Algorithm works on sustained chords but fails on quick passages.

**Phase to address:**
Phase 1 (core audio pipeline). This is the foundational technical risk. Build a proof-of-concept for chord detection before committing to architecture. If polyphonic mic detection proves too unreliable, the fallback is to support "single note at a time" practice mode and defer chord detection.

---

### Pitfall 2: AudioContext Autoplay Policy and Safari Restrictions Break the App Silently

**What goes wrong:**
The app creates an AudioContext on page load or in a lifecycle hook. Browsers silently put it in a "suspended" state due to autoplay policies. The mic appears to work (getUserMedia succeeds) but the AnalyserNode produces all zeros. On iOS Safari specifically: granting mic permission forces audio output to the built-in speakers (ignoring headphones), and calling getUserMedia a second time mutes the first stream permanently with no way to unmute.

**Why it happens:**
Browsers require a user gesture (click/tap) before an AudioContext can be in "running" state. This policy is enforced differently across Chrome, Firefox, and Safari. Safari on iOS has additional unique behaviors that are poorly documented and change between versions.

**How to avoid:**
- Never create an AudioContext at module load time. Create it inside a click handler (e.g., a "Start Practicing" button).
- Always check `audioContext.state` and call `audioContext.resume()` on user interaction if suspended.
- On iOS Safari, call getUserMedia exactly once and reuse the stream via `MediaStream.clone()`, `.addTrack()`, and `.removeTrack()` rather than making multiple getUserMedia calls.
- Add an explicit "microphone check" screen at app start that tests the full pipeline (mic -> analyser -> data) and shows results before entering practice mode.
- Always serve over HTTPS (getUserMedia requires secure context).

**Warning signs:**
- Works in Chrome but not Safari.
- AnalyserNode returns all zeros despite mic permission being granted.
- Audio suddenly routes to speakers on iOS when mic starts.
- Users report having to grant permission repeatedly (Safari's permissions are least persistent).

**Phase to address:**
Phase 1 (audio pipeline setup). Must be addressed from the very first implementation. Test on Safari/iOS early -- not as an afterthought.

---

### Pitfall 3: FFT Resolution Is Too Coarse for Low Piano Notes

**What goes wrong:**
With the Web Audio API's AnalyserNode at the default or maximum fftSize of 32768 (commonly developers use 2048-4096), each frequency bin spans too wide a range to distinguish adjacent notes in the bass register. At 2048 FFT size with 44.1kHz sample rate, each bin is ~21.5 Hz wide. The lowest piano notes (A0 = 27.5 Hz, B0 = 30.87 Hz) are only ~3 Hz apart. The detector cannot tell them apart and produces octave errors or wrong notes below C3.

**Why it happens:**
Developers test with middle-register notes (C4-C5) where frequency spacing is 15-30 Hz and bin resolution is adequate. They never test the bass register. Additionally, laptop microphones physically roll off frequencies below ~80 Hz, compounding the problem.

**How to avoid:**
- Use autocorrelation (time-domain) for pitch detection rather than pure FFT peak-picking. Autocorrelation handles low frequencies naturally because lower pitches have longer periods that are easier to detect in the time domain.
- If using FFT, increase fftSize to at least 8192 (better: 16384) for bass range, or downsample the signal before FFT to increase effective frequency resolution.
- Accept that notes below C2 (~65 Hz) will be unreliable on laptop mics. Document this limitation and consider showing a "use external mic for best results" prompt.
- Test the full 88-key range during development, not just the comfortable middle octaves.

**Warning signs:**
- Pitch detection accuracy drops noticeably below C3.
- Octave confusion: detecting C3 when C2 is played.
- Works perfectly with a USB mic but terribly with laptop mic.

**Phase to address:**
Phase 1 (pitch detection algorithm). Algorithm choice and FFT parameters must account for the full piano range from the start.

---

### Pitfall 4: MIDI Files Do Not Reliably Separate Left and Right Hands

**What goes wrong:**
The app assumes MIDI track 1 = right hand and track 2 = left hand. In practice, MIDI files from the wild have wildly inconsistent structure: both hands merged into one track (Format 0), hands split across channels rather than tracks, multiple tracks per hand (some exports from Lilypond produce 4 tracks), or tracks labeled by instrument/voice rather than hand. The hand selection feature breaks for most imported files.

**Why it happens:**
MIDI was designed as a performance/playback format, not a notation format. There is no standard for encoding hand assignment. Different software (MuseScore, Lilypond, GarageBand, random internet MIDI files) all export differently.

**How to avoid:**
- Implement a heuristic hand-splitting algorithm as a fallback: split notes at a configurable pitch threshold (default: middle C) when tracks are not clearly separated. This is what PianoBooster does.
- Allow the user to manually assign tracks/channels to hands in a "song setup" screen after import.
- Parse MIDI track names and channel numbers as hints, but never rely on them exclusively.
- Support both Format 0 (single track) and Format 1 (multi-track) MIDI files with different splitting strategies.

**Warning signs:**
- Hand selection works with your test files but breaks with user-imported files.
- Only Format 1 files with exactly 2 piano tracks work correctly.
- Users report "no notes" for one hand after import.

**Phase to address:**
Phase 2 (MIDI import and song management). Build the track-to-hand mapping UI and heuristic splitter before building the hand selection practice feature.

---

### Pitfall 5: Audio-Visual Sync Drift in the Falling Notes Display

**What goes wrong:**
The falling notes animation (driven by requestAnimationFrame at ~60fps) gradually drifts out of sync with the audio timeline. Notes visually arrive at the "play line" but the audio detection or MIDI playback is 50-200ms ahead or behind. In wait mode, this means the visual shows a note approaching but the app has already moved past it, or the app waits for a note the user already played because the visual hadn't reached the line yet.

**Why it happens:**
requestAnimationFrame and the Web Audio API run on separate clocks. rAF fires at display refresh rate (variable, can drop frames), while AudioContext.currentTime is a high-precision monotonic clock. Using `Date.now()` or `performance.now()` for the animation timeline introduces a third clock. Additionally, `AudioContext.outputLatency` varies by device (12ms to 150ms on Android) and Safari doesn't expose it at all.

**How to avoid:**
- Use `AudioContext.currentTime` as the single source of truth for all timing. The animation should read the audio clock on each frame and compute note positions from it.
- Never use `Date.now()`, `performance.now()`, or frame counting for musical timing.
- Account for `AudioContext.baseLatency` and `AudioContext.outputLatency` when computing the visual offset. Provide a user-adjustable "latency compensation" slider for devices where these values are inaccurate or unavailable.
- In wait mode, decouple the visual scroll from real time entirely -- the display only advances when the correct note is detected.

**Warning signs:**
- Notes feel "early" or "late" compared to the visual.
- Sync is fine for the first 30 seconds but drifts over a 3-minute song.
- Sync is fine on desktop Chrome but broken on mobile.

**Phase to address:**
Phase 2 (visualization). Must be architected correctly from the start of the visualization work. Retrofitting a different timing source is painful.

---

### Pitfall 6: Pitch Detection Latency Makes Real-Time Feedback Feel Broken

**What goes wrong:**
There is a perceptible delay (100-500ms) between the user striking a key and the app highlighting the detected note. This comes from three compounding sources: microphone input buffer latency (one full FFT window must fill before analysis), AudioContext processing latency, and the pitch detection algorithm's own computation time. Users feel the app is "laggy" or "not listening" even though detection is technically correct.

**Why it happens:**
A 4096-sample FFT window at 44.1kHz requires ~93ms of audio before it can even begin analysis. Add 10-150ms of device audio latency, plus time to run the algorithm, and total latency easily exceeds 150ms. Musicians notice latency above ~50ms.

**How to avoid:**
- Use the ScriptProcessorNode replacement (AudioWorklet) to process audio in a dedicated thread with smaller buffer sizes.
- Use overlapping analysis windows: analyze every 1024 samples rather than waiting for a full 4096-sample buffer.
- For wait mode specifically, latency is less critical because there is no "beat" to stay in sync with. Prioritize accuracy over speed in wait mode.
- Show immediate visual feedback for any detected onset (amplitude spike) before the pitch is fully resolved, then confirm the note identity after analysis completes.

**Warning signs:**
- Users instinctively play a note again because they think it wasn't detected.
- The on-screen keyboard highlight feels like it "chases" the playing rather than responding to it.
- Detection works but only after the note has been sustained for a noticeable moment.

**Phase to address:**
Phase 1 (audio pipeline). Buffer sizes and processing architecture must be chosen early. Switching from ScriptProcessorNode to AudioWorklet later is a significant refactor.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| ScriptProcessorNode instead of AudioWorklet | Simpler API, more examples online | Runs on main thread, causes audio glitches during heavy rendering, deprecated API | Never -- AudioWorklet is supported in all modern browsers and is the correct approach |
| Rendering falling notes with DOM elements instead of Canvas | Easier to build initially, CSS animations | Hundreds of DOM nodes for dense passages, GC pauses cause visual stuttering | Only for very early proof-of-concept, must migrate to Canvas/WebGL before any real use |
| Storing all MIDI data in React state | Familiar pattern, easy to pass as props | Re-renders on every state update, parsing on every render, large objects in the React tree | Never for note data -- parse once into a ref or external store, only put playback position in state |
| Using setInterval for animation timing | Quick to implement | Drift, inconsistent frame rate, not synced to display refresh | Never -- always use requestAnimationFrame |
| Hardcoding FFT parameters | Works for testing | Different devices/mics need different settings | Only in Phase 1 prototype; must become configurable |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| getUserMedia (microphone) | Requesting audio on page load before user gesture | Always request inside a user-initiated click/tap handler; check for secure context first |
| MIDI file parsing libraries | Assuming consistent track structure across files | Parse defensively; handle Format 0 (single track), Format 1 (multi-track), missing tempo maps, missing track names |
| Web Audio AnalyserNode | Using getByteFrequencyData (8-bit, 0-255 range) for precision work | Use getFloatFrequencyData for higher precision; getByteFrequencyData loses detail in quiet passages |
| Canvas 2D for visualization | Drawing every note every frame | Use dirty-rect rendering or pre-render static portions; only redraw the scrolling window |
| AudioWorklet | Loading worklet module from a relative path that breaks in production builds | Use `new URL('./worklet.js', import.meta.url)` or configure bundler to handle worklet entry points correctly |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running FFT on main thread via ScriptProcessorNode | UI jank during pitch detection, dropped animation frames | Use AudioWorklet to move DSP to audio thread | Immediately on mobile; on desktop when visualization is complex |
| Canvas redraw of entire piano roll every frame | Steadily increasing frame times as song length grows | Only render the visible viewport (virtual scrolling for the piano roll) | Songs longer than ~60 seconds with dense note data |
| Parsing MIDI on every component render | Stutter when switching views or resizing | Parse once on import, store as immutable data outside React render cycle | MIDI files with 10k+ note events |
| Creating new Float32Array every analysis frame | GC pauses causing audio crackle and visual hitching | Pre-allocate typed arrays and reuse them across frames | After ~30 seconds of continuous analysis |
| Not cleaning up AudioContext on unmount | Memory leak, orphaned mic streams, increasing CPU usage | Always disconnect nodes and call `audioContext.close()` on cleanup | After navigating between pages/views a few times |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Not serving over HTTPS | getUserMedia silently fails or is blocked entirely | Always use HTTPS, even in development (use localhost exception or self-signed cert) |
| Keeping mic stream active when not practicing | Privacy concern; users don't know mic is still live | Stop all tracks (`stream.getTracks().forEach(t => t.stop())`) when leaving practice mode; show visible mic indicator |
| Storing audio data in localStorage or IndexedDB | Accidental recording of user's environment | Never persist raw audio buffers; only store analysis results (detected notes) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when pitch detection fails | User plays correctly but gets no response, assumes app is broken | Always show what the mic "hears" (detected frequency/note) so users can diagnose issues (wrong mic selected, too quiet, too much noise) |
| Binary correct/incorrect feedback | Frustrating for beginners playing slightly out of time or with wrong octave | Show a tolerance spectrum: green (correct), yellow (right note wrong octave), red (wrong note); configurable strictness |
| Wait mode that waits forever on a missed note | User gets stuck, doesn't know which note the app expects | Highlight the expected note prominently on the on-screen keyboard; add a "skip note" button; auto-skip after configurable timeout |
| No microphone test/calibration step | Users blame the app when their mic is the problem | Add a "test your setup" screen before first practice: play a few notes, show detected results, confirm mic is working |
| Falling notes too fast or too slow for the zoom level | Notes are unreadable or the viewport is mostly empty | Let users control the scroll speed / zoom level of the piano roll independently of tempo |
| Assuming all users have external mics | Bass notes and quiet playing don't register on laptop mics | Show recommended mic setup, warn about laptop mic limitations for bass range |

## "Looks Done But Isn't" Checklist

- [ ] **Pitch detection:** Works for middle octaves but test the full 88-key range (A0 to C8) -- verify bass and treble extremes
- [ ] **Chord detection:** Works for 2-note intervals but test 3, 4, 5+ note chords with overlapping harmonics
- [ ] **MIDI import:** Works for your test files but test Format 0, Format 1, files with tempo changes, files with no track names, files with unusual channel assignments
- [ ] **Wait mode:** Works when user plays exactly the right note but test: wrong note, right note wrong octave, silence, background noise, playing too many notes
- [ ] **Safari compatibility:** Works in Chrome but test Safari desktop and iOS Safari specifically for AudioContext state, mic routing, and getUserMedia behavior
- [ ] **Mobile layout:** Responsive CSS exists but test actual touch interaction: piano keyboard tap targets, scroll behavior during practice, landscape vs portrait
- [ ] **Long songs:** Works for 30-second test pieces but test with 5+ minute songs with thousands of notes for memory and rendering performance
- [ ] **Background noise:** Works in a quiet room but test with ambient noise (TV, conversation, fan) to verify detection doesn't produce false positives

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| ScriptProcessorNode instead of AudioWorklet | MEDIUM | Rewrite audio processing to AudioWorklet; mostly isolated if audio pipeline is well-abstracted |
| DOM-based note rendering | HIGH | Full rewrite of visualization to Canvas; different rendering paradigm affects all visual code |
| Main-thread timing instead of AudioContext clock | HIGH | Rethreading all animation timing; affects sync, wait mode, and visual feedback simultaneously |
| MIDI hand assignment hardcoded to tracks | LOW | Add a mapping layer between raw MIDI tracks and hand assignment; UI for manual override |
| No polyphonic detection support | MEDIUM | Can layer chroma-based detection on top of existing pipeline if audio abstraction is clean |
| No latency compensation | LOW | Add offset parameter to timing calculations; user-facing slider in settings |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Polyphonic detection complexity | Phase 1 (audio pipeline) | Test chord detection accuracy on real piano recordings before building practice features |
| AudioContext autoplay / Safari restrictions | Phase 1 (audio pipeline) | Test on Chrome, Firefox, Safari desktop, and iOS Safari; verify mic works on each |
| FFT resolution for bass notes | Phase 1 (pitch detection) | Test detection accuracy across all 88 keys; document which range is reliable |
| MIDI hand separation | Phase 2 (MIDI import) | Import 10+ MIDI files from different sources; verify hand splitting works or falls back gracefully |
| Audio-visual sync drift | Phase 2 (visualization) | Play a 3-minute song end to end; verify notes still align at the end |
| Detection latency | Phase 1 (audio pipeline) | Measure round-trip latency from key strike to visual highlight; target under 100ms on desktop |
| Wait mode stuck states | Phase 3 (practice modes) | Test wait mode with intentional wrong notes, silence, and noise; verify user can always progress |

## Sources

- [Detecting pitch with Web Audio API and autocorrelation](https://alexanderell.is/posts/tuner/) - Detailed walkthrough of FFT limitations and autocorrelation tradeoffs
- [Web Audio API best practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Autoplay policy, AudioContext lifecycle
- [Autoplay guide for media and Web Audio APIs - MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) - Browser autoplay restrictions
- [Keeping audio and visuals in sync with Web Audio API](https://www.jamieonkeys.dev/posts/web-audio-api-output-latency/) - Output latency and timing synchronization
- [Web Audio API performance notes](https://padenot.github.io/web-audio-perf/) - Browser implementation differences and latency characteristics
- [GetUserMedia on iOS - Safari compatibility guide](https://copyprogramming.com/howto/navigator-mediadevices-getusermedia-not-working-on-ios-12-safari) - iOS-specific getUserMedia restrictions
- [PianoBooster hand assignment issue](https://github.com/captnfab/PianoBooster/issues/228) - Real-world MIDI track-to-hand mapping problems
- [Steinberg forum: MIDI hand splitting](https://forums.steinberg.net/t/how-to-split-left-and-right-hands-on-midi-piano-import/742805) - MIDI format limitations for hand assignment
- [Techniques for Note Identification in Polyphonic Music - Stanford CCRMA](https://ccrma.stanford.edu/~cc/pub/pdf/noteID.pdf) - Academic treatment of polyphonic detection challenges
- [Safari WebKit AudioContext bug](https://bugs.webkit.org/show_bug.cgi?id=221334) - Known Safari audio delay/glitch issues

---
*Pitfalls research for: browser-based piano learning app with microphone pitch detection*
*Researched: 2026-03-22*
