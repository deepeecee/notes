# On-device GenAI Regression Harness — a golden-set gate wired to AICore's managed Nano, so apps stop shipping prompt quality blind

**Type:** D (Tooling), with a Type-E (delivery/lifecycle) core · **Verdict:** Prototype (developer-preview) · **Opportunity: 5/10 (Right idea, early market)**
*2026-11-25 · Prepared for Android ML Kit · Evidence current as of 2026-11-25*

> Badges: *Apple already shipped this (WWDC26)* · *Platform could absorb it underneath you* · *Demand proven for the job, thin inside ML Kit*

> On a Tuesday, an Android engineer ships a Summarization feature tuned against the Gemini Nano version on their Pixel. Weeks later AICore rolls nano-v4 to a slice of the fleet, the summaries quietly get worse for those users, and the team finds out from a store review — because ML Kit gives them no way to re-run their examples against the new managed model before it lands. Google's own docs tell them to re-evaluate their prompt set "for each Gemini Nano version," then hand them no runner to do it. Apple shipped exactly that runner in June 2026. The managed model now turns over roughly every 6–9 months, and the app can't pin it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Right idea, early market | composite 3.2 ×2 = 6.4, −1 for Durability gate at exactly 3 → 5.4 ≈ 5. No S1=5 bonus |
| Platform privilege (gate) | 4/5 — pass | Only the platform can expose a *pre-release* managed-model channel + per-version drift signal; a bare eval runner is not privileged ([AICore Developer Preview](https://android-developers.googleblog.com/2026/04/AI-Core-Developer-Preview.html)) |
| Feasibility headroom (gate) | 4/5 — pass | Mechanics exist today: `countTokens`, `seed`, `getBaseModelName()`, the preview channel; the tool trains no model. Weak link is on-device LLM-as-judge (below) |
| Durability (gate) | 3/5 — pass (soft) | ML Kit owns the Prompt-API/AICore front door, but no output-stability contract exists and org ownership vs. AI Edge is unclear |
| Demand evidence (25%) | 4/5 | Thriving eval market ([promptfoo 27.7k★, now OpenAI](https://github.com/promptfoo/promptfoo); [DeepEval 19.7k★](https://github.com/confident-ai/deepeval); Braintrust $800M); peer-reviewed drift finding ([arXiv 2311.11123](https://arxiv.org/abs/2311.11123)). But ML-Kit-specific voice is thin |
| Install-weighted reach (15%) | 2/5 | Nano reaches ~3.7% of the fleet ([140M / 3.8B, my arithmetic](https://android-developers.googleblog.com/)); on-device GenAI ships in tens-to-low-hundreds of apps today |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Generic harness is borrowable (host-driven promptfoo/DeepEval); only the managed-model-preview + drift gate is non-borrowable |
| Integration cost / TTFHW (15%) | 4/5 | Dev-time artifact: no runtime permission, no APK size, no API key; a golden-set run can be a Gradle/CLI one-liner |
| Substitute half-life (15%) | 2/5 | Short: Google's own roadmap (cloud [APO](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html), host-side [`ai-edge-eval`](https://github.com/google-ai-edge/eval), [AI Edge Portal](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)) or an Apple-style framework could absorb it inside a year |
| Strategic complement (10%) | 4/5 | An API nobody can measure is an API nobody dares change; evals lift retention of the whole GenAI portfolio |
| **Composite** | **3.2** | Prototype band (3.0–3.9): developer-preview to collect ML-Kit-specific demand evidence |

*Least trustworthy score: Install-weighted reach (S2).* There is no verified ML Kit GenAI adoption count — the APIs are too new to appear in any crowd-sourced SDK dataset — so the "tens-to-low-hundreds of apps" figure is an analog off TensorFlow Lite's ~0.95%-of-apps ceiling, not a measurement.

**Research limitation to carry:** `developers.google.com`, `firebase.google.com`, `arxiv.org`, `appbrain.com` and the EU DMA portal were not resolvable via WebFetch in this session, so every Google/arXiv/AppBrain/EU claim below rests on WebSearch snippets that quote those pages, not a direct live fetch. Apple and GitHub pages were fetched directly. Claims are marked accordingly.

---

## The problem

The job, stated as an engineer's: *"Tell me whether my on-device GenAI feature got better or worse — before my users find out."* The customer is an Android developer under a release deadline; the competing solution is their own hand-rolled test loop, and increasingly nothing at all.

Three structural facts of a large consumer Android app produce this. First, **the model is managed and versioned underneath the app.** ML Kit GenAI is the sanctioned front door to Gemini Nano via AICore; the overview states "different versions of Gemini Nano run on different devices," and exposes `getBaseModelName()` so an app can read — but not pin — the version it was served ([ML Kit GenAI overview](https://developers.google.com/ml-kit/genai), snippet). The version ladder is real and dated: nano-v2 → nano-v3 (the Prompt-API alpha, [30 Oct 2025](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html)) → Gemma-4 preview ([2 Apr 2026](https://android-developers.googleblog.com/2026/04/AI-Core-Developer-Preview.html)) → nano-v4 / "Gemini Intelligence," first shipping July 2026 on a 12 GB-RAM floor ([9to5google, Aug 2026](https://9to5google.com/2026/08/27/gemini-intelligence-nano-4/), third-party). A major managed-model turn every 6–9 months, each of which can move outputs.

Second, **the brand can't ship an embarrassing output**, and the quality bar for 100M users sits far above any benchmark number. Third, **the org is server-side**: the Android team integrating the Prompt API are not the ML people, so "did quality regress?" is a question they have no instrument to answer.

What they do *instead* today: Google's own [Evaluate-prompt-quality guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) instructs them to build an input/expected-output set, run it "for each Gemini Nano version," grade "manually or with LLM-as-a-judge," and when it misses, "ask a stronger model such as Gemini Pro to refine the prompt." That is a workflow specification with no shipped tool behind it — prose, then a link out to Google *Cloud's* evaluation service. The workaround's cost — a hand-built harness, per-device, re-run on every model rumor — is what this idea is priced against. This is not a bug report: the gap is produced by the managed-model architecture itself, not by a fixable defect.

---

## Proof & signals

- **A thriving eval-tooling market (the job is real and widespread).** promptfoo: 27.7k★, and its repo now carries a "part of OpenAI" banner — acquired ([github.com/promptfoo/promptfoo](https://github.com/promptfoo/promptfoo), fetched). DeepEval: 19.7k★, ~8M PyPI downloads/month, explicitly markets "prevent prompt drifting" and CI/CD gating ([github.com/confident-ai/deepeval](https://github.com/confident-ai/deepeval), fetched). Ragas: 16.4k★ ([repo](https://github.com/explodinggradients/ragas), fetched). Braintrust raised an $80M Series B at ~$800M post-money, Feb 2026 (axios/siliconangle, third-party). Willingness to pay for "is my AI feature decaying?" is established.
- **Peer-reviewed drift evidence.** *"(Why) Is My Prompt Getting Worse? Rethinking Regression Testing for Evolving LLM APIs"* (Ma, Yang, Kästner; CAIN 2024; [arXiv 2311.11123](https://arxiv.org/abs/2311.11123), confirmed to exist via search): API upgrades "noticeably degrade performance," regression tests must version model and prompt *together* and handle non-determinism. *The specific "58.8% of prompt+model combinations lose accuracy across updates" figure is a subagent's read of the PDF, not independently confirmed here.*
- **Verbatim developer voice.** From the OpenAI developer forum (search-surfaced verbatim): *"since the update yesterday, my recall has dropped from 80% to 50% on the exact same test set, same prompt,"* and *"the models are updated from time to time with no notice and no information on what was done."* A developer running a held-out set and watching a silent update halve the score is this product's exact user.
- **On-device, on Android, the pain is shipped.** A longitudinal case study of Gemma-4-E2B and Qwen3-0.6B in a production Android word game ([arXiv 2604.24636](https://arxiv.org/html/2604.24636v2), search-surfaced) reports "valid JSON with semantically wrong values" and a hand-built "multi-layer defensive parsing" + "contextual retry" layer. A practitioner's rule — *"Trust the parser, not the prompt"* — captures the status quo.
- **The ML Kit-specific signal — and its honest absence.** The googlesamples/mlkit tracker shows almost no *output-quality* complaints; traffic is availability, download, and quota. But two issues land on-thesis: [#1061](https://github.com/googlesamples/mlkit/issues/1061) (16 Jul 2026, fetched) — a Prompt-API version bump alone (beta2→beta3) changed behavior, and "the regression's impact varies by device"; and [#972](https://github.com/googlesamples/mlkit/issues/972) — a developer manually checking which Nano version is live and finding a mismatch. **The silence is data:** it says the ML Kit GenAI developer base is still small and early, not that the problem is unreal. That is the single most important caveat in this report.

---

## Why now

1. **Capability shift (2025→2026).** The primitives an eval harness needs only just landed: the Prompt API went alpha [30 Oct 2025](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html) with `seed`, `temperature`, and `countTokens`; Structured Output, System Instructions and Thinking Mode arrived July 2026 — more complex prompts, more to regress.
2. **Competitive shift (June 2026) — the sharpest datapoint.** Apple shipped an **Evaluations framework** at WWDC26: *"a new Swift framework that measures the quality of your intelligence features… quantify accuracy as you tweak your prompts… deliver your app with confidence"* ([WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/), fetched verbatim), plus `usage` reporting of input/output/cached/reasoning tokens in iOS 26.4. Apple's own forum guidance is to re-run an eval set against each OS beta to catch model drift. The "nobody does this" window is closed on iOS.
3. **Demand/regulatory shift (16 Jul 2026).** The EU DMA specification decision forces Alphabet to open on-device Nano access to third-party AI services — enlarging the population of apps exposed to an uncontrollable managed model. *Caveat: the decision covers access/interoperability, not evaluation or quality; the "Android 18 / 1 Aug 2027" specifics from my working snapshot could not be verified this session and should be treated as unconfirmed.*

All three hold with dates. The timing pressure is competitive and architectural, not regulatory.

---

## The capability gap

Precise boundaries, each with the page checked (Google pages via search snippet, per the limitation above):

- **ML Kit GenAI:** ships the prose [Evaluate-prompt-quality guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) — no runner, no assertions library, no drift detection. `countTokens`/`CountTokensResponse` exist but serve a pre-flight check against the ~4,000-token input limit ([Prompt API get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)), **not** runtime usage reporting with cached/reasoning breakdown. Quota surfaces only reactively, as `BUSY`/battery error codes.
- **Automated Prompt Optimization** ([Jan 2026](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html)): Google's closest "quality" asset — but it runs on **Vertex AI (cloud)** and optimizes prompts; it does not measure or regress an app's live on-device output over time.
- **AI Edge Portal:** latency/memory/throughput only, not output quality; LLM benchmarking is a private preview ([launch, May 2026](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **`google-ai-edge/eval`:** a host-side CLI bound to LiteRT-LM/HuggingFace models — **not** AICore/Nano — with no LLM-judge and no token counting ([repo](https://github.com/google-ai-edge/eval), fetched).
- **Firebase AI Logic / Vertex:** evaluation is cloud-only; no client-side on-device eval ([hybrid-inference docs](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference)).
- **OSS (the borrow path):** promptfoo, DeepEval, Ragas, lm-evaluation-harness all run host/server/CI and reach a phone only by driving an HTTP endpoint on it. None sees or gates the AICore-managed model version.

**Main competitor a developer uses today:** their own hand-rolled test loop, plus host-driven promptfoo/DeepEval against a debug build. The non-obvious gap: **the privileged piece of an eval harness is not the runner — it's the managed-model-update preview channel.** Google already *operates* that channel (AICore Developer Preview) but exposes no per-app regression contract on top of it. The opportunity is to turn the existing preview channel into a drift gate, not to build another eval runner.

---

## Proposed surface

A dev-time **regression harness** (CLI + Gradle plugin + a thin on-device test runner), with one platform-privileged hook no competitor can replicate.

Three layers:

1. **Golden-set runner (borrowable, ship for parity).** Developer declares examples + assertions (regex/JSON-schema/structural checks against Structured Output) and runs them on-device against the live Nano. `seed` + low `temperature` pin determinism *within* a version so sampling noise doesn't masquerade as drift.
2. **Scoring (hybrid — the honest design).** Deterministic/structural checks run on-device. For semantic "is this still good?" scoring, the harness calls an **optional** judge — cloud Gemini Pro or a human-label set — because on-device LLM-as-judge is unvalidated for reliability (see below). The headline is *not* "Nano judges Nano."
3. **The model-update preview gate (non-borrowable — this is the product).** The harness runs the golden set against the **next AICore-managed Nano version** via the Developer Preview channel *before* it reaches the app's users, emits a per-example diff vs. the current version, and surfaces a `MODEL_UPDATE_PENDING` signal with a stability report. Only the platform can offer pre-release access to a model it manages and refuses to hand out.

**Deliberately not included:** training/fine-tuning, a quality *guarantee* (the harness measures; it never promises the model won't change), and cloud-only workflows (those stay in Vertex/APO).

**Kotlin sketch:**
```kotlin
val harness = NanoRegressionHarness.builder()
    .goldenSet(File("summarize_golden.jsonl"))   // input + expected/assertions
    .judge(Judge.structural() + Judge.cloud(GEMINI_PRO)) // hybrid, cloud optional
    .seed(42).temperature(0.2f)
    .build()

val report = harness.runAgainst(ModelChannel.CURRENT)         // today's served Nano
val preview = harness.runAgainst(ModelChannel.NEXT_PREVIEW)   // privileged: next AICore model
report.diff(preview).failuresAbove(threshold = 0.1f)          // CI gate
```

**TTFHW target: 15 minutes** — add one Gradle line, point at a JSONL golden set, get a pass/fail on the emulator. Reaching it requires the runner to ship with sane default assertions and the preview channel to be a flag, not an enrollment form. If the preview gate can't be made a one-liner, that's a finding about the design, not a footnote.

---

## Reach & sizing

This is developer tooling, so the base is *teams shipping on-device GenAI*, not installs.

- `A_cat` (realistic adopter categories): news/readers, communication/messaging, keyboards, productivity/notes, accessibility — the Summarization/Rewrite/Image-Description consumers.
- **Today:** on-device is the rarest LLM-integration strategy — a study of 149 LLM-using apps found ~1–3% on-device/hybrid ([arXiv 2502.15908](https://arxiv.org/abs/2502.15908), partially unverified) → **tens-to-low-hundreds of teams globally**.
- **3-year ceiling:** TensorFlow Lite, the most-adopted on-device ML SDK, sits at ~0.95% of apps with ~11.8× install-weighting (AppBrain, Oct 2025, third-party, my arithmetic). On-device GenAI is a *device-gated subset* of that, so ~1% of maintained apps is a generous ceiling → order ~5k–20k apps, likely the low end.
- **Device gate (binding):** Nano reaches 140M+ devices (Google, [21 Jul 2026](https://android-developers.googleblog.com/)) against ~3.8B actives (Google) → **~3.7%, my arithmetic**. The API-level floor (26+/31+) eliminates almost nobody (~78–96%); hardware is what binds.
- **Engineering cost avoided:** per adopter, a few engineer-weeks of hand-rolled harness + the un-buildable pre-release-testing capability. Across tens-to-hundreds of teams, the aggregate is modest *today*.

**Sensitivity:** halve the adopter count *and* the ceiling and the verdict doesn't move — it's already Prototype, not Build, precisely because the market is a leading indicator. The honest statement: **the decision needs one experiment — does on-device GenAI adoption on Android inflect upward through 2027?** — not a bigger spreadsheet.

---

## Adoption path

1. **The hook:** a 15-minute CI gate that red-flags a prompt regression on the emulator — the promptfoo-style win, but Nano-native.
2. **First real integration:** the team wires the golden set into their release pipeline, replacing a manual spot-check, and gets the per-version diff.
3. **The dependency they'd endorse:** the `MODEL_UPDATE_PENDING` preview gate — once a team has caught one silent nano-v4 regression before users did, removing the harness means flying blind on every future AICore turn.

**First adopter:** an accessibility or reader app already shipping ML Kit Summarization (Envision is a named Summarization user) — small, quality-sensitive, burned by a version change. **Second wave:** keyboards and messaging, once a reference integration and one public "we caught the regression" blog post exist. If no first adopter can be named, the funnel doesn't start — and here it barely can today, which the scores reflect.

---

## Execution plan

- **Developer preview:** ship the golden-set runner + the preview gate to the existing AICore Developer Preview cohort. Question it answers: *do teams actually catch real regressions, and do they value the pre-release channel over a plain runner?* This is the S1 evidence the Prototype verdict exists to collect.
- **Alpha/Beta — graduation condition:** ≥20 preview teams run the harness in CI and ≥1 public reference app reports catching a model-version regression before release. If that can't be met, the market isn't here yet — shelve, don't force GA.
- **GA:** commit the golden-set format and the `MODEL_UPDATE_PENDING` contract, versioned independently of the model.

**Org dependency, named honestly:** the preview gate requires the **AICore team** to expose pre-release model access as a developer-testable channel — they own it, and if they say no, the idea collapses to a borrowable runner (G1 drops to ~2). The eval *runner* plausibly belongs with **AI Edge** (they already ship `ai-edge-eval`); the *managed-model regression contract* can only be ML Kit + AICore. That split is the real decision.

---

## The case against

The strongest argument, made fairly: **the platform absorbs the problem underneath you** (failure mode #2). Google already has every adjacent piece — a cloud prompt optimizer (APO), a host-side eval CLI (`ai-edge-eval`), a device benchmarking farm (AI Edge Portal), and the AICore preview channel itself. Stitching a managed-model regression gate from those is a quarter's work for a team that already owns the parts, and Apple shipping an Evaluations framework in June 2026 is the clearest possible proof the category is both real and trivially within an incumbent's reach. A narrow ML Kit harness could be redundant within a year — which is exactly what the S5 score of 2 encodes.

The secondary risk is **undifferentiated against a free substitute** (#7): host-driven promptfoo/DeepEval already do the runner. The mitigation is the only honest one — do not ship the runner as the product; ship the preview gate, and let the runner be table stakes reused from `ai-edge-eval`. If the preview gate can't be delivered (AICore says no), there is no defensible product here, and the right call is to document and shelve.

The weakest part of the bull case is demand *inside ML Kit specifically*: the tracker is quiet. The bet is that quiet is "early," not "absent" — and that bet is the whole report.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google announces a managed-model regression/eval API (or folds output-quality + a pre-release-model gate into AI Edge Portal) at I/O 2027. If that ships, the window is closed and this becomes a reference integration, not a product. *Checkable: watch the I/O 2027 keynote and the ML Kit/AI Edge release notes through mid-2027.*

**Load-bearing assumption:** on-device GenAI adoption on Android inflects upward through 2027 (from tens of apps toward hundreds). If it stays flat, there is no market for the tooling regardless of how good it is.

**Re-check trigger if shelved:** ML Kit GenAI adoption crosses ~500 shipping apps, **or** the AICore team opens a developer-testable pre-release model channel on their own — either makes the privileged gate suddenly cheap to build.

---

## Fit for this team

ML Kit owns the sanctioned GenAI front door — the Prompt API into AICore — so the *managed-model regression contract* belongs here and nowhere else: AI Edge's world is LiteRT-LM and bring-your-own-model, and its `ai-edge-eval` already serves that path. The live internal risk is the opposite of a turf grab: if the eval story lands in AI Edge by default, the AICore-managed path keeps its blind spot and the developer story fragments further. The clean division — **AI Edge owns the runner, ML Kit + AICore own the pre-release drift gate** — is a more useful conclusion than a claim on the whole thing.

---

## Open questions

- **Does ML Kit GenAI adoption actually inflect?** No verified adoption count exists (the APIs are too new to register in AppBrain). *Settled by:* a Play SDK Index read or a Google-published GenAI adoption figure.
- **Is on-device LLM-as-judge ever reliable enough to drop the cloud judge?** Unvalidated today; Google's own guide routes judging to cloud Gemini Pro. *Settled by:* a small-judge-vs-human-agreement study on Nano-class models.
- **Does a fixed `seed` hold across devices and across a Nano version bump?** Docs claim determinism within a version but say nothing cross-version. *Settled by:* a direct test once the reference page is reachable.
- **Does the DMA decision create any quality/evaluation obligation?** It appears to cover access only; the Android-18 / 1-Aug-2027 binding is unverified. *Settled by:* reading the EU DMA developer-portal page directly once allow-listed.

---

## Runners-up

- **Model-availability & delivery contract (Type E)** — the single clearest ML-Kit-voiced pain ([atlas P8 / issue tracker](https://github.com/googlesamples/mlkit/issues)): apps can't observe download/availability state, features vanish silently offline. Lost narrowly: it's the strongest-evidenced idea but arguably "add a status enum," and it overlaps this idea's lifecycle core — folded in as the `MODEL_UPDATE_PENDING` signal.
- **Standalone on-device moderation classifier (Type G)** — real regulatory pull, strong privilege. Lost on the tunability trap: a one-size safety classifier is often unusable to a real T&S team, and the idea dies on contact without a tunability story this run couldn't yet build.
- **Reach / graceful-degradation tiering for GenAI (Type F)** — addresses the defining 3.7% tension. Deferred: Feasibility headroom is the whole game and honestly sizing per-tier quality needs its own run.
- **On-device neural TTS (Type A)** — clean whitespace, Picovoice charges for it, Apple shipped speech generation. Lost on type discipline and feasibility: it's the "obvious" new-API, and mid-tier quality/latency is unproven — a candidate for its own report, not this one.

---

*Sources:*
- [Apple — What's new in Foundation Models, WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/)
- [Apple — Foundation Models framework updates](https://developer.apple.com/documentation/updates/foundationmodels)
- [Apple Developer Forums — eval set vs. OS beta drift (thread 833642)](https://developer.apple.com/forums/thread/833642)
- [ML Kit — GenAI overview](https://developers.google.com/ml-kit/genai)
- [ML Kit — Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)
- [ML Kit — Prompt API get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- [Android Developers Blog — Automated Prompt Optimization (Jan 2026)](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html)
- [Android Developers Blog — Prompt API alpha (Oct 2025)](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html)
- [Android Developers Blog — AICore Developer Preview / Gemma 4 (Apr 2026)](https://android-developers.googleblog.com/2026/04/AI-Core-Developer-Preview.html)
- [Google Cloud — Benchmark LLMs on-device with AI Edge Portal (May 2026)](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)
- [google-ai-edge/eval (host-side CLI)](https://github.com/google-ai-edge/eval)
- [MediaPipe LLM Inference — Android (maintenance notice)](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/android)
- [Firebase AI Logic — hybrid on-device inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference)
- [promptfoo (GitHub, 27.7k★, now OpenAI)](https://github.com/promptfoo/promptfoo)
- [DeepEval (GitHub, 19.7k★)](https://github.com/confident-ai/deepeval)
- [Ragas (GitHub, 16.4k★)](https://github.com/explodinggradients/ragas)
- [arXiv 2311.11123 — (Why) Is My Prompt Getting Worse? (CAIN 2024)](https://arxiv.org/abs/2311.11123)
- [arXiv 2507.05573 — Prompt Migration / model drift](https://arxiv.org/abs/2507.05573)
- [arXiv 2604.24636 — on-device small models in a production Android app](https://arxiv.org/html/2604.24636v2)
- [arXiv 2502.15908 — LLMs in Mobile Apps (149-app study)](https://arxiv.org/abs/2502.15908)
- [ML Kit issue #1061 — Prompt API version-bump regression](https://github.com/googlesamples/mlkit/issues/1061)
- [ML Kit issue #972 — Nano version mismatch on Pixel 10](https://github.com/googlesamples/mlkit/issues/972)
- [9to5google — Gemini Intelligence / Nano 4 (Aug 2026)](https://9to5google.com/2026/08/27/gemini-intelligence-nano-4/)
- [AppBrain — Machine learning SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [proandroiddev — why a 1B on-device LLM needs a harness](https://proandroiddev.com/why-a-1b-on-device-llm-needs-a-harness-4068cf22e818)
- [EU DMA — Alphabet interoperability specification proceedings](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
