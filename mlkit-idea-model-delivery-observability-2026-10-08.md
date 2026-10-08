# Model Delivery Observability — a status contract for the models ML Kit downloads behind your back

**Type:** E (Delivery & lifecycle), with a B/C flavor (extends `RemoteModelManager`) · **Verdict:** Prototype → Build · **Opportunity: 8/10 (Infrastructural)**
*2026-10-08 · Prepared for Android ML Kit · Evidence current as of 2026-10-08*

> A developer ships a translation feature with ML Kit. On their Pixel it works. In production, a slice of users tap "Translate" and nothing happens — no error they can show, no progress bar, no way to tell "downloading" from "this device will never get it" from "you're offline, give up." Their code does what the docs imply: catch `MlKitException.UNAVAILABLE`, call `download()`, and "hope for the Play Services to eventually download the model." That word — *hope* — is from a real ML Kit issue, and it has been the state of the art since 2018. The job this fixes reaches the whole ~3B Play-services fleet, not the ~3.7% that runs Gemini Nano.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 8/10 — Infrastructural | composite 3.9 × 2 ≈ 7.9; no gate at 3, S1 not a 5, so no adjustment; rounded to 8 |
| Platform privilege (gate) | 5/5 — pass | Play Services owns model delivery; an app can observe symptoms but cannot build a real delivery contract ([RemoteModelManager ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)) |
| Feasibility headroom (gate) | 5/5 — pass | No model to train; iOS ML Kit and the Android GenAI path already expose byte progress, proving the state is available internally ([GenAI FeatureStatus](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/FeatureStatus)) |
| Durability (gate) | 4/5 — pass | Google API base rate hostile (~5.2 yr avg, [killedbygoogle](https://killedbygoogle.com/)), but DMA Art 6(7) forces on-device-model access by 1 Aug 2027 ([EC DMA.100220](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)) |
| Demand evidence (25%) | 4/5 | Convergent asks 2018→2024, multiple hand-rolls, academic study — but FRs closed, no shared library, SO/Reddit unverified ([firebase #47](https://github.com/firebase/firebase-android-sdk/issues/47), [mlkit #315](https://github.com/googlesamples/mlkit/issues/315)) |
| Install-weighted reach (15%) | 5/5 | Classic unbundled models are eligible on ~99.8% of API-21+ devices (~3B GMS base), ~20–27× Nano's 140M ([composables distribution](https://composables.com/android-distribution-chart), my arithmetic) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | A real borrow path exists (`ModuleInstallClient`/`SplitInstallManager` state machine) and apps use it, but it doesn't cover `RemoteModelManager`-fetched models ([SplitInstallSessionStatus](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)) |
| Integration cost / TTFHW (15%) | 5/5 | One listener on an SDK you already depend on; no new permission, no APK size, works in emulator |
| Substitute half-life (15%) | 3/5 | A coarse availability enum already covers the simple case; Google's own roadmap (DMA work, GenAI `checkFeatureStatus`) is the most likely thing to absorb it |
| Strategic complement (10%) | 4/5 | Reliable delivery lifts adoption of the whole on-device portfolio and reduces the cloud-fallback crutch; Google must expose it anyway |
| **Composite** | **3.9** | weighted mean of S1–S6 |

*Least trustworthy line: install-weighted reach. The device-eligibility number is solid, but the realized share of apps that actually ship an unbundled ML Kit model is unverified — AppBrain's ML Kit detail page was unreachable this run, so "how many apps" rests on a placeholder, not a measured figure.*

---

## The problem

Classic ML Kit APIs — Translation, Language ID, Smart Reply, Entity Extraction, Selfie/Subject Segmentation, Face detection, Digital Ink, Barcode in unbundled form — don't ship their model in your APK. The model is downloaded on first use by Google Play Services, on a schedule the app doesn't control and can't see. The documented contract is thin: `isModelDownloaded()` returns a boolean, `download(model, conditions)` returns a `Task<Void>` that resolves or fails, and `getDownloadedModels()` lists what's present ([RemoteModelManager ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)). On Android there is **no progress, no state enum, and no typed reason for failure** — an undifferentiated `MlKitException` is all the app gets ([Translation/Android guide](https://developers.google.com/ml-kit/language/translation/android)).

The job to be done, in a developer's words: *when a user invokes an on-device feature, tell me whether the model is ready, downloading (and how far), waiting on a condition I can act on, or permanently unavailable on this device — so I can render the right UI instead of a dead button.* The competing solution today is their own polling loop plus a prayer. The workaround's cost is the value of this API.

This is structurally produced, not an accident of tooling. A 100M+ install app runs across a device fleet spanning six-year-old SoCs and many OS versions; model availability is gated on Play Services version, module presence, free storage, and network, and those conditions vary per user and per region. Because the app's UI promises the feature, every unhandled delivery state is a visibly broken feature for some slice of users. The app team is server-side by background ([problem atlas P8/P12]); nobody on it is positioned to reverse-engineer Play Services' delivery behavior. And the state the app needs — "downloading, 60%", "unsupported module on this device", "waiting for unmetered network" — exists inside Play Services already. It simply isn't exposed. A problem that is "the platform knows the answer and won't tell you" is the definition of a platform opportunity, not a bug report.

---

## Proof & signals

The demand here is **convergent across years and reporters**, and the strongest items are verified directly from the source pages (GitHub was fetchable this run; see the provenance note at the end).

- **The identical ask, three times, over three years.** [firebase/firebase-android-sdk #47](https://github.com/firebase/firebase-android-sdk/issues/47) (opened 2018-09-25, **closed "not planned"**): *"I think it's crucial to have APIs to monitor the state of the on-device models,"* proposing explicit `UNAVAILABLE / AVAILABLE / DOWNLOADING` states and a completion observer. Re-raised in [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315) (2021-06-21, **closed**): *"There is still no way to get availability and download status of the unbundled standard ML Kit models … we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline this won't happen at all and we have no indicator about that."* Both closed without the capability landing — which is a signal about Google's past prioritization, not about absence of demand.
- **Progress is binary, and developers noticed.** [firebase #1656](https://github.com/firebase/firebase-android-sdk/issues/1656) (2020-06-12, **open**): *"Right now, it only provides updates at 0.0 (started) and 1.0 (completed)."* [mlkit #165](https://github.com/googlesamples/mlkit/issues/165): *"is it possible to show the progress of downloading a digital ink model using progress bar?"*
- **Silent, device-specific failures that the app can't diagnose.** [mlkit #760](https://github.com/googlesamples/mlkit/issues/760) — face model fails to download, *"This error only appears on Android 14."* [mlkit #829](https://github.com/googlesamples/mlkit/issues/829) — subject-segmentation module error *"persists even after retrying, despite the optional module being present on the device."* The opacity defeats even careful developers.
- **Apps hand-rolling the exact state machine.** [o-benjamin/fansa-uchiwa-android PR #232](https://github.com/o-benjamin/fansa-uchiwa-android/pull/232) builds availability+download tracking on `ModuleInstallClient` after discovering `installModules()` *"completes when the request is accepted, not when the download finishes"* (and caps it with a 60s timeout). [sharneng/spliit2go PR #147](https://github.com/sharneng/spliit2go/pull/147) found that an un-downloaded module sends Play Services to its own download page, *a dead end offline*, and abandoned the input method. A [public gist](https://gist.github.com/abdelaz9z/662510f5372ae78e176d647f7dd69cb1) does the same for barcode. The Flutter plugin [`google_mlkit_translation`](https://pub.dev/packages/google_mlkit_translation) re-exposes `isModelDownloaded` as a first-class call because developers keep reaching for it.
- **Independent academic corroboration.** [DeltaDroid (TOSEM 2023)](https://seal.ics.uci.edu/publications/2023_TOSEM_Deltrdroid.pdf) studied Android dynamic delivery — the same Play mechanism these models ride — and found **44 critical failures across 25 apps**, triggered by *"network disconnection, missing the proper permission, or no support for the app store API,"* with the silent-failure pattern where *"a developer may register a failure callback but not actually handle the failure in a meaningful manner."*
- **The absence signal.** There is **no popular shared library** wrapping ML Kit download state — the most-starred ML Kit repo is just Google's samples (~4.3k stars). Read honestly: the pain is sharp enough that serious builders hand-roll it per app, but not yet crystallized into a library with traction. That caps the demand score below a clean 5, and it is also exactly why a platform-owned surface would land — there is no incumbent to displace.

Nobody charges money for this specifically, because it isn't a saleable product category — it's integration glue that only the platform can make correct. That is the one classic demand signal (willingness to pay) this idea cannot show, and it should be stated plainly rather than finessed.

---

## Why now

1. **Capability shift.** The platform already exposes the needed state in two adjacent places — iOS ML Kit's `ModelManager` returns a `Progress` object, and the Android GenAI path ships `checkFeatureStatus()` → `UNAVAILABLE/DOWNLOADABLE/DOWNLOADING/AVAILABLE` plus a byte-progress `DownloadCallback` ([FeatureStatus ref](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/FeatureStatus)). The internal plumbing to do this for the classic path demonstrably exists; what's missing is the decision to expose it there. (Dated July 2026 GenAI release notes; no newer delivery change surfaced through 2026-10-08.)
2. **Regulatory shift, with a hard date.** The European Commission's **DMA Art 6(7) decision DMA.100220, adopted 16 July 2026**, orders Alphabet to open on-device-model categories — *"system-level on-device models"* (discover/access/use/customise) and *"on-device model implementation"* (install/run) — to third parties, **free of charge, implemented in Android 18 by 1 August 2027** ([EC portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en); [decision PDF](https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf)). A documented delivery/availability state contract is a natural implementation vehicle for that obligation. (The "equivalent performance" wording in the Aug-2026 snapshot could not be re-confirmed this run — treat it as unverified.)
3. **Demand shift.** On-device features have moved from novelty to table stakes, but [only ~1.3% of LLM-using apps run on-device today](problem-atlas P10) — and the number-one reason the on-device path loses is that it's unreliable in production in ways the cloud path isn't. Delivery observability is a precondition for the on-device path to be shippable at 100M-user scale.

Three datable legs, the middle one statutory. This is a genuine why-now, not a manufactured one.

---

## The capability gap

Be exact about the boundary:

- **ML Kit classic (Android):** `isModelDownloaded()` boolean + `download()` `Task<Void>` + `getDownloadedModels()`. No progress, no state enum, no typed reason. ([ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager))
- **ML Kit classic (iOS):** `ModelManager.download` returns a `Progress` object and posts success/fail notifications — so **Android is behind its own iOS SDK** on progress. Still no typed-reason taxonomy or SLO on either.
- **ML Kit GenAI (Android):** `checkFeatureStatus()` 4-value enum + `downloadFeature()` byte-progress callback — but `UNAVAILABLE` is a single opaque state (can't tell unsupported-device from offline from AICore-missing), and it covers only the Gemini Nano family, not `RemoteModel`.
- **Play Feature Delivery / `SplitInstallManager`:** a full state machine — `PENDING/DOWNLOADING/DOWNLOADED/INSTALLING/INSTALLED/FAILED/…`, `bytesDownloaded()/totalBytesToDownload()`, `errorCode()` ([ref](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)). **This is the borrow path**, and it's good — but it tracks feature-module delivery, not ML Kit model readiness, and classic models aren't delivered via splits at all.
- **Play for On-device AI (beta):** `AiPackStates`/`AiPackState.status()` + size + `errorCode()` ([docs](https://developer.android.com/google/play/on-device-ai)) — a real contract, but for models *you* bring and host, not ML Kit's own.
- **Apple Foundation Models:** `SystemLanguageModel.availability` → `.available`/`.unavailable(.deviceNotEligible | .modelNotReady | .appleIntelligenceNotEnabled)` ([docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)). Apple ships the **typed reasons** nobody else has — but no progress and no SLO.

The exact gap: **no vendor unifies download progress + typed unavailability reasons + a service-level contract over its own managed models.** Google has progress-without-reasons (GenAI) and nothing-at-all (classic Android); Apple has reasons-without-progress. The main competitor a developer uses today is not another platform — it's `ModuleInstallClient`/`SplitInstallManager` glue they write themselves.

---

## Proposed surface

Extend `RemoteModelManager` (and align the GenAI path to the same contract) with an observable status flow and a typed reason taxonomy. Target **time-to-first-hello-world: under 15 minutes** — one listener, no new permission, no APK size.

```kotlin
// Observe, don't poll.
RemoteModelManager.getInstance()
    .observeModelStatus(translateModel)   // Flow<ModelDeliveryState>
    .collect { state ->
        when (state) {
            is Available        -> enableButton()
            is Downloading      -> showProgress(state.bytesDownloaded, state.totalBytes)
            is Waiting          -> showHint(state.reason)   // WIFI_REQUIRED, CHARGING_REQUIRED, LOW_STORAGE
            is Unavailable      -> degrade(state.reason)    // DEVICE_UNSUPPORTED, PLAY_SERVICES_OUTDATED, OFFLINE_NO_CACHE
        }
    }
```

- **States:** `Available`, `Downloading(bytesDownloaded, totalBytes)`, `Waiting(reason)`, `Unavailable(reason)`, `Failed(reason, retryable: Boolean)`.
- **Typed reasons** (the thing Apple has and Google doesn't): `DEVICE_UNSUPPORTED` (permanent — stop retrying), `PLAY_SERVICES_OUTDATED`, `OFFLINE_NO_CACHE`, `LOW_STORAGE`, `WIFI_REQUIRED`, `CHARGING_REQUIRED`, `QUOTA_EXCEEDED`, `TRANSIENT`.
- **What it deliberately does *not* do:** it does not change *when* Play Services downloads, does not add a scheduling primitive (that's a separate idea), and does not promise a model will ever arrive on an unsupported device — it tells you honestly that it won't.
- **The SLO half** is the harder commitment: a documented contract that `DEVICE_UNSUPPORTED` is stable across a model version, that progress is monotonic, and that the state reflects reality within a bounded delay. That's where durability risk concentrates and where the DMA language should anchor the wording.

---

## Reach & sizing

Device eligibility is the strong half; app adoption is the unknown half. Showing the arithmetic (labeled as mine):

- **Eligible device base:** classic unbundled models require only API 21 + Play Services. API-21+ cumulative ≈ **99.8%** of the active base ([composables, third-party, summing per-version shares](https://composables.com/android-distribution-chart)). The right denominator is the **GMS Play base**, ≈ **3.0B** (Google I/O 2021, the last official count) to ~3.8B (third-party 2025 estimates). Eligibility fraction ≈ 1.0.
- **Contrast with Gemini Nano:** 140M+ devices (Google, [Gemma 4 post, Apr 2026](https://android-developers.googleblog.com/2026/04/gemma-4-new-standard-for-local-agentic-intelligence.html)). 140M ÷ 3.8B ≈ **3.7%**; the classic base is **~20–27× larger**. This idea's defining advantage is that it is not gated to Nano hardware.
- **App adoption (the gap):** share of Play apps shipping an unbundled ML Kit model is **unverified** — AppBrain's ML Kit detail page was unreachable. Proxy: 42matters rates ML Kit "Extremely Popular," ~475 Android apps/month adding it, **66.61% of apps / 95.21% of downloads within the text-processing-SDK category** ([42matters, third-party](https://42matters.com/sdks/android/mlkit)) → an install-weighting multiplier ≈ **1.43×**. A specialized on-device-ML SDK plausibly reaches low-single-digit % of all Play apps at a three-year horizon.
- **Illustrative result (my arithmetic, placeholder adoption):** at ~2% of apps × 1.43× install weighting ≈ **~3% of all app-installs** carry an unbundled model, across a ~3B eligible-device base. Because a device holds dozens of apps, the per-device probability of holding ≥1 affected app is far higher — *most active devices are addressable*, gated only by developer adoption, not hardware.

**Sensitivity:** halve the adoption assumption (to ~1%) and the reach is still whole-fleet in device terms and still the full install base of whatever apps do adopt — the verdict doesn't flip, because the binding variable is developer adoption and the idea *lowers* the cost of adopting every classic API at once. The one experiment that would settle it: pull the real AppBrain ML Kit %apps/%installs from an unblocked network.

---

## Adoption path

1. **The hook:** a 15-minute win — replace a hand-rolled `isModelDownloaded` poll + try/catch with one `observeModelStatus` collector that renders a correct progress bar and a "won't work on this device" state. It's immediately better than what they have.
2. **First real integration:** the app wires the typed `Unavailable` reasons into its UX — a real progress bar on first use, a graceful "needs Wi-Fi" hint, a permanent fallback for unsupported devices. It replaces per-app `ModuleInstallClient` glue.
3. **The dependency:** once the app's delivery UX is built on typed reasons and monotonic progress, removing it means rebuilding that UX and re-discovering the Play Services quirks (`installModules` completes on accept, not finish) the hard way — a dependency they'd endorse, not resent.

First adopters: the serious builders already hand-rolling this (translation-heavy, scanning, camera, education apps). Second wave unlocks when a reference implementation ships in the ML Kit samples showing the correct progress/fallback pattern — the thing every other app then copies.

---

## Execution plan

- **Developer preview:** expose `observeModelStatus` on the translation model path for a handful of partners already hand-rolling delivery UX. Question it answers: do the typed reasons match the failure modes apps actually hit? Evidence it collects: the missing adoption/field-failure data, and the real distribution of `Unavailable` reasons.
- **Alpha/Beta:** extend to all unbundled classic models and align the GenAI `checkFeatureStatus` reason taxonomy to the same enum. Graduation condition: progress is monotonic and reason classification is correct on a device-matrix test covering the failure modes in mlkit #760/#829.
- **GA:** commit the SLO — stable `DEVICE_UNSUPPORTED` across model versions, bounded state-reflection delay, versioned reason enum independent of the model. Time it to land inside the Android 18 DMA work (1 Aug 2027) so it's framed as compliance-plus-quality, not an optional extra.
- **Org dependency, stated honestly:** this requires the Play Services / on-device-models delivery team to expose internal state, not just the ML Kit SDK team. If they say no, the SDK team can only surface what the delivery layer already returns — which is why the DMA mandate on that same team is the lever that makes this feasible.

---

## The case against

The strongest argument against is **substitute + self-absorption (S5)**, argued fairly: a coarse availability enum already handles the 80% case, the borrow path (`ModuleInstallClient`/`SplitInstallManager`) is a real, maintained state machine that serious teams already use, and Google's *own* roadmap is the most likely thing to make this redundant — the GenAI path already has `checkFeatureStatus`, and the DMA work will touch exactly this surface by 2027. So one reading is: this isn't an opportunity, it's a thing Google will inevitably ship, and shipping it early just means maintaining it longer. The live failure mode from the rubric's list is **#2, "the platform absorbed the problem underneath you"** — except here the platform *is* the proposer, so the honest reframe is that the question isn't *whether* to build it but *whether to do it well now* (typed reasons, progress, an SLO) versus shipping the minimum the DMA demands.

The mitigation is in the framing: the differentiated value isn't the boolean "is it available" (which will commoditize) — it's the **typed reason taxonomy + the stability SLO**, the parts that are hard, that Apple partially validated, and that a compliance-minimum implementation would skip. If the preview shows apps only ever need "available / not yet," the rich version isn't worth it and this drops to a Type B two-line extension. That's a checkable outcome, not a hedge.

A weaker second argument — that demand is overstated because the FRs were closed — cuts the other way once you notice the ask kept returning across three separate trackers over six years.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if an ML Kit release before developer preview ships a unified `RemoteModelManager` observable status with typed reasons (i.e., Google absorbs it as plain DMA-compliance work), the differentiated version evaporates — it becomes table stakes to document, not to design. Checkable test: watch [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) for a delivery-status entry on the classic path through the Android 18 / 1 Aug 2027 window.

**Load-bearing assumption:** that a non-trivial share of Play apps actually ship an unbundled ML Kit model (unverified — the AppBrain %apps/%installs figure could not be fetched this run). If that share is below ~0.5%, reach collapses to a niche and the verdict drops to Prototype-only.

**Re-check trigger if shelved:** the DMA Android-18 implementation draft appearing without a developer-facing delivery-status contract — that's the window to propose the quality version.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, because `RemoteModelManager` is ML Kit's own surface and the pain is specifically about ML-Kit-managed models whose delivery the developer can't see. LiteRT/MediaPipe developers bring their own models and already own delivery (via Play for On-device AI or feature modules); Firebase AI Logic is cloud-capable and sidesteps the problem. The one caveat: the *implementation* depends on the Play Services on-device-delivery team exposing state — so the right owner is ML Kit for the **API surface and the SLO**, with the delivery team as the hard dependency. If that team is already building the DMA delivery contract, the better conclusion may be that ML Kit should ride it rather than duplicate it — which is itself a useful thing for the reader to confirm.

---

## Open questions

- **What is the real AppBrain ML Kit %apps / %installs?** The one number that converts "eligible fleet" into "realized reach." Settle it by fetching the AppBrain ML Kit detail page from an unblocked network.
- **Did anything ship after August 2026 on the classic delivery path?** Release notes were secondary-sourced this run (WebFetch to developers.google.com was egress-blocked). Settle it with a direct read of the live release-notes page.
- **Is the Play on-device-delivery team already building a DMA-mandated delivery contract?** Determines whether this is "build" or "ride." Settle it internally.
- **Do apps need typed reasons, or just available/not-yet?** Determines whether this is an 8/10 infra idea or a 2-line Type B extension. Settle it in developer preview.

---

## Runners-up

- **On-device eval harness + token accounting (Type D)** — Apple shipped an Evaluations framework (WWDC26); ML Kit publishes a prose "evaluate prompt quality" page with no tooling behind it. Strong and fast to build (no model), but reach is gated to the ~3.7% GenAI base, which is why delivery observability beat it this run.
- **Standalone on-device safety/moderation classifier (Type A/G)** — Play makes developers liable for model output ([policy](https://support.google.com/googleplay/android-developer/answer/14094294)); Bumble open-sourced its own classifier. Strong privilege and a regulatory clock, but one-size-fits-all moderation dies on contact with a real trust-and-safety team unless tunability is solved — a bigger design risk than the winner.
- **On-device neural TTS (Type A)** — true whitespace (Picovoice sells Orca; Apple added speech generation; Google has no modern TTS API). Lost on feasibility/ownership: it needs a model Google must source, deliver, and hold quality on, versus the winner's near-zero feasibility risk.
- **Sub-8GB GenAI reach tiering (Type F)** — addresses the same ~3.7% trap, but feasibility (what quality a small model hits on mid-tier) is the whole game and is unproven; the winner needs no model at all.
- **GenAI delivery-aware inference scheduling (Type E)** — "run this batch when charging/idle/on Wi-Fi." Adjacent and real, but depends on the same delivery-layer exposure and is a larger commitment; it's the natural *next* idea once observability lands.

---

*Provenance note: GitHub issue pages were fetched and verified directly this run. Figures sourced to developers.google.com, developer.android.com, the EC DMA portal, AppBrain/apilevels, and killedbygoogle were **egress-blocked to WebFetch** and are therefore secondary-sourced via WebSearch snippets of those pages — treated as third-party reads unless marked Google-published. GitHub reaction/comment counts and Stack Overflow / Reddit volume could not be verified this run.*

*Sources:*
- https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager
- https://developers.google.com/ml-kit/language/translation/android
- https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/FeatureStatus
- https://developers.google.com/ml-kit/genai/summarization/android
- https://developers.google.com/ml-kit/release-notes
- https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus
- https://developer.android.com/reference/com/google/android/play/core/splitinstall/SplitInstallSessionState
- https://developer.android.com/google/play/on-device-ai
- https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel
- https://github.com/googlesamples/mlkit/issues/315
- https://github.com/firebase/firebase-android-sdk/issues/47
- https://github.com/firebase/firebase-android-sdk/issues/1656
- https://github.com/googlesamples/mlkit/issues/165
- https://github.com/googlesamples/mlkit/issues/760
- https://github.com/googlesamples/mlkit/issues/829
- https://github.com/googlesamples/mlkit/issues/59
- https://github.com/firebase/quickstart-android/issues/784
- https://github.com/o-benjamin/fansa-uchiwa-android/pull/232
- https://github.com/sharneng/spliit2go/pull/147
- https://gist.github.com/abdelaz9z/662510f5372ae78e176d647f7dd69cb1
- https://pub.dev/packages/google_mlkit_translation
- https://seal.ics.uci.edu/publications/2023_TOSEM_Deltrdroid.pdf
- https://forum.xojo.com/t/android-barcode-scanning-capability-bundling-ml-kit/85352
- https://android-developers.googleblog.com/2026/04/gemma-4-new-standard-for-local-agentic-intelligence.html
- https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en
- https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf
- https://42matters.com/sdks/android/mlkit
- https://composables.com/android-distribution-chart
- https://killedbygoogle.com/
