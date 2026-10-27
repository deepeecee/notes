# Model Delivery Contract — a single observable lifecycle for every ML Kit model, managed ones included

**Type:** E (Delivery & lifecycle) · **Verdict:** Build · **Opportunity: 7/10 (Strong — build the plumbing)**
*2026-10-27 · Prepared for Android ML Kit · Evidence current as of 2026-10-27*

> On a Tuesday a developer at a translation app ships a fix for a support ticket: "the app just spins forever for some users." The cause is that `RemoteModelManager.download()` was called on a device with no network, and it returns a `Task<Void>` that neither succeeds nor fails — it just never completes ([issue #168](https://github.com/googlesamples/mlkit/issues/168)). Their only tool is a boolean, `isModelDownloaded()`, so they write a poll-and-retry loop and "hope the Play Services eventually downloads it" ([#315](https://github.com/googlesamples/mlkit/issues/315)). Six years of the same complaint sit in ML Kit's tracker. Google already ships two rich, observable download state machines — they just don't point at its own models.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong | composite 4.15 × 2 = 8.3, −1 for Durability gate at exactly 3; no +1 (S1 is 4, not 5) → ~7 |
| Platform privilege (gate) | 5/5 — pass | Only Play Services / the system owns the managed-model delivery channel; no Gradle dependency can observe it ([Play on-device AI](https://developer.android.com/google/play/on-device-ai)) |
| Feasibility headroom (gate) | 5/5 — pass | No model to train; the building blocks already ship internally (GenAI `FeatureStatus`, `DownloadCallback`, AICore `onDownloadDidNotStart`, Play `AiPackState`) |
| Durability (gate) | 3/5 — pass (risk) | A delivery SLA you break is worse than none; ownership spans ML Kit **and** the Play delivery team |
| Demand evidence (25%) | 4/5 | Dated 2020→2026 tracker thread: feature request [#315](https://github.com/googlesamples/mlkit/issues/315), progress gap [#165](https://github.com/googlesamples/mlkit/issues/165)/[#773](https://github.com/googlesamples/mlkit/issues/773), offline/reliability [#168](https://github.com/googlesamples/mlkit/issues/168)/[#740](https://github.com/googlesamples/mlkit/issues/740), GenAI-era [#1080](https://github.com/googlesamples/mlkit/issues/1080) |
| Install-weighted reach (15%) | 3/5 | Classic-model observability ≈ whole Play base; ML Kit install-share est. 8–25% (reconstructed, low confidence); GenAI path only ~3.7% of devices |
| Build-vs-buy-vs-borrow (20%) | 5/5 | The developer **cannot** build it — they don't own the channel; the borrow path (hand-rolled polling) is what the evidence shows failing |
| Integration cost / TTFHW (15%) | 4/5 | Additive callbacks on APIs already integrated; a listener, not an architecture change |
| Substitute half-life (15%) | 4/5 | A general on-device model cannot supply a delivery SLA; only Google's own roadmap can absorb it |
| Strategic complement (10%) | 5/5 | Plumbing under every ML Kit/GenAI API; Android-specific; the clean DMA-compliance artifact |
| **Composite** | **4.15** | Build band (≥4.0) |

*Least trustworthy row: install-weighted reach. The sizing research could not load live AppBrain pages, so ML Kit's install-share (8–25%) is reconstructed from TensorFlow Lite's AppBrain ratio (1.08% apps / 10.41% installs) and a 42matters category skew — an inference, not a retrieved figure.*

---

## The problem

Every ML Kit model that isn't bundled into the APK is delivered to the device by a channel the app does not own and cannot see into. For the classic unbundled models — Translation language packs, Entity Extraction, Digital Ink, Face Mesh, custom/Firebase-hosted labelers — delivery is handled by Google Play services. For the GenAI APIs it's AICore pulling Gemini Nano. In both cases the app's job is to *use* a model it did not download, on a schedule it did not set, with no contract about when the model will be there.

The job-to-be-done is unglamorous and universal: **"Before I show my user a feature, tell me whether the model behind it is ready — and if it isn't, tell me why, how far along it is, and whether waiting will ever help."** The customer is an Android engineer under a deadline whose competing solution is their own retry loop. What they do instead today, verbatim from the maintainer-confirmed workaround, is "keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline this won't happen at all and we have no indicator about that" ([#315](https://github.com/googlesamples/mlkit/issues/315)).

This is structural, not a bug. A 100M+ install app can't bundle every model — Google Play's own figure is that each 6 MB of APK growth costs about 1% of install conversion, and a Translation deployment with dozens of language packs would be enormous. So the app is forced onto the dynamic-delivery path, where the delivery is owned by the platform precisely because the platform can share one model across apps and update it over the air. The moment delivery is platform-owned, the app loses observability — and gets, in exchange, a boolean and an exception. The trade is real and the observability half was never built.

The classic-path surface confirms the gap. `RemoteModelManager` exposes exactly `isModelDownloaded()` (a point-in-time `Task<Boolean>`), `download()` (a fire-and-forget `Task<Void>` whose only failure signal is an exception), `deleteDownloadedModel()`, and `getDownloadedModels()` — verified against the live reference, 2026-10-27 ([RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)). There is no progress callback, no distinct downloading-vs-pending-vs-failed state, no "the device is offline so this will never complete" signal, and no installed-version readout. The iOS equivalent, `MLKModelManager`, actually returns an `NSProgress` and fires distinct success/failure notifications — so Android is *behind Google's own iOS surface* here.

---

## Proof & signals

The ML Kit GitHub tracker carries a single, dated, six-year complaint. It is a small-volume tracker, so weight the *consistency* rather than the raw count.

- **The explicit feature request.** [#315, "On-Device Model Download API"](https://github.com/googlesamples/mlkit/issues/315) (filed 2021-06-21, closed 2022-08-31 pointing to `ModuleInstallClient` — which only covers detectors like BarcodeScanner, not a general contract). Follow-ups: *"can you give us an update. It's been over six months."* The ask is the exact proposal here.
- **Progress reporting conceded missing by a maintainer.** [#165](https://github.com/googlesamples/mlkit/issues/165) (2020): *"At this moment, the download API doesn't report the exact downloading progress… If we see more interests in it, we would consider adding such a support."* Re-opened in spirit by [#773](https://github.com/googlesamples/mlkit/issues/773) (**open**, 2024), where Translation's `fractionCompleted` fires once at `1.0` instead of incrementally — the progress signal that nominally exists is non-functional.
- **Offline / silent-failure, still live.** [#168](https://github.com/googlesamples/mlkit/issues/168) (offline `download()` never returns) and [#740](https://github.com/googlesamples/mlkit/issues/740) (**open**, 2023→2025; *"currently there is no solution"*). The error string itself prescribes the workaround: "call `downloadModelIfNeeded` and if that fails, delete the models and retry."
- **The pain has followed GenAI onto new silicon.** [#1080](https://github.com/googlesamples/mlkit/issues/1080) (**open**, filed 2026-10-12, verified today): the Prompt API gets *"permanently stuck in a `Downloading` state on Pixel 10"*, *"The download state is never correctly reflected by `model.checkStatus()`,"* and *"Is there any way caller can know the 'not enough space' exception in this case?"* [#1063](https://github.com/googlesamples/mlkit/issues/1063) (**open**, 2026-07-21) is an opaque GenAI download failure — *"failed with failure status 0 and error dpf."*
- **A production team walked away and hand-rolled delivery.** Back Market's engineering blog describes abandoning ML Kit's Play-Services-managed delivery as unreliable on some Samsung devices and building its own on-demand fetch with Play Asset Delivery ([Back Market engineering](https://engineering.backmarket.com/on-device-object-detection-on-android-choosing-between-ml-kit-and-yolo-22dc8ede0b12)). Wrapper plugins (Capacitor ML Kit barcode) bolt on their own module-install progress listener — the ecosystem is building the missing API itself.
- **Google's own docs sanction the workaround.** The `MlKitException` reference calls `UNAVAILABLE` "a transient condition that may be corrected by retrying with a backoff" — i.e. poll, don't observe.

**The absence signal that matters:** no commercial vendor sells "delivery observability," and Hacker News discussion is about model *access and licensing*, not readiness. That is expected — this is plumbing, not a sellable capability — but it means the single strongest demand signal (willingness to pay) is structurally unavailable here, which is why S1 is a 4 and not a 5. Reddit and Stack Overflow vote counts could not be retrieved (both blocked to the fetch agent), so the quantified demand here is a floor.

---

## Why now

1. **Capability shift (2025–2026).** The GenAI APIs made Google build the thing it never built for the classic path: `FeatureStatus` (`UNAVAILABLE`/`DOWNLOADABLE`/`DOWNLOADING`/`AVAILABLE`) and a byte-level `DownloadCallback` (`onDownloadStarted`/`onDownloadProgress`/`onDownloadFailed`/`onDownloadCompleted`), with AICore adding `onDownloadDidNotStart` and `onDownloadPending` ([AICore DownloadCallback](https://developer.android.com/ai/reference/com/google/ai/edge/aicore/DownloadCallback)). The vocabulary for a proper contract now exists inside the house — it's just fragmented across three surfaces and reported broken on the newest one ([#1080](https://github.com/googlesamples/mlkit/issues/1080)).
2. **Competitive/regulatory shift (16 July 2026).** The European Commission's DMA Article 6(7) decision (proceedings DMA.100220) requires Alphabet to give third-party AI services "equal access… in terms of performance" to on-device models "including the Gemini Nano ODMs," implemented in Android 18 by ~1 August 2027 ([EC businesses portal](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). Effective performance parity is impossible if Google's own services know when the model is present/downloading/failed and third parties get a boolean. The regulation forces the plumbing but does not specify the developer-facing contract.
3. **Demand shift (2026).** [#1080](https://github.com/googlesamples/mlkit/issues/1080) proves the problem followed GenAI onto flagship devices this month — the newest, highest-investment surface reproduces the oldest complaint.

This is a rare case where all three legs carry a date, and the why-now is strong rather than "correct but not urgent."

---

## The capability gap

Be exact about the boundary, because a reviewer will attack a sloppy "nobody has this."

- **ML Kit classic path:** `RemoteModelManager` — boolean + fire-and-forget Task only. No progress, states, offline signal, or version. ([ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager), 2026-10-27)
- **ML Kit GenAI path:** `FeatureStatus` 4-state enum + `DownloadCallback` byte progress — *exists*, but reported not reflecting reality ([#1080](https://github.com/googlesamples/mlkit/issues/1080)) and distinct from the classic vocabulary.
- **Google Play for On-device AI:** `AiPackState` with `status()`, `bytesDownloaded()`, `transferProgressPercentage()`, `errorCode()`, a state-update listener, and states down to `WAITING_FOR_WIFI` — a *full* observable contract ([Play on-device AI](https://developer.android.com/google/play/on-device-ai)). **Scoped to the developer's own models only:** "AI packs only contain models… shouldn't be offered to other apps." `SplitInstallManager` offers the same for dynamic feature modules.
- **Apple Foundation Models:** `SystemLanguageModel.availability` → `.available` / `.unavailable(deviceNotEligible | appleIntelligenceNotEnabled | modelNotReady)` ([ref](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)). Distinguishes "never eligible" from "not ready," but collapses downloading into one opaque `modelNotReady` — no progress, no ETA, no SLA. Apple's rich delivery observability (Background Assets `statusUpdates`: `began`/`downloading(progress)`/`finished`/`failed`) is, exactly like Google's, scoped to the *developer's* assets, not its own system model.

**The main competitor is the developer's own retry loop** — not another SDK. The precise, non-obvious finding: *Google already ships two mature observable delivery state machines and Apple ships a third; all three point at the developer's own payload, and none exists for the platform's own managed model.* The managed-model case is first-to-market whitespace across every vendor.

---

## Proposed surface

A single `ModelDelivery` contract that works identically for a classic unbundled model and a GenAI model — one vocabulary, one listener, one availability query. Sketch:

```kotlin
val delivery = ModelDelivery.getInstance()

// One query, same shape for Translation packs and Gemini Nano
when (val s = delivery.availability(model)) {
    is Available       -> startFeature()
    is Downloading     -> showProgress(s.bytesDownloaded, s.totalBytes) // real bytes
    is Downloadable     -> offerDownload(s.estimatedBytes, s.requiresWifi)
    is Blocked         -> explain(s.reason)   // OFFLINE, INSUFFICIENT_STORAGE,
                                               // QUOTA_EXCEEDED, DEVICE_INELIGIBLE,
                                               // BOOTLOADER_UNLOCKED
    is Failed          -> retryOrFallback(s.errorCode, s.retryable)
}

delivery.observe(model) { state -> /* same sealed type, pushed */ }
val version = delivery.installedVersion(model)   // was entirely absent
```

Three deliberate exclusions, because an API that promises everything ships nothing: it does **not** host the developer's own models (Play for On-device AI already owns that), does **not** let apps change delivery policy beyond the existing wifi/charging conditions, and does **not** guarantee a model will *ever* arrive on an ineligible device — it guarantees you'll be *told* it won't. The one hard new signal versus today is `Blocked(OFFLINE)` and `Blocked(INSUFFICIENT_STORAGE)` — the two states [#168](https://github.com/googlesamples/mlkit/issues/168) and [#1080](https://github.com/googlesamples/mlkit/issues/1080) prove are missing.

**Time-to-first-hello-world target: under 15 minutes for an existing ML Kit integrator** — it's a listener added to code they already have, not a new dependency graph. The constraint that must hold to hit it: the unified type must wrap, not replace, `RemoteModelManager` and the GenAI `DownloadCallback`, so adoption is additive. If a developer has to migrate off `RemoteModelManager`, the 15-minute target breaks and that's a finding about the design, not a footnote.

---

## Reach & sizing

Arithmetic is mine; inputs sourced and confidence-flagged. The two paths size very differently and must be reported separately.

- `A_adopt` — ML Kit install-share: **8–25% of app-installs** (reconstructed estimate — TensorFlow Lite's AppBrain ratio 1.08% apps / 10.41% installs implies ~9.6× install-weighting for ML SDKs; ML Kit is "extremely popular" per [42matters](https://42matters.com/sdks/android/mlkit); the live AppBrain ML Kit row did not render, so this is inference, not a retrieved figure).
- `f_ondemand` — fraction of adopters using a downloaded (not bundled) model: **0.4–0.7** (judgment; barcode often bundles, Translation/Entity/Digital-Ink/custom/GenAI download).
- `r_reach` — device eligibility: **~100%** of the Play-services base for classic models; **~3.7%** (~140M devices, Google Apr-2026 figure against a ~3.8B third-party active base — my arithmetic) for GenAI.

**(a) Classic-model delivery observability** = 8–25% × 0.4–0.7 ≈ **3–18% of Android app-installs** (central ~8%), device-unconstrained. Adoption, not hardware, is the binding limit.
**(b) GenAI-model delivery observability** ≈ device ceiling **3.7%** × a small near-term GenAI app penetration → **~0.1–1.5% of installs** today, absolute ceiling 3.7%.

**Engineering cost avoided** is modest per app (delivery observability is hours-to-days, not engineer-months — [#315](https://github.com/googlesamples/mlkit/issues/315), Back Market), but it is *recurring and portfolio-wide*: every adopter of every unbundled ML Kit API pays it today, repeatedly, and it drives support tickets and churn. The platform test passes less on raw hours saved than on **S6** — observability is the plumbing that unblocks adoption of the whole on-device portfolio.

**Sensitivity:** halve both soft assumptions (`A_adopt`→4–12%, `f_ondemand`→0.2–0.35) and classic reach is still ~1–4% of installs — meaningful for platform plumbing. The verdict survives; the opportunity *size* does not survive as "huge," which is why reach scores 3.

---

## Adoption path

1. **The hook:** an existing Translation or Digital-Ink integrator replaces their poll-and-retry loop with `delivery.observe(model)` and finally renders a real progress bar and an offline message — the exact asks in [#165](https://github.com/googlesamples/mlkit/issues/165)/[#773](https://github.com/googlesamples/mlkit/issues/773)/[#168](https://github.com/googlesamples/mlkit/issues/168). Fifteen minutes, no new dependency.
2. **First real integration:** the app gates its feature UI on `availability()` and ships a proper "model downloading / unavailable offline" state instead of a spinner that can hang forever.
3. **The dependency:** once the app's UX distinguishes `Blocked(OFFLINE)` from `Downloading` from `Failed`, removing the contract means regressing to the hang — a lock-in developers *endorse* because it fixed real tickets.

**First adopters:** existing high-volume unbundled-model users — translation, scanning, and accessibility apps (Envision already ships ML Kit summarization for low-vision users). The second wave is the GenAI cohort, unlocked when the contract makes [#1080](https://github.com/googlesamples/mlkit/issues/1080)-class failures observable on flagships.

---

## Execution plan

- **Developer preview:** ship the unified `availability()` + `observe()` over the *classic* `RemoteModelManager` path first (the clearest gap, the widest reach, no silicon dependency). Question it answers: do existing integrators replace their retry loops? Partners: a translation app and an accessibility app from the tracker threads.
- **Alpha/Beta:** add the GenAI/AICore path and the `Blocked(INSUFFICIENT_STORAGE | OFFLINE | QUOTA_EXCEEDED)` reasons. Graduation condition: `checkStatus()`/`FeatureStatus` reflects reality on a device-matrix test that reproduces [#1080](https://github.com/googlesamples/mlkit/issues/1080) and shows it fixed.
- **GA:** freeze the sealed state vocabulary, version the *contract* independently of the model, and publish the one thing no path has today — an availability commitment an app can design against.

**Org dependency, stated honestly:** the delivery channel is physically owned by Google Play services and the Play for On-device AI team, not ML Kit. ML Kit owns the *developer-facing front door* to both model families, which is why the contract belongs there — but it cannot ship the underlying signals without the Play delivery team exposing them. If that team says no, this reduces to a nicer wrapper over `RemoteModelManager`'s existing boolean, which is not the product. That dependency is the single biggest execution risk.

---

## The case against

The strongest argument against is **adoption-failure-mode #2: the platform absorbs the problem underneath you** — and here the absorber is *regulation plus Google's own roadmap*, not a rival. The DMA decision compels Google to expose equal-performance access to on-device models by Android 18 (~1 Aug 2027). If the compliance implementation ships a delivery/availability signal for Gemini Nano anyway, a separately-designed ML Kit contract risks being a redundant second surface. Play for On-device AI's `AiPackState` already proves Google can build this and could extend it to cover managed models directly, cutting ML Kit out.

The honest rebuttal is that both forces produce *plumbing*, not a *developer contract*: the DMA says "equivalent performance," not "here is a sealed Kotlin state machine for app PMs," and `AiPackState` is explicitly scoped away from managed models. A clean, unified, ML-Kit-level contract is the artifact that discharges the regulation well rather than grudgingly — and Google has publicly objected that the DMA measures "undermine Android's foundational security model," signalling a minimal implementation unless someone owns the good version. So absorption is the live risk *and* the reason to move now; the way to lose is to let the compliance team ship a boolean and call it done.

A weaker second objection — "this is just a bug, fix #773 and move on" — is answered by the six-year, multi-API, multi-team spread of the complaint: a one-line progress fix on Translation doesn't give the classic path states, doesn't unify with GenAI, and doesn't add the offline/storage signals. The gap is in the API contract, not one implementation.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if, before GA, the Android 18 DMA interoperability implementation (or an ML Kit release) ships a unified, observable delivery-and-availability state machine covering ML Kit's *own managed* models — classic **and** Gemini Nano — with real progress, distinct `offline`/`insufficient-storage`/`failed` states, and a published availability commitment. Checkable test: watch the [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) and the Android 18 DMA spec through 1 Aug 2027. If that surface appears, the idea is absorbed; shelve it.

**Load-bearing assumption:** the managed-model delivery channel stays Google-owned and opaque — i.e. the gap is structural in the API contract, not an incidental bug a point-fix closes.

**Re-check trigger if shelved:** a new wave of GenAI-delivery tracker issues after Android 18 ships, indicating the compliance plumbing left the developer contract unbuilt.

---

## Fit for this team

ML Kit is the sanctioned front door to both model families — the classic unbundled models and, via the GenAI APIs, AICore/Nano — so a *developer-facing* contract belongs here rather than in MediaPipe or LiteRT (which bundle, and so don't have this problem). The genuine tension is with the **Play for On-device AI / Play services** team, which owns delivery itself and already ships `AiPackState`. The cleanest division is: Play owns the delivery *mechanism and signals*; ML Kit owns the *unified, model-agnostic contract* the app programs against. If the organization decides managed-model delivery observability should live entirely in Play, that is a defensible and more-valuable conclusion than ML Kit claiming territory it can't ship alone — and it should be said out loud rather than fudged.

---

## Open questions

- **ML Kit's true install-share.** The sizing rests on a reconstructed 8–25%; the live AppBrain ML Kit and Firebase-ML rows would tighten every reach number. *Settled by:* loading those two pages in a browser.
- **Is [#1080](https://github.com/googlesamples/mlkit/issues/1080) a `checkStatus()` contract gap or an AICore delivery bug?** If the GenAI state machine is sound and only the Pixel 10 build is broken, the GenAI half of the proposal shrinks to "fix the bug." *Settled by:* reproducing on a second Nano device and reading AICore's state transitions.
- **What exactly will the Android 18 DMA implementation expose?** The decision text would not fetch (EU domains failed DNS through the proxy); dates are from secondary coverage. *Settled by:* the primary spec on the EC developer portal.
- **Does the Play delivery team's roadmap already include managed-model observability?** Internal-only. Determines whether this is ML Kit's to build.

---

## Runners-up

- **On-device eval / quality-regression harness + token accounting (Type D)** — whitespace #9; Apple shipped an Evaluations framework and ML Kit prescribes-a-workflow-but-ships-nothing. Lost on **gate G1**: a third party can build an eval harness, so privilege is weaker than the delivery contract's.
- **On-device user-content moderation classifier (Type G)** — strong regulatory clock (minors law live Jan 2026; DMA Aug 2027) and willingness-to-pay (Bumble open-sourced one). Lost on the "one-size classifier is unusable to a real T&S team" risk, which needs tunability work the delivery idea doesn't.
- **Sub-8GB GenAI reach tier (Type F)** — addresses the defining 26× coverage gap. Lost on **gate G2 (feasibility)**: small-model quality at sub-8GB for user-facing GenAI likely sits below the embarrassment threshold; honest shelve-or-reframe.
- **On-device neural TTS (Type A)** — genuine whitespace (Picovoice Orca sells it; Apple ships speech generation; Google has nothing). Lost on **gate G1**: open TTS models exist, so a 3-person team could ship a plausible Gradle dependency — privilege is contestable.
- **Deferred/opportunistic inference scheduling (Type E)** — P15; no vendor offers it. Lost on demand evidence: real but far thinner and less dated than the delivery-observability tracker thread.

---

*Sources: [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [AICore DownloadCallback](https://developer.android.com/ai/reference/com/google/ai/edge/aicore/DownloadCallback) · [Google Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [EC DMA Alphabet AI-interoperability specification](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [Back Market engineering: ML Kit vs YOLO](https://engineering.backmarket.com/on-device-object-detection-on-android-choosing-between-ml-kit-and-yolo-22dc8ede0b12) · [42matters ML Kit SDK](https://42matters.com/sdks/android/mlkit) · googlesamples/mlkit issues [#315](https://github.com/googlesamples/mlkit/issues/315), [#165](https://github.com/googlesamples/mlkit/issues/165), [#168](https://github.com/googlesamples/mlkit/issues/168), [#740](https://github.com/googlesamples/mlkit/issues/740), [#773](https://github.com/googlesamples/mlkit/issues/773), [#1063](https://github.com/googlesamples/mlkit/issues/1063), [#1080](https://github.com/googlesamples/mlkit/issues/1080)*
