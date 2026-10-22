# Model Delivery Observability — give ML Kit's classic models the download state machine its GenAI APIs already have, under one SLO

**Type:** E (Delivery & lifecycle), with a Type B extension core · **Verdict:** Build · **Opportunity: 7/10 (Strong, org-gated)**
*2026-10-22 · Prepared for Android ML Kit · Evidence current as of 2026-10-22*

> It's a Tuesday and an Android dev at a translation app is staring at a crash report they can't reproduce: `Translation model files not found. Make sure to call downloadModelIfNeeded and if that fails, delete the models and retry`. For a sliver of users the language model never arrives, and the only signal the SDK gives is a binary `isModelDownloaded() → false` and, eventually, a generic exception. They can't tell "still downloading" from "offline" from "corrupted." So they hand-roll a polling-and-retry layer and hope. ML Kit already solved exactly this for Gemini Nano — a `DOWNLOADING` state, byte-level progress, typed failures — and left the models on 99.8% of the fleet with none of it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **7/10 — Strong, org-gated** | composite 4.15 × 2 = 8.3, −1 for durability gate at exactly 3 (Play Services dependency) → 7.3 ≈ 7 |
| Platform privilege (gate) | 5/5 — **pass** | Model delivery is owned by Play Services; a maintainer on [#315](https://github.com/googlesamples/mlkit/issues/315) said they were "waiting for a download infrastructure update from Play Services." No third party can ship the SLO half |
| Feasibility headroom (gate) | 5/5 — **pass** | It's status enums + callbacks, negligible compute/size on any device; the GenAI path already implements the exact surface ([FeatureStatus](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/FeatureStatus)) |
| Durability (gate) | 3/5 — **pass (soft)** | Stable contract, but the SLO leans on Play Services delivery infra ML Kit doesn't fully control, and Google planned this once and dropped it for lack of cycles (#315) |
| Demand evidence (25%) | 4/5 | #315 (Google acknowledged + punted), open GenAI defect [#1062](https://github.com/googlesamples/mlkit/issues/1062), a multi-year litany of silent-download issues, hand-built wrappers |
| Install-weighted reach (15%) | 4/5 | Classic models reach ~99.8% of the fleet (API 21+); ~12–20% install-weighted surface across 3+ categories (my arithmetic, AppBrain TF Lite proxy) |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Developers *cannot* build the delivery/SLO half — they don't own Play Services; the "borrow" path is a bad polling wrapper that only mostly works |
| Integration cost / TTFHW (15%) | 5/5 | The existing GenAI `DownloadCallback` pattern is already a ~15-min hello-world; extending it is one Gradle line, no new permission, negligible size |
| Substitute half-life (15%) | 4/5 | Delivery observability isn't absorbed by a bigger model; the only substitute is the platform shipping it — which is this idea |
| Strategic complement (10%) | 4/5 | Reliable, observable delivery de-risks adoption of *every* ML Kit API and reinforces Play-delivery lock-in; DMA parity may require evidenceable delivery signals |
| **Composite** | **4.15** | Build (≥4.0) |

*Least trustworthy line: install-weighted reach. There is no consolidated Google-published or AppBrain "ML Kit" adoption row; the 12–20% is proxied from TensorFlow Lite's 1.08%-apps / 10.41%-installs figure plus judgment about ML Kit's broader catalog.*

---

## The problem

A large consumer Android app's loop leaks users at exactly the moment a model is missing. The translation app can't translate; the document scanner can't OCR; the social app's face filters don't load. The app team's job-to-be-done is mundane and unglamorous: *know, reliably and in advance, whether the on-device model this feature needs is present, and if not, what state it's in and what to tell the user.* The competing solution is their own code.

What they do instead today, for ML Kit's **classic unbundled models** (translation, segmentation, face/pose detection, entity extraction, smart reply — the models downloaded on demand through Play Services), is poll a binary `RemoteModelManager.isModelDownloaded()` that returns a `Task<Boolean>`, kick off `download()` which returns a bare `Task<Void>` with **no progress listener and no typed failure reason on Android**, and then catch a generic `MlKitException` after an inference fails. There is no `DOWNLOADING` state, no byte progress, no distinction between "offline," "still downloading," "corrupted," and "this device's GMS variant is wrong." I confirmed this against the live [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) on 2026-10-22.

This is structural, not a bug. Model delivery is owned by Play Services, and ML Kit exposes no state machine over it or service-level commitment to the calling app. A 100M+ install app operates under constraints that make this acute: a six-year device fleet where a model present on Android 12/13 silently fails to resolve on Android 14 ([#760](https://github.com/googlesamples/mlkit/issues/760)); more than half of Indian and Indonesian users with no wifi (Google Play's own figure), so the download may never complete; and a brand that can't ship a feature that spins forever. The app team's ML people are server-side; their Android people aren't ML people — so a delivery state machine that requires reasoning about Play Services internals is expensive for them and therefore leverage for a platform.

The sharp, non-obvious part: ML Kit **already built the answer** — for the other half of its catalog. The GenAI/Gemini Nano APIs ship `checkFeatureStatus()` returning `UNAVAILABLE / DOWNLOADABLE / DOWNLOADING / AVAILABLE`, plus a `DownloadCallback` with `onDownloadStarted(bytesToDownload)`, `onDownloadProgress`, `onDownloadFailed(GenAiException)`, and `onDownloadCompleted()`. The opportunity is not to invent a state machine. It is to **harmonize the one they already shipped onto the surface 99.8% of the fleet actually uses, and wrap both under a single observable contract with an SLO.**

---

## Proof & signals

**Developers doing it by hand — the canonical signal.** ML Kit issue [#315, "On-Device Model Download API"](https://github.com/googlesamples/mlkit/issues/315) (opened Jun 2021) asks for exactly this: *"There is still no way to get availability and download status of the unbundled standard ML Kit models (e.g. barcode), right?"* A maintainer replied *"We had it planned but didn't have cycle to get to it,"* and later *"We're waiting for a download infrastructure update from Play Services to provide better support."* It was closed "completed" in Aug 2022 — but only by pointing developers at the generic `GMS ModuleInstallClient` workaround, never a unified availability/download-status API. Google acknowledged the demand and the ownership boundary in its own words. *[Confirmed; GitHub issue.]*

**The GenAI state machine is itself broken in practice.** Open issue [#1062](https://github.com/googlesamples/mlkit/issues/1062) (Jul 2026): *"these APIs throw `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE` … It never reaches the UNAVAILABLE branch on any device where the feature is not provisioned"* — despite the docs instructing you to call `checkFeatureStatus()` before showing any UI. So even the good path needs the reliability hardening this proposal implies. *[Confirmed; open issue.]*

**A multi-year litany of silent, unrecoverable delivery failures:**
- [#740](https://github.com/googlesamples/mlkit/issues/740) (open, 2023): translation `model files not found`; the SDK's own remedy is "delete the models and retry," and 18 months later *"I encountered the same problem, and currently there is no solution."*
- [#760](https://github.com/googlesamples/mlkit/issues/760): face model fails to download only on Android 14; a maintainer confirms failures on first requests are *"WAI [working as intended]."* The app has no signal distinguishing "downloading" from "broken."
- [#308](https://github.com/googlesamples/mlkit/issues/308): "Waiting for the face detection module to be downloaded. Please wait." recurs across library versions over 3+ years.
- [#266](https://github.com/googlesamples/mlkit/issues/266) (interrupted download → unobservable broken state, remedy is blind retry), [#828](https://github.com/googlesamples/mlkit/issues/828) (`isModelDownloaded` itself throws `IllegalArgumentException`), [#796](https://github.com/googlesamples/mlkit/issues/796) (fleet-partial `Hash does not match` corruption the dev can't attribute).

**Apps building the layer themselves.** [capacitor-mlkit](https://github.com/capawesome-team/capacitor-mlkit) (216★) re-exposes `getDownloadedModels / isModelDownloaded / deleteDownloadedModel / downloadModel` as normalized first-class API, and smaller wrappers (e.g. [godsarmy/mlkit-markdown-translator-android](https://github.com/godsarmy/mlkit-markdown-translator-android)) ship a hand-rolled "model download and delete flow" with user-facing error states because the SDK doesn't. On the GenAI side, a [dev.to field guide](https://dev.to/) documents hand-rolling a feature-detection state machine that caches only final states and re-checks `downloadable/downloading` every launch to avoid "an endless spinner." *[Confirmed on GitHub; dev.to item is search-synthesis grade.]*

**Someone charging money for it: structural absence, not negative.** No commercial vendor sells "ML Kit model delivery observability" — because the capability is *platform-locked*. A vendor cannot sell access to Play Services' delivery state. The rubric's usual strongest signal (willingness to pay) is unavailable here by construction, which is itself consistent with a maximal-privilege gate.

**The absence signal.** Stack Overflow, Reddit, and HN were unreachable with the available tools this run, so their volume is **unmeasured, not quiet** — and the official docs instructing every `translate()` call to gate on `isModelDownloaded()` strongly imply a large SO surface. Treat the demand rating as a floor.

---

## Why now

1. **Capability shift (Jul 2026).** ML Kit's GenAI APIs shipped the full download state machine — `FeatureStatus` + `DownloadCallback` with byte progress and typed failures — reaching `genai-prompt 1.0.0-beta4` (updated 2026-07-21). The reference implementation for "how a good ML Kit delivery contract looks" now exists *inside the same SDK*. Harmonizing it onto classic models is a known-good pattern, not a research problem.
2. **Regulatory shift (16 Jul 2026, statutory).** The European Commission's decision in case [DMA.100220](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) under Art. 8(2) specifying Art. 6(7) requires Alphabet to give third parties interoperable access to on-device models (including Gemini Nano) "at guaranteed performance and responsiveness levels," "free of charge," implemented in Android 18 by **1 August 2027** (one carve-out to Android 19 by 2028). It is about *access*, and is silent on availability-signalling or delivery SLOs — so it does not pre-empt this idea; it makes it more urgent, because once many more apps gain a legal right to run on-device models, a predictable, observable delivery contract becomes the obvious complement, and "equally effective, including performance" arguably needs observable delivery signals to even evidence compliance. Google appealed in Sep 2026, but the appeal does not suspend the deadline.
3. **Demand shift.** Firebase AI Logic's hybrid inference (GA-adjacent, explicitly "no SLA") downloads the on-device model in the background and tells developers to "gate features on download completion" using the underlying ML Kit — pushing *more* apps onto exactly the delivery surface that lacks observability.

---

## The capability gap

What exists across the stack, each checked on 2026-10-22 (fetch caveat below):

- **ML Kit GenAI / Gemini Nano** — **ships it.** `FeatureStatus{UNAVAILABLE, DOWNLOADABLE, DOWNLOADING, AVAILABLE}`, `DownloadCallback` with byte-level progress and typed `GenAiException`. [FeatureStatus ref](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/FeatureStatus).
- **ML Kit classic unbundled models** — **does not ship it.** Binary `isModelDownloaded() → Task<Boolean>`, `download() → Task<Void>` with no progress/reason on Android. [RemoteModelManager ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager). Notably, ML Kit's **own iOS** classic path is *richer* — it posts `MLKModelDownloadNotifications` and returns a `Progress` object — so Android is behind its own sibling here.
- **Firebase AI Logic** — partial: `PREFER_ON_DEVICE` silently falls back to cloud; it exposes no distinct delivery-state machine and defers to ML Kit. Experimental, no SLA. [Hybrid docs](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started).
- **Play for On-device AI** — partial: built on Play Asset Delivery, which *does* expose `AssetPackStates` (status, `bytesDownloaded`, `transferProgressPercentage`) — but only for models you package yourself, with generic delivery semantics and no ML-model availability reasons or SLO. [Docs](https://developer.android.com/google/play/on-device-ai).
- **Apple Foundation Models** — `SystemLanguageModel.availability` returns `.available` or `.unavailable(reason)` where reason ∈ `{deviceNotEligible, appleIntelligenceNotEnabled, modelNotReady}`. `modelNotReady` conflates downloading/preparing; **no progress, no bytes, no SLO.** *Coarser than ML Kit's own GenAI API.* [Ref](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel).
- **Qualcomm / Samsung / MediaTek / OSS** — none ship a delivery-observability contract for third-party app developers; apps roll their own over LiteRT-LM / MediaPipe / llama.cpp.

**The boundary, stated exactly:** every vendor either ships generic file-delivery states (Play Asset Delivery), a coarse availability enum (Apple), or nothing — and *no one ships a unified, cross-API model-availability contract with a service-level commitment.* ML Kit is the only player that has already built the rich version and can simply extend it.

**Main competitor:** the developer's own polling-and-retry wrapper around `isModelDownloaded()`, plus a cloud fallback they'd rather not maintain.

---

## Proposed surface

A single `ModelDeliveryClient` contract shared by classic and GenAI models — harmonizing on the GenAI pattern that already ships.

```kotlin
// One surface for any ML Kit model, classic or GenAI.
val status: ModelAvailability = ModelDelivery.checkStatus(TranslateRemoteModel.of("es"))
// ModelAvailability = Unavailable(reason) | Downloadable(sizeBytes) | Downloading(progress) | Available

ModelDelivery.download(model, DownloadConditions.requireWifi()) // existing conditions, new observability
    .addStateListener(object : DeliveryCallback {
        override fun onProgress(bytesDownloaded: Long, totalBytes: Long) { … } // the thing missing today
        override fun onFailed(reason: DeliveryError) { /* OFFLINE, STORAGE_FULL, CORRUPT_RETRYING, GMS_UNSUPPORTED, QUOTA */ }
        override fun onAvailable() { … }
    })
```

- **Does deliberately:** typed failure reasons; byte progress; a real `DOWNLOADING` state; an idempotent, self-healing retry on corruption (fixing #266/#796); an offline-aware `Unavailable(reason=OFFLINE)` instead of a silent hang.
- **Does *not* do:** change the underlying delivery mechanism or the model itself; expose Play Services internals; promise a download will *succeed* offline (it reports the state honestly instead).
- **The SLO layer (the privileged, durability-gated part):** a published contract — e.g. "once `Downloading` begins on a connected device, it completes or reports a terminal typed failure within N minutes; availability state is correct within one `checkStatus()` call" — versioned independently of any model.

**TTFHW target: 15 minutes.** Achievable because the GenAI `DownloadCallback` pattern already hits it; the classic extension is one Gradle line, one callback, no new permission, negligible APK size. If the SLO layer forces a console project or key, that's a finding — so it must not.

---

## Reach & sizing

Inputs (all third-party unless noted; my arithmetic labeled):

| Input | Value | Source |
|---|---|---|
| Device reach, classic models (API 21+) | **~99.8%** | [apilevels.com](https://apilevels.com/), Apr 2026 |
| Device reach, API 26+ | ~96.1% | apilevels.com |
| Gemini Nano fleet share | 140M+ (Google, Jul 2026) ÷ ~3.8B (3rd-party) = **~3.7%** (my arithmetic) | [Android Developers Blog](https://android-developers.googleblog.com/) |
| Install-weighting multiplier (TF Lite proxy) | %installs ÷ %apps = 10.41 ÷ 1.08 = **9.64×** | [AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) |
| Total Play apps | 2.03M | AppBrain, Oct 2026 |
| Consolidated ML Kit adoption row | **not retrievable** (ML Kit ships as many packages) | — |

**My arithmetic.** Serious-app denominator ≈ 10% of 2.03M ≈ ~200K (range 150–250K; the full ≥50K-install category table didn't render). Fraction using a downloadable ML Kit model ≈ 10% (range 5–15%, proxied from TF Lite). → **~20,000 addressable apps (range 7,500–37,500).** Install-weighted, applying the ~9.6× multiplier → **~12–20% of the Android app-install surface** sits in apps carrying a downloadable ML Kit model.

**Two numbers, because they differ ~27×:** the *classic-model* delivery problem is genuinely cross-cutting (~99.8% device reach, ~12–20% install-weighted); the *GenAI* delivery problem is real but narrow today (~3.7% of fleet, hardware-gated well below the 96% API ceiling). Do not blend them.

**Engineering cost avoided:** each adopter today spends roughly 1–3 engineer-weeks building and maintaining a polling/retry/error-state layer and fielding the irreproducible-download bug reports above. At ~20K apps that's a large aggregate, but discount heavily — most teams under-price the maintenance and the borrowed wrapper "mostly works," so *perceived* savings are smaller than real.

**Sensitivity.** Halve both soft assumptions (fraction 10%→5%, denominator 200K→100K): ~5,000 apps, ~6–8% install-weighted. **"Broad platform infrastructure" survives for the classic-model problem** — because the ~9.6× multiplier means ML Kit apps skew large, and device-side the problem touches ~99.8% of the fleet regardless of app count. It does **not** survive for a GenAI-only framing — halving doesn't move the 3.7% hardware gate. So size the pitch as *broad classic-model infra with an emerging GenAI tier.*

---

## Adoption path

1. **The hook (15 min):** a dev debugging a "model won't download" bug drops in `ModelDelivery.checkStatus()` and finally sees `Downloading(progress)` / `Unavailable(OFFLINE)` instead of a binary false. Immediate relief for an existing pain.
2. **First real integration:** they replace their hand-rolled polling/retry/spinner wrapper with the callback and typed errors — shipping a real download UI and an honest offline state. It replaces the capacitor-mlkit-style shim.
3. **The dependency:** once the app's download UX and its availability-gated feature flags are built on the typed states and the SLO, removing it means going back to guessing — a dependency they'd endorse, not resent.

**First adopter:** a translation or document/OCR app (high reliance on on-demand models, existing public pain — #740). Second wave: any Firebase AI Logic hybrid adopter, since Google's own docs push them onto this surface. The reference implementation is the existing GenAI sample, re-pointed at classic models.

---

## Execution plan

- **Developer preview — the state machine (low risk):** extend `RemoteModelManager` with the GenAI-style `checkStatus()` + progress/typed-failure callback for classic models on Android, reaching iOS parity+. Question it answers: does harmonizing the existing surface remove the top delivery bug class? Evidence: close/deflect the #740/#308/#266 issue cluster. This half is a Type B extension and can ship largely within ML Kit.
- **Alpha/Beta — the SLO:** publish the delivery contract and reason-code taxonomy; graduate when the Play Services team commits to the stated completion/terminal-failure guarantee and it holds across a device-matrix test. **This is the gated phase.**
- **GA:** freeze the `ModelAvailability` enum and `DeliveryError` taxonomy, versioned independently of any model, with a multi-year support statement that explicitly spans classic *and* GenAI models.

**Org dependency, stated honestly:** the SLO requires the **Play Services / on-device delivery infra team** to say yes — the exact team #315's maintainer was "waiting for" in 2022. If they don't, the state-machine extension still ships and still delivers most of the value; the SLO is what you lose. That is the real critical path, and pretending otherwise would make this plan a wish.

---

## The case against

The strongest case: **the platform is about to absorb this itself, narrowly, and the SLO never lands.** Google has already shown it will ship the state machine where it has cycles (GenAI) and punt where it depends on Play Services (classic, #315, dropped 2022). The most likely failure isn't a competitor — it's that ML Kit quietly extends `DownloadCallback` to a couple more classic models to close the loudest bugs, declares victory, and the durable, differentiated part — the *unified contract with an SLO* — dies in a prioritization meeting because it's invisible in a demo. That is failure mode #2 (the platform absorbs the problem underneath you) combined with the durability gate: a delivery SLO you break is worse than one you never made, so the team may rationally decline to make it.

The honest mitigation: decouple the two. The state-machine harmonization is low-risk, high-reach, mostly ML-Kit-internal, and worth building on its own merits — treat it as the deliverable. Scope the SLO as a preview that must *earn* the Play Services commitment with the DMA parity clock (Aug 2027) as leverage, and be willing to ship the extension without the SLO rather than block on it.

A weaker counter — "classic models are small, downloads mostly work" — is answered by the multi-year, cross-version issue record: the failures are long-tail, device-specific, and *unobservable*, which is precisely why they're expensive.

---

## Kill criteria

**The single observation that would reverse this:** if ML Kit ships a classic-model `checkStatus()` + progress/typed-failure callback (closing the #740/#308 cluster) within the next two release cycles **and** publishes any availability SLO, the differentiated opportunity is gone — build nothing. Checkable against the [release notes](https://developers.google.com/ml-kit/release-notes).

**Load-bearing assumption:** that the classic-model delivery gap is still real and unshipped (verified 2026-10-22) and that enough serious apps depend on downloadable classic models (the 10% fraction — the softest input).

**Re-check trigger if shelved:** a classic-model download-observability API quietly appearing, or the DMA specification decision finalizing with an availability-signalling obligation attached.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase. ML Kit *owns* the classic-model delivery surface and *already built* the GenAI state machine — this is literally harmonizing one ML Kit surface onto another, with iOS parity already partly in place. MediaPipe/LiteRT are bring-your-own-model and would use Play Asset Delivery's generic states. Firebase AI Logic is the beneficiary, not the owner (it defers to ML Kit). The one honest caveat: the **SLO half** straddles ML Kit and the Play Services delivery team, and that seam is the project's main internal risk — the right owner is ML Kit, but it cannot ship the SLO alone.

---

## Open questions

- **Real ML Kit adoption numbers.** No consolidated Google-published or AppBrain row exists; the 12–20% install-weighted figure rests on a TF Lite proxy. *Settled by:* the Play SDK Index (doesn't render to fetchers) or a direct AppBrain ML Kit slug.
- **SO/Reddit/HN volume.** Unreachable this run, so demand is a floor. *Settled by:* re-running those queries from a surface where the domains are allowed.
- **Does the Play Services team have the cycles now that they lacked in 2022?** The entire SLO phase hinges on this. *Settled by:* an internal conversation, not research.
- **DMA fine print.** The exact 11-feature enumeration and verbatim parity wording came via search synthesis, not a byte-verified fetch of `DMA_100220_2683.pdf`. *Settled by:* reading the primary PDF when fetching works.

---

## Runners-up

- **On-device evaluation & quality harness (Type D).** Apple shipped an Evaluations framework + token accounting; ML Kit prescribes an eval workflow and ships nothing to run it. Strong, but lost on **Platform Privilege** — a third party can build an eval harness; the gap is sharp but less exclusively platform-owned.
- **User-content safety/moderation classifier (Type G).** Strong demand (Bumble open-sourced one; Play makes the dev liable) and a minors-law clock. Lost on **tunability risk** — a one-size classifier dies on contact with a real trust-and-safety team; needs its own report to handle that properly.
- **Sub-8GB GenAI reach tier (Type F).** Converts the 3.7% Nano demo into platform reach. Lost on **Feasibility Headroom** as the binding question — honest quality tiers at low RAM are unproven and need a dedicated feasibility pass.
- **On-device neural TTS (Type A).** Clean whitespace (Picovoice Orca charges; Apple shipped speech gen; Google has nothing). Lost on **Platform Privilege** — OSS TTS models (Piper, Kokoro) mean a three-person team could wrap one.
- **Constrained-decoding / output-stability extension (Type B).** Addresses the 30–50% constraint-violation pain, but Structured Output already shipped Alpha (Jul 2026), so it's a narrower extension than it first looks.
- **Unified hybrid-routing policy engine (Type C).** Firebase AI Logic already ships mode flags, and cross-platform routing weakens the strategic-complement case (it makes cross-platform apps easier).

---

*Fetch caveat for this report: WebFetch could not resolve Google/EU domains through the environment proxy this run; the prior-art, regulatory, and sizing agents verified Google/EU doc content via WebSearch's page-reading summarizer against the exact URLs below, and I independently re-verified the pivotal `FeatureStatus`/`RemoteModelManager` claim via WebSearch on 2026-10-22. Treat exact API signatures as high-confidence-but-not-byte-notarized; the direction of every claim was cross-checked.*

*Sources:*
- [ML Kit #315 — On-Device Model Download API](https://github.com/googlesamples/mlkit/issues/315)
- [ML Kit #1062 — checkFeatureStatus throws 606 instead of UNAVAILABLE](https://github.com/googlesamples/mlkit/issues/1062)
- [ML Kit #740 — Translation model files not found](https://github.com/googlesamples/mlkit/issues/740)
- [ML Kit #760 — Face model fails to download on Android 14](https://github.com/googlesamples/mlkit/issues/760)
- [ML Kit #308 — Waiting for face detection module](https://github.com/googlesamples/mlkit/issues/308)
- [ML Kit #266 — model download Failed](https://github.com/googlesamples/mlkit/issues/266)
- [ML Kit #828 — isModelDownloaded crash](https://github.com/googlesamples/mlkit/issues/828)
- [ML Kit #796 — Firebase Remote Model download issues](https://github.com/googlesamples/mlkit/issues/796)
- [ML Kit FeatureStatus reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/common/FeatureStatus)
- [ML Kit DownloadCallback reference](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)
- [ML Kit RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Firebase AI Logic hybrid inference](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started)
- [Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)
- [capacitor-mlkit](https://github.com/capawesome-team/capacitor-mlkit)
- [godsarmy/mlkit-markdown-translator-android](https://github.com/godsarmy/mlkit-markdown-translator-android)
- [EU DMA — Alphabet AI interoperability (Case DMA.100220)](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [apilevels.com](https://apilevels.com/)
- [AppBrain ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [Android Developers Blog](https://android-developers.googleblog.com/)
