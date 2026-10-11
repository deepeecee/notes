# Eval Kit for On-Device GenAI — give ML Kit developers a way to know whether Gemini Nano got better or worse

**Type:** D (Tooling), with a Type E (Delivery/lifecycle) core · **Verdict:** Prototype (developer-preview) — composite sits on the Shelve/Prototype line · **Opportunity: 5/10 (Latent, competitively-forced)**
*2026-10-11 · Prepared for Android ML Kit · Evidence current as of 2026-10-11*

> Badges: *Apple already shipped this* · *Weak on-device why-now* · *Only-the-platform-can (the lifecycle half)*

> A developer at a notes app ships a "summarize with the Prompt API" feature on Pixel 10 (Nano v3). Six weeks later AICore silently updates the device to Nano v4, and their carefully tuned prompt starts returning four bullets where it used to return two. They find out from a Play review, not a test — because ML Kit gives them `getBaseModelName()` to *read* the version and nothing to pin it, diff it, or regression-test against it. Apple handed iOS developers an Evaluations framework and `response.usage` token accounting at WWDC26. Google published a prose guide that tells you to build the harness yourself. This is that harness — but the part worth owning is the version contract underneath it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Latent, competitively-forced | composite 2.80 × 2 = 5.6, −1 for Durability gate at exactly 3, no +1 (S1 is not a 5) → ~4.6, rounded to 5 |
| Platform privilege (gate) | 4/5 — pass | The managed Nano exposes no endpoint, no weights, no CLI, no version pin; no external eval tool can target it ([confirmed: lm-eval-harness/Ragas/promptfoo all assume an API endpoint](https://github.com/EleutherAI/lm-evaluation-harness)). Only the platform can expose an eval hook and a stability contract |
| Feasibility headroom (gate) | 4/5 — pass | Nothing to train; on-device judging works via Nano or Gemma 4 E2B/E4B; input `countTokens` already exists. Batch eval hits per-app `ErrorCode.BUSY`, battery quota, and foreground-only — a CI/device-farm design constraint, not a wall |
| Durability (gate) | 3/5 — pass, weakest gate | ML Kit GenAI is still beta (`genai-prompt` 1.0.0-beta2, 2026-04-02); an output-stability *contract* across a model AICore silently updates is exactly the thing that is hard to hold. A broken lifecycle contract is worse than none |
| Demand evidence (25%) | 3/5 | Split: general LLM-eval demand is a 5 (~85k combined GitHub stars; paid vendors), on-device-specific demand is a 2 (one purpose-built tool, `vouch`, at 10 downloads; **0** eval/quality/token issues on the ML Kit tracker). Scored 3, generously |
| Install-weighted reach (15%) | 2/5 | GenAI gated to Gemini Nano ≈ **3.7%** of Android actives (140M / ~3.8B); addressable today is hundreds–~2k apps |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The cheap *borrow* path is blocked (no OSS tool reaches Nano), which raises the delta — but a team can stand up an instrumented device-farm eval rig in a few weeks |
| Integration cost / TTFHW (15%) | 3/5 | A one-Gradle-line SDK is plausible, but there is [no emulator/simulator for Nano/AICore](https://discuss.ai.google.dev/t/is-there-any-official-emulator-simulator-workflow-for-gemini-nano-aicore-prompt-api-testing-on-android/147148) — a real Nano device or farm is required, so hello-world is an afternoon, not 15 minutes |
| Substitute half-life (15%) | 2/5 | The dominant risk is Google itself: [Automated Prompt Optimization on Vertex AI](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api) already exists server-side, and Apple's shipped client framework pressures a first-party answer within a year |
| Strategic complement (10%) | 4/5 | Free, easy eval de-risks shipping on-device AI → more Prompt API adoption, directly countering Apple's "evaluation-driven development" story. Value accrues to developers |
| **Composite** | **2.80** | Weighted mean. Band: <3.0 = shelve-with-retrigger; this sits 0.2 under the Prototype line |

*Least trustworthy score: Demand (S1). The general-eval signal is overwhelming and the on-device signal is nearly empty, and I resolved that split to a 3 by crediting the general pattern as a leading indicator. A stricter reader scores it a 2 and the composite drops to ~2.65 — still the same verdict band.*

---

## The problem

A large consumer Android app has server-side ML people and client-side Android people, and almost nobody who is both. When that app adopts the ML Kit Prompt API, it inherits a model it does not control and cannot see into. Three structural problems follow directly from the managed-model architecture, not from any fixable bug:

**It can't tell whether its feature got better or worse between releases.** The app's prompt quality is a function of (prompt × model version × device). AICore updates Gemini Nano silently and independently of the app's release cycle — Google's own docs state "AICore manages the distribution of Gemini Nano and handles future updates" and warn that output "quality... could also vary based on the version of Gemini Nano on a phone" ([ML Kit GenAI overview, via search summarizer](https://developers.google.com/ml-kit/genai)). The developer gets `getBaseModelName()` to read which version is present and nothing to assert against it.

**Output drifts across refreshes and the only lever is avoidance.** Nano v2 (Pixel 9, 2024) → v3 (Pixel 10 / Tensor G5, 2025) → v4 (Gemma-4-based, AICore preview Apr 2026) each change behavior; Google itself re-tunes Nano via LoRA adapters. On the cloud side this exact pain is loud — one HN commenter describes a prompt that "worked reliably for hundreds of requests per day for several months" breaking after a model upgrade ([HN 45315746](https://news.ycombinator.com/item?id=45315746)). On-device the app has no equivalent of "pin to the model version I tested"; the workaround is to pin the *SDK* version and hope.

**It flies blind on cost and quota.** GenAI inference is foreground-only, metered by a per-app quota surfacing as `ErrorCode.BUSY`, and a battery quota (`PER_APP_BATTERY_USE_QUOTA_EXCEEDED`). Apple now exposes `response.usage.input.totalTokenCount`, `cachedTokenCount`, `output.totalTokenCount`, and `reasoningTokenCount` on-device (iOS 26.4, [session 241](https://developer.apple.com/videos/play/wwdc2026/241/)). ML Kit exposes input `countTokens` and no usage accounting on the response, so the developer cannot reason about where quota is going.

The status-quo workaround is a hand-built spreadsheet-and-device rig. On the cloud side, developers describe keeping a sheet of input / expected / actual / manual-grade where a full pass "takes about four hours per run" ([HN 41019748](https://news.ycombinator.com/item?id=41019748)). On-device they'd run the same thing as an instrumented test on a physical Nano device, because there is no emulator for it.

---

## Proof & signals

- **Developers doing it by hand (general):** promptfoo (**25,896★**, pushed 2026-10-11), DeepEval (**18,741★**), Ragas (**15,992★**), EleutherAI lm-evaluation-harness (**14,187★**), Giskard (**5,886★**). The eval/regression *category* is unambiguously real — but every one of these targets a networked API endpoint. [All star counts from the GitHub API, 2026-10-11.]
- **Developers doing it by hand (on-device, the actual gap):** exactly one purpose-built tool surfaced — [`vouch`](https://pub.dev/packages/vouch), a Flutter package whose tagline is *"Catch silent on-device LLM regressions before your users do"* and which gates CI with `expectNoRegression(diff)` across "model swaps, quantization changes, or SDK updates." It targets flutter_gemma, llama.cpp, MediaPipe, and Apple Foundation Models. **Traction: v0.1.0, ~2 months old, 0 likes, 10 downloads, unverified publisher.** Someone felt this precise pain enough to build the tool — and almost nobody has adopted it. That is a lone-builder scratch, not a validated market.
- **Someone charging money for it:** Braintrust ($249/mo Pro), LangSmith ($39/seat/mo), Arize ($50/mo), Humanloop (quote-only) — a real paid AI-eval/observability market. **But every SKU bills on traces/spans/scores from networked inference; on-device tokens produce no traces to send, so these pricing models structurally cannot capture the on-device case.** Willingness-to-pay is proven for cloud eval, unproven for on-device.
- **Apps that shipped it and blogged:** none found. No Meta/Snap/Grammarly/Duolingo post on *on-device* LLM drift in a shipped app surfaced. The measured drift evidence is academic — [arXiv 2505.15030](https://arxiv.org/abs/2505.15030) finds a quality cliff around ~3.5 bits-per-weight — not app-team field reports.
- **Community voice (ML Kit specifically):** a search of the `googlesamples/mlkit` issue tracker for quality / version / token / regression terms returned **0 matching issues**. The absence signal is loud.
- **What I take the silence to mean:** most likely a small, gated, Google-buffered adoption base rather than an absent problem. ML Kit GenAI is narrow and Nano-gated, and Google pre-bakes version-to-version consistency internally (a "rigorous evaluation pipeline using LLM-based raters, statistical metrics, and human feedback" plus per-feature LoRA), so the fixed-task APIs (summarize/rewrite) hide drift from the developer. The drift lands on the *open-ended Prompt API*, whose adoption is still early. **The pain is real, latent, and upstream — not yet voiced.**

---

## Why now

1. **Capability shift — Apr 2026.** The AICore Developer Preview opened Gemma 4 (E2B/E4B) to developers, giving a credible on-device *judge* model and making LLM-as-judge-on-device feasible rather than hypothetical. Nano v4 began rolling out ~Aug 2026.
2. **Competitive shift — Jun 2026 (WWDC26).** Apple shipped the Evaluations framework ("a new Swift framework that measures the quality of your intelligence features," session 241), on-device token accounting including cached and reasoning tokens (iOS 26.4), and an explicit "evaluation-driven development" doctrine that tells developers to key eval gating to OS version and re-run suites against new OS seeds ([session 8016](https://developer.apple.com/videos/play/wwdc2026/8016/)). This is the clearest why-now: Google's platform peer made eval a first-class, shipped, on-device primitive and tied it to the model-version lifecycle. ML Kit has no answer.
3. **Demand shift — weak, and I'll say so.** On the Android side the demand is *not* yet there (see Proof & signals). The honest version of this why-now is two-thirds: the capability became possible and a competitor forced the issue, but app-developer pull has not arrived. A weak demand leg is the finding — it means this is correct and not urgent *for developers*, while being urgent *competitively*.

---

## The capability gap

- **ML Kit:** a prose "Evaluate prompt quality" guide (build your own eval set, grade manually or via a larger judge model) with **no runnable harness, no regression gate, no token accounting, no version pin**. The shipped quality tool is [Automated Prompt Optimization](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api) — "server-side models (like Gemini Pro and Flash) to propose prompts, evaluate variations and find the optimal one," run on **Vertex AI**, not an on-device loop. [ML Kit page claims via search summarizer; the APO blog byte-verified.]
- **AI Edge Portal:** real-device benchmarking of **latency, prefill/decode speed, peak memory, accelerator allocation** — performance only, explicitly *not* output quality.
- **Firebase AI Logic / Genkit:** the eval path Google points developers to is Genkit's server-side flows/evaluators — not a client/on-device eval.
- **Vertex AI Gen AI Evaluation Service:** real, but cloud; it cannot target the managed on-device model.
- **OSS/commercial (promptfoo, DeepEval, Ragas, lm-eval-harness, LangSmith, Braintrust):** all assume an API endpoint or loadable weights. AICore exposes neither — no local endpoint, no weights, no CLI, reachable only through the in-app SDK on a physical device. **None can point at Gemini Nano.** This is the crux of the platform-privilege case.
- **Apple:** shipped all three axes (eval framework, cached+reasoning token accounting, model-change-tied-to-OS discipline). Materially ahead.

**Main competitor a developer uses today:** their own instrumented test on a physical Nano device plus a spreadsheet — or, more often, nothing.

---

## Proposed surface

Two layers. The sharp, non-obvious conclusion of this report is that **they have opposite value profiles**, and the team should weight accordingly.

**Layer 1 — the eval harness (the adoption hook, low durable value).** A test-scoped API:

```kotlin
val suite = GenAiEvalSuite.from(assets("eval/summarize.jsonl"))   // input + reference/rubric rows
val report = suite.run(
    task = Summarization.default(),
    judge = GenAiEvalJudge.onDevice(model = BaseModel.GEMMA_4_E4B), // or a reference string-metric scorer
    gate  = Gate.noRegressionVs("baseline-nano-v3")
)
assertThat(report.regressions).isEmpty()   // fails CI on drift
```

Runs as an instrumented test on a real device or device farm (Firebase Test Lab reaches actual Nano hardware). TTFHW target: an afternoon, bounded by the lack of a Nano emulator — which is itself a finding to hand the AICore team.

**Layer 2 — the version/stability contract + usage accounting (the durable core, only-the-platform-can).** This is Type E and is where the real privilege sits:

```kotlin
GenAiModel.pinnedTo("nano-v3")          // or: observe ModelVersionChanged before it rolls
response.usage.inputTokens / outputTokens / cachedTokens   // the Apple parity gap
```

A declared, observable model-version contract: pin to a tested version, or receive a change signal *before* AICore rolls the device forward, plus an output-diff baseline the app can gate on. **What it deliberately does not do:** guarantee byte-identical output across versions (impossible on a managed model), replace Vertex APO's prompt optimization, or run large batch eval on end-user devices at runtime.

---

## Reach & sizing

All third-party-derived; there is no authoritative per-SDK Android adoption count (Google publishes no Maven/Play SDK stats).

- **Install-weighting multiplier:** on-device ML SDK adopters skew large — TensorFlow Lite sits at ~1.1% of apps but ~10.4% of installs → **~9–10×** (AppBrain).
- **3-yr adoption ceiling for a specialized on-device ML SDK:** ~1–2% of all apps (TF Lite ~1.1%; PyTorch ~0.02%). ML Kit GenAI is a subset of that.
- **Addressable apps (3-yr ceiling):** two independent triangulations (SDK-ratio and category-gated) converge on **~5,000–25,000 apps (~0.25–1.2% of Play)**. **Today: hundreds to ~2k**, because the feature is in early access and Nano-gated.
- **Install-weighted reach:** ~9–10× multiplier would map to ~2–12% of installs, but GenAI only runs where Nano is eligible (**~3.7%** of devices, 140M/3.8B). Net effective reach **~2–6% today**, with a path to low double digits as Nano eligibility rolls across 2026–2028 flagships.
- **Engineering cost avoided (platform-test numerator):** ~5k–25k apps × (a few engineer-weeks to build-and-maintain a device-farm eval rig − ~1 week to integrate). Real but modest, because the per-app saving is weeks, not engineer-months.

**Sensitivity.** Halve the two softest assumptions — GenAI adoption rate among eligible apps, and the 140M Nano trajectory — and the addressable set drops to ~2.5k–12k apps at ~1–3% install reach. **The verdict does not improve under any reasonable assumption and gets worse under conservative ones; it is robust to the Shelve/Prototype line, not to Build.** The one experiment that would move it: instrument the Prompt API developer-preview cohort and measure how many hit a version-drift incident in 90 days.

---

## Adoption path

1. **The hook:** drop in the eval SDK, point it at a JSONL of your prompts, get a red/green regression report in CI against a named Nano baseline — the fifteen-minute-ish win (device-farm caveat aside).
2. **First real integration:** wire `Gate.noRegressionVs(...)` into the release pipeline so a Nano version bump can't silently ship worse output. This replaces the manual spreadsheet run.
3. **The dependency:** the pin/observe version contract. Once an app gates its release on a pinned Nano version, removing the dependency means going back to blind. That is the lock-in a developer would *endorse*, not resent.

**First adopter:** a Pixel-first productivity or notes app already on the Prompt API beta that has felt one drift incident. **Second wave:** unlocked when one such app blogs "here's how we stopped Nano updates from breaking our summaries" — platform tooling spreads by one visible reference implementation.

---

## Execution plan

- **Developer preview:** ship Layer 1 (harness) + `response.usage` token accounting to the existing Prompt API preview cohort. Question it answers: *do developers hit version-drift incidents, and how often?* This is the S1 evidence the whole bet lacks.
- **Alpha/Beta graduation condition:** a checkable threshold — e.g. ≥20% of preview apps record at least one regression-gate catch in 90 days, or ≥X token-accounting API calls/week. If the signal doesn't clear the bar, shelve Layer 1 and keep only the token accounting (cheap Apple parity).
- **GA:** commit Layer 2's version-pin/observe contract and the output-stability semantics. This is the surface you must hold for five years, so it ships last and only if the preview proves the pain.
- **Org dependencies, honestly:** Layer 2 **requires the AICore team to say yes** — only they can expose a version-pin / pre-roll-change signal on the system-managed model. If they decline, the idea collapses to Layer 1, which is exactly the commoditizable half. This is the single biggest execution risk and it is outside ML Kit's control.

---

## The case against

The live failure mode here is **#2 on the rubric's list — the platform absorbs the problem underneath you — in two directions at once.**

First, Google already absorbs drift *for the developer* on the fixed-task APIs via its internal eval pipeline and LoRA adapters, which is precisely why the ML Kit tracker shows zero complaints. If Google keeps the Prompt API's quality high enough internally, the developer-facing eval need may never materialize at the volume that justifies a public, five-year API surface.

Second, the eval-harness half (Layer 1) is a strong candidate to be made redundant by a general substitute within a year: Vertex's APO and evaluation service already exist server-side, Apple's client framework is shipped, and a generic on-device eval library is the kind of thing OSS or a different Google team (Firebase/Genkit extending to the client) ships quickly. S5 is a 2 for good reason.

The honest rebuttal is narrow: the substitute arguments kill *Layer 1*, not *Layer 2*. No substitute can offer a version-pin or stability contract on the managed model, because that requires control of AICore. So the case against is really an argument to **build the durable Type E core and treat the harness as a disposable hook** — which is the recommendation. The weaker case against — "there's just no demand" — is true today and is why this is a Prototype, not a Build.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if the Prompt API developer-preview cohort, instrumented for 90 days, shows fewer than ~10% of apps hitting a version-drift or quality-regression incident, the latent-demand thesis is falsified and this drops to a clean Shelve (keep only token accounting for Apple parity). Conversely, if Google ships a first-party on-device Evaluations framework at I/O 2027, the harness half is pre-empted and only Layer 2 remains worth building.

**Load-bearing assumption:** that app-developer pain from silent Nano version changes is real and merely latent (Google-buffered), not permanently absorbed by Google's internal consistency pipeline.

**Re-check trigger if shelved:** Prompt API reaches GA and crosses ~1,000 adopting apps, or Nano device eligibility crosses ~10% of the Android base — either lifts S1 and S2 enough to re-score.

---

## Fit for this team

ML Kit owns the Prompt API surface developers already call, so the harness and token-accounting layer belong here rather than in MediaPipe or LiteRT. But **Layer 2 — the version/stability contract — arguably belongs to the AICore/Android framework team**, because it is a property of the system-managed model, not the SDK. The most valuable conclusion of this report is organizational: the durable half of the idea needs a co-owner outside ML Kit, and if that co-ownership can't be secured, ML Kit should ship only the commoditizable half and know it. A capability that lands in the wrong part of Google's stack is this ecosystem's defining failure mode, and this idea sits exactly on that seam.

---

## Open questions

- **Does the ML Kit Prompt API response already carry any usage field?** Could not byte-verify the `com.google.mlkit.genai.prompt` reference (developers.google.com was DNS-unreachable to the research tooling this run; see evidence note). This changes how much of Layer 2's token accounting is net-new. *Settle by:* reading the Kotlin API reference directly.
- **Is there a published Nano output-stability statement post-Aug-2026?** The release notes could only be read via mirrors. *Settle by:* the English release-notes page once reachable.
- **What is the real drift incidence?** Nobody has measured how often a Nano version bump changes a given app's output enough to matter. *Settle by:* the developer-preview instrumentation above — this is the load-bearing unknown.
- **Will the AICore team expose a version-pin / pre-roll signal?** Unknown and decisive for Layer 2.

---

## Runners-up

- **On-device neural TTS API (Type A):** real whitespace (Google ships nothing beyond the legacy `android.speech.tts`; Picovoice Orca sells it), and probably higher demand than eval — dropped this run only because it's the *obvious* pick and I wanted to test the under-proposed Type D/E space. Strong candidate for a future run; its gate risk is Platform Privilege (OSS TTS like Piper/Kokoro iterates fast).
- **On-device user-content moderation classifier (Type G):** has the best why-now (EU DMA Art. 6(7) interoperability deadline, 1 Aug 2027; Play output-liability policy). Lost because tunability-vs-one-size is a hard product problem and it needs a trust-and-safety co-owner. Worth a dedicated run.
- **Deferred/opportunistic inference scheduling (Type E):** "run this batch when charging, on wifi, idle" under the shared system model — no vendor has it. Lost on thin demand evidence, same disease as the lead.
- **GenAI reach for sub-8GB devices (Type F):** converts the 3.7% demo into a platform. Lost this run on Feasibility headroom — the honest version can't promise flagship quality on mid-tier silicon, and it needs its own deep feasibility pass.
- **Speaker diarization / wake word (Type A):** Picovoice Falcon/Porcupine are the de-facto standard precisely because no platform ships one. Deferred; narrower install-weighted reach than the lead.

---

*Sources:*
- [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai) · [Prompt API get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started) · [Evaluate prompt quality guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Automated Prompt Optimization for the Prompt API (Android Developers Blog, Jan 2026)](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api)
- [Gemma 4 in the AICore Developer Preview (Apr 2026)](https://developer.android.com/blog/posts/announcing-gemma-4-in-the-ai-core-developer-preview) · [Gemini Nano on-device docs](https://developer.android.com/ai/gemini-nano) · [Accelerating Gemini Nano with frozen Multi-Token Prediction (Google Research)](https://research.google/blog/accelerating-gemini-nano-models-on-pixel-with-frozen-multi-token-prediction/)
- [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [Benchmark LLMs on-device with AI Edge Portal (Google Cloud blog)](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)
- [Apple Foundation Models — What's new (WWDC26 session 241)](https://developer.apple.com/videos/play/wwdc2026/241/) · [Evaluation-driven development (session 8016)](https://developer.apple.com/videos/play/wwdc2026/8016/) · [Foundation Models updates](https://developer.apple.com/documentation/updates/foundationmodels.md)
- [vouch — on-device LLM regression testing (pub.dev)](https://pub.dev/packages/vouch)
- [promptfoo](https://github.com/promptfoo/promptfoo) · [DeepEval](https://github.com/confident-ai/deepeval) · [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) · [googlesamples/mlkit issues](https://github.com/googlesamples/mlkit/issues)
- [HN: unit-testing LLM prompts](https://news.ycombinator.com/item?id=41019748) · [HN: The LLM Lobotomy?](https://news.ycombinator.com/item?id=45315746) · [HN: swap an LLM, re-run your eval set](https://news.ycombinator.com/item?id=37866550) · [HN: why eval startups fail](https://news.ycombinator.com/item?id=48637868)
- [arXiv 2505.15030 — Systematic Evaluation of On-Device LLMs](https://arxiv.org/abs/2505.15030)
- [Is there an emulator/simulator for Nano/AICore Prompt API testing? (Google AI forum)](https://discuss.ai.google.dev/t/is-there-any-official-emulator-simulator-workflow-for-gemini-nano-aicore-prompt-api-testing-on-android/147148)
- AppBrain library & category stats (third-party crawl): [libraries](https://www.appbrain.com/stats/libraries) · [ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [app categories](https://www.appbrain.com/stats/android-market-app-categories) · [apilevels.com](https://apilevels.com/)

*Evidence note: ML Kit / developers.google.com pages were DNS-unreachable to the research tooling this run and were read via the web-search summarizer, which did read the live pages but is not byte-level verification; Apple developer docs and GitHub/pub.dev figures were fetched directly. Install and device-reach numbers are third-party estimates except the 140M Nano figure (Google-stated, Apr 2026, not re-confirmable against a primary this run). The ~3.7% reach and the sizing ranges are my arithmetic over those inputs.*
