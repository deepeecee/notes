# ML Kit GenAI Evals — a test-time harness and usage ledger so on-device AI features stop silently drifting

**Type:** D (Tooling), with a Type-B token/quota-accounting companion · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Strong, bounded)**
*2026-10-07 · Prepared for Android ML Kit · Evidence current as of 2026-10-07*

*Badges: `Apple already shipped this` · `Nobody ships it on-device for Android` · `Reach-gated`*

> A team shipped a Gemini Nano summarizer in their news app. In July the `genai-prompt` SDK bumped to beta3, the AICore feature ID silently moved from 636 to 648, and their feature broke on-device with no warning ([ML Kit issue #1061](https://github.com/googlesamples/mlkit/issues/1061), open). They have no way to catch that — cloud eval tools evaluate an HTTP endpoint, and on-device inference never touches the network. Meanwhile their batch summarizer hits an undocumented per-app quota after ~40 generations and they can't read how much is left ([issue #1070](https://github.com/googlesamples/mlkit/issues/1070)). Apple shipped a framework for exactly this in June. Google ships a prose page that tells you to go use Vertex AI in the cloud.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, bounded | composite 3.6 × 2 = 7.1; no gate sits exactly at 3 (no −1); S1 is a 4 not 5 (no +1) → 7 |
| Platform privilege (gate) | 4/5 — pass | Quota/usage read-back against AICore is platform-only; eval against the *managed* Nano as the device will actually run it is platform-advantaged ([error codes](https://developers.google.com/ml-kit/genai)) |
| Feasibility headroom (gate) | 5/5 — pass | No model to train. A test runner + a response usage field. Pre-request `countTokens()` already exists ([GenerativeModel ref](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)) |
| Durability (gate) | 4/5 — pass | An eval/accounting surface is far easier to freeze than a model API; Apple's commitment signals the category is durable. Risk is team charter, not design |
| Demand evidence (25%) | 4/5 | Horizontal demand is a 5 (promptfoo 25.8k⭐, DeepEval 18.7k⭐, paid tools $39–249/mo); the *on-device-Android-specific* leg is thinner (one v0.1.0 OSS tool, one paper, a handful of first-party issues) |
| Install-weighted reach (15%) | 2/5 | Bounded to GenAI adopters on the ~3.7% Nano fleet — sub-1% of apps — but install-weighted ~9× toward large apps ([AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks), third-party) |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The eval-only piece is borrowable (crude, ~3 wks); the on-device-against-Nano + AICore quota read-back cannot be borrowed at all |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, a test rule, a response `.usage` field — no key, no permission, negligible size; the one friction is authoring a baseline dataset |
| Substitute half-life (15%) | 3/5 | promptfoo/vouch could add an on-device Android runner in ~2 yrs; they can never read AICore quota headroom |
| Strategic complement (10%) | 4/5 | Free measurement makes the whole GenAI portfolio safe to adopt and to *change*, which is the thing suppressing adoption |
| **Composite** | **3.6** | Prototype band (3.0–3.9): preview to collect the on-device-specific demand evidence |

*Least trustworthy row:* install-weighted reach — the absolute app count is genuinely small and the install-weighting multiplier (~9×) is a third-party AppBrain ratio with unpublished methodology, not a Google figure.

---

## The problem

The job, stated as a developer's job under a deadline: *"A managed model I don't control just changed underneath my shipped feature, and I need to know whether my feature still works — before my users tell me it doesn't."* The customer is an Android engineer, not an ML engineer; the app's ML people are server-side; and the competing solution is their own hand-rolled test script, if they have one at all.

This problem is structurally produced, not an accident of current tooling. A large consumer app that adopts ML Kit GenAI takes a dependency on Gemini Nano via AICore — a model the platform updates on its own cadence (nano-v2→v3→v4, plus per-feature LoRA refreshes), with inference gated foreground-only under opaque per-app and battery quotas that surface only as `ErrorCode.BUSY` and `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` ([ML Kit GenAI docs](https://developers.google.com/ml-kit/genai)). Three consequences fall out of that arrangement, each of which an app team currently handles blind:

1. **Silent output drift across model updates.** The same prompt returns different text after an OS/model swap — "your prompt can definitely give different output, even when using greedy sampling," as the one OSS tool in this space puts it ([vouch](https://pub.dev/documentation/vouch/latest/)). A summarizer starts emitting an extra paragraph; a structured-output prompt starts escaping unicode differently. The team finds out from a one-star review.
2. **No usage ledger.** There is a *pre-request* `countTokens()` estimator, but no *post-response* per-call usage on the on-device path, and no way to read remaining quota headroom before hitting the wall. Issue #1070 asks for exactly this: *"expose remaining quota (even coarsely) so apps can route to a fallback before hitting the wall."*
3. **No way to know if a prompt change helped.** The team tweaks a prompt to fix one case and silently regresses five others — the recurring complaint across the LLM-ops literature.

Name the archetypes: news/reader apps (summarization), writing and email apps (rewrite/proofread), accessibility apps (image description), note-takers (speech + summarization). What they do *instead* today: nothing, a brittle hand-written instrumented-test, or a cloud eval tool that cannot see the on-device model. That workaround's cost — and its blind spots — is what this API is priced against.

---

## Proof & signals

- **Developers doing it by hand (horizontal):** five OSS eval frameworks, ~90k combined stars, all framing the job as regression/CI gating of LLM output — [promptfoo](https://github.com/promptfoo/promptfoo) (25,786⭐, *"Used by OpenAI and Anthropic"*), [OpenAI Evals](https://github.com/openai/evals) (19,564⭐), [DeepEval](https://github.com/confident-ai/deepeval) (18,679⭐, *"similar to Pytest but specialized for unit testing LLM apps… prevent prompt drifting"*), [Ragas](https://github.com/explodinggradients/ragas) (15,953⭐), [Arize Phoenix](https://github.com/Arize-ai/phoenix) (11,742⭐). *Status: GitHub REST, fetched 2026-10-07, verbatim.* These are all desktop/CI/cloud — **none run on-device on Android.**
- **Someone charging money for it:** [LangSmith](https://www.langchain.com/pricing-langsmith) at $39/seat/mo (traces $2.50–5.00/1k), [Braintrust](https://www.braintrust.dev/) Pro at $249/mo marketing *"dataset regression testing"* across model versions. *Third-party/vendor pricing pages.* Willingness to pay for LLM eval/observability is established — for the cloud.
- **First-party ML Kit pain (strongest, on-the-nose):** [issue #1070](https://github.com/googlesamples/mlkit/issues/1070) (open, 2026-08-09) names the use case in the developer's own words: *"Any batch-style usage – evaluation harnesses, prefetching several summaries, retry loops – hits this wall with no way to anticipate it."* [Issue #1061](https://github.com/googlesamples/mlkit/issues/1061) (open) is a literal silent-breakage-on-SDK-update. [#1078](https://github.com/googlesamples/mlkit/issues/1078) and [#1069](https://github.com/googlesamples/mlkit/issues/1069) are per-device model-package variance and undocumented quota behavior. *Status: GitHub, fetched 2026-10-07, verbatim.*
- **On-device specifically (thin — this is the weak leg):** one nascent tool, [vouch](https://pub.dev/documentation/vouch/latest/) v0.1.0 (*"catch silent on-device LLM regressions before users experience them"*), and the [MobileAIBench](https://arxiv.org/abs/2406.10290) paper. That the on-device-Android revealed demand is served by a v0.1.0 package and one academic benchmark is itself the signal: the need is real and recognized, but unmet — and not yet loud, because few have shipped on-device GenAI at all.
- **The absence signal:** large consumer apps publish almost no on-device-ML engineering blogs. I take that to mean on-device GenAI shipping is still early — which bounds near-term demand (see reach) and argues for *preview*, not GA.

The horizontal demand is overwhelming; the Android-on-device-specific demand is early. I am not smoothing that over — it is the reason the verdict is Prototype.

---

## Why now

1. **Capability shift — Oct 2025 → Jul 2026.** The Prompt API went Alpha→Beta and gained Structured Output, System Instructions, and Thinking Mode by [July 14, 2026](https://developers.google.com/ml-kit/release-notes). On-device GenAI only just became something an app team can build a real feature on — so "did my feature survive the last model update" is only now a live question.
2. **Competitive shift — June 2026 (WWDC26).** Apple shipped the [Evaluations framework](https://developer.apple.com/videos/play/wwdc2026/298/) ("define metrics, automatically grade outputs, aggregate statistics… evaluation-driven development") *and* per-call token usage reporting ([session 241](https://developer.apple.com/videos/play/wwdc2026/241/): `response.usage.input/output.totalTokenCount`, cached and reasoning tokens) in iOS 26.4. Google has neither. This is the dated, external forcing function.
3. **Regulatory shift — statutory, 1 Aug 2027.** The EU DMA [Alphabet interoperability decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) requires exposing system-level on-device AI to third parties at equivalent performance by Android 18. When third parties can target the on-device model directly, "how do I measure what I'm getting" stops being optional.

The why-now is genuinely strong — which is unusual, and worth saying plainly.

---

## The capability gap

What exists, with the page checked:

- **Google ML Kit:** the [Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) guide is **prose only** — build a dataset, score manually or with LLM-as-a-judge, iterate — and it offloads the actual scoring to the cloud (Gemini Pro to rewrite prompts, the Vertex AI optimizer). No runnable on-device harness. There is a pre-request `countTokens()`/`getTokenLimit()` ([ref](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)) but no post-response usage and no quota read-back. *Confirmed via release notes + API ref, 2026-10-07.*
- **AI Edge Portal** benchmarks latency and memory across devices, [not output quality](https://developers.google.com/edge/ai-edge-portal). **MediaPipe LLM Inference** exposes [performance metrics only](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/android). **Firebase AI Logic** has cloud "AI Monitoring" (token usage in the console) for its *Vertex* path, not the on-device path ([docs](https://firebase.google.com/docs/ai-logic)).
- **Qualcomm Workbench** checks numerical parity, not semantic output quality. **Samsung/MediaTek:** nothing developer-facing for on-device LLM eval.
- **OSS/commercial:** promptfoo, DeepEval, Ragas, OpenAI Evals, LangSmith, Braintrust, Phoenix, Humanloop — all run in Python/Node on desktop/CI/cloud and call a model over the network. **None execute on-device on an Android handset against local Nano.** This is the crux of the gap.

**The main competitor a developer uses today:** a hand-rolled Android instrumented test, or promptfoo pointed at a cloud model as a stand-in — which measures the wrong model.

---

## Proposed surface

Two coupled pieces. The honest framing is that the eval harness is the demo and the usage ledger is the privileged core.

**(1) Token/quota accounting (Type B extension, the privileged part).** Add post-response usage to the Prompt API response and a quota read-back:

```kotlin
val response = model.generateContent(request)
response.usage.inputTokenCount    // actual, post-hoc
response.usage.outputTokenCount
response.usage.cachedTokenCount    // prefix cache is already experimental
model.quotaStatus()                // QuotaStatus(remainingFraction, resetHint, batteryQuotaState)
```

Only the platform can populate `quotaStatus()` — it reads AICore internals no third party can reach. This directly answers issue #1070.

**(2) On-device eval harness (Type D).** A JUnit/androidx-test rule that runs a frozen dataset against the *actual* on-device model and gates CI on drift:

```kotlin
@get:Rule val eval = GenAiEval.baseline("summarizer_v3.jsonl")

@Test fun summarizerHoldsQuality() = eval.run {
    metric(Rouge(min = 0.42))
    metric(LlmAsJudge(rubric = CONCISENESS, min = 0.8)) // judge = on-device Nano
    metric(SchemaValid())                                // for Structured Output
    perDeviceClass()                                     // report p95 per SoC tier
}
```

What it deliberately does **not** do: it is not a cloud service, not a safety classifier, and not a prompt optimizer — it measures; it does not rewrite. It emits a report (per-sample + aggregate mean/stddev), not a verdict.

**TTFHW target: 15 minutes.** One Gradle line, read `response.usage` in your existing code, one `@Test`. What must be true to hit it: usage must be a field on the existing response (no new call), and the harness must ship a one-line baseline-capture mode so the first dataset is recorded, not authored. Authoring a *good* dataset is an afternoon — that is the one honest friction point, and it is the same friction Apple's framework has.

---

## Reach & sizing

Show the arithmetic (every input flagged Google-published vs third-party):

- `A_cat` (apps in relevant categories, ≥50K installs): the on-device-ML SDK band tops out near TensorFlow Lite's **1.17% of apps** ([AppBrain, third-party](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)).
- `r_reach` (device eligibility): **~3.7%** of the fleet runs Gemini Nano (140M+ devices, **Google-published**, Apr 2026, against ~3.8B third-party actives → my arithmetic). OS floor is not binding — API 26 ≈ 95.7% ([apilevels.com, third-party](https://apilevels.com/)).
- `c_ceiling`: specialized on-device ML SDKs sit at 1–2% of apps; a GenAI-eval tool lands **well under 1%**.
- `m_install` (install-weighting): TFLite shows 10.5%/1.17% ≈ **~9×** — adopters are disproportionately large apps ([AppBrain, third-party]).

**SOM:** the intersection of (sub-1% of apps that adopt ML Kit GenAI) and (apps targeting the 3.7% Nano fleet) is **a few hundred serious adopter apps today** — not a mass market. **Engineering cost avoided:** at ~3 engineer-weeks saved per adopter (the crude-harness build + ongoing per-model-update re-validation the platform absorbs), a few hundred apps is a few thousand engineer-weeks — real, but modest.

**Sensitivity:** halve `p_job` and `c_ceiling` and the absolute base roughly quarters, to low hundreds. The volume case does **not** survive, and I won't pretend it does. What survives is the install-weighting: this reaches the large, high-revenue apps most likely to demand accounting and quality gating. **This is a developer-experience/strategic bet on important adopters, not a volume play** — and the experiment that would settle it is the preview adoption count among top-50 GenAI apps (named below).

---

## Adoption path

1. **The hook (15 min):** read `response.usage` in code you already have, or drop in `GenAiEval.baseline(...)` and watch it fail the first time a model update shifts output. The "it caught a regression I'd have shipped" moment is the hook.
2. **First real integration:** the eval suite goes in CI and gates the release; the usage ledger drives a cloud-fallback routing decision (route to Firebase AI Logic cloud when `quotaStatus().remainingFraction` is low). It replaces a brittle hand-rolled test and a guess.
3. **The dependency they'd endorse:** once the frozen baseline encodes "what good looks like" for their feature, every future Nano update is validated against it automatically. Removing it means going blind again across model updates — a cost they feel, not one you impose.

**Who adopts first:** a reference app from a known on-device-GenAI shipper (a reader or writing-assistant app already on the Prompt API), published with the harness as the proof. **Second wave** unlocks when the first visible app says "we survived the nano-v4 rollout because our evals caught two regressions." Platform tooling spreads by that one credible story.

---

## Execution plan

- **Developer preview** (ships first, cheap): the token/usage field + `quotaStatus()`. Question it answers: *do developers wire quota-aware fallback when we give them the signal?* Partners: the apps in issues #1070/#1061. Evidence collected: usage-field adoption and whether #1070's fallback-routing ask is real.
- **Alpha → Beta:** the eval harness. Graduation condition (checkable): ≥10 preview partners run a baseline suite in CI and ≥3 report a caught regression within one Nano update cycle.
- **GA:** commit to a versioned eval-report schema and a stable usage contract, decoupled from the model version — the output-stability contract is itself part of the value.

**Org dependencies, honestly:** the usage/quota read-back requires the **AICore team** to expose quota internals — that is the yes you must get, and if they say no, piece (1) dies and only the (weaker, borrowable) eval harness remains. The eval harness overlaps **AI Edge Portal** and **MediaPipe**'s surfaces; ownership must be settled or this fragments the story further (see Fit).

---

## The case against

The strongest case against, argued fairly: **the reach is too thin to justify a platform commitment, and this is a feature, not a platform API.** A few hundred addressable apps, gated to a 3.7% device fleet, is below the bar where platform tooling usually earns five years of maintenance. On the rubric's failure-mode list, the live risk is **#7, undifferentiated against a free substitute**, with a twist: promptfoo and vouch are free and iterate monthly, and the moment one of them ships a competent on-device Android runner, the eval-harness half of this is commoditized. The eval harness genuinely fails the Platform Privilege test on its own (a competent team ships a Gradle dependency for it).

The rebuttal, and why it's only a partial one: the **usage/quota accounting cannot be built by anyone but the platform** — no OSS tool can read AICore's quota headroom — so the privileged core holds even if the harness is commoditized. And the install-weighting means the thin app count maps to strategically important adopters. But that is a *bounded* rebuttal, which is exactly why the verdict is Prototype and not Build: the thing to do is ship the privileged, cheap piece (usage/quota) as a preview, prove the adopter demand, and only then commit to the harness.

---

## Kill criteria

**The single observation that would reverse this:** promptfoo or another ≥10k-star eval tool ships a production on-device Android runner that executes against AICore Nano, before our preview reaches 20 adopters. If a free substitute covers the on-device execution path, only the quota-accounting extension survives, and that is a Type-B footnote, not a report.

**Load-bearing assumption:** that the AICore team will expose per-app quota headroom and post-response usage. Everything privileged rests on this one yes.

**Re-check trigger if shelved:** ML Kit GenAI adoption crosses ~1% of apps (AppBrain), or the DMA interoperability mandate (1 Aug 2027) goes live and third parties can target the on-device model directly — either event changes the reach score materially.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, **only if** the goal is to measure the *AICore-managed Nano* path — ML Kit is the sanctioned front door to it, and the usage/quota signal lives there. But the eval *harness* arguably belongs with **AI Edge Portal** (already the device-matrix benchmarking surface) extended from latency/memory into output quality. The honest conclusion: **ship the token/quota accounting in ML Kit (it has no other home); converge the eval harness with AI Edge Portal rather than building a third, competing quality surface.** Shipping a standalone ML Kit eval tool that duplicates AI Edge Portal would make this ecosystem's fragmentation worse — the exact internal risk to avoid.

---

## Open questions

- Does `GenerateContentResponse` already carry an unpopulated `usageMetadata` field on-device? (Could not confirm; all `usageMetadata` hits were cloud SDKs.) *Settle by:* reading the `com.google.mlkit.genai.prompt` API surface in Android Studio.
- Is the AICore per-app quota readable at all, even internally, or is it enforced opaquely even to first parties? *Settle by:* asking the AICore team — this gates the whole privileged piece.
- How many of the ~few-hundred GenAI adopter apps run anything resembling a regression test today? *Settle by:* a preview partner survey.
- Are ML Kit GenAI and MediaPipe/AI Edge converging or diverging organizationally? Unknown and unpublished; it decides harness ownership.

---

## Runners-up

- **On-device neural TTS (Type A)** — strongest whitespace (Picovoice Orca sells it; Apple added speech gen; Google has nothing), but feasibility headroom and device gating need their own deep run; held for a dedicated report.
- **GenAI reach tiering for sub-8GB devices (Type F)** — the "defining tension" (26× coverage gap) and highest strategic ceiling, but G2 (feasibility) is genuinely hard — a small model ≠ Nano — and it likely lands Shelve/Prototype; deserves the honest Shelve report next.
- **Standalone safety/moderation classifier (Type G)** — strong privilege + DMA/Play-policy timing, but one-size-fits-all classifiers die on contact with real T&S teams unless tunability is designed first; lost on needing that design work up front.
- **Speaker diarization / speaker ID (Type A)** — real demand (Picovoice), but narrower category reach than eval tooling.
- **Delivery/availability state machine + deferred inference scheduling (Type E)** — maximum platform privilege, but demand is invisible-in-demos and S1 evidence is the thinnest of the slate; lost on demand evidence.

---

*Sources: [ML Kit evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit GenAI error codes](https://developers.google.com/ml-kit/genai) · [GenerativeModel API ref](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel) · [Apple Evaluations framework (WWDC26 s298)](https://developer.apple.com/videos/play/wwdc2026/298/) · [Apple FM token usage (WWDC26 s241)](https://developer.apple.com/videos/play/wwdc2026/241/) · [ML Kit issue #1070](https://github.com/googlesamples/mlkit/issues/1070) · [#1061](https://github.com/googlesamples/mlkit/issues/1061) · [#1069](https://github.com/googlesamples/mlkit/issues/1069) · [#1078](https://github.com/googlesamples/mlkit/issues/1078) · [promptfoo](https://github.com/promptfoo/promptfoo) · [DeepEval](https://github.com/confident-ai/deepeval) · [OpenAI Evals](https://github.com/openai/evals) · [Ragas](https://github.com/explodinggradients/ragas) · [Arize Phoenix](https://github.com/Arize-ai/phoenix) · [vouch](https://pub.dev/documentation/vouch/latest/) · [MobileAIBench](https://arxiv.org/abs/2406.10290) · [LangSmith pricing](https://www.langchain.com/pricing-langsmith) · [Braintrust](https://www.braintrust.dev/) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [MediaPipe LLM Inference](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/android) · [Firebase AI Logic](https://firebase.google.com/docs/ai-logic) · [EU DMA Alphabet interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [apilevels.com](https://apilevels.com/) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)*
