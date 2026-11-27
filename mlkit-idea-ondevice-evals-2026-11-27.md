# On-Device Evals for ML Kit GenAI — catch the Nano refresh that broke your feature before your users do

**Type:** D (Tooling), with a Type E (lifecycle) tail · **Verdict:** Prototype / Developer-preview · **Opportunity: 5/10 (Early)**
*2026-11-27 · Prepared for Android ML Kit · Evidence current as of 2026-11-27*

> An Android dev ships a summarization feature on Gemini Nano. Three months later a Pixel gets the nano-v4 update, the model behind `checkFeatureStatus()` silently changes under them, and a prompt that passed review now returns a guardrails refusal on one phone and a four-bullet summary where the UI expects three. They have no harness to catch it, no token/usage readout, and no way to know which model version served the call. On Apple's shipped on-device model a developer reported exactly this: a refresh drove a feature "from a ~95% success rate to a 0% success rate." ML Kit's answer today is a prose web page that says "write your own evals," and ships none.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **5/10 — Early** | composite 3.1 × 2 = 6.2, −1 for Durability gate at exactly 3 → ~5. Honest: timing and privilege are strong; realized demand and near-term reach are not |
| Platform privilege (gate) | 4/5 — pass | Only AICore knows which Nano build served a call and can expose token/usage; only the platform can offer a pin-plus-migration contract. The harness alone is borrowable ([vouch](https://pub.dev/packages/vouch) exists); the telemetry under it is not |
| Feasibility headroom (gate) | 5/5 — pass | Tooling, no model to train. Apple already shipped the analogous framework; `vouch` ships it in Dart today |
| Durability (gate) | 3/5 — pass | A stability *contract* is a hard promise to hold across refreshes; ML Kit's charter in a fast-reorg space is the real question. [killedbygoogle](https://killedbygoogle.com/) is the base rate a skeptic cites |
| Demand evidence (25%) | 3/5 | Strong by analog (Apple forums, verbatim) + strong category (promptfoo ~28k★, paid LangSmith/Braintrust); **latent, not realized, for ML Kit itself** |
| Install-weighted reach (15%) | 2/5 | Gated to apps shipping Nano features at all — hundreds today; ~3.7% device reach is the binding constraint |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The harness is borrowable free; the platform telemetry and the stability contract are not, which is where the real delta sits |
| Integration cost / TTFHW (15%) | 4/5 | Build/CI-time harness + one Gradle line + a baseline file; no new runtime permission |
| Substitute half-life (15%) | 3/5 | The harness has a short half-life (OSS is catching up); the version-telemetry contract is structurally out of a substitute's reach |
| Strategic complement (10%) | 4/5 | Measurable, trustworthy on-device GenAI lifts adoption of the entire ML Kit GenAI portfolio |
| **Composite** | **3.1** | Prototype band (3.0–3.9): developer-preview explicitly to convert latent demand into realized S1 evidence |

*Least trustworthy line in this table:* **S1 (demand)**. The pain is loud on Apple's shipped platform and in the general LLM-eval market, but for ML Kit's own GenAI stack it is still latent because the API is pre-1.0 — I am scoring a leading indicator, and saying so.

> ⚠️ **Collection caveat for the whole report.** In this run WebFetch could not resolve `developers.google.com`, `appbrain.com`, `apilevels.com`, the EU DMA portal, HN Algolia, Reddit, npm, or the GitHub API (rate-limited). Google-doc, sizing, and regulatory figures below come from **WebSearch snippets that quote those pages**, not direct reads. Apple developer forums and `github.com/googlesamples/mlkit` issue pages *were* fetched directly and are the load-bearing primary evidence. Re-fetch the snippet-sourced claims once those hosts are allow-listed.

---

## The problem

The job: a developer has shipped an AI feature on a model they do not own and cannot freeze, and they need to know — before their users do — when a model update broke it. The customer is an Android engineer under a release deadline; the competing solution is their own hand-rolled test script, run manually, if at all.

This is structurally produced, not an accident of beta tooling. A managed on-device model is a shared system service: the platform updates it through OS updates to improve it for everyone, which is the right call for the platform and a standing hazard for any single app built on top. Nano refreshes are not hypothetical — **nano-v4 is now shipping on Pixel 11 and Samsung foldables while nano-v3 remains on Pixel 10 and Galaxy S26** ([9to5Google, 2026-08-27](https://9to5google.com/2026/08/27/gemini-intelligence-nano-4/)), so a developer's install base already spans two model generations with different output distributions. Non-determinism compounds it: the same prompt yields different text run to run, so "did the model change or did I get unlucky?" is unanswerable without a statistical baseline.

What they do instead today: nothing, or a spreadsheet. ML Kit's own [Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) page tells them to "develop a comprehensive set of inputs and expected outputs," "run your evaluation dataset and record the outputs," grade "manually or use LLM-as-a-judge," and iterate "3–5 times" — then links out to **cloud** Vertex AI for anything automated. It prescribes the workflow and ships no code to execute it on-device. That is a sharper gap than silence: the platform has already conceded the developer needs this and handed them a to-do list.

Specific archetypes that feel it first: summarization in reader and email apps (output-shape contracts — "exactly 3 bullets" — break silently); rewrite/proofread in keyboards and writing tools (tone drift is invisible until a user complains); any app using Structured Output, where a model refresh that changes JSON adherence is a production incident, not a UX nitpick.

---

## Proof & signals

- **The platform owner confirming the need, verbatim.** On Apple's analogous on-device model, an Apple Frameworks Engineer: *"There is currently no way to pin an app to a specific version of the on-device AFM model. To track regressions in your prompts across model updates, we recommend using the Evaluations framework."* ([developer.apple.com/forums/thread/832116](https://developer.apple.com/forums/thread/832116), Jun 2026, fetched). The vendor states both the drift problem and that eval is the only mitigation.
- **A developer reporting the exact failure.** Same platform: *"something changed in seed 3 where my feature went from a ~95% success rate to a 0% success rate… since the models are non-deterministic, unless you're running my evals, there's a good chance the team may not even know."* ([developer.apple.com/forums/thread/793599](https://developer.apple.com/forums/thread/793599), Jul 2025, fetched). This is the single best quote in the file: model-refresh drift *and* hand-rolled evals as the only defense, in one breath.
- **Someone already built it.** [`vouch`](https://pub.dev/packages/vouch) (Dart/Flutter, v0.1.0, ~Jul 2026, fetched): *"Catch silent on-device LLM regressions before your users do."* It freezes a baseline, diffs each model swap, and fails CI via `expectNoRegression(diff)` — and explicitly names "a new version, a new quantization, an OS update that swaps the system model" as the trigger, targeting `flutter_gemma`, llama.cpp, MediaPipe, *and* Apple Foundation Models. A purpose-built tool for precisely this pain is the strongest demand artifact short of a paying market.
- **Willingness to pay, one layer up.** The general LLM-eval market: promptfoo ~27.7k★ (fetched, 2026-11-27), DeepEval ~19.7k★ (fetched); commercial LangSmith ($39/seat/mo) and Braintrust ($249/mo) charge money for dataset-based regression comparison with CI gating ([langchain.com/langsmith-pricing](https://www.langchain.com/langsmith-pricing), [braintrust.dev](https://www.braintrust.dev), third-party pricing). These are cloud/API-model oriented — none target on-device — but they prove developers pay to catch model-update regressions.
- **The absence signal, stated honestly.** On `googlesamples/mlkit` issues (fetched), GenAI pain today is provisioning and crashes, not drift: #1078 "AVAILABLE but every inference fails COMPUTE_ERROR," #1080 stuck "Downloading," and the closest version-change complaint, [#1061](https://github.com/googlesamples/mlkit/issues/1061) — a library bump "silently switched the requested AICore feature from 636 to 648." No drift-quality complaints yet, because ML Kit GenAI is pre-1.0 and barely in production. I read that as *latent* demand, not absent demand: the Apple timeline shows the complaints arrive the moment the API ships to a real install base.

---

## Why now

1. **Capability shift — the harness became a shipped, copyable pattern.** Apple shipped its Evaluations framework in iOS 27 (WWDC26, June 2026; public ~Sept 2026) plus token counting in iOS 26.4 ([developer.apple.com/documentation/updates/foundationmodels](https://developer.apple.com/documentation/updates/foundationmodels)). On Android, `vouch` shipped the same idea in July 2026. The question is no longer "can this be built" but "who owns it on Android."
2. **Competitive/regulatory shift — the DMA forces exactly this exposure.** The EU's Article 6(7) decision (16 Jul 2026) requires Alphabet to expose on-device AI models to third-party services by **1 Aug 2027** ([digital-markets-act.ec.europa.eu](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en); [MacRumors, 2026-07-16](https://www.macrumors.com/2026/07/16/eu-google-ai-apps-android-access/)). More independent apps will soon call an on-device model they neither own nor control — amplifying demand for an independent way to measure its output. (The widely-cited "Android 18" label is unverified; treat the obligation as version-agnostic.)
3. **Demand shift — the model is now actually moving under developers.** nano-v4 shipping alongside nano-v3 means a real, present-day two-generation split, not a future one. Model selection landed in the Prompt API in April 2026 — so a developer *can* pin a version — but pinning without a way to *detect* what drifts is half a solution.

All three carry dates. The why-now is genuine.

---

## The capability gap

Be exact about the boundary:

- **ML Kit GenAI:** no evaluation harness, no token/usage accounting, no output-stability signal. It exposes battery/quota error codes and a prose eval page that points to cloud Vertex AI ([evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt), confirmed prose-only, 2026-11-27). Model *selection* exists (April 2026); model *version observability at call time* and *drift detection* do not.
- **Google AI Edge Portal:** benchmarks latency and memory across 120+ devices; **no output-quality metric**, still request-access, not GA ([cloud.google.com blog, 2026-05-20](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **Vertex AI Gen AI evaluation:** real and good — and **cloud-only** ([docs.cloud.google.com](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)). It is where ML Kit's on-device page sends you to leave the device.
- **Apple Foundation Models:** shipped the on-device regression harness (Evaluations) and token/usage reporting — but **explicitly no model-version pinning and no output-stability guarantee**. Apple's answer to drift is "re-run your evals," not "we hold outputs stable."
- **Qualcomm / Samsung / MediaTek / MediaPipe-LiteRT:** nothing for output stability (checked per vendor; only compatibility-version and determinism-knob settings exist).
- **OSS/commercial (promptfoo, DeepEval, LangSmith, Braintrust):** cloud/API-model oriented; promptfoo can hit a local model but offers no on-device version telemetry or stability contract.

**The precisely-shaped gap:** *no vendor — Apple included — ships an on-device output-stability contract or model-version-aware regression telemetry.* Apple half-solved it (the harness, not the contract). ML Kit ships neither, yet already owns the two privileged inputs a real version (AICore's model build ID) and the usage counts.

**Main competitor:** a developer's own hand-rolled eval script, or `vouch` — not another platform.

---

## Proposed surface

Two parts. Lead with the Type-D harness (demand-backed, feasibility-trivial); the Type-E contract is the durable tail.

**1. On-device evaluation harness (Type D).** A `GenAiEvaluator` that runs a developer-supplied dataset of inputs and graders against the live on-device model and returns a per-sample report plus an aggregate, with a CI-friendly assertion:

```kotlin
val eval = GenAiEvaluation.newEvaluator(
    dataset = EvalDataset.fromAsset("summarize_goldens.jsonl"),
    graders = listOf(
        Grader.jsonSchemaAdherence(mySchema),      // structural
        Grader.exactBulletCount(3),                 // contract check
        Grader.modelJudge(Prompt)                   // LLM-as-judge, on-device
    )
)
val report = eval.run()                              // returns EvalReport
report.modelVersion        // AICore build that served the run — the privileged bit
report.usage               // input / cached / output tokens — ML Kit exposes none today
assertNoRegression(report, baseline = "goldens_v1") // fails the build on drift
```

What it deliberately does **not** do: it does not make outputs deterministic, does not guarantee stability, and does not replace human review of the goldens. It tells you *when* and *how much* behavior moved, and on which model version.

**2. Output-stability signal (Type E), built on existing model selection.** Not "outputs never change." Three observable commitments: (a) `report.modelVersion` exposes the serving build at call time; (b) a refresh-notice channel — `OnModelRefresh` callback plus release-note changelog per Nano version for the feature APIs; (c) a **migration window** during which the previous selectable model version remains available after a new one lands, so a developer can pin, run the harness, and migrate deliberately rather than waking to a 0% day.

**Time-to-first-hello-world target: 15 minutes.** Achievable for part 1 because it is build/CI-time, one Gradle line, a goldens file in assets, and no new runtime permission. If the model-judge grader forces a network download or a second model, TTFHW blows past an afternoon — so ship a no-judge structural-grader path that works fully offline as the default.

---

## Reach & sizing

Arithmetic, with the softest inputs flagged (all AppBrain/apilevels figures are snippet-sourced this run):

- **Eligibility is not the gate.** API 26+ covers ~96% of the fleet, API 31+ ~78% ([apilevels.com](https://apilevels.com/), third-party). OS version does not bind.
- **The gate is Nano reach:** 140M+ devices, ~3.7% of ~3.8B Android actives (**Google-published, July 2026** [android-developers.googleblog.com]; the % is my arithmetic against a third-party denominator).
- **Addressable apps = apps shipping a Nano feature at all.** On-device ML SDKs are extreme install-skew: TensorFlow Lite/LiteRT sits near ~1.1% of apps but ~10.5% of installs (~9× multiplier; AppBrain, snippet-sourced). After ~8 years LiteRT tops out near ~1.2% of apps — so a GenAI *eval* tool, a strict subset of apps that both ship Nano features and care about drift, realistically ceilings at **0.05–0.5% of all apps over three years**: low thousands, heavily weighted to large installs.
- **Serious-app denominator:** the >50K-install apps in Business + Tools + Communication + Social alone sum to ~43,500 (AppBrain, snippet-sourced) — the pool those few thousand adopters are drawn from.

**Engineering cost avoided:** per adopter, a hand-rolled on-device eval harness plus baseline tooling is a 3–6 engineer-week build and a permanent maintenance tail (read `vouch`'s scope to price it). The API collapses that to ~1 week of integration. The numerator is real per-app; the problem is the *count* of apps today.

**Sensitivity:** halve the Nano-reach trajectory and halve the 0.5% ceiling, and the near-term adopter pool is hundreds, not thousands — the verdict stays Prototype either way, which is why the honest output is a developer preview whose explicit job is to measure whether the Nano curve pulls enough apps across the "ships a Nano feature" line. The decision needs one input we do not have: the slope of Nano device adoption over the next 18 months.

---

## Adoption path

1. **The hook:** a 15-minute, offline, structural-grader eval that a developer drops into CI and immediately sees "bullet-count contract held: 100/100 on nano-v3, 71/100 on nano-v4." That single number is the whole pitch.
2. **First real integration:** the goldens file becomes a release gate. It replaces the manual spot-check they do now (or the nothing they do now).
3. **The dependency:** once a team gates releases on the harness and reads `modelVersion`/`usage` in their telemetry, removing it means flying blind across the next refresh — a dependency they would endorse, not resent.

**Who adopts first:** a large summarization or writing app already shipping a Nano feature and already burned once by a refresh — the Apple timeline says this archetype exists the moment the API GAs. **Second wave:** structured-output adopters, for whom drift is a parsing crash. If no app is yet shipping a Nano feature in production, the funnel does not start — which is the real risk, and it is about Nano reach, not this tool.

---

## Execution plan

- **Developer preview:** ship part 1 (harness + `modelVersion` + `usage`) with 3–5 design partners already on the Prompt API. Question it answers: *do teams gate releases on it, and does it catch a real nano-v3→v4 regression?* That is the S1 evidence this whole report is short on.
- **Alpha/Beta:** graduate when a partner reports the harness caught a drift incident they would otherwise have shipped. Add the model-judge grader and the `OnModelRefresh` channel.
- **GA:** commit the migration-window contract and version the `EvalReport` schema independently of the model.

**Org dependencies, named honestly:** the harness is ML Kit's to ship. The *migration window* requires the **AICore** team to keep a prior Nano version selectable for a defined period — they must say yes, and if they won't, the Type-E tail dies and this reduces to a (still useful) Type-D tool. Token/usage accounting requires AICore to surface counts ML Kit does not currently receive. This plan does not fully own its own critical path; pretending otherwise would be the wish the template warns against.

---

## The case against

The strongest argument against, argued fairly: **the platform will absorb this, and a free substitute is already undifferentiated on the part that's feasible.** `vouch` exists for free; promptfoo can point at a local model; Apple shipped the harness as a first-party framework. The *harness* is a weekend of borrowed code, which is exactly a G1 (platform-privilege) failure eighteen months out — a thin wrapper competing with free software that ships faster. By the rubric's failure-mode list, this is failure mode #7 (undifferentiated against a free substitute) for the Type-D piece specifically.

The honest rebuttal, and the reason this isn't a kill: the privilege lives in the two things a substitute *structurally cannot reach* — the AICore model-version/build ID at call time, and the usage/token counts — plus the one thing only the platform can promise, the migration window. `vouch` itself has "no literal pin either"; it freezes a baseline it hopes is stable. A harness that can say *which* model version it ran on, and can hold the prior version available while you migrate, is a different and un-borrowable product. The design decision that determines whether this is a platform or a feature is whether the version telemetry and the migration window ship — the bare harness alone does not clear G1, and the report should not pretend it does.

The second live risk is timing: build it now and the realized demand may still be a year out, so it developer-previews to a near-empty room.

---

## Kill criteria

**The single observation that would reverse this:** if, by the Prompt API reaching GA, no design partner will gate a release on the harness — i.e. the preview collects *no* realized drift incident across a Nano refresh — then demand stayed latent and this is premature; shelve it. Conversely, a Nano-reach number that stalls below ~5% of the fleet through 2027 keeps the adopter pool too small to matter.

**Load-bearing assumption:** that a meaningful number of apps will ship production Nano GenAI features within ~18 months. Everything else rests on the slope of the Nano device curve.

**Re-check trigger if shelved:** Prompt API reaches GA, or a second drift complaint class appears on `googlesamples/mlkit` issues — either signals latent demand has become realized.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT or Firebase. ML Kit GenAI is the sanctioned front door to AICore's managed Nano path, so it already owns the surface a developer builds the feature on and the only place the privileged version/usage telemetry can be exposed without leaving the managed path. Firebase AI Logic is hybrid/cloud-leaning (and its on-device path is still beta, 16.0.0-beta01) — the wrong home for an *on-device* stability contract. LiteRT-LM is the bring-your-own-model escape hatch, where the developer already controls the weights and doesn't have this problem. The one risk is the standing MediaPipe↔ML Kit overlap: if eval tooling lands in MediaPipe/AI Edge instead, the developer story fragments further. This belongs next to the API whose refreshes create the drift — which is ML Kit GenAI.

---

## Open questions

- **What is the actual Nano device-adoption slope?** No post-July-2026 figure surfaced. This gates the entire verdict. Settle it with Google's internal AICore install telemetry.
- **Does AICore expose a stable, developer-meaningful model-version/build ID?** The `modelVersion` field assumes it does. Confirm against AICore internals.
- **Will AICore commit to a migration window?** The Type-E tail lives or dies here. Needs a direct conversation, not a doc.
- **Realized ML Kit drift demand.** Latent today by every fetchable signal; the developer preview exists to convert it. Re-run the Reddit/HN/npm demand legs from an allow-listed network to close the snippet-sourced gaps.

---

## Runners-up

- **On-device neural TTS (Type A)** — strongest demand of the slate (Picovoice Orca charges money; Apple shipped speech generation; Google has no answer), but weaker platform privilege (OSS TTS models exist) and real feasibility questions on mid-tier. The better *demand* story; the worse *privilege* story. Close second.
- **Wake-word / keyword spotting (Type A)** — Porcupine is the de facto standard precisely because no platform ships one; lost on narrower install-weighted reach.
- **Speaker diarization (Type A)** — clear whitespace (Picovoice Falcon), but a narrower job than a portfolio-wide eval layer.
- **Standalone on-device moderation classifier (Type G)** — strong DMA/liability timing, but fails cleanly on tunability: one-size safety policy is unusable to a real trust-and-safety team without heavy configurability, which is its own report.
- **Sub-8GB-device GenAI path (Type F)** — the highest-leverage reach idea, but **Feasibility-gated** today: no Google GenAI API targets sub-8GB silicon, and the honest version can't promise Nano-class quality there.

---

*Sources: [ML Kit evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Apple Evaluations session WWDC26-298](https://developer.apple.com/videos/play/wwdc2026/298/) · [Apple FM updates](https://developer.apple.com/documentation/updates/foundationmodels) · [Apple forum 832116 — no version pinning](https://developer.apple.com/forums/thread/832116) · [Apple forum 793599 — 95%→0% regression](https://developer.apple.com/forums/thread/793599) · [AI Edge Portal](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal) · [Vertex AI eval](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) · [vouch](https://pub.dev/packages/vouch) · [promptfoo](https://github.com/promptfoo/promptfoo) · [DeepEval](https://github.com/confident-ai/deepeval) · [LangSmith pricing](https://www.langchain.com/langsmith-pricing) · [Braintrust](https://www.braintrust.dev) · [mlkit issue #1061](https://github.com/googlesamples/mlkit/issues/1061) · [mlkit issue #1078](https://github.com/googlesamples/mlkit/issues/1078) · [EU DMA guidance 2026-07-16](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) · [MacRumors DMA](https://www.macrumors.com/2026/07/16/eu-google-ai-apps-android-access/) · [Nano 4 shipping](https://9to5google.com/2026/08/27/gemini-intelligence-nano-4/) · [apilevels.com](https://apilevels.com/) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [killedbygoogle](https://killedbygoogle.com/)*
