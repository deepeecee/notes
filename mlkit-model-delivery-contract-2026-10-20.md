# On-Device Model Delivery Contract — give every ML Kit model the download state machine Gemini Nano already has, plus the delivery SLO nobody ships

**Type:** E (Delivery & lifecycle), with a Type B extension component · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Strong, build-adjacent)**
*2026-10-20 · Prepared for Android ML Kit · Evidence current as of 2026-10-20*

*Badges: Nobody ships a delivery SLO · Regulatory clock (DMA, 1 Aug 2027) · Google already built this for 3.7% of the fleet*

> On a Tuesday a developer ships a translation feature. On a user's phone it throws `MlKitException.UNAVAILABLE`, because Play Services is downloading the model in the background — no progress, no ETA, and if the user is offline, nothing, ever, with no signal to the app. Their actual production code, in their words, is to "keep the analyzer alive… and hope for the Play Services to eventually download the model." Google already solved this for Gemini Nano with a four-state machine and byte-level progress callbacks. It left the classic models — the ones that reach ~98% of Android, not 3.7% — on a boolean and an exception.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, build-adjacent | composite 3.8 × 2 = 7.6; no gate scored exactly 3 and S1 is not a 5, so no rubric adjustment; rounded **down** to 7 because the 20%-weighted build-vs-borrow dimension is the honest ceiling (a borrow path already exists) and I won't round toward enthusiasm |
| Platform privilege (gate) | 5/5 — pass | Model delivery is owned by Play Services / AICore; Google's own answer to the feature request was to point developers at the platform `ModuleInstallClient` API ([#315](https://github.com/googlesamples/mlkit/issues/315)). No third party can offer a delivery contract. |
| Feasibility headroom (gate) | 5/5 — pass | It is signalling, not a model. Google already ships the exact pattern twice: GenAI `FeatureStatus` + `DownloadCallback`, and `SplitInstallSessionStatus` ([Android docs](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)). |
| Durability (gate) | 4/5 — pass | Play Services model delivery is core, durable infra; the status API is safe to freeze. The *SLO* portion is where durability risk concentrates — a delivery contract you break is worse than one you never made. |
| Demand evidence (25%) | 4/5 | Verbatim, Googler-acknowledged feature request ([#315](https://github.com/googlesamples/mlkit/issues/315), 2021) plus a 2021→2026 drumbeat across every unbundled surface, incl. *open* GenAI issues [#1062](https://github.com/googlesamples/mlkit/issues/1062)/#1079/#1081. Capped at 4: no commercial vendor can sell this (structurally), volume is single-channel, SO/Reddit unmeasurable. |
| Install-weighted reach (15%) | 4/5 | Classic unbundled models reach ~98% of devices (API 26+, [Android Studio distribution data](https://www.heise.de/-11162154)); ML Kit carries ~93–95% of *downloads* among text-processing-SDK apps ([42matters](https://42matters.com/sdk-analysis/top-text-processing-sdks)). Capped at 4: the absolute denominator is unknown. |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path already mostly works: hand-rolled retry on `UNAVAILABLE`, or wiring Google's own `ModuleInstallClient`. Saves modest engineer-weeks; the irreplaceable part (offline signal, SLO) is the harder-to-value slice. |
| Integration cost / TTFHW (15%) | 5/5 | One listener on an API you already call; no new permission, no key, negligible size. Sub-15-minute hello-world is realistic. |
| Substitute half-life (15%) | 3/5 | The substitute is Google's *own* roadmap: `ModuleInstallClient` exists, GenAI already has `FeatureStatus`. 2–3 years before Google unifies it itself — the classic "platform absorbed it" risk, where the platform is you. |
| Strategic complement (10%) | 4/5 | Reliable, observable on-device delivery lifts on-device feature adoption (Android engagement, less cloud dependence) and is a provable equal-access surface for DMA compliance. |
| **Composite** | **3.8** | Prototype band (3.0–3.9): developer-preview explicitly to collect the missing S1/denominator evidence. |

*Least trustworthy row: install-weighted reach. The install-weighting multiplier (~1.5×) and the ~98% device ceiling are well-grounded, but the absolute count of apps using these specific unbundled jobs could not be retrieved — AppBrain's ML Kit detail page was unreachable this session.*

---

## The problem

The job, stated as a developer's: *"My on-device feature depends on a model my app doesn't contain. Tell me, reliably, whether it's here yet, when it will be, and what to do if it won't come — so I can show the right UI instead of a silent failure."*

ML Kit's design choice — the one that gives it near-universal reach — is that models are not bundled in the APK. Every megabyte of bundled model is an install tax: Google Play's own figure is that each 6 MB of APK growth costs about 1% of install conversion, and roughly 70% of users in emerging markets check size before downloading. So ML Kit ships the code and downloads the model on first use through Play Services. That trade is correct. The unmanaged consequence is that the app now depends on an asset whose arrival it cannot observe.

What developers do *instead* today, concretely: they call the API, catch `MlKitException.UNAVAILABLE` (for optional-module vision APIs) or `NOT_FOUND` (via `RemoteModelManager`), and retry on a loop, hoping Play Services completes the download in the background ([MlKitException reference](https://developers.google.com/android/reference/com/google/mlkit/common/MlKitException)). There is no download-progress callback on Android for the classic path — even though Google's *own iOS* Translation SDK exposes a `progress` object ([Translation Android docs](https://developers.google.com/ml-kit/language/translation/android)). When the device is offline the download never starts and the app has no way to distinguish "downloading" from "will never download" from "this device is ineligible." The three states a developer must branch on — *transient, fix-the-environment, permanent* — are collapsed into one exception.

This is structurally produced, not a bug. A 100M+ install app spans a device fleet of ~3.8B devices and ships to users who are frequently offline (Google's own figure: more than half of Indian and Indonesian Android users have no wifi access). Dynamic model delivery is the only way to serve that fleet without the size tax, so the observability gap is intrinsic to the delivery model — not an accident of this quarter's SDK. Fixing it requires the party that owns delivery to expose its state, which is the definition of a platform problem.

The insight a reader won't reach alone: this is usually discussed as a *GenAI* problem, and for GenAI it is already largely solved. The real exposure is the **classic** models — Translation, Segmentation, Face, Barcode, Entity Extraction — which carry the overwhelming majority of ML Kit's installs and still run on the boolean-and-exception contract Nano was lifted off of a year ago.

---

## Proof & signals

- **Developers doing it by hand, verbatim (confirmed — I fetched the issue):** [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315), opened by `G00fY2` on 21 Jun 2021, closed "completed" Aug 2022: *"There is still no way to get availability and download status of the unbundled standard ML Kit models… we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* A Googler replied the next day: *"Yes, thanks for bringing this up! We had it planned but didn't have cycle to get to it."* The eventual resolution was a pointer to the generic GMS `ModuleInstallClient` — a punt to a platform API, not a first-class ML Kit one.
- **The multi-year drumbeat (confirmed by the demand agent against the tracker):** the same pain recurs across [#308](https://github.com/googlesamples/mlkit/issues/308) (Face, 2021), [#405](https://github.com/googlesamples/mlkit/issues/405) (Translation "is it downloaded?", 2021), #641 (Barcode UI, 2023), #760 (Face on Android 14 — a maintainer calls first-request failures during download "working as intended"), [#829](https://github.com/googlesamples/mlkit/issues/829) (Subject Segmentation: *"This exception occurs and persists even after retrying… waits indefinitely for the module download,"* 2024), and #978 (Entity Extraction unusable in mainland China; dev asks for offline models, 2025).
- **Still open, and now on the GenAI path too:** [#1062](https://github.com/googlesamples/mlkit/issues/1062) (Jul 2026, open, no maintainer response): the GenAI APIs *"throw `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`… This makes the documented mitigation impossible to apply: the mitigation itself throws."* Companions #1079 (Speech `checkStatus()` throws `PERMISSION_DENIED`, Oct 2026) and #1081 (Oct 2026). Even where Google built the state machine, reading it is unreliable.
- **Someone charging money for it:** none — and that absence is *expected*, not a negative signal. You cannot sell a third party access to Play Services' delivery state; only the platform holds it. The willingness-to-pay signal this rubric usually prizes is structurally unavailable here, which is itself evidence of G1 privilege.
- **The absence signal:** no dedicated native OSS library exists to manage ML Kit download state (the demand agent found only cross-platform wrappers like `cordova-plugin-mlkit-suite` handling it as one feature). For a pain this recurring, the absence of a go-to helper is consistent with "it can't be built outside the platform," which is the whole point.
- **First-party corroboration:** Google's own iOS SDK exposes download progress that the Android SDK does not; Google publishes a dedicated "shrink apps that use ML Kit" guide, which is itself evidence the bundle-vs-deliver trade is common enough to document.

*Honesty caveat carried from research: Stack Overflow and Reddit volume could not be measured (both unreachable with the allowed tools), so I cannot cite a question count. The signal is concentrated in one tracker of modest volume — strong and converging in kind, limited in measured breadth.*

---

## Why now

1. **Capability shift (Jul 2026).** ML Kit's GenAI path now ships the full pattern — `FeatureStatus` (UNAVAILABLE/DOWNLOADABLE/DOWNLOADING/AVAILABLE) plus a byte-level `DownloadCallback` (`onDownloadStarted`/`Progress`/`Completed`/`Failed`). *[Read via search summaries; the `developers.google.com` reference pages were not directly fetchable this session — flagged below.]* The design question is settled and the code exists in-house; the work is porting it to the classic path, not inventing it.
2. **Competitive shift (Jun 2026, WWDC26).** Apple's Foundation Models framework shipped `SystemLanguageModel.availability` with exactly three `UnavailableReason` cases — `appleIntelligenceNotEnabled`, `deviceNotEligible`, `modelNotReady` ([Apple docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason), fetched). Apple tells you *whether*; it never tells you *when* or *how far along* — `modelNotReady` collapses all transient delivery state into one case with no ETA. That is a beatable bar.
3. **Regulatory shift (adopted ~16 Jul 2026; deadline 1 Aug 2027).** The EU DMA Article 6(7) specification decision on Alphabet (case DMA.100220) requires Google to make system on-device AI models — explicitly Gemini Nano — available to third parties on terms "equally effective in ease of use, speed, and energy consumption," implemented in Android 18 by 1 Aug 2027 ([DMA portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). A clean delivery/availability API is a plausible surface through which Google *proves* equal access. *[Primary portal pages were unreachable this session via automated fetch; dates and category language are WebSearch-corroborated and should be confirmed against the primary source before anyone relies on the exact wording or the 16 Jul date.]*

All three have dates. The why-now is genuine, not manufactured.

---

## The capability gap

Be exact about the boundary:

- **ML Kit classic (Translation, Segmentation, Face, Barcode, Entity Extraction):** `isModelDownloaded()` → Boolean; `downloadModelIfNeeded()` → a Task reporting only completion/failure; failures surface as `MlKitException.UNAVAILABLE`/`NOT_FOUND`. **No state machine, no progress, no offline signal.** ([Translation docs](https://developers.google.com/ml-kit/language/translation/android).)
- **ML Kit GenAI (Nano):** `FeatureStatus` four-state enum + `DownloadCallback` byte progress. The pattern exists — on the 3.7% path.
- **Play for On-device AI:** a full `AiPackState` machine (PENDING/DOWNLOADING/TRANSFERRING/COMPLETED/FAILED/WAITING_FOR_WIFI/REQUIRES_USER_CONFIRMATION…) with byte progress — but it serves **developer-supplied custom models only**, never ML Kit's own ([docs](https://developer.android.com/google/play/on-device-ai)).
- **Android Play Feature Delivery:** `SplitInstallSessionStatus` — 10 states with `bytesDownloaded`/`totalBytesToDownload` and a user-confirmation gate ([docs](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)). Google already owns the grammar.
- **Apple:** a two-case availability enum, no SLO.
- **No vendor anywhere** — Google (classic or GenAI), Apple, Qualcomm, Samsung, MediaPipe — publishes a *delivery SLO or platform commitment* about when an unbundled model will be available. Every surface lets you observe a status; none promises a contract.

**The main competitor a developer uses today is Google's own `ModuleInstallClient`** — the generic GMS module-install API they were pointed to in #315. It works, partially, but it is not ML-model-aware, carries no offline semantics, and is undocumented knowledge developers discover by filing issues.

---

## Proposed surface

A single `ModelDeliveryClient` that works identically across every dynamically-delivered ML Kit model, reusing the `SplitInstallSessionStatus` grammar Google already ships and the `FeatureStatus`/`DownloadCallback` shape from the GenAI path.

```kotlin
// One listener, any ML Kit model — classic or GenAI.
val delivery = ModelDelivery.getClient(context)

delivery.status(TranslateRemoteModel.of(FRENCH))   // or Segmentation, Face, a GenAI feature…
    .addOnSuccessListener { s: ModelStatus ->
        when (s.state) {
            AVAILABLE      -> enableFeature()
            DOWNLOADABLE   -> showDownloadAffordance(s.estimatedBytes)
            DOWNLOADING    -> showProgress(s.bytesDownloaded, s.totalBytes, s.etaSeconds)
            BLOCKED_OFFLINE -> showOfflineHint()          // the signal that doesn't exist today
            INELIGIBLE     -> hideFeaturePermanently(s.reason) // deviceNotEligible, bootloaderUnlocked…
            FAILED         -> showRetry(s.errorCode)
        }
    }

delivery.request(model, DownloadConditions.requireWifi())
    .addOnProgressListener { p -> showProgress(p.bytesDownloaded, p.totalBytes, p.etaSeconds) }
```

What it deliberately does **not** do: it does not change *where* models come from, does not bundle anything, does not expose model weights, and does not promise a download will succeed on an offline device — it promises to *tell the truth* about why it can't. The states are the product; the honesty of `BLOCKED_OFFLINE` and `INELIGIBLE` (distinguishing transient from permanent) is the part no workaround can replicate.

The **delivery contract** (the Type E core, and the durability-risky part): a published, versioned commitment — e.g. "once `DOWNLOADABLE` is reported on an eligible device with connectivity, delivery completes within N seconds at the Pxx, or transitions to a named failure state." This is the thing no vendor offers and the thing a DMA "equally effective" obligation may require Google to be able to assert anyway.

**Time-to-first-hello-world target: under 15 minutes.** Achievable because it is one Gradle line, one listener, no new permission, no API key, negligible APK size, and it runs in the emulator. If any of those slips (e.g. a mandatory console project), that's a finding about the design, not a footnote.

---

## Reach & sizing

Inputs, each labelled (all third-party except the device-distribution figures, which derive from Google's Android Studio data):

- **Device eligibility (r_reach):** ~98% of active devices at API 26+; ~69% at API 31+ ([distribution data](https://www.heise.de/-11162154)). Classic unbundled models sit near the ceiling; **GenAI/Nano is the exception at ~3.7%** (140M+ Nano devices, Google Apr 2026, over ~3.8B actives, third-party denominator → ~3.7%, my arithmetic).
- **Install-weighting (m):** ~1.2–1.8×, central **~1.5×** — triangulated from 42matters text-processing SDKs (93.75%/57.46% downloads/apps → 1.63×) and scanners/OCR (1.16×), plus AppBrain Firebase dev-tools (1.50×). ML Kit is disproportionately present in high-install apps.
- **Category dominance:** among apps that already use a text-processing SDK (~200k Play apps), ML Kit carries **~93–95% of downloads** ([42matters](https://42matters.com/sdk-analysis/top-text-processing-sdks)); ~50% of downloads among scanner/OCR-SDK apps.
- **Absolute adopters (the soft input):** the only Google-published count is **"25,000+ applications"** across Android *and* iOS from ~2020 (at the Firebase split); with positive net churn since (~+68 apps/month, 42matters), the current Android figure is plausibly tens of thousands, but **no current absolute is published** and I did not invent one.

**Engineering cost avoided:** this is where the honest number is modest. The per-adopter saving is roughly 1–3 engineer-weeks of delivery plumbing plus recurring flakiness triage — not the 3+ engineer-months that a new capability API would save — precisely because a borrow path (`ModuleInstallClient`, hand-rolled retry) already exists. Across tens of thousands of adopters, 1–3 weeks each is still a large aggregate, but the per-unit delta is what caps S3 at 3.

**Sensitivity:** halve the adopter base *and* halve the per-adopter saving and the verdict does not flip from Prototype — the gates and the strategic/DMA case carry it. But the move from Prototype to Build hinges on a number I don't have: the absolute count of classic-unbundled adopters. **Name the experiment:** pull the AppBrain ML Kit detail page (unblocked network) for %-apps and %-installs, and instrument a developer-preview to measure how many preview adopters are on the classic path vs GenAI. If classic adopters dominate, this is a Build.

---

## Adoption path

1. **The hook:** a developer with a `UNAVAILABLE`-crash bug in production replaces their retry loop with one `status()` listener and a progress bar in an afternoon. The pain is acute and already being searched for.
2. **First real integration:** they gate the feature's UI on `ModelStatus`, show a real download affordance, and handle `BLOCKED_OFFLINE` — replacing the silent failure that generated support tickets.
3. **The dependency:** once the app's UX assumes truthful delivery states (progress bars, offline hints, permanent-ineligible hiding), reverting to the exception-and-hope model is a visible UX regression they'd resist — a dependency they endorse rather than resent.

**First adopter:** an app already filing these issues — a translation or document-scanning app with offline users in growth markets (the #978 Entity-Extraction-in-China reporter is the archetype). **Second wave:** the GenAI adopters hitting #1062, once the unified client also cleans up `checkStatus()` throwing. The reference implementation is a 20-line before/after diff, which is how delivery APIs spread.

---

## Execution plan

- **Developer preview:** ship `ModelDeliveryClient` over the classic optional-module vision path (Segmentation, Face, Barcode) plus Translation progress. Question it answers: *do classic-path developers adopt a status API, and is the offline signal the thing they value?* Partners: 3–5 apps from the issue tracker. Evidence collected: the missing denominator (classic vs GenAI adopter mix) and whether anyone asks for the SLO vs. just the states.
- **Beta (graduation condition):** the API covers every dynamically-delivered ML Kit model under one surface, and preview partners report the `UNAVAILABLE`-crash class eliminated. Checkable: zero new "silent download" issues from preview partners over one quarter.
- **GA:** freeze the status enum and the `DownloadCallback` contract; publish the versioning policy. Decide, on preview evidence, whether to commit the **delivery SLO** — the one genuinely new promise — or ship states-only and defer the contract.

**Org dependency, named honestly:** this requires the **Play Services / module-delivery team** to expose delivery state to ML Kit (zhouyiself's 2022 comment — *"waiting for a download infrastructure update from Play Services"* — says the dependency was the blocker four years ago). If that team says no, ML Kit can still ship states-only over `ModuleInstallClient` wrapping, but not the SLO. The SLO is the part outside ML Kit's unilateral control.

---

## The case against

The strongest case against, argued at full strength: **the platform is about to absorb this itself, so an ML Kit-specific API is redundant on arrival.** Google already owns `SplitInstallSessionStatus`, already shipped `FeatureStatus` for GenAI, already shipped the `AiPackState` machine for custom models, and already points developers at `ModuleInstallClient`. The honest read is that model-delivery observability is converging across Google's stack regardless, and a *new* ML Kit surface risks being a fifth thing that does what four existing things nearly do — adding to exactly the ML Kit / MediaPipe / LiteRT / Firebase fragmentation that is Apple's chief advantage (one unified API) over Google. That is adoption failure mode #2 (the platform absorbs the problem underneath you), and here the platform is you.

This is the live risk, and it is why the verdict is Prototype, not Build. The rebuttal is partial: the value of this idea is *unification* — one client across every ML Kit model, so a developer doesn't wire `ModuleInstallClient` for vision, `FeatureStatus` for GenAI, and `AiPackState` for custom models. If the idea is framed as "a fifth delivery API" it fails; if it's framed as "the one delivery contract that subsumes the others for ML Kit's surface," it's the de-fragmentation move. The mitigation is to build it *as* the convergence, co-owned with the Play delivery team, not beside them.

A secondary, weaker case: per-adopter savings are modest (S3=3), so a skeptic can call this a feature, not a platform API. The platform-test rebuttal is the ~98% reach × tens of thousands of adopters × recurring maintenance, plus the DMA surface — but the skeptic is right that this is a de-risking/DX play, not a blockbuster new capability, and the report should not pretend otherwise.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if, before the preview ships, Google announces a unified cross-ML-Kit delivery/availability API at an I/O or in release notes — or extends `FeatureStatus` to the classic models — this idea is already built by its most likely builder and should be dropped. Checkable test: watch [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) and I/O 2027; if a classic-path availability state machine appears, kill.

**Load-bearing assumption:** that a meaningful population of apps uses the *classic* unbundled models (not just GenAI), so the reach argument isn't secretly a 3.7% argument. Everything rests on this, and it is the number I could not retrieve.

**Re-check trigger if shelved:** a spike in open tracker issues of the #315/#829 class, or the DMA Android-18 implementation (by 1 Aug 2027) forcing a delivery-state surface anyway — at which point building it deliberately beats having it forced.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, because the pain is specific to ML Kit's managed, model-downloaded-by-Play-Services design — LiteRT and MediaPipe make delivery the developer's problem (ship your own file), so they have no delivery state to expose. Firebase AI Logic's hybrid path is cloud-capable and sidesteps the on-device-availability question. The one honest caveat: the *delivery contract* itself may belong to the **Play / module-delivery** team with ML Kit as the first consumer, since that team owns the infrastructure and the DMA obligation. The right structure is ML Kit owning the developer-facing client, Play owning the SLO behind it. Saying that plainly is more valuable than ML Kit claiming sole territory it can't deliver alone.

---

## Open questions

- **How many apps use the classic unbundled models specifically?** The denominator that moves this from Prototype to Build. Settle it by fetching the AppBrain ML Kit detail page on an unblocked network and instrumenting the preview.
- **Did the GenAI-path state machine (`FeatureStatus`/`DownloadCallback`) actually ship as described?** Corroborated via search and the GenAI issue tracker, but `developers.google.com` reference pages were not directly fetchable this session. Settle by opening the reference pages in a browser.
- **What exactly do the eleven DMA feature categories mandate about on-device model availability, and is a delivery API accepted as compliance?** Primary EU portal pages were unreachable; confirm the wording and the 16 Jul 2026 date against the source before relying on them.
- **Will the Play delivery team expose delivery state to ML Kit?** The 2022 blocker. Unknown whether the "infrastructure update" ever landed.

---

## Runners-up

- **On-device eval + token/quality harness (Type D):** Apple shipped an Evaluations framework and token accounting; ML Kit publishes a prose "evaluate prompt quality" page with no code behind it. Strong idea; lost because platform-privilege is weaker (a third party *can* build an eval harness) and it rides only the 3.7% GenAI path.
- **Standalone safety/moderation classifier for user content (Type G):** real regulatory clock (minors laws, Play liability), Bumble open-sourced one. Lost on tunability — safety is each app's policy surface, so a one-size classifier dies on contact with a real T&S team without a tunability story.
- **On-device neural TTS developer API (Type A):** genuine whitespace (Google has nothing; Picovoice sells Orca; Apple shipped speech generation). Lost this run on platform-privilege contest (Picovoice ships cross-platform) and heavier audio-model feasibility — a bigger bet than a delivery contract.
- **GenAI API for sub-8GB devices (Type F):** the highest-reach story in the space, but fails the feasibility-headroom gate today (Nano 4 wants ~12GB); parked with a re-check trigger on small-model quality.

---

*Sources: [mlkit #315](https://github.com/googlesamples/mlkit/issues/315) · [#405](https://github.com/googlesamples/mlkit/issues/405) · [#829](https://github.com/googlesamples/mlkit/issues/829) · [#1062](https://github.com/googlesamples/mlkit/issues/1062) · [#308](https://github.com/googlesamples/mlkit/issues/308) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit Translation (Android)](https://developers.google.com/ml-kit/language/translation/android) · [MlKitException](https://developers.google.com/android/reference/com/google/mlkit/common/MlKitException) · [GenAI FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) · [GenAI DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [Apple Availability enum](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum) · [Apple UnavailableReason](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason) · [SplitInstallSessionStatus](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus) · [DMA Alphabet interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [DMA draft-measures annex PDF](https://digital-markets-act.ec.europa.eu/document/download/bb7151ff-5d0a-420e-abaa-a2bdbfd30c26_en) · [42matters text-processing SDKs](https://42matters.com/sdk-analysis/top-text-processing-sdks) · [42matters ML Kit](https://42matters.com/sdks/android/mlkit) · [AppBrain Firebase](https://www.appbrain.com/stats/libraries/details/firebase/firebase) · [Android distribution (Android Studio data via heise)](https://www.heise.de/-11162154) · [On-device GenAI APIs blog](https://android-developers.googleblog.com/2025/05/on-device-gen-ai-apis-ml-kit-gemini-nano.html)*
