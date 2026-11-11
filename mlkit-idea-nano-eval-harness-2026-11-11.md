# ML Kit Evals — a regression harness for the model Google keeps changing underneath you

**Type:** D (Tooling), with a Type E (lifecycle) spine · **Verdict:** Prototype / developer-preview · **Opportunity: 5/10 (reach-gated)**
*2026-11-11 · Prepared for Android ML Kit · Evidence current as of 2026-11-11*

> A developer at a note-taking app shipped a Nano-backed "summarize" button in March against nano-v3. In October a Pixel owner updated, AICore quietly moved them toward nano-v4, and the summaries started dropping the last bullet — a one-star review, not a crash, not a log line. The developer has no way to have caught it: ML Kit's own advice is to "run your evaluation dataset on each Gemini Nano version" by hand, and ships no tool to do it. Across 2024–2026 the managed model went v2→v3→v4; the app's prompt is frozen and the model is not.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — reach-gated | composite 3.05 × 2 = 6.1, −1 for two gates at exactly 3; lands at "build the preview, not the product" |
| Platform privilege (gate) | 3/5 — pass (borderline) | The eval *runner* is 3P-buildable (promptfoo exists); the *model-refresh signal* + token accounting are platform-only |
| Feasibility headroom (gate) | 4/5 — pass | Every primitive already ships: `getBaseModelName()`, `countTokens()`, structured-output constraint errors ([ML Kit select-model](https://developers.google.com/ml-kit/genai/prompt/android/select-model)) |
| Durability (gate) | 3/5 — pass | Measurement tool needs no frozen-model guarantee; org charter + Google-absorbs-it is the risk |
| Demand evidence (25%) | 4/5 | On-device Android case study + live tracker regression + ~83k OSS eval stars + Apple shipped it; on-device-*specific* subset thinner than eval-in-general |
| Install-weighted reach (15%) | 2/5 | ~0.05–0.5% install-weighted; gated by ~3.7% Nano device base, not by demand |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Borrow path is real — a golden-set + CI runner is a few weeks; platform-refresh-aware part is where the delta sits |
| Integration cost / TTFHW (15%) | 3/5 | Needs a Nano-capable test device + CI wiring + authored golden set — an afternoon, not 15 minutes |
| Substitute half-life (15%) | 2/5 | Google is actively extending the Prompt API; this is a natural next feature it could fold in and commoditize |
| Strategic complement (10%) | 4/5 | Measurement makes every GenAI API safer to adopt; attacks the "afraid to change it" tax on the whole portfolio |
| **Composite** | **3.05** | Prototype band (3.0–3.9): developer-preview to collect the S1/S2 evidence the decision actually needs |

*Least trustworthy row: install-weighted reach (S2). It rests on an estimated Nano-GenAI-shipping app population because Google publishes no ML Kit GenAI adoption count and the Android RAM distribution that sets real device reach is unpublished anywhere found.*

---

## The problem

A large consumer Android app that ships a Gemini-Nano feature operates under a constraint a cloud app never faces: **the model is managed and mutable, and the developer doesn't own the update.** AICore delivers Nano, applies LoRA and safety filters, and refreshes the base model on its own cadence — nano-v2 (developer access Oct 2024), nano-v3 (Pixel 10 launch, Aug 2025), nano-v4 (early access via the AICore Developer Preview, previewed Apr 2026). The same physical phone can be re-pointed to a newer base model by a system update. ML Kit exposes a `getBaseModelName()` read and a coarse **Stable / Preview** stage dial, but — confirmed by absence across the select-model, overview, and release-notes pages — **no output-stability contract**: "Stable" is defined as "the latest model version that is on consumer devices," so when v3 promotes to v4, a Stable-pinned app's outputs can move underneath it.

Now layer the structural facts of a 100M-install app. The brand cannot ship an embarrassing output, so a silent quality regression is a production incident, not a metric blip. The org is server-side — its ML people live in offline batch ranking, its Android people aren't ML people — so the team has no eval muscle and no habit of golden-set regression testing for generation. And generation is non-deterministic: the same input yields different outputs, so ordinary unit tests don't apply. The predictable result is the one every honest on-device practitioner describes: teams become **afraid to touch the prompt, and afraid of the platform touching the model.** A capability you ship without a way to measure it becomes a capability you're scared to change — and here the platform changes it for you.

What do they do instead today? Three workarounds, all bad. Most **eyeball it** — ship, watch reviews, react. Some keep **a spreadsheet of inputs, expected outputs, and manual pass/fail grades** (the literal practice described in HN prompt-testing threads). A sophisticated few wire up **promptfoo or DeepEval in CI** — desktop/Node/Python tools that were never built to drive the on-device managed model or to key a regression to an AICore model-version transition. The cost of each workaround is the price of your tool. This is a platform problem, not an app problem, because every app faces the *identical* version-transition surface and solves it identically and badly — and only the platform can see when the managed model actually changed.

---

## Proof & signals

- **A developer doing it by hand, on-device, on Android — the hero artifact.** *"Less Is More: Engineering Challenges of On-Device Small Language Model Integration in a Mobile Application"* ([arXiv:2604.24636](https://arxiv.org/abs/2604.24636), cs.SE, Apr 2026, rev. May 2026) is a longitudinal case study of a production Android game integrating an on-device ~1B SLM. It names five failure categories — output-format violations, constraint violations, context-quality degradation, latency incompatibility, and **model-selection instability** — and reports word-length constraint violations in **30–50% of early generations**, JSON wrapped in markdown fences, keys translated into the output language, and repetition after ~5 generations. Its conclusion, quoted identically across sources: *"the most reliable on-device LLM feature is one where the LLM does the least."* Evidence status: **confirmed** (arXiv page verified). Nuance worth stating: the team used **LiteRT-LM**, i.e. a developer who *left* the managed path — the failure modes are exactly what a harness exists to catch, and their flight from the managed path is itself a signal.
- **A live, silent regression in ML Kit's own tracker.** [googlesamples/mlkit issue #1061](https://github.com/googlesamples/mlkit/issues/1061) (Jul 2026): *"1.0.0-beta3 regression: default ModelConfig switched the requested AICore feature from 636 to 648"* — a `genai-prompt` library update silently changed which AICore feature was requested, breaking `checkStatus()` (606 `FEATURE_NOT_FOUND`) on a Pixel 10 where beta1/beta2 worked, with a release note that listed a date and no description. Evidence status: **confirmed verbatim.** Precise reading: this is a *library-side* behavior change, not a model-version change — but it is the same class of pain (something changed across an update, invisibly, and the developer had no gate to catch it). Adjacent in the same tracker: [#1072](https://github.com/googlesamples/mlkit/issues/1072), on-device Translate rendering a phrase as *"Kill the children"* — an output blowup with no quality gate to catch it.
- **Someone charging money for it.** The eval market is monetized: Openlayer sells *"CI/CD evaluation gates: block merges when models fail,"* alongside Statsig, PromptLayer, Latitude, and testRigor. None is on-device/Android-specific. Willingness to pay for the general job is established; the on-device niche is vacated.
- **Developers invest real effort in eval tooling (general demand, proven).** OSS stars observed 2026-11-11: **promptfoo 27.1k, DeepEval 19.4k, Ragas 16.3k, lm-evaluation-harness 14.5k, Giskard 5.9k** — ~83k across five actively maintained repos. **None targets on-device/mobile managed models.**
- **A competitor productized exactly this job.** Apple shipped a first-party **Evaluations framework** at WWDC26 for its on-device Foundation Model — `ModelSample`, synthetic dataset expansion, `ModelJudgeEvaluator` (LLM-as-judge), metric aggregation, Swift Testing + Xcode integration — plus **token-counting APIs** for its on-device window. (Session id differs across sources, 298 vs 241 — treat the number as [unverified]; the framework's existence is confirmed from the developer.apple.com session page.) A rival building first-party on-device eval *and* token accounting is the strongest "the job is real" signal available.
- **Peer-reviewed quantification that managed updates silently break prompts.** *"(Why) Is My Prompt Getting Worse?"* ([arXiv:2311.11123](https://arxiv.org/abs/2311.11123), CAIN 2024): a model update caused a major accuracy drop and *"the good choices for prompts change when the LLM changes."* *"What Aggregate Scores Miss"* (arXiv:2608.17719): **58.8%** of prompt+model combinations lost accuracy across API updates, single-draw eval missed 42% of reliably-changed items. These argue for golden-set + repeated-sampling regression testing — the harness's core loop. Evidence status: third-party, via search summaries.
- **The absence signal.** There is no open ML Kit issue *asking* for a GenAI quality/drift test tool. Read two ways: the managed path's GenAI population is still small (sizing agrees), and/or teams don't yet know to ask for measurement they've never had. Silence here is weak evidence, and I'm treating it as such.

---

## Why now

1. **Capability shift — the model cadence became real and fast.** v2→v3→v4 across ~24 months, with v4 (Gemma-4-based) now in early access and landing on new flagships later in 2026 — so a v3→v4 refresh is *actively rolling* while apps hold fixed prompts. Before three shipping versions existed, drift was hypothetical; it isn't now.
2. **Competitive shift, with a date — Apple shipped it (WWDC26, Jun 2026).** Apple's on-device model now has a first-party eval framework and token accounting. On the single axis of "can a developer measure their on-device AI feature and catch a regression," Apple is ahead on its own platform. That's a concrete, dated competitive gap on Google's turf.
3. **Demand shift — the Prompt API matured enough to be worth protecting.** Structured Output (Alpha), System Instructions, Thinking Mode, and a raised 4096-token output ceiling all landed by mid-2026, so apps are now shipping *structured, load-bearing* Nano output — the kind whose regressions matter and are machine-checkable. Measurement becomes valuable exactly when the output stops being a toy.

All three carry dates. The why-now is strong, which is itself a reason to move on the *preview* now rather than wait.

---

## The capability gap

Checked, with the page read for each negative:

- **Google ML Kit** — ships **prose only.** The [Evaluate prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) guide prescribes "develop a comprehensive set of inputs and expected outputs," "run your evaluation dataset… Evaluate the results manually or use LLM-as-a-judge," iterate 3–5×, and points to a data-driven optimizer (targets on-device models such as `gemma-3n-e4b-it`) and out to Vertex AI's cloud eval. **No runnable harness, no scorer, no regression detector, no on-device token accounting.** Prescribing a workflow and shipping nothing to run it is a sharper gap than silence.
- **Google AI Edge Portal** — cloud device-farm benchmarking across 100+ real devices, but **latency/memory/OOM only, never output quality** ([ai-edge-portal](https://developers.google.com/edge/ai-edge-portal)). It can tell you the model got slower, never that it got *wrong*.
- **Google Vertex / Firebase** — a real Gen AI evaluation service, but **100% cloud**; its docs never touch the on-device Nano model. Firebase hybrid inference routes between on-device and cloud but adds no eval layer.
- **Apple Foundation Models** — ships the closest thing to this and runs on-device (see Proof). **But even Apple does not auto-detect a managed-model-version change** (you rerun suites and compare via free-text notes) and does **no token accounting tied to the harness.** The one sharp capability nobody ships, Apple included, is *managed-model-refresh-aware* regression detection.
- **Qualcomm AI Hub** — profiling with random inputs (perf, not correctness); accuracy punted to desktop AIMET.
- **OSS (promptfoo, DeepEval, lm-eval-harness, Ragas, Giskard)** — all desktop/CI Python/Node; none runs on-device on Android or knows about AICore model versions.

**The main competitor a developer uses today is promptfoo-or-a-spreadsheet in CI** — not another platform, a hand-rolled golden set that doesn't drive the real on-device model and can't key a diff to a Nano version transition.

---

## Proposed surface

A **Type D harness with a Type E spine**: the eval runner is the product, but its defensible core is the platform-only model-refresh signal.

Three pieces:

1. **`genai-eval` test dependency.** Author a golden set — inputs plus asserted properties — as annotated Kotlin, run it in CI against the real on-device model on a Nano-capable foreground test device. Assertions reuse what already ships: **structured-output constraint errors** (`STRUCTURED_OUTPUT_INVALID_VALUE`, −105) give machine-checkable schema/field/enum conformance, stronger than string diffing; plus length/format rules and an optional **on-device LLM-as-judge** using Nano itself.
2. **Model-version stamping and regression diff (the privileged part).** Every result is stamped with `getBaseModelName()` and the AICore feature id. The harness stores runs and, **when the stamped version changes, surfaces the per-item regression** — the thing `getBaseModelName()` alone can't do and a 3P CI runner can't see cleanly. This is where the platform earns the right to own it.
3. **Consolidated usage accounting.** `countTokens()` already counts *input* ([structured-output docs](https://developers.google.com/ml-kit/genai/prompt/android/structured-output)); a response-level output/cached-token field appears **absent** on the on-device path (strongly indicated, not fully confirmed — verify against the live Prompt API reference). Closing that gives developers Apple-parity usage reporting inside the eval loop.

What it deliberately is **not**: not a production on-device eval loop. Foreground-only inference, `ErrorCode.BUSY` (per-app inference quota), and `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` make running eval batches on real user devices a non-starter. The honest architecture is **CI/dev driving an instrumented foreground test device (or a device farm), paced against the quota, dashboarded off-device.** Not a cloud-model substitute — the whole point is to test the *real* managed model.

**Time-to-first-hello-world target: 30 minutes.** What must be true: one Gradle line, a 10-input golden set from a code template, one annotated assertion, `./gradlew evalDebug` on a connected Nano device → a pass/fail table with the model version stamped. It can't hit 15 minutes because it needs a real device and a CI runner; naming that is a finding about the design, not a footnote.

---

## Reach & sizing

Arithmetic, as ranges, inputs labeled (full method from the sizing pass):

- **Device reach (the hard cap):** 140M+ Nano devices (**Google-published**, latest found Jul 2026, not refreshed since Apr's 140M) ÷ ~3.8B Android actives (**third-party**) → **~3.7%**. This caps who can even *run* the feature being evaluated, and it is the binding constraint.
- **A_cat** (quality apps >50K installs in Productivity/Communication/Social/Education/Tools/Business): **~15,000–30,000** (third-party estimate; the softest input — AppBrain's category column didn't render this session).
- **p_job** (fraction plausibly shipping a Nano GenAI text feature today): **5–10%**, small precisely because of the 3.7% reach + cloud-fallback burden.
- **minSdk 26 reach:** ~94.8% (apilevels.com, third-party) — barely binds.
- **Tooling-adoption ceiling:** **20–40%** of feature-shipping teams (eval is adopted by a fraction, even when valuable).

SAM(apps) = 750–3,000 → Eligible = ~710–2,850 → **SOM@3yr ≈ 140–1,140 apps.** Install-weighted, using an 8–12× specialized-ML-SDK multiplier (TensorFlow Lite comparable, AppBrain): **≈ 0.05%–0.5% of the install-weighted Android surface.** Engineering cost avoided (per-app golden-set+scorer+drift build $30K–$150K × SOM): **≈ $4M–$170M** over three years.

**Sensitivity:** halve both p_job and the adoption ceiling and SOM falls to ~35–285 apps, reach to ~0.01–0.14% — the qualitative story (small-but-growing) **does not change.** The *only* lever that flips it is device reach: this is a **reach-gated** market, not a demand-elastic one. **Cross-check:** Google publishes no ML Kit GenAI adoption count; the best proxy puts the GenAI-shipping population in the low hundreds today, sitting right at the SOM floor — so the model isn't over-counting.

The platform test (value avoided ÷ build + 5-yr maintenance) is **comfortable on cost-avoided but thin on reach today** — which is exactly why the verdict is preview-now, not GA-now.

---

## Adoption path

1. **The hook (30-minute win):** a developer adds one Gradle line, runs the sample golden set, and sees their prompt scored against the live model with the version stamped — the first time they've *seen* their on-device feature's quality as a number.
2. **First real integration:** they wire `genai-eval` into CI as a merge gate, replacing the spreadsheet or the eyeball. What it ships: a red build when a prompt edit drops schema conformance.
3. **The dependency they'd endorse:** when AICore moves them v3→v4, the harness flags the exact items that regressed before users do. After that catch, removing it is unthinkable — and they'd keep it willingly, not resentfully, because it saved a one-star week.

**First adopter:** a team already shipping structured Nano output and already eval-literate — the profile of the *"Less Is More"* author, or an accessibility app like Envision (already on ML Kit summarization) where a wrong summary is a safety issue. **Second wave:** unlocked by one reference app publicly crediting the harness for catching a refresh regression — platform tooling spreads by one visible team doing the thing everyone else then fears not doing.

---

## Execution plan

- **Developer preview** — ship the `genai-eval` runner + version-stamped diff against 3–5 design partners already on the Prompt API. **Question it answers:** do teams actually hit refresh-driven regressions in the wild, and at what rate? That is the S1/S2 evidence this report cannot get from outside the building. **Evidence collected:** real drift incidents per version transition.
- **Alpha → Beta** — graduate when a partner catches a genuine v3→v4 regression the harness flagged and they couldn't have caught otherwise. That single documented catch is the checkable graduation condition and the reference story.
- **GA** — commit the eval API surface and, separately, decide whether to also commit an **output-stability contract** (the harder Type E promise). Ship the measurement tool first; make the guarantee only if partners demand it, because a lifecycle contract you break is worse than one you never made.

**Org dependencies, named honestly:** this needs **AICore** to keep `getBaseModelName()` + feature-id stamping stable and ideally expose a response-level usage field — if AICore says no, the token-accounting pillar weakens. The device-farm execution is **AI Edge Portal's** turf; the clean split is ML Kit owns the eval API + golden-set + drift logic, AI Edge Portal runs it at scale. If that team won't partner, the harness is confined to a single connected device, which caps reach further.

---

## The case against

The strongest case, argued at full strength: **this is a feature on a surface the platform owner is actively extending, aimed at a market too small to matter yet.** Google already ships the hard primitives — version reporting, Stable/Preview stages, structured-output constraint errors, input token counting — and is iterating the Prompt API every quarter. A first-party "pin + regression-diff + usage-accounting" layer is the *obvious next commit inside ML Kit itself*, which means a standalone-harness framing could be commoditized by its own platform within a year. That's the live failure mode from the rubric's list: **not the API outran the hardware, but the platform absorbs the problem underneath you** — and here the platform is already holding the shovel. Compounding it, the addressable market is ~0.05–0.5% install-weighted and reach-gated, so even a perfect tool reaches few apps until Nano device coverage climbs off 3.7%.

The honest rebuttal is not that these are wrong — they're right — but that they argue for **ownership and timing, not against the thing.** If the capability is inevitable (Apple shipped it; the gap is real), the question is whether ML Kit builds it deliberately as a developer-preview now, collecting the drift-rate evidence, or ships it late and reactively after a competitor's developers talk about it. The reach gate is a reason to *preview*, not to *pass* — the tool's cost to build is low, and its strategic value (de-risking adoption of the entire GenAI portfolio) is highest precisely while the portfolio is young.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if Nano-GenAI device reach stays **below ~5%** of the Android base through end-2027 *and* the design-partner preview surfaces a refresh-driven-regression rate **under ~5% per version transition**, then there is neither a market nor a pain worth a committed surface — shelve it. (Either number alone is survivable; both together kill it.)

**Load-bearing assumption:** that AICore model refreshes produce *user-visible* output regressions at a rate developers can't tolerate. If refreshes are near-transparent in practice, the whole premise is a solution to a problem that resolved itself.

**Re-check trigger if shelved:** Nano device reach crosses ~15% (mid-tier devices clear the bar), **or** Apple's Evaluations framework adds managed-refresh regression detection — at which point Google is visibly behind on its own platform and the timing argument flips to urgent.

---

## Fit for this team

**ML Kit is the right owner, but not the only hand on it.** ML Kit owns the Prompt API surface and authored the prose "Evaluate prompt" page it would finally make executable, so the eval API, golden-set format, and version-diff logic belong here. But execution-at-scale (driving a device farm) is **AI Edge Portal's** existing competence, and usage accounting depends on **AICore**. The failure mode to avoid is this capability landing in MediaPipe or Firebase and fragmenting the developer story further — a developer should not have to leave ML Kit to find out whether their ML Kit feature regressed. If the org can't commit ML Kit as the front door with AI Edge Portal as the engine, the more valuable conclusion is to say so and not plant a weak flag.

---

## Open questions

- **Does the ML Kit on-device Prompt response truly lack output/cached-token usage?** Strongly indicated, not confirmed — the live Prompt API reference wasn't fetchable this session. Settles the token-accounting differentiator. *What settles it:* read the `GenerateContentResponse`/`Candidate` reference directly.
- **What is the real refresh-driven regression rate?** Unmeasurable from outside; it is the load-bearing assumption. *What settles it:* the design-partner preview.
- **What is the actual Nano-capable device distribution?** The 12GB-RAM / NPU floor that sets reach is unpublished anywhere found — the single biggest missing sizing input. *What settles it:* internal AICore device telemetry.
- **Nano device reclassification.** Secondary reporting shows the Pixel 9 line possibly reclassified v2→v3 as v4 rolls; it conflicts with earlier reporting. *What settles it:* the live ML Kit device-support matrix in a browser.

---

## Runners-up

- **Model-delivery observability & contract (Type E)** — the most-voiced ML Kit pain (unbundled-model download status is unobservable); lost narrowly because it's closer to "a richer status enum" and overlaps the DMA-mandated availability work due Aug 2027, so the platform may be forced to ship it regardless.
- **On-device user-content moderation classifier (Type G)** — strong regulatory clock (minors law live Jan 2026; Play accountability) and Bumble open-sourced one; lost on the **tunability** risk that safety is each app's proprietary policy surface, which can sink a one-size classifier on contact with a real T&S team.
- **On-device neural TTS (Type A)** — clean whitespace, Picovoice charges for it, Apple added speech gen; lost on **G1 privilege** (Piper/OSS TTS exists) and a heavy model-ownership commitment that doesn't hit a 15-minute hello-world.
- **Deferred / opportunistic inference scheduling (Type E)** — genuinely novel, max privilege, addresses thermal + quota pain; lost on **S1 demand**, which is thinner and more inferred than the eval evidence.

---

*Sources: [ML Kit Evaluate prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit select-model](https://developers.google.com/ml-kit/genai/prompt/android/select-model) · [ML Kit structured output](https://developers.google.com/ml-kit/genai/prompt/android/structured-output) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [googlesamples/mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061) · [googlesamples/mlkit #1072](https://github.com/googlesamples/mlkit/issues/1072) · [arXiv:2604.24636 "Less Is More"](https://arxiv.org/abs/2604.24636) · [arXiv:2311.11123 "Why Is My Prompt Getting Worse?"](https://arxiv.org/abs/2311.11123) · [promptfoo](https://github.com/promptfoo/promptfoo) · [DeepEval](https://github.com/confident-ai/deepeval) · [Apple WWDC26 Foundation Models / Evaluations](https://developer.apple.com/videos/play/wwdc2026/) · [Vertex Gen AI evaluation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) · [Firebase hybrid inference](https://developer.android.com/blog/posts/experimental-hybrid-inference-and-new-gemini-models-for-android)*
