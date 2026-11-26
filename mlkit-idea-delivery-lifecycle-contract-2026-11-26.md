# Model Delivery & Lifecycle Contract — one honest answer to "is this model actually ready?"

**Type:** E — Delivery & lifecycle · **Verdict:** Prototype (developer preview) · **Opportunity: 6/10 (load-bearing, unglamorous)**
*2026-11-26 · Prepared for Android ML Kit · Evidence current as of 2026-11-26*

> Badges: *Nobody else has it* · *Regulatory clock (DMA, Aug 2027)* · *Invisible in a demo* · *The "fix" already lies*

> On a Tuesday, an Android engineer ships a translation feature behind ML Kit. It works on their Pixel. A week later the crash-free rate dips in India: `MlKitException.UNAVAILABLE`, users offline, the model never downloads, and the app has no signal to show anything but a spinner that spins forever. They wrap the analyzer in a retry loop and "hope Play Services eventually downloads the model" — their words, filed on the issue tracker. In 2026 the same engineer moves to Gemini Nano, calls the new `checkStatus()` Google shipped to fix exactly this, gets back `AVAILABLE` — and every inference fails `COMPUTE_ERROR`. The readiness signal passed while the model could not run. There is no unified, trustworthy answer on Android to "is this model actually ready?" Across five years and every ML Kit feature, developers keep hand-rolling one.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — load-bearing, unglamorous | composite 3.65 × 2 = 7.3, −1 for G3 at exactly 3 → ~6.3, rounded to 6; no +1 because S1 is 4 not 5 |
| Platform privilege (gate) | 5/5 — pass | Model delivery is owned by Play Services / AICore; only the platform can expose the OS-managed model or sign a delivery SLO. [DMA decision](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) *forces* Google to expose on-device models to third parties. |
| Feasibility headroom (gate) | 5/5 — pass | Thin API over state the SDK already holds: [`RemoteModelManager` + `DownloadConditions`](https://developers.google.com/android/reference/com/google/mlkit/common/model/DownloadConditions), `isModelDownloaded()`, and the GenAI `FeatureStatus` enum. No new model, no compute budget. |
| Durability (gate) | 3/5 — pass, weakest gate | Committed owner, but output stability across model refreshes is unaddressed today — [issue #1061](https://github.com/googlesamples/mlkit/issues/1061) shows a beta bump silently changing the requested model feature. A lifecycle contract you break is worse than none. |
| Demand evidence (25%) | 4/5 | Convergent, first-party, dated, quoted across 2021→Nov 2026 and every feature; 3+ OSS wrappers re-implement it. Docked one: no commercial vendor charges for it, and SO/Reddit/HN corroboration was unreachable this run. |
| Install-weighted reach (15%) | 3/5 | Classic ML Kit delivery rides ~99% of devices (API 26+); idea-specific install-weighted reach ~1–4.4% of installs (~30–130M device-installs). Modest in raw app count (~0.9–1.5% of apps). |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The common case ("is it downloaded?") is borrowable in days — `isModelDownloaded()` polling, `ModuleInstallClient`, OSS wrappers. Only the platform-only residual (truthful readiness, version-pinning the OS model) is un-borrowable. |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line over existing state, no key, no new permission, works without a flagship. The versioning/SLO concepts add some conceptual load. |
| Substitute half-life (15%) | 4/5 | Delivery is infrastructure a bigger general model can't absorb as a prompt; the DMA mandate *extends* relevance. Main redundancy risk is Google's own roadmap shipping it. |
| Strategic complement (10%) | 4/5 | Reliable delivery de-risks on-device adoption, pulling volume off the cloud-API default (88.6% of LLM apps use cloud) and strengthening Nano/Android gravity. |
| **Composite** | **3.65** | Weighted mean of S1–S6. |

*Least trustworthy line: install-weighted reach (S2). ML Kit's own AppBrain %apps/%installs could not be retrieved this run (host unreachable), so the denominator is proxied from TensorFlow Lite and the arithmetic is mine.*

---

## The problem

The job, stated as a developer's job under a deadline: *"Before I show this AI feature in my UI, tell me truthfully whether the model behind it is present, downloading, broken, or out of reach — and don't change its behavior under me on the next release."* The customer is an Android engineer, not an ML engineer; the competing solution is their own retry loop.

This is structurally produced, not an accident of current tooling. A 100M+ install Android app cannot bundle large models without paying an install-conversion tax (Google Play's own figure: ~1% of installs per 6 MB), so models are delivered on demand. On-demand delivery across a fleet of ~3.8B devices spanning six-year-old SoCs, with [more than half of Indian and Indonesian users having no wifi](https://developers.google.com/ml-kit) (Google Play's figure), means the download is the single most failure-prone step in the whole feature — and it happens in production, on devices the developer never tested. The app's org is server-side; its Android engineers inherit a delivery problem their ML colleagues never see.

What they do *instead* today is the tell. For classic unbundled models they poll `isModelDownloaded()`, catch `UNAVAILABLE`, and retry; for GenAI they call `checkFeatureStatus()` and branch. Both are per-API, per-model, and — critically — neither answers "is it actually *ready to run*," only "did Google say it's there." The gap between those two questions is where the feature ships broken.

This is a platform problem, not an app problem, by the atlas test: every app solves it identically and badly. It is not their differentiation; it is undifferentiated infrastructure they are each forced to rebuild.

---

## Proof & signals

The GitHub signal is first-party, directly fetched, dated, and quoted. It stands on its own; treat it as the load-bearing evidence.

- **The canonical request, open-then-closed-unresolved.** [Issue #315, "On-Device Model Download API"](https://github.com/googlesamples/mlkit/issues/315) (opened Jun 2021, 👍3): *"There is still no way to get availability and download status of the unbundled standard ML Kit models… we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* Google's reply: "planned but not scheduled." Closed in 2022 with "use `ModuleInstallClient`" — a redirect, not a contract. [Confirmed, direct fetch.]

- **Still live in 2025.** [Issue #978](https://github.com/googlesamples/mlkit/issues/978) (open, Sep 2025, 👍3): Entity Extraction's dynamic model download *"often fails or timeout, making the feature unusable in production apps"* for users in mainland China; *"Without a successful download, the Entity Extraction API cannot run at all."* No maintainer reply. [Confirmed.]

- **The "fix" itself now lies — the sharpest signal.** The per-API `checkStatus()`/`checkFeatureStatus()` Google shipped is generating a fresh 2026 wave: [#1062](https://github.com/googlesamples/mlkit/issues/1062) (open Jul 2026) — it throws `606 FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`, so *"it never reaches the UNAVAILABLE branch on any device where the feature is not provisioned,"* despite docs telling you to call it first before showing UI. [#1078](https://github.com/googlesamples/mlkit/issues/1078) (open Oct 2026, "Experiencing the same issue on my pixel 10," Nov 7 2026) — Nano reports `AVAILABLE`, download "reports completion, yet the session still fails" with a missing `config.binarypb`. A readiness signal that passes while the model cannot run is worse than no signal. [Confirmed.]

- **Silent-drift on version change.** [#1061](https://github.com/googlesamples/mlkit/issues/1061) (open Jul 2026): a Prompt API `beta3` bump silently changed the default AICore feature `636→648` — the SDK changed which model it asked for, under the developer, with no contract. This is the output-stability gap made concrete.

- **Developers doing it by hand, per framework.** Independent OSS wrappers each re-implement the same detect→download→wait block because the base SDK forces it: Flutter [`google_mlkit_translation`](https://pub.dev/packages/google_mlkit_translation) (exposes `isModelDownloaded`/`downloadModel`), `react-native-mlkit-translate-text` (readme: *"always check model firstly; Do not translate text if the model is not downloaded"*), its successor `fast-mlkit-translate-text` (adds `isLanguageDownloaded()`), and `KmpMLKit`. The capability-detection boilerplate is an API that doesn't exist yet.

- **Someone wrote the whole lifecycle by hand.** An independent engineering blog, ["Android On-device AI Model Delivery and Version Management"](https://xckevin.github.io), builds App Bundle asset packs + incremental updates + **rollback**, gates downloads to Wi-Fi+charging+screen-off, and concludes *"the stability problem is handled by version management, not by the download itself."* That is the proposed product, hand-built because the platform doesn't offer it.

- **The absence signal.** No commercial vendor sells an "ML Kit model delivery manager," and Stack Overflow / Reddit / HN corroboration could not be retrieved this run (hosts walled off — see caveat). I read that as: the pain is real and recurring but low-prestige plumbing, so it's solved privately and quietly rather than sold. That caps demand strength at 4/5, not 5.

Every item above is a Google-owned issue tracker or a public package except the two marked. The strongest corroboration channels being unreachable is a genuine limitation, stated here rather than smoothed over.

---

## Why now

1. **Capability shift.** The on-device surface doubled in failure modes in 2026: Gemini Nano 4 (Gemma-4-based) began rolling out on next-gen flagships in [late 2026](https://developer.android.com/blog/posts/announcing-gemma-4-in-the-ai-core-developer-preview), adding a *second* delivery regime (AICore-managed, quota-gated, version-shifting) on top of the classic `RemoteModelManager` one. Two delivery systems, zero unified contract — the fragmentation the idea resolves is newly acute.

2. **Regulatory shift, dated.** The European Commission's [16 Jul 2026 DMA Article 6(7) decision](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) orders Alphabet to let third-party AI services **call Google's on-device AI models that are part of the designated OS**, on parity terms, free of charge — implemented in **Android 18 by 1 August 2027**. Google [appealed on 29 Sep 2026](https://www.irishtimes.com) (Irish Times), but the decision is final and in force; an appeal does not suspend it. You cannot prove "equivalent, free access to a model" without a surface that exposes and signals that model's availability. The statute forces the primitives; this product generalizes them. *(Caveat: the exact "equivalent performance" wording and the on-device-model clause are paraphrased from search snippets, not a verbatim read of the decision — the EC host was unreachable this run.)*

3. **Demand shift.** On-device AI crossed from demo to production in 2026, and the 2026 issue cluster (#1062, #1078, #1080, #1063) is the sound of real apps hitting delivery failures at scale for the first time. The pain was theoretical in 2021; it's a crash stat in 2026.

A three-part why-now that holds — stronger than the usual Type E idea, specifically because of the DMA clock.

---

## The capability gap

What exists, with the boundary stated precisely:

- **ML Kit (classic):** [`RemoteModelManager`](https://developers.google.com/android/reference/com/google/mlkit/common/model/DownloadConditions) + `DownloadConditions` + `isModelDownloaded()` — per-model, boolean, no progress, no readiness verification. [Release notes](https://developers.google.com/ml-kit/release-notes) through mid-2026 show no unified availability API. *(Caveat: `developers.google.com` did not render directly this run; freshness rests on search snippets + `developer.android.com` mirrors.)*
- **ML Kit (GenAI):** per-API `FeatureStatus {AVAILABLE, DOWNLOADABLE, DOWNLOADING, UNAVAILABLE}` + `DownloadCallback` in `com.google.mlkit.genai.common`. Each feature checks itself; no cross-feature service, no SLO, no version pinning — and, per #1062/#1078, the status is not reliable.
- **Firebase AI Logic Hybrid API:** a routing abstraction (`PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, …) that falls back to **cloud**, not to a smaller on-device model, and exposes no download state machine or stability contract. [developer.android.com/ai/hybrid]
- **Play Feature Delivery / `SplitInstallManager`:** a real state machine (`PENDING/DOWNLOADING/INSTALLED/FAILED`) — but for **app code modules, not ML models**.
- **Apple Foundation Models (the benchmark):** a single `SystemLanguageModel.availability` enum (`.available` / `.unavailable(.deviceNotEligible | .appleIntelligenceNotEnabled | .modelNotReady)`) — unified across features, which Android is not, but still **availability-only**: no progress %, no download trigger, no published version/stability contract.
- **Qualcomm GenieX / AI Hub, Samsung:** developer bundles the model; no runtime delivery/lifecycle contract for third parties.

**The precise gap:** a *unified, cross-feature, observable* delivery/lifecycle contract — download state machine with progress, a **truthful readiness probe**, a delivery SLO, and version-pinning / output-stability across refreshes — is unclaimed on Android, and only half-claimed by Apple (availability, no lifecycle).

**Main competitor:** the developer's own retry loop, plus `ModuleInstallClient` polling and per-framework OSS wrappers. Not another platform — their own code.

---

## Proposed surface

A single `ModelDeliveryClient` spanning classic and GenAI models, returning an observable state rather than a boolean:

```kotlin
sealed interface ModelState {
  data class Ready(val version: ModelVersion) : ModelState           // verified runnable, not just "present"
  data class Downloadable(val sizeBytes: Long) : ModelState
  data class Downloading(val progress: Float, val etaMillis: Long?) : ModelState
  data class Unavailable(val reason: Reason) : ModelState             // DeviceIneligible, Offline, StorageLow,
}                                                                     // QuotaExceeded, Provisioning, ModelBroken

val delivery = ModelDeliveryClient.of(context)
delivery.state(Feature.TRANSLATION).collect { render(it) }           // observe, drive UI off real state
delivery.request(Feature.TRANSLATION, DownloadConditions.wifiCharging())
delivery.pin(Feature.PROMPT, track = Stable)                         // behavior won't shift on refresh
```

Three things no wrapper can borrow, and the whole justification for the API:

1. **A truthful readiness probe.** `Ready` means a trivial inference succeeded, not that `checkStatus()` returned `AVAILABLE`. This directly answers #1078.
2. **Version pinning / output-stability track.** `Stable` guarantees the behavior under you doesn't change silently (answers #1061); `onModelVersionChanged` fires when it would.
3. **A delivery SLO.** The platform commits to signal accuracy and download availability — the contract that lets an app *degrade deliberately* instead of failing silently.

**Deliberately not:** it does not fix a failing download, host your model, or conjure the model onto an ineligible device. It makes the state **honest and observable**; it does not make every device capable.

**TTFHW target: under 15 minutes** for "observe availability → wait for `Ready` → branch UI." Achievable because it's one dependency over state the SDK already holds. The versioning contract is opt-in, so it doesn't tax the first hello-world.

---

## Reach & sizing

All arithmetic is mine; inputs sourced where possible. Android base cited as **3B+ (Google's own last public figure) / ~3.8–3.9B (third-party estimate)**.

| Input | Value / range | Source |
|---|---|---|
| Device reach, classic path (API 26+) | ~99% cumulative | apilevels/Android Studio via secondary |
| Device reach, GenAI/Nano path | ~3.6–4.7% (≤140M Nano devices) | 140M+ is Google's (Apr 2026); % is my arithmetic |
| On-device ML SDK adoption ceiling (`c_ceiling`) | ~0.9–1.5% of all apps | AppBrain TFLite comparable (ML Kit's own page unreachable) |
| Install-weighting (`m_install`) | ~10–12× | TFLite %installs ÷ %apps (my calc) |
| Existing on-device-ML app cohort | ~13,500–22,500 apps | `c_ceiling` × ~1.5M apps (my calc) |

**Install-weighted reach:** at 10–40% adoption of an opt-in delivery API within that cohort → **~1.0–4.4% of all Android installs touched (~30–130M device-installs)** on the classic path. The GenAI/Nano path is hard-capped at ≤140M devices regardless of adoption. **Lead with the classic footprint**, which is ~10–30× the GenAI path's reach today.

**Sensitivity (half `p_job` *and* half `c_ceiling`):** realistic adopters fall to ~340–2,250 apps, install-weighted reach to ~0.25–1.1% (~7–33M device-installs). The verdict survives: the opportunity is **real but modest in raw app count** — its value is install-weighting (a few high-reach apps) and platform-completeness, not breadth. That is exactly why Opportunity is 6, not 9.

---

## Adoption path

1. **The hook:** one developer, one afternoon, replaces a spinner-forever bug with an honest "downloading / offline / unavailable on this device" UI. Fifteen-minute win, shipped into the next release.
2. **First real integration:** they delete their retry loop and their per-framework wrapper, and drive feature-gating off `ModelState`. It replaces hand-rolled `ModuleInstallClient` plumbing.
3. **The dependency:** once the app pins a model track for output stability, removing the API means re-accepting silent behavior drift on every model refresh — a cost they'd endorse, not resent.

**First adopter:** a translation- or OCR-heavy app with large emerging-market DAU, where download failure is already a visible crash stat (the #978 / #698 profile). **Second wave:** GenAI early adopters hitting the 2026 `checkStatus()` unreliability, once a reference implementation shows the truthful-readiness pattern.

---

## Execution plan

- **Developer preview:** ship `ModelDeliveryClient` over the *classic* `RemoteModelManager` surface only (no model work, pure unification + observability). Question it answers: do developers adopt a unified state machine over their own polling? Partners: 2–3 translation/OCR apps with offline-failure tickets.
- **Alpha/Beta:** extend to the GenAI/Nano path and add the readiness probe. Graduation condition: the probe correctly predicts `COMPUTE_ERROR`-class failures (#1078) that `checkStatus()` misses, measured on a device matrix.
- **GA:** commit the delivery SLO and the version-pinning / output-stability contract. This is the surface you must hold for five years.

**Org dependency, stated honestly:** the SLO and the right to pin the OS-managed model's version belong to **AICore / Play Services**, not ML Kit alone. ML Kit can own the developer-facing API, but the delivery *contract* requires the AICore team to say yes. If they don't, the preview still ships as observability-over-existing-state — but the durable version of the idea needs that team.

---

## The case against

The strongest version, argued fairly: **much of the loudest pain is operational reliability, not a missing API.** #978 (China downloads fail), #1080 (stuck at "Downloading" after low storage), #698 (SSL errors) are download *failures*. A delivery/availability API surfaces those failures truthfully — it does not fix them. A skeptic is right to say: you're selling a better error message for a problem whose fix is making the download succeed. The honest rebuttal is narrow: an app that *knows* it's offline-and-stuck can fall back to cloud, queue for later, or disable the feature cleanly instead of spinning forever — deliberate degradation is the actual deliverable, and it's worth real money at 100M-install scale. But it is a smaller, less demoable claim than "we fixed on-device AI," and anyone who oversells it will be caught.

The **live failure mode** from the rubric is #7, *undifferentiated against a free substitute* — the borrow path (`isModelDownloaded()` polling, `ModuleInstallClient`) visibly wins for the common case, so the API captures only the platform-only residual. The close second is #2, *the platform absorbs the problem underneath you* — Google ships the unified API itself, which is less a risk than a description of success. Durability (G3) is the real internal hazard: a half-built lifecycle contract that breaks (#1061-style) is worse than none.

The mitigations are already in the design: lead with the truthful-readiness and version-pin features that *can't* be borrowed, scope the SLO conservatively, and don't promise to fix downloads.

---

## Kill criteria

**The single observation that would reverse this recommendation:** ML Kit's release notes ship a unified, cross-feature model-availability + observable-download + version-pinning API before the next run. If Google builds it, shelve — it's done. *(Checkable against `developers.google.com/ml-kit/release-notes` once that host is reachable.)*

**Load-bearing assumption:** that developers want a *platform* delivery contract rather than continuing to hand-roll per-framework wrappers — i.e., the hidden maintenance cost of the borrow path is high enough that a platform contract wins. The OSS-wrapper churn and the #1078 "fix lies" thread support it; adoption would prove it.

**Re-check trigger if shelved:** the DMA mandate's on-device-model clause is finalized post-appeal with a concrete delivery spec, or Google ships only a half-surface (availability without readiness/versioning), reopening the gap.

---

## Fit for this team

ML Kit is the right *API* owner because it is the only surface that spans **both** delivery regimes — the classic `RemoteModelManager` path and the GenAI `FeatureStatus` path. MediaPipe and LiteRT are bring-your-own-model and don't manage Google's delivery; Firebase AI Logic routes but doesn't observe. But the *contract* (SLO, OS-model version pinning) lives one layer down, in AICore / Play Services. The honest conclusion: ML Kit owns the developer API, backed by an AICore delivery commitment. The internal risk to name is that this lands only inside AICore with no ML Kit-level unified surface — which would fragment the developer story further, the exact opposite of the point.

---

## Open questions

- **ML Kit's actual AppBrain %apps/%installs** — unreachable this run; the real adoption denominator is proxied from TensorFlow Lite. *Settle by:* a browser read of the AppBrain ML Kit page.
- **Would large apps adopt a platform contract** or keep their own App Bundle asset-pack pipelines (the xckevin blog shows some build their own)? *Settle by:* the developer-preview adoption question.
- **Does the DMA appeal stay the mandate?** *Settle by:* EU General Court docket; no merits ruling as of this run.
- **Android RAM distribution** — genuinely unpublished; the biggest missing input for GenAI-tier sizing.
- **Does delivery belong to ML Kit or AICore org-wise?** Unresolved publicly; load-bearing for the execution plan.
- **SO / Reddit / HN corroboration** — all three hosts were walled off this run; the demand picture rests on GitHub alone and is strong but single-channel.

---

## Runners-up

- **On-device moderation classifier for *user* content (Type G).** Strong why-now (Play GenAI output-accountability policy; minors laws, though Texas is now enjoined and California slips to Jan 2027). Lost on feasibility-of-usefulness: a one-size classifier dies on contact with each app's proprietary trust-and-safety policy unless tunability is solved — a bigger research bet than a delivery API.
- **On-device eval / quality harness (Type D).** Apple shipped Evaluations; ML Kit prescribes an eval workflow with no code. Lost on **G1 privilege** — much of an eval harness is borrowable as a Gradle dependency; the platform-only hook (tokenizer/usage internals) is thinner than delivery's.
- **Reach tiering / graceful degradation down-fleet (Type F).** Directly attacks the defining ~4%-of-fleet tension; Firebase falls back to cloud, not to a smaller on-device model. Lost on scope — "surface quality difference honestly across tiers" is a product line, not one API, and feasibility of matched quality is unproven.
- **On-device neural TTS / diarization / wake word (Type A).** Genuine Picovoice-shaped whitespace Google has no answer to. Lost on this run's selection to delivery because its demand, while real, lacks the directly-quoted five-year issue-tracker trail — a candidate for a future run.

---

*Sources: [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit GenAI Prompt (Android)](https://developers.google.com/ml-kit/genai/prompt/android) · [DownloadConditions / RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/DownloadConditions) · [Gemini Nano on Android](https://developer.android.com/ai/gemini-nano) · [Firebase AI Logic Hybrid](https://developer.android.com/ai/hybrid) · [Play Feature Delivery](https://developer.android.com/guide/playcore/feature-delivery) · [Gemma 4 in AICore preview](https://developer.android.com/blog/posts/announcing-gemma-4-in-the-ai-core-developer-preview) · [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [Qualcomm GenieX](https://www.qualcomm.com/developer/blog/2026/06/geniex-developer-preview) · mlkit issues [#315](https://github.com/googlesamples/mlkit/issues/315), [#698](https://github.com/googlesamples/mlkit/issues/698), [#760](https://github.com/googlesamples/mlkit/issues/760), [#773](https://github.com/googlesamples/mlkit/issues/773), [#978](https://github.com/googlesamples/mlkit/issues/978), [#1061](https://github.com/googlesamples/mlkit/issues/1061), [#1062](https://github.com/googlesamples/mlkit/issues/1062), [#1063](https://github.com/googlesamples/mlkit/issues/1063), [#1078](https://github.com/googlesamples/mlkit/issues/1078), [#1080](https://github.com/googlesamples/mlkit/issues/1080) · [EU DMA Alphabet decision guidance (16 Jul 2026)](https://digital-markets-act.ec.europa.eu/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data-under-2026-07-16_en) · [Play AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/14094294) · [AppBrain TensorFlow Lite stats](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite) · [apilevels.com](https://apilevels.com/) · [google_mlkit_translation (pub.dev)](https://pub.dev/packages/google_mlkit_translation)*
