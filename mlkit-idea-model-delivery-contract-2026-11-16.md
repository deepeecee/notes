# Model Delivery Contract — make ML Kit's own model downloads observable and promised, not silent

**Type:** E — Delivery & lifecycle (with a Type B extension component) · **Verdict:** Prototype · **Opportunity: 6/10 (Infrastructural)**
*2026-11-16 · Prepared for Android ML Kit · Evidence current as of 2026-11-16*

> On a Tuesday a developer ships a translation feature, tests it on wifi, and it works. A week later
> their crash-free users in India and Indonesia drop: `MlKitException.UNAVAILABLE`, or an
> `await()` on `downloadModelIfNeeded()` that never returns because the device is offline and the
> model never arrives. There is no progress, no "offline, will retry," no failure reason — on
> Android the classic unbundled models hand back a `Task<Boolean>` and a fire-and-forget download.
> So the developer hand-writes a poll-check-download-retry wrapper with a 20-second timeout and a
> rule-based fallback. Thousands of them write the same one. This idea is the platform shipping it
> once, with a promise attached.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Infrastructural | composite 3.5 × 2 = 7.0, −1 for Durability gate at exactly 3; S1 is 4 not 5 so no bonus |
| Platform privilege (gate) | 5/5 — pass | Only the delivery owner can promise delivery; ML Kit's models ride Play Services / AICore + [Private Compute Services](https://developer.android.com/ai/aicore), unreachable by a third party |
| Feasibility headroom (gate) | 5/5 — pass | Not a model. The state machine already ships for adjacent packs — [`AiPackStatus`](https://developer.android.com/reference/com/google/android/play/core/aipacks/model/AiPackStatus), [`SplitInstallSessionStatus`](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus) — and GenAI already emits byte progress |
| Durability (gate) | 3/5 — pass, weak | A delivery *SLA* is exactly the commitment developers distrust: killed Google dev APIs ran a ~6.2-year median ([killedbygoogle](https://killedbygoogle.com/)); Cloud IoT Core (5.5y) is the cited trust-breaker |
| Demand evidence (25%) | 4/5 | [Issue #315](https://github.com/googlesamples/mlkit/issues/315) verbatim; still-open [#740](https://github.com/googlesamples/mlkit/issues/740) (2023→2025), [#978](https://github.com/googlesamples/mlkit/issues/978) (2025); ~5-year StackOverflow cluster; multiple hand-rolled wrappers |
| Install-weighted reach (15%) | 3/5 | Improves existing integrators, not new reach ≈ ML Kit's own footprint: ~0.5–1% of apps but ~6–8% install-weighted (provisional AppBrain proxy); classic models clear API 26 (~95%) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path is real and cheap: copy a ~40-line wrapper ([arifaizin gist](https://gist.github.com/arifaizin/b217425592853d6bf84d4eb15013d485)). Hard only in the offline/cross-device/China-blocked tails |
| Integration cost / TTFHW (15%) | 4/5 | As an extension (progress listener + richer status enum) it's a few lines, no key, no new permission, negligible size — a 15-minute hello-world is reachable |
| Substitute half-life (15%) | 3/5 | A bigger model won't absorb delivery plumbing; the real substitute is Google's *own* roadmap extending Play AI Delivery to first-party models |
| Strategic complement (10%) | 4/5 | Reliable delivery lifts on-device adoption and cuts the "every feature needs a cloud path too" tax that depresses the whole GenAI portfolio |
| **Composite** | **3.5** | Prototype-and-developer-preview band (3.0–3.9), explicitly to collect S1 |

*Least trustworthy score: install-weighted reach (S2). No authoritative per-SDK Android adoption count exists; the 6–8% is a reasoned TensorFlow-Lite-proxy estimate off third-party AppBrain crawl snippets, not a measured ML Kit figure.*

---

## The problem

The job, stated as a developer's job under a deadline: *"Ship an on-device ML feature that works for my whole user base, and tell me — and my UI — honestly when the model isn't there yet."* The customer is an Android engineer, not an ML engineer; the competing solution is their own retry loop.

This problem is structurally produced, not an accident of current tooling. A 100M+ install app spans a device fleet where more than half of Indian and Indonesian users have no wifi ([Google Play](https://android-developers.googleblog.com/)), and ML Kit's unbundled models download on demand over the network. So the single most common deployment reality — a user who is offline, on a constrained network, or behind a national firewall at the moment of first use — is exactly the case the delivery API handles worst. The model arrives silently or not at all, and the app finds out via an exception with no state behind it.

What do developers do *instead* today? Three workarounds, each with a cost that is the price of this API:

1. **Bundle the model** to avoid downloading at all — paying the install-conversion tax (Google Play's own figure: ~1% of installs per 6 MB; translation packs are ~30 MB each). The accepted StackOverflow answer to "model won't download" is frequently "switch to the bundled model," i.e. abandon the delivery path.
2. **Hand-roll a poll-check-download-retry wrapper** — call `getDownloadedModels()`, check membership, trigger `download()` with `DownloadConditions`, show an indeterminate spinner because there is no progress, and retry the inference on success.
3. **Add a timeout and a fallback** — because `downloadModelIfNeeded().await()` never resolves offline, developers cap it (20s is a value seen in the wild) and drop to a rule-based path.

None of these is the app's differentiation. Every app solves it identically and badly, which is the definition of a platform problem rather than an app problem.

---

## Proof & signals

**Developers doing it by hand — verbatim, from Google's own tracker.** [googlesamples/mlkit Issue #315](https://github.com/googlesamples/mlkit/issues/315) (opened 2021-06-21): *"There is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs… But if the user is offline e.g. this won't happen at all and we have no indicator about that."* Google marked it "planned but not scheduled," then resolved it by pointing developers at the GMS `ModuleInstallClient` API — a partial workaround, not an observable state machine. *(Verbatim-confirmed, URL live.)*

**The pain is still live in 2025, across surfaces.** [Issue #740](https://github.com/googlesamples/mlkit/issues/740) ("Translation model files not found… delete the models and retry," open since 2023, a second developer confirming "no solution yet" in April 2025) and [Issue #978](https://github.com/googlesamples/mlkit/issues/978) ("Entity Extraction dynamic model download not usable in mainland China… allow developers to include the model in the app package," open, Sept 2025). *(Titles/dates verbatim-confirmed.)*

**A ~5-year StackOverflow cluster.** Questions from the 2018 Firebase-ML era through 2023 report the same symptom — *"Waiting for the text recognition model to be downloaded. Please wait,"* a wait that doesn't resolve — across text recognition, face detection, and translation. A Google employee comment in results: *"We do not support the self-served model downloading in ML Kit."* *(Snippet-characterized; StackOverflow could not be fetched verbatim this run — 8–10+ distinct questions, exact vote counts unverified.)*

**Someone building it by hand, as code.** The [arifaizin gist](https://gist.github.com/arifaizin/b217425592853d6bf84d4eb15013d485) (2023) re-implements the exact missing pattern: list downloaded models, check membership, manual progress indicator, `download()` on miss, retry on success. Repos `SubhrajyotiSen/Translate` (a `LanguageModelManager.kt` dedicated to download/delete logic), `chmouel/liseur`, and `chartmann1590/TipsyBuddy` (an "AppTranslationManager" with queueing and dual-tier caching) do the same. Recent PRs add the offline-hang fix directly — `librevlad/point` [PR #1509](https://github.com/librevlad/point/pull/1509) (Oct 2026): *"with the device offline and no entity model downloaded, MlKitEntityExtractor hangs… The download never fails; it just waits for the network,"* fixed with a 20s cap and a rule-based fallback. *(Repo existence confirmed; stars low — this is breadth-of-independent-reinvention evidence, not traction evidence.)*

**The absence signal.** The ML Kit tracker is low-volume, so the handful of issues understates rather than overstates: developers who hit this mostly leave for the bundled model quietly rather than file. Silence here is churn, not contentment.

---

## Why now

Honest finding up front: **the why-now is moderate, not urgent.** Two of the three legs are real; the regulatory leg that looked like a forcing function is not one.

1. **Capability shift (shipped).** The lifecycle machinery now demonstrably exists on Android and can be pointed at ML Kit's own models. The Play AI Delivery Library's `AiPackStatus` (PENDING / DOWNLOADING / TRANSFERRING / COMPLETED / FAILED, with `transferProgressPercentage`) shipped in beta from Google I/O 2025, and ML Kit's GenAI path already emits byte-level progress via [`DownloadCallback.onDownloadProgress`](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/DownloadCallback). The primitives are in the house; they just don't wrap the classic models. *(Confirmed live, 2026-11-16.)*

2. **Demand shift (dated).** The DMA decision (below) forces Google to let third-party on-device models run with resource and background parity and be *shared across apps* by Android 18. That multiplies the number of co-resident models competing for storage and download bandwidth on one device — which makes an observable, promised delivery layer more valuable in the post-Android-18 world, even though the mandate says nothing about delivery. *Tailwind, not trigger.*

3. **Regulatory shift — the leg that isn't.** [EU DMA Case DMA.100220](https://digital-markets-act.ec.europa.eu/) (adopted 16 July 2026; Android 18 by 1 August 2027) mandates model *access and execution parity*, not availability/delivery/download-state interoperability. A delivery contract is therefore **neither mandated nor made redundant** by it. Anyone citing the DMA as a statutory deadline for this API is overreaching. *(EC portal summaries via search; primary PDF not fetched this run — scope verified at the feature-category level, exact phrasing unverified.)*

A weak why-now is a real finding: it says this idea is *correct and not urgent*, which is a different decision than "build it now."

---

## The capability gap

Be exact about the boundary, because the embarrassing error here is calling something whitespace that already ships.

- **ML Kit GenAI (Gemini Nano via AICore):** has a 4-state `checkFeatureStatus()` (`UNAVAILABLE` / `DOWNLOADABLE` / `DOWNLOADING` / `AVAILABLE`) **and** download progress (`DownloadCallback.onDownloadProgress`; the Prompt API exposes a `download()` status `Flow`). What it lacks is a *completion contract* — docs state the download "may take longer," and the first inference silently triggers a download if you didn't. Status enum, not SLA. *(Confirmed live.)*
- **ML Kit classic unbundled models (Translation, Segmentation, Entity Extraction) on Android:** [`RemoteModelManager.isModelDownloaded()`](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) → `Task<Boolean>`, and `download()` → `Task<Void>` with success/failure listeners only. **No progress, no state machine, no offline signal.** The iOS SDK returns an `NSProgress` object for the same call — so this is an Android-specific asymmetry, not a platform-wide impossibility. *(Confirmed live; spot-checked independently.)*
- **Play's own lifecycle APIs** (`SplitInstallSessionStatus` — 10 states with `bytesDownloaded()`; `AiPackStatus` — progress percentage): rich, observable, contract-shaped — but they wrap **the developer's own** dynamic features and shipped model packs, **not ML Kit's models**, which ride a separate Play Services / AICore rail. The rich APIs and the models developers actually consume are on different tracks. That seam is the gap.
- **Apple Foundation Models:** `SystemLanguageModel.availability` returns only `.available` / `.unavailable(deviceNotEligible | appleIntelligenceNotEnabled | modelNotReady)` — a polled enum with **zero download progress**. Apple is *behind* here, not ahead. *(Confirmed live.)*
- **Qualcomm AI Hub / MediaPipe:** a build-and-profile service and a deprecated inference path respectively — neither offers a runtime delivery contract.

**The main competitor is not a vendor — it's the developer's own 40-line wrapper, plus the "just bundle it" retreat.** That is what this API displaces, and it is also the reason the idea is a Prototype and not a Build.

---

## Proposed surface

Two layers. Ship the extension first; earn the contract second.

**Layer 1 — Type B extension: bring classic unbundled delivery to parity with GenAI and with iOS.** Add an observable download to `RemoteModelManager`:

```kotlin
// Today (Android): boolean + fire-and-forget
modelManager.download(model, conditions)   // Task<Void>, success/failure only

// Proposed: an observable state machine, same shape AiPackStatus already uses
modelManager.getModelStatus(model)         // Flow<ModelDeliveryState>
// ModelDeliveryState = NotRequested | Downloadable(sizeBytes)
//   | Downloading(bytesDownloaded, totalBytes)
//   | WaitingForNetwork            // the offline case, surfaced — the #1 ask
//   | WaitingForConditions(wifi)   // DownloadConditions not met
//   | Available | Failed(reason)   // typed reason, not a bare MlKitException
```

Deliberately *not* in scope: changing where models come from, exposing the model binary, or a cross-app shared-residency contract (that is a Play / AICore concern, and the DMA's "sharing" lane). The extension is purely *observability of the delivery the platform already performs.*

**Layer 2 — Type E contract: a stated delivery promise.** A documented, versioned contract: which states are guaranteed to be reachable, that `WaitingForNetwork` is always distinguishable from `Failed`, and — the hard part — an output-stability and support policy that survives model refreshes. This layer is where durability risk concentrates and where the idea can fail; it should ship only after Layer 1 proves demand.

**Time-to-first-hello-world target: 15 minutes.** Achievable for Layer 1 because it is one new method on an API developers already call, no new permission, no key, negligible size. If Layer 2's contract can't be expressed as a few lines plus a doc page, that's a finding about Layer 2, not a footnote.

---

## Reach & sizing

Show the arithmetic; the inputs are soft and labelled so.

- **Addressable surface = existing ML Kit integrators** (this is an improvement, not new reach). Best proxy, TensorFlow Lite on [AppBrain](https://www.appbrain.com/stats/libraries): ~0.95% of apps / ~11.2% of installs → an install-weighting multiplier of ~11.8×. ML Kit is easier to adopt (more small apps), so its multiplier is lower; working range **4–12×**, point ~6–8×. *(Third-party crawl, recovered from search snippets this run — treat as provisional.)*
- **By app count:** ~0.5–1.0% of apps → roughly **10,000–21,000 Android apps.**
- **Install-weighted:** 0.5% × 6× (low) to ~1% × 11.8× (high) → **~3–11% of install-weighted app surface, centre ~6–8%.** That slice already ships a dynamically-delivered on-device model.
- **Device gate:** classic unbundled models clear API 26 (~95% of the fleet); only GenAI-gated features narrow to API 31 (~70%). The reach-limiting factor is ML Kit adoption, not device eligibility.

**Sensitivity.** Halve both soft inputs (app share and multiplier): install-weighted reach falls to ~1.5–3%. The verdict does not improve under optimism or collapse under pessimism — it stays "meaningful to existing integrators, not a growth lever," which is consistent with the Prototype call. The decision this sizing can't settle is whether delivery reliability is a *cause* of low on-device adoption or merely a *symptom* — and that is the one experiment worth running (below).

---

## Adoption path

1. **The hook (15 min):** an integrator already fighting the offline-hang swaps their hand-rolled spinner for `getModelStatus(model)` and gets `WaitingForNetwork` for free. One method, visible win.
2. **First real integration:** they delete their timeout-and-fallback wrapper and branch on the typed state in production — replacing bespoke, inconsistent retry logic.
3. **The dependency:** once the UI reflects real delivery state, removing it means going back to a spinner that lies. The lock-in is one developers endorse rather than resent.

**First adopter:** a translation- or OCR-heavy app with large emerging-market DAU — the archetype already filing the China/offline issues (Issue #978's author is the literal first adopter). **Second wave:** GenAI-feature apps post-Android-18, once multiple third-party models are co-resident and delivery observability stops being optional.

---

## Execution plan

- **Developer preview (Layer 1 only):** ship `getModelStatus()` for Translation and Entity Extraction. Question it answers: *does surfacing `WaitingForNetwork` + progress measurably cut abandonment of the delivery path?* Partners: 3–5 apps from the tracker/China cohort. Evidence collected: before/after retention of the on-device path vs the bundled retreat.
- **Beta (graduation condition):** parity across all unbundled models, and a checkable bar — e.g. the hand-rolled-wrapper pattern stops appearing in new repos, and tracker issues in this class trend to zero.
- **GA (Layer 2):** the delivery contract, with a versioned deprecation policy and an output-stability statement — the specific commitments needed to overcome the ~6.2-year-median skepticism.

**Org dependency, named honestly:** the delivery lifecycle primitives are owned by **Play Core** (`SplitInstall` / AI packs), the model catalog by **ML Kit**, and the GenAI rail by **AICore / Private Compute Services**. Layer 1 is ML Kit's to ship. Layer 2 requires Play Core to say yes to a contract over a rail ML Kit doesn't solely control. If Play Core would rather extend the Play AI Delivery Library to cover first-party models directly, that is a *better* outcome than an ML Kit-only API — and it is also the kill scenario.

---

## The case against

The strongest case, argued at full strength: **this is a feature, not a platform API, and Google is about to absorb it from underneath either way.** The borrow path is ~40 lines a competent Android developer writes in an afternoon; the StackOverflow cluster's own accepted answer ("just bundle the model") means many developers don't even want delivery observability, they want the download to not exist. Meanwhile the exact state machine this proposes already ships one rail over as `AiPackStatus`, and the honest description of the work is "unify two things Google already owns" — which is an internal-roadmap item, not a demand-driven new surface. An API justified mostly by internal tidiness fails the platform test.

This maps to failure mode #2 from the rubric — *the platform absorbs the problem underneath you* — compounded by #7, *undifferentiated against a free substitute.* Both are live here, and they are why the composite lands at 3.5, not above 4.

The mitigation, offered only after conceding the argument: the demand evidence is not internal tidiness — it is four years of named developers hand-building the same wrapper and filing the same issue across barcode, translation, entity extraction, and OCR. The borrow path "working" is survivorship: the developers for whom it didn't work (offline, China, cross-device) are in the tracker, and the ones who bundled are gone from on-device entirely. Unifying what you own is cheap to build and high-leverage precisely *because* you already own it — that is an argument for doing it, not against. But it remains a Prototype until the developer-preview shows that observable delivery recovers abandoned integrations rather than merely tidying the ones that already work.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google extends the Play AI Delivery Library (`AiPackStatus`) to cover ML Kit's own first-party models before this ships — check the Play for On-device AI release notes at or before I/O 2027 (May). If first-party models become observable through the existing pack API, a separate ML Kit surface is redundant and the recommendation flips to "contribute to that, don't build this."

**Load-bearing assumption:** that delivery *reliability* (not model *capability*) is a real cause of on-device-ML abandonment — i.e. apps leave the delivery path because it's unobservable, not only because the models are weak. This is partly inferred; the developer preview exists to confirm or kill it.

**Re-check trigger if shelved:** a measurable spike in co-resident third-party models post-Android-18 (Aug 2027), or the tracker's delivery-class issues reaching a volume that makes the borrow path visibly insufficient.

---

## Fit for this team

ML Kit should own the *developer-facing contract over its own models* — nobody else can, and the classic unbundled models are ML Kit's surface. But the lifecycle primitives belong to Play Core and the GenAI rail to AICore, so Layer 2 is unavoidably a joint effort. The real risk this ecosystem keeps running — a capability landing in the wrong part of Google's stack and fragmenting the developer story further — is acute here: if the delivery contract ends up half in ML Kit and half in Play Core with no single owner, it is worse than not shipping. The cleanest answer may be that **Play Core owns the state machine and ML Kit owns the model-catalog binding to it.** If that's the shape, say so early; it is a more valuable conclusion than a territorial claim.

---

## Open questions

- **Is delivery reliability a cause or a symptom of low on-device adoption?** Settled by the developer-preview retention experiment above. This is the single most important unknown in the whole report.
- **What share of the fleet is actually offline at first-use?** The >50%-no-wifi figure for India/Indonesia is Google-published but old and regional; no fleet-level first-use-offline rate exists. Settle via partner telemetry.
- **Does the DMA "sharing" lane quietly create a delivery-state obligation in its implementation detail?** The feature-category scope was verified; the Android 18 technical spec was not fetched this run. Settle by reading the DMA.100220 implementation spec when published.
- **Real ML Kit adoption numbers.** The 6–8% install-weighted figure is a TF-Lite proxy off third-party snippets. Settle only if Google publishes per-SDK adoption, or via the Play SDK Index in a browser.

---

## Runners-up

- **On-device neural TTS API (Type A)** — fills the Picovoice Orca / Apple-speech gap, but **fails Platform Privilege**: strong OSS (Piper) ships as a Gradle dependency, so a three-person team matches it. Convert to a reach play or drop.
- **On-device eval & quality harness (Type D)** — Apple shipped an Evaluations framework; ML Kit publishes a prose "evaluate prompt quality" page with no tooling behind it. Strong, fast to build (no model), and the sharper gap. **Lost narrowly** — its demand is more inferred than #315's verbatim, quoted pain. The closest contender; worth its own run.
- **On-device safety/moderation classifier for user content (Type G)** — Bumble open-sourced its own; Play makes developers liable for output. Strong regulatory adjacency, but **tunability is the crux** (a one-size classifier dies on contact with a real trust-and-safety team) and the minors-law clock is legally contested (Texas SB 2420 injunction, Dec 2025). Lost on scope risk.
- **Speaker diarization / wake-word API (Type A)** — real whitespace (Picovoice Falcon/Porcupine), but thin install-weighted reach. Runner-up.
- **Sub-8 GB GenAI reach tier (Type F)** — the highest-leverage framing if it worked, but honestly **fails Feasibility headroom** at the target quality; park with a re-check on the next Nano-small release.

---

*Sources:*
- [ML Kit GenAI DownloadCallback reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/DownloadCallback)
- [ML Kit GenAI get-started (Prompt API)](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- [ML Kit Translation (Android)](https://developers.google.com/ml-kit/language/translation/android)
- [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [Android AiPackStatus reference](https://developer.android.com/reference/com/google/android/play/core/aipacks/model/AiPackStatus)
- [Android SplitInstallSessionStatus reference](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)
- [Android AICore](https://developer.android.com/ai/aicore)
- [googlesamples/mlkit Issue #315](https://github.com/googlesamples/mlkit/issues/315)
- [googlesamples/mlkit Issue #740](https://github.com/googlesamples/mlkit/issues/740)
- [googlesamples/mlkit Issue #978](https://github.com/googlesamples/mlkit/issues/978)
- [arifaizin RemoteModelManager gist](https://gist.github.com/arifaizin/b217425592853d6bf84d4eb15013d485)
- [librevlad/point PR #1509 (offline-hang fix)](https://github.com/librevlad/point/pull/1509)
- [EU DMA developer portal (Case DMA.100220)](https://digital-markets-act.ec.europa.eu/)
- [Apple Foundation Models — detecting availability](https://developer.apple.com/documentation/foundationmodels/detecting-available-apple-foundation-models)
- [AppBrain machine-learning SDK stats](https://www.appbrain.com/stats/libraries)
- [killedbygoogle](https://killedbygoogle.com/)
- [Orrick — state app-store age-verification laws](https://www.orrick.com/en/Insights/2025/07/Texas-and-Louisiana-Join-Growing-Trend-of-State-Age-Verification-Laws-for-App-Stores)
