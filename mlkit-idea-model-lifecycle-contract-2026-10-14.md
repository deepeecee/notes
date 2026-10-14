# Model Lifecycle Contract — one observable delivery state machine for every ML Kit model, with an SLO behind it

**Type:** E (Delivery & lifecycle), with a B/C component · **Verdict:** Prototype (developer preview, to harden S1 and the SLO) · **Opportunity: 7/10 (Overdue — and the regulator agrees)**
*2026-10-14 · Prepared for Android ML Kit · Evidence current as of 2026-10-14*

> It's a Tuesday and an Android dev at a 100M-install app ships a translation feature. On a Galaxy A40 it hangs for five minutes on `MlKitException: Waiting for the Barcode UI module to be downloaded`; on a OnePlus a GenAI feature reports "unavailable" with no reason; after a low-storage error the Prompt model is stuck "Downloading" forever and `checkStatus()` never changes. The dev's workaround is to "keep the analyzer alive and hope Play Services eventually downloads the model." ML Kit's own maintainer said a real availability/download API "was planned but [we] didn't have cycle to get to it" — in 2022. It still doesn't exist as one contract.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Overdue | composite 3.8 × 2 = 7.6; no gate at exactly 3 (−0), S1 is 4 not 5 (+0) → 7–8, held at 7 for the self-substitution risk (S5) |
| Platform privilege (gate) | 5/5 — pass | Only Play Services / AICore delivers the models; the official #315 workaround is "use Play Services `ModuleInstallClient`" — a dependency literally cannot observe system-managed delivery ([#315](https://github.com/googlesamples/mlkit/issues/315)) |
| Feasibility headroom (gate) | 5/5 — pass | No model to run; it surfaces state the platform already holds. Classic slice addresses ~98.4% of devices (API 26+, Google-published Dec 2025 distribution) |
| Durability (gate) | 4/5 — pass | ML Kit is a committed surface, and the EU DMA decision (DMA.100220) underwrites an on-device-model interop contract by 2027 — regulation props up durability. Risk: an SLO/version-stability promise is the hard part and Google historically hasn't made one |
| Demand evidence (25%) | 4/5 | Named feature request + maintainer "planned" admission; live 2026 broken-status bug; multi-year still-open cluster; hand-rolled OTA "fleet manager" blogs. Four independent source types converge; traction counts modest, SO unreachable, HN quiet |
| Install-weighted reach (15%) | 4/5 | Rides existing ML Kit integrations (~25–50K apps / ~5–12% install-weighted, est. from TF Lite's 1.08%/10.41% third-party anchor). Big apps dominate installs and care most about delivery reliability → skews high |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Honest: a few engineer-weeks of brittle glue per app, no ML expertise needed, and a borrowed workaround "mostly works" — until a device-specific download failure it can't observe. Value is reliability, not weeks saved |
| Integration cost / TTFHW (15%) | 5/5 | A query + a reactive callback on an SDK already in the build. No key, no permission, negligible size. Under 15 min for an existing integrator |
| Substitute half-life (15%) | 3/5 | 2–3 years. The substitute is Google itself: #315 was "planned," Apple already ships `availability`, and the DMA forces *something* by Aug 2027. Self-redundancy is the live mechanism |
| Strategic complement (10%) | 4/5 | Every fragile API taxes adoption of the whole portfolio; a reliable delivery contract de-risks the entire ML Kit/GenAI story and directly answers the DMA mandate. Android-only (no cross-platform leakage) |
| **Composite** | **3.8** | weighted mean of S1–S6 |

*Least trustworthy line: S2's absolute numbers. ML Kit's own AppBrain row could not be isolated and Google publishes no current adoption count, so install-weighted reach is reasoned from the TensorFlow Lite proxy, not measured.*

---

## The problem

The job: *"As an Android dev who already ships an ML Kit feature, tell me — reliably, reactively, and the same way for every model — whether the model this feature needs is present, downloading, or unavailable-and-why, and promise me something about when it'll arrive."* The competing solution is the developer's own glue code plus an indeterminate spinner and a prayer.

This problem is structurally produced, not an accident of tooling. ML Kit took a deliberate architectural decision years ago: models are **not** bundled, they're **delivered** — downloaded and managed by Play Services (classic unbundled models) or AICore (Gemini Nano). That decision is correct — it's how ML Kit keeps APKs small (every 6 MB of APK costs ~1% of install conversion, Google's own figure) and reaches essentially the whole Play-services base. But delivery you don't own is delivery you can't observe. The moment the platform took ownership of *when the model arrives*, it took on an obligation to tell the app *what's happening* — and it discharged that obligation inconsistently, per-API, with no contract.

The result is a split-personality SDK. For **classic** vision/NL models the only signal is `RemoteModelManager.isModelDownloaded()` — a binary yes/no — plus a fire-and-complete download `Task`: no progress, no state, no reactivity, no version. For **GenAI/Nano** the surface is richer: `checkFeatureStatus()` returns a four-value `FeatureStatus` (`UNAVAILABLE`/`DOWNLOADABLE`/`DOWNLOADING`/`AVAILABLE`) with a byte-level `DownloadCallback`. Two models, two mental models, neither reactive, neither versioned, and — critically — **neither carries a commitment about delivery time or what the app may rely on.** A 100M-install app that uses both (scan + summarize) writes two different capability-detection-and-fallback blocks for one conceptual question.

Worse, the richer GenAI path is itself unreliable: when AICore is present but the feature isn't provisioned, `checkFeatureStatus()` **throws** `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`, so "the documented mitigation itself throws" ([#1062](https://github.com/googlesamples/mlkit/issues/1062), verified directly, opened 2026-07-16). The one place ML Kit built a status enum, the status contract leaks.

---

## Proof & signals

- **The exact API, requested by name, with a Google admission of intent.** Feature request #315, *"[Feature Request] ML Kit: On-Device Model Download API"*: *"There is still no way to get availability and download status of the unbundled standard ML Kit models… we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline this won't happen at all and we have no indicator about that."* Maintainer reply: *"Yes… We had it planned but didn't have cycle to get to it."* Opened 2021-06-21, closed 2022-08-31 by pointing at a `ModuleInstallClient` workaround. [Link](https://github.com/googlesamples/mlkit/issues/315). *Evidence status: confirmed by the demand agent against the live GitHub thread.*
- **The status contract is broken right now.** #1062 (above): `checkFeatureStatus()` throws instead of reporting, reproduced on Pixel 9a and Pixel 10, 2026-07-16, **open**. *Confirmed — I fetched the issue directly.*
- **A multi-year, still-open cluster of opaque-delivery failures.** #1080 "Prompt API Stuck at 'Downloading' After Low Storage Error" — `checkStatus()` never changes (2026-10-12, open); #641 "Waiting for the Barcode UI module… hung >5 min" on a Galaxy A40 (2023-03-15, open, 12 comments); #954 S25 every module unavailable (2025-06-19, open); #944 OnePlus 12 "Feature Unavailable" with no why (2025-05-26, open); #1063, #985, #59. *Confirmed by the demand agent against the live tracker; the same failure class spans 2019→2026.*
- **Ecosystem building the missing layer by hand.** Tian Pan, *"on-device AI needs a fleet manager, not a model card"* — argues for a device-class→model-variant manifest deployed independently of the app binary with its own rollback semantics ([link](https://tianpan.co/blog/2026/04/28/on-device-ai-fleet-manager-not-model-card)). ContextSDK and Ertas publish OTA-model-delivery series (version polling, background download, rollback). Back Market's engineering blog flags that because ML Kit models are "downloaded and managed externally" it "may not work reliably on some users' devices" ([link](https://engineering.backmarket.com/on-device-object-detection-on-android-choosing-between-ml-kit-and-yolo-22dc8ede0b12)). *Convergent, but each a single data point.*
- **The absence signal.** Only one hand-rolled "ML Kit model download" repo clears 10 stars (ciddwd/overlay-translator, ~1,013★); the long tail is <10★. HN is genuinely quiet on model-delivery-as-platform-problem. Stack Overflow was **unreachable** with the available tools — treat its silence as a tooling gap, not as evidence. *Read: the pain is real and recurring, concentrated in the issue tracker rather than in a groundswell of OSS reimplementation — consistent with a problem only the platform can fix, so nobody bothers to build the workaround twice.*

---

## Why now

1. **Capability shift (Jul 2026).** ML Kit's GenAI surface matured — Structured Output, System Instructions, Thinking Mode landed in the Prompt API (2026-07-14; Prompt at 1.0.0-beta4) on Gemini **Nano 4** (not v3; the April 2026 model, "up to 4× faster, 60% less battery"). The richer the on-device feature set, the more a feature *depends* on a specific model being present and a specific version behaving consistently — which is exactly what today's delivery surface can't guarantee. *Confirmed against ML Kit release notes via the freshness agent; snapshot corrected v3→v4.*
2. **Competitive shift (WWDC 2025→2026).** Apple ships `SystemLanguageModel.availability` as a *reactive, `Observable`, reason-typed* enum: `.available` / `.unavailable(.deviceNotEligible | .appleIntelligenceNotEnabled | .modelNotReady)`. One consistent availability contract across every model-backed feature. *Confirmed against first-party Apple docs.* ML Kit's split binary/4-state surface is the visible gap a developer comparing the two platforms sees first.
3. **Regulatory shift (16 Jul 2026 → 1 Aug 2027).** Under the DMA (case **DMA.100220**, Article 6(7)), the Commission's specification measures require Alphabet to give third parties effective interoperability with Android features **including the on-device model (ODM)**, *"free of charge"* and *"equally effective"* as Alphabet's own services, targeted at **Android 18 by 1 August 2027** (hotword detection deferred to Android 19 / 2028). *Scope and Article confirmed; the precise adoption date has conflicting sources — the case PDF cited by the freshness agent says 16 July 2026, one press source expected ~27 July, and the public path is a consultation/specification proceeding — so treat "a dated, binding DMA proceeding mandating observable, equally-effective third-party access to the on-device model by 2027" as the load-bearing claim, not any single date.* Primary source: [EC DMA portal](https://digital-markets-act.ec.europa.eu/dma100220-consultation-proposed-measures-interoperability-google-android-article-67-dma_en); analysis: [Wolters Kluwer](https://legalblogs.wolterskluwer.com/competition-blog/keeping-the-gate-the-european-commission-issues-its-specification-decision-on-alphabets-operating-system-interoperability-with-ai-assistants/).

All three are real and dated. The why-now is unusually strong because the regulatory leg converts "nice to have" into "must expose anyway."

---

## The capability gap

What ships today, checked against the docs:

- **ML Kit classic:** `RemoteModelManager.isModelDownloaded()` (binary), `download()`/`downloadModelIfNeeded()` (Task success/failure), `getDownloadedModels()`, `deleteDownloadedModel()`. No state enum, no progress, no reactivity, no version query, no SLO. [Reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) *(prior-art agent; `developers.google.com` was DNS-blocked to my own WebFetch this session, so the reference-page constant lists are the agents', corroborated below).*
- **ML Kit GenAI:** `FeatureStatus` (4 states) + `DownloadCallback` (byte progress). Richer, but one-shot (not subscribable), unversioned, and leaky (#1062). Corroborated independently: the Flutter wrapper branches on `downloadable` (start download) and `available` (generate), confirming a multi-state — not binary — status. [pub.dev](https://pub.dev/documentation/google_mlkit_genai_prompt/latest/).
- **Play for On-device AI / Asset Delivery:** the richest state model (`AssetPackStatus`: PENDING/DOWNLOADING/TRANSFERRING/COMPLETED/FAILED/CANCELED/WAITING_FOR_WIFI/…) + byte progress — **but only for your own uploaded model packs**, not ML Kit's own managed models, and still no SLO. [Reference](https://developer.android.com/google/play/on-device-ai).
- **Firebase AI Logic:** availability is *masked* by `PREFER_ON_DEVICE`/`PREFER_IN_CLOUD` fallback routing, not exposed as an observable signal.
- **Apple Foundation Models:** reactive, reason-typed `availability` (ships it) — but no download progress, no discrete "downloading" state (`modelNotReady` conflates it), and no delivery SLO either.
- **Qualcomm / Samsung / MediaTek:** build-time model toolchains; **no** runtime third-party delivery-observability API.

**The precise gap** (nobody ships any of these): (a) a *single, reactive* availability+delivery lifecycle unifying classic ML Kit and GenAI/Nano; (b) *runtime model-version observability* so an app can pin behavior and detect output drift across refreshes; (c) *any delivery-time SLO* — no vendor, Apple included, commits to one.

**Main competitor:** the developer's own `ModuleInstallClient`/`isModelDownloaded()` polling loop plus an indeterminate spinner. Not a rival SDK — their own brittle code, which is the #315 workaround verbatim.

---

## Proposed surface

A `ModelLifecycle` contract exposing one observable state for any ML Kit model, classic or GenAI:

```kotlin
// One API for every ML Kit model. Reactive, versioned, with a reason on every negative.
val lifecycle = ModelLifecycle.of(TranslateRemoteModel.Builder("es").build())
//            or ModelLifecycle.of(GenAiFeature.SUMMARIZATION)

lifecycle.state.collect { s ->          // Flow<ModelState> — survives config changes
  when (s) {
    is Available    -> enableFeature(s.modelVersion)        // (b) version observable
    is Downloading  -> showProgress(s.bytesDownloaded, s.bytesTotal, s.etaOrNull)
    is Downloadable -> showOptInToDownload()
    is Unavailable  -> explain(s.reason)   // DEVICE_INELIGIBLE / OFFLINE_NO_MODEL /
                                           // QUOTA_EXCEEDED / STORAGE_LOW / NOT_PROVISIONED
  }
}
val plan = lifecycle.deliveryPlan()      // (c) the SLO the platform commits to
```

What it deliberately does **not** do: it does not run inference, does not change device gating, does not promise a model will *become* available where hardware is ineligible — it promises an *honest, reason-typed, reactive signal* and a *delivery plan*, nothing more. The SLO is modest and keep-able: e.g. "on a reachable network, a `Downloadable` model reaches `Available` or `Unavailable(reason)` within N seconds; it never dead-ends silently in `Downloading`" — which is exactly the guarantee #1080 and #641 show is missing today.

**TTFHW target: under 15 minutes** for an existing ML Kit integrator — one `ModelLifecycle.of(...)` call and a `collect`. Met because the state already exists inside Play Services/AICore; this is surfacing, not computing. The design constraint that makes it hit 15 min is API *parity*: the same type for classic and GenAI, so the developer learns it once.

---

## Reach & sizing

*All app/install figures are third-party estimates (AppBrain, crowd-sourced, unpublished methodology); the Android version distribution is Google-published (Android Studio dataset, 7-day window ending Dec 1 2025). Arithmetic is mine.*

- **Device eligibility.** Classic slice: API 26+ = **98.4%** of devices — effectively the whole modern fleet. GenAI/Nano slice: API 31+ = 69.3% is only a loose ceiling; real AICore-capable hardware is low-single-digit %. So today the contract's value is ~95% driven by the classic slice. This is a *feature, not a bug*: it's the rare on-device idea that doesn't live or die on Nano's ~3.7% reach.
- **Install-weighting.** TensorFlow Lite (the on-device-ML anchor) = 1.08% of apps / 10.41% of installs → **m_install ≈ 9.6×** (my arithmetic). ML Kit's own AppBrain line couldn't be isolated; estimating ML Kit at ~1–2.5% of apps and m_install ≈ 5–9× → **install-weighted reach ≈ 5–12% of the Play-services install base**, ~25–50K apps (Google's last public figure was "25,000+ apps," 2020 — stale).
- **Adoption ceiling.** Because this rides *existing* ML Kit integrations, the ceiling is ML Kit's current reach, and the only funnel is opt-in to one more optional API: realistic 3-yr uptake ~10–40% of the eligible base = ~2.5K–20K apps, **install-weighted skewing to the high end** (large apps dominate installs and are precisely the ones filing #315-class issues).
- **Engineering cost avoided.** ~2.5–20K apps × ~2–6 brittle engineer-weeks each (delivery glue + perpetual cross-device breakage maintenance) — real but not enormous per app. The platform test passes mainly on the *reliability externality* (one embarrassing hang in a 100M-install app) and the DMA obligation, not on weeks-saved.
- **Sensitivity.** Halve p_job (fraction of ML Kit apps that care about delivery observability) and halve the ceiling and the *weeks-saved* case weakens materially — but the verdict doesn't flip, because the privilege, feasibility, and regulatory legs don't depend on the sizing. The honest reading: **size this as risk-reduction and compliance, not as a TAM play.**

---

## Adoption path

1. **The hook:** an existing ML Kit app replaces its indeterminate spinner with `lifecycle.state.collect { … }` in one sitting and finally shows users a real progress bar and an actionable "unavailable because offline" message.
2. **First real integration:** the app routes on reason codes — fall back to cloud on `DEVICE_INELIGIBLE`, retry on `STORAGE_LOW`, queue on `OFFLINE_NO_MODEL` — replacing the hand-rolled `ModuleInstallClient` loop.
3. **The dependency:** once the app pins behavior to `modelVersion` and relies on the SLO for its own UX promises, removing it means re-accepting silent dead-ends — a dependency they'd endorse, not resent.

**First adopter:** a translation/scanner app of the #315/#641 class (they already asked). **Second wave:** GenAI adopters once #1062-style status leaks are closed and version-pinning lets them ship against output-stability guarantees. The reference implementation is the seed side — Google's own samples adopt it, which is costless to coordinate.

---

## Execution plan

- **Developer preview:** ship the unified `ModelState` over the *classic* path first (the 98.4% slice, no AICore dependency). Question it answers: do integrators adopt a reactive state they previously polled? Evidence collected: opt-in rate + whether #315-class issues stop recurring. Partners: the apps on the open issues.
- **Alpha/Beta:** add the GenAI path (fixing #1062 as table stakes) and `modelVersion`. Graduation condition: the status API no longer throws on any provisioned/unprovisioned combination in the device matrix, and version is observable for Nano 4.
- **GA:** commit the SLO and the output-stability/version contract. This is the surface you hold for five years — and the one the DMA will measure "equally effective" against.
- **Org dependencies (named honestly):** this needs **Play Services** and **AICore** to expose internal delivery state to ML Kit — ML Kit cannot ship (c) alone. If those teams don't say yes, the idea collapses to a thin reactive wrapper over `isModelDownloaded()` (still useful, but not the contract). The DMA obligation is the lever that gets them to yes.

---

## The case against

The strongest argument against is **failure mode #2: the platform absorbs the problem underneath you — and here "the platform" is you.** Google said in 2022 this was "planned." Apple already ships the reactive availability API. The DMA will force Alphabet to expose on-device-model interoperability by 2027 regardless. So a skeptic says: this isn't an *opportunity*, it's an *obligation Google will discharge anyway*, and writing it up as a product idea dresses up a compliance task. That's a fair hit, and it's why the verdict is Prototype, not Build, and why S5 (substitute half-life) is only 3 — the substitute is Google's own roadmap.

The rebuttal is narrow but real: the DMA mandate specifies *access* and *equal effectiveness* for third-party **AI assistants**, not a clean, documented, reactive **developer SDK contract** for the ~25–50K apps already on ML Kit — those are different deliverables, and the second won't fall out of the first for free. Doing it well, as a unified `ModelLifecycle`, is the difference between satisfying a regulator and actually fixing #315. The secondary risk — that a *one-size SLO* is unholdable across the device fleet's thermal/quota/storage variance — is handled by making the SLO about *honesty and liveness* ("never dead-end silently; always resolve to a reason") rather than a wall-clock guarantee the platform can't keep.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if Google's own roadmap (or the DMA Android 18 implementation, by ~1 Aug 2027) already schedules a *unified, reactive, versioned* model-availability contract spanning classic + GenAI — not just AI-assistant interop — then this is a compliance line item, not a product bet, and should fold into that work. Checkable at the next ML Kit release-notes drop and the DMA Android 18 spec publication (draft eligibility terms due ~Feb 2027).

**Load-bearing assumption:** that Play Services and AICore will expose their internal delivery/version state to an ML Kit public surface. Everything above (b) and (c) rests on it.

**Re-check trigger if shelved:** a spike in #315/#1062-class issues after Nano 4 broadens, or Apple extending `availability` with progress + an SLO (which would make ML Kit's gap the headline comparison).

---

## Fit for this team

ML Kit is the right owner, narrowly. The problem is *its own delivery decision* (unbundled, Play-Services-managed models) producing *its own* observability debt across *its own* two model paths — MediaPipe/LiteRT don't have this split, Firebase AI Logic deliberately hides availability behind routing, and the Android framework is too low to own an ML-Kit-shaped contract. The one caveat: parts (a)–(c) require Play Services + AICore cooperation, so ML Kit owns the *surface and the contract* but not the *plumbing* — the report's execution plan treats that as the central org risk, not a footnote. If the org can't secure that cooperation, the honest conclusion is that this belongs wherever AICore delivery lives, with ML Kit as the public face.

---

## Open questions

- **Exact `FeatureStatus` constant list and whether a classic-path state enum has quietly shipped since Aug 2026.** `developers.google.com` was DNS-blocked to direct fetch this session; corroborated via the Flutter wrapper and two agents, but a manual load of the live reference + release-notes page would settle it.
- **The precise DMA.100220 adoption date and whether the current instrument is a final binding decision or a specification/consultation measure.** Sources conflict (16 Jul vs ~27 Jul; "decision" vs "proposed measures"). The primary case PDF would settle it; it does not change the why-now.
- **Current real ML Kit adoption.** Google publishes none; the 2020 "25,000+ apps" is stale and AppBrain can't isolate the ML Kit line. This is the biggest sizing gap.
- **Does the DMA's "on-device model" interoperability already imply a reactive availability API, making (a) redundant?** Needs the Android 18 spec text (not yet published).

---

## Runners-up

- **On-device GenAI eval/regression harness (Type D):** Apple shipped an Evaluations framework; ML Kit ships a prose "evaluate prompt quality" page linking out to cloud Vertex, with no harness. Strong, under-proposed — lost on thinner demand evidence than the delivery pain.
- **Standalone on-device safety/moderation classifier (Type G):** regulatory clock (age-assurance laws from Jan 2026, Play output liability) + Bumble's open-sourced classifier as precedent — lost on the "one-size classifier is unusable to a real T&S team" tunability risk (a G1/durability wobble).
- **Sub-8 GB GenAI reach tiering (Type F):** the biggest strategic prize (closing the 3.7% Nano gap) — lost on the feasibility gate; the honest version lands at Shelve/Prototype, a weaker verdict than this.
- **On-device neural TTS (Type A):** clean whitespace (Google has no modern TTS API; Apple and Picovoice do) — lost on narrower install-weighted reach and a cold-start adoption funnel versus a contract that rides existing integrations.

---

*Sources:*
- [ML Kit issue #315 — On-Device Model Download API feature request](https://github.com/googlesamples/mlkit/issues/315)
- [ML Kit issue #1062 — checkFeatureStatus() throws 606 instead of UNAVAILABLE](https://github.com/googlesamples/mlkit/issues/1062)
- [ML Kit issue #1080 — Prompt API stuck at Downloading after low storage](https://github.com/googlesamples/mlkit/issues/1080)
- [ML Kit issue #641 — Waiting for Barcode UI module to be downloaded](https://github.com/googlesamples/mlkit/issues/641)
- [ML Kit issue #954 — Feature unavailable on Galaxy S25](https://github.com/googlesamples/mlkit/issues/954)
- [ML Kit issue #944 — Device support for GenAI models (OnePlus 12)](https://github.com/googlesamples/mlkit/issues/944)
- [RemoteModelManager reference (classic model management)](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [ML Kit GenAI Prompt (Flutter) — checkFeatureStatus downloadable/available](https://pub.dev/documentation/google_mlkit_genai_prompt/latest/)
- [Play for On-device AI / Asset Delivery reference](https://developer.android.com/google/play/on-device-ai)
- [Apple SystemLanguageModel.availability (UnavailableReason)](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)
- [EC DMA.100220 — Alphabet Android AI interoperability (Article 6(7))](https://digital-markets-act.ec.europa.eu/dma100220-consultation-proposed-measures-interoperability-google-android-article-67-dma_en)
- [Wolters Kluwer — EC specification decision on Alphabet OS/AI-assistant interoperability](https://legalblogs.wolterskluwer.com/competition-blog/keeping-the-gate-the-european-commission-issues-its-specification-decision-on-alphabets-operating-system-interoperability-with-ai-assistants/)
- [Tian Pan — on-device AI needs a fleet manager, not a model card](https://tianpan.co/blog/2026/04/28/on-device-ai-fleet-manager-not-model-card)
- [Back Market Engineering — ML Kit vs YOLO (external model management reliability)](https://engineering.backmarket.com/on-device-object-detection-on-android-choosing-between-ml-kit-and-yolo-22dc8ede0b12)
- [Gemma 4 / Gemini Nano 4 announcement (Apr 2026)](https://android-developers.googleblog.com/2026/04/gemma-4-new-standard-for-local-agentic-intelligence.html)
- [Android on-device inference — 140M+ devices (Jul 2026)](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html)
- [AppBrain machine-learning SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
