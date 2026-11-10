# One delivery contract for every ML Kit model — stop shipping "catch `UNAVAILABLE` and hope"

**Type:** C (developer experience), extending into B (extension) and E (lifecycle) · **Verdict:** Prototype / developer-preview · **Opportunity: 7/10 (Solid)**
*2026-11-10 · Prepared for Android ML Kit · Evidence current as of 2026-11-10*

> *Badges: `Nobody has an ETA or an SLO` · `Google already built the good version — for one model family` · `Regulatory tailwind, not a mandate`*

> On a Tuesday, an Android engineer ships offline translation with ML Kit. The model is unbundled, so it downloads on first use. A user in Jakarta on no network taps Translate, the call throws `MlKitException.UNAVAILABLE`, and the engineer's only move — documented verbatim in Google's own issue tracker — is to "keep the analyzer alive… and hope for the Play Services to eventually download the model." There is no download state, no progress, no reason, no signal that it will never arrive offline. Meanwhile ML Kit's *GenAI* APIs already ship a four-state status enum and a byte-level progress callback. The same SDK answers the same question two incompatible ways, and for its most widely installed models the answer is a boolean and a prayer.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Solid | composite 3.8 × 2 = 7.6, −1 for Durability gate at 3; S1 not a 5, so no +1 → ~7 |
| Platform privilege (gate) | 4/5 — pass | Classic model delivery is owned by Play Services; nobody else can make `RemoteModelManager` ergonomic or commit a delivery contract. Discounted from 5 because the raw status is partly reachable via GMS `ModuleInstallClient` ([issue #315 closure](https://github.com/googlesamples/mlkit/issues/315)) |
| Feasibility headroom (gate) | 5/5 — pass | The exact surface already ships for GenAI: [`DownloadCallback`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) + [`FeatureStatus`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/package-summary). This is engineering, not research |
| Durability (gate) | 3/5 — pass (flagged) | A status enum is trivially stable for 5 years. The risk is *willingness*: Google closed the 7-year [Firebase #47](https://github.com/firebase/firebase-android-sdk/issues/47) request "not planned" in Oct 2025 |
| Demand evidence (25%) | 4/5 | Two independent official-repo feature requests (2018 & 2021), one at 18 👍 over 7 years, plus 2026 devs hand-rolling the layer and an open hang filed [Nov 9 2026](https://github.com/googlesamples/mlkit/issues/1085). No paid vendor; forum volume unmeasured |
| Install-weighted reach (15%) | 4/5 | Touches every app using any unbundled/remote ML Kit model. ML-SDK adoption skews ~11.8× to high-install apps (TFLite AppBrain proxy); API 26+ ≈ 97.6% |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The *borrow* path exists: GMS `ModuleInstallClient` + `InstallStatusListener`, hand-rolled in ~60 lines in [PR #232 (Sep 2026)](https://github.com/o-benjamin/fansa-uchiwa-android/pull/232). Caps the saving at days-per-app for the basic case; ETA/SLO/unification aren't borrowable |
| Integration cost / TTFHW (15%) | 5/5 | One Gradle line, no new permission, works in emulator, mirrors the existing GenAI callback — sub-15-min hello-world |
| Substitute half-life (15%) | 3/5 | `ModuleInstallClient` already does ~60% of the basic job for free *today* — this is the load-bearing risk. Unification + ETA + eligibility isn't substitutable for years |
| Strategic complement (10%) | 4/5 | Fewer "my AI feature silently didn't appear" churn events; strengthens ML Kit adoption and Android developer gravity vs Apple |
| **Composite** | **3.8** | Prototype band (3.0–3.9): build a developer preview whose job is to collect the S1/S5 evidence the desk research can't settle |

*Least trustworthy row: S5 (substitute half-life). The honest question — does GMS `ModuleInstallClient` plus a good sample already close enough of the gap that a unified API is a nice-to-have? — is exactly what a developer preview exists to answer.*

---

## The problem

The job, stated as a developer's: *"Before I show a feature in my UI, tell me whether its on-device model is here, coming, or never coming for this user — and if it's downloading, how far along."* The customer is an Android IC under a ship deadline; the competing solution is their own retry-and-hope loop.

This is structurally produced, not an accident of tooling. A 100M+ install app serves a fleet where more than half of Indian and Indonesian users have no wifi (Google Play's own figure), so **on-demand model download is the default, not the exception** — bundling every model is a direct install-conversion tax (Google: ~1% of installs per 6 MB). The moment a model is unbundled, its arrival becomes an event the app must observe. But the app team is server-side by org; the person who can reason about both Play Services delivery behavior and Android runtime state is rare and expensive. So the plumbing gets hand-rolled, badly, per model, per app.

What they do *instead* today, concretely:

- **Classic models (translation, segmentation, entity extraction, custom LiteRT):** call `isModelDownloaded()` (a boolean), call `download()` (a `Task<Void>` that completes or throws), and wrap inference in `try/catch` for `UNAVAILABLE`. There is no progress and no state machine. One 2026 developer discovered the hard way that `installModules()`'s Task "completes when the request is accepted, not when download finishes," and hand-built a 60-second `InstallStatusListener` wait ([PR #232](https://github.com/o-benjamin/fansa-uchiwa-android/pull/232)).
- **Silent, device-specific failures:** "Hash does not match with expected" for "a small number of users" ([#796](https://github.com/googlesamples/mlkit/issues/796)); an Android 14-only download break ([#744](https://github.com/googlesamples/mlkit/issues/744)). The developer catches and discards the exception because there's nothing actionable in it.

A problem that only existed because of a fixable bug would be a bug report. This one is produced by the permanent intersection of a download-on-demand delivery model, an offline-heavy fleet, and an SDK whose own two halves disagree on how to report delivery state.

---

## Proof & signals

- **The exact request, filed twice, independently.** [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315) (G00fY2, 2021), verbatim: *"There is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline… we have no indicator about that."* The maintainer replied *"We had it planned but didn't have cycle to get to it,"* and a later comment: *"We're waiting for a download infrastructure update from Play Services."* Closed Aug 2022 by pointing at the GMS `ModuleInstallClient` workaround. [Evidence: confirmed, primary — GitHub]
- **Sustained seven years, then declined.** [firebase/firebase-android-sdk #47](https://github.com/firebase/firebase-android-sdk/issues/47) (2018), **18 👍 over seven years**, asked for exactly `UNAVAILABLE / AVAILABLE / DOWNLOADING` states and quoted the docs' own tell: *"Requests you make before the download has completed will produce no results."* **Closed "not planned" in Oct 2025.** [Evidence: confirmed, primary — GitHub]. This is the strongest *demand* signal and simultaneously the strongest *durability* counter-signal, and the report has to carry both honestly.
- **Developers building the whole missing layer, in 2026.** [sanenotes #269](https://github.com/swiftsaneai/sanenotes/issues/269) (Sep 2026) centralises *"model discovery, size-aware download with user awareness, verification, storage, and eviction… ML Kit `RemoteModelManager` integration"* — i.e. the lifecycle the SDK doesn't ship. [Evidence: confirmed, primary]
- **Still happening this month.** [#1085](https://github.com/googlesamples/mlkit/issues/1085), opened Nov 9 2026 (one day before this report), still open: *"after 120 seconds the model is still not reported installed… no terminal SDK success/failure notification."* [Evidence: confirmed, primary]
- **The recurring beginner question.** [#405](https://github.com/googlesamples/mlkit/issues/405): *"I'm looking for some examples to check if a translation model is downloaded or not."* Official answer: the boolean. [Evidence: confirmed, primary]
- **The absence signal.** No commercial vendor sells "model-delivery observability for mobile," and Stack Overflow / Reddit / HN could not be fetched this run. I read the vendor silence as *this is table-stakes plumbing nobody can monetize*, not as weak demand — but S1 is scored down one band because the paid-vendor and forum-volume evidence that would push it to a 5 is genuinely absent, not merely unfound. [Evidence: absence, stated as such]

---

## Why now

1. **Capability shift — the good version already exists, for one model family (dated 2024→2026).** ML Kit's GenAI stack shipped a real delivery lifecycle: [`FeatureStatus`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/package-summary) {AVAILABLE, DOWNLOADABLE, DOWNLOADING, UNAVAILABLE} and [`DownloadCallback`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) with `onDownloadStarted(bytesToDownload)`, `onDownloadProgress(totalBytesDownloaded)`, `onDownloadCompleted()`, `onDownloadFailed(GenAiException)`. The platform has conceded the shape is worth building; it just hasn't brought it back to the classic models the whole fleet uses. The template exists, so the cost-to-build argument collapses.
2. **Competitive / regulatory shift (dated July 2026).** The EU's DMA decision on Alphabet (adopted **16 July 2026**, implementation tied to **Android 18, ~1 Aug 2027**) forces Google to expose its **on-device models (Gemini Nano)** to third-party AI assistants at "comparable" performance ([EC developer portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). **Read the scope precisely: this is a parity/access fix on Google's *own preinstalled* models, not a pipeline for a developer's own models.** It does not build this idea for you. But it drags system-level on-device-model delivery into a regulated, must-be-observable posture and raises the organizational salience of clean delivery contracts. Tailwind, not mandate — and reporting it as a mandate would be the kind of overclaim a skeptic uses to discard the whole document.
3. **Demand shift (dated June 2027).** [Firebase ML shuts down 15 June 2027](https://firebase.google.com/docs/ml); the [migration path](https://developers.google.com/ml-kit/migration) pushes those developers onto the standalone on-device ML Kit SDK — i.e. onto exactly the `RemoteModelManager` delivery surface that lacks observability, at the moment their volume arrives.

Three dated shifts converge. The why-now is real, though its strongest leg (the regulatory one) is a tailwind on an adjacent surface, which is the honest framing.

---

## The capability gap

Checked against live docs this run:

- **ML Kit, classic (`RemoteModelManager`):** `isModelDownloaded() → Task<Boolean>`, `download(model, conditions) → Task<Void>`, `deleteDownloadedModel`, `getDownloadedModels`, `DownloadConditions` (wifi/charging/idle). **No state enum, no progress callback on Android.** (Inconsistently, the iOS/Firebase variant returns `NSProgress` and posts notifications — so even *within* ML Kit the contract differs by platform.) Checked: [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager), [translation guide](https://developers.google.com/ml-kit/language/translation/android).
- **ML Kit, GenAI:** the rich surface above — but Gemini Nano only, bytes not ETA, no SLO, and a *separate* error taxonomy (`GenAiException.ErrorCode.{BUSY, NOT_AVAILABLE, NEEDS_SYSTEM_UPDATE, BACKGROUND_USE_BLOCKED, PER_APP_BATTERY_USE_QUOTA_EXCEEDED}`) that doesn't line up with classic `MlKitException.UNAVAILABLE`.
- **Firebase AI Logic `OnDeviceExtension`:** four-state `OnDeviceModelStatus` + a `Flow<DownloadStatus>` — but Nano-only and already deprecated in favour of `GenerativeModel.OnDeviceExtension`. [Ref](https://firebase.google.com/docs/reference/android/com/google/firebase/ai/ondevice/OnDeviceModelStatus).
- **Play for On-device AI (`AiPackManager`):** `getPackStates` / `fetch` / `AiPackStateUpdateListener`, states PENDING/DOWNLOADING/FAILED/WAITING_FOR_WIFI/REQUIRES_USER_CONFIRMATION, byte progress, device-targeted. **But it governs only models the developer ships in their own AI packs** — docs: *"Models shouldn't be offered to other apps"* — not ML Kit's managed models. [Ref](https://developer.android.com/google/play/on-device-ai).
- **Apple Foundation Models:** `SystemLanguageModel.availability` → `.available` / `.unavailable(reason)`; downloading is *folded into* `.modelNotReady` with **no distinct state, no progress, no ETA, no SLO** ([doc](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel); a [forum thread](https://developer.apple.com/forums/thread/788983) reports a stuck `modelNotReady`). Apple is *coarser* here, not ahead.
- **Qualcomm / Samsung / MediaTek:** no device-side end-user delivery-state API; they defer to AICore or Play.

**The precise boundary:** Google has **three or four disjoint, partly-deprecated delivery surfaces** over different model populations, and **no vendor anywhere exposes a download ETA or a delivery SLO.** The main competitor a developer uses today is not another platform — it's **GMS `ModuleInstallClient` + `InstallStatusListener`, hand-wired per model.**

---

## Proposed surface

Unify ML Kit's delivery story on the surface the platform already validated for GenAI, and bring it to classic models. The persuasive artifact is the before/after:

**Before (today, classic model):**
```kotlin
if (!remoteModelManager.isModelDownloaded(model).await()) {
    remoteModelManager.download(model, conditions).await()   // completes "when accepted", not done
}                                                            // no progress, no reason, no eligibility
try { translator.translate(text).await() }
catch (e: MlKitException) { /* UNAVAILABLE: retry? give up? offline forever? unknowable */ }
```

**After (proposed — one contract across GenAI *and* classic):**
```kotlin
when (val s = ModelDelivery.status(model)) {              // unified FeatureStatus
  AVAILABLE      -> translator.translate(text)
  DOWNLOADING    -> showProgress(s.bytesDownloaded, s.bytesTotal, s.etaMillis)   // ETA: new everywhere
  DOWNLOADABLE   -> ModelDelivery.download(model, conditions, object : DownloadCallback {
                      override fun onDownloadProgress(done: Long, total: Long, etaMillis: Long) { … }
                      override fun onDownloadFailed(reason: DeliveryFailure) { … }   // typed reason
                    })
  UNAVAILABLE    -> degradeGracefully(s.reason)            // INELIGIBLE_DEVICE vs NO_NETWORK vs POLICY
}
```

Deliberate **non-goals** (an API that promises everything ships nothing): it does not change *which* models exist, does not unify the inference error taxonomy (separate problem), and does not deliver developer-supplied models (that's Play AI Delivery's job). It does exactly one thing: make *delivery* observable and consistent.

Two genuinely new elements beyond porting GenAI's surface, both of which only the platform can provide: a **download ETA** (nobody has it) and an **eligibility verdict** that distinguishes "not downloaded yet" from "will never be available on this device/user" — the single most-requested missing bit in #315 and #47. A delivery **SLO** is the E-type stretch; name it as an aspiration, not a v1 promise, because an SLO you break is worse than one you never made.

**Time-to-first-hello-world target: under 15 minutes.** Achievable because it reuses the GenAI `DownloadCallback` ergonomics, needs one Gradle line, adds no permission. If v1 can't hit that, the design is wrong.

---

## Reach & sizing

Inputs (every number labeled; ML-Kit-specific adoption could not be fetched this run, so I reason from a proxy and say so):

| Input | Value | Source / label |
|---|---|---|
| API 26+ reach (GenAI minSdk) | ~97.6% | Google Play distribution, Dec 2025 (Google-published, relayed third-party) |
| API 31+ reach | ~69.3% | same |
| ML-SDK install-weighting multiplier | ~11.8× (TFLite: 11.19% installs ÷ 0.95% apps) | [AppBrain](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite), third-party crawl — **proxy, not ML Kit** |
| ML Kit %apps / %installs | **[unverified]** — AppBrain host unreachable this run | would refine the estimate |

**The arithmetic that matters is categorical, not a point estimate:** the beneficiary set is *every app that uses any unbundled or remote ML Kit model* — translation, segmentation, entity extraction, digital ink, custom LiteRT RemoteModels, plus all GenAI adopters who'd get a consistent surface. Because ML-SDK adoption skews ~12× to high-install apps, the **install-weighted** reach is far larger than the app-count. **Engineering cost avoided** is modest per app (days of hand-wired `InstallStatusListener` plumbing and the support cost of silent failures) but multiplied across every ML Kit integrator and, critically, *recurring* — each OS version that breaks download behavior ([#744](https://github.com/googlesamples/mlkit/issues/744)) is work the platform absorbs once instead of every app absorbing it forever.

**Sensitivity:** halve the per-app saving and halve the fraction of apps using *unbundled* models, and the platform test gets soft — because the borrow path (`ModuleInstallClient`) is cheap. The verdict flips from "build" to "prototype to measure," which is exactly where the composite landed. The one experiment that would settle it: instrument a developer preview and measure how many integrators adopt the unified surface over leaving their hand-rolled `ModuleInstallClient` code in place.

---

## Adoption path

1. **The hook:** a 15-minute sample that replaces a translation app's `try/catch(UNAVAILABLE)` with a progress bar and an "unavailable offline" empty state. The win is visible in the emulator.
2. **First real integration:** an offline-first app (translation, accessibility, note capture) ships the eligibility verdict so it stops showing a feature that will never load for a given user — replacing their bespoke retry loop.
3. **The dependency:** once an app renders real download progress and a typed "ineligible vs offline vs policy" branch in its UX, reverting to a boolean is a UX regression they'd resent losing. Stickiness is in the UX contract, not lock-in.

**First adopter:** an accessibility or translation app already fighting the offline case — [Envision](https://developers.google.com) (an ML Kit summarization user for blind/low-vision users) is the archetype. **Second wave:** the Firebase ML migrants arriving before June 2027, who touch the delivery surface on day one.

---

## Execution plan

- **Developer preview (ML Kit-owned):** port `FeatureStatus` + `DownloadCallback` onto `RemoteModelManager` for 2–3 classic models; **question it answers:** do integrators replace hand-rolled `ModuleInstallClient` code, or ignore it? **Evidence collected:** the S5 answer.
- **Alpha → Beta graduation condition (checkable):** ETA accuracy within a stated error band on mid-tier devices, and the eligibility verdict correctly distinguishing ineligible-device from offline in a device-matrix test. If ETA can't be made trustworthy, ship status+progress without it rather than ship a lying ETA.
- **GA:** a frozen, versioned delivery state machine identical across GenAI and classic models; the SLO stays explicitly out of GA v1.

**Org dependency, named honestly:** the underlying classic-model download is **Play Services'** (`ModuleInstallClient`) — the same team ML Kit was "waiting for a download infrastructure update" from back in 2021 ([#315](https://github.com/googlesamples/mlkit/issues/315)). ML Kit can own and ship the *developer-facing unification and progress/eligibility surface* on top of GMS; the *delivery SLO* needs Play Services to say yes. If they don't, the idea still ships minus the SLO — so the plan is structured to not depend on that yes.

---

## The case against

The strongest case, argued at full strength: **this is undifferentiated against a free substitute that already exists** (failure mode #7), compounded by **the platform having already absorbed the problem on the paths it cares about** (#2). GMS `ModuleInstallClient` + `InstallStatusListener` gives install status today; [PR #232](https://github.com/o-benjamin/fansa-uchiwa-android/pull/232) proves a competent developer wires it in ~60 lines. GenAI already has the rich surface; Play AI Delivery has it for custom packs. So a skeptic says: the only genuinely uncovered case is *classic* ML Kit models, the fix is a documented wrapper over an existing GMS API plus two sample files, and **Google already looked at this and closed [#47](https://github.com/firebase/firebase-android-sdk/issues/47) "not planned."** That last fact is the sharpest point — the owning org has already revealed its priority.

The honest rebuttal, no stronger than it should be: the ETA and the ineligible-vs-offline verdict are *not* reachable via `ModuleInstallClient`, and the cross-surface inconsistency is itself a real adoption tax (a developer learns two delivery models inside one SDK). But those are incremental goods over a working free substitute, which is precisely why the verdict is **Prototype, not Build** — the preview exists to find out whether that increment moves adoption. If it doesn't, this is a docs page and a sample, not an API.

---

## Kill criteria

**The single observation that would reverse this recommendation:** an ML Kit release after July 2026 that adds a progress/status API to `RemoteModelManager`, **or** a measured developer preview showing integrators leave their `ModuleInstallClient` code in place rather than adopt the unified surface. Either reverts this to "write a sample and a docs page." (Checkable: watch [ML Kit release notes](https://developers.google.com/ml-kit/release-notes); latest entry as of this run is July 21 2026, so the gap is still open.)

**Load-bearing assumption:** that cross-SDK inconsistency plus a missing ETA/eligibility verdict is painful enough that developers adopt a unified surface over the free GMS workaround. Unproven by desk research; it's the thing the preview measures.

**Re-check trigger if shelved:** Firebase ML migration volume lands (mid-2027) and generates a fresh wave of `RemoteModelManager` delivery complaints, **or** the DMA Android 18 implementation (Aug 2027) forces a system-level delivery contract this could ride on.

---

## Fit for this team

ML Kit, specifically — but with a named boundary. The pain lives in *ML Kit's* `RemoteModelManager`, the good template is *ML Kit's* GenAI surface, and the inconsistency is *within ML Kit*, so unifying its own delivery story is squarely ML Kit's job and nobody else's. The underlying classic-model download mechanism, however, belongs to **Play Services**, and the delivery *SLO* is theirs to grant. The worst outcome for this ecosystem is a fourth delivery API in a different corner of Google's stack — so the correct scope is ML Kit consolidating onto one contract over the GMS primitive, not a net-new delivery system. If leadership won't fund ongoing ownership, the honest answer is to ship the sample and documentation rather than a half-owned API that becomes the next #47.

---

## Open questions

- **ML-Kit-specific adoption (%apps, %installs):** AppBrain unreachable this run; the ~11.8× multiplier is a TFLite proxy. Settle by fetching the ML Kit AppBrain detail page.
- **How much does `ModuleInstallClient` already cover in practice?** The decisive S5 input. Settle by building the wrapper over GMS and measuring the residual gap (ETA, eligibility, cross-surface consistency).
- **Did Google close #47 on priority or on principle?** If it was a deliberate "apps should own this" stance, that's a durability finding, not a backlog gap. Settle by reading the closure rationale / asking the owning team.
- **Exact DMA per-measure deadline wording** (Android 18 / 1 Aug 2027 mapping): confirmed only via search snippets; fetch the [case PDF](https://ec.europa.eu/competition/digital_markets_act/cases/202629/DMA_100220_2683.pdf) directly.

---

## Runners-up

- **On-device GenAI evaluation / regression harness (Type D)** — Apple shipped an Evaluations framework; ML Kit publishes a prose "evaluate prompt quality" page with no tooling behind it. Lost on **G1 (platform privilege)**: a three-person team can ship an eval harness as a Gradle dependency, so the privilege gate is marginal.
- **On-device safety/moderation classifier for *user* content (Type G)** — strong regulatory why-now (minors law live Jan 2026; Play holds the developer liable for output). Parked on the **tunability risk**: safety is each company's proprietary policy surface, so a one-size classifier may be unusable without heavy configuration — needs its own run to resolve.
- **On-device neural TTS developer API (Type A)** — the biggest genuine whitespace (Google has no modern TTS API; Picovoice sells Orca into the hole). Lost on **G3 (durability)** and feasibility weight: a large, frozen model commitment, not a status enum.
- **Deferred / opportunistic inference scheduling (Type E)** — "run this batch when charging, on wifi, idle" under the shared system model. Real (P15 quotas) but thinner, more diffuse demand evidence than the delivery-observability request.
- **Reach tiering / graceful degradation across the fleet (Type F)** — converts the 3.7% GenAI demo into a platform. Lost this run on being hard to make concrete enough to score without inventing the quality-at-each-tier numbers.

Selected idea beat these because it carries the single best *direct, verbatim, multi-year* developer-voice evidence and clears every gate, where the runners-up each stumble on a gate or lack comparably hard demand proof.

---

*Sources: [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [GenAI DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) · [GenAI common package (FeatureStatus)](https://developers.google.com/android/reference/com/google/mlkit/genai/common/package-summary) · [Prompt API](https://developers.google.com/ml-kit/genai/prompt/android) · [RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [Translation guide](https://developers.google.com/ml-kit/language/translation/android) · [Firebase OnDeviceModelStatus](https://firebase.google.com/docs/reference/android/com/google/firebase/ai/ondevice/OnDeviceModelStatus) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [AiPackManager](https://developer.android.com/reference/com/google/android/play/core/aipacks/AiPackManager) · [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [Apple forum: modelNotReady](https://developer.apple.com/forums/thread/788983) · [mlkit #315](https://github.com/googlesamples/mlkit/issues/315) · [firebase-android-sdk #47](https://github.com/firebase/firebase-android-sdk/issues/47) · [PR #232](https://github.com/o-benjamin/fansa-uchiwa-android/pull/232) · [mlkit #796](https://github.com/googlesamples/mlkit/issues/796) · [mlkit #744](https://github.com/googlesamples/mlkit/issues/744) · [mlkit #405](https://github.com/googlesamples/mlkit/issues/405) · [sanenotes #269](https://github.com/swiftsaneai/sanenotes/issues/269) · [mlkit #1085](https://github.com/googlesamples/mlkit/issues/1085) · [EC DMA Alphabet interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [Firebase ML deprecation](https://firebase.google.com/docs/ml) · [ML Kit migration](https://developers.google.com/ml-kit/migration) · [AppBrain TFLite stats](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite) · [apilevels.com](https://apilevels.com/) · [Qualcomm AI Hub](https://aihub.qualcomm.com/get-started)*
