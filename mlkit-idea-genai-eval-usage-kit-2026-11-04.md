# ML Kit GenAI Eval & Usage Kit — a meter and a regression alarm for the GenAI features you already shipped

**Type:** D — Tooling (with a Type E model-version/drift thread) · **Verdict:** Prototype · **Opportunity: 5/10 (Latent)**
*2026-11-04 · Prepared for Android ML Kit · Evidence current as of 2026-11-04*

> *Badges: Apple already shipped this · Weak why-now (regulatory) · Nobody has won it yet · Reach is the soft spot*

> On a Tuesday in July 2026 a developer updated the ML Kit GenAI Prompt API from beta2 to beta3 and their feature stopped working on a Pixel 10 — a silent change to the requested AICore feature ID, with a release-notes line that had "a date and no description." They had no meter to see it coming and no harness to catch it. Meanwhile Google's own team measures Nano summarization quality at 92.1 versus 77.2 with "LLM raters, statistical metrics and human raters." The developer shipping on that same model gets no dial and no gauge. Apple handed its developers exactly this — an Evaluations framework and per-call token usage — at WWDC26. This idea is the Android answer: a meter and a regression alarm for GenAI features already in production.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **5/10 — Latent** | composite 3.10 × 2 = 6.2, −1 because Platform Privilege gates at exactly 3; demand is real but mostly unvoiced on-device |
| Platform privilege (gate) | 3/5 — **pass** | eval-harness shell is borrowable (two OSS clones exist); the model-version signal and per-call usage/quota telemetry are platform-only |
| Feasibility headroom (gate) | 5/5 — **pass** | token counting is runtime bookkeeping; eval runs dev-time/CI on a flagship, sidestepping production budget; no model to train |
| Durability (gate) | 4/5 — **pass** | tooling is low-maintenance and has no model to refresh; the risk is a usage-schema contract, not the capability |
| Demand evidence (25%) | 3/5 | one measured case study, one burned-by-version-bump issue, two zero-traction OSS harnesses, strong *analogous* cloud demand; little voiced on-device |
| Install-weighted reach (15%) | 2/5 | GenAI reaches ~3.6% of devices; adoption count is published nowhere and is probably small |
| Build-vs-buy-vs-borrow (20%) | 3/5 | the harness is a weekend to borrow; the telemetry cannot be borrowed at all |
| Integration cost / TTFHW (15%) | 4/5 | one Gradle line, no new permission, usage read-out under 15 min; dataset authoring is the dev's own content |
| Substitute half-life (15%) | 3/5 | the eval half is replicable with Nano-as-judge within a year; the platform-signal half is not |
| Strategic complement (10%) | 4/5 | de-risks adoption of the *entire* GenAI portfolio and closes the Apple developer-story gap |
| **Composite** | **3.10** | Prototype band (3.0–3.9) |

*Least trustworthy row: Reach. There is no published count of apps using ML Kit GenAI anywhere (Google or third-party), so S2 rests on a device-eligibility percentage and a comparable-SDK ceiling, not on an adoption figure.*

> **Sourcing caveat, stated once.** Every research agent this run hit WebFetch DNS failures and reached `developers.google.com` / `firebase.google.com` through the WebSearch reader (which fetches and quotes the live page) rather than a direct render; Apple developer docs and GitHub were fetched directly. The ML Kit class names and the evaluate-prompt quotes below are therefore search-reader-sourced from the live pages, not screen-rendered — flagged because a skeptic should re-pull them against the live docs before building.

---

## The problem

A developer ships a summarization or prompt feature on Gemini Nano through ML Kit. Three questions then have no answer on Android.

