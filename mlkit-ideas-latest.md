# MLKit Idea Browser — Latest Ideas

*Last run: 2026-10-20 15:17 UTC (scheduled: "Daily MLKit idea browser")*
*First recorded run — no prior ledger existed, so nothing is a repeat.*

This run produced **1 deep opportunity report** plus **4 triaged runners-up** (5 ideas total). The skill delivers one idea deep per run; the runners-up are the comparison class.

## ⭐ Top idea (full report: `mlkit-model-delivery-contract-2026-10-20.md`)

| Field | Value |
|---|---|
| **Title** | On-Device Model Delivery Contract |
| **One-liner** | Give every ML Kit model the download/availability state machine Gemini Nano already has — plus the delivery SLO no vendor ships. |
| **Type** | E (Delivery & lifecycle) + B extension |
| **Verdict** | Prototype (developer preview) |
| **Opportunity** | **7/10 — Strong, build-adjacent** (composite 3.8) |
| **Gates** | Platform privilege 5/5 · Feasibility 5/5 · Durability 4/5 — all pass |
| **Why it won** | Clearest demand quote in the space (GitHub #315, verbatim, Googler-acknowledged), maximal platform privilege, and it reaches ~98% of the fleet via classic unbundled models, not just the 3.7% Nano path. |
| **Regulatory clock** | EU DMA (case DMA.100220) — Android 18, by 1 Aug 2027. **Trending / high-priority.** |

## Runners-up (considered and dropped this run)

| # | Title | Type | One-liner | Why it lost |
|---|---|---|---|---|
| 2 | On-device eval + token/quality harness | D | ML Kit prescribes "evaluate prompt quality" in prose but ships no code; Apple shipped an Evaluations framework. | Weaker platform privilege (3P can build it); rides only the 3.7% GenAI path. |
| 3 | Standalone safety/moderation classifier for user content | G | Let apps moderate *user* content on-device; real regulatory clock (minors laws, Play liability). | Dies on tunability — safety is each app's policy surface; needs a T&S partner. |
| 4 | On-device neural TTS developer API | A | Google has no modern on-device TTS; Picovoice sells Orca, Apple shipped speech generation. | Platform-privilege contested (Picovoice is cross-platform); heavy audio-model feasibility. |
| 5 | GenAI API for sub-8GB devices | F | Highest-reach story in the space — bring GenAI to the ~96% of the fleet Nano can't run. | Fails feasibility-headroom gate today (Nano 4 wants ~12GB RAM). Parked w/ re-check trigger. |

## Highlights

- **High-priority / trending:** the top idea is on a **statutory clock** — the EU DMA decision forces Google to expose system on-device models to third parties by **1 Aug 2027**, making a delivery/availability API a plausible partial-compliance surface (urgency, not just good DX).
- **Research-confirmed pivot:** Google *already built* the right state machine (`FeatureStatus` + `DownloadCallback`) for Gemini Nano — but left the classic models (Translation, Segmentation, Face, Barcode) that reach ~98% of devices on a boolean + exception.

## Open items to settle before any Build decision
- Absolute count of apps using **classic** unbundled ML Kit models (AppBrain detail page was unreachable this session).
- Confirm GenAI `FeatureStatus`/`DownloadCallback` shipped as described (`developers.google.com` reference pages not directly fetchable this session).
- Confirm DMA eleven-category wording and the 16 Jul 2026 date against the primary EU portal.
