# Model Readiness & Delivery API — give ML Kit's classic on-device models the availability contract its GenAI models already got

**Type:** B (extension) with E (lifecycle) character · **Verdict:** Prototype / developer-preview (a near-Build) · **Opportunity: 7/10 (Strong · unglamorous)**
*2026-10-29 · Prepared for Android ML Kit · Evidence current as of 2026-10-29*

> Right now an Android dev shipping offline translation calls `RemoteModelManager.download()`, gets a `Task<Void>` that never resolves because the user is on a train with no signal, and has no way to tell the user *why* the "Translate" button does nothing. Their only readiness signal is a point-in-time `isModelDownloaded()` boolean; their only failure signal is catching `MlKitException.UNAVAILABLE` and hoping Play Services eventually fetches the model. Meanwhile the *GenAI* side of the same SDK already ships a four-state status check and a byte-level `onDownloadProgress` callback. This idea ports that contract down to the classic models — where, by install-weighted reach, almost all the users actually are.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong · unglamorous | Mechanical map (composite 3.9 × 2 = 7.9) rounded **down**: the two softest inputs (S3 perceived-savings, search-only sizing) both bias high |
| Platform privilege (gate) | 5/5 — pass | Model delivery is owned by Play Services / AICore; only the platform can expose readiness, eligibility, and a delivery contract |
| Feasibility headroom (gate) | 5/5 — pass | Zero model risk. Google already shipped the callback surface **twice** (GenAI `DownloadCallback`; Play `AiPackState`) and on ML Kit iOS; this is porting, not research |
| Durability (gate) | 4/5 — pass | Extending a core API (`RemoteModelManager`) is durable; the SLO sub-component is the only fragile part, and Google's dev-API mortality (Cloud IoT, Fusion Tables, Google+ APIs) is the generic risk |
| Demand evidence (25%) | 4/5 | Issue #315 verbatim + a >1-year unmet maintainer thread; #165 (no progress), #168 (offline silent); 280+ repos hand-rolling wrappers incl. two commercial SDK vendors and a government health app. Docked from 5: Stack Overflow / Reddit were unreachable this run, and a partial GMS workaround exists |
| Install-weighted reach (15%) | 4/5 | Classic unbundled models reach ~the whole Play base at API 26 (r_reach ≈ 0.98, Google Dec-2025 distribution); but the *dynamic-model* subset is narrower than all of ML Kit |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path is cheap — catch the exception, show a spinner, retry — and tutorials codify it. Doing it *right* is harder, but perceived savings are modest. **This caps the composite.** |
| Integration cost / TTFHW (15%) | 5/5 | A listener/readiness read on an API devs already call; one Gradle line already present; no new permission; emulator-friendly |
| Substitute half-life (15%) | 4/5 | Only the platform can fix delivery observability; a general model won't absorb it. Risk is Google's *own* roadmap (Play AI Delivery / GenAI) absorbing it |
| Strategic complement (10%) | 4/5 | Unblocks adoption of every ML Kit managed-model API, reduces a documented abandonment cause, and becomes the natural DMA compliance surface |
| **Composite** | **3.9** | Weighted mean of S1–S6; all three gates pass |

*Least-trustworthy score: S2 (reach). The absolute addressable-app count rests on AppBrain, which was unreachable this run, so the install-weighted figure is reasoned from search snippets, not read off the source — see Open questions.*

---

## The problem

A large consumer Android app does not get to choose on-device ML as a clean build-time dependency. ML Kit's classic APIs deliver their models one of three ways — **bundled** (linked at build time, instantly available, bloats the APK), **unbundled** (downloaded and updated by Google Play Services), or **dynamically downloaded** on demand ([installation-paths docs](https://developers.google.com/ml-kit/tips/installation-paths), via search extraction). Translation, Digital Ink Recognition, and Entity Extraction are *dynamic-only* — there is no bundled option — and Barcode, Text Recognition, Face Detection, and Image Labeling are unbundled whenever the developer picks the smaller-APK path. For every one of those, the model is not guaranteed present at first launch.

