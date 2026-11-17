# Model Delivery Contract — one observable, versioned, SLO-backed lifecycle for every ML Kit model

**Type:** E (delivery & lifecycle), with a Type C (developer-experience) core · **Verdict:** Prototype the narrow DX unification; shelve the grand SLO/version contract · **Opportunity: 5/10 (narrowing window)**
*2026-11-17 · Prepared for Android ML Kit · Evidence current as of 2026-11-17*

*Badges: Google is already half-solving this · Regulatory clock (DMA, 1 Aug 2027) · Weak build-vs-borrow delta*

> On a Tuesday, an Android developer ships a translation feature, and a fraction of users on a train with no Wi-Fi tap the button and get nothing — no spinner, no error they can show, because `RemoteModelManager` reports only `isModelDownloaded() → false` with no reason and no progress. The developer's workaround, filed verbatim in ML Kit's own tracker since 2021, is to "keep the analyzer alive… and hope for the Play Services to eventually download the model." Six years and at least eight issues later, the one progress hook that exists still only ever fires `1.0`. This proposes the delivery contract the platform already ships for app modules — just never for models.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — narrowing window | composite 2.9 × 2 = 5.8, −1 for Durability gate at exactly 3; not +1 (demand isn't a 5) → ~5 |
| Platform privilege (gate) | 5/5 — pass | Only Play Services/AICore own model delivery; nobody else can offer an SLO ([AICore manages distribution](https://developer.android.com/ai/gemini-nano)) |
| Feasibility headroom (gate) | 5/5 — pass | The 11-state contract already ships for app modules ([`SplitInstallSessionStatus`](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)); this is exposure, not new capability |
| Durability (gate) | 3/5 — pass (binding gate) | Surface owner is durable; an output-stability SLO across model refreshes is a hard, mostly-unaddressed 5-year commitment |
| Demand evidence (25%) | 3/5 | Six-year recurrence (#165→#1085) and open bug #773, but canonical #315 is *closed*, no high-star library, no vendor sells this |
| Install-weighted reach (15%) | 3/5 | ~10–20% install-weighted for classic models; SLO's richest value touches only the ~3.7% Nano tier |
| Build-vs-buy-vs-borrow (20%) | 2/5 | The glue is a weekend wrap of `RemoteModelManager` + `.timeout()` — flutter #906 was fixed exactly that way |
| Integration cost / TTFHW (15%) | 4/5 | One listener/Flow, no new permission, negligible size — but the full cross-surface contract is more than a one-liner |
| Substitute half-life (15%) | 2/5 | Google's own `FeatureStatus` already closed binary→observable; Firebase AI Logic routes around delivery; DMA may redefine the surface |
| Strategic complement (10%) | 4/5 | Reliable on-device delivery cuts the two-implementation tax that pushes teams to cloud |
| **Composite** | **2.9** | Weighted mean; carried by privilege + feasibility, dragged by build-delta + substitute half-life |

*Least trustworthy line: install-weighted reach. The AppBrain ML Kit detail page never rendered this session, so the ~2%-of-apps anchor is triangulated from TensorFlow Lite's 1.08%/10.41% and Google's 2020 ">25,000 apps," not an observed figure.*

---

## The problem

The job to be done: *an Android developer integrating an on-device model needs to tell the user, truthfully and in real time, whether the feature is ready, downloading, or unavailable-and-why — without writing their own state machine.* The customer is an IC under a ship deadline; the competing solution is their own polling loop.

This problem is structurally produced, not accidental. A 100M+ install app can't bundle every model — [Google Play's own figure is ~1% of install conversion lost per 6 MB of APK growth](https://developers.google.com/ml-kit/tips/reduce-app-size), worst in the growth markets where [over half of Indian and Indonesian users have no Wi-Fi](https://developers.google.com/ml-kit/tips/reduce-app-size). So models are delivered dynamically. But dynamic delivery is owned by Play Services, which exposes almost none of its own state back to the app. The result is a feature the app promises in its UI sitting on top of a delivery mechanism the app can neither observe nor reason about. That is a platform problem, not an app problem: every app solves it identically and badly, which is the textbook signature of something that belongs in the platform.

What developers do instead today, named: wrap `RemoteModelManager` in a retry loop and hope; apply a `.timeout()` because `downloadModel()` otherwise hangs forever ([flutter #906](https://github.com/flutter-ml/google_ml_kit_flutter/issues/906)); route delivery through the GMS `ModuleInstall` API as a workaround ([ervareza/screen-translator](https://github.com/ervareza/screen-translator)); or re-implement an observable `getModelState()` + subscription from scratch ([react-native-mlkit-translation](https://github.com/luongminh2410dev/react-native-mlkit-translation)).

---

## Proof & signals

- **Developers doing it by hand:** The sharpest artifact is [`react-native-mlkit-translation`](https://github.com/luongminh2410dev/react-native-mlkit-translation), which hand-builds exactly the proposed contract — `getModelState()`, a `useModelState` hook, and a model-state **subscription** — because the platform gives none. Several more wrap `RemoteModelManager` + `DownloadConditions` with bespoke pre-flight and error handling ([godsarmy/mlkit-markdown-translator-android](https://github.com/godsarmy/mlkit-markdown-translator-android), [ayarktsohg/GoogleMLtranslator](https://github.com/ayarktsohg/GoogleMLtranslator)). *Evidence status: confirmed, repos fetched. Caveat: all low-star — a "many small hand-rolls" pattern, not one popular library.*

- **Community voice (verbatim):**
  - [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315) (opened 2021-06-21, **closed** 2022-08-31): *"There is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services [...] to eventually download the model. But if the user is offline… this won't happen at all and we have no indicator about that."* **Correction to the landscape snapshot, which lists this as open:** it is closed, resolved only partially by pointing to `ModuleInstallClient`/`OptionalModuleApi`, which covers some detectors but **not** translation, digital ink, or custom models.
  - [#773](https://github.com/googlesamples/mlkit/issues/773) (2024-02-09, **open**): the `fractionCompleted` progress value "only updates when the download is finished," so the sole progress signal that exists is effectively dead on arrival.
  - [#641](https://github.com/googlesamples/mlkit/issues/641) (2023-03-15, open, 12 comments — highest engagement found): Google's *own* code-scanner sample fails to download its model and the developer can't read availability state.
  - [#1085](https://github.com/googlesamples/mlkit/issues/1085) (2026-11-09, open): digital-ink download "stays pending" with no resolvable state — the problem is live this month.
  - *Evidence status: confirmed via GitHub fetch. Dates and states verbatim.*

- **The recurrence signal:** the same unmet need appears in [2020 (#165)](https://github.com/googlesamples/mlkit/issues/165), 2021 (#315), 2023 ([#672](https://github.com/googlesamples/mlkit/issues/672)), 2024 ([#796](https://github.com/googlesamples/mlkit/issues/796)), and 2026 (#1085, flutter #906). Six years, same complaint.

- **Someone charging money for it:** nobody. This is glue, not a sellable product — which is itself a finding: it caps demand strength. No commercial vendor validates willingness-to-pay the way Picovoice does for TTS.

- **The absence signal:** no high-star library coalesced, and Stack Overflow/Reddit/HN metrics were unreachable this session (network-blocked), so I can't claim those venues are loud. The honest read: real, widespread, fragmented pain — the shape of a missing primitive — but not a viral groundswell.

---

## Why now

1. **Capability shift (ongoing, 2025–26):** dynamically-delivered models went mainstream. ML Kit GenAI shipped a 4-state `FeatureStatus` (UNAVAILABLE/DOWNLOADABLE/DOWNLOADING/AVAILABLE) and a `DownloadCallback` with byte-level progress in 2025–26 — proof the platform is *already* moving on observability, which cuts both ways (see substitute half-life).
2. **Regulatory shift (dated):** the European Commission adopted a [DMA Article 6(7) specification decision on 2026-07-16](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) requiring Google to let third parties reach and run on-device AI models, implemented in **Android 18 by 1 August 2027** (a hotword carve-out follows by 1 Aug 2028). On-device models are explicitly in scope; a delivery/availability *signal* is **not** named — so the regulation makes a clean public delivery contract *more urgent* without specifying it. Google is appealing, which may delay but not remove the obligation.
3. **Demand shift:** weaker. Developers have asked for progress bars since 2020; the ask has not accelerated, only persisted. A weak why-now on this axis is a real finding: the idea is correct and not urgent on demand alone — the urgency is borrowed entirely from the DMA date.

---

## The capability gap

- **ML Kit GenAI (Nano):** `FeatureStatus` enum + `DownloadCallback` byte progress. *No* model-version observability, *no* ETA, *no* offline reason code, *no* SLO ([FeatureStatus ref](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus)).
- **ML Kit classic (`RemoteModelManager`):** `isModelDownloaded() → Boolean` + `download(conditions)`. No progress on Android, no status enum, no reason codes ([ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)). This is where the issues cluster.
- **Play for On-device AI (`AiPackManager`):** the richest machine — ~10 states incl. `WAITING_FOR_WIFI`, `REQUIRES_USER_CONFIRMATION`, progress %, error codes — but **only for the developer's own packaged weights**, never a first-party managed model ([ref](https://developer.android.com/google/play/on-device-ai)).
- **Android app modules (`SplitInstallSessionStatus`):** an 11-state delivery contract (PENDING/DOWNLOADING/DOWNLOADED/INSTALLING/INSTALLED/FAILED/REQUIRES_USER_CONFIRMATION/CANCELING/…) with listener + Flow, shipped and stable ([ref](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)). The exact contract exists — just not for models.
- **Apple Foundation Models:** `SystemLanguageModel.availability` → `.available` / `.unavailable(.deviceNotEligible / .appleIntelligenceNotEnabled / .modelNotReady)`. Coarse, no progress, no SLO ([ref](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)). Apple has *not* won this one — it's a draw at "coarse."

**The precise boundary:** binary→observable is largely *closed* for the new GenAI path and partly for Apple. What **nobody** ships is the combination of (a) one consistent lifecycle state machine across all model surfaces, (b) model-version/update observability, and (c) a delivery service-level commitment. **Main competitor a developer uses today:** their own polling-loop-plus-timeout, or Firebase AI Logic's "just fall back to cloud," which sidesteps delivery observability entirely.

---

## Proposed surface

A single `ModelDelivery` contract that every ML Kit model path reports through, modeled directly on `SplitInstallSessionStatus`:

```kotlin
val session = ModelDelivery.request(TranslateModel("es"), DownloadConditions(wifiOnly = true))
session.state.collect { s ->   // Kotlin Flow, same shape as SplitInstall
  when (s) {
    is Downloading -> ui.show(s.bytesDownloaded, s.totalBytes, s.etaSeconds)
    is WaitingForWifi -> ui.showOfflineHint()           // the signal #315 asked for
    is Unavailable -> ui.explain(s.reason)              // typed reason, not a bare boolean
    is Available -> ui.enable(modelVersion = s.version) // version observability
    is Failed -> ui.retry(s.errorCode)
  }
}
```

It deliberately does **not**: promise a hard download-time SLA (best-effort ETA only), expose AICore internals, or guarantee availability on unlocked bootloaders. The ambitious layer — an *output-stability* contract that pins behavior across model refreshes and versions it independently — is specified as a separate, later commitment, because it is the expensive, durable, low-current-demand part.

**Time-to-first-hello-world target: 15 minutes.** Achievable for the state-observation core (one Flow, no new permission, no size add). *Not* achievable for the output-stability SLO, which requires a versioning contract — which is exactly why this report splits the two.

---

## Reach & sizing

*All AppBrain figures are third-party crawl estimates; the ML Kit detail page did not render, so the anchor is triangulated.*

- `A_cat` total Android apps ≈ 1.85M ([AppBrain](https://www.appbrain.com/stats/libraries), Jun 2026).
- ML Kit `%apps` ≈ **2% (1.5–2.5%)**, triangulated from TensorFlow Lite's observed 1.08%/10.41% and Google's 2020 ">25,000 apps" extrapolated — *my estimate, not an observed AppBrain value*.
- Install-weighting `m` ≈ 7× (TF Lite's observed 9.6×, flattened for ML Kit's broader small-app reach).

**Arithmetic (mine):** 2% × 1.85M = **~37,000 addressable apps** (range 28k–60k). Install-weighted = 2% × 7 = **~14% of the Android install surface** (range 9–22%). Device-side, classic dynamically-delivered models run on **~3B+ (whole Play-services base)**; the GenAI/Nano tier where an SLO matters most is **~3.7%** (140M+ devices, Apr 2026, ÷ ~3.8B third-party active — my arithmetic on a Google numerator and a third-party denominator).

**Ceiling:** this is an *improvement to a surface apps already use*, so there's no cold-start curve — the ceiling ≈ today's dynamic-model base plus organic growth (~30–65k apps). **Sensitivity:** halve the anchor to 1% → ~18,500 apps, ~7% of installs. A meaningful platform footprint **survives**; a "universal/every-app" claim does **not** — and was never made.

**Engineering cost avoided** is the weak numerator: at ~1–3 engineer-weeks saved per app (the glue is cheap to borrow), the platform test clears the build cost but not by the wide margin privilege alone suggests.

---

## Adoption path

1. **The hook:** drop-in `.state` Flow on an API the app already calls — a working progress bar and an offline hint in 15 minutes, replacing a hand-rolled timeout.
2. **First real integration:** replace the retry-and-hope loop in a shipping translation/segmentation feature; what it replaces is bespoke glue the team already resents.
3. **The dependency:** typed reason codes and version observability become load-bearing in the app's own error UI — removable only by rewriting that UI, a cost they'd endorse rather than resent.

**First adopter:** a mid-size app already filing these issues (the flutter-ml community, or a translation-heavy app). **Second wave:** unlocked by one reference implementation in the ML Kit sample repo doing offline-aware delivery cleanly.

---

## Execution plan

- **Developer preview (narrow):** unify `RemoteModelManager` + `FeatureStatus` behind one `SplitInstall`-shaped state Flow, fix the dead `fractionCompleted` (#773), add offline/`WAITING_FOR_WIFI` reason codes. Question it answers: *does fixing the cheap glue move adoption, and is there any pull for the SLO layer?* This is the whole near-term bet.
- **Alpha→Beta graduation condition:** demand evidence for the version/output-stability contract appears (partners asking for pinning), **or** the DMA certification terms (due ~Feb 2027) specify a delivery surface. Absent either, stop here.
- **GA (conditional):** commit the versioned delivery + output-stability contract only if the above triggers fire.

**Org dependency, named honestly:** this requires the **Play Services / AICore delivery team**, not just ML Kit — ML Kit owns the SDK surface but not the delivery mechanism underneath. If that team says no, ML Kit can ship the unified *client* shape but cannot promise any SLO. An execution plan that pretended otherwise would be a wish.

---

## The case against

The strongest case, argued fairly: **the platform is absorbing this problem underneath the proposal** (failure mode #2 from the rubric). Google already shipped `FeatureStatus` with progress for the GenAI path; extending the same treatment to `RemoteModelManager` and fixing #773 are obvious next steps on Google's *own* roadmap, requiring no new API concept. Meanwhile Firebase AI Logic's "fall back to cloud" makes delivery observability irrelevant for the apps that adopt it. So the window is narrowing from both sides: Google closes the DX gap piecemeal, and the hybrid-cloud path routes around the need. The part that *is* durable and uniquely platform-owned — a formal delivery SLO and output-stability contract — is precisely the part with the weakest demand evidence: developers in the tracker ask for progress bars and offline hints (cheap, low-privilege), not service-level commitments. That mismatch is the core risk. Mitigation is the narrow-prototype scoping above: ship the cheap high-demand fix, and let it earn — or fail to earn — the case for the expensive durable layer, rather than committing to a five-year SLO on today's thin evidence.

---

## Kill criteria

**The single observation that would reverse this recommendation:** ML Kit's release notes add download-progress + typed availability state to `RemoteModelManager` (closing #773 and #315's residue) before this ships — check [the release notes](https://developers.google.com/ml-kit/release-notes) each run. If Google ships it first, even the narrow prototype is redundant.

**Load-bearing assumption:** that developers want an observable delivery *contract*, when the evidence only firmly shows they want a working *progress bar and offline signal*. If those are all they want, this is a bug-fix backlog, not a platform API.

**Re-check trigger if shelved:** the DMA certification terms (~Feb 2027) or Android 18 spec (1 Aug 2027) explicitly define a third-party delivery/availability surface — at which point the SLO layer becomes mandatory-adjacent and this returns as a Build.

---

## Fit for this team

ML Kit owns the *SDK surface* developers call, so the unified client-side state Flow is squarely its job. But the *delivery mechanism and any SLO* live in Play Services / AICore. The honest conclusion: ML Kit should own the **unified observable client contract** (Type C), and should **co-own or hand the SLO/version commitment to the Play Services delivery team** (Type E). Shipping the client shape without that team's buy-in produces an API that can report state but can't promise anything — useful, but not the platform win. If the delivery team won't commit, say so and ship the smaller thing rather than over-claim.

---

## Open questions

- **Does `RemoteModelManager` progress work at all, or is it as dead as GenAI's #773?** Settle by fetching the ref page in a browser (network-blocked this session) and testing on-device.
- **Is there any pull for output-stability/versioning specifically?** Settle by asking 5 partner teams whether model-refresh drift has ever broken them — none of the tracker issues raise it.
- **What exactly does the DMA spec require on delivery?** The primary Commission page and spec PDF were unreachable this session; "equivalent performance" wording and whether delivery signalling is named are unverified against the primary text.
- **Real install-weighted ML Kit share** — the AppBrain detail page never rendered; the 2% anchor is triangulated.

---

## Runners-up

- **On-device neural TTS (Type A):** true whitespace (Picovoice sells Orca; Apple added speech gen), strong demand — but fails on **Platform Privilege**: strong OSS alternatives ship faster than a frozen platform API.
- **On-device eval harness + token/usage accounting (Type D):** Apple shipped Evaluations at WWDC26; ML Kit has a prose page and nothing to run. Lost narrowly — demand is more latent (catching up to Apple) than a quoted in-tracker pain. **The strongest runner-up; worth its own run.**
- **Standalone safety/moderation classifier (Type G):** regulatory clock (Play makes devs liable; Bumble open-sourced one) — but risks dying on contact with trust-and-safety teams who treat policy as proprietary; tunability is unsolved.
- **GenAI on sub-8 GB devices (Type F):** huge coverage story — but feasibility is the whole game and no RAM-distribution data exists to size it.

---

*Sources: [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) · [DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) · [RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [Gemini Nano / AICore](https://developer.android.com/ai/gemini-nano) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [SplitInstallSessionStatus](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus) · [On-demand delivery](https://developer.android.com/guide/app-bundle/on-demand-delivery) · [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [Firebase AI Logic hybrid](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started) · [MediaPipe LLM Inference](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android) · [DMA Commission guidance 2026-07-16](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) · [DMA Alphabet interoperability proceedings](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · ML Kit issues [#315](https://github.com/googlesamples/mlkit/issues/315), [#773](https://github.com/googlesamples/mlkit/issues/773), [#165](https://github.com/googlesamples/mlkit/issues/165), [#641](https://github.com/googlesamples/mlkit/issues/641), [#672](https://github.com/googlesamples/mlkit/issues/672), [#1085](https://github.com/googlesamples/mlkit/issues/1085), [#796](https://github.com/googlesamples/mlkit/issues/796), [#744](https://github.com/googlesamples/mlkit/issues/744) · [flutter-ml #906](https://github.com/flutter-ml/google_ml_kit_flutter/issues/906) · [react-native-mlkit-translation](https://github.com/luongminh2410dev/react-native-mlkit-translation) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels.com](https://apilevels.com/)*