**"Is the output still good?"** The feature's quality is set by a model the developer does not control and cannot pin. ML Kit's own guidance concedes the gap: the ["Evaluate prompt quality"](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) page is prose, not a harness — "Run your evaluation dataset and record the outputs. **Evaluate the results manually or use LLM-as-a-judge**," then "iterate on your prompt… We recommend at least **3-5 iterations**." The only automated path it offers extends cloud [Vertex AI's evaluation service](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-genai-sdk) — off-device, and a different model than the Nano the feature actually runs on. So the platform tells the developer to evaluate and ships nothing to do it with on the device where it matters.

**"How much am I spending?"** ML Kit exposes a *pre-flight* input counter — [`countTokens` → `CountTokensResponse`](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/package-summary) — but no *per-call usage* object. There is no `usageMetadata` on the on-device response with output tokens, cached tokens, or the battery/inference quota the call consumed. Developers already distrust what little exists: one reports the device returning an 8192-token input limit against docs that say under 4,000, and choosing to "trust the device's value at runtime" over the documented contract.

**"Did an update just change my feature underneath me?"** The managed path means, in the words of an OSS author who built his own harness, "The OS updates the system model, not your app." That is the structural precondition for silent drift, and it has already drawn blood: [issue #1061](https://github.com/googlesamples/mlkit/issues/1061) (Jul 16 2026) is a developer whose feature broke when beta3 "switched the requested AICore feature from 636 to 648, which no shipping AICore provides." The broad LLM world already treats this as a known failure class — when OpenAI [retired GPT-5.1 in March 2026](https://dev.to/clawgenesis/gpt-51-was-retired-on-march-11-heres-what-broke-in-your-llm-app-1eep), apps silently routed to a different model with no error. On-device is *worse*, because the developer cannot even pin a snapshot: AICore decides.

This is structural, not a transient tooling bug. A 100M-install app cannot put a generated string in front of users at a 92%-right quality bar (the brand can't ship an embarrassing output), and it cannot tune the knobs — prompt, temperature, topK are "tuned for each API" and not developer-adjustable. Robbed of the knobs, the one thing it must have is the gauge: a way to know, before users do, that quality moved. That requirement is produced by the managed-model architecture itself.

---

## Proof & signals

- **A team that measured the pain by hand.** The case study ["Less Is More: Engineering Challenges of On-Device Small Language Model Integration"](https://arxiv.org/abs/2604.24636) (arXiv:2604.24636, Apr 2026) reports "Word length violations occurred in **30–50%** of early generations," prompt-hardening getting it only to ~10–15% ("too high for production"), and the team re-architecting to let "the LLM do the least." Its five named failure categories include **model selection instability**. This is a shipped feature whose team measured a failure rate manually because nothing measured it for them. *(arXiv not directly fetchable this run; quotes via the WebSearch reader of the abstract/paper.)*
- **Developers hand-rolling the exact tool — with no traction.** [`jantursky/proctor`](https://github.com/jantursky/proctor) is an on-device eval harness for "the language models built into Android and iOS" that lets you "compare platforms, model versions, and prompt versions in one report," justified almost verbatim as our pitch: ML Kit "recommends running an evaluation dataset for each Gemini Nano version" but "gives no on-device tool for it." **4 stars.** [`john-rocky/edge-llm-bench`](https://github.com/john-rocky/edge-llm-bench) persists "release-regression verdicts" as JSON with a founding "2026-08-17 LiteRT-LM v0.15.0 → v0.16.0 regression run." **4 stars.** The need recurs; nobody has won it.
- **Someone charging money — one domain over.** Cloud LLM eval tooling is a funded, high-traction category: [promptfoo](https://github.com/promptfoo/promptfoo) (~26.8k stars, acquired by OpenAI), [OpenAI Evals](https://github.com/openai/evals) (~19.7k), [Arize Phoenix](https://github.com/Arize-ai/phoenix) (~12.1k), Braintrust (~$80M Series B, ~$800M valuation, Feb 2026), LangSmith (~$125M Series B, Oct 2025). Willingness to pay for eval is proven; it simply has not reached down to on-device mobile.
- **The absence signal, read honestly.** No developer is asking anyone to "port promptfoo to Nano." The ML Kit issue tracker's center of gravity is "does it run at all" ([#1078](https://github.com/googlesamples/mlkit/issues/1078), [#1080](https://github.com/googlesamples/mlkit/issues/1080)), upstream of "is the output good." I take the silence to mean the demand is **pre-awareness**: expressed as hand-rolled harnesses and one-off pain, not as a feature request for this exact thing. That is a real finding and it caps the demand score.

---

## Why now

1. **A capability shift.** Running an LLM-as-judge or an embedding-based score *on the device* is now cheap enough to be a dev-time/CI step: Nano does [~940 tok/s prefill on a Pixel 10 Pro](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) (Google, Aug 2025) and a judge prompt is prefill-dominated, while [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/) scores references in <200 MB RAM (Google, Sep 2025). Two years ago this was a server job.
2. **A competitive shift, dated.** At WWDC26 Apple shipped the [Evaluations framework](https://developer.apple.com/documentation/evaluations) (iOS 27) — "Define datasets, generate model responses, apply metrics," a `ModelJudgeEvaluator` that "uses a language model as a judge," Xcode regression views, and the stated purpose to "catch regressions when an underlying model changes or your prompt evolves" — plus runtime [`model.tokenCount`, `SystemLanguageModel.contextSize`, and `response.usage`](https://developer.apple.com/videos/play/wwdc2026/241) with cached and reasoning token counts (iOS 26.4). An iOS developer now gets the meter and the alarm as first-party API. An Android developer gets a prose page.
3. **A demand shift — weak, and I'll say so.** The broader ecosystem started naming model-version drift as a first-class risk in 2026 (the ["semver lie"](https://tianpan.co/blog/2026-04-29-semver-lie-llm-minor-update-breaks-production) posts, the GPT-5.1 retirement). But on-device developers are not yet voicing it at volume, and the **regulatory** leg is genuinely thin: the EU AI Act's Article 12 logging duty is traceability for *high-risk* systems, not output-quality measurement, and the Digital Omnibus has slipped high-risk deadlines to Dec 2027 / Aug 2028. Treat regulation as a soft tailwind, not a clock.

A two-of-three why-now, with the competitive leg strong and dated. That is enough to prototype, not enough to call it urgent.

---

## The capability gap

What exists across the stack, and precisely what is missing:

- **ML Kit GenAI:** pre-flight `countTokens` only; no per-call usage object; no eval harness; prose-only quality guidance ([package summary](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/package-summary), [evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)).
- **Firebase AI Logic:** a real [`UsageMetadata`](https://firebase.google.com/docs/reference/unity/struct/firebase/a-i/usage-metadata) (`promptTokenCount`, `candidatesTokenCount`, `cachedContentTokenCount`, `thoughtsTokenCount`) — but [cloud Gemini only](https://firebase.google.com/docs/ai-logic/context-caching), and Firebase's "on-device" is the Chrome Prompt API, not AICore Nano; its console "does not show any data for on-device inference."
- **AI Edge Portal:** benchmarks ["initialization time, prefill speed, decode speed, and peak memory"](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal) — performance, never output quality — on LiteRT-LM, in private preview, not the AICore path ML Kit uses.
- **MediaPipe:** `sizeInTokens` token counting, no eval.
- **Apple:** has shipped all of it (above).

The boundary, stated exactly: **Google can measure on-device GenAI quality and usage — in the cloud (Vertex), on a different runtime (AI Edge Portal / LiteRT-LM), or internally (its own LLM-rater pipeline). It exposes none of it to the developer on the AICore-managed Nano path their shipped feature actually runs on.** The main competitor a developer uses today is a hand-rolled JSON golden-set plus Nano-as-its-own-judge — or, more often, nothing.

---

## Proposed surface

An add-on library, `com.google.mlkit.genai.eval`, with three parts — sequenced by privilege, because they are not equally defensible.

**Part 1 — Per-call usage accounting (the privileged primitive, ship first).** Extend the GenAI response with a `usage` object mirroring Apple and Firebase-cloud: output token count, cached-token count, and the inference/battery quota the call consumed against the per-app ceiling. A developer cannot compute these by hand; only the platform sees them.

```kotlin
val response = model.generateContent(request)
response.usage.outputTokenCount   // post-call, not just pre-flight countTokens()
response.usage.cachedTokenCount   // was prefix caching hit?
response.usage.quotaConsumed      // against PER_APP quota before BUSY
```

**Part 2 — Model-version signal + drift callback (the Type E thread).** Expose the resolved AICore model version and feature ID the call will run against, and a callback when it changes under the app — the exact signal absent from issue #1061.

```kotlin
GenAiModelInfo.current()                 // "nano-v4 / feature-648"
GenAiModelInfo.onModelChanged { old, new -> runGoldenSet() }
```

**Part 3 — On-device eval harness (the borrowable part, prototype to learn).** Datasets, metrics, an LLM-as-judge backed by Nano itself, and reference scoring via EmbeddingGemma, runnable in `androidTest`/CI on the developer's own device so production budget is never touched.

```kotlin
val result = GenAiEvaluator(dataset)
    .metric(Metric.ModelJudge(rubric))        // Nano scores Nano
    .metric(Metric.SemanticSimilarity())      // EmbeddingGemma vs reference
    .run()
assertThat(result.passRate).isAtLeast(0.9f)
```

What it deliberately does **not** do: it does not expose the inference knobs (prompt/temperature/topK stay API-tuned), does not promise to freeze the model, and does not ship a universal quality threshold — the rubric and the pass bar are the developer's. **TTFHW target: under 15 minutes** for Parts 1–2 (read a field, register a callback, one Gradle line, no new permission). Part 3's wall-clock is dominated by the developer authoring their dataset, which is their content, not integration friction — meaning the fast win and the hard win are correctly split.

---

## Reach & sizing

Show the arithmetic; the inputs are soft and I will not hide it.

- **Device eligibility:** ~140M Nano devices (Google, Apr 2026) ÷ ~3.9B Android actives (third-party, range 3.3–4.2B) ≈ **~3.6%** (my arithmetic). API 26+ is a non-constraint (~96% per a stale apilevels/Statcounter read); Nano-capable silicon is the real gate.
- **Adopting apps:** **unknown — published nowhere.** The GenAI APIs launched mid-2025 and gate to flagship silicon, so the adopter base is almost certainly small. Honest range: **low hundreds to low thousands of apps, highly uncertain,** growing as Nano 4 ships.
- **Comparable ceiling:** even TensorFlow Lite, mature and promoted, sits at ~0.95% of apps / ~11% of installs (AppBrain, third-party). A one-year-old flagship-gated API should be assumed well under that.
- **Install-weighted reach for the GenAI wedge:** low single digits at best. This is the weak dimension.

**The sensitivity, and where it flips:** halve the already-unknown adoption and the GenAI-only product is a feature for a few hundred apps — not a platform API. The verdict only survives on the **expansion lever**: the harness is not intrinsically GenAI-only. OCR confidence, image-label scores, entity extraction, and translation are *also* evaluable and driftable, and those classic ML Kit APIs ship across effectively the whole Play-services base, not the 3.6% Nano slice. Framed as "eval + drift detection for ML Kit *outputs*," reach moves from tiny toward the TFLite-class ceiling. That reframing is the experiment the Prototype exists to settle: does anyone run evals on classic-ML-Kit output, or is this only a GenAI concern?

---

## Adoption path

1. **The hook (15 minutes):** a developer reading `response.usage` to see cached-token savings, or registering `onModelChanged` after being burned once — the Part 1–2 primitives, valuable alone and impossible to hand-roll.
2. **First real integration:** a golden-set regression test in CI that fails the build when a Nano update moves the pass rate, replacing the manual "3-5 iterations" the docs prescribe.
3. **The dependency:** once a team's quality bar is encoded as a dataset wired to the model-change callback, removing the kit means going blind on every future model refresh — a dependency they would endorse, not resent.

**First adopter:** a team already measuring quality by hand (the Palabrita archetype) or one already burned by a version bump (#1061). **Second wave:** unlocked by one reference app — ideally a Google sample — showing a GenAI feature gated behind an on-device eval in CI. If no first adopter can be named beyond "teams that hand-roll harnesses," the funnel is thin, which is consistent with the Prototype verdict.

---

## Execution plan

- **Developer preview — Parts 1 & 2 only.** Question it answers: do developers read usage/version signals when handed them, and does the model-change callback get wired to action? Partners: the handful already hand-rolling harnesses. Evidence collected: the missing S1 adoption and demand numbers.
- **Alpha/Beta — Part 3 harness.** Graduation condition: *N* preview teams run an eval in CI and at least one catches a real regression before shipping. If that condition can't be met, the harness is borrow-territory and should stay a sample, not an API.
- **GA — the usage schema and version-signal contract.** Commit to output-stability of the `usage` object and the model-info format independent of the Nano version.

**Org dependency, named honestly:** this needs AICore to expose the model-version/feature ID and the usage/quota breakdown — a different team than ML Kit. If they say no, Parts 1–2 collapse to what ML Kit can see alone, and only the borrowable Part 3 remains. That dependency is the single biggest execution risk.

---

## The case against

The strongest case is **absorption by Google's own roadmap plus a cheap borrow path (failure modes 2 and 7).** Apple shipped `response.usage` and an evaluator as small, obvious features; the natural outcome is that ML Kit quietly adds a usage field and a model-version signal in a point release and never ships a "kit" at all — at which point Google built the valuable half and this report's framing was just early. Simultaneously, the eval-harness half is genuinely borrowable: `proctor` and `edge-llm-bench` prove a solo developer clones it in a weekend, and Nano-judging-Nano is a prompt, not a platform. A narrow API against a free substitute captures a sliver — the classic G1-failure-at-eighteen-months.

The mitigation is the sequencing already in the proposal: lead with the two primitives only the platform can expose (usage, model-version signal), treat the harness as a sample that collects demand evidence rather than a committed surface, and be willing to conclude from the preview that the harness should stay OSS. What does *not* mitigate it is shipping the whole kit at once as a headline — that maximizes the maintenance surface against the most borrowable part.

A weaker but real second risk: the audience may not exist yet. If on-device GenAI stays at a few percent of devices and few apps adopt it, eval tooling for it is a tool for a market that hasn't formed. That is why this is a Prototype, not a Build.

---

## Kill criteria

**The single observation that would reverse this recommendation:** ML Kit ships a per-call `usage` object *and* a model-version signal in any release before this reaches alpha — then the privileged primitives are gone and only the borrowable harness remains, which should stay a sample. (Watch the [release notes](https://developers.google.com/ml-kit/release-notes); the most recent confirmed entry is beta5, Oct 26 2026, which added Function Calling — no eval/usage additions yet.)

**Load-bearing assumption:** that enough apps ship (or will ship) ML Kit GenAI to make tooling for it worth a committed public surface — the one number published nowhere.

**Re-check trigger if shelved:** a published ML Kit GenAI adoption figure crossing ~1% of install-weighted surface, or the expansion lever proving out (teams running evals on classic ML Kit vision/NL output).

---

## Fit for this team

ML Kit owns the AICore-managed GenAI surface developers actually ship on, so it owns the quality and cost questions about that surface — MediaPipe and AI Edge target LiteRT-LM, and Firebase targets cloud. The risk that cuts the other way: usage/eval could land in AI Edge Portal and fragment the story further. The clean division is that AI Edge Portal keeps *performance* benchmarking on LiteRT-LM and ML Kit owns *output-quality and usage* on the managed Nano path. If the team won't commit to that boundary, the more valuable conclusion is to give the usage primitive to AICore directly and let ML Kit surface it — a cleaner home than a standalone kit.

---

## Open questions

- **How many apps ship ML Kit GenAI?** Unpublished; settle it internally — it drives the whole verdict.
- **Will AICore expose the model-version/feature ID and a usage/quota breakdown?** The dependency Parts 1–2 rest on.
- **Does anyone want to eval classic ML Kit output (OCR, labels, entities)?** The expansion lever; settle it in developer preview.
- **Nano decode (not prefill) tok/s and RAM footprint?** Google published prefill speed only; decode bounds any long LLM-as-judge verdict.
- **Is the on-device drift fear real at volume, or only in the cloud world?** One issue (#1061) is not a trend; the preview would show whether it generalizes.

---

## Runners-up

- **E. Model-delivery & availability state-machine contract** — the strongest *raw* demand in the whole space (the clearest developer-voiced pain in the ML Kit issue tracker, e.g. silent model-download failures). Lost because it is the reader's known backlog, not an idea they wouldn't reach alone — and it overlaps the drift thread folded into this proposal.
- **G. On-device content-moderation classifier for user content** — strong platform privilege and a Play-policy forcing function (apps accountable for output). Lost on the tunability objection: a one-size classifier dies on contact with each app's own T&S policy, and it needs a dedicated run of its own to do justice to the liability architecture.
- **A. On-device neural TTS / the missing audio stack** (diarization, wake word, VAD, speaker ID) — genuine whitespace and the strongest single demand signal (Picovoice charges real money for all of it). Lost on Platform Privilege: OSS models (Piper, Kokoro) and a Gradle-dependency vendor already serve it, so "why us" is contestable.
- **C. The capability-detection-and-fallback one-liner** — every integrator hand-writes the same `checkFeatureStatus` → downloading → BUSY/quota → fallback block. A strong, cheap DX idea; lost only on leverage versus the eval idea this run, and a natural companion to it.
- **F. GenAI graceful-degradation tiering** (write once; Nano → classic ML Kit → heuristic across the fleet) — addresses the defining 26× reach gap. Lost because the honest version is a feasibility essay (what quality survives at each tier) and because Firebase AI Logic's hybrid modes already occupy the adjacent cloud-fallback ground.

---

*Sources:*
- [ML Kit "Evaluate prompt quality"](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)
- [ML Kit GenAI Prompt API package summary (CountTokensResponse, GenerateContentResponse)](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/package-summary)
- [ML Kit Prompt API get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai)
- [ML Kit samples issue #1061 (beta3 AICore feature-ID regression)](https://github.com/googlesamples/mlkit/issues/1061)
- [ML Kit samples issues #1078](https://github.com/googlesamples/mlkit/issues/1078), [#1080](https://github.com/googlesamples/mlkit/issues/1080)
- [Apple Evaluations framework](https://developer.apple.com/documentation/evaluations)
- [Apple generative-models technology overview](https://developer.apple.com/documentation/technologyoverviews/generative-models)
- [WWDC26 session 241 (token counting, contextSize, response.usage)](https://developer.apple.com/videos/play/wwdc2026/241)
- [Firebase AI Logic UsageMetadata](https://firebase.google.com/docs/reference/unity/struct/firebase/a-i/usage-metadata)
- [Firebase AI Logic context caching (cloud-only)](https://firebase.google.com/docs/ai-logic/context-caching)
- [Firebase AI Logic hybrid on-device inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference)
- [AI Edge Portal benchmarking blog (May 20 2026)](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)
- [Vertex AI GenAI evaluation service](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-genai-sdk)
- [Android Developers Blog — latest Gemini Nano with ML Kit GenAI (Aug 2025)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)
- [Google Developers Blog — Introducing EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/)
- ["Less Is More" on-device SLM case study (arXiv:2604.24636)](https://arxiv.org/abs/2604.24636)
- [jantursky/proctor](https://github.com/jantursky/proctor) · [john-rocky/edge-llm-bench](https://github.com/john-rocky/edge-llm-bench)
- [promptfoo](https://github.com/promptfoo/promptfoo) · [OpenAI Evals](https://github.com/openai/evals) · [Arize Phoenix](https://github.com/Arize-ai/phoenix)
- ["The Semver Lie" — minor LLM update breaks production](https://tianpan.co/blog/2026-04-29-semver-lie-llm-minor-update-breaks-production) · [GPT-5.1 retirement](https://dev.to/clawgenesis/gpt-51-was-retired-on-march-11-heres-what-broke-in-your-llm-app-1eep)
