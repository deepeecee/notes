# ML Kit Idea Browser — Ideas Log

Running ledger of ideas surfaced by the `mlkit-idea-browser` skill. Each run produces **one deep report** (linked below) plus the runners-up it was chosen over. Future runs should check this log to avoid repeats.

> **Note on history:** these cloud sessions are ephemeral and nothing was committed before today, so no prior-run ledger survived. The 2026-11-02 run is the first entry; "new since last run" could not be computed against a prior state.

---

## Run 2026-11-02 — 5 ideas surfaced

**⭐ High-priority pick** (full report: [`mlkit-idea-genai-eval-harness-2026-11-02.md`](./mlkit-idea-genai-eval-harness-2026-11-02.md)):

| # | Idea | One-line description | Type | Verdict | Opportunity | Status |
|---|---|---|---|---|---|---|
| **1 ⭐** | **GenAI Evals for ML Kit** | On-device prompt-eval + regression harness that auto-re-runs when the managed Gemini Nano model silently updates underneath the app, so teams can gate releases on quality. | D — Tooling | **Prototype / dev-preview** | **7/10** | **Selected — deep report written** |
| 2 | Standalone safety/moderation classifier | A tunable on-device classifier apps can call on user content, answering Play's "you're liable for output" policy and age-assurance law. | G — Trust/safety | — | — | Runner-up (tunability unscoped) |
| 3 | Deferred/opportunistic inference scheduler | A "run this inference when charging, on wifi, idle" primitive under the OS's thermal/battery/quota budgets. | E — Delivery | — | — | Runner-up (demand under-voiced) |
| 4 | Sub-8GB GenAI reach tier | Graceful-degradation tiering that extends GenAI below the ~3.7% Nano flagship fleet. | F — Reach | — | — | Runner-up (feasibility-first rerun) |
| 5 | On-device neural TTS | A modern neural text-to-speech developer API — the clearest Google whitespace vs Picovoice/Apple. | A — New API | — | — | Runner-up (model-shipping bet) |

**Why #1 is flagged high-priority / trending:** it rides a dated competitive clock — Apple shipped an `Evaluations` framework + token/usage accounting at WWDC26 (Jun 2026) — and a regulatory clock (EU DMA requires Alphabet to expose on-device model capabilities to third parties by **Aug 1, 2027**). Demand is convergent and current: a developer asked Apple for exactly this on stage ([WWDC26 #8016](https://developer.apple.com/videos/play/wwdc2026/8016/)), Google conceded on-device root-causing "can take hours if not days," and production teams are hitting silent Nano version-churn now (ML Kit issues [#1061](https://github.com/googlesamples/mlkit/issues/1061)/[#1070](https://github.com/googlesamples/mlkit/issues/1070)/[#1072](https://github.com/googlesamples/mlkit/issues/1072), Aug–Oct 2026).

**Headline caveat:** install-weighted reach is small (~100–1,500 apps over 3 yr), hard-capped by Nano's ~3.7% device reach — which is why the verdict is Prototype, not Build.
