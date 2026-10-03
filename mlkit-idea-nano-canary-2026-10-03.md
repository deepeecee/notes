# Nano Canary — a prompt-regression harness that fires before a model update reaches your users

**Type:** D (Tooling), with a Type E (delivery/lifecycle) core · **Verdict:** Prototype · **Opportunity: 5/10 (Strategic, not sizeable)**
*2026-10-03 · Prepared for Android ML Kit · Evidence current as of 2026-10-03*

> On 16 July 2026 a developer upgraded the ML Kit GenAI Prompt API from beta2 to beta3, and their shipping feature silently broke: the default `ModelConfig` quietly changed the AICore feature it requested from 636 to 648, and no shipping AICore provides 648 ([mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061)). They found it by hand, A/B/A, on one Pixel 10. That is the whole problem: the model under a GenAI feature moves — on a beta bump, on a Nano version rollout — and the app developer has no harness to tell them their output regressed before their users do. Apple shipped a quality-eval framework this year; ML Kit ships a prose page that tells you to do it yourself.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Strategic, not sizeable | composite 3.0 ×2 = 6.0, −1 for two gates at exactly 3; S1 not a 5 so no bonus |
| Platform privilege (gate) | 3/5 — pass (borderline) | A generic eval harness is not privileged — [promptfoo (25.7k⭐)](https://github.com/promptfoo/promptfoo), [DeepEval (18.6k⭐)](https://github.com/confident-ai/deepeval) and [Apple's Evaluations framework](https://developer.apple.com/videos/play/wwdc2026/298/) all exist. Privilege is real only in the model-version-canary dimension: only the platform controls Nano rollout and the [AICore preview channel](https://developers.google.com/ml-kit/genai/aicore-dev-preview) |
| Feasibility headroom (gate) | 3/5 — pass (scoped) | Dev-time small golden set (~20–30 prompts) is practical; a large on-device unattended run is not — see "The problem" and feasibility below |
| Durability (gate) | 4/5 — pass | ML Kit owns the Prompt API surface; Apple committing to [Evaluations](https://developer.apple.com/videos/play/wwdc2026/298/) signals the category is durable; output-stability is itself a durability play |
| Demand evidence (25%) | 3/5 | Overwhelming for *general* LLM eval (Langfuse 35.3k⭐, 6+ funded vendors, [arXiv 2311.11123](https://dl.acm.org/doi/10.1145/3644815.3644950)); thin and latent for *on-device-mobile-specific* eval ([mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061) stands nearly alone) |
| Install-weighted reach (15%) | 2/5 | Tool-for-a-tool on a Nano-gated API; ~140M device ceiling (~3.7%); ~100–1,800 addressable apps over 3 years |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Generic eval logic is borrowable free; the on-device-binary + version-canary integration is not |
| Integration cost / TTFHW (15%) | 3/5 | Plausible afternoon if bundled with the Prompt API; not a 15-min hello-world (needs a Nano device + golden set) |
| Substitute half-life (15%) | 3/5 | Apple already shipped it on iOS; Google's own [Vertex APO](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html) overlaps the prompt-tuning slice; the version-canary slice has the longer half-life |
| Strategic complement (10%) | 4/5 | Free eval de-risks adopting the Prompt API → more on-device GenAI → Android engagement and device differentiation. Classic commoditize-your-complement |
| **Composite** | **3.0** | weighted mean of S1–S6 |

*Least trustworthy row: S1. The demand signal is strong by adjacency and thin on-device-specifically, and the verdict turns on which of those you weight — this is the single number most likely to be wrong, and the one the prototype exists to settle.*

---

## The problem

A consumer Android app that has adopted the ML Kit GenAI Prompt API now carries a dependency it cannot see or pin: the Gemini Nano model under it. That model moves without the app's release train. Nano shipped v2, v3, and v4 inside roughly a year ([landscape snapshot](https://android-developers.googleblog.com/)); beta SDK bumps have changed the requested AICore feature mid-stream ([mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061)); and Nano 4 rolls out to flagships on its own cadence. Every one of those is a silent change to the thing generating text the app puts in front of users. The developer's job-to-be-done is narrow and real: *before the new model reaches my users, tell me whether my feature's output got worse.*

They have no tool for this. ML Kit publishes an ["Evaluate prompt quality" page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) that prescribes the workflow — assemble inputs and expected outputs, run them, grade manually or with LLM-as-judge, iterate with a more powerful cloud model — and ships no code, no runner, no harness behind it. It is a recipe with no kitchen. So the developer does what the ML Kit issue tracker shows them doing: upgrades, notices breakage in production or by luck, and reverse-engineers the cause by hand on a single device.

This is structurally produced, not an accident of immature tooling. The app's ML engineers are server-side ([problem atlas P12](#)); their Android engineers are not ML people. The managed on-device path deliberately hides the model (that is its value) — which means the one party who knows a new Nano is coming (the platform) is not the party who finds out their output changed (the app). That gap only the platform can close. The status-quo workaround for the *general* version of this pain is a mature market — [promptfoo](https://github.com/promptfoo/promptfoo), [DeepEval](https://github.com/confident-ai/deepeval), [Langfuse](https://github.com/langfuse/langfuse), and paid platforms like [Braintrust](https://www.braintrust.dev/articles/llm-evaluation-guide) and [Arize Phoenix](https://arize.com/phoenix/) — but every one of them runs on a laptop or in CI against a *cloud endpoint*. None runs against the actual Nano binary on a phone, and none knows the AICore model is about to change. That is the priced-against workaround, and it is the whitespace.

---

## Proof & signals

- **Developers doing it by hand (general):** OSS traction is unambiguous. [Langfuse — 35.3k⭐, pushed 2026-10-03](https://github.com/langfuse/langfuse); [promptfoo — 25.7k⭐](https://github.com/promptfoo/promptfoo); [DeepEval — 18.6k⭐](https://github.com/confident-ai/deepeval); [OpenAI evals — 19.5k⭐](https://github.com/openai/evals); [Evidently — 7.9k⭐](https://github.com/evidentlyai/evidently); [Giskard — 5.8k⭐](https://github.com/Giskard-AI/giskard-oss). All confirmed via GitHub API, 2026-10-03. Evidence status: **confirmed, fetched**.
- **A steady stream of fresh hand-rolled regression harnesses** — `prompt-ci` ("Unit tests for AI prompts. Catch regressions before your users do.", 2026-07-28), `agentprdiff` ("Snapshot tests that catch behavioral regressions when models, prompts, or vendors change", 2026-08-30), `litmux`, `lrts`, `promptry`. Low stars individually; the *volume of people rebuilding the same thing in 2026* is the signal. **Confirmed, fetched.**
- **Someone charging money for it:** Langfuse, [Braintrust (Pro $249/mo)](https://www.braintrust.dev/articles/llm-evaluation-guide), Arize/Phoenix, Galileo, Humanloop, PromptLayer — six-plus funded vendors monetizing exactly this. Willingness to pay is proven. **Confirmed via search, dated 2026.**
- **The pain is real and measured academically:** ["(Why) Is My Prompt Getting Worse? Rethinking Regression Testing for Evolving LLM APIs" (ICSE-NIER 2024, arXiv 2311.11123)](https://dl.acm.org/doi/10.1145/3644815.3644950) documents a model update causing a toxicity-classification downgrade *and flipping which prompt was best*. A follow-on figure — 58.8% of prompt+model combinations drop accuracy across API updates — is attributed to this literature (**paraphrase, unverified number**).
- **On-device, ML Kit-specific voice (the load-bearing and thin part):** [mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061) is a textbook case — a beta bump silently changed the requested AICore feature and broke the Prompt API on real devices, caught only by manual A/B/A. Verbatim: *"the default ModelConfig requests feature 636 in beta2 and feature 648 in beta3. No shipping AICore provides 648."* **Confirmed, fetched.**
- **The absence signal:** across the ~15 GenAI-related issues in the ML Kit tracker, **no issue asks for an eval or regression tool**, and no large Android app (Grammarly, Duolingo, Meta) has published an on-device-eval engineering post. I take this to mean the on-device demand is *latent* — the breakage exists and is confirmed, but Android developers are not yet asking Google for the tooling the way cloud developers already pay for it. That is simultaneously the whitespace and the risk.

---

## Why now

1. **Capability shift — July 14 2026.** ML Kit shipped [Structured Output, System Instructions, and Thinking Mode](https://developers.google.com/ml-kit/release-notes) for the Prompt API. Structured Output is the specific enabler: it makes both candidate outputs and judge verdicts *typed and machine-gradable*, removing the brittle string-parsing that made on-device eval impractical a year ago. Before this, you could not reliably grade on-device output without a parser you had to maintain.
2. **Competitive/regulatory shift — June 2026 (WWDC26) and July 2026 (DMA).** Apple shipped the [Evaluations framework](https://developer.apple.com/videos/play/wwdc2026/298/) — Pass/Fail, Scoring, and a `ModelJudgeEvaluator`, integrated with Swift Testing — plus [token/usage reporting in Foundation Models (iOS 26.4)](https://developer.apple.com/videos/play/wwdc2026/241/). ML Kit has neither. Separately, the EC's [DMA Article 6(7) decision (July 2026)](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) requires Alphabet to expose system-level on-device AI models to third parties in Android 18 by **1 August 2027** — which makes a model-version contract a near-term obligation, not just a nicety.
3. **Demand shift — 2025→2026.** The Prompt API itself graduated Alpha→Beta over this window and the [AICore Developer Preview opened (April 2026)](https://developers.google.com/ml-kit/genai/aicore-dev-preview), explicitly so developers can "test your prompts and see expected outputs before they are widely deployed to the stable stage." The seeding mechanism for a canary already exists; what is missing is the thing that measures what the preview model broke.

The why-now is genuine on capability and competition. It is **weaker on demand**, because the on-device-specific pull is latent — an honest finding, and the reason the verdict is Prototype rather than Build.

---

## The capability gap

Everyone ships pieces; nobody ships the one that matters here.

- **ML Kit:** a [prose "Evaluate prompt quality" guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) with no harness; `countTokens()` exposes **input** token counting on-device (output/usage accounting unconfirmed on the on-device response — **flag**). No version comparison.
- **Google AI Edge Portal:** benchmarks across [120+ real devices](https://developers.google.com/edge/ai-edge-portal) but measures **latency/memory only**, and its "regression" detection is performance, not output quality.
- **Vertex Automated Prompt Optimization:** [cloud service](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html) that tunes prompts with Gemini Pro/Flash — off-device, and about optimization, not regression-against-the-next-Nano.
- **MediaPipe / LiteRT:** eval guidance for *classic* ML (accuracy/precision/F1), nothing for GenAI output quality.
- **Qualcomm AI Hub:** confirms **numerical equivalence** (quantized vs source) and perf — deployment correctness, not "did my feature's output change."
- **Apple Evaluations (the main competitor):** the only first-party code-level GenAI quality harness — but it is **iOS-only**, its judge runs **off-device** via Private Cloud Compute, and it **does not compare model versions or auto-detect update-induced regressions**. Confirmed from [WWDC session 298](https://developer.apple.com/videos/play/wwdc2026/298/).
- **OSS (promptfoo/DeepEval/Langfuse):** mature, but server/desktop/CI against cloud endpoints — none runs against the on-device Nano binary.

**The precise boundary:** no vendor ships automated detection that an *on-device model update changed a developer's feature output* — old-model-output vs new-model-output diffing/scoring/alerting, on the device class the user runs, keyed to the platform's own model rollout. **The main competitor a developer uses today** is promptfoo-in-CI against a cloud proxy, which answers a different question than the one on-device apps have.

---

## Proposed surface

A dev-time (CI / device-farm) harness, bundled with the Prompt API, whose differentiated core is the **model-version canary**. Three parts:

1. **A golden-set runner** (`PromptEval`): a developer declares a small set of `ModelSample(input, expected)` cases, runs them against the Prompt API, and gets a typed report. It leans on **Structured Output** so candidate output and judge verdict are typed, not parsed.
2. **A regression differ**: capture a baseline run against the *current stable* Nano; re-run against the *AICore-preview next* Nano; emit per-case verdicts: unchanged / improved / regressed. Comparison is cheap-first — exact/structured-field diff and [EmbeddingGemma](https://android-developers.googleblog.com/) semantic similarity (308M, <200 MB, sub-15 ms) — with LLM-as-judge as an *opt-in escalation that may run in the cloud at dev time* (dev-time content is not privacy-sensitive), because an on-device Nano judge is not reliable enough to gate on (ρ≈0.57 at 4B vs ≈0.86 cloud, [arXiv 2412.12509](https://arxiv.org/html/2412.12509v2)).
3. **A rollout signal**: ML Kit tells the harness "a new Nano version is staging for your device class," so the canary can run *before* users get it — the piece only the platform can offer.

```kotlin
// sketch — dev-time, not production runtime
val eval = PromptEval.goldenSet(myGoldens)          // 20–30 ModelSample(input, expected)
val baseline = eval.runAgainst(ModelChannel.STABLE) // current Nano
val canary   = eval.runAgainst(ModelChannel.PREVIEW) // AICore preview Nano
val report   = eval.diff(baseline, canary) {
    compareBy = listOf(StructuredFields, EmbeddingSimilarity(threshold = 0.9))
    escalateTo = Judge.cloud(GeminiFlash)           // opt-in, dev-time only
}
report.regressions // -> fail the CI gate
```

**It deliberately does not:** run large unattended evals on end-user devices; grade with a trusted on-device judge; or claim production-runtime monitoring. Those are ruled out by feasibility, not forgotten.

**Time-to-first-hello-world target: one afternoon**, not fifteen minutes — honest, because it needs a Nano-capable device (or Firebase Test Lab / AI Edge Portal device) and a golden set. The 15-minute version is a finding about the design: it is not reachable while the Nano device allow-list and the AICore preview opt-in both sit in the path.

**Feasibility, stated plainly (G2):** a 20–30 prompt judged set runs in a few minutes on a p50 Nano device. A 50–200 prompt set does **not** run as a single on-device pass — real decode is ~10 tok/s (the 940 tok/s figure is *prefill*, [Android Authority Nano-4 benchmarks](https://www.androidauthority.com/gemini-nano-4-benchmarks-3655763/)), the per-app inference quota trips `ErrorCode.BUSY` after ~36–41 generations ([mlkit #1070](https://github.com/googlesamples/mlkit/issues/1070)), and foreground-only execution plus the battery quota forbid "kick it off and walk away." The design survives *only* as a small-set, interactive, while-charging dev loop — or by running the heavy sweep on a device farm. That constraint is the product's shape, not a caveat.

---

## Reach & sizing

All arithmetic is mine; inputs labeled by source.

- **Device ceiling:** 140M+ Nano devices (**Google-published**, April 2026) against 3.0B+ actives (**Google**, I/O) or ~3.8B (**third-party**) → **~3.7–4.7%** of the fleet, growing with rollout. minSdk 26 reaches 96.1% ([apilevels.com](https://apilevels.com/), third-party), so the **binding gate is the Nano allow-list, not the API level**.
- **Serviceable base:** apps already calling the Prompt API — a *tool-for-a-tool*. The Prompt API is new and Nano-gated, so this base is small today (low hundreds to low thousands of apps). Comparable on-device ML SDK adoption ceilings run ~1–2% of apps (TFLite ≈1.17% of apps / 10.5% of installs → ~9× install weight, **AppBrain, third-party**).
- **Addressable apps (3-yr):** SAM of GenAI-text-plausible apps >50K installs ≈ 25–60k (base 40k) × Prompt-API adoption 2–10% (base 5%) × eval attach-rate 10–30% (base 20%) → **~50 / ~400 / ~1,800 apps** (low/base/high). Install footprint: tens of millions, bounded by the 140M Nano ceiling — not hundreds of millions.
- **Engineering cost avoided:** for the apps that do adopt, the version-canary piece saves weeks of bespoke AICore-preview wiring per team — but the *generic* eval saves little, because borrow (promptfoo) is free.

**Sensitivity:** halve the two softest inputs (Prompt-API adoption 5%→2.5%, attach 20%→10%) and base addressable apps collapses from ~400 to ~100. The estimate is dominated by Prompt-API adoption, which is the real unknown — so on reach alone this is a **Prototype, not a Build**, and the honest output is "run the experiment that measures Prompt-API-adopter demand," not "ship a standalone product."

---

## Adoption path

1. **The hook:** a developer upgrading the Prompt API SDK runs `PromptEval` against 20 goldens and gets a red/green diff in one afternoon — the first time they have *seen* whether a version bump moved their output.
2. **First real integration:** the diff becomes a CI gate, replacing manual A/B/A spot-checks like the one in [#1061](https://github.com/googlesamples/mlkit/issues/1061). What it replaces is "find out in production."
3. **The dependency:** once a team's golden set and canary gate exist, every future Nano rollout flows through them — removing it means going blind again, a cost they'd endorse rather than resent.

**First adopter:** a serious, already-shipping Prompt API integrator that has been burned by a version bump — the Envision/Grammarly-class team doing real on-device GenAI, not a hobby integration. If no such team can be named, the funnel does not start — which is exactly what the prototype must test.

---

## Execution plan

- **Developer preview:** ship the golden-set runner + structured-diff (no judge) to current AICore Developer Preview enrollees. Question it answers: *do Prompt-API adopters run it against the preview Nano, and does it catch real regressions?* Evidence collected: adoption and caught-regression counts — i.e., S1 on-device demand, the number the whole verdict turns on.
- **Alpha/Beta:** add the rollout signal and cloud-judge escalation. Graduation condition (checkable): ≥N preview teams keep the canary in CI across two consecutive Nano rollouts.
- **GA:** commit to a versioned report schema and an output-stability/rollout-signal contract — the Type E spine that makes this platform-privileged.

**Org dependencies, honestly:** this needs the **AICore / Nano rollout team** to expose a per-device-class staging signal and the preview channel as a first-class API, and it needs a decision on whether eval lives in **ML Kit vs MediaPipe/AI Edge** (see Fit). If AICore won't expose staging, the idea degrades to "another eval harness" and loses its only real privilege — that is the make-or-break yes.

---

## The case against

The strongest case against, argued fairly: **this is an undifferentiated feature against a free substitute (failure mode #7), wrapped around a market too thin to matter yet (#1, the API outran the demand).** The generic eval harness — golden sets, LLM-as-judge, CI gating — is a solved, commoditized problem with 35k-star OSS and six funded vendors; a developer can borrow it in a weekend. Apple shipping Evaluations doesn't prove Google must; it proves the *authoring* half is table stakes everyone can build. And the addressable base is ~100–1,800 apps over three years, on ~3.7% of the fleet, for a tool that only the subset of Prompt-API adopters who also want formal eval will touch. Spending a durable public-API commitment on that is hard to justify.

The rebuttal, and why it lands only partway: the part that is *not* commoditized — detecting that the **platform's own model update** regressed your output, keyed to a rollout only Google can see — is genuinely unowned and genuinely platform-privileged. But that part rides on AICore exposing a staging signal, and its demand is still latent. So the live risk is not "someone else will build it"; it is **"the on-device demand never materializes because almost nobody ships on-device GenAI at scale yet"** ([problem atlas P10](#): 88.6% of LLM apps use cloud APIs). That is a demand risk a prototype can measure and a build cannot assume away.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if a developer-preview prototype run for two consecutive Nano rollouts shows **fewer than ~10% of enrolled Prompt-API teams** adopting the canary gate, the on-device demand is confirmed latent-not-real and this shelves. (Conversely, if Google ships output/usage accounting *and* a native eval runner into the Prompt API itself, this is absorbed by the roadmap — the #2 failure mode — and should be folded in, not shipped separately.)

**Load-bearing assumption:** that AICore will expose a per-device-class model-staging signal to third parties. Everything privileged about this idea rests on that one belief.

**Re-check trigger if shelved:** Prompt-API adoption crossing into the low thousands of shipping apps, or the DMA Article 6(7) implementation (by 1 Aug 2027) mandating a model-version/interop contract that makes the canary a compliance deliverable rather than a convenience.

---

## Fit for this team

ML Kit is the right owner **only if** the idea is framed as the version-canary (Type E) rather than a generic eval runner. ML Kit owns the Prompt API surface developers already call, and the canary must sit against that surface. But a pure benchmarking/eval harness is arguably **AI Edge Portal's** territory (it already runs a device fleet and detects perf regressions) — and the cleanest outcome may be a split: AI Edge Portal runs the sweep at scale, ML Kit exposes the rollout signal and the typed report contract. If AICore won't expose staging to any of them, the honest conclusion is that **no team should build this yet** — which is a more useful finding than a weak territorial claim.

---

## Open questions

- **Does the on-device Prompt API response expose output/usage token counts?** `countTokens()` covers input; output usage resolved only to cloud Vertex docs in research. Settle by reading the live `GenerateContentResponse` reference. *(Would sharpen feasibility and the Apple-parity claim.)*
- **Will AICore expose a per-device-class staging signal?** The load-bearing dependency. Settle with the AICore team directly.
- **How many apps actually ship the Prompt API today?** No public count exists; the softest sizing input. Settle via Play SDK Index (manual) or a preview-cohort census.
- **Is EmbeddingGemma semantic-diff a good-enough regression detector** to avoid the on-device-judge quality ceiling? Settle with a small labeled regression benchmark.

---

## Runners-up

- **On-device neural TTS developer API** (Type A) — Google ships no modern neural TTS; [Picovoice Orca](#) sells into the hole and Apple added speech generation. Lost on this run to a weaker *why-now* and higher feasibility/model-delivery cost, but the strongest standalone Type A and the best candidate for next run.
- **On-device safety/moderation classifier for user content** (Type G) — regulatory tailwind ([Play output-liability policy](https://support.google.com/googleplay/android-developer/answer/14094294); DMA; age-assurance laws live Jan 2026). Lost on the one-size-classifier-vs-proprietary-policy tension (G1/product risk) that needs its own report to resolve.
- **GenAI reach/tiering for sub-8 GB devices** (Type F) — addresses the defining 26× reach gap, max strategic complement; lost because [Firebase AI Logic hybrid inference](#) already offers cloud-fallback routing, shortening its substitute half-life (S5).
- **Output-stability / model-version contract** (Type E) — maximum platform privilege; folded *into* the lead idea as its spine rather than run standalone, because alone it is invisible in a demo and hard to demand-evidence.
- **Wake-word / speaker-diarization audio APIs** (Type A) — real whitespace vs [Picovoice](#), but low platform privilege (strong OSS) and narrow reach; parked.

---

*Sources:*
- https://github.com/googlesamples/mlkit/issues/1061
- https://github.com/googlesamples/mlkit/issues/1070
- https://developer.apple.com/videos/play/wwdc2026/298/
- https://developer.apple.com/videos/play/wwdc2026/241/
- https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt
- https://developers.google.com/ml-kit/genai/aicore-dev-preview
- https://developers.google.com/ml-kit/release-notes
- https://developers.google.com/edge/ai-edge-portal
- https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html
- https://github.com/promptfoo/promptfoo
- https://github.com/langfuse/langfuse
- https://github.com/confident-ai/deepeval
- https://github.com/openai/evals
- https://github.com/evidentlyai/evidently
- https://github.com/Giskard-AI/giskard-oss
- https://www.braintrust.dev/articles/llm-evaluation-guide
- https://arize.com/phoenix/
- https://dl.acm.org/doi/10.1145/3644815.3644950
- https://arxiv.org/html/2412.12509v2
- https://www.androidauthority.com/gemini-nano-4-benchmarks-3655763/
- https://apilevels.com/
- https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en
- https://support.google.com/googleplay/android-developer/answer/14094294
