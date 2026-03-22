---
phase: 1
slug: audio-midi-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUDIO-01 | integration | `npx vitest run src/__tests__/audio-capture.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUDIO-02 | unit | `npx vitest run src/__tests__/pitch-detection.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | SONG-01 | unit | `npx vitest run src/__tests__/midi-parser.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` — install test framework and configure
- [ ] `src/__tests__/audio-capture.test.ts` — stubs for AUDIO-01 (mic permission, AudioContext creation)
- [ ] `src/__tests__/pitch-detection.test.ts` — stubs for AUDIO-02 (frequency-to-note mapping, detection accuracy)
- [ ] `src/__tests__/midi-parser.test.ts` — stubs for SONG-01 (MIDI file parsing, track extraction)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mic permission prompt appears | AUDIO-01 | Browser permission dialog cannot be automated | Open app in browser, verify mic permission dialog appears on first interaction |
| Real piano note detected correctly | AUDIO-02 | Requires actual audio input | Play C4 on piano near mic, verify app shows "C4" |
| Safari/iOS mic flow works | AUDIO-01 | Requires Safari on macOS/iOS device | Test mic permission + detection on Safari |

*Cross-browser testing is manual by nature.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
