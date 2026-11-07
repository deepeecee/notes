# ML Kit GenAI Observability — ship the ruler before you ship more features

**Type:** D (Tooling), with a Type-E accounting spine · **Verdict:** Prototype (developer preview) · **Opportunity: 6/10 (Parity play on a regulatory clock)**
*2026-11-07 · Prepared for Android ML Kit · Evidence current as of 2026-11-07*

> On a Tuesday this October an Android dev watched their on-device summarize feature quietly disappear for ~90% of users after a routine library bump, and found out from a product-funnel dashboard, not from any ML Kit tool — the share of users getting `FeatureStatus.AVAILABLE` fell from 8.7% on `genai-prompt` beta2 to between 0.6% and 1.4% on beta4, and "rolling back to beta2 is the only option we found" ([issue #1061](https://github.com/googlesamples/mlkit/issues/1061)). ML Kit GenAI ships five-plus capability APIs and **zero** ways to measure them: no usage/quota readout, no regression harness. Apple shipped exactly that stack on iOS five months ago.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Parity play on a regulatory clock | composite 3.45 × 2 = 6.9, −1 because durability sits at exactly 3; S1 not a 5, so no bonus |
| Platform privilege (gate) | 4/5 — pass | Per-inference token counts and inference/battery-quota headroom are AICore-internal; only the platform can expose them read-only. The eval-harness leg alone is not privileged (promptfoo exists). |
| Feasibility headroom (gate) | 5/5 — pass | No model to train; AICore already meters quota (`BUSY`, `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` exist). Apple shipping it ([WWDC26 241](https://developer.apple.com/videos/play/wwdc2026/241)) proves it on-device. |
| Durability (gate) | 3/5 — pass, flagged | A measurement API is more durable than a capability API, but metric stability across Nano refreshes is unaddressed and Google's API mortality prior is real. |
| Demand evidence (25%) | 3/5 | Cloud LLM-eval demand is strong and monetized; on-device-specific demand is real but latent — revealed by version-pinning and funnel-metric workarounds, not by a built tool. |
| Install-weighted reach (15%) | 3/5 | Bounded by ML Kit GenAI adoption, which is gated to ~3.7% of the fleet (any Nano) and far less for Nano 4. Grows with reach rather than being large today. |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The eval leg is borrowable (promptfoo/deepeval, free); the usage/quota leg is un-borrowable — no third party can read AICore's meters. |
| Integration cost / TTFHW (15%) | 4/5 | Usage readout is one call on an existing session: under 15 min, no new permission, negligible size. The eval harness is an afternoon, not minutes. |
| Substitute half-life (15%) | 3/5 | Two-to-three years. The accounting leg is structurally un-substitutable; the eval leg is exposed to OSS maturing and to Google's own Vertex-cloud prompt optimizer. |
| Strategic complement (10%) | 4/5 | Making GenAI *measurable* de-risks adoption of every other GenAI API and answers Apple; the EU DMA will force the accounting surface open regardless. |
| **Composite** | **3.45** | weighted mean of S1–S6 |

*Least trustworthy row: install-weighted reach. There is no published count of apps shipping ML Kit GenAI, so the denominator is inferred from the Nano device-reach figure, not measured.*

---

## The problem

The job, stated as a developer's: *"I shipped an on-device GenAI feature on ML Kit, and I cannot tell whether it still works, how much quota it is burning, or whether my next release made it better or worse — until users complain."* The customer is an Android engineer under a release deadline, and the competing solution is their own analytics plumbing.

Three structural facts about a large consumer Android app produce this, and they are not accidents of the current tooling. First, **the managed on-device path is nondeterministic by design**: AICore enforces a per-app inference quota surfacing as `ErrorCode.BUSY`, a battery-use quota (`PER_APP_BATTERY_USE_QUOTA_EXCEEDED`), foreground-only execution (`BACKGROUND_USE_BLOCKED`), and model availability gated on OEM/SoC/RAM tiers — all reasonable platform-protection mechanisms, and all invisible to the app until they fire as an exception. Second, **the model underneath moves**: Gemini Nano versions and the library's requested AICore feature-ID change under the app, so a feature that worked in testing breaks in the field on a device class the developer never saw. Third, **the org is server-side**: the app's ML people built cloud eval and observability dashboards years ago; nobody on the Android team has an on-device equivalent, so they fall back to raw product funnels.

What they do *instead* today is the thing worth pricing. They **pin library versions defensively** and watch business metrics as a proxy for model health — the [#1061](https://github.com/googlesamples/mlkit/issues/1061) author discovered a ~9× availability regression from a funnel chart and pinned to beta2. They **re-architect around undocumented quotas** after discovering them at runtime — the [#1069](https://github.com/googlesamples/mlkit/issues/1069) author's WorkManager "morning brief" had to be moved to the foreground because `BACKGROUND_USE_BLOCKED` is only learned "at runtime, on device." And for quality, they either ship blind or wire up a cloud eval stack (promptfoo, deepeval) that stops at the network boundary and never sees the on-device model at all. The workaround's cost — defensive pinning, surprise re-architectures, and quality flown blind — is the value of the API.

This is a platform problem, not an app problem: every ML Kit GenAI adopter hits the same quota semantics, the same model-version churn, and the same measurement vacuum, and solves them identically and badly. If apps solved it differently because it was their differentiation, it would not belong in the platform. They don't, and it does.

---

## Proof & signals

- **Developers doing it by hand (cloud, strong):** [promptfoo](https://github.com/promptfoo/promptfoo) is at ~26,900 stars with active CI wrappers around it; [deepeval](https://github.com/confident-ai/deepeval) is at ~19,300 stars. These prove the *prompt-regression / eval* workflow is a real, mature discipline — but every one of them captures traces server-side and none ships a mobile/on-device SDK. Evidence status: confirmed against the repos, Nov 2026.
- **Someone charging money for it:** LangSmith, Braintrust, Arize Phoenix, Langfuse, HoneyHive and Datadog all sell LLM observability/eval, with paid tiers. Willingness to pay for this capability is established. The entire paid category stops at the network boundary — none reads an on-device model's token or quota state. Evidence status: multiple 2026 vendor-comparison roundups; pricing is third-party-reported.
- **On-device-specific, revealed by proxy (the relevant signal):** a GitHub search for on-device/mobile LLM *eval* tooling returns **zero** repos against 600+ repos for *running* models on-device — nobody has built the tool yet, which is both the opportunity and the risk. The developer voice is in the ML Kit tracker: [#1061](https://github.com/googlesamples/mlkit/issues/1061) (availability regression caught by funnel metrics, "rolling back to beta2 is the only option we found" — verified verbatim; note the figures are one app's analytics and the feature-ID cause is an unconfirmed hypothesis), [#1069](https://github.com/googlesamples/mlkit/issues/1069) ("developers will design and build such architectures and only discover at runtime, on device, that they cannot work"), and a cluster of ~25 open Oct–Nov 2026 issues on availability/reliability drift across devices and library versions.
- **The absence signal:** no large consumer app has blogged about on-device LLM eval or monitoring — Meta, Snap and Grammarly publish on-device *modeling*, not on-device *measurement*. I read that as the discipline not yet existing on Android because the platform never made it possible, not as proof there is no need — a reading the #1061/#1069 pain supports but does not clinch. This is the honest soft spot in the demand case.

---

## Why now

1. **Capability shift — through Jul 2026.** ML Kit GenAI matured to a Beta Prompt API with structured output, system instructions and thinking mode, plus summarization, proofreading, rewriting, image description and speech recognition ([release notes](https://developers.google.com/ml-kit/release-notes)). A surface this broad with no measurement layer is now conspicuously incomplete — you can generate on-device but you cannot see what you generated or what it cost.
2. **Competitive shift — Jun 2026 (WWDC26), landed in iOS 26.4.** Apple shipped the full observability stack on-device: `tokenCount`/`contextSize`, a `usage` property reporting input, cached, output and *reasoning* tokens, a dedicated **Evaluations** Swift framework, a Python SDK for batch eval, and a Foundation Models Instrument for latency/throughput ([WWDC26 241](https://developer.apple.com/videos/play/wwdc2026/241); [Evaluations doc](https://developer.apple.com/documentation/foundationmodels/evaluating-prompts-to-measure-performance-and-improve-model-responses)). This is the decisive prior art: the gap is not "nobody ships this," it is "nobody ships this on Android."
3. **Regulatory + demand shift — 16 Jul 2026.** The EU DMA Article 6(7) decision against Alphabet (case DMA.100220) requires third-party AI assistants be given equal, free access to on-device models — Gemini Nano and the AICore runtime — by Android 18, no later than **1 Aug 2027** ([DMA case PDF](https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf)). A wave of new third-party AICore consumers arriving on a fixed date will need token/quota visibility and a way to test against a model they do not control. The clock is real and dated.

All three triggers are present and dated, which is rare — the why-now here is strong, not manufactured.

---

## The capability gap

- **ML Kit GenAI:** exposes a `countTokens` method, but only as an input-limit pre-check (input must stay under ~4,000 tokens) — not usage reporting, not cost, not quota headroom. Its "evaluation" answer is prose guidance plus **Automated Prompt Optimization**, a **Vertex AI cloud** service that uses server models to rewrite prompts ([APO blog](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api)) — a cloud prompt *optimizer*, not an on-device regression/observability harness. Checked: [Prompt API get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started), [release notes](https://developers.google.com/ml-kit/release-notes).
- **Firebase AI Logic:** has `countTokens`, but for the **cloud** Gemini path (returns billable characters), not the on-device AICore/Nano path ([doc](https://firebase.google.com/docs/ai-logic/count-tokens)).
- **MediaPipe / LiteRT:** generic text classification and latency/memory profiling; no token-accounting or eval harness for the GenAI path ([tasks](https://developers.google.com/edge/mediapipe/solutions/tasks)).
- **Qualcomm AI Hub Workbench:** real-device latency/throughput/memory profiling only — no accuracy/eval or shipped-app usage API ([doc](https://workbench.aihub.qualcomm.com/docs/hub/howitworks.html)).
- **Apple Foundation Models:** ships the whole thing on-device (above). This is the one negative that is a *positive* for the case — a direct competitor validating the capability.

**The main competitor a developer uses today** is not another platform — it is a cloud eval stack (promptfoo/deepeval wired to server traces) plus their own product-analytics funnel standing in for model health. Both stop at the network boundary; neither sees the on-device model.

---

## Proposed surface

Two legs, shipped in order. The spine is the privileged, demoable part; the harness is the Apple-parity part.

**Leg 1 — `usage` accounting (the privileged spine).** A read-only metadata object on every Prompt/feature response, plus a pre-flight quota query:

```kotlin
val response = prompt.generateContent(request)
val u = response.usageMetadata
//  u.inputTokenCount, u.outputTokenCount, u.cachedTokenCount
//  u.modelVersion            // e.g. "nano-v3" / requested AICore feature id
//  u.inferenceLatencyMillis

val budget = GenAi.quotaStatus()      // BEFORE you call, not after you fail
//  budget.inferenceQuotaRemaining, budget.batteryQuotaState, budget.isForegroundRequired
```

This is the un-borrowable piece: it surfaces counters AICore already computes internally, read-only. **It deliberately does *not*** guarantee availability, change scheduling, or let the app raise its own quota — that is a separate Type-E delivery-contract idea (a runner-up), and conflating them sinks both.

**Leg 2 — an on-device eval harness (the parity play).** A build/CI-time runner that takes a test corpus of prompts plus expected-property assertions (JSON-schema conformance, length bounds, a supplied judge, or golden outputs), executes against the on-device model on a connected device or emulator, and emits a pass/fail report plus a diff against the last run — so a team can gate a release on "the summarize feature did not regress when Nano updated." This leg *is* borrowable in the cloud; its value is that it runs against the actual AICore model the user will get, keyed to the `modelVersion` from Leg 1.

**Time-to-first-hello-world target: under 15 minutes for Leg 1.** What has to be true: it ships inside the existing `genai-prompt` artifact (no new dependency, no key, no new permission), and `usageMetadata` is a field on a response the developer already has. Leg 2 cannot hit 15 minutes — a corpus and a CI step is an afternoon — and that is a finding about the design: ship Leg 1 as the hook, Leg 2 as the retention.

---

## Reach & sizing

The honest inputs, each sourced, as a range not a point:

| Input | Value | Source |
|---|---|---|
| Android active base | ~3.8–3.9B (third-party; Google's last official was 3.0B in 2021) | third-party aggregators |
| Devices running any Gemini Nano | **140M+** (Google, Apr 2026) → ~3.7% of the base (my arithmetic) | Google announcement |
| Nano 4 (flagship-only) reach | ~1–3% of the base | single third-party estimate, no methodology |
| minSdk gate: API 26+ | ~94.8% of devices | [apilevels.com](https://apilevels.com/) / Statcounter |
| API 31+ (stricter GenAI gate) | ~69.3% | derived from [Google dashboard](https://developer.android.com/about/dashboards), Dec 2025 |
| On-device ML SDK install-weighting | ~10–12× (TFLite: ~0.9% of apps / ~11% of installs) | [AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) |
| Specialized on-device ML SDK adoption ceiling | ~1% of all apps | AppBrain (TFLite as comparable) |
| In-house eval harness build cost | ~4–12 engineer-weeks (minimal) to 6+ engineer-months (production) | my estimate, anchored to promptfoo/deepeval scale |

The binding constraint is not minSdk (94.8% clear API 26) — it is **Nano device reach**, because this tooling only matters to apps that have adopted ML Kit GenAI, and GenAI is gated to ~3.7% of the fleet today. So addressable install-weighted reach is small now and grows as Nano spreads: the tool's value curve rides the Nano adoption curve, not the Android base.

**Engineering cost avoided** is the platform-test numerator: every GenAI adopter either builds a partial version of Leg 1+2 themselves (weeks to months) or ships blind and pays in incidents (the #1061 regression is one such incident). Because adoption is early, the *aggregate* avoided cost is modest today — which is precisely why the verdict is Prototype, not Build.

**Sensitivity:** halve the GenAI-adoption assumption and halve the ~1% ceiling, and the reach case does not clear a Build bar — but the *strategic* case (Apple parity + DMA mandate) does not depend on reach math at all, and that is what carries the recommendation. The decision this needs is one experiment: a developer preview that measures whether GenAI adopters pull the usage API (see below).

---

## Adoption path

1. **The hook:** a developer already calling the Prompt API reads `response.usageMetadata` in one line and sees tokens, model version, and latency they were flying blind on. Fifteen minutes, in a build they already have.
2. **First real integration:** they add `GenAi.quotaStatus()` pre-flight checks to stop guessing about `BUSY`/battery quota, replacing hand-rolled retry heuristics — and wire Leg 2 into CI to gate releases on no-regression.
3. **The dependency they'd endorse:** once a team gates releases on the on-device eval harness keyed to `modelVersion`, removing it means shipping Nano updates blind again. That is a dependency they *want*, not resent — which is the only durable kind.

**First adopter:** an existing, vocal ML Kit GenAI integrator already burned by version drift — the [#1061](https://github.com/googlesamples/mlkit/issues/1061)/[#1069](https://github.com/googlesamples/mlkit/issues/1069) reporters are named, motivated candidates. **Second wave:** the third-party AICore consumers the DMA forces in by Aug 2027, who will need to test against a model they do not control from day one. The funnel starts because the first adopter already has the pain and the proof.

---

## Execution plan

- **Developer preview (Leg 1):** ship `usageMetadata` + `quotaStatus()` in `genai-prompt`. Question it answers: *do GenAI adopters actually read usage/quota when handed it?* Partners: the tracker's vocal integrators. Evidence it collects: the missing S1 — direct, non-proxy demand.
- **Alpha/Beta (Leg 2):** the eval harness. Graduation condition: ≥N preview partners gate a release on it and report catching a regression they would otherwise have shipped.
- **GA:** commit to a versioned `usageMetadata` schema *independent of the Nano model version* — the one durability commitment that matters, because the whole point is stability across model refreshes.

**Org dependencies, honestly:** the AICore team must agree to expose internal quota/token counters read-only — if they say no, Leg 1 dies and only the (borrowable, unprivileged) Leg 2 survives, which is not worth a report on its own. This is the single external yes the plan rests on.

---

## The case against

The strongest version: **this is a feature, not a platform API, until Nano reach grows.** Install-weighted reach is gated to ~3.7% of the fleet, the aggregate engineering cost avoided is small while adoption is early, and the eval leg is undifferentiated against free cloud tools developers already run. The live failure mode from the rubric's list is **"the platform absorbs the problem underneath you"** — Google's own Vertex AI Automated Prompt Optimization already occupies the eval conversation from the cloud, and ML Kit could fold a usage field into the Prompt API as a point fix without ever calling it observability, making this report's framing moot. A secondary failure mode is **durability**: if the `usageMetadata` schema is not versioned independently of the model, it becomes another deprecation-by-a-thousand-cuts surface and taxes the whole portfolio.

The mitigations, after the argument: the accounting spine (Leg 1) is genuinely un-absorbable by cloud tools and un-buildable by third parties — that is the part to lead with, and it is exactly what the DMA will force into existence anyway, so building it well now is strictly better than building it under a 2027 deadline. The reach objection is real and is *why the verdict is Prototype* — the preview exists to convert the proxy demand signal into a measured one before committing to GA.

---

## Kill criteria

**The single observation that would reverse this recommendation:** ML Kit ships a `usageMetadata`/usage field on the Prompt API response in a release before the developer preview launches — at which point the privileged spine is already done and only the unprivileged eval leg remains, which does not clear the bar alone. Checkable against the [release notes](https://developers.google.com/ml-kit/release-notes) each cycle.

**Load-bearing assumption:** that AICore's internal token and quota counters can be exposed read-only without a safety/abuse objection. Everything rests on this one yes.

**Re-check trigger if shelved:** Nano device reach crossing ~15% of the fleet (reach objection dissolves), or the DMA Android-18 implementation landing (third-party AICore consumers arrive and need this on a deadline).

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, because ML Kit GenAI is the sanctioned front door to AICore — it already owns the Prompt API surface the `usageMetadata` field hangs off, and it is the surface Apple's Foundation Models is being compared against. Firebase AI Logic owns the *cloud* usage/billing story and should not own the on-device one (splitting it across both is how the developer story fragments further). The one honest caveat: the eval *harness* could reasonably live with AI Edge Portal's device-farm tooling; if that team is the better owner of Leg 2, say so and keep Leg 1 in ML Kit. The accounting spine, however, belongs here or nowhere.

---

## Open questions

- **How many apps ship ML Kit GenAI today?** No count is published; the entire reach estimate is inferred from device reach. A Play SDK Index pull (renders only in a browser) would settle it.
- **Will AICore expose internal counters read-only?** The load-bearing yes; undetermined from outside.
- **Is `genai-text-to-speech` real?** One research pass reported an `alpha1` TTS library dated 26 Oct 2026; a second pass and a direct search did not find it. `[unverified]` — flagged because it would change the TTS runner-up, not the lead.
- **Did the #1061 availability regression have the feature-ID cause the reporter hypothesized?** The quote is verified; the causal claim is the reporter's hypothesis, confounded by app-side changes, and not confirmed by Google.

---

## Runners-up

- **On-device neural TTS (Type A):** strongest raw demand (Picovoice Orca monetizing; large OSS ecosystem) but the most crowded, and ML Kit *may* have shipped a TTS alpha in Oct 2026 `[unverified]` — if confirmed, this converts to a Type-B extension, not a new API.
- **Standalone on-device moderation classifier (Type G):** real Play-policy liability driver (P17/P18), but demand evidence is the thinnest of the slate — scattered DIY on the image side, near-silent on learned text toxicity. Needs a demand signal before it is worth a deep run.
- **Deferred/opportunistic inference scheduling (Type E):** the natural sibling to Leg 1's quota readout, and directly demanded by [#1069](https://github.com/googlesamples/mlkit/issues/1069), but it asks AICore to *change* behavior (schedule background inference), a far bigger commitment than exposing counters — deliberately split off so the observability idea stays shippable.
- **Sub-8GB reach tier for GenAI (Type F):** the highest-leverage idea in the space long-term (turns a 3.7% demo into a platform), but it failed the Feasibility gate for a *managed-model* framing this run — parked with a re-check trigger on small-model quality.

---

*Sources:*
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [ML Kit Prompt API — get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- [Automated Prompt Optimization for ML Kit GenAI (Android blog)](https://developer.android.com/blog/posts/how-automated-prompt-optimization-unlocks-quality-gains-for-ml-kit-s-gen-ai-prompt-api)
- [Firebase AI Logic — count tokens](https://firebase.google.com/docs/ai-logic/count-tokens)
- [Vertex AI prompt optimizer](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-optimizer)
- [MediaPipe Tasks](https://developers.google.com/edge/mediapipe/solutions/tasks)
- [Apple WWDC26 session 241 — Foundation Models](https://developer.apple.com/videos/play/wwdc2026/241)
- [Apple — Evaluating prompts to measure performance](https://developer.apple.com/documentation/foundationmodels/evaluating-prompts-to-measure-performance-and-improve-model-responses)
- [Apple Python Foundation Models SDK](https://github.com/apple/python-apple-fm-sdk)
- [Qualcomm AI Hub Workbench](https://workbench.aihub.qualcomm.com/docs/hub/howitworks.html)
- [promptfoo](https://github.com/promptfoo/promptfoo)
- [deepeval](https://github.com/confident-ai/deepeval)
- [ML Kit issue #1061 — availability regression across versions](https://github.com/googlesamples/mlkit/issues/1061)
- [ML Kit issue #1069 — BACKGROUND_USE_BLOCKED](https://github.com/googlesamples/mlkit/issues/1069)
- [EU DMA Alphabet interoperability case DMA.100220 (PDF)](https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf)
- [EU DMA developer portal — Alphabet AI interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [Android version dashboards](https://developer.android.com/about/dashboards)
- [apilevels.com](https://apilevels.com/)
- [AppBrain — machine-learning SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [Picovoice Orca on-device TTS](https://www.picovoice.ai/docs/orca/)
