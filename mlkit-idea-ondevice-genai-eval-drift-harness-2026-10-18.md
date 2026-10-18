# On-Device GenAI Eval & Drift Harness — Google shipped the tripwire, not the thing that fires when it trips

**Type:** D (Tooling), with a minimal E (delivery/lifecycle) complement · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (Time it)**
*2026-10-18 · Prepared for Android ML Kit · Evidence current as of 2026-10-18*

> On 2026-07-16 an ML Kit developer filed issue #1061: the same code, same device, same session, minutes apart — `genai-prompt:1.0.0-beta2` succeeds and `beta3` fails, because the SDK silently requested a Nano feature ID no shipping AICore provides, and "there is no workaround at the API level." Their fix was to pin to beta2. This is the on-device version of a problem the whole industry now has a name for — *your prompt didn't change, your model did* — except on Android the model changes underneath the app, chosen by the OS, per device, with no way to measure what broke. Google already ships `getBaseModelName()` so the app can read *that* the model changed. It ships nothing to answer *whether the output got worse*.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Time it | composite 3.2 × 2 = 6.4; no gate at exactly 3 and S1≠5, so no adjustment → 6 |
| Platform privilege (gate) | 4/5 — pass | orchestration alone is borrowable (3), but reading the managed model version, on-device token accounting, and an output-stability contract are structurally platform-only ([getBaseModelName lives in the managed API](https://developers.google.com/ml-kit/genai)) |
| Feasibility headroom (gate) | 4/5 — pass | no model to train; Apple shipped the exact pattern ([WWDC26 session 298](https://developer.apple.com/videos/play/wwdc2026/298)); generation on-device, judging host/CI |
| Durability (gate) | 4/5 — pass | tooling outlives model refreshes; risk is Google charter + ML Kit-vs-AI-Edge ownership, not technical |
| Demand evidence (25%) | 3/5 | pain is real and dated (#1061) but *latent* — nobody has asked for an on-device eval tool by name; host-side category is hot (promptfoo 26k★) |
| Install-weighted reach (15%) | 2/5 | gated to Gemini Nano's [140M devices / ~3.7%](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html); GenAI-adopter app base nascent and unpublished |
| Build-vs-buy-vs-borrow (20%) | 3/5 | generic prompt eval is borrowable (promptfoo in CI against a cloud proxy); only on-device fidelity + real-Nano drift can't be borrowed |
| Integration cost / TTFHW (15%) | 4/5 | Gradle test dependency, no key, no new permission; single golden-prompt check in ~15 min, a real suite is an afternoon |
| Substitute half-life (15%) | 3/5 | 2–3 years; the live threat is Google's own roadmap absorbing it, which is fine if this team ships it |
| Strategic complement (10%) | 5/5 | de-risks adoption of *every* GenAI API in the portfolio; directly attacks the "brand can't ship an embarrassing output" blocker |
| **Composite** | **3.2** | Prototype band (3.0–3.9): developer-preview explicitly to collect S1 evidence |

*Least trustworthy row: S1. The pain is attested as bug reports and host-side category traction, not as a stated "we need this tool," so demand is inferred from structure, not observed as a named request.*

---

## The problem

A large consumer Android app that adopts on-device GenAI is building on a model it does not control and cannot freeze. AICore rolls Gemini Nano underneath ML Kit — nano-v2, nano-v3 (Gemma 3n), and nano-v4 (Gemma 4, in [AICore developer preview since April 2026](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences)) — and because the fleet is fragmented, the *same prompt gets a different model on different devices on the same day*: a Pixel 10 stays on Nano 3 while a Pixel 11 runs Nano 4. These are different base-model families with different parameter counts; identical output is not something architecture of that size produces. Google acknowledges this directly by shipping [`getBaseModelName()`](https://developers.google.com/ml-kit/genai) — you only expose a "which version am I running" call because the answer matters.

The job to be done, stated as a developer's: *"Before I widen this AI feature to 100M users, prove it still produces acceptable output on every Nano version in the field — and tell me the day a silent model update makes it stop."* The constraint that makes this a no-ship rather than a benchmark line is the one from the problem atlas: the brand cannot put an embarrassing generated output in front of its users, and "right 92% of the time" is a no-ship. On-device makes this worse, not better, because the thing that would reassure them — a frozen model they tested once — is exactly what the managed path takes away.

What they do instead today, in order of how much it costs them: (1) **pin to an old SDK/model and don't move** — issue #1061's resolution, which forfeits every subsequent fix; (2) **run promptfoo or DeepEval in CI against a cloud Gemini** as a stand-in for Nano, which tests the wrong model but is the only harness that exists; (3) **spot-check by hand** — the ML Kit tracker shows a Tagalog phrase mistranslated from "keep the children away" to "Kill the children" ([#1072](https://github.com/googlesamples/mlkit/issues/1072)), a defect caught only because a human read it; (4) **ship without evaluation and hope.** An [empirical study of 149 LLM mobile apps](https://arxiv.org/abs/2604.24636) found on-device adoption in the low single digits — the baseline this competes against is a cloud API that ships this week, with cloud eval tooling that already exists.

This is a platform problem, not an app problem, by the problem-atlas test: every GenAI-adopting app faces model drift *identically and badly*, because the drift originates in a shared system component none of them own. It is not their differentiation; it is their common tax.

---

## Proof & signals

- **Developers hitting version-swap drift, verbatim and dated.** ML Kit GenAI [issue #1061](https://github.com/googlesamples/mlkit/issues/1061) (opened 2026-07-16, still open): "beta2 succeeds on the same device, in the same session, minutes apart, with the same source code… Only the AAR version differs," root-caused to a feature-ID mismatch with "no workaround at the API level"; a 2026-10-07 commenter confirms "this regression persists in 1.0.0-beta4… rolling back to beta2 is the only option." *Confirmed against the live issue.*
- **The managed model's own state is untrustworthy, found by hand.** [#1078](https://github.com/googlesamples/mlkit/issues/1078): Nano reports `AVAILABLE` but every inference fails `COMPUTE_ERROR`; [#1062](https://github.com/googlesamples/mlkit/issues/1062): `checkFeatureStatus()` throws `FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`. *Confirmed against live issues.*
- **Someone is charging for / starring the category — host-side only.** [promptfoo](https://github.com/promptfoo/promptfoo) 26.1k★ ("evals run 100% locally — your prompts never leave your machine," i.e. the dev's laptop, not the phone); [DeepEval](https://github.com/confident-ai/deepeval) 18.9k★, which *explicitly sells model-swap regression* — "transition from OpenAI to Claude with confidence," preventing "prompt drifting"; [Ragas](https://github.com/explodinggradients/ragas) 16.1k★. *Confirmed; star counts as of research date.*
- **The absence signal.** A GitHub repository search for on-device / mobile LLM prompt-eval or regression tooling returns **zero** results against ~60k combined stars host-side. *Confirmed as a two-query null result.* Silence here means the on-device segment is unserved, not fought-over — which cuts both ways (opportunity, but also no revealed-demand proof).
- **The case study.** ["Less Is More: Engineering Challenges of On-Device SLM Integration"](https://arxiv.org/abs/2604.24636) documents a failure taxonomy (format violations, constraint violations, context degradation, latency, model-selection instability) from shipping Gemma/Qwen3-0.6B in an Android game; its companion [repo issue #3](https://github.com/woliveiras/palabrita/issues/3) prescribes testing "format violations, language drift, and execution latency against your published baselines" — an eval-suite mindset, hand-rolled. *Taxonomy confirmed; the specific "30–50% of generations" figure could not be fetched from the PDF — [unverified].*
- **Community voice (host-side) is loud and named.** "Your Prompt Didn't Change. Your Model Did." and "Catch Silent Model-Swap Failures" are recurring article titles; [arXiv 2311.11123](https://arxiv.org/pdf/2311.11123) ("(Why) Is My Prompt Getting Worse?") finds different prompt designs regress differently on the same model update, so prompt *and* model versions must both be tracked. *Confirmed via search; the on-device framing of this is absent, which is the point.*

Demand reading: **moderate, trending strong, but structural rather than vocal.** The pain is real and independently attested; the solution category is validated and valuable host-side; the specific on-device product has not been asked for out loud. That is a riskier bet than vocal demand — it must be named for the market, not discovered already named.

---

## Why now

1. **Capability shift (April 2026).** Nano 4 / Gemma 4 entered [AICore developer preview](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences), creating a live v3/v4 split across the fleet. Drift stopped being hypothetical the moment two model families served the same prompt in production. Independent testing already shows behavior differs across versions ([Nano 4 "Fast" is measurably more verbose and ~2× v3 throughput, not the claimed 4×](https://www.androidauthority.com/gemini-nano-4-benchmarks-3655763/)).
2. **Competitive shift (June 2026, WWDC26).** Apple shipped an [Evaluations framework](https://developer.apple.com/videos/play/wwdc2026/298) (dataset + code graders + `ModelJudgeEvaluator`, run from Swift Testing in Xcode) *and* on-device token counting (`tokenCount(for:)`, `contextSize`, iOS 26.4). ML Kit has neither — it ships a [prose "evaluate prompt quality" page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) that tells developers to build a dataset and judge it "manually or with LLM-as-a-judge" and iterate "3–5 times," with no code, no harness, and a pointer to cloud Vertex AI. Prescribing the workflow and shipping nothing to run it is a sharper gap than silence.
3. **Regulatory shift (statutory, 2027-08-01).** The EU's [DMA Article 6(7) decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) (July 2026) requires Alphabet to expose system-level on-device AI models to third parties "at equivalent performance" in Android 18 by 1 August 2027. "Equivalent performance" is an unmeasurable commitment without a quality-measurement surface — which makes eval tooling compliance-adjacent, not just nice-to-have.

Three dated why-nows, all real. The weakest is #3 (indirect), the strongest is #2 (a named competitor shipped the thing one quarter ago).

---

## The capability gap

What exists, and the exact boundary of what's missing:

- **ML Kit Prompt API** — exposes `temperature`, `topK`, `candidateCount`, `maxOutputTokens`, and (per the [reference](https://developers.google.com/ml-kit/genai/prompt/android/get-started)) a `seed`; ships **Structured Output** (`@Generable`/`@Guide`) that returns typed Kotlin objects — the machine-scorable substrate an eval harness needs. Missing: no token counter in the response, no logprobs. *The `seed` parameter is listed on the reference page but was not found by a second check of the get-started sample — treat determinism as "partial, needs confirmation."*
- **`getBaseModelName()` / `checkFeatureStatus()`** — the app can read the active model name (the drift *tripwire*) and download state (`DOWNLOADABLE/DOWNLOADING/AVAILABLE/UNAVAILABLE`). Missing: no output-stability contract across versions, no version-change callback, nothing that acts on a version change.
- **Automated Prompt Optimization** ([Jan 2026](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html)) — tunes a prompt for Nano, server-side via Vertex. It optimizes; it does not measure or regression-test.
- **[AI Edge Portal](https://developers.google.com/edge/ai-edge-portal)** — benchmarks LiteRT models across a 100+ device fleet for latency/memory "regressions." It measures *performance*, not output quality, and targets custom LiteRT models, not the managed Nano path.
- **[MediaPipe LLM Inference](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference)** — a runtime, no eval layer. **[Qualcomm AI Hub](https://app.aihub.qualcomm.com/docs)** — numerical correctness vs a PyTorch reference, not generative-output drift. **[Firebase AI Logic](https://firebase.google.com/docs/reference/kotlin/com/google/firebase/ai/type/UsageMetadata)** — the richest token accounting anywhere (`cachedContentTokenCount`, `thoughtsTokenCount`), but for *cloud* calls, with no eval framework.
- **Apple Foundation Models** — the closest prior art, and host-side: generation runs on-device, but evaluation orchestrates in Xcode/CI, and Apple explicitly routes its LLM-judge to a *larger* model (`PrivateCloudComputeLanguageModel`), warning the judge "should be at least as capable as the model you're evaluating." It does **not** ship automatic model-update drift detection.

**The main competitor a developer uses today is not a platform — it's promptfoo in CI, pointed at a cloud Gemini as a proxy for Nano.** It tests the wrong model, but it runs.

---

## Proposed surface

A test-time + CI harness, shipped as a Gradle test dependency, that composes primitives ML Kit mostly already owns — plus two small new ones. The before/after is the persuasive artifact:

**Before (today):** promptfoo YAML in CI → calls cloud Gemini (not Nano) → asserts on a model the user will never run. On-device behavior is untested until a user complaint.

**After (sketch):**

```kotlin
@GenAiEval(baseline = "nano-v3")              // pins the golden baseline to a model version
class SummaryQuality {
  val dataset = goldenSet("summaries.jsonl")   // prompt + expected, scored via @Generable types

  @Eval fun staysWithinBudget(r: Result) =
      codeGrader { r.wordCount in 1..40 }       // Palabrita F1/F2 class, deterministic, on-device

  @Eval fun meaningPreserved(r: Result) =
      judge(host = true, model = GEMINI_PRO)    // LLM-as-judge runs in CI, not on Nano itself

  @OnModelVersionChanged                        // NEW: fires when getBaseModelName() changes
  fun gate(old: String, new: String, report: DriftReport) =
      report.meanScore(new) >= report.meanScore(old) - 0.05
}
```

Components: (1) **dataset + code graders + structured-output scoring** — buildable today; (2) **host-side LLM-judge** — mirrors Apple, because a 2–4B Nano judging a 2–4B Nano is low-signal and doubles on-device memory/latency pressure; (3) **drift gate** on `getBaseModelName()` transitions — a new `@OnModelVersionChanged` signal and a `DriftReport`; (4) **`countTokens()`** for the on-device Prompt API — the one genuinely new runtime API; (5) a **versioned output-stability policy** (the Type-E complement) so an app can test a new Nano version before its rollout reaches users. What it deliberately does *not* do: it does not judge quality on-device at high fidelity (judging is CI/host), and it does not promise bit-exact reproducibility.

**TTFHW target: 15 minutes** for a single `codeGrader` golden-prompt assertion on an emulator — achievable (one Gradle line, no key, no new permission). A *meaningful regression suite* is an afternoon, because writing a golden dataset is real work. That gap is a finding about the design, not a footnote: the hook must be a one-assertion win, or the funnel never starts.

---

## Reach & sizing

Show the arithmetic; all inputs flagged by provenance.

- `A_cat` (apps in text/comms/productivity/news/social/education categories where on-device summarize/rewrite/proofread/prompt is useful): **~40K–100K** — derived from ~2.4M Play listings ([42matters](https://data.42matters.com/stats), third-party) → ~200–400K "serious/maintained" (industry rule-of-thumb, **softest input**) → ~15–25% text-heavy.
- `p_job` (fraction of GenAI adopters needing a dedicated eval/drift harness): **20–40%** (my estimate; no empirical base exists because the count of apps shipping ML Kit GenAI is **not published by Google or any tracker**).
- `m_install` (install-weighting): **~1.5×** — the robust input, from [42matters within-category %installs÷%apps](https://42matters.com/sdk-analysis/top-text-processing-sdks) across ML Kit (1.43×), Crashlytics (1.27×), Chromium (1.27×).
- `c_ceiling` (3-yr adoption ceiling for a specialized, opted-in, single-vendor dev tool): **5–15%** of the addressable set — analogized from Crashlytics plateauing near ~34% of *its* category after years with no device gate; a nascent niche tool lands well below that early.
- `r_reach` (device eligibility): **~3.7% today** (140M Google-published ÷ ~3.9B third-party actives), plausibly 10–20%+ over three years as mid-tier SoCs qualify. Apply as a *value/urgency weight*, not a hard cut — an app buys the tool once if any meaningful slice of its users are on Nano.

**SOM at year three ≈ A_cat × p_job × c_ceiling ≈ (40K–100K) × 0.3 × 0.10 ≈ 1,200–3,000 adopting apps**, install-skewed ~1.5×. **Sensitivity:** halve `p_job` and `c_ceiling` and it collapses to ~300–750 apps — a feature, not a platform API. The verdict is sensitive to exactly the two inputs with no empirical backing, which is *why the honest output is a developer-preview to measure them*, not a build commitment. Engineering-cost-avoided is real per-adopter (weeks of hand-rolled drift tooling) but multiplied by a small, uncertain base, it does not clear a 10× platform test on conservative inputs today.

---

## Adoption path

1. **The hook:** a single `codeGrader` assertion that fails CI when Nano returns malformed JSON — 15 minutes, catches the Palabrita F1 failure class immediately.
2. **First real integration:** a golden regression suite gating the rollout of a summarize/rewrite feature, replacing promptfoo-against-cloud-proxy with evaluation against the *actual* on-device model.
3. **The dependency:** the `@OnModelVersionChanged` gate wired into CI and release telemetry — once a team trusts it to catch drift before users do, removing it means going back to shipping blind, which they'd resent losing, not resent keeping.

**First adopter:** a team already on the Prompt API that has *already been bitten* — the #1061 reporter is a literal name. Second wave: the Apple-parity crowd (teams shipping the same feature on both platforms who now have Evaluations on iOS and nothing on Android). The funnel starts only if the hook is genuinely one assertion; a harness that needs a dataset first is a cold start with no seed side.

---

## Execution plan

- **Developer preview (2 quarters):** ship the harness over existing primitives + `countTokens()`; recruit 10–20 Prompt API teams; **collect the S1 evidence the sizing can't** — how many adopters, how many actually write a drift gate, whether usage correlates with Nano-reach growth. This phase exists to answer the demand question, not to make progress.
- **Beta — graduation condition:** a checkable threshold, e.g. ≥X preview teams keep a drift gate in CI after 60 days *and* Nano device reach crosses low-teens %. If reach stalls at ~3.7%, do not graduate — park it.
- **GA:** commit the output-stability policy and the version-change contract. This is the Type-E surface and the durable promise; a lifecycle contract broken is worse than one never made.
- **Org dependency, named honestly:** quality-eval belongs in ML Kit (it owns the Prompt API front door); device-fleet orchestration belongs in **AI Edge Portal** (it already runs the device farm). These must not fork. AI Edge Portal saying yes to a "run this eval across the Nano device matrix" hook is the one external dependency that, if refused, caps the idea at single-device CI.

---

## The case against

The strongest case is the **"undifferentiated against a free substitute" + "platform absorbs it" double bind**, and it is strong. The harness *orchestration* — datasets, graders, judges — is exactly what promptfoo gives away free to 26k stars, and for prompt *iteration* a cloud-Gemini proxy is good enough that most teams will never feel the on-device gap. The genuinely differentiated slice — evaluating the real Nano on the real device and catching silent version drift — is narrow, serves a tiny device-gated and nascent adopter base, and is demanded *structurally* but not *vocally*: not one developer has asked for it by name. Worse, Google markets "consistent quality across model versions" as a goal; if that claim is even partly honored, it shrinks the need. And the absorber here is plausibly Google's own roadmap — the prose page becomes a real harness in a quarter — which kills a third-party effort but is a win if this team owns it.

The honest mitigation is not to argue the case away — it is the verdict. This is why the recommendation is **Prototype, not Build**: the differentiated slice is real and matters precisely for the brand-can't-embarrass constraint, Apple validated the category one quarter ago, and the strategic-complement value (every GenAI API becomes safer to adopt when its output is measurable) exceeds the thin direct demand — but none of that is proven until a developer preview measures `p_job` and `c_ceiling`. Build the preview to kill or confirm the bet; don't commit the platform surface before it does.

---

## Kill criteria

**The single observation that would reverse this:** Google ships a real eval/drift harness for the managed Nano path (extending the [prose page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) into executable tooling) within ~2 quarters from a team that isn't ML Kit — the territory is taken and forking it would fragment the developer story further. Equally reversing: a developer preview shows single-digit adopters keeping a drift gate after 60 days.

**Load-bearing assumption:** that on-device GenAI adoption grows enough (Nano reach past low-teens %, GenAI-adopter app base into the low thousands) that a measurable base needs this within three years. If Nano reach stalls near 3.7%, the idea is correct and not yet urgent.

**Re-check trigger if shelved:** Nano reach crosses ~15% of actives, OR the EU DMA "equivalent performance" obligation (2027-08-01) forces a quality-measurement surface Google must ship anyway.

---

## Fit for this team

ML Kit, not AI Edge Portal, Firebase, or MediaPipe. ML Kit owns the Prompt API — the managed front door to Nano — and already ships the primitives the harness composes: `getBaseModelName()`, `checkFeatureStatus()`, and Structured Output. On-device token accounting belongs here too (Firebase's version is cloud-only by construction). The one shared surface is the device matrix: AI Edge Portal owns the fleet farm and should own "run this eval across every Nano version in the field," while ML Kit owns the quality-eval contract itself. If the two forked — a quality harness in ML Kit and a separate device-eval story in AI Edge — that fragmentation would be worse than not shipping, so the fit conclusion is conditional on those two teams sharing one surface.

---

## Open questions

- **Does the Prompt API expose a `seed`?** One check of the reference page listed it; a second of the get-started sample did not. It decides whether on-device output can be pinned bit-exact or only variance-reduced. Settle by reading the live `com.google.mlkit.genai.prompt` reference once Google docs are fetchable.
- **Do Nano v3→v4 outputs actually diverge on the same prompt, and by how much?** No published side-by-side exists; divergence is a confident architectural inference, not a measured fact. A 50-prompt A/B on a v3 and a v4 device would settle it and would itself be the preview's first dataset.
- **The "30–50% constraint-violation" figure** from the Palabrita study is quoted secondhand; the arXiv PDF wouldn't fetch this run. Verify before citing as load-bearing.
- **Count of apps shipping ML Kit GenAI** is published by no one. Without it, `p_job` is judgment. The developer preview is the only way to get it.

---

## Runners-up

- **Model-availability / download state machine (Type E)** — the strongest *vocal* demand in the tracker (#1061/#1078/#1062), but the reader would reach it first, and `checkFeatureStatus()` plus `getBaseModelName()` already address part of it; it's an extension, not whitespace. Lost on non-obviousness.
- **On-device safety/moderation classifier (Type G)** — real regulatory clock (minors-law, Play liability) and Bumble's open-sourced classifier prove demand, but a one-size classifier dies on contact with each app's proprietary policy surface. Lost on the tunability risk, parked for a dedicated run.
- **On-device neural TTS (Type A)** — genuine whitespace (Google ships nothing; Picovoice sells Orca), but weaker platform privilege (redistributable models exist) and no portfolio-complement leverage. Lost on G1.
- **Deferred/opportunistic inference scheduling (Type E)** — most novel, nobody ships it, maximal privilege, but demand is almost entirely inferred. Lost on S1 being unmeasurable this run.

---

*Sources:* [ML Kit GenAI overview (getBaseModelName)](https://developers.google.com/ml-kit/genai) · [ML Kit "evaluate prompt quality"](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit Prompt API get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started) · [ML Kit Prompt API blog](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) · [On-device inference / 140M devices](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html) · [Automated Prompt Optimization](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html) · [On-device GenAI APIs launch (2025)](https://android-developers.googleblog.com/2025/05/on-device-gen-ai-apis-ml-kit-gemini-nano.html) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [MediaPipe LLM Inference](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference) · [Qualcomm AI Hub](https://app.aihub.qualcomm.com/docs) · [Firebase AI Logic UsageMetadata](https://firebase.google.com/docs/reference/kotlin/com/google/firebase/ai/type/UsageMetadata) · [Apple Evaluations framework (WWDC26 s298)](https://developer.apple.com/videos/play/wwdc2026/298) · [Apple FM session 241](https://developer.apple.com/videos/play/wwdc2026/241) · [Apple FoundationModels docs](https://developer.apple.com/documentation/foundationmodels) · [ML Kit issue #1061](https://github.com/googlesamples/mlkit/issues/1061) · [#1078](https://github.com/googlesamples/mlkit/issues/1078) · [#1062](https://github.com/googlesamples/mlkit/issues/1062) · [#1072](https://github.com/googlesamples/mlkit/issues/1072) · [promptfoo](https://github.com/promptfoo/promptfoo) · [DeepEval](https://github.com/confident-ai/deepeval) · [Ragas](https://github.com/explodinggradients/ragas) · [Palabrita study (arXiv 2604.24636)](https://arxiv.org/abs/2604.24636) · [Palabrita issue #3](https://github.com/woliveiras/palabrita/issues/3) · ["(Why) Is My Prompt Getting Worse?" (arXiv 2311.11123)](https://arxiv.org/pdf/2311.11123) · [Nano 4 benchmarks](https://www.androidauthority.com/gemini-nano-4-benchmarks-3655763/) · [42matters text-processing SDKs](https://42matters.com/sdk-analysis/top-text-processing-sdks) · [EU DMA Alphabet interoperability decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)*
