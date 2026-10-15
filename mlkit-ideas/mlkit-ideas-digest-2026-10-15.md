# ML Kit Idea Browser — Run Digest

**Run date:** 2026-10-15 · **Status:** First recorded run (no prior ledger in this repo) · **Ideas surfaced:** 6 (1 taken deep + 5 runners-up)

> The ML Kit Idea Browser generates one deep, research-backed opportunity report per run plus a
> ranked set of runners-up — it is not a feed of externally-authored ideas. The table below is this
> run's slate, ordered by how strongly the evidence held up. Full argument, scores, and sources for
> the lead idea are in [`mlkit-idea-ondevice-genai-measurement-2026-10-15.md`](./mlkit-idea-ondevice-genai-measurement-2026-10-15.md).

## Ideas this run

| # | Title | One-line | Type | Verdict / Opp. | Status |
|---|---|---|---|---|---|
| 1 ⭐ | **On-Device GenAI Measurement** | Give the Prompt API a response `usage` object (input/output/cached/reasoning tokens) + a coarse quota gauge, then a developer-preview eval/regression harness. | D (+B core) | **Prototype · 5/10** | **Lead — trending** |
| 2 | Deferred / opportunistic inference scheduling | "Run this batch when charging, idle, on wifi" under the shared system model — nobody ships it. | E | Re-pick candidate | Parked (demand unrevealed) |
| 3 | User-content safety / moderation classifier | On-device classifier so apps can moderate *user* content before it hits their backend; has a regulatory clock. | G | Needs own run | Parked (tunability risk) |
| 4 | On-device text-embeddings / semantic-search API | First-class embedding + similarity API for on-device RAG/search. | A | Dropped | Soft privilege (EmbeddingGemma/MediaPipe borrow path) |
| 5 | Structured document understanding (tables/forms) | Key-value/table extraction on Android. | B | Dropped | Catch-up — Apple already shipped structure |
| 6 | Reach tiering (one API across device classes) | Write once, Nano on flagship / fallback elsewhere. | F | Killed | Firebase AI Logic hybrid already ships it |

⭐ = taken deep this run.

## Highlighted: lead idea (trending / highest-confidence)

**On-Device GenAI Measurement** — *Prototype / Developer-Preview, Opportunity 5/10 (Credible, flagship-gated).*

One-sentence: ML Kit's Prompt API gives developers only pre-request **input**-token counts and surfaces quota only as `ErrorCode.BUSY` after the fact — so give the response a four-way `usage` breakdown and a coarse remaining-budget readout (the privileged half only AICore can produce), and developer-preview an on-device eval/regression harness.

**Why it's the lead / what's "trending":**
- **Apple shipped both halves at WWDC26** (`tokenCount`, response `usage` with cached+reasoning tokens, and an Evaluations framework) — a dated, demonstrable competitive gap; Google ships neither for mobile.
- **Dated, Android-native demand** on the token/quota half: [mlkit#1070](https://github.com/googlesamples/mlkit/issues/1070) (Aug 2026) explicitly asks Google to "expose remaining quota."
- **Strong platform privilege:** output/cached/reasoning token counts and live quota state are held only by AICore — a third party cannot compute them.

**Key metadata:** Gates — Privilege 4/5, Feasibility 5/5, Durability 3/5 (the risk). Composite 3.1. Weakest score: install-weighted reach 2/5 (GenAI gated to ~3.7% Nano-capable devices). Recommendation: ship the `usage`/quota extension now (high confidence); gate the eval harness on preview demand evidence.

## Notes for next run
- No idea ledger exists in this repo yet; this digest + the dated report are the start of one. Next run should read these to avoid repeating idea #1 and should consider promoting runner-up #2 (deferred inference scheduling) or #3 (safety classifier).
- Freshness caveat: `developers.google.com` and AppBrain/apilevels were not directly fetchable this run (DNS-blocked via the proxy); ML Kit release-note freshness past the Aug 2026 snapshot and the sizing figures are inferred — flagged in the full report's Open Questions.
