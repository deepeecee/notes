# ML Kit Idea Browser — run of 2026-09-28

> **Run type:** first run in this repository — no prior idea ledger existed to diff against, so nothing is a repeat.
> **What this file is:** the ML Kit Idea Browser produces *one deep opportunity report per run* (not a votes/author feed), plus the runners-up it considered. The "top ideas" summary below is the deep pick plus this run's four runners-up. The pipeline has no vote/author/tag metadata; the honest equivalents are **idea type, verdict, opportunity score, and gate status**, shown per idea.

## Top ideas this run

| # | Idea | Type | Verdict | Opportunity | One-liner |
|---|---|---|---|---|---|
| **1 (deep pick)** | **Model Availability & Delivery Contract** | E — Delivery & lifecycle | **Prototype / dev-preview** | **7/10** | A unified, observable state machine + delivery SLO across both classic unbundled ML Kit models and Gemini-Nano/AICore, so apps stop polling-and-hoping. |
| 2 | On-device neural TTS API | A — New capability | (not taken deep) | ~6/10 est. | Google is the only major platform with no on-device neural TTS developer API; Picovoice charges for Orca, Apple shipped speech generation. |
| 3 | On-device eval harness + token accounting | D — Tooling | (not taken deep) | ~6/10 est. | ML Kit prescribes a prompt-quality workflow but ships nothing to run it; Apple shipped an Evaluations framework + token counting. |
| 4 | Reach/tiering across the sub-8GB fleet | F — Reach | (not taken deep) | ~5/10 est. | Turn a 3.7%-of-fleet flagship demo into a platform capability via explicit quality tiers. |
| 5 | On-device user-content moderation classifier | G — Trust & safety | (not taken deep) | ~5/10 est. | Play policy makes app devs liable for model output; no platform classifier for *user* content (Bumble open-sourced its own). |

**Highlighted — trending / clock-driven:** Idea #1 carries a **statutory why-now**: the EU DMA Article 6(7) decision against Alphabet (16 July 2026, Case DMA.100220) mandates third-party access to system-level on-device AI models in **Android 18 by 1 August 2027**, free of charge and at performance equivalent to Google's own services. That deadline is about to *define* what a platform on-device-AI availability surface must expose — which is exactly this idea's territory. Idea #5 shares a regulatory clock (US minors/age-assurance laws live since Jan 2026). The rest are strong-but-not-urgent.

The full report on the deep pick follows.

---

# Model Availability & Delivery Contract — stop making every app poll-and-hope for its model

**Type:** E — Delivery & lifecycle · **Verdict:** Prototype / developer-preview · **Opportunity: 7/10 (build the preview, on the regulatory clock)**
*2026-09-28 · Prepared for Android ML Kit · Evidence current as of 2026-09-28*

