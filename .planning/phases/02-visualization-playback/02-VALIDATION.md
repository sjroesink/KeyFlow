---
phase: 2
slug: visualization-playback
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (existing from Phase 1) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | VIZ-01 | unit | `npx vitest run src/__tests__/piano-roll.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | VIZ-02 | unit | `npx vitest run src/__tests__/piano-keyboard.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | AUDIO-04 | unit | `npx vitest run src/__tests__/playback-engine.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/piano-roll.test.ts` — stubs for VIZ-01 (note positioning, timing sync)
- [ ] `src/__tests__/piano-keyboard.test.ts` — stubs for VIZ-02 (key highlighting, note mapping)
- [ ] `src/__tests__/playback-engine.test.ts` — stubs for AUDIO-04 (playback state, scheduling)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Notes fall visually in sync with audio | VIZ-01 | Visual sync requires human perception | Play a song, verify notes reach keyboard at the moment they should sound |
| Piano keyboard highlights match expected notes | VIZ-02 | Visual highlight color verification | Watch keyboard during playback, verify correct keys light up green |
| Audio playback sounds correct | AUDIO-04 | Audio quality is subjective | Listen to playback of a known song, verify it sounds right |
| Seek works without audio glitches | AUDIO-04 | Audio glitch detection | Seek to various positions, verify no stuck notes or silence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
