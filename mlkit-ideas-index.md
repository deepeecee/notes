# ML Kit Idea Browser — run index

A running ledger of ideas surfaced by the `/mlkit-idea-browser` skill. Each run generates **one original, evidence-backed opportunity report** (plus documented runners-up) — this is a generator, not a feed, so there is no author/votes/upstream status metadata; the metadata that matters here is **type, verdict, opportunity score, and evidence freshness**. Future runs should read this file to avoid repeating a surfaced idea.

---

## Run 2026-10-07 — first run

**Top idea (high-priority / trending — ⭐ build-this-signal):**

| # | Idea | One-line | Type | Verdict | Opp. |
|---|---|---|---|---|---|
| 1 | **ML Kit GenAI Evals** — [report](./mlkit-idea-ondevice-genai-evals-2026-10-07.md) | A test-time eval harness + token/quota usage ledger so on-device AI features stop silently drifting across Gemini Nano model updates. | D (+B) | **Prototype** | **7/10** |

> **Why it's flagged trending:** a dated external forcing function — Apple shipped exactly this at WWDC26 (Evaluations framework + per-call token usage, iOS 26.4), Google has neither, and the gap is on-the-nose in Google's own tracker ([ML Kit issue #1070](https://github.com/googlesamples/mlkit/issues/1070) explicitly names "evaluation harnesses" + quota). Freshness re-verified 2026-10-07: **nothing has shipped to close it** (latest ML Kit release-notes entry is 2026-07-14). The privileged core (AICore quota/usage read-back) is platform-only; the reach is bounded (~few hundred adopter apps, install-weighted ~9× toward large apps) — hence Prototype, not Build.

**Runners-up considered this run:**

| Idea | One-line | Type | Why it lost |
|---|---|---|---|
| On-device neural TTS | Modern neural text-to-speech developer API (Google has none; Picovoice Orca sells it; Apple shipped speech gen). | A | Strongest whitespace, but feasibility/device-gating needs its own deep run. |
| GenAI reach tiering (sub-8GB) | Make on-device GenAI degrade gracefully onto the ~96% of the fleet that can't run Nano. | F | Highest strategic ceiling but the feasibility gate is genuinely hard; likely a Shelve report. |
| Safety / moderation classifier | On-device classifier so apps can moderate user content before it hits their backend. | G | Strong privilege + DMA/Play-policy timing, but one-size classifiers need tunability designed first. |
| Speaker diarization / speaker ID | Who-spoke-when + speaker identity for meeting/notes apps (Picovoice sells both). | A | Real demand but narrower category reach than eval tooling. |
| Delivery state machine + deferred inference scheduling | Observable availability/quota contract + "run this batch when charging/idle." | E | Max platform privilege, but demand is invisible-in-demos — thinnest S1 evidence. |

**Evidence status:** all load-bearing claims sourced and spot-checked 2026-10-07; Apple Evaluations framework and the ML Kit prose-only eval gap verified directly. Sizing figures are third-party (AppBrain/apilevels) and flagged as such in the report.