> Right now an Android dev integrating ML Kit translation ships the feature, then discovers in production that for some users it silently never appears. Their code keeps the analyzer alive on `MlKitException.UNAVAILABLE` and *hopes Play Services eventually downloads the model* — their own words in the feature request that has sat open since 2021. If the user is offline it never downloads, and the app has no way to say why. The classic `RemoteModelManager` gives them one boolean and zero progress. Fourteen-plus distinct issues across ML Kit's two repos describe this same failure, across every unbundled surface. The fix is not a model — it is a contract.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **7/10 — build the preview** | Composite 3.65 → ×2 = 7.3; no gate at exactly 3 (gates are 5/5/4); S1 is 4 not 5, so no +1. Rounds to 7. |
| Platform privilege (gate) | 5/5 — **pass** | Model download is owned by Play Services / AICore; apps *cannot* observe delivery state or offer an SLO themselves ([issue #315](https://github.com/googlesamples/mlkit/issues/315)). |
| Feasibility headroom (gate) | 5/5 — **pass** | No model to train; primitives already exist — GenAI ships a 4-state `FeatureStatus` + byte-level `DownloadCallback` ([get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)). |
| Durability (gate) | 4/5 — **pass** | Play Asset Delivery's `AssetPackStatus` is a multi-year held delivery contract precedent; DMA now makes exposure statutory. Risk: a lifecycle contract broken is worse than none. |
| Demand evidence (25%) | 4/5 | [#315](https://github.com/googlesamples/mlkit/issues/315) (verbatim, unresolved), GenAI parallel [#1062](https://github.com/googlesamples/mlkit/issues/1062), open progress FR [firebase #1656](https://github.com/firebase/firebase-android-sdk/issues/1656), 14+ silent-failure issues, third-party detection guides. |
| Install-weighted reach (15%) | 3/5 | Inherits ML Kit's adoption base (classic reach ~96% at API 26+); but the load-bearing AppBrain install-weight number **did not render — `[unverified]`**. GenAI capped at ~3.7% of fleet. |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Borrow path is WorkManager + hand-rolled polling (a few weeks/app, mostly works) — but the offline-vs-ineligible/quota semantics *cannot* be borrowed; only the platform has them. |
| Integration cost / TTFHW (15%) | 4/5 | An enriched enum + existing callback; ~0 added APK size, no new permission, plausible <15-min hello-world. |
| Substitute half-life (15%) | 4/5 | A general model can't substitute a delivery contract; OSS can't reach platform-owned delivery. Real risk is Google's *own* roadmap (Play AI Delivery, Firebase AI Logic) absorbing it. |
| Strategic complement (10%) | 4/5 | Reliable delivery compounds adoption across *every* ML Kit API and strengthens the DMA-mandated on-device story. |
| **Composite** | **3.65** | Weighted mean; lands in the Prototype/dev-preview band (3.0–3.9). |

*Least trustworthy line: install-weighted reach (S2). AppBrain — the only public per-SDK adoption proxy — is egress-blocked in this environment, so the ~2–9% figure below rests on labeled assumptions, not a crawl.*

---

## The problem

The job, stated as a developer's job under a deadline: *"I added an ML Kit model to my app; tell me reliably whether it will run for this user, and if it's downloading, let me show them why to wait — without shipping the model in my APK."* The competing solution is the developer's own polling loop.

This problem is structurally produced, not incidental. A 100M+ install app can't bundle every model — Google Play's own figure is ~1% of install conversion lost per 6 MB of APK growth, worst in the growth markets where more than half of Indian and Indonesian users have no wifi. So apps take the unbundled/on-demand path, which hands model delivery to Play Services (classic ML Kit) or AICore (Gemini Nano). But delivery is owned by the platform and **the platform exposes almost none of its state to the calling app.** The two surfaces are also mismatched:

- **Classic unbundled models** (translation, subject segmentation, face, digital ink, barcode-UI): `RemoteModelManager.download()` returns a `Task` with success/failure and an `isModelDownloaded()` boolean. **No progress** — Google's docs concede "the download API doesn't report the exact downloading progress." No state machine, no offline-vs-ineligible distinction, no timeout ([RemoteModelManager ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)).
- **GenAI / Gemini Nano** *did* get more — a 4-state `FeatureStatus` (`AVAILABLE`/`DOWNLOADABLE`/`DOWNLOADING`/`UNAVAILABLE`) and byte-level `DownloadCallback` progress. **This corrects the August-2026 landscape snapshot, which implied GenAI had only a point check — note the snapshot is stale here.** But its single opaque `UNAVAILABLE` conflates "this device can't run it" (permanent) with "hasn't fetched the AICore config / is offline" (transient), and there is no quota-exceeded state and no delivery SLO.

What apps do *instead* today is the workaround the API is priced against: keep the analyzer alive on `UNAVAILABLE` and hope; hand-roll a WorkManager download loop; or write a "feature-detection pattern that doesn't embarrass you in production" — a real DEV.to guide title for Gemini Nano. That workaround's cost, times every app on the on-demand path, is the value of this contract.

This is a platform problem, not an app problem: every app solves it identically and badly because none of them *can* see what Play Services is doing. It is not any app's differentiation.

---

## Proof & signals

- **The exact feature request, open since 2021 — [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315)** (confirmed-fetched, created 2021-06-21): *"There is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model."* Notes it breaks entirely when the user is offline. Closed without ever shipping an API.
- **The GenAI availability check is itself broken — [#1062](https://github.com/googlesamples/mlkit/issues/1062)** (open, created 2026-07-16): the officially *mandated* `checkFeatureStatus()`/`checkStatus()` throws `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE` when AICore is present but the feature isn't provisioned. The recommended guard fails at the exact moment it's needed.
- **Download progress, requested and still open — [firebase-android-sdk #1656](https://github.com/firebase/firebase-android-sdk/issues/1656)** (open, created 2020-06-12): *"Right now, it only provides updates at 0.0 (started) and 1.0 (completed)."* Plus [mlkit #165](https://github.com/googlesamples/mlkit/issues/165) for ink models.
- **The silent-failure / stuck-download class — 14+ distinct issues** across translation, subject segmentation ([#829](https://github.com/googlesamples/mlkit/issues/829), [#858](https://github.com/googlesamples/mlkit/issues/858)), barcode UI ([#641](https://github.com/googlesamples/mlkit/issues/641)), text recognition, and the GenAI cluster ([#952/#954/#985/#1063/#1069](https://github.com/googlesamples/mlkit/issues/954)). Many are device- or OS-version-specific — the failures invisible in dev testing that surface only in production.
- **Third-party guides exist because the official path is unclear:** [DEV.to — the Gemini Nano feature-detection pattern](https://dev.to/yadnyesh_rana/gemini-nano-isnt-on-most-of-your-users-phones-heres-the-feature-detection-pattern-that-doesnt-58dl); [Medium — how to show ML Kit download progress](https://medium.com/@fixitblog/solved-how-to-show-progress-of-model-downloaded-from-ml-kit-7fdfc0aa71b0).
- **Undocumented quota, quantified by a developer — [#1070](https://github.com/googlesamples/mlkit/issues/1070):** sustained Prompt-API generation hits "a rolling per-app quota that is not documented anywhere," failing with error code 9 (`BUSY`) after ~36–41 consecutive generations. Evidence that even the *error* side of availability is opaque.
- **The absence signal:** GitHub *code* search for reusable ML Kit download-retry wrappers returned nothing (auth-limited, so weak) and Stack Overflow couldn't be crawled — so the demand case rests on the first-party tracker, which is the strongest source anyway. Demand rated **4/5**, held from 5 only by those two thin channels.

Every item above is confirmed-fetched from a first-party repo unless marked recalled.

---

## Why now

1. **Capability shift (2025–2026):** GenAI models moved onto the on-demand delivery path (Nano-v3 via ML Kit GenAI, Aug 2025; Prompt API GA-track through 2026), so the "delivered, not bundled" model population — and the availability surface area — grew sharply. The primitives to expose (`FeatureStatus`, `DownloadCallback`) now exist to build on.
2. **Regulatory shift — dated and statutory:** the European Commission's **16 July 2026** Article 6(7) decision (Case DMA.100220) requires Alphabet to expose system-level on-device AI models and AICore-implemented models to third parties, **in Android 18 by 1 August 2027**, *free of charge* and at performance *equivalent to Google's own services* ([EU press release, 2026-07-16](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en); primary page `[unverified via direct fetch — egress-blocked]`, corroborated across sources). A third party can't reach parity without an availability/delivery contract to build against — so this deadline effectively *specifies* the surface this idea proposes. Ship it as the sanctioned answer or inherit whatever compliance produces under deadline.
3. **Demand shift:** developers moved from "does the model exist" to shipping models to *unpredictable* fleets — mixed AICore provisioning, offline users, quota walls — so a boolean is no longer enough and the tracker is filling with the gap.

Three datable shifts, all pointing the same way. The why-now here is genuinely strong rather than manufactured.

---

## The capability gap

Precise boundary, each with the surface checked:

- **ML Kit GenAI** — has a 4-state `FeatureStatus` + byte-level `DownloadCallback`. **Missing:** offline-vs-ineligible split (one opaque `UNAVAILABLE`), a quota-exceeded state, an ETA/percentage contract, a delivery SLO ([get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)).
- **ML Kit classic (`RemoteModelManager`)** — boolean + `Task`. **Missing:** *everything* — no progress, no state machine, no eligibility/offline/quota semantics.
- **Google Play for On-device AI** — the richest states of anyone (`AiPackState`: PENDING/DOWNLOADING-with-bytes/TRANSFERRING/WAITING_FOR_WIFI/COMPLETED/FAILED, mirroring `AssetPackStatus`). **But wrong scope:** it delivers the *developer's own bundled* models only, not ML Kit's platform models or Nano, and answers "did my file download," not "can this platform model run here" ([Play on-device AI](https://developer.android.com/google/play/on-device-ai)).
- **Apple Foundation Models** — `SystemLanguageModel.availability` separates `deviceNotEligible` (permanent) / `appleIntelligenceNotEnabled` / `modelNotReady` (transient) — the very eligibility split ML Kit collapses. **But no progress** — `modelNotReady` is opaque; no observable DOWNLOADING you can drive a progress bar from ([Apple docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason/modelnotready)).
- **Qualcomm / Samsung / MediaTek / OSS** — provisioning and build-time tooling, or generic WorkManager plumbing. No app-observable, model-aware runtime delivery contract exists anywhere.

**Verdict on prior art: partially shipped in disjoint, mismatched pieces; the unified contract exists nowhere.** GenAI has states+progress but no offline/ineligible/quota split and no SLO; classic has neither; Play AI Delivery has the richest states but only for your own models; Apple has the eligibility split but no progress. The whitespace is the *unification + offline/quota semantics + SLO* layer.

**Main competitor a developer uses today:** their own WorkManager loop plus `isModelDownloaded()` polling — DIY plumbing, per app, that can't see eligibility or offline state.

---

## Proposed surface

A single availability/delivery contract spanning both classic and GenAI models. Sketch:

```kotlin
// One state type for every ML Kit model, classic or GenAI.
sealed interface ModelAvailability {
  object Available : ModelAvailability
  object Downloadable : ModelAvailability                       // eligible, not yet fetched
  data class Downloading(val bytesDownloaded: Long,
                         val totalBytes: Long,
                         val etaMillis: Long?) : ModelAvailability
  object UnavailableOffline : ModelAvailability                 // eligible, but needs network now
  data class UnavailableOnDevice(val reason: IneligibleReason)  // permanent — surface it, don't retry
      : ModelAvailability
  data class QuotaExceeded(val retryAfterMillis: Long) : ModelAvailability
}

val flow: Flow<ModelAvailability> = MlKitModels.availability(TranslateModel(source, target))
MlKitModels.requestDownload(model, DownloadConditions(requireWifi = true, requireCharging = false))
```

- **Inputs:** any ML Kit model handle (classic `RemoteModel` or a GenAI feature).
- **Outputs:** a `Flow`/observable state machine + a one-shot `requestDownload` with constraints; platform-owned retry/backoff.
- **The contract (the platform's commitment — this is the product):** eligibility is decidable *offline* (return `UnavailableOnDevice` without a network round-trip); `UnavailableOffline` and `UnavailableOnDevice` are never conflated; progress is monotonic with a defined ETA semantics; and a **delivery SLO** — a stated bound on when a `Downloadable` model becomes `Available` under given network conditions, versioned independently of the model.
- **Deliberately *not*:** it does not train, run, or evaluate models; it does not bundle them; it does not promise a model exists for a device it can't run on — it *names* that state honestly.
- **TTFHW target: <15 minutes.** Achievable because it rides existing `DownloadCallback`/`RemoteModelManager` and adds no APK weight and no permission. The one thing that must be true: the eligibility check resolves offline — if it needs a network call, the offline story collapses and that's a design finding, not a footnote.

---

## Reach & sizing

Show the arithmetic; inputs labeled by source.

- **Device reach (firm):** classic unbundled ML Kit runs at API ~26+ → **96.1%** of the fleet ([apilevels.com](https://apilevels.com/), third-party, Apr-2026 data); API 31+ = 78.8%. GenAI is gated to **~3.7%** of the ~3.8B base — *140M+ Nano devices (Google-published, [Android Developers Blog Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)) ÷ 3.8B actives (third-party estimate) = 3.7%, my arithmetic*; sensitivity 3.1–4.7% on the denominator.
- **Install-weighted surface (soft — `[unverified]`):** the idea inherits ML Kit's *existing* adoption base (better funnel math than a cold-start API — every app already pulling an on-demand model already needs this). But the load-bearing input, AppBrain's ML Kit %installs÷%apps multiplier, **did not render (egress-blocked)**. Parameterized: at 1–3% of apps × a 2–4× install-weight multiplier → **~2–9% of install-weighted Android surface** for the classic tier, with a thin (<~4%) fast-growing GenAI overlay. *Both the app-share and the multiplier are labeled assumptions, not a crawl.*
- **Sensitivity:** halve the softest assumption (the multiplier, 2–4× → 1–2×) → range collapses to **~1–4.5%**. The idea survives (still >0 and only-platform-can-do-it), but its *headline* appeal depends entirely on the unverified claim that big apps adopt ML Kit disproportionately. **This is the one experiment to run before a build commit:** open the AppBrain ML Kit tag page from an unproxied browser and read the real %installs.

Engineering-cost-avoided (the platform-test numerator) is real but modest per app (weeks, not months), so this passes the platform test mainly on **privilege and portfolio effect** — it de-risks adoption of every other ML Kit API — rather than on raw per-app savings.

---

## Adoption path

1. **The hook:** a translation or segmentation app replaces its hand-rolled `isModelDownloaded()` poll + WorkManager loop with a `Flow<ModelAvailability>` and a real progress bar in ~15 minutes.
2. **First real integration:** they ship the offline/ineligible distinction — the app now tells a user on a plane *why* the feature is waiting, instead of showing a dead button. That is a visible UX win they'll keep.
3. **The dependency:** once the app's UX branches on the typed states and the SLO, removing it means going back to polling-and-hoping — a regression they'd endorse not doing.

**First adopter:** an existing high-install ML Kit *translation* integrator (the surface with the loudest tracker complaints and the clearest offline story). Second wave: GenAI/Nano early adopters, who currently hand-roll the DEV.to detection pattern. The reference implementation is the seed.

---

## Execution plan

- **Developer preview:** ship the unified `ModelAvailability` over classic `RemoteModelManager` first (where the gap is total), with 2–3 translation partners. Question it answers: does the offline-resolvable eligibility check actually resolve offline on the real fleet?
- **Alpha/Beta:** add the GenAI mapping (fold the opaque `UNAVAILABLE` into offline/ineligible/quota). Graduation condition: the mandated availability check no longer throws (fixes [#1062](https://github.com/googlesamples/mlkit/issues/1062)) and progress is monotonic across the device matrix.
- **GA:** commit the state enum and the delivery SLO as a frozen, independently-versioned surface — timed to precede the **1 Aug 2027** DMA deadline so it *is* the compliance answer.

**Org dependency, named honestly:** the delivery mechanics are owned by **Play Services / AICore**, not the ML Kit API team. This ships only if that team exposes the state and signs the SLO. If they won't, this is a wish — so the preview's real purpose is partly to force that internal yes with partner evidence.

---

## The case against

The strongest argument against, argued at full strength: **the platform absorbs this itself, from the wrong side.** Google Play for On-device AI already has the richest delivery state machine in the ecosystem (`AiPackState`), and Firebase AI Logic already abstracts on-device/cloud routing. The tidy-looking outcome is that Play AI Delivery extends to cover ML Kit's *own* models and this idea evaporates as a duplicate — failure mode #2 on the rubric's list ("the platform absorbed the problem underneath you"), and here the absorbing platform is a sibling team. That is the live risk, above hardware or free-substitute risk (there is no free substitute — that's the whole privilege point).

The mitigation, made only after conceding the argument: Play AI Delivery is scoped to the *developer's own bundled assets* and is model-*unaware* — it answers "did my file arrive," not "can this platform model run for this user / is it eligible / is it quota-blocked." Extending it to platform models and eligibility semantics is *most* of this idea's work anyway; whoever does it is building this. So the real decision is **who owns it and whether it's unified**, not whether it gets built. That argues for the ML Kit team to define the *contract* now, even if Play owns the *transport* underneath — which is also the cleanest DMA-compliance story.

Second, weaker: durability. A delivery SLO you break is worse than none. Mitigated by versioning the SLO independently of the model and by the `AssetPackStatus` precedent that Google has held a delivery contract stable for years.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google Play for On-device AI announces (or ships) coverage of ML Kit's *own* platform models with eligibility semantics before this reaches GA — at that point this is a duplicate and the right move is to define the contract *on top of* Play's transport rather than as a new surface. Checkable against the [Play on-device AI release notes](https://developer.android.com/google/play/on-device-ai).

**Load-bearing assumption:** that eligibility ("can this device run this model") is decidable *offline*. If it requires a network round-trip to AICore/Play, the offline-vs-ineligible distinction — the core of the contract — can't be delivered, and the idea drops to a modest progress-bar improvement.

**Re-check trigger if shelved:** the DMA implementation drafts for Android 18 — if they specify an availability surface, this becomes urgent regardless of the sizing.

---

## Fit for this team

ML Kit specifically, because ML Kit *owns the developer-facing model surface* that every one of these complaints is filed against — the boolean and the opaque `UNAVAILABLE` are ML Kit's API contract, and nobody else can fix them. The *transport* is Play Services/AICore, so the honest arrangement is ML Kit defines the contract and Play owns delivery beneath it. It is **not** a Firebase AI Logic idea (that's cloud+on-device routing, a layer up) nor a LiteRT idea (bring-your-own-model, no managed delivery). The biggest internal risk is exactly that this lands in the wrong part of the stack and fragments the story further — which is why the unification across classic + GenAI is the point, not a nice-to-have.

---

## Open questions

- **The install-weighted number.** AppBrain didn't render; the ~2–9% surface is assumption-based. *Settled by:* reading ML Kit's %apps and %installs from the AppBrain ML Kit tag page in an unproxied browser.
- **Is eligibility offline-decidable on the real fleet?** *Settled by:* the developer-preview test on classic `RemoteModelManager` across a device matrix.
- **Are ML Kit GenAI and MediaPipe/Play-AI-Delivery converging or diverging organizationally?** No public roadmap statement exists; this determines whether the "case against" fires. *Settled by:* internal roadmap, not public sources.
- **Exact primary DMA text.** The EU developer-portal page was egress-blocked `[unverified via direct fetch]`; the dated press release and Case DMA.100220 corroborate every claim, but a live read of the specification would confirm whether an availability surface is named explicitly.

---

## Runners-up

- **On-device neural TTS API (Type A)** — genuine whitespace (Google has no neural TTS dev API; Picovoice charges, Apple shipped it), but **G1 Platform Privilege caps it**: OSS TTS (Piper, Kokoro) ships freely, so a 3-person team can approximate it. Lost to #1 on privilege.
- **On-device eval harness + token accounting (Type D)** — Apple shipped Evaluations + token counting; ML Kit prescribes a prompt-quality workflow and ships nothing to run it. Strong tell, feasibility trivial — lost to #1 only on demand-signal *strength* (no first-party tracker equivalent to #315). A close second and a strong future pick.
- **Reach/tiering across the sub-8GB fleet (Type F)** — the 3.7% problem; highest ceiling. Lost on **G2 Feasibility**: honest quality parity at each tier is unproven and the sizing depends on unpublished Android RAM distribution.
- **On-device user-content moderation classifier (Type G)** — real regulatory clock (US minors laws live Jan 2026; Play liability policy) and clear demand (Bumble open-sourced its classifier). Lost on the tunability risk — one-size safety policy is often unusable by a real T&S team — and a thinner why-now than #1's dated statute.
- **Constrained-decoding / grammar output (Type B)** — apps hand-roll validation-and-retry (30–50% constraint violations reported). Partly addressed by the July-2026 Structured Output alpha, so at risk of being already-shipping; dropped pending re-verification.

---

*Sources: [mlkit #315](https://github.com/googlesamples/mlkit/issues/315) · [#1062](https://github.com/googlesamples/mlkit/issues/1062) · [#165](https://github.com/googlesamples/mlkit/issues/165) · [#641](https://github.com/googlesamples/mlkit/issues/641) · [#829](https://github.com/googlesamples/mlkit/issues/829) · [#858](https://github.com/googlesamples/mlkit/issues/858) · [#954 (GenAI cluster)](https://github.com/googlesamples/mlkit/issues/954) · [#1070](https://github.com/googlesamples/mlkit/issues/1070) · [firebase-android-sdk #1656](https://github.com/firebase/firebase-android-sdk/issues/1656) · [ML Kit GenAI get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started) · [RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [Apple Foundation Models — modelNotReady](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason/modelnotready) · [EU DMA decision 2026-07-16](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) · [Gemini Nano 140M+ (Android Developers Blog)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · [apilevels.com](https://apilevels.com/) · [DEV.to feature-detection pattern](https://dev.to/yadnyesh_rana/gemini-nano-isnt-on-most-of-your-users-phones-heres-the-feature-detection-pattern-that-doesnt-58dl) · [Medium ML Kit progress](https://medium.com/@fixitblog/solved-how-to-show-progress-of-model-downloaded-from-ml-kit-7fdfc0aa71b0)*
