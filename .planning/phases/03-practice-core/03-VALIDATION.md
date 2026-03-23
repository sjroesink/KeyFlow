---
phase: 3
slug: practice-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | AUDIO-03 | unit | `npx vitest run src/engine/ChordDetector.test.ts src/engine/NoteEvaluator.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PRAC-01, PRAC-02 | unit | `npx vitest run src/store/practiceStore.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | PRAC-01, PRAC-02 | unit | `npx vitest run src/engine/PlaybackEngine.test.ts` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | AUDIO-03 | integration | `npm run build` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | PRAC-01, PRAC-02 | unit | `npm run build && npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/ChordDetector.test.ts` — stubs for AUDIO-03 (FFT peak picking, harmonic filtering)
- [ ] `src/engine/NoteEvaluator.test.ts` — stubs for AUDIO-03 (pitch-class matching, partial chord acceptance)
- [ ] `src/store/practiceStore.test.ts` — stubs for PRAC-01/PRAC-02 (practice mode, loop region, waiting state)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wait mode pauses at correct moment | PRAC-01 | Requires real piano + mic + visual sync | Play song in wait mode, verify it pauses at each note |
| Chord detection from mic | AUDIO-03 | Requires real audio input | Play chords on piano, verify multiple notes detected |
| Loop repeats seamlessly | PRAC-02 | Audio continuity is perceptual | Select loop region, verify seamless looping |
| Keyboard shows both expected and detected | PRAC-01 | Visual color verification | Play in wait mode, verify gold (expected) and green (detected) highlights |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
