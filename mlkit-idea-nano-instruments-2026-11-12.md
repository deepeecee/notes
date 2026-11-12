# Run digest — ML Kit idea browser · 2026-11-12

*This skill **generates** opportunity ideas by first-principles derivation plus live research; it does not read an external idea feed. So there is no author / vote / status / tag metadata to pull — those fields don't exist for generated ideas. In their place each idea below carries its **type**, **verdict**, **opportunity score**, and **run status** (lead vs. runner-up vs. killed-at-gate). No prior-run ledger was found in the working directory, so this is treated as a first run; nothing is a repeat.*

**Top ideas surfaced this run (most to least promising):**

| # | Idea | Type | Opportunity | Run status |
|---|---|---|---|---|
| 1 | **Nano Instruments** — on-device GenAI eval, usage/quota accounting, and output-stability regression for ML Kit | D (tooling) + E spine | **6/10 — Prototype** | **Lead — taken deep below** |
| 2 | On-device neural TTS as a modern developer API | A | ~5/10 | Runner-up — strong demand (Picovoice Orca), but G1 privilege only moderate (Piper/OSS TTS ships) |
| 3 | Deferred / opportunistic on-device inference scheduling ("run when charging, idle, on wifi") | E | ~5/10 | Runner-up — max platform privilege, but S1 demand thin and invisible-in-demo |
| 4 | GenAI reach tier for sub-8 GB devices (graceful degradation below the Nano gate) | F | ~4/10 | Runner-up — feasibility is the whole game; honest quality-per-tier unproven |
| 5 | Standalone on-device content-moderation classifier for *user* content | G | ~4/10 | Runner-up — real DMA/policy pull, but one-size classifier dies on contact with a T&S team unless tunable |

**Flagged as trending / high-priority this run:** the **competitive clock** — Apple shipped a first-party on-device **Evaluations framework** (iOS 27, WWDC26) plus granular token accounting (iOS 26.4), directly on this territory, and this is the sharpest competitive move against idea #1 since the August snapshot. The **EU DMA Article 6(7)** interoperability clock (compliance 2027) is a secondary why-now. Both are argued in the report.

> **Evidence-quality disclosure:** in this cloud session, WebFetch could not resolve Google-owned hosts (`developers.google.com`, `android-developers.googleblog.com`), AppBrain, apilevels, or the EU DMA portal — only `developer.apple.com` resolved directly. So every Google/AppBrain/DMA claim below was reconstructed from WebSearch extractions of those exact pages, **not a direct page read**; Apple's WWDC26 transcripts *were* fetched directly. Where a figure could not be read at all (e.g. AppBrain's ≥50K-installs column), it is labelled an estimate. This is a weaker evidence base than a direct fetch and the report is caveated accordingly. To harden it, these hosts need adding to the session's network allowlist.

---
---

# Nano Instruments — the on-device AI feature you can't measure is the one you're afraid to ship

**Type:** D (Tooling), with a Type E (lifecycle) spine · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (reach-gated infrastructure)**
*2026-11-12 · Prepared for Android ML Kit · Evidence current as of 2026-11-12*

