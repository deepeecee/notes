# ML Kit Idea Browser — run ledger

A persistent record of ideas surfaced by the `mlkit-idea-browser` skill, so future runs
avoid repeats and can report "nothing new since last run" honestly. Newest first.

| Date | Idea (slug) | Type | Verdict | Opp. | Report |
|---|---|---|---|---|---|
| 2026-10-29 | Model Readiness & Delivery API — availability contract for classic ML Kit models (`model-readiness-delivery`) | B/E | Prototype (near-Build) | 7/10 | [report](./mlkit-idea-model-readiness-delivery-2026-10-29.md) |

## Runners-up considered (so later runs can promote, not repeat)

- **On-device eval / quality-regression harness + token accounting** (Type D) — *open, strong; flagged to promote next run.*
- **Hybrid routing policy engine** (Type C/F) — open; org-dependency + substitute-half-life risk.
- **On-device moderation / safety classifier** (Type G) — open; needs tunability design.
- **On-device neural TTS** (Type A) — **KILLED: already ships** (`genai-text-to-speech:1.0.0-alpha1`). Corrects the Aug-2026 snapshot.
- **Deferred/opportunistic inference scheduling** (Type E) — parked; fails demand gate.

## Snapshot corrections found this run (feed back into references/landscape.md)

- **On-device TTS is no longer whitespace.** ML Kit GenAI Text-to-Speech ships in alpha (`com.google.mlkit:genai-text-to-speech:1.0.0-alpha1`). The Aug-2026 landscape snapshot listing it as Google whitespace (#1) is stale.
