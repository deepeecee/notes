# ML Kit Model Delivery Contract — one observable availability state machine, with an SLO, for every model ML Kit downloads

**Type:** E (Delivery & lifecycle), with a Type C unification flavor · **Verdict:** Prototype (high — becomes Build if the DMA parity-auditability argument lands with the AICore/Play teams) · **Opportunity: 7/10 (Infrastructural)**
*2026-11-21 · Prepared for Android ML Kit · Evidence current as of 2026-11-21*

> It's a Tuesday. A developer shipped translation with ML Kit, caught `MlKitException.UNAVAILABLE` exactly as the docs model it, and wrapped it in a retry. Now a user in Jakarta — one of the [more than half of Indonesian Android users with no wifi](https://developer.android.com/) — taps Translate, the model was never downloaded, and the app shows a spinner that will spin forever. The developer has no `isDownloading`, no percent, no "you're offline," no completion callback. [Issue #641](https://github.com/googlesamples/mlkit/issues/641), reporting exactly this for a different model, has been open for three years. This proposes the one thing only the platform can ship: an observable delivery state, with a contract behind it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Infrastructural | composite 3.80 × 2 = 7.6, no gate at exactly 3 (no −1), S1 is 4 not 5 (no +1) → 7.6, rounded to 7 |
| Platform privilege (gate) | 5/5 — pass | Only Play Services / AICore owns model delivery; an availability *SLO* is definitionally platform-only ([Play AI delivery library](https://developer.android.com/google/play/on-device-ai) is first-party and the only thing with the state machine) |
| Feasibility headroom (gate) | 5/5 — pass | No model to train. The machinery already ships: GenAI's [`DownloadCallback`](https://developers.google.com/ml-kit/genai/prompt/android) emits byte progress, and Play's `AiPackStates` is a working state machine — just pointed at the wrong layer |
| Durability (gate) | 4/5 — pass | ML Kit owns the surface and will persist; the risk is committing an SLO the fleet can't hold. An SLO you break is worse than none — hence 4, not 5 |
| Demand evidence (25%) | 4/5 | Direct developer voice 2021→2026, across classic + GenAI + Flutter wrapper ([#315](https://github.com/googlesamples/mlkit/issues/315), [#641](https://github.com/googlesamples/mlkit/issues/641), [#954](https://github.com/googlesamples/mlkit/issues/954), [#1062](https://github.com/googlesamples/mlkit/issues/1062)). Not a 5: modest reaction counts, no high-traction OSS wrapper |
| Install-weighted reach (15%) | 3/5 | Rides the existing ML Kit base, which concentrates in high-install apps (TFLite analogue ≈ 10× install-weighting, [AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)). But ML Kit's true base is unpublished and the on-demand-model subset is unknown |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The "borrow" path (catch + retry) is free and half-works; GenAI already ships callbacks. Per-app savings are days, not months. The SLO + cross-model unification is genuinely platform-only but saves weeks, not a quarter |
| Integration cost / TTFHW (15%) | 5/5 | Ships as an observable on the APIs developers already call. One line, no key, no new permission, negligible size |
| Substitute half-life (15%) | 4/5 | A general model can't absorb "is my model downloaded." Long half-life — discounted to 4 by the live risk that the industry decides to *hide* availability (Firebase's bet) rather than expose it |
| Strategic complement (10%) | 4/5 | Reliable, observable delivery lifts trust in the whole on-device portfolio, deflects cloud flight, and is the natural instrument for DMA equal-access auditability |
| **Composite** | **3.80** | Weighted mean; verdict band 3.0–3.9 = prototype-and-preview to collect S1 evidence |

*Least trustworthy row: install-weighted reach. ML Kit's true all-apps adoption % is not published by Google ([the newest first-party figure is "more than 25,000 apps," June 2020](https://android-developers.googleblog.com/2020/06/mlkit-on-device-machine-learning-solutions.html)), and AppBrain's ML Kit row wasn't directly retrievable this run, so the whole SAM scales off a bracketed estimate.*

---

## The problem

The job, stated as a developer's job under a deadline: *"ship a feature backed by an on-device model, and tell the user something true while the model isn't there yet."* Every ML Kit API whose model downloads on demand — Translation, Entity Extraction, the segmentation and unbundled vision models, and the entire GenAI/Gemini Nano surface — forces the developer to answer "is the model here, and if not, what now?" The platform's answer today is a patchwork, and on the classic path it is essentially "catch an exception and retry."

This is structurally produced, not an accident of tooling. A 100M+ install app can't bundle every model — [Google Play's own figure is that each 6 MB of APK costs ~1% of install conversion, worse in growth markets](https://developer.android.com/), so models are delivered out-of-band. Out-of-band delivery is asynchronous, device-fragmented across RAM and NPU tiers, and fails on exactly the low-end, low-connectivity devices that dominate the markets where [more than half of Indian and Indonesian users have no wifi](https://developer.android.com/). The moment you separate the model from the APK, you create a delivery lifecycle — and the platform that created it never gave the developer a way to observe it. The app's ML people are server-side; the Android engineer left holding this writes a retry loop and ships it, because the SDK models a retry loop as the answer.

What developers do *instead* today, concretely: on classic vision models, catch `MlKitException.UNAVAILABLE` (error code 14) and retry per frame, hoping Play Services downloads the model eventually — [Google's own migration guidance documents this manual retry as the pattern](https://developers.google.com/ml-kit/release-notes). On Translation, poll `isModelDownloaded()` and attach a success/failure listener with **no progress on Android** (iOS, embarrassingly, gets progress and completion notifications). On GenAI, call `checkFeatureStatus()` — which, per [issue #1062 (July 2026, open)](https://github.com/googlesamples/mlkit/issues/1062), throws `GenAiException(606) FEATURE_NOT_FOUND` on the most common case (AICore present, feature not provisioned) instead of returning `UNAVAILABLE`, so "the mitigation itself throws." Three models, three contracts, and the one that was supposed to be best is broken.

The cost of the workaround is the value of the API: hand-rolled polling and retry per app, a UX that can't show progress or distinguish "offline" from "downloading" from "this device will never get it," and — the part no app can build at any price — any assurance about *when* the model will be ready.

---

## Proof & signals

**Developers doing it by hand, in Google's own tracker (direct developer voice):**

- The canonical ask, [issue #315](https://github.com/googlesamples/mlkit/issues/315), opened 2021-06-21 by G00fY2 (a well-known Android OSS author): *"There is still no way to get availability and download status of the unbundled standard ML Kit models (e.g. barcode), right?"* It drew *"can you give us an update. It's been over six months"* and sat **14 months before being closed by pointing at a GMS `ModuleInstallClient` workaround** — not the asked-for unified contract. `[direct, verified via GitHub]`
- [Issue #641](https://github.com/googlesamples/mlkit/issues/641), open since 2023-03-15: the Barcode UI module shows *"Waiting for the Barcode UI module to be downloaded"* for five minutes with no progress; a developer argues they shouldn't have to hand-roll *"lib checking, installation, download progress"* and another couldn't find a way to install the module via `ModuleInstallClient` at all. The workaround from #315 doesn't even cover this module. `[direct, verified]`
- The GenAI cluster, all open and dated 2025–2026: [#954](https://github.com/googlesamples/mlkit/issues/954) ("Feature is unavailable" on a Galaxy S25 flagship, no reliable way to know why), [#1062](https://github.com/googlesamples/mlkit/issues/1062) (the `checkFeatureStatus` throw), plus #1088, #1081, #1079, #1069 — undocumented or contradictory availability states on supported silicon. The GenAI half of this problem is generating *fresher, sharper* complaints than the classic half. `[direct, verified]`
- The pain propagates to wrapper ecosystems: the most popular Flutter binding carries a steady stream of download-status breakage — [google_ml_kit_flutter #885](https://github.com/flutter-ml/google_ml_kit_flutter/issues/885) ("Android model download broken; `manageModel()` is an empty stub"), plus #792, #496, #312. `[direct, verified]`

**Someone charging money for it:** no commercial vendor sells "ML Kit availability," because it's inextricable from Google's own delivery pipe — which is itself the Platform Privilege argument, not an absence of demand. The honest read: willingness-to-pay evidence is weak *because the capability can only come from the platform*.

**The absence signal:** GitHub repository search surfaced **no** high-traction OSS "retry-until-the-model-downloads" wrapper. Two readings, and I take the second: either the pain is small, or — consistent with the issue tracker — developers hand-roll it *inline* per app exactly as the docs model it, so it never converges into a shared library worth starring. The recurrence across five years, both model families, and two language ecosystems is the signal; a single high-vote thread is not.

**Honest limit on this section:** Stack Overflow, Reddit, and Hacker News were unreachable this run, so community-traction numbers are GitHub-weighted. The demand case rests on breadth, longevity, and the fact that the one formal feature request was closed with a workaround — not on vote counts I could not verify.

---

## Why now

1. **A capability shift (July 2026):** GenAI's `DownloadCallback` now emits `onDownloadStarted(bytesToDownload)` / `onDownloadProgress` / completion / failure, and [`genai-prompt 1.0.0-beta5` shipped 26 Oct 2026](https://developers.google.com/ml-kit/release-notes). For the first time, Google has a *rich* delivery surface on one model family — which makes the inconsistency with the classic path (no progress on Android at all) a fresh, concrete gap rather than a uniform shrug. The pieces to unify now exist.
2. **A regulatory shift (dated, clock running):** the EU DMA specification decision [DMA.100220](https://digital-markets-act.ec.europa.eu/), adopted **16 July 2026** under Article 6(7), orders Alphabet to let third parties *call* the preinstalled Gemini Nano on-device models "at Google-equivalent performance," and adds a **temporal-parity clause**: new functionality must reach third parties "at the same time" as Google's own services. Vehicle: **Android 18, deadline 1 August 2027** (one hotword feature deferred to Aug 2028). Google filed an annulment action ([T-639/26, 28 Sept 2026](https://eulawlive.com/)), but **the appeal does not suspend the decision** — the clock runs. Crucially, the decision does *not* name an availability contract; it mandates access and timing. You cannot credibly demonstrate "same-time, equal-performance" availability of a model that downloads out-of-band *without* an observable readiness state. The contract is the instrument that makes the obligation auditable.
3. **A demand shift:** the GenAI complaints (#954, #1062, #1088) are all 2025–2026, i.e. developers are *now* trying to gate real UI on on-device availability and discovering the signal is broken on shipping flagships.

This is a genuine three-part why-now, with the caveat that part 2 is a *tailwind and auditability argument*, not a literal "regulation orders this API." That honesty matters: a reviewer who checks the decision text will find access-and-timing, not a delivery SLO, and the pitch has to own that distinction or it gets discounted.

---

## The capability gap

Precise boundary, each with the surface checked (doc hosts `developers.google.com`/`firebase.google.com` were not directly fetchable this run; API names and states verified via WebSearch of the live pages — flagged for a direct re-read):

- **ML Kit GenAI (best in class, still partial):** `checkFeatureStatus()` → a `FeatureStatus` enum (`AVAILABLE`/`DOWNLOADABLE`/`DOWNLOADING`/`UNAVAILABLE`) plus a `DownloadCallback` with byte-level progress and completion/failure. Missing: a normalized percent, an *observable stream* (it's point-in-time polling), coverage of anything but Nano, and any SLO. And it [throws on the common unprovisioned case](https://github.com/googlesamples/mlkit/issues/1062).
- **ML Kit classic — Translation / Entity Extraction:** `RemoteModelManager.download()` gives a completion-only success/failure listener and `isModelDownloaded()`. **No progress on Android.** (iOS exposes progress + `.mlkitModelDownloadDidSucceed/DidFail` — an own-platform inversion.)
- **ML Kit classic — face detection / selfie segmentation base models:** no developer-facing download API at all. Catch `MlKitException.UNAVAILABLE` and retry.
- **[Play for On-device AI](https://developer.android.com/google/play/on-device-ai) (right machinery, wrong layer):** `AiPackStates`/`AiPackStatus` is a real download state machine — but it covers the *developer's own* bundled model packs, explicitly **not** ML Kit's managed models or Gemini Nano/AICore. Beta, no SLO.
- **[Firebase AI Logic Hybrid](https://firebase.google.com/docs/ai-logic):** deliberately *hides* availability behind `PREFER_ON_DEVICE`/`ONLY_ON_DEVICE` modes, silently falling back to cloud. A competing philosophy *inside Google*.
- **Apple Foundation Models:** `SystemLanguageModel.availability` → `.available`/`.unavailable(reason)`. Discrete status only — no progress, no SLO. Apple hasn't solved it either.

**The main competitor** a developer uses today is not a third-party SDK — it's their own `try/catch(UNAVAILABLE){ retry() }` plus `isModelDownloaded()` polling and, where it reaches, GMS `ModuleInstallClient`. The status quo is hand-rolled inline code against three inconsistent first-party surfaces.

---

## Proposed surface

One observable delivery contract, normalized across every ML Kit model that downloads, exposed as a stream the app can bind UI to — plus a published SLO. The Type C half is that it collapses three surfaces into one; the Type E half is the contract.

```kotlin
// One call, same shape for Translation, Segmentation, Prompt, Summarization…
val delivery: Flow<ModelDelivery> = MlKit.modelDelivery(TranslateRemoteModel(FRENCH))

sealed interface ModelDelivery {
  object NotRequested : ModelDelivery
  data class Downloading(val fraction: Float, val bytesTotal: Long) : ModelDelivery
  object Ready : ModelDelivery
  data class Unavailable(val reason: Reason) : ModelDelivery   // Offline, DeviceIneligible,
                                                               // Provisioning, QuotaExceeded, BootloaderUnlocked
}

MlKit.requestModel(model, DownloadConditions(wifiOnly = true, chargingOnly = false))
```

- **Inputs/outputs:** any ML Kit on-demand model handle in; an observable `Flow<ModelDelivery>` out, with a *typed `Reason`* so the developer branches on "offline" vs "this device will never get it" vs "provisioning" — the distinction the current exception collapses.
- **The contract (the novel part):** a published availability/delivery SLO — e.g. a committed definition of `Ready` state semantics, a cross-model-version stability guarantee for the *delivery* enum (independent of model output), and a documented freshness/parity commitment that maps to the DMA "same-time" obligation.
- **What it deliberately does *not* do:** it does not change model *output*, does not schedule inference (that's a separate deferred-inference idea), and does not promise a model will *ever* arrive on ineligible hardware — it promises you'll be *told* which case you're in.
- **Build path:** extend the proven `AiPackStates` machinery down onto ML Kit's managed models and Nano, rather than inventing a state machine. Lower-risk than it looks.
- **TTFHW target: under 15 minutes.** Met if it's an observable on APIs the developer already calls — no new key, no permission, no size. The design constraint that makes this true: it must be *additive* to existing integrations, never a migration.

---

## Reach & sizing

Show the arithmetic; everything here is a range, and the inputs are soft.

- **ML Kit all-apps adoption:** bracket **~1–4% of meaningful Android apps**. Floor = the [TensorFlow Lite analogue at ~1% of apps / ~10–11% of installs after ~7 years](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) (third-party, AppBrain); upper end because 42matters rates ML Kit more popular than TFLite. No clean first-party number exists. `[my bracket]`
- **Share using an on-demand model (not bundled barcode/text):** **~20–40%** — a guess, flagged. ML Kit's *most-used* APIs are bundled, so this could be lower.
- **On-demand SAM (apps):** ~1%×20% to ~4%×40% = **~0.2–1.6% of meaningful apps**. `[my arithmetic]`
- **Install-weighted:** apply the ~10× concentration (on-device ML SDKs skew hard to high-install apps) → **high-single to low-double-digit % of installs**, even at low app-count. This is the number that matters for a platform, and it's the one that saves the idea.
- **Device eligibility:** classic + GenAI reach ~97–99% (API 26+); advanced speech drops to ~70–78% (API 31+). The contract itself has no new silicon gate — it describes *whatever* the device can get.

**Engineering avoided** is deliberately *not* the headline, because prior art shows the borrow path half-works: per app, call it 3–10 engineer-days of polling/retry/UX plumbing avoided, times SOM. That numerator is weaker than a big new API would carry — so the platform test here leans on **unification + the SLO + DMA auditability**, not raw engineer-weeks. State that plainly.

**Sensitivity:** halve the two softest inputs (ML Kit base → 1%, on-demand subset → 20%) and the app-count SAM falls to ~0.2% — thin. **The verdict survives only because (a) marginal adoption cost is near-zero — it rides existing integrations — and (b) the DMA parity tailwind, not because the sizing is large.** If you don't believe the DMA argument and you price adoption as cold-start, this is a feature, not a platform API. The honest output: one experiment settles it — ship the unified observable to a developer preview and measure what fraction of *existing* ML Kit integrators adopt it within two SDK releases.

---

## Adoption path

1. **The hook (15 min):** an existing integrator swaps a `try/catch(UNAVAILABLE)` for binding a progress bar to `modelDelivery(model)`. Instant, visible UX win; no migration.
2. **First real integration:** they replace their hand-rolled retry loop and ship a real "downloading 40% / you're offline / not supported on this device" state. What it replaces is their own inline code.
3. **The dependency:** once the UI branches on the typed `Reason` and a WorkManager job keys off `Ready`, removing it means rebuilding the state machine — a dependency they'd endorse, not resent.

**First adopter:** a large app already shipping an on-device translation or segmentation feature into growth markets — the profile of the #641/#954 reporters — where the offline/low-end failure is most visible. Second wave unlocks when one reference app's progress-and-fallback UX becomes the thing every competitor copies, and when DMA-covered AI-assistant builders need auditable equal-access to Nano.

---

## Execution plan

- **Developer preview:** ship the unified `Flow<ModelDelivery>` over existing APIs *without* the SLO. Question it answers: do existing integrators adopt an observable when it costs them nothing? Partners: 3–5 current translation/segmentation shippers. Evidence collected: adoption rate across two SDK releases (the S2 experiment above).
- **Beta:** graduate when (checkable) the observable covers classic + GenAI uniformly and the `checkFeatureStatus` throw ([#1062](https://github.com/googlesamples/mlkit/issues/1062)) is fixed. Add typed `Reason` and download conditions.
- **GA:** commit the SLO — the delivery-enum stability contract and the freshness/parity guarantee mapped to DMA Art 6(7). This is the irreversible step and the one that needs the org to say yes.

**Org dependencies, named honestly:** the developer-facing surface is ML Kit's to own, but the *underlying state and the SLO* belong to **Play Services / Play for On-device AI and AICore**. ML Kit cannot commit a delivery SLO it doesn't control the pipe for. If those teams won't commit, the honest conclusion is that the *contract* half belongs to the Android platform-delivery org and ML Kit ships only the unified *observable*. That split is the single biggest execution risk, and pretending ML Kit can do this alone would be the wish the rubric warns about.

---

## The case against

The strongest version: **the platform absorbs the problem underneath you** (failure mode #2). The DMA decision forces Google to expose Nano access by Aug 2027 anyway; Google could satisfy it with *minimal, ad-hoc* availability signalling and moot a richer contract. And a reviewer can correctly say the GenAI progress callbacks *already exist* — so a chunk of the pitch is "done," and what's left (classic-model progress + unification + SLO) is less demo-friendly and loses internal prioritization to generation features, exactly as Type E always does (beta3→beta5 shipped only generation features).

The second, sharper argument is **a competing philosophy inside Google**: Firebase AI Logic Hybrid bets developers want availability *hidden* behind automatic cloud fallback. If that bet is right, exposing a delivery state machine is solving a problem the market wants abstracted away. The honest reconciliation is segmentation, and it must be argued in the pitch, not waved at: apps *with* a cloud fallback want availability hidden; **offline-only, privacy-bound, and cost-capped apps** — the ones that chose on-device precisely because cloud is foreclosed (Meta's E2EE framing; Duolingo's margin pressure) — want it exposed and have nowhere else to get it. The contract is for the second group, and the DMA equal-access obligation is for *everyone building a competing assistant*, which is why the regulatory framing, not the DX framing, is what elevates this from feature to platform.

Weaker-than-it-looks counter: "the borrow path is free." True, and it's why S3 is only 3 — but the borrow path cannot produce an SLO or a parity guarantee at any price, and that's the part that isn't a feature.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google ships, as part of the Android 18 DMA implementation before 1 Aug 2027, a unified third-party model-availability signal spanning Nano *and* classic models with a documented stability commitment. If that lands in a release note, the gap is closed and this becomes documentation, not a build. *Check: ML Kit/Android 18 release notes through Aug 2027 for an availability-contract entry.*

**Load-bearing assumption:** that developers want on-device availability *exposed and observable*, not *hidden behind cloud fallback*. If Firebase's hide-it philosophy is where the market actually goes, the contract is for a shrinking segment.

**Re-check trigger if shelved:** a jump in GenAI availability-bug issues (the #1062 cluster) after a wider Nano device rollout, or any DMA compliance filing that names availability signalling explicitly.

---

## Fit for this team

ML Kit is the sanctioned front door to both the classic on-device models and (via the Prompt API) AICore/Nano, so the *developer-facing observable* is squarely its surface — no other team sees both model families at once. But the *delivery pipe and the SLO* live in Play Services / Play for On-device AI and AICore. The right structure is ML Kit owning the API and the normalization, with Play/AICore committing the contract behind it. If that partnership can't be struck, the better owner for the SLO is the Android platform-delivery team, and ML Kit should ship only the unified observable and say so — fragmenting a *delivery* story across ML Kit, MediaPipe, and Play is exactly this ecosystem's standing risk, and this idea should reduce it, not add to it.

---

## Open questions

- **ML Kit's true all-apps adoption %** — unpublished since 2020; settle by retrieving AppBrain's ML Kit and legacy Firebase-ML-Kit rows directly (host was blocked this run).
- **What fraction of ML Kit apps use an on-demand vs bundled model** — no data found; settle with a coded sample of 50–100 ML Kit apps' manifests/declared models.
- **Will Play/AICore commit a delivery SLO at all** — the make-or-break org question; settle with those teams directly before Beta.
- **Does the DMA implementation already plan availability signalling** — settle by reading the Android 18 Draft Implementation Measures in full (decision PDFs were not directly fetchable this run).
- **Exact `checkFeatureStatus` throw conditions** across devices (#1062) — needs a direct docs + reproduction read.

---

## Runners-up

- **On-device eval & quality harness (Type D)** — lost on Platform Privilege. Apple shipped an Evaluations framework at WWDC26 and ML Kit publishes a prose "evaluate prompt quality" page with no tooling behind it; a crisp, embarrassing why-now. But a three-person team can ship an eval Gradle lib, so G1 is thinner than the delivery contract's. Strong second; worth its own run.
- **Standalone safety/moderation classifier (Type G)** — lost on the tunability risk. Real regulatory clock (age-assurance laws live Jan 2026; Play holds the developer liable for output) and [Bumble open-sourced its own classifier](https://github.com/), but "safety is each company's policy surface" means a one-size classifier may be unusable without heavy tunability work. Passes gates; higher build risk.
- **Sub-8 GB GenAI reach tiering (Type F)** — parked at the Feasibility gate. The defining 26× coverage gap (Nano reaches ~3.7% of the fleet), but the honest version can't promise the small-model quality matches Nano, and the whole idea *is* that quality curve. Re-trigger: a published mid-tier small-model quality result above the embarrassment threshold.
- **On-device neural TTS (Type A)** — lost on Platform Privilege + Feasibility. Genuine whitespace (Picovoice Orca sells into it; Apple added speech generation), but Picovoice ships a Gradle dependency today, so "why the platform" is weaker than a delivery contract only Google can offer.

---

*Sources:*
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [ML Kit GenAI Prompt API (Android) — FeatureStatus, DownloadCallback](https://developers.google.com/ml-kit/genai/prompt/android)
- [googlesamples/mlkit issue #315 — availability/download status of unbundled models](https://github.com/googlesamples/mlkit/issues/315)
- [googlesamples/mlkit issue #641 — Barcode UI module "waiting to be downloaded"](https://github.com/googlesamples/mlkit/issues/641)
- [googlesamples/mlkit issue #954 — "Feature is unavailable" on Galaxy S25](https://github.com/googlesamples/mlkit/issues/954)
- [googlesamples/mlkit issue #1062 — checkFeatureStatus throws GenAiException(606)](https://github.com/googlesamples/mlkit/issues/1062)
- [flutter-ml/google_ml_kit_flutter issue #885 — Android model download broken](https://github.com/flutter-ml/google_ml_kit_flutter/issues/885)
- [Play for On-device AI — AI delivery](https://developer.android.com/google/play/on-device-ai)
- [Android hybrid on-device inference](https://developer.android.com/ai/hybrid)
- [Firebase AI Logic](https://firebase.google.com/docs/ai-logic)
- [Apple SystemLanguageModel.availability](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)
- [EU DMA Alphabet AI interoperability proceedings (DMA.100220)](https://digital-markets-act.ec.europa.eu/)
- [Alphabet annulment actions T-639/26, T-638/26 (EU Law Live, 28 Sept 2026)](https://eulawlive.com/)
- [AppBrain machine-learning SDK stats (TensorFlow Lite analogue)](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [Android Developers Blog — "more than 25,000 apps use ML Kit" (June 2020)](https://android-developers.googleblog.com/2020/06/mlkit-on-device-machine-learning-solutions.html)
