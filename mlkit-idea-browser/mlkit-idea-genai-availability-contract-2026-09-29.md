# The Availability Contract — one call that makes an on-device GenAI feature safe to ship to every device

**Type:** C (developer experience), layered on E (delivery/lifecycle) and F (reach) · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Strong)**
*2026-09-29 · Prepared for Android ML Kit · Evidence current as of 2026-09-29*

> Right now an Android engineer shipping a "summarize this" button writes the button last. First they write `checkFeatureStatus()`, then a `DownloadCallback` with a progress spinner, then a `try/catch` that decodes `GenAiException` error code 9 — which means *either* "out of quota" *or* "you're in the background," the docs don't say which — and finally a hand-rolled fallback for the ~96% of their users whose phone can't run Gemini Nano at all. Google's own flagship sample app, `androidify`, ships exactly this boilerplate by hand ([PR #170](https://github.com/android/androidify/pull/170), merged Nov 2025). The button is four lines. The scaffolding around it is four hundred.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong | composite 3.65 × 2 = 7.3; no gate at exactly 3 (gates are 5/5/4) so no penalty; S1 is 4 not 5 so no bonus → 7 |
| Platform privilege (gate) | 5/5 — pass | Remaining quota and the download/availability state machine live in AICore; only the OS can expose them or commit an SLA. A Gradle library cannot. [GenAiException.ErrorCode](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode) |
| Feasibility headroom (gate) | 5/5 — pass | A contract/SDK layer over signals AICore already emits. No model to train. |
| Durability (gate) | 4/5 — pass | DMA forces an equal-performance availability contract by Aug 2027; but output/state stability across AICore versions is unaddressed today, and Google's API-mortality prior is real. |
| Demand evidence (25%) | 4/5 | Distinct open issues per pain point; two repos that exist *only* to detect readiness; Google's own sample hand-rolls it. Volume low (tiny device base), convergence high. |
| Install-weighted reach (15%) | 3/5 | Compounds across every GenAI API and many app categories, but execution is gated to ~3.7% of the fleet today; sizing under-instrumented (AppBrain blocked). |
| Build-vs-buy-vs-borrow (20%) | 3/5 | A free "borrow" (aicore-radar, MLKit-GenAI-Readiness) already does detection; the platform's delta is the parts they *can't* build — quota, SLA, managed model delivery. |
| Integration cost / TTFHW (15%) | 5/5 | Collapses ~400 lines to one call. One Gradle line, no new key, no new permission. |
| Substitute half-life (15%) | 3/5 | 2–3 years. The live absorption risk is Firebase AI Logic extending its mode-knob — Google's own roadmap eating it. |
| Strategic complement (10%) | 4/5 | Makes on-device GenAI reliable → more Android/Play engagement and device differentiation; mild tension that a good fallback layer also eases cloud/cross-platform routing. |
| **Composite** | **3.65** | Weighted mean → "Prototype and developer-preview, explicitly to collect S1 evidence." |

*Least trustworthy score:* **install-weighted reach (S2)**. AppBrain's SDK-adoption and category tables were egress-blocked this run, so the app-count TAM and the install-weighting multiplier are estimates, not sourced figures. Treat the sizing section as a bounded guess, not a number to commit to a plan.

---

## The problem

A large consumer Android app's core loop leaks users at exactly the moments an on-device model is supposed to help — the blank compose box, the wall of unread text, the review queue, the untranslated comment. ML Kit GenAI (Summarization, Rewriting, Proofreading, Prompt) exists to plug those leaks on-device: private, free per call, offline. But a 100M-install app operates under a constraint a demo app doesn't — its user base spans a six-year-old device fleet, and it cannot ship a feature that silently fails for most of them or embarrasses the brand with a broken spinner.

So before the app can use the model, it has to answer four questions the platform makes it answer itself:

