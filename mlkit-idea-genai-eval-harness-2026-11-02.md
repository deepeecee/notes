# GenAI Evals for ML Kit — a prompt-regression harness for the model that updates underneath you

**Type:** D (Tooling) · **Verdict:** Prototype / developer-preview · **Opportunity: 7/10 (timely, reach-capped)**
*2026-11-02 · Prepared for Android ML Kit · Evidence current as of 2026-11-02*

> On October 7, 2026 a team running the ML Kit Prompt API in production watched their feature's availability fall from 8.7% of users to 0.6% after a beta bump silently re-pointed the SDK at an AICore model version no shipping device had. Their fix was to pin back to the old version and wait. They had no way to see the regression coming, because ML Kit ships no way to evaluate on-device output or to detect when the managed Gemini Nano model changes under their app. Apple shipped exactly that this June. This is the tooling that closes the gap — and the single number that caps it is that Nano runs on ~3.7% of Android.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — timely, reach-capped | composite 3.7 ×2 = 7.4, −1 for a gate at exactly 3 (durability), +1 for S1=5 → 7.4 → **7** |
| Platform privilege (gate) | 4/5 — pass | Only the platform can expose a model-version/update signal and ride the AI Edge device farm; the eval loop itself is partly borrowable ([#1061](https://github.com/googlesamples/mlkit/issues/1061)) |
| Feasibility headroom (gate) | 5/5 — pass | Primitives already exist: `countTokens`, `getBaseModelName()`, typed Structured Output, temp/topK/maxOutputTokens; no model to train ([Prompt API docs](https://developers.google.com/ml-kit/genai/prompt/android)) |
| Durability (gate) | 3/5 — pass (flagged) | Eval tooling is low-maintenance, but an *output-stability contract* is a 5-year promise, and AI Edge Portal is a sign-up-closed private preview |
| Demand evidence (25%) | 5/5 | Apple [WWDC26 #8016](https://developer.apple.com/videos/play/wwdc2026/8016/) dev Q&A, Google's own "hours if not days" ([AI Edge Portal blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)), ML Kit [#1061](https://github.com/googlesamples/mlkit/issues/1061)/[#1070](https://github.com/googlesamples/mlkit/issues/1070)/[#1072](https://github.com/googlesamples/mlkit/issues/1072) |
| Install-weighted reach (15%) | 2/5 | SOM ~100–1,500 apps over 3 yr, hard-capped by Nano's ~3.7% device reach, not by minSdk-26 (~96%) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The measurement loop is borrowable (promptfoo patterns + Kotlin); the version-drift signal and device matrix are not |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line + a dataset; a first eval run in an afternoon, but authoring a meaningful dataset is inherent work |
| Substitute half-life (15%) | 3/5 | 2–3 yr: Google's own cloud APO/Vertex path or a built-in Prompt-API self-check could absorb it |
| Strategic complement (10%) | 5/5 | Free, easy eval directly de-risks shipping on Nano — the fear of embarrassing output is what keeps big apps off it |
| **Composite** | **3.7** | Prototype/developer-preview band (3.0–3.9) |

*Least trustworthy row: install-weighted reach. The AppBrain/42matters adoption tables were network-blocked this run, so the app-count inputs are labeled estimates, and there is no published count of apps shipping ML Kit GenAI at all.*

---

## The problem

A large consumer Android app that adopts ML Kit GenAI is building on a model it does not control and cannot see change. AICore "manages the distribution of Gemini Nano and handles future updates" ([Android docs](https://developer.android.com/ai/gemini-nano)); the app gets a model that silently moves from nano-v2 to v3 to v4 beneath a frozen prompt. The job the developer has is not "call the model" — it is "ship a generative feature to 100M users and be confident it won't embarrass the brand, this release *and* next month after a model refresh I didn't trigger." Today they do that job blind.

Two structural facts produce this. First, **the brand can't ship an embarrassing output**, so the quality bar for user-facing generation sits far above any benchmark number — and a stochastic model crossing that bar is not something a unit test can assert. Second, **the app's ML org is server-side**: they know cloud eval harnesses (promptfoo, LLM-as-judge, regression datasets) but have no on-device equivalent and no one fluent in both evaluation and Android runtime behavior. So the eval discipline they already practice in the cloud has no landing surface on the device.

What they do *instead* today is hand-roll a validation-and-retry layer and hope. The "Less Is More" case study of a production Android game on Gemma 4 E2B concludes, as its design rule, that **"the most reliable on-device LLM feature is one where the LLM does the least"** — arrived at after a taxonomy of output-format violations, constraint violations, context-quality degradation, latency incompatibility, and model-selection instability ([arXiv 2604.24636](https://arxiv.org/abs/2604.24636), Apr 2026). The workaround is to shrink the model's role until failures stop mattering. That is the status quo your API is priced against, and it is a tax on the whole premise of on-device GenAI.

This is a platform problem, not an app problem, because every app would build the same harness identically and badly, and only the platform owns the one input the harness most needs: the lifecycle of the managed model itself. An app can measure its own output; it cannot be told the model changed, because no one exposes that.

---

## Proof & signals

- **A developer asks the platform owner for exactly this, on stage.** Apple WWDC26 session 8016, developer "Robin": *"Apple updates the on device and PCC model silently and tune[d] prompts regress when that happens. Is there a model version identifier exposed at runtime? So my evaluation suite can detect a model change and gate releases on it."* Apple's answer concedes there is no such API and routes to evals: *"assume that these models will update over time… with evaluations, you sort of gain back that control… It should be part of your test suite."* ([transcript](https://developer.apple.com/videos/play/wwdc2026/8016/), Jun 2026 — **verified verbatim against the live page, 2026-11-02**). This is the thesis in a developer's own words, semi-conceded by a platform owner.
- **Google concedes the root-causing cost in its own words.** *"When an LLM performs poorly, finding the root cause… is a daunting task… tedious and time-consuming searching that can take hours if not days."* ([Google Cloud AI Edge Portal blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal), May 20, 2026).
- **Silent version churn is already breaking shipped ML Kit features.** Issue [#1061](https://github.com/googlesamples/mlkit/issues/1061): `genai-prompt` beta3's default config silently requested AICore feature 648 — "no shipping AICore provides" it — throwing `FEATURE_NOT_FOUND`. A production team (Oct 7, 2026): availability fell from **8.7% (beta2) to 1.4%/0.9%/0.6% (beta4)**, Galaxy S26 nano-v3 devices "dropped to near zero," and *"rolling back to beta2 is the only option we found."* Another dev committed "Pin genai-prompt to 1.0.0-beta2." **Verified against the live issue, 2026-11-02.** No maintainer reply on the thread.
- **Developers misread silent failures as model breakage.** Issue [#1070](https://github.com/googlesamples/mlkit/issues/1070): an undocumented per-app quota throws `BUSY` after ~36–41 generations; the reporter: *"Developers will misread mass BUSY failures as model or device breakage (we initially did)."*
- **Fluent, dangerous, silent regressions.** Issue [#1072](https://github.com/googlesamples/mlkit/issues/1072): on-device Translate renders a Tagalog phrase meaning "keep the children away" as *"Kill the children"* — reporter notes *"the output is fluent and grammatical, which makes it more dangerous than gibberish would be."* The exact class of failure only a systematic eval catches.
- **Someone is charging / acquiring.** Prompt-eval is a funded discipline: Promptfoo (~10.8k stars) was **acquired by OpenAI (~Mar 2026)**; DeepEval (~19k stars) and Ragas (~14k stars) are actively developed. All are cloud/host-side Python tools — none run on-device against Nano, which is the gap. *(Star counts are secondary, approximate.)*
- **The absence signal.** There is no published count of apps shipping ML Kit GenAI, and the GitHub issue volume is small. I read the small volume as *early adoption*, not low pain — the complaints that exist are from production teams, dated in the last four months, and unanswered.

---

## Why now

1. **Capability shift (mid-2026).** The primitives to build eval landed: Structured Output shipped Alpha (Jul 2026), joining `countTokens`, `getBaseModelName()`, and exposed generation params — so schema-validity and version-reads are measurable today ([release notes](https://developers.google.com/ml-kit/release-notes)). *Snapshot check: the Aug-2026 landscape listed these; still current.*
2. **Competitive + regulatory shift (Jun–Jul 2026).** Apple shipped an actual `Evaluations` Swift framework (WWDC26 [#298](https://developer.apple.com/videos/play/wwdc2026/298), confirmed live) plus `tokenCount(for:)`, `contextSize`, and a per-response `usage` object reporting cached and reasoning tokens ([#241](https://developer.apple.com/videos/play/wwdc2026/241)). Separately, the EU DMA decision (Jul 2026) requires Alphabet to expose system-level on-device AI model capabilities to third parties by **Aug 1, 2027** — a version/stability contract sits squarely in that scope.
3. **Demand shift (Aug–Oct 2026).** Teams are now actually shipping ML Kit GenAI and hitting silent regressions in production (#1061/#1070/#1072), while the cloud eval discipline matured enough for OpenAI to buy Promptfoo (Mar 2026). The practice exists; the on-device surface for it doesn't.

This is a rare three-for-three why-now, and the Aug-2027 DMA date gives it a genuine clock.

---

## The capability gap

What exists, and precisely what's missing:

- **Google ML Kit / AICore:** reads the model version (`getBaseModelName()`), estimates *input* tokens (`countTokens`) — but exposes **no per-response usage object** (no output/cached/reasoning counts), **no update notification, changelog, deprecation policy, or output-stability contract**, and **no eval/regression harness**. Google's current eval answer is cloud-side: Automated Prompt Optimization runs on Vertex ([blog](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html), Jan 2026). *Caveat: `developers.google.com` was unreachable from this session, so the ML Kit negatives rest on the Aug-2026 landscape snapshot plus search snippets, not a live fetch — a reviewer with network access should open the GenAI docs tree to confirm no "Evaluate prompt quality" harness page has since shipped.*
- **Google AI Edge Portal:** benchmarks init time, latency, peak memory across 100+ physical devices — **perf only, not output quality** — and its private preview is reportedly sign-up-closed ([blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **MediaPipe / LiteRT-LM / Firebase AI Logic:** LiteRT-LM's CLI does interactive prompt *serving/testing*, not dataset eval or cross-version regression; no on-device usage accounting found.
- **Qualcomm AI Hub:** numerical-accuracy checks against a PyTorch reference — classical-ML correctness, not GenAI quality/judge grading.
- **Apple Foundation Models:** shipped the whole thing — `Evaluations` framework (dataset-based scoring, heuristic + `ModelJudgeEvaluator` LLM-as-judge, Swift Testing thresholds), token counting, usage reporting, and explicit guidance to *"test your prompts with the new model"* on OS update.

**Main competitor:** not another platform — it's the developer's own hand-rolled validation-and-retry layer, plus cloud eval tools (promptfoo) that can't see the on-device model. On the device, ML Kit's competitor is *nothing*.

One honest distinction that strengthens the Android case: Apple's *on-device* model changes only with an OS update, so OS version is a usable change-signal there. On Android, **AICore updates Nano independently of the OS**, so Android developers can't even use OS version as a proxy — the silent-update problem is strictly worse here than the one Apple just tooled around.

---

## Proposed surface

A tooling layer, delivered in two halves a developer can adopt independently.

**(1) An on-device eval library** — `com.google.mlkit:genai-evals`:

```kotlin
val suite = GenAiEvalSuite.builder()
    .dataset(EvalDataset.fromAssets("prompts.jsonl"))   // {prompt, expected?} samples
    .metric(SchemaValidity(MySummary::class))            // free with Structured Output
    .metric(LengthBudget(maxWords = 60))
    .metric(LanguageMatch(expected = Locale.JAPANESE))
    .judge(OnDeviceJudge(scale = 1..5))                  // Prompt API as grader, terse verdict
    .build()

val report = suite.run(promptApi)       // aggregate pass-rate, per-metric, per-device
report.assertMeanAtLeast(0.8)           // gates a release in CI / instrumented test
```

- **What it measures:** schema validity (free — a typed Structured Output deserialization either succeeds or fails), length/language/constraint budgets, and an LLM-as-judge score using the on-device Prompt API itself as grader. Feasibility nuance from research: judges must emit **terse structured verdicts** — prefill runs ~940 tok/s on a Pixel 10 Pro but decode is ~11 tok/s, so a chain-of-thought judge would be too slow; a `{score, pass}` verdict is fine.
- **What it reports:** pass-rate with mean/variance, per-metric breakdown, and **token/usage accounting** — filling the gap by pre-counting input via `countTokens` and estimating output tokens on the returned text until a real usage object exists.
- **What it deliberately does *not* do:** it does not train or fine-tune, does not define "quality" for you (you bring the dataset and thresholds), and does not grade subjective tone beyond what your judge prompt specifies.

**(2) A model-drift signal** — the privileged half, requiring AICore cooperation: a `ModelVersionMonitor` that surfaces `getBaseModelName()` changes and, ideally, an AICore callback when the managed model updates — so the harness can **auto-re-run the suite on model change and gate the next release**, which is precisely what the WWDC26 developer asked Apple for. Where AICore won't expose a push signal, the library polls and detects drift itself.

**TTFHW target: < 20 minutes** to a first eval report on an emulator — one Gradle line, a 10-sample JSONL dataset, three built-in metrics, no console project, no new permission. The inherent cost that keeps it above 15 minutes is authoring a meaningful dataset; the design answer is shipping a starter dataset per GenAI API (summarization, rewriting) so the first run needs zero authoring.

---

## Reach & sizing

All arithmetic mine, on labeled inputs; the AppBrain/42matters tables were network-blocked, so app-count inputs are estimates.

| Input | Value | Provenance |
|---|---|---|
| Target-category apps ≥50K installs | 50k–80k | my estimate (AppBrain table unreachable) |
| Fraction plausibly needing GenAI eval | 10–25% | my estimate |
| Dev-tool / eval attach rate | 2–8% | my estimate, anchored to "eval is predominantly manual" survey signal |
| minSdk-26 device reach | ~96% | [apilevels.com](https://apilevels.com/), third-party |
| Gemini Nano device reach | ~3.7% (140M ÷ ~3.8B) | 140M Google-published (Apr 2026); denominator third-party; % mine |
| ML Kit install-weighting | ~1.54× | 42matters 17.83% installs ÷ 11.55% apps (third-party, via search) |

- **SAM (apps)** = (50–80k) × (10–25%) ≈ **5,000–20,000 apps**
- **SOM @ 3 yr** = × (2–8% attach) ≈ **100–1,500 apps** (midpoint a few hundred)
- **Binding constraint:** the device-gated GenAI APIs run on ~3.7% of the fleet, so the real GenAI-adopting base — and therefore the harness's — is capped well below the minSdk-26 ceiling. Top-down and bottom-up both land at **low hundreds of apps**.
- **Engineering cost avoided** = SOM × (E_diy − E_int). E_diy for a hand-rolled harness ≈ 4–8 eng-weeks + maintenance; E_int ≈ 1 week; delta ≈ 3–7 weeks. At a few hundred apps, aggregate avoided cost is **modest** — this does not clear the platform test on cost alone. The case rests on S6 (de-risking adoption), not on engineer-weeks saved.
- **Sensitivity:** halve the two softest inputs (fraction-needing-eval and attach rate) → SOM ~25–375 apps. "Meaningful as a niche" survives; "broad market" does not under any branch. The verdict is robust in direction (small) and fragile in magnitude.

The honest reading: direct reach is small and the harness's fortunes are tied to Nano's device-reach trajectory, which is the single most uncertain input.

---

## Adoption path

1. **The hook:** a developer adds one Gradle line, points the library at the starter dataset for the API they already use, and gets a per-device pass-rate report in under 20 minutes — the first time they can *see* their feature's quality instead of guessing.
2. **First real integration:** they wire `assertMeanAtLeast()` into an instrumented test and gate their release on it, replacing the manual eyeballing that the "Less Is More" team described.
3. **The dependency:** once the drift monitor has caught one silent model update before it shipped, removing the harness means re-accepting blind exposure to the next Nano refresh — a cost they'd endorse, not resent.

**First adopters:** the production teams already filing #1061/#1070/#1072 — they have the pain and the dataset. **Second wave:** unlocked by one reference app (an Envision-class accessibility app, or a Google sample) publicly gating a release on evals, which turns "nice to have" into "the way you ship GenAI on Android."

---

## Execution plan

- **Developer preview:** ship the eval *library* only (no AICore dependency), with starter datasets. Question it answers: *do the production teams already in pain adopt it, and does it change their release process?* That is the S2/adoption evidence this report is thinnest on.
- **Alpha/Beta:** add the drift monitor. Graduation condition: a named partner catches a real pre-ship regression using it, and AICore commits to a version/update signal.
- **GA:** freeze the metric/judge API and publish an **output-stability + version-signal contract** — the durable, privileged surface. Commit the eval schema versioned independently of the model.

**Org dependencies, honestly:** the device-matrix half needs the **AI Edge Portal team** (it owns the farm); the drift signal needs the **AICore team** (it owns the model lifecycle). ML Kit owns the developer-facing API and the Prompt-API-as-judge path, but cannot deliver halves (2)-farm without them. If AICore won't expose an update signal, the harness degrades to polling `getBaseModelName()` — weaker, but still shippable.

---

## The case against

The strongest case against is **self-absorption: Google eats this with its own stack before it matters** (failure mode #2). Google's current eval answer is already cloud-side APO on Vertex; the Prompt API could add a built-in self-check; Firebase AI Logic could fold eval into its hybrid path. If any of those ships first, a separate ML Kit eval SDK is redundant on arrival. This is the live risk, and it is real because the primitives are easy — the same reason feasibility is a 5 is the reason a competitor-of-one inside Google could ship it in a quarter.

The secondary risk is **the API outran the hardware** (#1): the addressable base is capped at Nano's ~3.7% reach, so even perfect execution reaches low hundreds of apps for three years. The mitigation is that eval is a *complement that grows the base it depends on* — the fear of silent regression is itself a reason big apps stay off Nano, so lowering it should expand GenAI adoption, not just serve today's tiny cohort. But that is a bet on a second-order effect, and a skeptic is right to discount it.

Mitigations, after the argument: ship the library half first with no cross-team dependency (de-risks the org problem), and tie GA to the DMA date (de-risks the "not urgent" read). Neither mitigation touches the self-absorption risk, which is why the verdict is Prototype, not Build — you preview it precisely to find out whether Google's own stack renders it moot first.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if Google ships an on-device eval or per-response token-usage API inside the ML Kit Prompt API, Firebase AI Logic, or an expanded AI Edge Portal **before developer preview** — then this is already done; build nothing and redirect to documenting it. (Checkable against ML Kit release notes each sprint.)

**Load-bearing assumption:** that GenAI adoption on Android grows — that Nano device reach climbs meaningfully above ~3.7% through 2027 — so the eval base becomes more than low hundreds of apps. If Nano reach stalls, keep this a codelab and sample, not a GA SDK.

**Re-check trigger if shelved:** Nano reach crossing ~10% of the fleet, or the EU DMA Aug-2027 implementation forcing a version/stability contract Google must expose anyway.

---

## Fit for this team

ML Kit is the right owner of the **developer-facing eval API and the Prompt-API-as-judge path**, because it is the sanctioned front door to AICore/Nano and the surface these developers already call. But two halves sit elsewhere: the **device matrix** belongs to AI Edge Portal, and the **model-update signal** belongs to AICore. The genuine risk is that eval lands in the wrong part of the stack and fragments the story further — if the org can't get AICore and AI Edge to cooperate, the honest conclusion is that **AI Edge Portal** (which already owns the device farm and the "benchmark on-device" brand) is the better home, with ML Kit contributing only the Prompt-API judge. That is a more useful conclusion than a territorial claim ML Kit can't fulfill alone.

---

## Open questions

- **Does a live ML Kit "Evaluate prompt quality" page already exist, and does it only link to Vertex?** Unresolved — `developers.google.com` was unreachable this run. Settle by opening the GenAI docs tree from an allowed network.
- **What is the real count of apps shipping ML Kit GenAI?** No published figure exists; the whole S2 estimate hinges on it. Settle via the Play SDK Index (renders only in a browser) or a Google-internal telemetry pull.
- **Will AICore expose a model-update callback to third parties?** Determines whether the drift monitor is push or poll, and whether the privileged half is real. Settle with the AICore team.
- **Exact on-device failure rates** (the 30–50% constraint-violation figure) — the arXiv source was blocked; confirm against [2604.24636](https://arxiv.org/abs/2604.24636) once reachable.

---

## Runners-up

- **Standalone safety/moderation classifier (Type G):** strong demand (Bumble open-sourced one; Play policy makes devs liable) and a real DMA/age-assurance clock — lost because safety is each company's proprietary policy surface, so a one-size classifier risks being unusable without heavy tunability work; a better standalone report once the tunability question is scoped.
- **Deferred/opportunistic inference scheduler (Type E):** maximum platform privilege (only the OS can schedule inference under thermal/battery/quota budgets) — lost on demand evidence: the pain (P5/P15) is real but invisible and under-voiced, so S1 would be a 3, not a 5.
- **Sub-8GB GenAI reach tier (Type F):** directly attacks the 3.7% cap that limits *this* idea — lost this run on feasibility honesty: quality at the low tier can't be asserted without benchmarks the blocked sources wouldn't yield; deserves its own feasibility-first run.
- **On-device neural TTS (Type A):** clean whitespace (Google ships nothing; Picovoice sells Orca; Apple added speech generation) — lost because it's a model-shipping bet with a hard feasibility gate, a different and larger commitment than tooling; strong candidate for a dedicated Type A report.

---

*Sources: [ML Kit Prompt API](https://developers.google.com/ml-kit/genai/prompt/android) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Android AICore/Gemini Nano](https://developer.android.com/ai/gemini-nano) · [ML Kit issue #1061](https://github.com/googlesamples/mlkit/issues/1061) · [#1070](https://github.com/googlesamples/mlkit/issues/1070) · [#1072](https://github.com/googlesamples/mlkit/issues/1072) · [Google Cloud — AI Edge Portal](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal) · [Automated Prompt Optimization](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html) · [Gemini Nano throughput](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · [Apple WWDC26 #8016 Q&A](https://developer.apple.com/videos/play/wwdc2026/8016/) · [Apple WWDC26 #298 Evaluations](https://developer.apple.com/videos/play/wwdc2026/298) · [Apple WWDC26 #241 Foundation Models](https://developer.apple.com/videos/play/wwdc2026/241) · [Apple FM updates](https://developer.apple.com/documentation/updates/foundationmodels) · ["Less Is More" arXiv 2604.24636](https://arxiv.org/abs/2604.24636) · [apilevels.com](https://apilevels.com/) · [42matters developer-tools SDKs](https://data.42matters.com/sdk-analysis/top-developer-tools-sdks)*
