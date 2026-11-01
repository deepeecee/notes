# ML Kit GenAI Evals — a cross-device output-quality harness only the platform can build

**Type:** D (Tooling) · **Verdict:** Prototype · **Opportunity: 5/10 (early but well-timed)**
*2026-11-01 · Prepared for Android ML Kit · Evidence current as of 2026-11-01*

> A team ships a summarization feature on the ML Kit Prompt API. It looks right on the lead engineer's Pixel 10. It ships. Three weeks later a Galaxy user's review says the summaries are in the wrong language, because that device runs a different Gemini Nano version — and the team had no way to know, because nothing lets them measure their own feature's output across the fleet. The Palabrita case study put a number on the general problem: on-device small models violated word-length constraints in [30–50% of early generations](https://arxiv.org/abs/2604.24636). Apple shipped an Evaluations framework for exactly this in June 2026. Android has none, and its fleet is the one that actually needs it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — early but well-timed | composite 3.15 × 2 = 6.3, −1 for a gate at exactly 3 (G3) → 5.3, rounded to 5 |
| Platform privilege (gate) | 4/5 — pass | Only Google can map device→Nano-version at fleet scale; AICore manages versions silently and does not cleanly expose them to a 3P app ([Gemini Nano docs](https://developer.android.com/ai/gemini-nano)) |
| Feasibility headroom (gate) | 4/5 — pass | Apple ships the identical hybrid design (deterministic + model-judge) in [Evaluations](https://developer.apple.com/documentation/evaluations.md); deterministic metrics run on-device trivially |
| Durability (gate) | 3/5 — pass | DMA makes it near-compliance infrastructure, but ML-Kit-vs-AI-Edge ownership is unresolved and Google's deprecation base rate is a real adoption cost |
| Demand evidence (25%) | 3/5 | One rigorous case study + a production rollback in the issue tracker + one paying vendor, but sub-10★ DIY repos and quiet forums — pre-consolidation |
| Install-weighted reach (15%) | 2/5 | Addressable set is apps shipping on-device GenAI, gated to the ~3.7–4.7% Nano fleet; rises with the fleet and DMA access |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The cross-device dimension is literally unbuildable by a 3P team — the model-version-per-device data is platform-only |
| Integration cost / TTFHW (15%) | 3/5 | A Gradle line + a test rule is an afternoon; authoring the golden dataset and wiring device-matrix runs is the friction |
| Substitute half-life (15%) | 3/5 | Fleet dimension is durable; the generic single-device layer is already substitutable, and Google's own AI Edge Portal could absorb it |
| Strategic complement (10%) | 4/5 | Directly de-risks adoption of the GenAI APIs Google wants adopted; the quality bar is the #1 reason teams stay on cloud |
| **Composite** | **3.15** | Prototype band (3.0–3.9): developer-preview explicitly to collect S1 demand evidence |

*Least trustworthy line: Demand (S1). The underlying pain is well-evidenced, but whether it has crystallized into a market a tool would capture is exactly what a preview would test — and the forum channels that would show that were partly unreachable this run.*

---

## The problem

A developer shipping an on-device GenAI feature in a 100M+ install app has one question they cannot answer: *is my feature good enough, for all my users, and did the last model update make it worse?* They can answer it on the one phone on their desk. They cannot answer it across the fleet, and on Android the fleet is the whole problem.

The job-to-be-done is a developer's, under a release deadline, and the competing solution today is their own hand-labeling. The [Kakao Mobility case study](https://developer.android.com/agents/skills/device-ai/ml-kit-genai-prompt-api/skill) describes a team that "evaluated more than 200 labeled images with a carefully crafted prompt" — by hand, because there was no harness. The [Palabrita longitudinal study](https://arxiv.org/html/2604.24636v2) of a production Android game on Gemma 4 E2B and Qwen3 0.6B catalogues five on-device-specific failure classes — format violations, constraint violations, context degradation, latency, and *model-selection instability* — and reports word-length violations in "roughly 30–50% of early generations," a residual 10–15% that forced the team to abandon model-generated words entirely, and its governing conclusion that the most reliable on-device LLM feature "is one where the LLM does the least." That is what shipping without measurement looks like: you discover the failure rate in production and respond by shrinking the feature.

This problem is structurally produced, not a tooling accident. A large Android app runs its GenAI feature across a device fleet that — unlike Apple's — runs **multiple on-device model versions simultaneously**. Gemini Nano v2 and v3 are both live in production right now (nano-v3 is the model ML Kit GenAI APIs use on supported devices, per the [I/O '26 recap](https://developer.android.com/blog/posts/top-ai-on-android-updates-for-building-intelligent-experiences-from-google-i-o-26); v2 persists on Pixel 9-class devices), with Nano 4 rolling out on flagships. AICore updates these silently. So the same prompt, in the same app, returns different output on different devices, and the version that produced it is not stably exposed to the app. The brand-cannot-ship-an-embarrassing-output bar — the reason [88.6% of LLM-using mobile apps use cloud APIs and only 1.3% run on-device](https://arxiv.org/abs/2604.24636) — collides directly with the one thing the developer can't measure.

This is a platform problem, not an app problem, by the atlas test: every app that ships on-device GenAI hits it identically and badly, and the single input that would resolve it — which model version each device is running — is owned by the OS, not the app.

---

## Proof & signals

The pain is real and sourced; the market around it is early. Both are true and the report is weaker if it pretends either away.

- **Developers doing it by hand (confirmed):** A spray of DIY eval harnesses pushed in the last ~90 days, none consolidated: [`ondevice_tagging_eval`](https://github.com/kevinchow08/ondevice_tagging_eval) (LLM-judge + semantic scoring, Oct 2026), [`polyglot-quant-eval`](https://github.com/grinder81/polyglot-quant-eval) (per-language eval of quantized LLMs across on-device and server), [`promptdrift`](https://github.com/tanveer-arch/promptdrift) ("git-native CI regression + behavioral drift monitoring"). Every on-device-quality repo found sits under ~10 stars — active hand-rolling, no winner. *Evidence status: confirmed via GitHub REST, 2026-11-01.*
- **The production rollback (strongest single signal):** ML Kit issue [#1061](https://github.com/googlesamples/mlkit/issues/1061), open since 2026-07-16, is model-version drift caught the hard way: a beta3 default "switched the requested AICore feature from 636 to 648," and the developer reports "beta2 succeeds on the same device, in the same session, minutes apart, with the same source code," with "production exposure rate fell from 8.7% on beta2 to under 1.5% on beta4." They rolled back. This is a willingness-to-pay signal denominated in shipped features. *Confirmed, issue tracker.*
- **The quality inversion:** issue [#1072](https://github.com/googlesamples/mlkit/issues/1072) (2026-09-01): on-device Translate rendered a Tagalog "keep the children away" as "Kill the children" — "fluent and grammatical, which makes it more dangerous than gibberish." The developer tested "against a corpus of warning notices but does not report scores, sample sizes, or error rates" — quality judged entirely by hand. *Confirmed.*
- **Someone charging money:** [AI Supervision Eval Studio](https://aws.amazon.com/marketplace/pp/prodview-lbd4lwg2djyss) (TecAce, AWS Marketplace, 2026) explicitly supports "lightweight on-device sLLM for mobile/local deployment." One vendor, pricing unpublished — thin, but it is willingness to pay for exactly the vacated capability. *Confirmed via Marketplace listing.*
- **The absence signal:** Hacker News returned no on-point thread about phone-to-phone output variance; Reddit was unreachable this run. The category has not crystallized into a loud conversation or a dominant OSS tool. **I read that as early, not absent** — the issue-tracker and case-study evidence is too specific for the pain to be imaginary, but the market is pre-consolidation. Silence on the forums is a reason to run a preview, not to declare demand.

---

## Why now

Two dated, independent forcing functions converge — which is rare, and is most of why this is worth a preview despite thin demand.

1. **Capability shift (June 2026):** Apple shipped the [Evaluations framework](https://developer.apple.com/documentation/evaluations.md) at WWDC26 (Xcode/iOS 27.0) — "Measure the quality of your app's intelligence-powered features… Catch regressions before they ship" — plus token/usage accounting in iOS 26.4 (`model.tokenCount`, `response.usage.input.cachedTokenCount`, `.output.reasoningTokenCount`, confirmed in [WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241)). On-device eval went from research to a shipped first-party API in one WWDC. ML Kit has neither eval nor token counting.
2. **Regulatory shift (1 Aug 2027):** The EU DMA decision of 16 July 2026 (Article 6(7)) requires Alphabet to expose system-level on-device AI models to third parties, implemented in Android 18 "by 1 August 2027 at the latest," on terms the Commission frames as "equally effective" and covering performance. *Evidence status: date and legal basis well-corroborated; exact wording via secondary extracts because the [DMA portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) was unreachable this run — avoid quoting "equivalent performance" verbatim.* A comparative, performance-qualified access right is unauditable without a way to **measure** the exposed models' output quality across the fleet. The DMA turns this harness from DX nicety into the natural compliance artifact.
3. **Demand shift:** the ML Kit GenAI surface itself matured through 2026 — Prompt API to beta4, Structured Output and System Instructions shipping — so more teams are now building the features that generate the measurement problem.

A genuine three-part why-now. The weakest leg is demand urgency, which is why the verdict is Prototype, not Build.

---

## The capability gap

What exists, checked per vendor, negatives included:

- **ML Kit:** no eval, quality-measurement, token, or usage API across any accessible surface. The [prompt-optimization reference](https://developer.android.com/agents/skills/device-ai/ml-kit-genai-prompt-api/references/prompt-optimization) is prose guidance only ("Keep output short by adding output constraints…"). *Caveat: the `developers.google.com/ml-kit/genai` "Evaluate prompt quality" page cited in the August snapshot could not be fetched this run (Google domains were DNS-blocked), so its prose-only status is [unverified] this cycle, though consistent with every reachable surface showing no shipped harness.*
- **Google AI Edge Portal:** benchmarks "initialization time, inference latency, and memory usage" across a device fleet — **latency/memory only, no output quality** ([docs](https://developers.google.com/edge/ai-edge-portal), via snippet, [unverified direct]).
- **Google APO (Automated Prompt Optimization, 28 Jan 2026):** the one quality-adjacent tool, but it is a **server-side Vertex AI prompt-tuning service** ("5–8% accuracy gains"), not an on-device measurement harness, and ships no eval library or token accounting ([blog](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api)).
- **Firebase AI Logic / MediaPipe:** no on-device eval or token accounting; MediaPipe's LLM Inference API has moved to maintenance-only, with work shifting to LiteRT-LM.
- **Qualcomm AI Hub / Workbench:** device-cloud profiling measures latency/memory/throughput and compute-unit mapping — no output-quality benchmark.
- **OSS/commercial (promptfoo, DeepEval, Ragas):** all host-side Python/Node. [DeepEval](https://github.com/confident-ai/deepeval) runs "locally on your machine" — host, not device. None runs on Android.
- **Apple Foundation Models:** **ships** the harness — but measures across *models* (on-device vs Private Cloud Compute vs third-party), explicitly **not across devices**. The words device variance, cross-device, and fleet appear nowhere in the Evaluations or generative-models docs, because Apple ships one on-device model per OS version uniformly across its fleet.

**The precise boundary, and the leapfrog:** every vendor that measures across hardware measures only latency and memory; the one vendor that measures output quality (Apple) does not measure across hardware, because it never has to. Android is the only major platform whose fleet runs multiple on-device model versions at once — so **cross-device, cross-model-version output-quality measurement is a dimension Apple structurally omits and Android structurally requires.** The main competitor a developer uses today is their own hand-labeled spreadsheet.

---

## Proposed surface

A Gradle-dependency eval harness, shaped as a test dependency plus an optional telemetry channel, deliberately mirroring Apple's hybrid so the design question is settled by an existence proof rather than invented.

```kotlin
// Deterministic, on-device, offline — the hello-world layer
val suite = GenAiEvalSuite.fromDataset("summaries.golden.jsonl")
val report = suite.evaluate(promptRunner) {
    metric(SchemaValid(MySummary::class))   // free via Structured Output
    metric(MaxWordCount(45))                 // the Palabrita failure, as a metric
    metric(LanguageMatches(Locale.getDefault()))
    metric(LatencyUnder(2.seconds))
    report(TokenUsage)                        // needs a new platform signal
}
// report.byModelVersion -> the platform-only dimension
assertThat(report.regressionAgainst("baseline-nano-v3")).isEmpty()
```

Three layers, in build-order of value:
- **Deterministic metrics, on-device, offline:** schema-validation (free, since Structured Output already defines the object), word/char-length, language-match, exact-match, latency. These catch the Palabrita failure classes with no model and no network — the 15-minute win.
- **Model-as-judge, optional:** a `ModelJudgeEvaluator` for subjective qualities (tone, helpfulness), paired with golden references. On-device judging is reliability-limited today — small judges underperform frontier judges ([Judge's Verdict, arXiv 2510.09738](https://arxiv.org/abs/2510.09738)) — but a weaker judge *with* curated references beats a stronger judge with synthetic ones ([No Free Labels, arXiv 2503.05061](https://arxiv.org/abs/2503.05061)), so the design leans on golden datasets, with a cloud calibration pass as an escape hatch.
- **The platform-only dimension:** results bucketed `byModelVersion`, which requires the platform to expose the per-device Nano version and a `TokenUsage` signal ML Kit does not currently emit. This layer is the whole reason it must be first-party.

**What it deliberately does not do:** it does not grade for you (no absolute "good/bad" verdict — only your metrics against your dataset), does not ship opinionated quality thresholds, and does not run the judge in the user's hot path. **TTFHW target: 15 minutes** to a passing deterministic suite in the emulator — reachable for the deterministic layer; the cross-device layer is inherently a device-matrix operation (Firebase Test Lab / AI Edge Portal), which is the honest friction.

---

## Reach & sizing

Show the arithmetic; the inputs are thin this run and labeled accordingly.

- **Category denominator:** Google Play has ~278,179 apps with ≥50K installs; Tools alone is 25,392 ([AppBrain, Nov 2026](https://www.appbrain.com/stats/android-market-app-categories), via snippet — the per-category table was DNS-blocked this run). GenAI-relevant serious apps (Social, Communication, Productivity, Education, Photography, Shopping, Tools): **~80,000–115,000** *[my inference from partial data, not a fetched figure]*.
- **p_job (plausibly shipping on-device GenAI, 3-yr):** today only ~1.3% on-device + 2.7% hybrid of *LLM-using* apps ([empirical study](https://arxiv.org/abs/2604.24636)); forward, **5–15%** of the serious-app set might attempt on-device GenAI.
- **Device reach:** Nano reaches "over 140 million devices" (Google, Apr 2026 — latest figure found) against a ~3.0–3.9B active base → **~3.5–4.7%** *(my arithmetic on a Google numerator and a third-party denominator)*. minSdk reach is not the binding constraint — API 26+ is ≈97.6%, API 31+ ≈69.3% ([Android Studio distribution, Dec 2025](https://apilevels.com/)) — the Nano fleet is.
- **SOM at year 3:** applying the specialized-on-device-ML-SDK adoption ceiling of ~1–2% of all apps (skill-reference analogue; live AppBrain ratio unreachable this run), the harness plausibly reaches **low single-digit thousands of adopting apps**, install-weighted up ~8× because large apps adopt platform SDKs preferentially. Install-weighted reach is **low single-digit % of the Android surface today**, gated by the Nano fleet, rising as the fleet grows and DMA opens third-party access.
- **Engineering cost avoided (the platform-test numerator):** each serious adopter otherwise burns ~4–8 engineer-weeks building golden datasets, a device-matrix runner, and metric plumbing — *and still cannot build the cross-device layer at all*. That uncapturable piece is the real value: the platform sells a capability the customer cannot buy or borrow.

**Sensitivity:** halve p_job and the adoption ceiling and the verdict does not move — it was Prototype, not Build, and stays there. The honest reading is that reach is small until the Nano fleet is larger, so the decision past preview turns on the S1 demand evidence a preview collects, not on the sizing.

---

## Adoption path

1. **The hook:** one Gradle line, a golden `.jsonl`, a `@Test` that fails when word-count violations exceed a threshold — the Palabrita team's pain, caught in CI, in an afternoon.
2. **First real integration:** the suite runs in CI on every model-version bump, replacing the hand-labeled spreadsheet; regressions like issue #1061's 8.7%→1.5% drop surface before rollout, not after.
3. **The dependency:** once results are bucketed by model version and wired to production telemetry, removing the harness means going blind on a fleet you can't otherwise see — a lock-in the developer endorses rather than resents.

First adopter: a team already shipping on-device GenAI and already burned — Grammarly (ships on-device at scale and already built an "[offline evaluation framework](https://www.grammarly.com/blog/engineering/on-device-models-scale/)" by hand) or an issue-tracker complainant like the #1061 reporter. Second wave follows the reference implementation plus the DMA deadline forcing third-party AI services onto the same heterogeneous fleet.

---

## Execution plan

- **Developer preview (collect S1):** ship the deterministic on-device layer + the `byModelVersion` bucketing to 5–10 partners already on the Prompt API. The question it answers: *do teams run it in CI unprompted, and does the cross-device dimension change a ship decision?* That is the missing demand evidence.
- **Alpha/Beta:** graduate when ≥N preview partners keep it in CI across two model-version bumps, and when the model-judge layer correlates with human review on a shared benchmark. Add token/usage reporting (requires the AICore team to expose the signal).
- **GA:** freeze the metric API and the dataset format with an output-stability contract, timed to precede the 1 Aug 2027 DMA deadline so it ships as compliance infrastructure, not after it.

**Org dependency, stated honestly:** the `byModelVersion` and token signals belong to the **AICore/Gemini Nano team**, not ML Kit. If they don't expose per-device model version, the differentiated layer cannot be built and this collapses to a me-too single-device eval that OSS already does on the host. That dependency is the single biggest execution risk.

---

## The case against

The strongest case is **self-cannibalization by Google's own roadmap** (failure mode: the platform absorbs the problem underneath you). AI Edge Portal already runs a cross-device benchmarking farm for latency and memory; adding an output-quality metric there is a smaller step for Google than standing up a new ML Kit surface, and it would leave this idea stranded. The honest mitigation is not to deny it but to route the idea: the *measurement primitive* (per-device model version + token signals) must live with AICore regardless, and the *developer-facing harness* should live wherever the GenAI APIs live, so the two teams don't ship two half-answers. If AI Edge Portal is the better home, that is the more valuable conclusion than a territorial claim — see "Fit."

The second case is that **demand is too early to justify a public API commitment** — sub-10★ repos, one vendor, quiet forums. This is the real reason for Prototype over Build, and it is answered, not refuted, by a preview whose explicit job is to collect the evidence. The third, weaker case — that on-device judging is unreliable — is handled by the hybrid design and does not threaten the deterministic layer that delivers most of the value.

---

## Kill criteria

**The single observation that would reverse this:** Google announces output-quality metrics in AI Edge Portal, or the AICore team declines to expose per-device model version — either removes the platform-only dimension and reduces this to a commodity host-side eval. Check at the next I/O (May 2027) and in the AICore preview release notes.

**Load-bearing assumption:** that cross-device, cross-model-version output variance is a problem developers will pay attention to measure — not one they route around by "making the LLM do the least," as Palabrita did. The preview tests exactly this.

**Re-check trigger if shelved:** the Nano fleet crossing ~10% of the active base, or the DMA deadline forcing third-party model access, either of which sharply raises S2 reach and S1 demand.

---

## Fit for this team

ML Kit owns the sanctioned front door to AICore and the GenAI APIs whose output this measures, so the developer-facing harness fits there. But the measurement *primitives* — per-device Nano version, token/usage — are AICore's. The clean split: AICore exposes the signals (it must anyway, for the DMA's "equally effective" standard to be auditable); ML Kit ships the harness that consumes them. The failure mode to avoid is this landing in AI Edge Portal as yet another latency tool divorced from the GenAI surface it should be measuring — which would deepen exactly the ML-Kit / MediaPipe / AI-Edge / Firebase fragmentation that is this ecosystem's biggest internal risk.

---

## Open questions

- **Does AICore expose, or will it expose, the per-device model version to a third-party app?** Unverified — the Prompt API is beta "without an SLA," and AICore manages versions silently. This is the hinge of the whole idea and I could not confirm it this run.
- **What is the real AppBrain adoption ratio for an on-device ML SDK?** The %apps/%installs multiplier and 3-year ceiling could not be fetched (AppBrain DNS-blocked); sizing uses skill-reference analogues and is directional only.
- **Is Nano 4 in production or still preview?** Sources conflict (I/O recap says preview "later this year"; secondary aggregators report Pixel 11 / Galaxy Z Flip8 shipping it). The v2+v3 concurrency is confirmed and sufficient for the argument, but the exact live-version count is unsettled.
- **Does the DMA decision literally require performance-measurable parity?** The concept is corroborated; the exact statutory wording needs the primary portal, which was unreachable.

---

## Runners-up

- **On-device neural TTS (Type A):** strong whitespace (Picovoice's Orca sells into it; Apple ships speech generation), but fails Platform Privilege — small OSS TTS models mean a 3-person team ships a Gradle dep, so the gate kills it as a platform API.
- **Delivery/availability observability (Type E):** the clearest issue-tracker pain (#1061 and the #1019/#1021/#1062 cluster), maximum privilege. Lost narrowly: it is the obvious idea the reader reaches alone, and the eval harness subsumes its sharpest part (version-aware measurement).
- **Standalone moderation/safety classifier for user content (Type G):** real demand (Bumble open-sourced one) and a regulatory clock (minors laws, Jan 2026), but the "one-size classifier is unusable because safety is each company's policy surface" failure mode needs a tunability answer this run couldn't pin down.
- **Deferred/opportunistic inference scheduling (Type E):** strong privilege and no competitor offers it, but demand is inferred from quota errors, not voiced — thinner S1 than the lead.
- **Sub-8 GB reach tiering (Type F):** the defining 26× tension, but Feasibility Headroom is the whole game and genuinely hard; parked pending a mid-tier quality benchmark.

---

*Sources: [ML Kit Prompt API skill](https://developer.android.com/agents/skills/device-ai/ml-kit-genai-prompt-api/skill) · [prompt-optimization reference](https://developer.android.com/agents/skills/device-ai/ml-kit-genai-prompt-api/references/prompt-optimization) · [Automated Prompt Optimization blog](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api) · [Google I/O '26 AI-on-Android recap](https://developer.android.com/blog/posts/top-ai-on-android-updates-for-building-intelligent-experiences-from-google-i-o-26) · [Gemini Nano docs](https://developer.android.com/ai/gemini-nano) · [Google AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [Apple Evaluations framework](https://developer.apple.com/documentation/evaluations.md) · [Apple WWDC26 Session 241](https://developer.apple.com/videos/play/wwdc2026/241) · [Apple WWDC26 Session 8121](https://developer.apple.com/videos/play/wwdc2026/8121) · [Palabrita "Less Is More" case study (arXiv 2604.24636)](https://arxiv.org/abs/2604.24636) · [Grammarly on-device models at scale](https://www.grammarly.com/blog/engineering/on-device-models-scale/) · [ML Kit issue #1061](https://github.com/googlesamples/mlkit/issues/1061) · [#1072](https://github.com/googlesamples/mlkit/issues/1072) · [#1003](https://github.com/googlesamples/mlkit/issues/1003) · [TecAce AI Supervision Eval Studio](https://aws.amazon.com/marketplace/pp/prodview-lbd4lwg2djyss) · [DeepEval](https://github.com/confident-ai/deepeval) · [Judge's Verdict (arXiv 2510.09738)](https://arxiv.org/abs/2510.09738) · [No Free Labels (arXiv 2503.05061)](https://arxiv.org/abs/2503.05061) · [AppBrain Play category stats](https://www.appbrain.com/stats/android-market-app-categories) · [apilevels.com](https://apilevels.com/) · [EU DMA Alphabet interoperability decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)*