1. **Is the model available for *this* user?** `checkFeatureStatus()` returns one of `UNAVAILABLE / DOWNLOADABLE / DOWNLOADING / AVAILABLE` ([Summarization docs](https://developers.google.com/ml-kit/genai/summarization/android)). The docs instruct: "call `checkFeatureStatus()` before showing any related UI" ([Prompt get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)) — i.e., the guard is the developer's job.
2. **Get the model onto the device.** Download is app-managed: on `DOWNLOADABLE` the app calls `downloadFeature()` and drives a [`DownloadCallback`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) (`onDownloadStarted/Progress/Completed/Failed`) to render its own progress UI. First inference needs network.
3. **Survive the runtime policy.** Transient failures arrive as [`GenAiException.ErrorCode`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode). Code **9 (`BUSY`)** conflates two unrelated causes — out-of-quota *and* disallowed-background-use — into one message ([issue #1070](https://github.com/googlesamples/mlkit/issues/1070)). Background inference is blocked outright ([#1069](https://github.com/googlesamples/mlkit/issues/1069)). There is no way to read remaining quota before you hit the wall.
4. **Decide what the other 96% see.** On `UNAVAILABLE`, the app must degrade to *something* — a cloud call, a smaller bundled model, a non-AI path, or a hidden button — and maintain that path forever.

This is structurally produced, not a bug. On-device inference on a heterogeneous fleet *requires* a capability-detection-plus-delivery-plus-degradation layer; the only question is who writes it. Today every integrator writes the same one, badly, because the platform exposes the primitives (states, callbacks, error codes) but not the contract that ties them together. That's the definition of a Type C opportunity in a mature SDK: the friction is structural, in the API contract, not incidental.

---

## Proof & signals

The demand evidence converges from independent directions, which is what makes it credible despite low absolute volume.

- **The platform's own showcase hand-rolls it.** `android/androidify` [PR #170](https://github.com/android/androidify/pull/170) (merged 2025-11-03) added a `GeminiNanoDownloaderInitializer` to manage download asynchronously and a manual fallback: *"If Nano is enabled and successful, its results are used; otherwise, it intelligently falls back to Firebase AI."* When the reference app needs a custom downloader and a Nano→Firebase fallback, the boilerplate is not yet an API. *(Confirmed, GitHub, 2026-09-29.)*
- **Two repos exist only to detect readiness.** `NagaYu/aicore-radar` ("measures on-device AI availability, latency, context window"; README: AICore "will happily tell you the API is present… what it doesn't tell you up front" — then lists hardware eligibility, download state, "quota blindness," foreground-only) and `AgiMaulana/MLKit-GenAI-Readiness` (reports `Ready / Needs download / Downloading / Unsupported / Error` and "points you at a self-hosted model (LiteRT-LM / Gemma) as the fallback"). These are hand-built versions of the exact façade — the copy-paste that signals an API. *(Confirmed, GitHub, 2026-09-29.)*
- **Recurring, still-open tracker issues, one per pain point.** Availability: [#1062](https://github.com/googlesamples/mlkit/issues/1062), [#1071](https://github.com/googlesamples/mlkit/issues/1071); download: [#1063](https://github.com/googlesamples/mlkit/issues/1063); quota/background: [#1070](https://github.com/googlesamples/mlkit/issues/1070), [#1069](https://github.com/googlesamples/mlkit/issues/1069). The quota issue is filed by a shipping dev with an explicit ask: *"Ideally expose remaining quota so apps can failover before exhaustion."* The background issue is a production weather app: *"a WorkManager-based morning brief had to be redesigned around foreground-only generation after the failure was discovered on hardware… expose the policy programmatically so apps can proactively route to server fallbacks rather than discovering limitations at runtime."*
- **Independent blog authors publish the same pattern as a lesson.** e.g. ["Gemini Nano Isn't on Most of Your Users' Phones — the Feature-Detection Pattern That Doesn't Embarrass You in Production"](https://dev.to/yadnyesh_rana/gemini-nano-isnt-on-most-of-your-users-phones-heres-the-feature-detection-pattern-that-doesnt-58dl) and ["Building a 3-tier on-device AI concierge: Gemini Nano → MiniLM → keyword"](https://dev.to/tony_hildn_26f6eb18f87d2/building-a-3-tier-on-device-ai-concierge-gemini-nano-minilm-keyword-0query-30aj) — a fully hand-built degradation ladder.
- **The absence signal:** repo stars are near-zero and r/androiddev is quiet. Read honestly, that reflects a device base still tiny and allowlisted and APIs ~1 year old — the pain is concentrated in the few first-movers actually shipping, not absent. **No commercial vendor is charging money for exactly this façade** — which is why S1 is a 4, not a 5.

---

## Why now

1. **Capability shift.** The GenAI surface only recently became broad enough to have a *portfolio* availability problem: Prompt reached Beta (Jan 2026), Structured Output/System Instructions/Thinking Mode landed (Jul 2026). Every API added multiplies the same per-feature detection boilerplate. *(Google release notes, dated.)*
2. **Regulatory shift — a real statutory clock.** EU DMA Article 6(7) decision **Case DMA.100220** (adopted **16 July 2026**, [case PDF](https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf)) requires Alphabet to expose 11 Android features across four categories, and — the load-bearing part — under "access to resources" to let third-party AI services **call Android's on-device Gemini Nano models** *and* **install and run their own on-device models** at equal performance, by **Android 18 / 1 August 2027** (one narrow always-on-hotword feature deferred to Aug 2028). After that date an app faces *more* on-device model providers, not fewer — so "which model is available for this user, and what do I fall back to" stops being a Nano-only question and becomes a multi-provider one. The obligation is FRAND-flavored ("equally effective," "non-discriminatory"), which is close to describing an availability contract. *Hedge: Google is appealing; scope could narrow. Verify the exact "access to resources" wording in the PDF before quoting.*
3. **Demand shift.** Firebase ML shuts down **15 June 2027** ([migration docs](https://developers.google.com/ml-kit/migration)) — six weeks before the DMA deadline — pushing custom-model inference toward LiteRT and forcing a wave of teams to re-architect their on-device AI plumbing anyway. And Apple is moving the same direction: at WWDC26 Foundation Models opened a swappable `LanguageModel` provider protocol (OS 27), making the multi-provider availability problem industry-wide.

Three dated forces, all pointing at 2027. This is a rare case where cost-of-delay reasoning genuinely applies.

---

## The capability gap

Be exact about the boundary:

- **ML Kit GenAI** ships (a) availability states and (b) app-driven download callbacks, and surfaces (c) as raw error codes — but offers **zero** built-in degradation/fallback (d). No cloud fallback, no reduced on-device tier, no quota introspection. *(Confirmed via docs + issues, 2026-09-29.)*
- **Firebase AI Logic** is the only vendor shipping a one-knob degradation façade — `inferenceMode ∈ {PREFER_ON_DEVICE, PREFER_CLOUD, ONLY_ON_DEVICE, ONLY_CLOUD}` ([Android get-started](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started)). But its **only fallback tier is the paid, network-dependent cloud** (default `gemini-2.5-flash-lite`); on Android its on-device path is just Nano via ML Kit, inheriting the same flagship gating. It does not manage the availability state machine or download UX for you, and it's still labeled Experimental.
- **Apple Foundation Models** exposes availability only — `SystemLanguageModel.availability` → `available` / `unavailable(deviceNotEligible | appleIntelligenceNotEnabled | modelNotReady)` ([docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum)) — and leaves degradation to the app. No download-progress API beyond the coarse `modelNotReady`.
- **Qualcomm (AI Hub/GenieX), MediaPipe LLM Inference, LiteRT-LM** are raw load-and-run runtimes: no managed availability contract, no transient-error policy, no degradation policy.

**No vendor ships the full four-part contract — (a) availability + (b) readiness/download + (c) transient-error policy + (d) app-chosen degradation — as one primitive.** The pieces are scattered across products, and the one degradation knob that exists (Firebase) only knows how to spend money on the cloud.

**Main competitor:** not another platform — it's the developer's own copy-pasted `checkFeatureStatus()` block, with Firebase AI Logic's mode-knob as the closest managed alternative.

---

## Proposed surface

A single façade over the existing GenAI clients that turns a task call into a policy-driven request. The developer declares *intent and degradation policy once*; the SDK owns the state machine.

```kotlin
// One builder. The developer never writes checkFeatureStatus, DownloadCallback,
// or GenAiException handling again.
val summarizer = GenAiTask.summarizer {
    // The degradation ladder, declared once, top to bottom:
    onUnavailable = Degrade.to(
        ReducedOnDevice,          // platform-managed small model, if the app opted in
        CloudHandoff(firebase),   // explicit, developer-supplied, network+cost
        Hide                      // last resort: caller learns the feature is off
    )
    autoDownload = WhenOn(Wifi, Charging)   // platform owns the download + progress stream
    onBusy = Retry.withBackoff(maxWait = 30.s) then CloudHandoff(firebase)
}

// Availability + download + quota + fallback all collapse into a typed result:
when (val r = summarizer.run(article)) {
    is Ok        -> render(r.text, tier = r.serviceTier)   // AICore_NANO | REDUCED | CLOUD
    is Deferred  -> showDownloadProgress(r.progress)       // model arriving
    is Off       -> hideSummarizeButton(r.reason)          // typed, branchable
}
```

Three things only the platform can put in this box, and they are the whole point:

- **`remainingQuota()` / a `serviceTier` on every result** — read from AICore, which a Gradle library cannot see. Directly answers issue #1070's ask.
- **A managed download contract** — `autoDownload = WhenOn(Wifi, Charging)` with a single observable progress stream, instead of every app driving its own `DownloadCallback`.
- **An optional platform-delivered `ReducedOnDevice` tier** — a small managed model (Gemma-E2B-class) for summarize/rewrite on sub-Nano devices, so degradation isn't forced to mean "pay for cloud."

Exclusions matter: the façade does **not** invent a magic model that matches Nano on a budget phone, does **not** hide which tier served a result (the `serviceTier` is always surfaced — see the safety section), and does **not** silently route to cloud without the developer wiring `CloudHandoff` explicitly.

**Time-to-first-hello-world target: under 15 minutes**, one Gradle line, no console key, no new dangerous permission. Achievable *because* the façade removes the four things that currently blow past an afternoon. If the `ReducedOnDevice` tier requires the app to bundle/download a model, that tier alone breaks 15 minutes — which is why it's opt-in and off the default path.

---

## Reach & sizing

*Show the arithmetic; the inputs are partly blocked, so this is a bounded estimate, not a committed number.*

- **The gap the façade sits on.** Gemini Nano: **"over 140 million devices"** (Google-published, [Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html), and the identical phrasing repeated Jul 2026 — flat for ~11 months). Against ~3.8B Android actives (third-party estimate), that's **~3.7%** (band 3.3–4.0% across denominators 3.5–4.2B; *my arithmetic, Google numerator ÷ third-party denominator*). ML Kit GenAI's own APIs target API 26+ = **96.1%** and API 31+ = **78.8%** of the fleet ([apilevels.com](https://apilevels.com/), Statcounter Apr 2026). The ~25× gap between "the SDK installs everywhere" and "the model runs on 3.7%" is the reach problem, and it is exactly the surface a degradation contract governs.
- **Is a non-cloud reduced tier real?** Yes, technically. MediaPipe LLM Inference runs Gemma-3n/4-E2B (2–3 GB RAM, ~50 tok/s decode on Android GPU, MMLU-Pro ~60) — credible summarize/rewrite quality below the Nano bar, degrading to single-digit tok/s on CPU-only budget devices. EmbeddingGemma (308M, <200 MB) covers retrieval/classification on essentially any phone. So the `ReducedOnDevice` tier is buildable — but someone must own model delivery and device-class gating, which is the managed gap.
- **App-side TAM (weak this run).** AppBrain's SDK and category tables were egress-blocked; only one figure surfaced: **Tools = 23,870 apps with ≥50K installs** (third-party, AppBrain). The six GenAI-text-relevant categories (Tools, Productivity, Communication, Social, News, Education) plausibly total ~60–120K such apps, but only Tools is sourced. The install-weighting multiplier (%installs ÷ %apps for a comparable on-device ML SDK) was **not derivable** — flag as an open question.
- **Sensitivity.** The verdict does not rest on the app TAM (which is soft) — it rests on demand convergence (S1) and platform privilege (G1), both of which are well-sourced. Halving the TAM leaves the recommendation (Prototype) unchanged. It would flip toward Build if the install-weighting multiplier and a committed `ReducedOnDevice` tier turned the ~3.7% execution ceiling into effective majority reach — which is the one experiment worth running.

---

## Adoption path

1. **The hook (15 min):** replace a 400-line hand-rolled availability block with one builder and a typed `when`. The first-movers who wrote aicore-radar and MLKit-GenAI-Readiness delete their code on day one.
2. **First real integration:** an app ships the summarize/rewrite feature to *all* users — Nano tier where eligible, an honest degraded or cloud tier elsewhere — instead of hiding the button for 96% of the base. Replaces both the custom downloader and the DIY fallback (androidify's exact situation).
3. **The dependency:** once an app relies on `remainingQuota()` and the managed download/`serviceTier` contract, removing the façade means rebuilding the quota-aware, tier-aware failover by hand — a dependency they'd endorse, not resent.

First adopter: a shipping GenAI early-mover already fighting the boilerplate (the weather-app and batch-pipeline authors in #1069/#1070 are named, real, and asking for this). Second wave unlocks when one visible app demonstrably serves a GenAI feature to its whole base via the degradation ladder.

---

## Execution plan

- **Developer preview:** ship the façade over *existing* GenAI clients with `remainingQuota()`, managed download, and `CloudHandoff`/`Hide` degradation only (no `ReducedOnDevice` yet). Question it answers: do the early-movers replace their hand-rolled blocks, and does exposing quota actually eliminate the #1070/#1069 failure class? Partners: the tracker issue authors.
- **Alpha/Beta — graduation condition:** ≥N preview apps delete their custom availability code and adopt `serviceTier` in production; quota-related crash/BUSY reports on those apps drop measurably. Add the opt-in `ReducedOnDevice` tier only if preview shows degradation demand exceeds cloud-handoff demand.
- **GA:** commit a frozen availability/state-machine contract and an output-stability policy for the `serviceTier` labels across AICore versions.

**Org dependencies (honest):** this needs the **AICore team** to expose remaining-quota and a managed-download signal (today's blocker), and it steps on **Firebase AI Logic's** hybrid-inference territory — the degradation knob overlaps. If those two teams don't say yes, the façade degrades to a thin client-side wrapper (the borrow path) with no privileged signals, and the idea loses its gate. That negotiation *is* the project.

---

## The case against

The strongest case is **absorption by Google's own roadmap (failure mode #2), specifically Firebase AI Logic.** Firebase already owns the one shipping degradation knob. It is entirely plausible that the right home for "availability + fallback" is Firebase extending `inferenceMode` to manage the download state machine and expose quota — in which case a *new ML Kit* façade fragments the developer story further, which is this ecosystem's chronic self-inflicted wound (ML Kit vs MediaPipe vs LiteRT vs Firebase already forces a choice for "summarize this"). The honest rebuttal is narrow: Firebase's answer is cloud-first and cross-platform, whereas the highest-value version of this is on-device-first with a managed reduced tier and no mandatory cloud spend — a different product with a different owner. But if Firebase adds an on-device reduced tier and quota introspection first, this idea is redundant.

Second: the **borrow path is free and improving** (aicore-radar, MLKit-GenAI-Readiness). If the platform never exposes quota or a managed download/reduced-tier — the parts a library can't build — then the façade collapses to what those libraries already do for zero dollars, and G1/S3 both fail. The privileged signals are load-bearing; without them there is no platform API here, only a nicer wrapper.

Mitigation for both: scope the preview to the *privileged* parts (quota, managed download, `serviceTier`) and measure whether they eliminate a failure class the borrow libraries demonstrably can't. If they don't, shelve it.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Firebase AI Logic ships managed availability + download + `remainingQuota` + an on-device reduced tier under its existing `inferenceMode` before this reaches Beta — then the capability exists, in the wrong-for-this-idea-but-real place, and ML Kit should not duplicate it.

**Load-bearing assumption:** that the AICore team will expose remaining-quota and a managed-download signal to a public API. Everything privileged about this idea rests on that one yes.

**Re-check trigger if shelved:** the DMA obligation going final on appeal (locking in a multi-provider on-device world by Aug 2027), or Nano-eligible reach crossing ~15–20% of the fleet (making the degradation ladder matter to mainstream, not just early, apps).

---

## Fit for this team

ML Kit owns the GenAI task APIs the boilerplate is written against, so the façade belongs where the `checkFeatureStatus()` guard already lives — a Type C fix to a surface ML Kit already owns. The honest caveat is the Firebase overlap above: if leadership judges that hybrid availability belongs with Firebase AI Logic, that's a legitimate conclusion, and the more valuable output of this report than a territorial claim. What is *not* legitimate is the status quo, where the platform ships the primitives and makes every app assemble the contract itself.

---

## Open questions

- **Install-weighting multiplier and category TAM** — AppBrain tables were egress-blocked. Settle by opening the SDK-adoption and category pages in a browser and reading %apps/%installs for a comparable on-device ML SDK.
- **Will AICore expose remaining quota?** The entire privilege case depends on it. Settle with the AICore team directly.
- **Does the DMA "access to resources" wording actually cover calling Nano and admitting third-party ODMs?** Verify the exact language in [DMA_100220_2683.pdf](https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf) before quoting; sources agree but the primary wasn't directly fetchable this run.
- **Output-stability of `serviceTier` semantics across AICore versions** — the durability risk; needs a versioning contract before GA.

---

## Runners-up

- **On-device eval / regression-testing harness (Type D)** — Apple shipped an Evaluations framework + token counting; ML Kit publishes a prose "evaluate prompt quality" page with no harness behind it. Sharp competitive gap; dropped because **Platform Privilege is weaker** (a three-person team can ship an eval library — G1 risk), and it doesn't compound across the fleet the way the availability contract does.
- **On-device neural TTS API (Type A)** — clean whitespace (Picovoice Orca charges for it; Apple added speech generation; Android's `TextToSpeech` is a decade-old parametric API). Dropped because a whole new audio-model surface is a heavier Feasibility/Durability bet, and it arguably belongs in the Android framework, not ML Kit.
- **Callable on-device moderation classifier for user content (Type G)** — strong DMA/Play-liability framing (developers own generated-output liability). Dropped this run because trust-and-safety teams treat moderation as proprietary policy, so a one-size classifier risks being unusable without deep tunability — a real gate risk to resolve before proposing.
- **Deferred / opportunistic inference scheduling — "run this batch when charging, on wifi, idle" (Type E)** — directly implied by the foreground-only/BUSY pain (#1069/#1070). Dropped as the lead but **partially absorbed** into this idea's `autoDownload = WhenOn(...)` and `onBusy` policy; worth a standalone report later.

---

*Sources:*
- https://developers.google.com/ml-kit/genai/summarization/android
- https://developers.google.com/ml-kit/genai/prompt/android/get-started
- https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback
- https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode
- https://developers.google.com/ml-kit/release-notes
- https://developers.google.com/ml-kit/migration
- https://github.com/android/androidify/pull/170
- https://github.com/googlesamples/mlkit/issues/1070
- https://github.com/googlesamples/mlkit/issues/1069
- https://github.com/googlesamples/mlkit/issues/1063
- https://github.com/googlesamples/mlkit/issues/1062
- https://github.com/googlesamples/mlkit/issues/1071
- https://github.com/NagaYu/aicore-radar
- https://github.com/AgiMaulana/MLKit-GenAI-Readiness
- https://dev.to/yadnyesh_rana/gemini-nano-isnt-on-most-of-your-users-phones-heres-the-feature-detection-pattern-that-doesnt-58dl
- https://dev.to/tony_hildn_26f6eb18f87d2/building-a-3-tier-on-device-ai-concierge-gemini-nano-minilm-keyword-0query-30aj
- https://firebase.google.com/docs/ai-logic/hybrid/android/get-started
- https://developer.android.com/ai/hybrid
- https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum
- https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android
- https://developers.googleblog.com/en/introducing-embeddinggemma/
- https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html
- https://apilevels.com/
- https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf
- https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en
- https://support.google.com/googleplay/android-developer/answer/14094294
