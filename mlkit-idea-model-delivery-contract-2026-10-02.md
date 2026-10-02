# Model Availability & Delivery Contract — make on-device model delivery an observable state machine instead of a silent prayer

**Type:** E (delivery & lifecycle) · **Verdict:** Prototype (developer preview, fold into the DMA compliance track) · **Opportunity: 7/10 (Strong, structural, under-proposed)**
*2026-10-02 · Prepared for Android ML Kit · Evidence current as of 2026-10-02*

> Right now an Android dev shipping ML Kit translation writes `downloadModelIfNeeded()`, gets back a `Task<Void>`, and then — in their own words from the issue tracker — "keep[s] the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope[s] for the Play Services to eventually download the model. But if the user is offline this won't happen at all and we have no indicator about that." There is no progress, no reason code, no offline signal. This idea turns that fire-and-forget call into an observable state machine with a service-level commitment — the same contract Google *already* shipped for Gemini Nano, extended to the classic models that reach ~27× more devices.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **7/10 — Strong, structural** | composite 3.5 × 2 = 7.0; no gate at exactly 3; S1 not a 5. Derived, not assigned. |
| Platform privilege (gate) | 5/5 — **pass** | Delivery is owned by Play Services / AICore; the DMA decision *mandates* the platform expose it ([EC DMA.100220](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). Nobody else can offer a delivery contract. |
| Feasibility headroom (gate) | 5/5 — **pass** | The state-machine analogue already ships ([`SplitInstallSessionStatus`](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)); GenAI already has [`DownloadStatus`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadStatus). No model to train, no device gate. |
| Durability (gate) | 4/5 — **pass** | DMA anchors the EU surface statutorily; but a delivery SLO must hold for years and Firebase ML's 15 Jun 2027 shutdown is the cautionary precedent ([migration page](https://developers.google.com/ml-kit/migration)). |
| Demand evidence (25%) | 3/5 | [mlkit#315](https://github.com/googlesamples/mlkit/issues/315) states the pain near-verbatim; [firebase#1656](https://github.com/firebase/firebase-android-sdk/issues/1656) open since Jun 2020; a ~15-issue cluster; Google's own GenAI contract is internal acknowledgment. But modest per-issue engagement, no viral thread, no OSS library. |
| Install-weighted reach (15%) | 4/5 | Classic unbundled models reach ~99.8% of the GMS base at minSdk 21 ([apilevels](https://apilevels.com/)); ~10–25% of installs already ship an ML Kit model (my estimate, anchored on TFLite's 10.41% install share). |
| Build-vs-buy-vs-borrow (20%) | 2.5/5 | The weakest dimension. The DIY path is polling/retry boilerplate, not ML expertise — a few engineer-days to hand-roll badly. The value is *reliability*, not engineer-weeks saved. |
| Integration cost / TTFHW (15%) | 5/5 | One observer on an SDK you already depend on. No new permission, no APK size, no key. Hello-world in minutes. |
| Substitute half-life (15%) | 4/5 | Delivery is structurally platform-owned; no OSS or general model can substitute. The only real "substitute" is Google building exactly this. DMA entrenches it beyond ~2027. |
| Strategic complement (10%) | 3/5 | De-risks on-device adoption across the whole ML Kit portfolio and is a clean DMA compliance surface — but by design it also smooths delivery of *third-party* models, so it partly commoditizes Google's own delivery edge. |
| **Composite** | **3.5** | Prototype band (3.0–3.9). |

Least trustworthy row: **install-weighted reach (S2)**. AppBrain's ML-Kit-specific row was egress-blocked this run, so the 10–25% figure is my arithmetic off TensorFlow Lite's confirmed 1.08%-apps / 10.41%-installs row, not an ML Kit measurement. The *direction* (classic ≫ GenAI reach) is robust; the magnitude is an estimate.

---

## The problem

A developer integrating any *unbundled* ML Kit model — translation (~30 MB per language pair), face detection, segmentation, entity extraction — faces a delivery surface that is, on Android, two methods wide: [`RemoteModelManager.download()`](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) returns a `Task<Void>` that resolves only on terminal success or a generic failure, and `isModelDownloaded()` returns a boolean. There is no download progress, no typed reason for failure, no signal that the device is offline and the download will therefore never complete, and no retry contract. The model is delivered by Play Services on a schedule the app cannot see and cannot influence beyond `DownloadConditions`.

The job to be done is mundane and universal: *"before I show this feature in my UI, tell me whether it will work, and if it's not ready, tell me why and when."* An app with 100M+ installs cannot put a feature in front of users that silently no-ops for the subset who are offline, on a flaky network, or on a device where the model download stalled. So today they do one of three things — all bad. They gate the feature behind a spinner that may never resolve ("Waiting for the face detection module to be downloaded. Please wait." — [mlkit#308](https://github.com/googlesamples/mlkit/issues/308), 11 comments). They hand-roll a delete-and-retry loop ([mlkit#740](https://github.com/googlesamples/mlkit/issues/740): "if that fails, delete the models and retry"). Or they keep the analyzer alive and hope.

This is structurally produced, not an accident of tooling. Delivery is owned by Play Services precisely because centralized, deduplicated, OS-scheduled model distribution is the thing a platform *should* own — no app wants to ship and version a 30 MB model itself (every 6 MB of APK costs ~1% of install conversion, [Google's own figure](https://developers.google.com/ml-kit/tips/reduce-app-size)). But the platform took the delivery responsibility without exposing the delivery *state*. The app is accountable to its users for a process it cannot observe. That gap is the product.

The tell that this is real and already understood internally: **Google built exactly this contract for Gemini Nano and only for Nano.** The GenAI path has [`FeatureStatus`](https://developers.google.com/ml-kit/genai/prompt/android/get-started) {AVAILABLE, DOWNLOADABLE, DOWNLOADING, UNAVAILABLE}, a [`DownloadCallback`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) with `onDownloadStarted(totalBytes)` / `onDownloadProgress(bytesDownloaded)` / `onDownloadCompleted` / `onDownloadFailed`, and a sealed [`DownloadStatus`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadStatus). Classic ML Kit — which reaches the entire Play-services base rather than the ~3.7% of devices that run Nano — still has `isModelDownloaded()` and a prayer.

---

## Proof & signals

- **Developers doing it by hand, in the SDK's own tracker:** [mlkit#315](https://github.com/googlesamples/mlkit/issues/315) (opened 2021-06-21): "There is still no way to get availability and download status of the unbundled standard ML Kit models." The verbatim workaround — "keep the analyzer alive… and hope" — is the exact pain this idea removes. Engagement is modest (5 comments, 3 👍), which I weight honestly below.
- **The structural ask, open for five years:** [firebase-android-sdk#1656](https://github.com/firebase/firebase-android-sdk/issues/1656) (2020-06-12): "Add updates to download progress. Right now, it only provides updates at 0.0 (started) and 1.0 (completed)." Still open in 2026. A feature request that survives five years is either dead or load-bearing; the recurring duplicates say load-bearing.
- **The cluster, 2020→2024:** a scoped search of `googlesamples/mlkit` returns ~15 issues on download status / availability / offline / `UNAVAILABLE` — e.g. [#308](https://github.com/googlesamples/mlkit/issues/308) (model download never resolves, 11 comments), [#740](https://github.com/googlesamples/mlkit/issues/740) (delete-and-retry workaround), [#851](https://github.com/googlesamples/mlkit/issues/851) (iOS `NSProgress` only fires at 1.0), [#698](https://github.com/googlesamples/mlkit/issues/698) (SSL error mid-download, no recovery path). Recurring theme, not a one-off.
- **Someone charging money for it:** *nobody* — and here the usual "a vendor sells this" signal is **structurally unavailable**, because delivery of an OS-managed model is not a thing a third party *can* sell. That absence is not evidence against demand; it's evidence this is a platform-only capability (which is the G1 gate passing, not failing). The nearest market substitute is Play Feature/Asset Delivery, which developers already bend to this purpose for custom models.
- **Apps that shipped it themselves:** no popular "ML Kit download manager" OSS library exists — GitHub search for Kotlin wrappers (stars>15, pushed>2025) returned zero dedicated projects. Developers hand-roll the retry inline rather than sharing a reusable layer, which is consistent with a per-app annoyance rather than a community-galvanizing one.
- **The absence signal:** no viral HN/Reddit thread; SO/Reddit corroboration was blocked this run and is **[unverified]**. Read honestly, this is a *persistent, well-identified contract gap that Google itself has already solved on the adjacent surface* — not a mass outcry. That is a weaker demand picture than a loud one, and the score reflects it.

---

## Why now

1. **Capability shift (Jul 2026).** ML Kit GenAI shipped the full observable download contract (`DownloadStatus`, `DownloadCallback`, `FeatureStatus`). The hard design work — what the states are, how progress is reported — is *done and in production*. Extending it to classic models is a port, not an invention.
2. **Regulatory shift, with a statutory date (16 Jul 2026 → 1 Aug 2027).** The European Commission's [DMA.100220 specification decision](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) under Art. 6(7) requires Alphabet to let third parties "install, run and use on-device models… under the same hardware-resource and background-execution conditions that Google's own models enjoy," and to call Google's own on-device models including Gemini Nano — "free of charge" and "equally effective," implemented in **Android 18 by 1 August 2027** ([case summary](https://digital-markets-act.ec.europa.eu/document/download/526ffc7a-1eb8-4ca7-81c3-fa074f44518c_en); [Wolters Kluwer analysis](https://legalblogs.wolterskluwer.com/competition-blog/keeping-the-gate-the-european-commission-issues-its-specification-decision-on-alphabets-operating-system-interoperability-with-ai-assistants/)). The decision grants the *access right* but not the *operational contract*: there is no specified way to observe availability/download state or to prove "equally effective." A delivery/availability contract is the natural compliance and audit surface for that mandate.
3. **Demand shift.** On-device model use is broadening (translation, doc scanning, on-device GenAI), so the number of apps gating UI on a model download is rising — and each new adopter rediscovers the same silent-failure wall.

Three datable shifts, all pointing the same way. This is an unusually strong why-now for a Type E idea, which normally has none.

---

## The capability gap

| Surface | Availability signal | Progress % | Typed failure reasons | SLO/contract | Source |
|---|---|---|---|---|---|
| **ML Kit classic unbundled** | `isModelDownloaded()` boolean | **No** | **No** (generic `Task` failure) | No | [RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) |
| ML Kit GenAI / Nano | `FeatureStatus` (4 states) | Yes (bytes) | Partial (one flat `UNAVAILABLE`; no quota/offline/retry-after) | No | [get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started), [DownloadStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadStatus) |
| Play Feature Delivery | Full state machine | Yes | `SplitInstallErrorCode` | No | [SplitInstallSessionStatus](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus) |
| Play Asset Delivery | Full state machine (+`WAITING_FOR_WIFI`) | Yes (`transferProgressPercentage`) | `AssetPackErrorCode` | No | [AssetPackStatus](https://developer.android.com/reference/com/google/android/play/core/assetpacks/model/AssetPackStatus) |
| Apple Foundation Models | `availability` enum: `.available` / `.unavailable(deviceNotEligible / appleIntelligenceNotEnabled / modelNotReady)` | **No** | Yes | No | [Apple docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum) |

The exact boundary: **no vendor ships a single observable, SLO-backed delivery contract that unifies classic and GenAI models with progress, typed reasons (device-eligible / quota / offline / retry-after), and a service-level commitment.** Apple has typed reasons but zero progress. Play Feature/Asset Delivery has the state machine but is asset-generic, not model-aware. GenAI has progress but only for Nano and with a flat failure reason. Classic ML Kit — the highest-reach surface — has essentially nothing. The pieces exist across four products; the contract exists nowhere.

**Main competitor:** what a developer uses *instead* today is Play Feature/Asset Delivery — they package the model as an asset pack and inherit its state machine. That works, but it defeats the point of unbundled models (Play Services already dedupes and delivers them centrally) and forces the app to own model versioning.

---

## Proposed surface

A model-aware extension of the existing delivery state machine, available on the SDK the developer already uses. The persuasive artifact is the before/after:

```kotlin
// BEFORE — fire and forget
modelManager.download(model, conditions)
  .addOnSuccessListener { /* ready… eventually… maybe */ }
  .addOnFailureListener { /* why? offline? quota? no idea */ }

// AFTER — observable contract
modelManager.availability(model).collect { state ->
  when (state) {
    is NotDownloaded      -> showEnableCta()
    is Downloading        -> showProgress(state.bytesDownloaded, state.totalBytes)
    is WaitingForNetwork  -> showOfflineHint()          // the signal #315 asked for
    is Available          -> enableFeature()
    is Unavailable        -> when (state.reason) {       // typed, branchable
        DEVICE_INELIGIBLE -> hideFeature()
        QUOTA_EXCEEDED    -> scheduleRetry(state.retryAfter)
        DELIVERY_FAILED   -> offerRetry()
    }
  }
}
```

The states are ported directly from `AssetPackStatus` (`PENDING`, `DOWNLOADING`, `WAITING_FOR_WIFI`, `TRANSFERRING`, `COMPLETED`, `FAILED`) and the GenAI `DownloadStatus`, unified under one `ModelAvailability` type that works for *both* classic unbundled models and GenAI features. What it deliberately does **not** do: it does not let the app force a download against platform policy, override quotas, or guarantee a model exists for an ineligible device — it makes the existing reality *observable*, not negotiable.

The platform half is the contract: a published, versioned state semantics (what each state means and its legal transitions) plus a best-effort delivery SLO — e.g. "once requested on a metered-network-eligible device, a model of size ≤ N reaches `Available` within T, or surfaces a typed terminal reason." TTFHW target: **under 15 minutes**, achievable because it's one observer on an existing dependency with no new permission, key, or binary cost.

---

## Reach & sizing

Inputs (all third-party unless noted; AppBrain's ML Kit row was not retrievable this run — see caveat):

- Device eligibility: `RemoteModelManager` delivery rides Play Services; minSdk 21 reaches **99.8%** of the GMS base ([apilevels](https://apilevels.com/), StatCounter-derived, Apr 2026). No hardware gate.
- Install-weighting multiplier for ML SDKs: TensorFlow Lite = 10.41% installs ÷ 1.08% apps ≈ **9.6×** ([AppBrain ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)). ML Kit, being higher-level and easier to adopt, likely sits at **~5–9×** (my estimate).
- Current ML Kit app share: ~1.1–3% of apps (my estimate, anchored on TFLite's 1.08%).

My arithmetic: current install-weighted footprint ≈ app share (1.1–3%) × multiplier (5–9×), floored at TFLite's observed 10.41% install share → **~10–25% of all Android installs already sit in apps shipping an ML Kit unbundled model.** The *addressable ceiling* as adoption grows is the whole GMS base (~99.8% at minSdk 21), because the contract has no device gate.

Contrast that sharpens the pick: a delivery contract scoped to **GenAI/Nano only** is capped at the ~3.7% Nano device footprint. The **classic** framing reaches ~27× more devices (99.8 ÷ 3.7) and ~3–7× more installs today. *This is the single most important number in the report* — it's why the idea is "extend the GenAI contract to classic models," not "polish the GenAI contract."

Engineering cost avoided is the weak part of the platform test. Per-app DIY is a few engineer-days of polling/retry glue, not ML engineer-months, so the numerator is reliability-and-trust, not labor. Sensitivity: halve both my app-share and multiplier estimates and install-weighted footprint drops to ~3–6% — still above the GenAI-only ceiling, so the *comparative* verdict (classic ≫ GenAI) survives; the *absolute* "is this worth a platform commitment" verdict leans on reliability and the DMA mandate, not on the sizing alone.

---

## Adoption path

1. **The hook:** a dev already fighting a translation/segmentation download spinner replaces their hand-rolled retry with one `availability()` observer and immediately gets progress + an offline reason. Fifteen-minute win on code they already have.
2. **First real integration:** they gate a production feature's UI on the typed state, killing the "spinner that never resolves" class of support tickets. It replaces the delete-and-retry loop.
3. **The dependency:** once release-gating and UX fallback are wired to the state machine, removing it means going back to guessing — a dependency they'd endorse, not resent.

First adopters: the apps already in the issue tracker (doc scanners, translation-heavy apps, camera apps using face/segmentation). Second wave: anyone building a DMA-compliant third-party-model experience in the EU, for whom the observable contract is the compliance evidence surface. The funnel starts because the first rung is "improve code you already wrote."

---

## Execution plan

- **Developer preview:** port the GenAI `DownloadStatus`/`FeatureStatus` model to `RemoteModelManager` for 2–3 classic APIs (translation first — most download complaints). Question it answers: do the GenAI state semantics map cleanly onto Play-Services delivery? Partners: the apps on #315/#308/#740.
- **Alpha/Beta:** graduate when the unified `ModelAvailability` type covers all unbundled classic models *and* GenAI features behind one API, with offline and retry-after reasons proven on real flaky-network devices. Checkable condition: zero "download never resolves" repro on the partner matrix.
- **GA:** commit the state-transition contract and the versioning policy. The SLO ships as a *separate, independently versioned* artifact (see durability).

Org dependency, named honestly: this requires the **Play Services delivery team** to expose state it currently keeps internal, and alignment with whoever owns the **DMA Art. 6(7) compliance** workstream. If Play Services won't surface delivery state, the idea cannot be built — that's the one external yes it needs. The upside is the DMA deadline gives you leverage to get it.

---

## The case against

The strongest case against, argued fairly: **this is plumbing with a low borrow-cost (adoption failure mode #7, "undifferentiated against a cheap substitute"), and the loudest version of the demand is a handful of single-digit-👍 issues.** A competent team *can* hand-roll a poll-and-retry wrapper in a few days; the DIY path isn't ML expertise, it's boilerplate, so the build-vs-buy delta (S3 = 2.5) is genuinely thin. If you scored this purely on labor-saved and issue-tracker volume, it's a feature, not a platform API, and you'd shelve it.

What rescues it is not the labor math — it's two things the labor math misses. First, the capability is *structurally* platform-only: the app cannot observe Play-Services delivery state no matter how much boilerplate it writes, so the "borrow" path doesn't actually reach the thing (the hand-rolled version is still blind to offline/quota/progress — it just retries in the dark). Second, the DMA decision converts this from optional convenience into compliance infrastructure Google must build *something* like by Aug 2027 regardless. The honest framing is therefore not "should we build a new API" but "the delivery contract is getting built for the EU mandate anyway; ship it as a first-class observable contract across all models, or ship a minimal compliance shim and leave the 10–25%-of-installs reliability problem unsolved." The live risk is **#2, the platform absorbing it underneath** — Google quietly extending GenAI's `DownloadStatus` to classic models as an unannounced SDK update, capturing the value without the contract/SLO that makes it trustworthy. That's a reason to ship it *as a named contract*, not a reason not to.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if the ML Kit release notes ship a `DownloadStatus`/`FeatureStatus` equivalent for classic unbundled `RemoteModelManager` before this reaches preview, the capability gap closes and this becomes a docs/SLO footnote rather than a build. (Checkable against [release notes](https://developers.google.com/ml-kit/release-notes) each run.)

**Load-bearing assumption:** that the Play Services delivery team can and will expose per-model delivery state to the calling app. If delivery state is genuinely unavailable at that layer, the whole idea is blocked.

**Re-check trigger if shelved:** any movement on the DMA Art. 6(7) implementation (draft measures, a compliance deadline slip), or a spike in download-availability issues after a new high-reach classic API ships.

---

## Fit for this team

ML Kit specifically, because ML Kit owns the `RemoteModelManager` surface developers already depend on and already shipped the GenAI half of this contract — extending it keeps one delivery story instead of fragmenting it further. The risk this space always carries is a capability landing in the wrong part of Google's stack: if the unified contract is better owned by the **Play delivery** layer (since it, not ML Kit, actually controls distribution), that's a legitimate conclusion — ML Kit would then own the *model-semantic* surface (`ModelAvailability`) and Play owns the *transport* SLO beneath it. Either way it should not land in MediaPipe or Firebase AI Logic, which would split the delivery story a third way.

---

## Open questions

- **ML Kit's actual AppBrain adoption row** (%apps / %installs) — blocked this run; needed to replace my TFLite-anchored estimate. A browser read of the [ML SDK tag page](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) would settle S2.
- **Does Play Services expose per-model delivery state internally** at a granularity that can be surfaced? This is the load-bearing feasibility question and I could not verify it from public docs.
- **SO/Reddit demand volume** — blocked this run; would move S1 up or down. Settle with authenticated Stack Exchange API access.
- **Exact DMA operative wording** on whether an *observable contract* (vs. mere access) is required — the numbered decision PDF was not directly fetchable; quotes above are the EC's own portal/case-summary layer.

---

## Runners-up

- **On-device safety/moderation classifier for user content (Type G)** — strong regulatory clock (minors laws Jan 2026, DMA) and Bumble open-sourced one, but risks dying on contact with each app's proprietary T&S policy (tunability). The nearest second place.
- **On-device neural TTS developer API (Type A)** — clean whitespace (Apple shipped speech-gen, Picovoice sells Orca), but the Platform Privilege gate is the question: capable OSS TTS models exist, so a 3-person team could ship a Gradle dep.
- **On-device eval/quality harness (Type D)** — Apple shipped an Evaluations framework and ML Kit prescribes a workflow with no tooling; lost on Platform Privilege (a third party could build the harness).
- **Deferred/opportunistic inference scheduling (Type E)** — real thermal/quota pain (P5/P15) and no primitive anywhere, but feasibility and the "run when charging/idle under a shared system model" contract are less mature than delivery observability.

---

*Sources:*
- [ML Kit RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [ML Kit GenAI Prompt get-started (FeatureStatus)](https://developers.google.com/ml-kit/genai/prompt/android/get-started)
- [ML Kit GenAI DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)
- [ML Kit GenAI DownloadStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadStatus)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [ML Kit reduce-app-size guide](https://developers.google.com/ml-kit/tips/reduce-app-size)
- [ML Kit / Firebase ML migration](https://developers.google.com/ml-kit/migration)
- [Play SplitInstallSessionStatus](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)
- [Play AssetPackStatus](https://developer.android.com/reference/com/google/android/play/core/assetpacks/model/AssetPackStatus)
- [Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- [Apple Foundation Models availability enum](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum)
- [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315)
- [firebase-android-sdk #1656](https://github.com/firebase/firebase-android-sdk/issues/1656)
- [googlesamples/mlkit #308](https://github.com/googlesamples/mlkit/issues/308)
- [googlesamples/mlkit #740](https://github.com/googlesamples/mlkit/issues/740)
- [googlesamples/mlkit #851](https://github.com/googlesamples/mlkit/issues/851)
- [googlesamples/mlkit #698](https://github.com/googlesamples/mlkit/issues/698)
- [EC DMA.100220 interoperability portal](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [EC DMA.100220 case summary PDF](https://digital-markets-act.ec.europa.eu/document/download/526ffc7a-1eb8-4ca7-81c3-fa074f44518c_en)
- [Wolters Kluwer DMA analysis](https://legalblogs.wolterskluwer.com/competition-blog/keeping-the-gate-the-european-commission-issues-its-specification-decision-on-alphabets-operating-system-interoperability-with-ai-assistants/)
- [apilevels.com](https://apilevels.com/)
- [AppBrain machine-learning SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
