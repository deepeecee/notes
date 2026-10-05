# GenAI Observability for ML Kit — on-device evals and a token/usage object, so developers stop shipping Gemini Nano features blind

**Type:** D (Tooling), with a privileged Type-B extension at its core · **Verdict:** Prototype · **Opportunity: 6/10 (parity gap, small base today)**
*2026-10-05 · Prepared for Android ML Kit · Evidence current as of 2026-10-05*

> A developer shipping a Gemini Nano feature flips on Thinking Mode in the ML Kit Prompt API, watches quality improve, and ships. Three weeks later users on a different AICore build report garbage output, and sustained use throws `GenAiException` BUSY after ~40 generations. The developer has no way to know which model variant each user is running, no way to count the reasoning tokens Thinking Mode just spent against an undocumented quota, and no harness to tell whether the last release regressed. `countTokens()` counts only the input. Everything after the prompt is dark.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **6/10 — prototype** | composite 3.15 × 2 = 6.3; no gate at exactly 3 (all gates 4), S1 not a 5 → ~6 |
| Platform privilege (gate) | 4/5 — **pass** | Output/cached/thinking token counts live inside AICore; only Google can expose a usage object ([ErrorCode enum](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode)). The eval *runner* alone is OSS-contestable |
| Feasibility headroom (gate) | 4/5 — **pass** | Input counting ships today ([CountTokensResponse](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/CountTokensResponse)); accounting is a platform decision, not a hardware limit; deterministic/rubric eval runs on-device, judge off-device |
| Durability (gate) | 4/5 — **pass** | Tooling, not a frozen capability surface; a usage object is a small stable contract |
| Demand evidence (25%) | 3/5 | Two dated ML Kit issues ([#1070](https://github.com/googlesamples/mlkit/issues/1070), [#1061](https://github.com/googlesamples/mlkit/issues/1061)), the Constraint-Tax paper, the Palabrita case study; a handful, not a chorus |
| Install-weighted reach (15%) | 2/5 | Gated to ~3.7% of the fleet running Nano; the tool's *users* are dev teams, tens–low hundreds today |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Teams hand-roll harnesses; token accounting they cannot build at all — it is platform-gated |
| Integration cost / TTFHW (15%) | 3/5 | A Gradle line + a golden dataset; a real eval suite is an afternoon, not 15 minutes |
| Substitute half-life (15%) | 3/5 | Dominant risk is Google's own roadmap — which is also the recommendation |
| Strategic complement (10%) | 4/5 | Makes the whole GenAI portfolio safe to change; directly answers Apple's parity move |
| **Composite** | **3.15** | Prototype / developer-preview, explicitly to collect S1 evidence |

*Least trustworthy row: Demand (S1). The strongest signals are two GitHub issues and two arXiv papers I could only read through search snippets (the proxy blocked arxiv.org and developers.google.com for direct fetching). Treat the demand read as directional, not settled.*

---

## The problem

The job: an Android team has shipped an on-device GenAI feature on Gemini Nano through ML Kit's Prompt API, and now has to **keep it working across model updates it does not control, on a device fleet it cannot see, under quotas it cannot measure** — without a server in the loop to log any of it. This is a tooling problem, not a capability problem. The capability (Nano via AICore) ships. What is missing is every instrument a server-side ML team takes for granted: a usage meter, a regression harness, and a record of which model actually ran.

Three structural facts about a large consumer Android app produce this, and none of them is a fixable bug:

**The model is silently mutable and not pinnable.** AICore delivers Nano out of band. A developer's app requests a feature by ID; the device decides what it actually runs. ML Kit issue [#1061](https://github.com/googlesamples/mlkit/issues/1061) (Jul 2026) is exactly this: a beta point-release changed the default `ModelConfig` from feature 636 to 648 — "636 exists on the shipping AICore… 648 does not" — and "feature IDs are requested by the library, not reported by the device." Issue [#1078](https://github.com/googlesamples/mlkit/issues/1078) shows a Pixel 10 Pro XL where the Full Nano package reports AVAILABLE yet every inference fails `COMPUTE_ERROR` across two AICore builds while the Fast variant works on identical hardware. The developer cannot reason about a model that changes underneath them and won't tell them it changed.

**Usage is metered but invisible.** The managed path enforces a per-app inference quota surfacing as `ErrorCode.BUSY` and a battery quota as `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` ([ErrorCode reference](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode)). Issue [#1070](https://github.com/googlesamples/mlkit/issues/1070) (Aug 2026) is a developer who hit it by hand: "Sustained back-to-back inference… hits a rolling per-app quota that is not documented anywhere," BUSY after ~36–41 generations, and the explicit ask — "expose remaining quota (even coarsely) so apps can route to a fallback before hitting the wall." Meanwhile [`countTokens()`](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel) counts **only input request tokens**, returning a single `totalTokens` int with no output, cached, or reasoning breakdown. Thinking Mode shipped ([thinking-mode docs](https://developers.google.com/ml-kit/genai/prompt/android/thinking-mode)) and spends reasoning tokens against that same invisible quota — tokens that cannot be counted at all.

**Quality is non-deterministic and the brand bar is above any benchmark.** Putting generated text in front of 100M users means an error rate far below what a benchmark calls "good." Yet there is no way to know if the last release got better or worse. The Palabrita case study ([arXiv 2604.24636](https://arxiv.org/abs/2604.24636)) reports word-length constraint violations in 30–50% of early generations, JSON keys drifting into the output language, and repetition after three to five generations — concluding that "the most reliable on-device LLM feature is one where the LLM does the least." The Constraint-Tax paper ([arXiv 2605.26128](https://arxiv.org/abs/2605.26128)) quantifies why surface checks lie: forcing schema validity drove validity 61.5% → 100% but *lowered* answer accuracy 19.7% → 11.0%, turning failures into wrong-but-valid-JSON that a naive check waves through.

What they do instead today: fly blind, or hand-roll a harness (Grammarly built systematic quality-regression evaluation for its on-device models; [on-device at scale](https://www.grammarly.com/blog/engineering/on-device-models-scale/)), or — for 88.6% of LLM-using apps — avoid on-device entirely and call a cloud API that ships this week and logs everything by default. **That last one is the real competitor.** An eval harness and a usage meter are table stakes a cloud SDK includes for free; their absence on-device is a reason to stay in the cloud.

---

## Proof & signals

- **Developers asking for the usage meter, by hand, on Google's repo:** ML Kit [#1070](https://github.com/googlesamples/mlkit/issues/1070) — "expose remaining quota… so apps can route to a fallback before hitting the wall." *Strong; third-party developer, Google-hosted repo, dated Aug 2026, still open.*
- **Developers blind to cross-version drift:** ML Kit [#1061](https://github.com/googlesamples/mlkit/issues/1061), feature-ID switch between point releases; [#1078](https://github.com/googlesamples/mlkit/issues/1078), per-AICore-build failures on identical hardware. *Strong; dated; direct developer voice.*
- **Measuring on-device quality is treacherous, quantified:** Constraint-Tax paper ([arXiv 2605.26128](https://arxiv.org/abs/2605.26128), May 2026) and Palabrita ([arXiv 2604.24636](https://arxiv.org/abs/2604.24636), Apr 2026). *Medium-strong; independent; Palabrita is a solo indie app, so weight it as one data point, not an industrial team.*
- **Teams build their own on-device harnesses because none ships:** Grammarly engineering ([link](https://www.grammarly.com/blog/engineering/on-device-models-scale/)); research harnesses MobileAIBench ([arXiv 2406.10290](https://arxiv.org/pdf/2406.10290)) and LM-METER ([arXiv 2510.06126](https://arxiv.org/pdf/2510.06126)). *Medium; the research harnesses measure latency, not quality — their existence is the signal.*
- **General LLM-eval demand is enormous; the on-device cut is not yet voiced:** promptfoo ~21k stars / ~924k monthly npm downloads ([repo](https://github.com/promptfoo/promptfoo)), DeepEval ~15k, Ragas ~14k. **The absence signal:** none of them runs on-device on Android, and I found no feature requests asking them to. I read that as the on-device-eval need being latent — real but not yet articulated as "I want promptfoo for my phone" — rather than absent. A skeptic should read it as demand that may never crystallize.
- **The quota that makes accounting matter is real and Google-published:** [`GenAiException.ErrorCode`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode) (BUSY, battery-quota codes).

Distinguish provenance: the GitHub issues and arXiv papers are third-party; the ErrorCode enum and API references are Google-published; the adoption counts are third-party. The margin-pressure backdrop (Duolingo's SEC-filed ~400bp gross-margin guide as AI expands) is the one filed cost number in this space and is corroborating context, not direct evidence for this idea.

---

## Why now

1. **Capability shift — Thinking Mode shipped without a meter (Jul–Oct 2026).** The Prompt API added Thinking Mode, Structured Output, and System Instructions ([thinking-mode](https://developers.google.com/ml-kit/genai/prompt/android/thinking-mode), [structured-output](https://developers.google.com/ml-kit/genai/prompt/android/structured-output)), and raised output to 4096 tokens. Reasoning tokens are now a real, quota-consuming cost that is literally uncountable on-device. The capability outran its instrumentation this quarter.
2. **Competitive shift — Apple shipped both halves at WWDC26 (Jun 2026).** Apple's [Evaluations framework](https://developer.apple.com/videos/play/wwdc2026/298/) (session 298) lets developers define metrics, auto-grade outputs, run regression suites, and "quantify accuracy as you tweak your prompts… before shipping." The [Foundation Models framework](https://developer.apple.com/videos/play/wwdc2026/241/) exposes a `usage` object with input, cached-input, output, **and reasoning** token counts (iOS 26.4). This is not a speculative gap; it is a parity gap with a date on it.
3. **Regulatory shift — the DMA interop clock (Aug 2027).** The European Commission's July 2026 decision requires Alphabet to expose system-level on-device AI at performance equivalent to its own, in Android 18 by 1 August 2027 ([DMA portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). Observability is how a developer proves "equivalent performance" — making a usage/eval contract more useful and arguably more expected.

Three real shifts, each dated. The why-now is strong.

---

## The capability gap

What exists, with the page checked:

- **ML Kit:** `countTokens()` → `CountTokensResponse.totalTokens`, **input only**, no output/cached/thinking fields ([GenerativeModel](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel), [CountTokensResponse](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/CountTokensResponse)). The ["Evaluate prompt quality"](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) page is **prose only** — build a dataset, grade "manually or with LLM-as-a-judge," iterate — and points to an off-device [Automated Prompt Optimizer](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api), not a runnable harness. *(Snapshot correction: our landscape note claimed this page links to Vertex AI's cloud eval service; I could not confirm that link. It references manual/judge grading plus the optimizer. Google's actual quality-eval product, [Vertex Gen AI Evaluation](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview), is a separate server-side SDK.)*
- **MediaPipe LLM Inference:** `sizeInTokens(String)` — input tokenization only, no eval; Google now steers developers to LiteRT-LM ([LlmInference ref](https://ai.google.dev/edge/api/mediapipe/java/com/google/mediapipe/tasks/genai/llminference/LlmInference)).
- **AI Edge Portal / Qualcomm AI Hub:** performance benchmarking only — init time, prefill/decode speed, peak memory — **not output quality** ([AI Edge Portal](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal), [Qualcomm AI Hub](https://aihub.qualcomm.com/get-started)). And both run their own converted model artifacts, **not the AICore-delivered Nano** the user's app actually invokes.
- **LiteRT-LM:** runtime KV-cache token counts tied to perf benchmarking; no quality eval ([gemma-4 litert-lm](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm)).
- **OSS (promptfoo, DeepEval, lm-eval-harness):** desktop/server only; none runs in-process on Android against a device-resident model.

**Precise boundary.** What exists: input-token counting and prose eval *guidance* on Google's side; performance-only benchmarking in the farms; general eval tooling that doesn't run on-device. What is missing: a typed input/output/cached/reasoning **usage object** on the on-device response, and a first-party **in-app eval harness** that scores quality against the exact managed model. **Main competitor:** not another on-device SDK — it's the cloud LLM API (and increasingly Firebase AI Logic's hybrid path), which bundles logging, token usage, and eval integration as defaults.

---

## Proposed surface

Two components shipping as one "GenAI observability" surface. They are deliberately unequal in priority.

**Component 1 — the usage object (the privileged core, ship first).** Extend `GenerateContentResponse` with a `usage` accessor:

```kotlin
class GenerateContentResponse {
  val usage: UsageMetadata   // new
}
class UsageMetadata(
  val inputTokenCount: Int,
  val outputTokenCount: Int,
  val cachedTokenCount: Int,      // prefix caching is already experimental
  val thinkingTokenCount: Int,    // 0 unless enableThinking
  val quotaRemaining: QuotaHint?, // coarse bucket, directly answers #1070
)
```

What it does *not* do: promise an exact quota integer (coarse bucket only, so the platform keeps headroom), and it does not expose model internals beyond counts. This half **only Google can build** — the numbers live inside AICore.

**Component 2 — the eval harness (the parity play).** A test-time library that runs a golden dataset against the device-resident model and emits a report:

```kotlin
val suite = GenAiEval.suite(model) {
  dataset("hints.jsonl")
  metric(SchemaValid) ; metric(WordLengthBetween(3, 8))
  metric(Judge(rubric = "is the hint helpful and non-trivial?")) // judge runs off-device by default
}
val report = suite.run()  // per-device, fingerprinted
```

The non-negotiable design constraint, and the thing a hand-rolled harness gets wrong: **every result is stamped with the full fingerprint** — AICore build, model variant and version, SoC, sampling params, seed — and reported as a per-(device × build × variant) distribution, never a single cross-device pass/fail. Deterministic metrics (schema, regex, length, golden-diff) run on-device; LLM-as-judge defaults to an off-device/CI judge because small on-device judges carry high position bias, with an optional calibrated on-device fast-path. This is the harness answer to the non-determinism that makes the tool necessary.

**Time-to-first-hello-world target: 15 minutes for the usage object** (read a property), realistically an **afternoon for a first eval suite** (annotate ~20 golden cases). If the eval half can't beat "an afternoon," that's honest and still beats the current "days of ad-hoc A/B."

---

## Reach & sizing

Showing the arithmetic; provenance labeled.

| Input | Value | Source |
|---|---|---|
| Gemini Nano devices | 140M+ (Apr 2026) | Google-published (device *count*, never a %) |
| Android actives | ~3.8B | third-party estimate |
| Nano share of fleet | ~3.7% (140M ÷ 3.8B) | my arithmetic |
| On-device ML SDK ceiling | TFLite 1.08% of apps / 10.41% of installs | AppBrain (via snippet) |
| Install-weighting multiplier | ~9.6× | my arithmetic (10.41 ÷ 1.08) |
| Total Play apps | ~2.0M | AppBrain |
| Apps using ML Kit GenAI | **no public count** | explicit gap |

The tool's *user* is a developer team, not an install, so the numerator is teams building on-device GenAI — gated hard by Nano reach. **SAM** (apps that could plausibly adopt on-device GenAI, bounded by the ~1%-of-apps on-device-ML ceiling): ~15k–25k apps, install-weighted to ~8–12% of installs because big apps adopt on-device ML disproportionately. **SOM today:** essentially greenfield — tens to low-hundreds of teams. **SOM 3-year:** low case ~500–3,000 apps if Nano stays flagship-gated; high case ~10k–25k apps if Nano reaches mid-range.

**Sensitivity.** Halve the two softest assumptions — Nano's reach trajectory and the tool's attach-rate among building teams — and the *reach* verdict collapses to "niche of a niche." It does not flip the *build* decision, because the privileged usage object is justified by the quota complaints independent of volume, and by Apple parity. But it does confirm the overall verdict should be Prototype, not Build: **the reach case is contingent on a Nano-growth curve Google has never published.**

---

## Adoption path

1. **The hook:** the usage object. One property read turns the invisible quota into a number, directly closing #1070. It lands in any existing Prompt API integration with zero architecture change.
2. **First real integration:** the eval suite in CI, replacing the team's hand-rolled A/B spreadsheet and giving them a regression gate before each release.
3. **The dependency:** once a team gates releases on a fingerprinted eval report, removing it means shipping blind again — a dependency they'd endorse, not resent.

**Who adopts first:** the handful of teams already shipping Nano features and hitting the quota wall (the #1070 author's profile). **Who follows:** quality-sensitive consumer apps that currently stay cloud-side *because* they can't measure on-device — the instrument is what de-risks the move. **Second-wave unlock:** one visible app publishing "we cut cloud cost X% and proved parity with the eval harness" is worth more than any doc.

---

## Execution plan

- **Developer preview — usage object only.** Question it answers: do the quota complaints convert to adoption? Partners: the issue-tracker reporters. Evidence collected: attach-rate and whether `quotaRemaining` actually changes routing behavior.
- **Alpha/Beta — eval harness.** Graduation condition: three partner teams gate a release on a fingerprinted report and catch a real regression they would otherwise have shipped.
- **GA — the contract.** Commit the `UsageMetadata` schema versioned independently of the model, and the eval report format. Org dependency named honestly: **this requires the AICore team to surface output/cached/thinking counts** across the AICore boundary. If they say no, Component 1 is impossible and only the OSS-contestable eval runner remains — which materially weakens the whole idea. That dependency is the single biggest execution risk.

---

## The case against

The strongest argument against, made fairly: **this is Google's own roadmap, not a durable moat, and the addressable base is tiny.** Apple shipped both halves already; Google adding them is catch-up a competent platform team does in two releases, so there is no privileged *product* here — just a gap Google should obviously close. Combine that with a developer base of tens-to-low-hundreds of teams gated on a Nano curve that may stay flagship-only, and a skeptic reasonably says: correct, unurgent, and small. The live failure mode from the rubric is **#2, the platform absorbs the problem underneath you** — except here "the platform" is Google itself, so absorption is the goal, not the threat. The mitigation is to recognize this is not a moat play; it's a table-stakes play with a competitor's ship date on it. The usage object specifically resists the "small base" critique because its justification is the quota complaints, which exist at any volume, and its cost to ship is low.

Honest check: the demand is medium and partly latent. If the on-device GenAI base never grows past flagships, this stays a tool for a few hundred teams — worth building for parity and portfolio safety, not for reach.

---

## Kill criteria

**Single observation that would reverse the recommendation:** the AICore team confirms it will **not** expose output/cached/thinking token counts across the AICore boundary for policy or architectural reasons. That kills Component 1 (the privileged half) and leaves only an OSS-contestable eval runner — reframe as a developer-experience sample, not a platform surface.

**Load-bearing assumption:** that on-device GenAI adoption grows beyond the flagship tier within three years (the Nano-reach curve). Everything about reach rests on it.

**Re-check trigger if shelved:** Google ships a `usage` object or on-device eval API in ML Kit release notes (then this is done, by Google), **or** Nano device count crosses ~500M (then reach becomes a real argument).

---

## Fit for this team

ML Kit, specifically, because it owns the managed Prompt API surface developers already call — the usage object belongs on *its* `GenerateContentResponse`, and the eval harness must run against the AICore-delivered model that only the ML Kit path invokes. MediaPipe/LiteRT-LM is the wrong owner (different model artifacts, and being de-emphasized); Firebase AI Logic owns the hybrid/cloud path and could add usage there, but the on-device-specific fingerprinting problem is ML Kit's. The one caveat: Component 1 cannot ship without the AICore team, so this is co-owned at the boundary, and the report should not pretend otherwise.

---

## Open questions

- **Will AICore expose post-inference token counts?** The entire privileged half depends on it; unknown from outside. Settle by asking the AICore team directly.
- **Is there a real adoption count for ML Kit GenAI?** No public number exists; only "Kakao" is named. Settle via internal telemetry.
- **Does an on-device Nano judge ever reach κ ≥ 0.6 against human raters** for the apps' own rubrics, or must judging always be off-device? Settle with a calibration study on nano-v4.
- **Evidence caveat:** the proxy blocked direct fetching of `developers.google.com`, `arxiv.org`, `appbrain.com`, and `grammarly.com`; those claims were read through search-result snippets of the canonical pages and corroborated where possible (the two most load-bearing — `countTokens` being input-only and Apple's Evaluations framework — I re-verified independently). Treat exact API member names and decimals as high-confidence-not-verbatim.

---

## Runners-up

- **Model availability & delivery observability (Type E)** — the loudest issue-tracker pain (#1070/#1078 touch it), maximal privilege. Lost because `RemoteModelManager` and `checkFeatureStatus()` already cover part of it, so the gap is narrower and needs more scoping than one run allows; strong candidate for the next report.
- **On-device neural TTS (Type A)** — clean whitespace (Picovoice Orca sells into it; Apple shipped speech gen). Lost on Feasibility/Reach uncertainty and because it's the obvious pick; deserves its own feasibility-first run.
- **Deferred/opportunistic inference scheduling (Type E)** — novel, no competitor, maximal privilege. Lost on Demand: the pain is derived (P15/P5), not voiced.
- **Hybrid routing policy engine (Type F/E)** — real pain (every team hand-rolls it) but Firebase AI Logic's mode flags already occupy the territory; would need to beat an incumbent, not fill a gap.
- **Standalone safety/moderation classifier (Type G)** — strong regulatory why-now, but fails on one-size-classifier usability unless tunability is solved; gate risk too high for this run.

---

*Sources: [ML Kit GenerativeModel](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel) · [CountTokensResponse](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/CountTokensResponse) · [Thinking Mode](https://developers.google.com/ml-kit/genai/prompt/android/thinking-mode) · [Structured Output](https://developers.google.com/ml-kit/genai/prompt/android/structured-output) · [System Instructions](https://developers.google.com/ml-kit/genai/prompt/android/system-instructions) · [Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [Automated Prompt Optimizer](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api) · [GenAiException.ErrorCode](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode) · [Vertex Gen AI Evaluation](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) · [Apple Evaluations framework, WWDC26 session 298](https://developer.apple.com/videos/play/wwdc2026/298/) · [Apple Foundation Models, WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/) · [MediaPipe LlmInference](https://ai.google.dev/edge/api/mediapipe/java/com/google/mediapipe/tasks/genai/llminference/LlmInference) · [AI Edge Portal](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal) · [Qualcomm AI Hub](https://aihub.qualcomm.com/get-started) · [LiteRT-LM gemma-4](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) · [ML Kit issue #1070](https://github.com/googlesamples/mlkit/issues/1070) · [#1061](https://github.com/googlesamples/mlkit/issues/1061) · [#1078](https://github.com/googlesamples/mlkit/issues/1078) · [Constraint-Tax paper](https://arxiv.org/abs/2605.26128) · [Palabrita case study](https://arxiv.org/abs/2604.24636) · [promptfoo](https://github.com/promptfoo/promptfoo) · [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) · [MobileAIBench](https://arxiv.org/pdf/2406.10290) · [LM-METER](https://arxiv.org/pdf/2510.06126) · [Grammarly on-device at scale](https://www.grammarly.com/blog/engineering/on-device-models-scale/) · [EU DMA Alphabet interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels.com](https://apilevels.com/)*