> A developer at a 100M-install note-taking app ships a Gemini Nano summarizer. It works. Six weeks later AICore swaps nano-v3 for nano-4 underneath them, outside their release train, and summaries start truncating mid-sentence for a cohort of users — but their crash-free rate is green, their dashboards show nothing, and the first they hear of it is a one-star review. On the same app, a batch job silently dies after ~40 consecutive generations with `ErrorCode.BUSY` against a per-app inference quota that **is documented nowhere**, so an engineer is counting requests by hand to reverse-engineer the ceiling ([ML Kit issue #1070, Aug 2026](https://github.com/googlesamples/mlkit/issues/1070)). Google's advice for both: [a prose web page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) telling them to "run your evaluation dataset and record the outputs… evaluate manually or use LLM-as-a-judge." No harness. No drift signal. No usage meter.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **6/10 — reach-gated infrastructure** | composite 3.45 × 2 = 6.9, −1 because Durability gate scores exactly 3; S1 is 4 not 5, so no +1. I considered 7 on the strength of the demand evidence and the uniqueness of the drift whitespace; the sub-1% reach and the durability question hold it to 6. |
| Platform privilege (gate) | 4/5 — **pass** | Drift-across-model-update, quota state, and version lifecycle are platform-only: only AICore knows when Nano is swapped, and [no Nano runs on a CI runner](https://github.com/googlesamples/mlkit/issues/1070). Not 5 because the generic LLM-as-judge slice is borrowable (cloud Vertex, or promptfoo via a bridge). |
| Feasibility headroom (gate) | 4/5 — **pass** | Tooling, no model to train. The one hard part — running the real on-device model in CI — is itself part of the product (a device-farm/emulator eval runner), not a blocker. |
| Durability (gate) | 3/5 — **pass, flagged** | An output-stability *contract* is a multi-year commitment Google has not signalled; ML Kit / MediaPipe / Firebase AI Logic overlap is unresolved; the [Google API-mortality prior](https://killedbygoogle.com/) is real and is itself an adoption cost. |
| Demand evidence (25%) | 4/5 | First-party issue tracker (#1070 quota-by-hand, [#1061 beta3 version regression](https://github.com/googlesamples/mlkit/issues/1061), [#972 can't tell which Nano version runs](https://github.com/googlesamples/mlkit/issues/972)); an [Apr 2026 arXiv paper](https://arxiv.org/abs/2604.24636) cataloguing on-device degradation after 3–5 generations; a monetized but **cloud-only** eval market (promptfoo, DeepEval, Braintrust, LangSmith). On-device-specific signal is moderate-but-converging, not yet loud. |
| Install-weighted reach (15%) | 2/5 | Live-feature reach gated by Nano's ~3.7% device base → **well under 1% of the Android install surface** either way (my arithmetic, below). Held off 1 by the ~10× install-skew of on-device ML SDKs and the rollout trajectory. |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The on-device **borrow** path is weak: no on-device eval harness has traction, cloud tools can't reach Nano, and drift detection is genuinely hard to DIY (#1070 is a team doing exactly this by hand). |
| Integration cost / TTFHW (15%) | 3/5 | Token/quota metering can hit a 15-minute hello-world (a Gradle line + a JUnit rule); the eval-in-CI half carries real friction — the model can't run on a stock CI runner. |
| Substitute half-life (15%) | 3/5 | The generic eval-harness slice could be absorbed by a general model or cloud tooling inside ~2 years; the drift/quota/version-accounting core is tied to platform internals a substitute structurally can't reach. |
| Strategic complement (10%) | 5/5 | An unmeasurable API is one developers are afraid to ship. Making measurement free de-risks adoption of the **entire** ML Kit GenAI portfolio — the thing Google actually defends (on-device-AI developer gravity, Android differentiation). |
| **Composite** | **3.45** | Prototype / developer-preview band (3.0–3.9). |

*Least trustworthy row: install-weighted reach. The AppBrain ≥50K-installs column never rendered, so the app-count base is my estimate; the **direction** (sub-1% surface, gated by Nano penetration) is robust, the absolute app count is soft.*

---

## The problem

The job, stated as an engineer's job under a deadline: **"Prove my on-device AI feature still works — the same way it did last release — before my users find out it doesn't, and without a model I can run in CI."** The customer is an Android engineer at a large consumer app, not an ML researcher; the competing solution is their own hand-rolled test loop, or nothing.

This problem is *structurally produced* by the constraints a large consumer Android app operates under, not by a fixable bug:

1. **The model is shared, managed, and moves underneath the app.** ML Kit GenAI runs a single Gemini Nano instance managed by AICore; the app gets no private copy and cannot pin a version. When AICore ships nano-4 (Gemma-4-based, [per Google's July 2026 on-device-inference post](https://android-developers.googleblog.com/)), outputs change on a schedule the app does not control and cannot see coming. The only related primitive is `getBaseModelName()` — *detection*, not pinning, and no drift signal.
2. **The brand can't ship an embarrassing output.** A 100M-install app treats a regression in a user-facing summary as a Sev2. That raises the bar for *testing* the model far above any benchmark number — to the level where they need regression gates in CI, which is exactly what they can't build because the model isn't on the runner.
3. **The runtime has invisible walls.** A per-app inference quota surfaces only as `ErrorCode.BUSY` (code 9) with no documented size or retry semantics (#1070); background inference is blocked as `BACKGROUND_USE_BLOCKED` (code 30, [#1069](https://github.com/googlesamples/mlkit/issues/1069)). Apps discover these in production, by hand.
4. **Their ML people are server-side; their Android people aren't ML people.** Evaluation, LLM-as-judge rubrics, and token budgeting are skills the median Android team doesn't have in the same head that writes the Kotlin — so a platform that ships the harness captures disproportionate value.

What they do *instead* today: assemble a few sample inputs, eyeball outputs after each release, pin to an old SDK `beta` to dodge behaviour changes (#1061), count requests by hand to find the quota wall (#1070), or build a bespoke harness because [lm-eval-harness "didn't fit an on-device inference loop"](https://dev.to/). Every large GenAI app solves this identically and badly — the signature of a **platform** problem, not an app problem.

**Which type?** This problem admits several (idea-types.md). Type B: add a richer status/usage enum. Type D: ship the measurement tooling. Type E: commit to an output-stability SLO and expose the state machine. I lead with **D** because it's the fastest to ship with no model to train and collects the demand evidence the E-commitment would need; the E spine (an output-stability *contract*) is the durable endgame but is a heavier organizational bet, so it follows rather than leads.

---

## Proof & signals

- **Developers doing it by hand (first-party, dated, load-bearing):**
  - [#1070 (Aug 2026, open)](https://github.com/googlesamples/mlkit/issues/1070): *"After roughly 36–41 consecutive generations… every subsequent request fails fast with `ErrorCode.BUSY`… neither the quota's existence, its approximate size, nor the retry-delay semantics are documented… expose remaining quota (even coarsely) so apps can route to a fallback before hitting the wall."* A team reverse-engineering an accounting primitive the platform withholds.
  - [#1061 (Jul 2026, open)](https://github.com/googlesamples/mlkit/issues/1061): a `genai-prompt` beta3 update *"cannot reach the Prompt API at all on a Pixel 10 where beta1 and beta2 work fine."* A silent cross-version regression — exactly what a harness gates.
  - [#972 (open)](https://github.com/googlesamples/mlkit/issues/972): a developer cannot tell whether nano-v2 or v3 is actually running. Output-provenance opacity.
- **Someone charging money for the job:** promptfoo (paid enterprise + usage-based), DeepEval monetized via Confident AI (free tier deliberately capped to "5 test runs/week, 1 week retention"), Braintrust, LangSmith, Ragas. The market pays for LLM-output eval/regression — but **every one is cloud/server-side; none reaches an on-device model.** Willingness-to-pay for the job, with the on-device variant vacant.
- **Independent catalogue of the failure modes:** [arXiv 2604.24636, "Less Is More: Engineering Challenges of On-Device SLM Integration" (Apr 2026)](https://arxiv.org/abs/2604.24636) names output-format violations, constraint violations, context degradation, and model-selection instability, and reports output quality *"degrades rapidly after 3–5 generations."* [Single peer-reviewed paper — treat as one strong signal, not a literature.]
- **Hand-rolled general tooling (revealed demand, off-device):** dozens of 2026 repos independently rebuild prompt-regression and token-counting (`agentprdiff` — *"snapshot tests that flag behavior changes when models, prompts, or vendors are swapped"*; `promptdrift`; `prompt-replay`). The job is real; nobody has built the **on-device** one with traction.
- **The absence signal:** searching Meta/Snap/Duolingo engineering blogs surfaced **no** post on evaluating on-device LLM output regression; only [Grammarly](https://www.grammarly.com/blog/engineering/) describes a bespoke internal process ("no degradation vs the prior cloud model"). The quietness means the population is small and early — which caps reach today and is the honest weak spot in the demand case, not a reason to dismiss it.

---

## Why now

1. **Capability shift (2025→2026):** on-device GenAI went from demo to shippable — ML Kit Prompt API reached **Beta** (`genai-prompt:1.0.0-beta4`), Structured Output and multi-image landed, and Gemini **Nano 4** (Gemma-4-based) began rolling. Shippable features create the need to *keep* them shipped — i.e. to regression-test them.
2. **Competitive shift (WWDC26, Jun 2026):** Apple shipped a first-party, on-device **Evaluations framework** ([session 298](https://developer.apple.com/videos/play/wwdc2026/298)) integrated with Swift Testing, with first-class model-as-judge and metric aggregation, plus granular token accounting ([session 241](https://developer.apple.com/videos/play/wwdc2026/241), iOS 26.4) exposing input/output/**cached**/**reasoning** token splits. Google's answer on the same territory is a prose page. This is the live clock.
3. **Regulatory shift (DMA, compliance 2027):** the EU opened [Article 6(7) proceedings against Alphabet (27 Jan 2026)](https://digital-markets-act.ec.europa.eu/), with implementation measures (~Jul 2026) requiring on-device models be exposed to third parties "at equivalent performance." "Equivalent performance" is a latent *measurement* hook — if Google must prove equivalence, it needs the eval tooling anyway. No operationalized benchmark is defined yet, so this is a supporting beat, not the spine.

Three datable shifts converge — a rare case where the why-now is strong rather than manufactured.

---

## The capability gap

Checked against each stack (negatives carry the page checked):

- **ML Kit GenAI:** token counting exists but is **primitive** — `CountTokensResponse.totalTokens` is a single undifferentiated total (no input/output split, no cached/reasoning breakdown) ([reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/CountTokensResponse)). `CachedContext` exists; `getBaseModelName()` detects the version. **No eval harness, no drift detection, no quota meter, no output-stability contract** — the ["evaluate prompt" page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) is prose that offloads to cloud Vertex AI eval and the cloud Automatic Prompt Optimizer.
- **Google AI Edge Portal / Model Explorer:** latency/memory/TTFT benchmarking only — **not output quality**.
- **Firebase AI Logic:** console tracks token usage for **cloud** Gemini calls and explicitly shows **no data for on-device inference** — a monitoring blind spot by design.
- **MediaPipe / LiteRT-LM:** `maxTokens` budget cap, no eval/accounting harness.
- **Apple Foundation Models:** shipped the Evaluations framework + granular usage reporting — **but even Apple's eval targets prompt tweaks, not model-version drift**, and Apple explicitly concedes non-determinism with a model "rebuilt from the ground up" and no version pinning.
- **OSS/commercial (promptfoo, DeepEval, Ragas):** structurally cloud/host-side; reach an on-device model only via a hand-built HTTP bridge. No turnkey on-device path.

**The precise boundary:** Apple beat Google on the *eval-harness* and *token-accounting* halves. **Nobody — Apple included — ships output-stability regression across managed-model updates.** That half is genuine industry whitespace, and it is the most platform-privileged piece because only the platform controls when the model changes.

**Main competitor** a developer uses today: their own JUnit test with hardcoded sample outputs, plus a cloud eval tool that can't see the on-device model.

---

## Proposed surface

**"Nano Instruments"** — a measurement layer for ML Kit GenAI, shipped as a test/observability artifact, not a new model. Three components, in priority order:

1. **Usage & quota observability (ships first — the 15-minute win).** Promote token counting to real usage reporting and expose the quota state that #1070 is reverse-engineering:
   ```kotlin
   val usage = response.usage            // inputTokens, outputTokens, cachedTokens
   val quota = GenAi.inferenceQuota()    // remaining: Int?, resetHint: Duration?, batteryQuotaState
   if (quota.remaining ?: 1 <= 0) routeToCloudFallback()
   ```
   This is the piece a developer adopts without permission or architecture change, and it directly answers two open issue-tracker complaints.
2. **On-device eval harness (JUnit-native, parity with Apple).** A `@NanoEval` test rule: a `ModelSample(prompt, expected)` dataset, pluggable graders (exact/structural/`ModelJudge` via a larger Gemma on-device or a cloud judge), metric aggregation, and an HTML/Gradle report. The defensible twist over Apple: a **device-matrix eval runner** that solves "no Nano on a CI runner" by executing against AI-Edge-Portal-style real devices.
3. **Output-stability regression (the Type-E spine, the moat).** A recorded baseline of outputs tied to `baseModelName`; when AICore updates Nano, the harness replays the baseline and reports drift *before* the new model reaches users — plus a platform **output-stability contract** (versioned output schema, deprecation notice on model swaps). This is the half no competitor has.

**Deliberately *not*:** it does not pin or freeze the model (that fights AICore's management model); it does not promise identical outputs (non-determinism is conceded) — it promises *measured, surfaced* change, not frozen behaviour.

**TTFHW target: 15 minutes** for component 1 (one Gradle line, one API call, works where the Prompt API already works). Components 2–3 are a half-day and require the device-runner, which is the honest friction and the reason this is a preview, not a GA claim.

---

## Reach & sizing

Show the arithmetic; Google-published vs. third-party labelled.

- **Device gate (binding):** Gemini Nano = **140M+ devices** (Google, ~Jul 2026) ÷ ~3.8B Android actives (third-party) = **~3.7%** (my arithmetic). Nano-4 narrower still (~7 phones; 1–3% third-party estimate).
- **minSdk is *not* binding:** API 31+ ≈ 77.7%, API 26+ ≈ 95% (third-party, Oct 2026) — every Nano device already runs modern Android, so the 3.7% gate dominates.
- **Adoption ceiling anchor:** the best-adopted specialized on-device ML SDK, TensorFlow Lite, sits at **~0.9% of all apps but ~9–11% of installs** (AppBrain, third-party) → a **~10× install-skew**: this class concentrates in big apps.

Sizing (inputs labelled; `A`=≥50K-install apps in productivity/comms/social/news/education/tools ≈ 60,000 **[my estimate — AppBrain column didn't render]**; `f_genai`=0.25 **[my assumption]**; `e`=0.037 **[Google-grounded]**; `c`=0.15 3-yr ceiling **[my assumption]**):

- SAM = 60,000 × 0.25 = **15,000 apps**
- Device-gated SOM@yr3 = 15,000 × 0.037 × 0.15 ≈ **~80 apps**
- **Build-once SOM@yr3** (a developer integrates once; device reach caps *usage*, not the install) = 15,000 × 0.15 ≈ **~2,250 apps**, whose GenAI features run live on ~3.7% of installs today.
- **Install-weighted live reach:** even if ~2,250 adopters covered ~20% of Android installs, live-feature reach = 20% × 3.7% ≈ **0.74% of the surface — under 1% either way.**

**Sensitivity:** halving `f_genai` and `c` drops SOM ~4× (gated ~21 apps; build-once ~560) — **order of magnitude holds.** The decision is not pinned by my soft assumptions; it's pinned by the 3.7% device gate. **Engineering cost avoided** is real per-adopter (drift detection and a device-eval runner are each multi-engineer-month to DIY badly) but multiplied by a small base today — so the platform test passes on *strategic* grounds (de-risking the high-install apps Google most wants piloting GenAI), not on volumetric TAM.

---

## Adoption path

1. **The hook:** the usage/quota meter (component 1) — a team hitting `ErrorCode.BUSY` in a batch job adds one line and can finally route to a fallback before the wall. This is the #1070 author, tomorrow.
2. **First real integration:** the `@NanoEval` regression gate in their CI, replacing a hand-maintained "eyeball five outputs" ritual. It ships blocking their release on a drift threshold.
3. **The dependency they'd endorse:** once the baseline is recorded and the output-stability contract is what tells them a Nano update is coming, removing it means going blind on every future model swap — a lock-in they *want*.

**First adopter:** a large, already-committed Prompt API app on Pixel/Galaxy flagships with a server-side ML culture (the profile that files #1070 and #1061). **Second wave:** unlocked when one visible app publicly credits the harness for catching a Nano-update regression — platform tooling spreads by that reference story.

---

## Execution plan

- **Developer preview (components 1 + a thin 2):** *Question it answers* — do the teams already piloting Prompt API adopt a usage meter and a JUnit eval rule, and does drift detection catch a real nano-3→nano-4 regression? *Partners* — 3–5 flagship GenAI apps from the issue tracker. *Evidence collected* — the S1 proof the full E-commitment needs.
- **Beta:** graduate when (checkable) ≥N preview partners run the eval gate in CI and at least one real drift incident is caught pre-release. Add the device-matrix runner.
- **GA:** commit the output-stability contract and a versioned output schema independent of the model. This is the durable surface — and the point of no return on the Type-E bet.

**Org dependencies (named honestly):** the **AICore team** must expose quota state and a model-update signal — without it, components 1 and 3 are hollow, and this is the plan's single biggest external dependency. **AI Edge Portal** is the natural device-runner backend (reuse, don't rebuild). If AICore says no, the idea degrades to a client-side eval harness (component 2 only) that matches Apple but drops the moat — a worse, me-too product. That branch should be surfaced to leadership, not worked around.

---

## The case against

The strongest case, argued at full strength: **the live addressable base is under 1% of the Android surface and gated by a device-penetration number Google doesn't control the pace of.** Funding durable platform infrastructure — an output-stability *contract* held for five years — for ~80–2,250 apps is a hard sell against demoable work, and the adoption-failure mode this most resembles is **"the API outran the hardware"** (rubric #1): eligible population too small for serious integrators to invest, the depth-sensing-AR failure. A second real risk is **"the platform absorbed the problem underneath you"** (#2): if AICore itself starts versioning outputs and exposing quota as first-party primitives, the standalone harness thins to a convenience wrapper.

The honest rebuttals, after the argument not before it: (a) the base is small but **install-skewed ~10×** toward exactly the strategic apps, and the gate is a *when* — Nano is on a rollout curve toward the ~78% already on API 31+; (b) the value is strategic insurance for the whole GenAI portfolio, not this tool's own TAM, which is why it's scoped as a preview to *collect* evidence rather than a GA commitment; (c) the drift/stability half is absorption-resistant because it *is* the platform primitive, so being absorbed by AICore is a reorg, not a death. What this analysis has **not** found is a competitor shipping the drift half — if that appears, the case against wins.

---

## Kill criteria

**The single observation that would reverse this recommendation:** a developer-preview with 3–5 flagship partners where **fewer than half adopt the usage meter and none run the eval gate in CI within one quarter** — i.e. the on-device demand that today is moderate-but-converging fails to convert when the tool actually exists. That is the cheap, datable test, and it is the whole point of scoping this as a preview.

**Load-bearing assumption:** that AICore will expose quota state and a model-update signal. Everything privileged about this idea rests on it; without it, this is a me-too client harness.

**Re-check trigger if shelved:** Nano device reach crossing ~15–20% of the Android base (reach gate releases), **or** a competitor shipping on-device drift/stability tooling (whitespace closes — build now or cede it), **or** the DMA decision operationalizing an "equivalent performance" measurement standard (regulatory pull becomes a mandate).

---

## Fit for this team

ML Kit is the **right** owner of components 1–2: it owns the Prompt API surface developers already depend on, and the eval/usage layer belongs next to the API it measures, not in a separate SDK. Component 3 (the output-stability contract) is **shared custody with AICore** and should be designed jointly — if it lands only in ML Kit it will lack the model-update signal; if it lands only in AICore it will lack the developer-facing harness. The failure mode to avoid is this capability fragmenting across ML Kit, Firebase AI Logic (which already half-owns cloud usage reporting), and AI Edge Portal (which owns the device runner) — three teams each shipping a third of it. If the org can't commit ML Kit as the single front door with AICore as the signal provider, the more valuable conclusion is to **not ship it as three disconnected pieces**, which is the current state and precisely the developer-experience fragmentation this report's idea is meant to reduce.

---

## Open questions

- **What is the actual per-app inference quota** (#1070)? Nobody outside AICore knows its size or reset semantics — settle by asking the AICore team; it's a precondition for component 1.
- **Can AICore emit a model-update signal** before a Nano swap reaches a device? Settle with the AICore roadmap owner; determines whether component 3 is possible at all.
- **Does any WWDC26 session (not 241/298) show Apple doing model-version regression?** Not found in the fetched transcripts; would change the whitespace claim. Settle by reading the full session list.
- **Real AppBrain ≥50K-installs counts and ML Kit's own all-apps adoption %** — never rendered this run. Settle with a direct AppBrain read once the host is allowlisted; firms up the reach score.
- **Is the arXiv "degradation after 3–5 generations" finding replicated?** Single paper. Settle with a second source before treating it as established.

---

## Runners-up

- **On-device neural TTS (Type A):** strongest raw demand (Picovoice sells Orca into the hole; Apple added speech generation; Google ships nothing modern). Lost because G1 privilege is only moderate — Piper and other OSS neural TTS ship, so a three-person team could borrow a path. A strong idea; worth its own deep run.
- **Deferred/opportunistic inference scheduling (Type E):** maximum platform privilege (only the platform schedules under the shared model + quotas). Lost on S1 — the demand is real but invisible-in-demo and under-evidenced, so it couldn't out-argue the lead this run.
- **Sub-8 GB reach tier (Type F):** converts the 3.7% demo into a platform. Lost because feasibility (honest quality-per-tier on mid-tier silicon) is unproven and is the whole game — needs a feasibility run first.
- **Standalone moderation classifier for user content (Type G):** real DMA/policy pull. Lost because a one-size classifier dies on contact with a trust-and-safety team unless tunability is solved up front — a design risk, not a research gap.
- **Structured document understanding (tables/forms) (prior-snapshot whitespace):** dropped early — this is a gap where **Apple already beat Google**, not industry whitespace, so it fails the "already exists" triage against Apple's `RecognizeDocumentsRequest`.

---

*Sources:*
- [ML Kit "Evaluate prompt quality"](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)
- [ML Kit Prompt API — get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- [ML Kit `CountTokensResponse` reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/CountTokensResponse)
- [ML Kit issue #1070 — undocumented inference quota](https://github.com/googlesamples/mlkit/issues/1070)
- [ML Kit issue #1061 — beta3 version regression](https://github.com/googlesamples/mlkit/issues/1061)
- [ML Kit issue #1069 — background inference blocked](https://github.com/googlesamples/mlkit/issues/1069)
- [ML Kit issue #972 — Nano version opacity](https://github.com/googlesamples/mlkit/issues/972)
- [Apple WWDC26 session 298 — Evaluations framework](https://developer.apple.com/videos/play/wwdc2026/298)
- [Apple WWDC26 session 241 — token counting / usage](https://developer.apple.com/videos/play/wwdc2026/241)
- [Apple Foundation Models documentation updates](https://developer.apple.com/documentation/updates/foundationmodels)
- [Android Developers Blog — on-device inference (140M+ devices)](https://android-developers.googleblog.com/)
- [EU DMA — Alphabet interoperability proceedings](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [arXiv 2604.24636 — on-device SLM integration challenges](https://arxiv.org/abs/2604.24636)
- [promptfoo](https://promptfoo.dev/) · [DeepEval / Confident AI](https://www.confident-ai.com/) · [AppBrain ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels.com](https://apilevels.com/) · [killedbygoogle](https://killedbygoogle.com/)