That is a deliberate, sensible trade: Google Play's own figure is that every 6 MB of APK costs ~1% of install conversion, worse in growth markets, so teams pick the unbundled path precisely to protect installs. But the trade hands the developer a runtime state they can barely observe. The entire readiness surface for a classic model is `RemoteModelManager.isModelDownloaded(model) → Task<Boolean>`, `download(model, DownloadConditions) → Task<Void>`, `deleteDownloadedModel(...)`, and `getDownloadedModels(...)` ([RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager), via search extraction). There is no status enum, no download-progress callback, no subscribable stream of state transitions, and — when a model is absent or a fetch fails — only an opaque `MlKitException.UNAVAILABLE`.

The job to be done is unglamorous and universal: *"before I show the user a feature that depends on a model, tell me reliably whether it will work, and if not, why not and how far along the fix is."* The workaround today is to call the detector, catch the exception, show an indeterminate spinner, and retry — a pattern a [Transloadit OCR tutorial](https://transloadit.com/devtips/implementing-ocr-in-android-apps-with-google-ml-kit/) teaches as accepted practice. On an offline device the retry never resolves ([issue #168](https://github.com/googlesamples/mlkit/issues/168): "`RemoteModelManager.download()` doesn't return any error or result when called without internet connection"), and the user sees a button that silently does nothing.

This is structural, not a bug. It is produced by the constraints a 100M-install app operates under — install-size sensitivity forces the unbundled path; a 6-year-deep device fleet and simultaneous global regulation mean failures are device- and region-specific and invisible in dev testing; and the app's ML org is server-side, so the one engineer who understands Play-Services model delivery is scarce. The platform owns the delivery mechanism and exposes almost none of its state. That is the gap.

---

## Proof & signals

**Developers doing it by hand — the strongest signal.** Authenticated GitHub code search returns **280+ Kotlin files** across real apps hand-rolling ML Kit model management, with a telling naming convention — `ModelManager`, `Installer`, `Readiness`, `ModuleAvailabilityCheck`. Named instances include two **commercial SDK vendors** shipping literal readiness state machines inside paid products — `MlKitModelReadiness.kt` ([todenhq/kyc-sdk-flutter](https://github.com/todenhq)) and `MlKitReadinessProvider.kt` ([vsindustries/idscan-sdk](https://github.com/vsindustries)) — and apps with real traction: [meshtastic/Meshtastic-Android](https://github.com/meshtastic/Meshtastic-Android) (1,895★, `MlKitMessageTranslator.kt`), [LagradOst/QuickNovel](https://github.com/LagradOst/QuickNovel) (1,876★, `TranslationManager.kt`), and the official German e-prescription app [gematik/E-Rezept-App-Android](https://github.com/gematik/E-Rezept-App-Android) (`DefaultTranslationModelManager.kt` — a full manager + datasource layer). Nobody packages this as a library — it is copied inline, app by app — which is the clearest tell of a missing platform primitive. *Evidence: confirmed via GitHub MCP code search, 2026-10-29.*

**Community voice.** The canonical complaint is [googlesamples/mlkit issue #315](https://github.com/googlesamples/mlkit/issues/315) (opened 2021-06-21, closed "completed" 2022-08-31 without the asked-for API):

> "There is still no way to get availability and download status of the unbundled standard ML Kit models (e.g. barcode), right? Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."

The maintainer thread shows the ask sitting unmet for over a year ("waiting for a download infrastructure update from Play Services… possibly Q2 2022"), resolved only with a pointer to the GMS `ModuleInstallClient` API — a *partial, module-scoped* workaround for detectors implementing `OptionalModuleApi` (barcode and friends), not a status/progress contract for translation, digital ink, or custom `RemoteModel` downloads. Siblings: [#165](https://github.com/googlesamples/mlkit/issues/165) ("the download API doesn't report the exact downloading progress… 10%, 20%, 50%", still unaddressed per a 2023 comment) and [#168](https://github.com/googlesamples/mlkit/issues/168) (offline silent failure). *Evidence: confirmed verbatim, 2026-10-29.*

**The absence signal, read carefully.** Stack Overflow and Reddit were unreachable to the research crawler this run, so I am *not* claiming their vote-counts — that is a gap, not a zero. The GitHub evidence alone is strong and dated; the missing channels would only strengthen it.

---

## Why now

1. **Capability shift.** Google itself built the missing contract twice in the last ~18 months — for *other* surfaces. GenAI's `DownloadCallback` (`onDownloadStarted`/`onDownloadProgress`/`onDownloadCompleted`/`onDownloadFailed`) shipped with the on-device GenAI APIs ([announced 2025-05-20](https://android-developers.googleblog.com/2025/05/on-device-gen-ai-apis-ml-kit-gemini-nano.html)), and the **Play AI Delivery Library** (`com.google.android.play:ai-delivery:0.1.1-alpha01`) shipped a full `AiPackState` state machine ([Play for On-device AI](https://developer.android.com/google/play/on-device-ai)). The pattern is proven and in-house; the classic models simply never got it.
2. **Competitive shift.** At WWDC26 Apple shipped `SystemLanguageModel.availability` — a synchronous, typed "is it ready and why not" read ([Apple docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason)). Apple now has the clean readiness contract Android lacks; this is a visible, dated gap, not a theoretical one.
3. **Regulatory shift.** The European Commission's DMA Article 6(7) decision on Alphabet (adopted **16 July 2026**) forces Google to open on-device AI models and related OS features to third-party AI services, with implementation in **Android 18 by 1 August 2027**, "free of charge" ([EC developer portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en), via search extraction — primary page unreachable this run). It governs *access*, not a readiness contract — which is exactly why a well-specified contract becomes the natural, uniform compliance surface rival assistants will query.

This is a genuine three-part why-now, but note the honest weakness: none of the three is a hard deadline *for this specific API*. The idea is correct and overdue rather than time-critical.

---

## The capability gap

Precise boundary, each negative tied to what was checked:

- **Classic unbundled ML Kit (Android):** boolean `isModelDownloaded` + `download()` + opaque `MlKitException`. No status enum, no progress, no transition stream. ([RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager), search extraction, 2026-10-29.) **This is the gap.**
- **ML Kit GenAI (Android):** `FeatureStatus` — an int-backed `@IntDef`, `UNAVAILABLE(0)/DOWNLOADABLE(1)/DOWNLOADING(2)/AVAILABLE(3)` — read *point-in-time* via `checkFeatureStatus()`, plus a real byte-level `DownloadCallback`. Good, but point-in-time (not a subscribable availability stream) and scoped to Gemini Nano. ([FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus), [DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback).)
- **Play for On-device AI:** the richest — `AiPackState` with `status()`, `totalBytesToDownload()`, `bytesDownloaded()`, `transferProgressPercentage()`, a push `AiPackStateUpdateListener`, and a ten-value `AiPackStatus` enum. But it governs **developer-shipped packs** (your LiteRT/MediaPipe models), *not* ML Kit's own managed models, and carries **no SLO**. ([docs](https://developer.android.com/google/play/on-device-ai), direct fetch.)
- **ML Kit iOS `ModelManager`:** already communicates download progress and success/failure via notifications. The Android gap is **Google's own product being inconsistent across its two platforms.**
- **Apple FoundationModels:** `availability → .available / .unavailable(.deviceNotEligible | .appleIntelligenceNotEnabled | .modelNotReady)` + `isAvailable: Bool`. The benchmark for a clean readiness read — but one system model, no per-feature delivery state machine, and no SLO. ([Apple docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel), direct fetch.)

**The main competitor** a developer uses today is not another SDK — it is their own hand-rolled wrapper around `RemoteModelManager`, plus the GMS `ModuleInstallClient` escape hatch for the subset of detectors that support it.

---

## Proposed surface

A single **Model Readiness & Delivery API** on `RemoteModelManager` (and mirrored by GenAI's `checkFeatureStatus`), porting the contract Google has already shipped elsewhere. The delta against today, as a diff:

```kotlin
// TODAY: boolean + opaque exception
manager.isModelDownloaded(model).addOnSuccessListener { downloaded -> /* true/false, no "why", no progress */ }

// PROPOSED: typed readiness + why-not taxonomy + subscribable transitions + progress
val readiness: ModelReadiness = manager.readiness(model)          // point-in-time, synchronous-cheap
when (readiness) {
    is Ready -> enableFeature()
    is Downloading -> showProgress(readiness.transferProgressPercentage)   // reuses AiPackState semantics
    is Downloadable -> offerDownload()
    is Unavailable -> explain(readiness.reason)   // DeviceNotEligible | Offline | QuotaExceeded | ModelDeprecated | StorageFull
}
manager.readinessUpdates(model).collect { state -> /* Flow of transitions, like AiPackStateUpdateListener */ }
```

What it deliberately does **not** do: it does not train, host, or change any model; it does not promise a model on an ineligible device (it names *why not*); and the **SLO is explicitly out of the v1 surface** — see the case against. Design constraint: **time-to-first-hello-world under 15 minutes**, which it meets because adopters already call `RemoteModelManager` — this adds a readiness read and an optional `collect`, no new Gradle dependency, no permission, works in the emulator. The one thing that must be true to hit that: the `reason` taxonomy is finite and stable (Apple's three-case bound is the model to copy, widened for Android's offline/quota/storage realities).

---

## Reach & sizing

Honest and ranged, because the absolute denominator (AppBrain) was unreachable this run.

- **Device eligibility (r_reach):** ≈ **0.98** at API 26 — Google's Dec-2025 distribution snapshot puts Android 8.0+ at ~98.4% (per-version Google-published; cumulative is my arithmetic). Classic ML Kit's minSdk 21 is effectively universal. *High confidence.*
- **Addressable apps:** the set is "apps using ML Kit's dynamically-delivered models." A specialized on-device ML SDK's realistic 3-year adoption ceiling (c_ceiling) is low single-digit % of all Play apps — I use **5% (range 3–8%)**, *low confidence, reasoned not read.* Install-weighting (m_install, %installs ÷ %apps) ≈ **1.5 (range 1.3–1.7)** from 42matters within-category shares, *low-moderate confidence* — ML Kit skews to high-install apps, so install-weighted reach exceeds app-count reach.
- **Engineering cost avoided:** the honest number is *modest per app* — a hand-rolled wrapper is ~1–3 engineer-weeks to build and then maintain against device-specific failures — but it recurs for every managed-model adopter and, per the 280-repo evidence, is paid in full by each one independently. The larger lever is **adoption unblocked**: a documented cause of abandoned ML Kit integrations removed.

**Sensitivity:** halve both soft inputs (c_ceiling → 2.5%, m_install → 1.25) and the *engineering-weeks-saved* case weakens to clearly feature-grade. The verdict does **not** rest on the weeks saved — it rests on platform consistency and unblocked adoption, which survive the halving. That is precisely why this is a Prototype, not a slam-dunk Build: the quantitative ROI is a feature; the qualitative case (your own SDK is internally inconsistent, and Apple shipped the clean version) is what elevates it.

---

## Adoption path

1. **The hook:** a dev already catching `MlKitException.UNAVAILABLE` swaps in `manager.readiness(model)` and finally gets to tell the user "Downloading language model… 60%" instead of a dead button. Fifteen minutes, in an app they already ship.
2. **First real integration:** the `readinessUpdates` Flow replaces their hand-rolled polling-and-retry wrapper — they delete code.
3. **The dependency:** once the UI branches on the typed `reason`, removing it means re-introducing the opaque-exception guesswork. They'd endorse the lock-in because it deleted a maintenance burden.

**First adopter:** a translation-heavy app on the dynamic-model path — the reader apps (QuickNovel, NovelDokusha) and messengers (Meshtastic, Pachli) already hand-rolling this are the reference implementations waiting to happen. Second wave: the commercial KYC/ID-scan SDK vendors, who would drop their bespoke readiness layers.

---

## Execution plan

- **Developer preview:** ship `readiness()` + `readinessUpdates()` on `RemoteModelManager` for translation and entity extraction only. Question it answers: *does a typed readiness contract actually let teams delete their wrappers, and is the `reason` taxonomy complete?* Partners: the OSS translation apps above.
- **Alpha/Beta:** graduate when the `reason` enum has survived three real integrations without needing a new case, and progress reporting is validated across a low-end device sample. Extend to digital ink and the unbundled vision models; align semantics with Play's `AiPackStatus` so the two delivery surfaces don't diverge.
- **GA:** commit the enum and Flow contract with independent versioning. **Defer any SLO** to a later, separately-scoped decision.

**Org dependency, named honestly:** the readiness contract lives in ML Kit (it owns `RemoteModelManager` and the GenAI `DownloadCallback`), but model *delivery* is Play Services, and Play already owns `AiPackState`. If the Play team won't expose the underlying delivery state to ML Kit, the API degrades to a nicer wrapper over the same boolean. That conversation is the critical-path risk, not the engineering.

---

## The case against

Argued at full strength: **this is a feature, not a platform API.** A skeptic notes that (a) the borrow path is a one-day hack that tutorials already teach; (b) Google *already* has two delivery state machines (GenAI `DownloadCallback`, Play `AiPackState`) and a partial GMS `ModuleInstallClient` path — so this is filling a seam, not opening territory; and (c) the most ambitious piece, an SLO, is close to unfulfillable: you cannot promise delivery to an offline user, so a delivery *guarantee* is a liability worse than silence. The live failure mode from the rubric is **#8, deprecation/maintenance by a thousand cuts** paired with **#2, the platform absorbing its own problem** — if ML Kit ships this narrowly it is one more surface to version; if it ships nothing, Play AI Delivery may eventually swallow the use case.

The rebuttal, and why the verdict is still Prototype-leaning-Build: the one-day hack is real but *recurs 280+ times and is sold inside commercial SDKs and a government health app* — convergent independent re-implementation is the definition of a missing primitive, and the per-app day compounds into permanent per-app maintenance against device-specific failures the app team can't even reproduce. The SLO objection is correct — so the proposal **cuts the SLO from v1** and keeps the defensible core: typed readiness + a why-not taxonomy + progress + transitions, unifying classic and GenAI. That core has *no shipped equivalent from either vendor* and is exactly what Apple demonstrated users of the platform expect.

---

## Kill criteria

**The single observation that would reverse this:** if, at I/O 2027, Google ships a unified readiness/status surface on `RemoteModelManager` (or folds classic managed models into the Play `AiPackState` state machine), the idea is moot — the platform absorbed it. Checkable at one keynote.

**Load-bearing assumption:** that the 280+ hand-rolled wrappers reflect *current, ongoing* pain and that classic dynamic-model APIs still matter — i.e. that the ecosystem is not migrating wholesale off translation/entity-extraction onto Gemini Nano (which has its own, better, delivery surface). If classic-model usage is in structural decline, the reach argument hollows out.

**Re-check trigger if shelved:** a repeat demand scan showing the wrapper-repo count *rising*, or the DMA Android-18 implementation (Aug 2027) forcing a readiness surface anyway.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase/Play. ML Kit owns `RemoteModelManager` and the GenAI `DownloadCallback`; it is the only team positioned to make *managed-model* readiness consistent across classic and GenAI. Play owns delivery of *developer-shipped* packs — a different contract for a different artifact — and the right move is for ML Kit to align vocabulary with `AiPackStatus`, not to duplicate it. If the honest answer is that Play Services should expose a lower-level delivery-state API that ML Kit merely surfaces, that is still an ML Kit-led spec. Putting it anywhere else fragments the developer story further, which is this stack's defining internal risk.

---

## Open questions

- **Absolute SAM.** AppBrain (apps-%/installs-% for ML Kit) was unreachable this run; the reach score rests on reasoned ranges. *Settled by:* allow-listing appbrain.com and reading the ML Kit SDK detail page.
- **Is classic-model usage growing or declining** relative to GenAI? The load-bearing assumption. *Settled by:* a longitudinal AppBrain/42matters read.
- **Will Play expose the underlying delivery state** to ML Kit? The execution-path gate. *Settled by:* an internal conversation, not research.
- **Does the DMA decision's text** touch delivery signalling? Primary EC page was unreachable; secondary coverage says access/interop only. *Settled by:* reading the specification clauses directly.
- **"140M+ Nano devices"** has no primary Google source (third-party only) — immaterial to this idea (it targets the classic path) but flagged because it recurs in this space.

---

## Runners-up

- **On-device eval / quality-regression harness + token accounting (Type D).** *Still open and strong.* Apple shipped an Evaluations framework and `response.usage` token accounting (incl. cached + reasoning tokens) at WWDC26; ML Kit has only a prose "evaluate prompt quality" page and cloud-only `countTokens`. Lost to the primary on demand-evidence *concreteness* — the availability pain has 280 repos and a verbatim quote; the eval gap is argued mostly from Apple's move. Promote next run.
- **Hybrid routing policy engine (Type C/F).** Firebase AI Logic already ships mode flags (`PREFER_ON_DEVICE` etc.); the gap is a real policy engine on thermal/battery/availability/network inputs. Lost on org-dependency (spans Firebase + ML Kit + AICore) and substitute-half-life risk.
- **On-device moderation / safety classifier (Type G).** *Still open.* No standalone ML Kit moderation API; Android SafetyCore is a system service, not a developer classifier. Lost on the one-size-fits-all policy problem (needs tunability to survive a real T&S team) — a stronger candidate once that's designed.
- **On-device neural TTS (Type A).** **Killed — already ships.** `com.google.mlkit:genai-text-to-speech:1.0.0-alpha1` (`SpeechSynthesizer`, generative voices, Flow streaming, Pixel 8–11/recent Galaxy, API 26+). This **corrects the Aug-2026 landscape snapshot**, which listed on-device TTS as Google whitespace — it is now closed.
- **Deferred/opportunistic inference scheduling (Type E).** *Parked.* Fails the demand gate — the capability can't be built by anyone but the platform, so there is no external OSS re-implementation signal to prove demand.

---

*Sources:*
- [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [ML Kit GenAI FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) · [DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)
- [ML Kit installation paths](https://developers.google.com/ml-kit/tips/installation-paths) · [release notes](https://developers.google.com/ml-kit/release-notes)
- [ML Kit GenAI Text-to-Speech (Android)](https://developers.google.com/ml-kit/genai/text-to-speech/android)
- [On-device GenAI APIs announcement (2025-05-20)](https://android-developers.googleblog.com/2025/05/on-device-gen-ai-apis-ml-kit-gemini-nano.html)
- [Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [Availability](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason) · [WWDC26 Foundation Models](https://developer.apple.com/videos/play/wwdc2026/241/)
- [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315) · [#165](https://github.com/googlesamples/mlkit/issues/165) · [#168](https://github.com/googlesamples/mlkit/issues/168)
- [meshtastic/Meshtastic-Android](https://github.com/meshtastic/Meshtastic-Android) · [LagradOst/QuickNovel](https://github.com/LagradOst/QuickNovel) · [gematik/E-Rezept-App-Android](https://github.com/gematik/E-Rezept-App-Android)
- [Transloadit ML Kit OCR devtip](https://transloadit.com/devtips/implementing-ocr-in-android-apps-with-google-ml-kit/)
- [EU DMA Alphabet interoperability specification](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)

*Research note: `developers.google.com`, `developers.google.cn`, AppBrain, apilevels.com, the EC DMA portal, and killedbygoogle.com were not fetchable via the research tooling this run; claims sourced to those canonical URLs were read via search-result extraction, and are labelled accordingly. `developer.apple.com`, `developer.android.com`, and GitHub were fetched directly.*
