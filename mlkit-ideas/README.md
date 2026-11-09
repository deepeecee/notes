# ML Kit Idea Browser — ledger

One deep opportunity report per run, plus the runners-up considered. Newest first. This file doubles as the repeat-avoidance ledger: future runs should not re-propose an idea already taken deep here without a new angle.

---

## 2026-11-09 — latest run

**Top idea (taken deep):**

| # | Idea | One sentence | Type | Verdict | Opportunity | High-priority? |
|---|---|---|---|---|---|---|
| 1 | **On-device GenAI Eval & Telemetry** ([report](./mlkit-idea-ondevice-genai-eval-harness-2026-11-09.md)) | A measurement layer for ML Kit GenAI — per-response usage/latency/availability telemetry plus a golden-set regression harness — because developers ship on-device GenAI blind. | D (Tooling) | Prototype (developer-preview, observability-first) | **7/10** | **Yes — trending & competitively urgent** |

**Why high-priority / trending:** Apple shipped the on-device comparable (Evaluations framework + per-response usage object) a year ahead at WWDC26; the identical "can't tell if the model is available/regressed" pain recurs verbatim in the ML Kit tracker from 2021 (#315) into live 2026 GenAI issues (#1062, #1078, #1070); cloud eval tooling is huge (promptfoo ~27k★) while on-device eval has **no** repo above ~50★. Composite 3.9, one notch under the Build line — strong demand, strategic fit, and feasibility, gated only by Nano device reach (~3.7%).

**Runners-up considered this run (title + one line each):**

| Idea | Type | Why it lost this run |
|---|---|---|
| Delivery/availability SLO observability | E | Highest-privilege framing of the same pain, but narrower — folded into idea #1's Layer 1. |
| On-device neural TTS | A | Genuine whitespace (Picovoice Orca; Apple ships speech gen), but weaker Platform Privilege — a 3-person team ships the Gradle dep. Strong future candidate. |
| Standalone safety/moderation classifier for user content | G | Real demand (Bumble, Play policy), but one-size moderation dies on each app's proprietary policy — needs a longer tunability case. |
| Sub-8GB GenAI reach tier | F | Biggest prize by reach (attacks the 3.7% gate directly), but fails Feasibility Headroom today — no Google GenAI API targets sub-8GB; needs its own benchmarking pass. |

**Key freshness corrections logged this run (snapshot was Aug 2026):** Prompt API alpha → **Beta**; Gemini **Nano 4** (Gemma 4) is current, not nano-v3; an input-side `countTokens` now exists (so "no token count" is stale for input, though a per-response usage object still appears absent — unverified); new since snapshot: **Agentic API**, **Embeddings API** (EmbeddingGemma 2), **Structured Output**, **Prefix Caching** (ADS, 2026-11-05).

---

*Each run: derive problems from first principles → triage candidates across ≥4 of 7 types → research live (prior-art, demand, feasibility, sizing) → score against gates + weighted rubric → write one report. See the `mlkit-idea-browser` skill.*
