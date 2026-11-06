# ML Kit Idea Browser — ledger

One deep opportunity report per run (see `anthropic-skills:mlkit-idea-browser`). This file is the index and the de-dup ledger: future runs read it to avoid re-proposing a prior winner. Each run writes `mlkit-idea-<slug>-<YYYY-MM-DD>.md` and prepends a row here.

## Runs

### 2026-11-06 — On-device content moderation (UGC safety classifier)

**Report:** [`mlkit-idea-ondevice-content-moderation-2026-11-06.md`](./mlkit-idea-ondevice-content-moderation-2026-11-06.md)

Today's winner plus the runners-up it beat. Status = this run's verdict; scores are the composite out of 5 and the headline opportunity out of 10.

| # | Idea | One-sentence description | Type | Verdict / status | Opportunity | Tags |
|---|------|--------------------------|------|------------------|-------------|------|
| **1 (winner)** | **On-device content moderation classifier** | A tunable, on-device text+image UGC safety classifier (toxicity/sexual/violence/hate/self-harm) any app can call with its own policy — the developer-facing moderation API Android ships the model and delivery for (SafetyCore) but doesn't expose. | G (+F reach) | **Prototype** (composite 3.9, a hair under Build) | **7/10** | 🔴 high-priority · regulatory clock · reach-reframe · nobody-ships-it |
| 2 | On-device GenAI eval & regression harness | Build/CI tooling to measure whether an app's on-device GenAI feature got better or worse between releases — the harness Apple shipped (Evaluations framework) and ML Kit only describes in prose. | D | Runner-up | ~6/10 (est.) | Apple-already-shipped · reach-capped |
| 3 | GenAI reach-tiering for sub-8GB devices | A write-once tiering model so a GenAI feature degrades gracefully onto the ~96% of the fleet that can't run Gemini Nano, instead of being a flagship-only demo. | F | Runner-up | ~6/10 (est.) | highest-ceiling · feasibility-parked |
| 4 | On-device neural TTS | A modern on-device text-to-speech developer API — the gap Picovoice Orca sells into and Apple's newer model fills, where Google offers only a decade-old parametric `TextToSpeech`. | A | Runner-up | ~5/10 (est.) | clean-whitespace · no-regulatory-pull |
| 5 | Availability / delivery lifecycle contract | An observable state machine + SLO for on-device model availability, download, and quota, so apps stop shipping features that silently fail for some users. | E | Runner-up | ~5/10 (est.) | max-privilege · demo-invisible |

**🔴 High-priority / trending this run:** Idea #1 only. It carries a live, already-binding regulatory clock (EU DSA in force since 17 Feb 2024; UK OSA duties 17 Mar 2025 + child-safety/age-assurance 25 Jul 2025; Google Play Child Safety Standards mandatory 19 Mar 2025) and a dated demand catalyst — **Google's own Perspective API shuts down 31 Dec 2026**, removing the default free toxicity tool just as obligations peak. Verdict is Prototype (not Build) because of two unresolved risks: whether Google's non-exposure of a developer-tunable harm classifier is a *deliberate* liability abstention (like face identity), and whether one on-device model can hold a publishable multilingual quality floor.

_Runner-up opportunity scores are rough triage estimates, not full-rubric composites; only the winner was scored end-to-end._
