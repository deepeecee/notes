# ML Kit Idea Browser — Ideas Ledger

A running record of ideas surfaced by the `mlkit-idea-browser` skill. Newest run on top.
Future runs should read this file to avoid repeating a deep-dive and to pick up parked runners-up.

---

## Run 2026-09-25 (first run)

**Deep-dive winner:** On-Device GenAI Eval & Drift Harness → [full report](./mlkit-idea-ondevice-eval-harness-2026-09-25.md)

### Top ideas this run (ranked by relevance)

| # | Idea | Type | Verdict / status | Gate read | Key finding |
|---|---|---|---|---|---|
| 1 ⭐ | **On-device GenAI eval & drift harness** | D (+B) | **Prototype** · Opportunity **7/10** · *deep-dived* | Privilege 5/5 pass; Feasibility 4/5; Durability 4/5; composite **3.8** | No on-device eval harness in ML Kit (its "evaluate" page offloads to cloud Vertex AI); Apple shipped an Evaluations framework + cached/reasoning token reporting (iOS 26.4); no cloud tool can invoke the on-device managed model. **Trending — Apple just shipped it; sharpest wedge is drift under silent Nano version bumps.** |
| 2 | **On-device UGC safety/moderation classifier** | G | Parked — *strong #2, deserves own run* | Privilege **pass** (no drop-in exists); G2 tunability/liability risk | Only runner-up passing privilege; EU DMA Art. 6(7) opens on-device models by 2027-08-01. Dropped on scope, not privilege. |
| 3 | On-device neural TTS | A | Rejected | Privilege **fail** | Picovoice **Orca** ships drop-in (`ai.picovoice:orca-android`). Real Google gap but commoditized. |
| 4 | Speaker diarization / wake word | A | Rejected | Privilege **fail** | Picovoice **Falcon** + **Porcupine** are one-line Maven deps; DMA forces wake-word open anyway. |
| 5 | GenAI reach/tiering to sub-8GB | F | Parked | — | Partly absorbed by Firebase AI Logic hybrid routing (`PREFER_ON_DEVICE`/cloud). |

Also considered and parked: delivery/availability lifecycle contract (Type E — max privilege, invisible demand); structured document understanding / tables & forms (Type B — a gap where Apple already beat Google, not whitespace).

### Highlight — high-priority / trending
- ⭐ **#1 (eval harness)** is the trending pick: a peer platform (Apple) shipped both halves of it in 2026, and developer pain is live and articulate (ML Kit issue #1061 hand-bisecting versions; "you don't have a test suite — you have a manual QA checklist"). Verdict is Prototype, not Build, because Google itself is the likeliest substitute (bake `usage` + eval into the Prompt API) and the on-device LLM-as-judge scorer is an unresolved technical risk.

### Notes for next run
- **Do not re-deep-dive #1** unless the kill-criterion fires (Google ships per-response `usage` + on-device eval in the Prompt API by ~mid-2027).
- **Candidate for next deep-dive:** the UGC safety/moderation classifier (#2) — needs its own regulatory-evidence pass (EU DSA + Play generated-content policy).
- Environment caveat this run: `developers.google.com`, `developer.apple.com`, `appbrain.com`, `apilevels.com`, `picovoice.ai`, and the EU DMA portal were WebFetch-blocked; findings came via WebSearch snippets of those same pages. AppBrain adoption tables could not be read, so install-weighted sizing is directional.
