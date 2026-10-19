# GenAI Eval & Stability Kit — a CI harness and version contract for apps whose on-device model changes underneath them

**Type:** D (Tooling) with a Type E (Delivery & lifecycle) core · **Verdict:** Prototype (developer preview) · **Opportunity: 6/10 (promising but early)**
*2026-10-19 · Prepared for Android ML Kit · Evidence current as of 2026-10-19*

*Badges: Apple already shipped this (iOS) · Reach-gated today · Platform-created problem*

> A developer at a maps app shipped address autocomplete on the ML Kit Prompt API last quarter. This week an AICore update rolled Gemini Nano from v3 to v4 on their users' phones, and their regex that parsed Nano's output started failing on a slice of devices — silently, in production, with no code change on their side and no alert. To find out, they are right now running 93 prompts by hand through a Nano test rig and hitting the per-app quota wall at request ~40. ML Kit tells them, in prose, to "keep a dataset of expected outputs and grade them." It ships nothing to do it, and no way to pin or be warned about the model swap that broke them.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — promising but early | composite 3.45 × 2 = 6.9, −1 for the durability gate sitting at exactly 3; S1 was a 4 not a 5, so no demand bonus |
| Platform privilege (gate) | 4/5 — pass | the eval loop is borrowable; drift detection, quota/usage accounting, and a model-version/output-stability contract are things only the AICore owner can expose |
| Feasibility headroom (gate) | 5/5 — pass | no model to train; `countTokens()` and `getBaseModelName()` already ship ([ref](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/GenerativeModel)) |
| Durability (gate) | 3/5 — pass, the weak gate | an output-stability *contract* is the promise Google historically breaks; dev-tool mortality base rate is high ([killedbygoogle](https://killedbygoogle.com/)) |
| Demand evidence (25%) | 4/5 | promptfoo 26k★, deepeval 19k★, commercial WTP (LangSmith $39/seat, Braintrust $249/mo), and direct ML Kit issue-tracker proof; on-device *mobile* harness category still nascent |
| Install-weighted reach (15%) | 2/5 | Nano ≈3.7% of devices; on-device GenAI shipped in <0.1% of apps; one named production app (Kakao Mobility) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | the eval veneer is borrowable (promptfoo, pub.dev `vouch`); the platform signals are not, but the delta is modest |
| Integration cost / TTFHW (15%) | 4/5 | a Gradle line + a JUnit rule reaches first drift-check in <15 min; authoring golden datasets is the inherent afternoon of work |
| Substitute half-life (15%) | 3/5 | an OSS tool could add an Android provider; the bigger risk is Google shipping this itself (it is the right owner) |
| Strategic complement (10%) | 5/5 | de-risks adoption of the *entire* GenAI portfolio → more Nano/AICore adoption → Android engagement and device differentiation |
| **Composite** | **3.45** | weighted mean; verdict band 3.0–3.9 = prototype to collect reach evidence |

*Least trustworthy row: install-weighted reach. There is no published count of apps shipping on-device GenAI, AppBrain/42matters don't break ML Kit GenAI out from classic ML Kit, and I am inferring the adopter base from a single public case study.*

*One sourcing caveat for the whole report: direct page fetches were proxy-blocked this run, so Google and Apple doc claims were confirmed through WebSearch extraction of the live pages (often with quoted text) rather than full-page fetches. Where that weakens a claim I mark it.*

---

## The problem

The job, stated as a developer's job under a deadline: *"I shipped a generative feature on the on-device model; I need to know it still works after the OS silently updates that model, before my users find out for me."*

This problem is structurally produced, not an accident of current tooling. A large consumer Android app that adopts ML Kit GenAI takes on three constraints at once. First, the model is **not theirs** — Gemini Nano lives in AICore, a system service that downloads and updates the model on its own cadence; the app does not distribute or pin it. Second, the output is **probabilistic** — the same prompt can yield different text run to run, and ML Kit's own overview states plainly that "different versions of Gemini Nano may return different output from the same prompt" ([ML Kit GenAI overview](https://developers.google.com/ml-kit/genai), confirmed live via search extraction). Third, the app's ML expertise is **server-side** — the Android engineer integrating the Prompt API is not the person who built the team's cloud eval pipeline, and that pipeline assumes a cloud model it can call from CI, not a model that only exists on a Pixel in a user's pocket.

What do they do *instead* today? One of three things. They write an ad-hoc test rig and run prompts through a physical device by hand — which is exactly what the developer in ML Kit issue [#1070](https://github.com/googlesamples/mlkit/issues/1070) is doing ("From an evaluation harness running 93 prompts through Gemini Nano (nano-v3)… Any batch-style usage – evaluation harnesses, prefetching several summaries, retry loops – hits this wall"), and they hit the undocumented per-app inference quota. Or they lift a cloud eval tool (promptfoo, deepeval) that has no concept of an on-device model and bolt it onto a local HTTP shim — unsupported and off-device. Or, most commonly, they ship and hope, and discover drift from a crash report.

The cloud world solved its version of this with one lever: pin a dated model snapshot and keep a regression suite. That lever **does not exist on-device**. AICore controls which model build is physically present; the app can now read the version string (`getBaseModelName()`, added 2026) and express a release-stage preference, but it cannot freeze a version or be notified when one changes. The standard workaround is unavailable precisely where the platform created the problem. That is the structural core of the opportunity.

---

## Proof & signals

- **Developers doing it by hand, on this exact platform.** ML Kit issue [#1070](https://github.com/googlesamples/mlkit/issues/1070) (open, 2026-08-09): a developer running a 93-prompt eval harness against Nano v3. Issue [#1061](https://github.com/googlesamples/mlkit/issues/1061) (2026-07-16): "genai-prompt 1.0.0-beta3 *regression*" — a library bump silently changed which AICore feature was requested, breaking a device that beta2 worked on. Issue [#1078](https://github.com/googlesamples/mlkit/issues/1078) (2026-10-05): model-package/AICore build mismatch makes every inference fail `COMPUTE_ERROR` while status still reports AVAILABLE. Issue [#972](https://github.com/googlesamples/mlkit/issues/972): a developer tracking whether they got Nano v2 or v3. This is dated, fetchable, on-target developer voice — unusually good for a niche. *(Confirmed via GitHub, Aug–Oct 2026.)*
- **Someone building exactly this product.** `vouch` on pub.dev ([link](https://pub.dev/packages/vouch)), v0.1.0, ~July 2026: tagline "Catch silent on-device LLM regressions," lets you "gate CI on what changed," built on `llm_replay_eval` ("deterministic record/replay (cassettes) and eval matchers for on-device LLM inference"). This is the proposed product in miniature — but single-author, Flutter not Android-native, and ~11 downloads. Proof of felt pain, not of a market. *(Confirmed via pub.dev.)*
- **Someone charging money for the capability (cloud).** LLM eval/observability is a funded category: LangSmith (~$12–16M ARR, $39/seat/mo), Braintrust ($80M Series B Feb 2026 per single secondary source; $249/mo unlimited seats), Arize/Phoenix (managed from ~$50/mo). Willingness to pay for "did my LLM feature get worse" is established — in the cloud. *(Third-party/vendor sources, directional.)*
- **Community voice on drift.** The behavior the harness guards against is well-documented for cloud models: HN [36633995](https://news.ycombinator.com/item?id=36633995) — output "went from around 95% valid JSON to about 10% overnight… reverted to the 0314 model and it's working fine again." The repeated practitioner prescription across such threads is "pin a dated snapshot, keep a regression suite, test before upgrading" — the lever on-device developers don't have.
- **The absence signal.** A GitHub search for an Android on-device-LLM *output* regression harness returns only 0–1★ academic repos about agents navigating Android UIs — a different problem. The mature eval tools (promptfoo 26k★, deepeval 19k★, openai/evals 19k★, ragas 16k★) are all server/desktop/CI and none targets an on-device mobile model. The category is real pain that a few people are just starting to hand-roll, not a saturated market.

---

## Why now

1. **Capability shift.** On-device GenAI only became a shipping developer surface recently: Prompt API alpha Oct 2025 → beta Jan 2026; Structured Output, System Instructions, Thinking Mode and the 4096-token output cap landed July 14, 2026 ([release notes](https://developers.google.com/ml-kit/release-notes)). A surface this young has no measurement layer yet — the window to own it is open now and closes once teams standardize on their own rigs.
2. **Competitive shift, dated.** WWDC26 (June 2026): Apple shipped a first-party **Evaluations framework** ([session 298](https://developer.apple.com/videos/play/wwdc2026/298/)) plus `tokenCount` and a `response.usage` report (input/cached/output/reasoning tokens), and signaled open-sourcing it. Apple's own demo routes the *judge* to Private Cloud Compute. Android has prose guidance and, until July 2026, not even token counting. The gap the report leans on is now concrete and has a name.
3. **Demand shift.** The model is now actively churning under apps: nano-v2 (Pixel 9) → nano-v3 (Pixel 10 / Galaxy S26, Aug 2025) → nano-v4 (Gemma-4-based, dev preview April 2026, shipping on late-2026 flagships). Every one of those transitions is a silent output change under a shipped app, and the frequency is rising, not falling.

The why-now is genuinely strong on (1) and (2); (3) is strong in principle but its blast radius is bounded by how few apps have shipped yet — which is the reach problem, below.

---

## The capability gap

- **Google ML Kit:** a prose "Evaluate prompt" page ([link](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)) — build a dataset, grade manually or with an LLM judge, iterate 3–5 times — that ships **no runnable harness** and points out to a cloud "data-driven optimizer" (targets `gemma-3n-e4b-it`) and Vertex's Gen AI evaluation service. `countTokens()`/`getTokenLimit()` now exist ([ref](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/GenerativeModel)) but there is **no quota/usage accounting** (only reactive `ErrorCode.BUSY` and the newer `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`, [ref](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode)), **no output-stability contract**, and **no drift notification** — `getBaseModelName()` lets you read the version but not pin it or be alerted when it changes ([select-model](https://developers.google.com/ml-kit/genai/prompt/android/select-model)).
- **Google AI Edge Portal / Qualcomm AI Hub:** both benchmark latency, memory, and hardware allocation — **never output quality**. Qualcomm's "numerical correctness" is tensor-level parity, not summarize/rewrite quality. ([AI Edge Portal](https://developers.google.com/edge/ai-edge-portal); [Qualcomm docs](https://app.aihub.qualcomm.com/docs).)
- **Firebase AI Logic:** has cloud `countTokens`/`usageMetadata`, but **no eval feature**, and its docs warn token counts "shouldn't be relied upon" for on-device; its on-device path is iOS/Chrome, not Android Nano. ([hybrid docs](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference).)
- **MediaPipe / LiteRT:** inference runtimes, no eval harness.
- **Apple Foundation Models:** the one vendor shipping on-device-adjacent eval + token + usage, **iOS/macOS only**.

The boundary, stated exactly: *no vendor ships an on-device GenAI eval + output-stability + quota-accounting harness on Android.* Apple shipped the eval half on iOS, which makes this a **cross-platform catch-up gap, not greenfield.** The **main competitor** a developer uses today is a cloud eval tool (promptfoo/LangSmith) bent onto a local shim, or a hand-rolled device rig — not another platform.

---

## Proposed surface

A Gradle-added test/runtime library, `com.google.mlkit:genai-eval`, with three layers. The eval loop is the hook; the platform signals are the moat.

**1. Record/replay eval harness (the hook, Type D).** A JUnit/Compose-test rule that runs a golden dataset (inputs + expected outputs/rubrics) against the device's current Nano, records a baseline "cassette," and fails CI when the diff against baseline crosses a threshold. Matchers for exact, structured (JSON-schema), and semantic (optional larger-judge) comparison.

```kotlin
@get:Rule val genai = GenAiEvalRule(model = PromptModel.default())

@Test fun summaries_stay_within_tolerance() {
    val report = genai.evaluate(
        dataset = GoldenSet.fromAsset("summaries.jsonl"),
        matchers = listOf(Match.jsonSchema(SummarySchema), Match.semantic(threshold = 0.85))
    )
    report.assertNoRegressionAgainstBaseline()   // fails if the current Nano drifted
    report.attachModelVersion()                  // stamps getBaseModelName() into the result
}
```

Because the on-device model is a weak self-judge (both Google's and Apple's own guidance route the judge to a *more capable* model), the default is golden-dataset + heuristic matchers; the semantic matcher is opt-in and can target a larger judge the team already runs.

**2. Drift & version awareness (the moat, Type E).** `GenAiModelMonitor` surfaces a stable callback when AICore changes the base model under the app, with old/new version strings, so an app can log it, re-run its suite, or fall back — the thing `getBaseModelName()` polling can't give because there is no change event today.

**3. Quota & usage accounting (the moat, Type E).** A readable budget — remaining per-app inference and battery quota — so `BUSY` and `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` stop being the only (reactive) signal, directly unblocking the batch eval use-case from issue #1070.

**What it deliberately does not do:** it does not pin a model version (that is the fragile contract — see durability), does not ship a judge model, and does not host results in a Google cloud console (results stay local/in the team's CI).

**Time-to-first-hello-world target: <15 minutes** to a green/red drift-check on one prompt. Met if layers 2 and 3 are pure library calls over existing AICore signals; authoring a real golden dataset is the inherent afternoon of work, and the docs should say so rather than pretend eval is free.

---

## Reach & sizing

Show the arithmetic. The addressable population is *apps shipping an on-device GenAI feature* — the tool's users — bounded by where Nano can run.

- **Device ceiling:** Gemini Nano runs on **"over 140 million devices"** (Google-published, [April 2026](https://android-developers.googleblog.com/2026/04/gemma-4-new-standard-for-local-agentic-intelligence.html) and repeated [July 2026](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html)). Against ~3.8B Android actives (third-party denominator) → **~3.7%** (my arithmetic). This is the hard upper bound on where an on-device GenAI feature can run at all.
- **App adoption today:** on-device GenAI shipped in **well under 0.1% of apps** — one named production case (Kakao Mobility: switched address entry to the Prompt API, −24% order-completion time, +45% new-user conversion, Google case study Oct 2025) plus a thin experimenter tail. GenAI-specific adoption is not broken out by any SDK tracker; classic ML Kit sits at ~66% of the text-processing-SDK category and ~95% of that category's installs (42matters, July 2026) → an install-weighting skew of ~1.4× within category, a floor for how much adopters over-index on installs.
- **minSdk is not the binding constraint.** ML Kit GenAI needs API 26+, which is ~95%+ of active devices (Statcounter-derived, directional); the Nano hardware gate (~3.7%) is the real ceiling.

**Install-weighted reach:** roughly **1–5% of install-volume on Nano-capable surfaces today**, because early adopters are large apps, trending toward the Nano device ceiling as flagships refresh. In absolute terms the near-term serviceable base is **dozens to low-hundreds of teams** — consistent with the leading cloud eval vendor being a low-tens-of-millions-ARR business.

**Sensitivity.** Halve the two softest inputs — the GenAI-adopter growth rate and the Nano reach — and the verdict does not change: it was already "prototype, not build," precisely because reach is thin. The decision that *would* flip is the opposite one: if on-device GenAI broadens past the Nano gate (via Gemma-on-any-device or hybrid cloud fallback) so that tens of thousands of apps ship GenAI, reach moves from 2/5 toward 4/5 and the composite crosses into Build. That is the one experiment worth watching, not running.

**Engineering cost avoided** is modest per-team today (a few engineer-weeks of a bespoke rig) × a small adopter base → the platform-test numerator is small *now*. The case for building is a bet on the denominator of adopters growing, not on today's savings.

---

## Adoption path

1. **The hook:** a Pixel-owning Android engineer adds the Gradle line and gets a red CI check the first time Nano drifts — a 15-minute win that converts "I didn't know it changed" into "my build told me."
2. **First real integration:** they author a golden suite for their one GenAI feature and gate releases on it, replacing a hand-run device rig (the issue #1070 workflow) and the quota guesswork.
3. **The dependency:** once releases are gated on the suite and the drift monitor is wired to their fallback logic, removing it means flying blind through the next AICore model update — a cost they'd endorse, not resent.

**First adopter:** a current Prompt API shipper — Kakao Mobility is the one publicly named, and a reference implementation from them (or a Google sample app that gates its own GenAI demo on the harness) is what seeds the second wave. If no first adopter can be named beyond the sample, the funnel doesn't start — which is itself the reach finding.

---

## Execution plan

- **Developer preview:** ship layers 2 and 3 (drift callback + quota readout) as a thin library to current Prompt API partners. Question it answers: *do teams wire drift detection to real fallback logic, and does readable quota unblock batch eval?* Evidence it collects: the S2 number we don't have — how many teams actually have a GenAI feature to protect.
- **Alpha/Beta:** add the record/replay harness and matchers. Graduation condition: *N preview partners gate at least one production release on the suite* (a checkable behavior, not a download count).
- **GA:** commit the harness API and the drift/quota signals — explicitly **not** a version-pin contract unless durability (below) is resolved.

**Org dependencies, honestly:** the drift and quota signals require the **AICore team** to expose model-change events and quota introspection — ML Kit cannot ship layers 2–3 alone. If AICore says no, the product collapses to a borrowable eval wrapper (layer 1 only), which fails Platform Privilege. That dependency is the single biggest execution risk, larger than any code.

---

## The case against

The strongest case against, argued at full strength: **this is a tool for a market that barely exists yet, and the part that's defensible isn't ours to ship.** On-device GenAI runs on ~3.7% of devices and has one publicly named production app. An eval harness for a few dozen teams is a feature, not a platform API — and the eval loop itself is already borrowable (promptfoo exists at 26k stars; `vouch` is building the on-device version). Strip away the platform signals and what's left is a thin wrapper competing with free software that ships faster.

The live failure mode from the rubric's list is **#2, the platform absorbs the problem underneath you** — and here the platform is *the obvious right owner*, so the risk is self-inflicted: Google already publishes the evaluate-prompt guidance and runs the AI Edge Portal device lab; the natural move is for Google to ship the harness itself and make a third-party version redundant. The second live mode is **#1, the API outran the hardware** — a measurement layer for a capability only 3.7% of devices can run is a flagship demo wearing a platform costume.

The mitigations, stated after the argument, not instead of it: build the defensible core (drift + quota) that OSS *can't* replicate and treat the eval loop as the loss-leading hook; scope to a developer preview explicitly to measure whether the adopter base is growing fast enough to justify GA; and refuse to ship the version-pin contract until the team can actually hold it. None of these make the reach problem go away — they make it a measured bet instead of a blind one.

---

## Kill criteria

**The single observation that would reverse this recommendation (toward Build):** if, by mid-2027, the count of apps shipping an on-device GenAI feature crosses into the low thousands — observable via a Google "developers using ML Kit GenAI" figure, a Play SDK Index breakout for `genai-prompt`, or a roster of named production apps at I/O 2027 — install-weighted reach moves from 2 to 4 and the composite crosses 4.0.

**The observation that would kill it entirely:** if Google ships an on-device eval harness + drift/quota signals itself (most likely by making the evaluate-prompt page executable), the third-party/standalone framing is dead and this becomes an internal roadmap item, not a report.

**Load-bearing assumption:** that on-device GenAI adoption grows fast enough that a measurement layer has customers before the surface standardizes without one. Everything rests on the adopter curve, which is the one number this run could not source.

**Re-check trigger if shelved:** a published jump in ML Kit GenAI adoption, or an AICore commitment to expose model-change events (which would de-risk the moat and the durability gate at once).

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, is the right owner of **layer 1** — ML Kit is the sanctioned front door to AICore and already owns the evaluate-prompt guidance, so the harness belongs where developers already are. But **layers 2 and 3 are not ML Kit's to grant** — model-change events and quota introspection live in **AICore**, and the honest conclusion is that this is a *joint* ML Kit + AICore product or it is nothing. If AICore won't expose those signals, the better conclusion is to say so and not ship a privilege-free wrapper under the ML Kit brand, because every fragile API taxes adoption of the whole portfolio.

---

## Open questions

- **How many apps actually ship an on-device GenAI feature, and how fast is that growing?** The one number the verdict turns on, and the one no reachable source provides. *Settled by:* a Google-published adopter count or a Play SDK Index breakout.
- **Will AICore expose a model-change event and quota introspection?** Determines whether the moat exists. *Settled by:* an AICore roadmap statement.
- **Does on-device GenAI stay Nano-gated (~4%) or broaden via Gemma-on-any-device / hybrid fallback?** Changes the TAM by an order of magnitude. *Settled by:* the Gemma-4-on-mid-tier reach numbers and Firebase hybrid Android support.
- **Is there a second named production adopter besides Kakao Mobility?** The funnel's seed. *Settled by:* I/O 2027 case studies.

---

## Runners-up

- **On-device neural TTS (Type A)** — strong whitespace (Google ships nothing modern; Picovoice Orca sells it; Apple shipped speech generation), but mature OSS borrow paths (Piper, Coqui, sherpa-onnx) weaken Platform Privilege (G1 ≈ 3).
- **UGC safety/moderation classifier (Type G)** — genuine regulatory clock and maximal privilege, but Google's own ShieldGemma is a ready borrow path and one-size tunability is a hard product problem; the closest contender, parked as the next run.
- **Speaker diarization + speaker ID (Type A/B)** — real pain and Picovoice WTP, but narrower install base (meeting/podcast apps) drags reach.
- **GenAI reach tiering for sub-8GB devices (Type F)** — strategically the biggest idea in the space (converts the 3.7% demo into a platform), but Feasibility (G2) is the whole game and can't be landed honestly in one run; park with a re-check on Gemma-4 mid-tier benchmarks.
- **On-device embeddings task API (Type A/B)** — huge demand, but MediaPipe + EmbeddingGemma already cover it → short substitute half-life (S5 fail).
- **Wake word / keyword spotting (Type A)** — killed at triage on G1: Porcupine and OSS ship it; a three-person team ships a Gradle dependency.

---

*Sources: [ML Kit evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai) · [Prompt API](https://developers.google.com/ml-kit/genai/prompt/android) · [select-model](https://developers.google.com/ml-kit/genai/prompt/android/select-model) · [GenerativeModel ref](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/GenerativeModel) · [GenAiException.ErrorCode](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Android dev blog: Nano + ML Kit GenAI, Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · [Gemma 4 / 140M devices, Apr 2026](https://android-developers.googleblog.com/2026/04/gemma-4-new-standard-for-local-agentic-intelligence.html) · [On-device inference, Jul 2026](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html) · [AICore Developer Preview](https://android-developers.googleblog.com/2026/04/AI-Core-Developer-Preview.html) · [Apple Evaluations framework, WWDC26 session 298](https://developer.apple.com/videos/play/wwdc2026/298/) · [Apple WWDC26 ML guide](https://developer.apple.com/wwdc26/guides/machine-learning/) · [Firebase AI Logic hybrid](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [Qualcomm AI Hub docs](https://app.aihub.qualcomm.com/docs) · [promptfoo](https://github.com/promptfoo/promptfoo) · [deepeval](https://github.com/confident-ai/deepeval) · [pub.dev vouch](https://pub.dev/packages/vouch) · [pub.dev llm_replay_eval](https://pub.dev/packages/llm_replay_eval) · [ML Kit issue #1070](https://github.com/googlesamples/mlkit/issues/1070) · [#1061](https://github.com/googlesamples/mlkit/issues/1061) · [#1078](https://github.com/googlesamples/mlkit/issues/1078) · [#972](https://github.com/googlesamples/mlkit/issues/972) · [HN: GPT-4 output drift](https://news.ycombinator.com/item?id=36633995) · [EU DMA Alphabet interoperability proceeding](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)*
