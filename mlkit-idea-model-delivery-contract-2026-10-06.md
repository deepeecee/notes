# ML Kit Model Delivery Contract — one availability state machine for every on-device model, with progress, an offline signal, and an SLO

**Type:** E (Delivery & lifecycle), with a B (extension) core · **Verdict:** Build · **Opportunity: 8/10 (Strong — but adoption-capped)**
*2026-10-06 · Prepared for Android ML Kit · Evidence current as of 2026-10-06*

> On a Tuesday, an Android engineer ships a translation feature with ML Kit. It works on their desk. In production, a user in Jakarta on no wifi taps Translate and nothing happens — the model never downloaded, `RemoteModelManager` only threw `UNAVAILABLE`, and the app has no way to tell "downloading," "offline, will never arrive," and "this device is blocked" apart. The developer's workaround, in their own words, is to "keep the analyzer alive… and hope." The fix is a single availability state machine across *every* ML Kit model — the same one the GenAI APIs already got, extended to the other 95% of ML Kit and backed by a delivery contract. On-device ML already rides in apps carrying ~10% of all Play installs.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 8/10 — Strong, adoption-capped | composite 4.05 × 2 = 8.1; no gate at exactly 3; S1 not a 5 → 8. The borrow path (S3=3) is the honest drag; a skeptic could argue 7 |
| Platform privilege (gate) | 5/5 — pass | only the owner of Play Services model delivery + AICore can offer a cross-family delivery/SLO contract ([Play for On-device AI](https://developer.android.com/google/play/on-device-ai)) |
| Feasibility headroom (gate) | 5/5 — pass | no model to train; it's an API over existing delivery machinery. GenAI already ships the pattern ([DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)) |
| Durability (gate) | 4/5 — pass | ML Kit owns the surface; the live risk is that an SLO you break is worse than none |
| Demand evidence (25%) | 4/5 | convergent, dated, cross-API, 2019→2026: [#315](https://github.com/googlesamples/mlkit/issues/315), [#1656](https://github.com/firebase/firebase-android-sdk/issues/1656) (open 6yr), [#740](https://github.com/googlesamples/mlkit/issues/740), [#1063](https://github.com/googlesamples/mlkit/issues/1063); third-party wrappers exist |
| Install-weighted reach (15%) | 4/5 | classic ML Kit runs on 96–99.8% of the fleet ([apilevels](https://apilevels.com/)); on-device ML carries ~9.6× install skew (~10% of installs, [AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)). Adoption ceiling tempers it |
| Build-vs-buy-vs-borrow (20%) | 3/5 | the borrow path partly works: teams hand-roll `isModelDownloaded` polling; Flutter/RN wrappers already paper over it |
| Integration cost / TTFHW (15%) | 5/5 | one Gradle line, no key, no new permission, a state enum + progress callback; a <15-min hello-world is reachable |
| Substitute half-life (15%) | 4/5 | a general model can't make a delivery contract redundant; only the platform can — by shipping this |
| Strategic complement (10%) | 5/5 | de-risks adoption of *every* ML Kit API; serves the DMA "equal access incl. performance" posture |
| **Composite** | **4.05** | Build (≥4.0) |

*Least trustworthy row:* install-weighted reach. I could not get an ML-Kit-specific %apps/%installs line from AppBrain (its detail pages are JS-rendered and were egress-blocked), so the 9.6× multiplier is a TensorFlow Lite proxy, not ML Kit's own number.

---

## The problem

The job to be done, stated as a developer's: *"Before I show my AI feature's button, tell me truthfully whether it will work for this user right now — and if a model is downloading, show a progress bar; if it's never coming, fall back."* The customer is an Android engineer, not an ML engineer; the competing solution is their own polling loop.

ML Kit's on-demand models (translation, entity extraction, segmentation, custom models, barcode UI, and the GenAI feature models) download at runtime through Play Services or AICore. That is the right design for APK size — Google's own published figure is ~1% of install conversion lost per 6 MB, worse in growth markets. But it moves a hard problem into the app: *reasoning about a model that may or may not be there.* For the **traditional family**, the only tools are [`RemoteModelManager.isModelDownloaded()`](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) plus success/failure listeners on `download()`. There is no progress signal (download jumps from 0.0 to 1.0), and — the sharp part — **no way to distinguish "downloading" from "offline and never arriving" from "device blocked."** All three collapse into one `UNAVAILABLE`/`NOT_FOUND` exception.

This is structurally produced, not a bug. A 100M+ install app spans a 6-year-old device fleet, and more than half of Indian and Indonesian Android users have no wifi (Google Play's own figure). The offline-on-low-end user is exactly the one the on-demand design serves worst, and exactly the one the app can't currently detect. The app team is server-side by background; a person fluent in both Android runtime behavior and model delivery is the expensive hire a platform should make unnecessary. What they do instead today is poll `isModelDownloaded` on a timer, catch exceptions, show an indeterminate spinner, and — per the headline issue — "hope for Play Services to eventually download the model."

---

## Proof & signals

The demand is real, dated, independent, and spans APIs — the strongest form of this evidence.

- **The headline artifact,** googlesamples/mlkit [#315](https://github.com/googlesamples/mlkit/issues/315) (verbatim): *"There is still no way to get availability and download status of the unbundled standard ML Kit models… we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* This states the exact three gaps — no availability, no progress, no offline signal. **Caveat, carried honestly: #315 is *closed*.** The live, still-**open** counterpart is firebase-android-sdk [#1656](https://github.com/firebase/firebase-android-sdk/issues/1656) (verbatim): *"Add updates to download progress. Right now, it only provides updates at 0.0 (started) and 1.0 (completed)."* — open since June 2020.
- **Cross-API recurrence, 2019→2026:** translation [#405](https://github.com/googlesamples/mlkit/issues/405), translation [#740](https://github.com/googlesamples/mlkit/issues/740) (open), text recognition [quickstart #784](https://github.com/firebase/quickstart-android/issues/784), pre-download [codelab #24](https://github.com/googlecodelabs/mlkit-android/issues/24), and — critically — the same opacity has reached the new GenAI surface: [#1063](https://github.com/googlesamples/mlkit/issues/1063) (open, July 2026): *"Failed to download model: …AICore failed with error type 1-DOWNLOAD_ERROR."* The pain is not one feature; it's the delivery layer.
- **Someone built the missing layer:** third parties ship wrappers specifically to paper over this. Flutter's [`flutter_translate_kit`](https://pub.dev/packages/flutter_translate_kit) advertises that it "abstracts model management… display download progress and verify model readiness without manual implementation" and ships a `KitModelDownloadButton`. React Native's [`react-native-mlkit-translate-text`](https://github.com/yaaliuzhipeng/react-native-mlkit-translate-text) README warns: *"Always check model firstly; Do not translate text if the model is not downloaded."* Willingness to build (and maintain) the UX layer the platform omitted is the demand signal.
- **The absence signal:** I could not retrieve Stack Overflow or Reddit directly (both egress-blocked), and GitHub reaction counts didn't extract, so I have *breadth and recurrence* but not *volume*. That's a real limit on the demand grade — it's a 4, not a 5, for lack of a traction number.

---

## Why now

Three parts, honestly weighted — one is strong, one is medium, one is weak.

1. **Capability shift (strong, dated):** ML Kit's GenAI family *already proved the pattern* the rest of ML Kit lacks. `checkFeatureStatus()` returns a four-state enum and `downloadFeature()` reports progress ([image-description guide](https://developers.google.com/ml-kit/genai/image-description/android)). As of the [release notes](https://developers.google.com/ml-kit/release-notes), the Prompt API reached **Beta (1.0.0-beta4, July 2026)**. The design exists, is shipping, and is simply not generalized to the traditional family — so this is a unify-what-you-built move, not an invention.
2. **Competitive shift (medium, dated):** Apple's Foundation Models exposes [`SystemLanguageModel.availability`](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) with *typed reasons* — `deviceNotEligible`, `appleIntelligenceNotEnabled`, `modelNotReady` — reconfirmed present in iOS 26/27. Apple answers "why can't I use it?" with a reason code; ML Kit's traditional family answers with one exception. That is a legible, checkable gap against the competitor.
3. **Regulatory shift (weak — stated plainly):** the EU DMA Art. 6(7) proceeding against Alphabet ([case page](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)) opened 27 Jan 2026, decision due by 27 Jul 2026, implementation in Android 18 by **1 Aug 2027**, requiring free, equal-**performance** third-party access to on-device models including Gemini Nano. **But the DMA does not name delivery or availability signalling.** The connection is an inference — equal-performance 3P access implicitly needs an availability/delivery contract — not a mandate. I flag this rather than dress it up: the why-now is "the pattern is proven and the competitor is ahead," not "a statute forces it."

---

## The capability gap

Be exact about the boundary, because this is where the report would get embarrassed — and where a snapshot claim turned out stale.

- **ML Kit GenAI family — HAS it.** `checkFeatureStatus()` → {UNAVAILABLE, DOWNLOADABLE, DOWNLOADING, AVAILABLE}; `downloadFeature(DownloadCallback)` with `onDownloadStarted/Progress/Completed/Failed` ([DownloadCallback ref](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)). **A snapshot premise that "ML Kit has no availability signal" is stale/false** — it exists here.
- **ML Kit traditional family — DOES NOT.** `RemoteModelManager`: `isModelDownloaded()`, `getDownloadedModels()`, `download(model, DownloadConditions)` with only success/fail. No progress, no offline-vs-blocked distinction, no state enum. The two families share no vocabulary.
- **Play for On-device AI / `SplitInstallManager`** — rich byte-level progress (`transferProgressPercentage()`, a 10-state status enum, [`SplitInstallSessionState`](https://developer.android.com/reference/com/google/android/play/core/splitinstall/SplitInstallSessionState.html)) — but only for *developer-supplied* packs, with no ML-Kit model semantics and no SLO. This is the **borrow** path.
- **Firebase AI Logic** — [hybrid inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference) hides state behind an availability boolean plus silent cloud fallback; no app-facing progress.
- **Apple** — availability enum with typed reasons, but *no download progress* (downloading is the opaque `modelNotReady`). Closest competitor on observability; still not a delivery state machine.

**The main competitor a developer uses today** is their own `isModelDownloaded` polling loop, or a community wrapper. No vendor ships one unified, offline-aware, SLO-bearing availability API across *all* its on-device models.

*Evidence caveat:* `developers.google.com` was egress-blocked to the research fetchers, so the ML Kit doc specifics above rest on search-surfaced snippets of those exact pages plus corroborating GitHub issues, not rendered pages. The boundary claim is corroborated by the firebase-android-sdk #1656 feature request.

---

## Proposed surface

A single availability contract, `ModelDeliveryManager`, that every ML Kit API (traditional and GenAI) resolves to. The persuasive artifact is the before/after.

**Before (traditional family today):**
```kotlin
// Poll + hope + guess. No progress, no offline signal.
if (!remoteModelManager.isModelDownloaded(model).await()) {
    remoteModelManager.download(model, conditions)
        .addOnSuccessListener { /* ready, eventually */ }
        .addOnFailureListener { /* why? offline? blocked? unknown */ }
    // meanwhile: show an indeterminate spinner and retry on a timer
}
```

**After:**
```kotlin
ModelDelivery.status(model).collect { s ->  // Flow<ModelStatus>
    when (s) {
        is Available        -> enableFeature()
        is Downloading      -> showProgress(s.fraction)        // 0.0..1.0, real
        is Downloadable     -> showDownloadButton(s.estimatedBytes)
        is Unavailable      -> when (s.reason) {               // typed, like Apple
            OFFLINE          -> showOfflineHint()               // the missing signal
            DEVICE_NOT_ELIGIBLE -> hidePermanently()
            QUOTA_EXCEEDED   -> deferUntilCharging()
        }
    }
}
```

Device requirements: the status/progress surface works wherever the model works — i.e. the **whole classic fleet**, not a Nano-gated subset. What it deliberately does **not** do: it does not change *which* models exist, train anything, or promise a download time it can't meet. The **SLO is a floor, not a wall** — "best-effort within conditions, with a terminal `Unavailable(OFFLINE)` within N seconds instead of an indefinite hang," which is exactly the determinism the headline issue asked for.

**Time-to-first-hello-world target: 15 minutes.** Reachable because it reuses the GenAI `DownloadCallback` shape developers may already know, adds one Gradle line, needs no key and no new permission. If it can't hit 15 minutes, the cause would be surfacing offline detection without a network permission — solvable via Play Services connectivity signals, and a design constraint to hold.

---

## Reach & sizing

Showing the arithmetic, with a range.

- **Device reach:** classic/on-demand ML Kit models are available on **96.1% (API 26) to 99.8% (API 21)** of active Android ([apilevels.com](https://apilevels.com/), third-party, Statcounter-derived). This is the headline contrast with any Nano-gated GenAI idea, which sits behind API 26/31 (78.8% at API 31) *and* the ~3.7% Nano device gate (140M+ devices, Google Apr 2026, over a ~3.8B third-party base — my arithmetic).
- **Install weighting:** on-device ML is install-skewed. TensorFlow Lite (the closest fetchable proxy) shows **~1.08% of apps but ~10.41% of installs** → a **~9.6× multiplier** ([AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks), third-party crawl). Universal infra (AndroidX) sits at ~1×. So even a low app-count converts to a large install footprint.
- **Adoption ceiling (the drag):** the observed on-device-ML SDK ceiling is ~1–2% of *apps*. This is a Type E improvement to an existing base, so the better framing is attach-rate to apps already using ML Kit's on-demand models, not net-new adopters.
- **Engineering cost avoided:** `E_diy − E_int` per adopter is small-to-moderate — call it 1–3 engineer-weeks saved (hand-rolled polling + progress UI + offline handling + ongoing fragility) minus a near-zero integration. Across the install-weighted base this is real but not enormous; the value is adoption de-risking across the *portfolio*, not direct labor savings.

**Sensitivity:** halve both the attach rate and the per-app saving and the *direct* ROI gets thin — which tells the truth about this idea: it is justified by the **strategic-complement** case (it makes every other ML Kit API safer to adopt), not by standalone labor math. The one experiment that would settle it: instrument how many existing ML Kit on-demand integrations hit `UNAVAILABLE`/`NOT_FOUND` in the field.

---

## Adoption path

1. **The hook:** a developer with an existing flaky translation/segmentation integration swaps their polling loop for `ModelDelivery.status(model).collect { }` and gets a real progress bar and an offline hint in 15 minutes. The win is visible in their own app immediately.
2. **First real integration:** they ship it to production and delete their retry-timer and their indeterminate spinner. It replaces the community wrapper (`flutter_translate_kit`, the RN gate) with a first-party contract.
3. **The dependency:** they build UX around the typed states (offline hint, defer-until-charging, eligibility-based hiding). Removing it later means rebuilding that UX — a dependency they'd endorse, not resent, because it's the correct abstraction.

**First adopter:** a translation- or OCR-heavy app serving growth markets, where offline is common and the current failure is most visible — Envision (already uses ML Kit) or any of the many apps filing the issues above. **Second wave** unlocks when the GenAI family and the traditional family share one surface, so an app adding a Nano feature gets the same delivery contract it already trusts for translation.

---

## Execution plan

- **Developer preview:** ship `ModelDelivery.status()` over the *traditional* family first (translation, entity extraction, segmentation, custom). Question it answers: does unifying on the GenAI `DownloadCallback` shape actually reduce field `UNAVAILABLE` rates? Evidence collected: field telemetry from 3–5 partners.
- **Beta — graduate when:** progress fidelity and offline detection are reliable across the three dominant SoC families, and the typed `Unavailable.reason` is accurate (no false `DEVICE_NOT_ELIGIBLE`). Checkable condition: <1% misclassified terminal states in partner telemetry.
- **GA:** commit the state enum and the delivery SLO as a versioned, output-stable contract, independent of model refreshes.

**Org dependencies, named honestly:** this needs the **Play Services model-delivery team** and the **AICore team** to agree a shared status vocabulary — the whole value is that traditional and GenAI families converge. If they don't, the idea degrades to a traditional-family-only extension (still worth doing, but it forfeits the unification that makes it strategic). That cross-team yes is the real risk, more than any technical one.

---

## The case against

The strongest case against, argued at full strength: **the borrow path already works well enough.** A developer can poll `isModelDownloaded`, catch the exception, show a spinner, and — for progress — there's a known community pattern and shipping wrappers in both Flutter and React Native. The missing piece (an offline *signal*) is a genuine annoyance but not a blocker; apps degrade to "tap again when you're online." Under this view the idea is a quality-of-life API, not a platform necessity, which is exactly what S3=3 encodes.

The live failure mode from the rubric's list is **#7, undifferentiated against a free substitute** — the community wrappers *are* the free substitute. The counter is that a wrapper cannot offer two things only the platform can: a truthful **offline/eligibility signal** (it requires Play Services connectivity + delivery state the app can't see) and an **SLO** (a wrapper can't promise terminal states in bounded time). Those are the parts with platform privilege; the progress bar alone is not. So the honest scope is: ship the parts a wrapper structurally *cannot* build, and treat the progress bar as table stakes that comes along for free.

A secondary risk is **durability (#8, deprecation by a thousand cuts)** — a delivery SLO you later weaken is worse than never having made one. Mitigation: version the contract independently of the model, and keep the SLO a conservative floor.

---

## Kill criteria

**The single observation that would reverse this:** if ML Kit's next 1–2 release-note cycles ship a unified `RemoteModelManager` progress + offline-reason API themselves (i.e. the platform closes the gap before this is prioritized), the idea is done — it was correct, and we shipped it. Checkable against [the release notes](https://developers.google.com/ml-kit/release-notes), which as of 2026-10-06 have no entry after 21 July 2026.

**Load-bearing assumption:** that a meaningful share of existing ML Kit on-demand integrations actually hit availability/offline failures in the field. If field telemetry shows `UNAVAILABLE` is rare in practice (models mostly pre-download on wifi at first launch), the demand is latent, not active, and this drops to Prototype.

**Re-check trigger if shelved:** the DMA Android 18 implementation (by 1 Aug 2027) — if Google's 3P on-device-model access ends up *requiring* an availability/delivery contract to satisfy "equal performance," this goes from Build to urgent.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, because ML Kit *owns the managed on-demand delivery surface* for the traditional models and is the sanctioned front door to AICore for GenAI. The unification only makes sense where both families live, which is ML Kit. LiteRT/MediaPipe hand model placement to the app (no managed delivery to contract over), and Firebase AI Logic deliberately hides state behind cloud fallback. The one caveat: the **Play Services delivery team** is the true owner of the download machinery, so this is ML Kit-fronted but co-owned — and the report's biggest open question (below) is whether that co-ownership can be secured.

---

## Open questions

- **Field failure rate.** What fraction of existing ML Kit on-demand calls hit `UNAVAILABLE`/`NOT_FOUND` in production? Google can measure this; I can't. It's the load-bearing number. *Settled by:* Play Services telemetry.
- **ML Kit's own adoption.** AppBrain surfaces no ML-Kit-specific %apps/%installs line (detail pages JS-rendered + egress-blocked); the 9.6× multiplier is a TFLite proxy. *Settled by:* a browser read of the AppBrain ML Kit detail page or the Play SDK Index.
- **Cross-team ownership.** Will Play Services delivery + AICore agree a shared status vocabulary? *Settled by:* an internal conversation, not research.
- **Traction volume.** GitHub reaction counts and SO view counts didn't extract. The evidence is broad and recurring but not volume-quantified. *Settled by:* a manual pass over #315/#1656/#740 reactions and the SO queries listed in the research notes.

---

## Runners-up

- **On-device neural TTS (Type A)** — strong whitespace (Google ships nothing; Picovoice Orca sells into it; Apple added speech generation), but lost on **feasibility/model-redistribution risk** and it's the crowded, obvious pick. Higher-variance than a delivery contract.
- **On-device safety/moderation classifier (Type G)** — real regulatory pull (minors laws from Jan 2026; Play makes devs liable for output; Bumble open-sourced one), but a one-size classifier risks being unusable to real T&S teams (tunability problem), and it partly overlaps the DMA. Strong second choice.
- **On-device evaluation/quality harness (Type D)** — sharp gap vs Apple's Evaluations framework (ML Kit publishes a prose "evaluate prompt quality" page with *no* tooling), but lower install-weighted reach (only GenAI adopters) and weaker urgency.
- **Reach / graceful-degradation tiering (Type F)** — addresses the biggest problem (the 26× Nano-vs-classic gap), but it's closer to a strategy than a shippable surface, and honest per-tier quality claims are hard. Didn't fail a gate; lost on shippability.
- **Deferred/opportunistic inference scheduling (Type E)** — genuinely novel (no competitor offers it), but **Nano-gated** (reaches ~3.7%) and lacks a demand artifact as sharp as #315/#1656.

*Why the winner beat them:* it is the only candidate that (a) has a verbatim, cross-API, multi-year demand artifact, (b) reaches the whole classic fleet rather than the Nano slice, (c) has maximal platform privilege with trivial feasibility, and (d) rides a pattern ML Kit already shipped for GenAI — so it's unification, not invention.

---

*Sources:*
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [ML Kit GenAI DownloadCallback reference](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)
- [ML Kit GenAI image description (Android)](https://developers.google.com/ml-kit/genai/image-description/android)
- [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315)
- [firebase-android-sdk #1656](https://github.com/firebase/firebase-android-sdk/issues/1656)
- [googlesamples/mlkit #405](https://github.com/googlesamples/mlkit/issues/405)
- [googlesamples/mlkit #740](https://github.com/googlesamples/mlkit/issues/740)
- [googlesamples/mlkit #1063](https://github.com/googlesamples/mlkit/issues/1063)
- [firebase/quickstart-android #784](https://github.com/firebase/quickstart-android/issues/784)
- [googlecodelabs/mlkit-android #24](https://github.com/googlecodelabs/mlkit-android/issues/24)
- [flutter_translate_kit (pub.dev)](https://pub.dev/packages/flutter_translate_kit)
- [react-native-mlkit-translate-text](https://github.com/yaaliuzhipeng/react-native-mlkit-translate-text)
- [Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- [SplitInstallSessionState reference](https://developer.android.com/reference/com/google/android/play/core/splitinstall/SplitInstallSessionState.html)
- [Firebase AI Logic hybrid inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference)
- [Apple SystemLanguageModel availability](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)
- [EU DMA — Alphabet interoperability (AI services)](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [AppBrain machine-learning SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [apilevels.com](https://apilevels.com/)
- [Gemma 4 / Nano device reach (Android Developers Blog, Apr 2026)](https://android-developers.googleblog.com/2026/04/gemma-4-new-standard-for-local-agentic-intelligence.html)
