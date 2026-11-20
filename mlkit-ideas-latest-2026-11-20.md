# ML Kit Idea Browser — Latest Ideas (2026-11-20)

One deep opportunity report was produced this run, plus the runner-up slate it was chosen from. Full analysis: [`mlkit-idea-ondevice-eval-harness-2026-11-20.md`](./mlkit-idea-ondevice-eval-harness-2026-11-20.md).

*This is the first recorded run — no prior ledger existed in this repo, so every idea below is new.*

## Top 5 ideas this run

| # | Idea | One-sentence description | Type | Verdict · Opportunity |
|---|---|---|---|---|
| 1 ⭐ | **On-device GenAI eval harness + usage accounting** | Give ML Kit developers a tool to tell whether a Gemini Nano feature silently regressed across a model refresh, plus a per-call token `usage` object. | D (Tooling) + B | **Prototype** · 5/10 |
| 2 | **On-device neural TTS API** | A modern on-device text-to-speech developer API — the gap Picovoice Orca sells into and Apple just filled with on-device speech generation. | A (New API) | Runner-up (softer privilege gate) |
| 3 | **On-device safety/moderation classifier** | A tunable classifier apps can call on *user* content before it reaches their backend. | G (Trust/safety) | Runner-up (diffuse demand; needs own run) |
| 4 | **Reach/tiering for GenAI below the 3.7% Nano fleet** | Let developers write once and degrade gracefully onto the ~96% of devices that can't run Nano. | F (Reach) | Runner-up (feasibility is the whole game) |
| 5 | **Output-stability / model-version pinning contract** | A platform commitment that on-device model refreshes won't silently change output, with a version-change signal. | E (Lifecycle) | Runner-up (invisible-in-demo; low expressed demand) |

Also considered and dropped: **wake-word/keyword spotting** (Type A — mature free substitute, Porcupine) and **structured document understanding** (Type B — Apple already shipped it; not true whitespace).

## 🔥 Highlighted — trending / high-priority

- **Idea #1 (lead) carries a regulatory clock.** The EU's July 2026 DMA Article 6(7) decision requires Alphabet to expose system-level on-device AI models to third parties in Android 18 **by 1 August 2027** — which would multiply the population of apps needing on-device eval/accounting. This is the re-check trigger if the idea is shelved.
- **Apple already shipped the lead idea's equivalent** (usage/token accounting GA in iOS 26.4; Evaluations framework new in iOS 27 beta) — a defensible "why now," and the clearest competitive pressure in the slate.
- **Biggest risk flagged:** first-party absorption — Google already uses per-API LoRA adapters to hold Nano quality across versions, and Vertex AI's Automated Prompt Optimization is its own cloud answer. If LoRA holds output stable across refreshes (regression <~2%), the harness loses its core job.

## Verdict in one line

A *correct-but-not-yet-urgent* tooling idea: ship the cheap, high-privilege **`usage` object** now (clean Apple-parity, developers count tokens by hand today), and run the **eval harness as a developer-preview** to find out whether silent Nano drift is real enough to productize — gated on a published Nano grading-quality number.
