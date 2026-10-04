# Unified Model Delivery Contract — give classic ML Kit the download state machine its GenAI APIs already have

**Type:** B/E (extension to a shipping API, delivering a lifecycle contract) · **Verdict:** Build · **Opportunity: 8/10 (De-risked)**
*2026-10-04 · Prepared for Android ML Kit · Evidence current as of 2026-10-04*

> On a Tuesday a developer ships a translation feature, a user in a dead zone opens it, ML Kit throws `MlKitException.UNAVAILABLE`, and the app has no way to know whether the model is downloading, stalled, or will never arrive — so the developer keeps the analyzer alive and *hopes Play Services downloads it*. One of them (auto-lyrics PR #7, merged Sept 2026) hand-built a poll loop, a 5-minute timeout, a progress bar capped at 99% until the model "confirms usable," and per-language retry latching — reconstructing an entire delivery layer ML Kit doesn't expose. The GenAI/Nano path has shipped exactly that state machine since I/O 2025. Classic ML Kit, which reaches ~96% of the fleet, still returns a bare boolean.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 8/10 — De-risked | Composite 4.50 → formula yields 9–10 (S1=5 bonus); adjusted **down to 8** because the GenAI half of the contract already ships and ML Kit's exact adoption share is unpinned |
| Platform privilege (gate) | 5/5 — pass | Model bytes are delivered by Play Services / AICore; a Gradle dependency can only reverse-engineer `DownloadManager`. `RemoteModelManager` is Google-owned surface ([ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)) |
| Feasibility headroom (gate) | 5/5 — pass | The contract already runs in production on GenAI: `FeatureStatus{DOWNLOADABLE,DOWNLOADING,AVAILABLE,UNAVAILABLE}` + `DownloadCallback` byte progress ([ref](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback)). No model to train, no quality ceiling |
| Durability (gate) | 4/5 — pass | Google already owns both `RemoteModelManager` and the GenAI contract; the real commitment is an availability/progress SLO across the fleet. DMA forward-parity clause pushes *toward* durability |
| Demand evidence (25%) | 5/5 | Dated, fetchable signals 2018→2026 in Google's own repos; two apps hand-rebuilt the whole layer. Thin only on *volume* quantification (SO/Reddit blocked) |
| Install-weighted reach (15%) | 4/5 | Classic ML Kit is unbundled via Play services → availability tracks ~96.1% of devices at API 26 (third-party). Comparable on-device ML SDKs carry ~9× install-weighting |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Devs demonstrably hand-roll it, and the borrowed versions are buggy (DeutschPlan #756). But each app's version is engineer-weeks, not months — the value is correctness, not raw hours |
| Integration cost / TTFHW (15%) | 5/5 | A status enum + callback is a few lines, no new permission, no APK growth, works in the emulator. The GenAI version already hits this |
| Substitute half-life (15%) | 4/5 | A general model cannot substitute for a delivery contract. The only real substitute is *Google's own* roadmap (Play for On-device AI, `ModuleInstallClient`) absorbing it |
| Strategic complement (10%) | 5/5 | De-risks adoption of every ML Kit API at once; increases AICore/Nano pull; the DMA makes a reference delivery contract strategically necessary anyway |
| **Composite** | **4.50** | Weighted mean of S1–S6 |

*Least trustworthy line: S2. ML Kit's own AppBrain row (%apps / %installs) would not render through fetching, so the install-weighting multiplier is a bounded range (~2–9×), not a point estimate.*

---

## The problem

A large consumer Android app's ML Kit feature has two states the app cares about that ML Kit mostly won't tell it: *is the model here yet*, and *if not, what should I show the user right now*. Classic ML Kit's answer is impoverished. `RemoteModelManager.isModelDownloaded()` returns a `Task<Boolean>` — downloaded or not, with no "downloading," no progress, and no typed failure. The vision base APIs (face, text, barcode via `play-services-mlkit-*`) don't even offer that: if the model isn't present, the inference `Task` fails with `MlKitException.UNAVAILABLE`, documented as "transient, retry with backoff," and the developer is redirected out to the generic GMS `ModuleInstallClient` to query or trigger installation ([TextRecognizer ref](https://developers.google.com/android/reference/com/google/mlkit/vision/text/TextRecognizer); [MlKitException ref](https://developers.google.com/android/reference/com/google/mlkit/common/MlKitException)).

This is structurally produced, not an accident of current tooling. ML Kit's defining design choice is that models are delivered unbundled through Play Services to keep APK size down — every 6 MB of APK costs ~1% of install conversion (Google-published). The consequence of not bundling is that the model's arrival is an asynchronous, network-dependent, Play-Services-owned event that the app does not control and, today, cannot observe. The size win and the observability gap are the same decision seen from two sides. A 100M-install app operating across a device fleet where [more than half of Indian and Indonesian users have no wifi](https://developers.google.com/ml-kit) (Google-published, atlas P13) hits the unobservable-delivery failure at scale, in exactly the markets where install-size sensitivity made unbundling attractive in the first place.

What they do *instead* today is the tell. They reverse-engineer the delivery layer. `whoxamxl/auto-lyrics` PR #7 (merged 2026-09-14) had to "poll actual model availability, and time out after 5 minutes of active download time," "cap transfer progress at 99% while ML Kit is still installing/verifying the completed model," "use an indeterminate progress bar while byte progress is unknown (`0 B / ?`), then switch to real determinate progress once `DownloadManager` exposes transferred / total bytes," and "pause the 5-minute model timeout while the device is thermally restricted." That is a from-scratch reimplementation of a delivery state machine, written against ML Kit's absence of one.

---

## Proof & signals

Every item below is a dated artifact in a Google-owned or public repo. Evidence status is marked per item. Stack Overflow and Reddit were not fetchable this run, so the *volume* of the signal is undercounted — that is a gap, not a negative.

- **Developers asked Google for this exact API in 2018 and it's still unmet.** [firebase/quickstart-android #586](https://github.com/firebase/quickstart-android/issues/586) (2018-08-07): *"It would be nice if there were 3 callbacks for the following scenarios: 1. The model download was initiated 2. The download completed 3. The download failed"* — because without them "users can attempt to use the model before it's available, causing exceptions." *(Direct, Google repo.)*

- **Two independent apps hand-rebuilt the whole layer.** `auto-lyrics` PR #7 (quoted above). And [MdRahmatUllah/DeutschPlan #756](https://github.com/MdRahmatUllah/DeutschPlan/issues/756) (2026-09-27): a hand-built progress/notification wrapper that "remained frozen at 11% throughout an entire download that progressed to completion (10% → 92% → Ready)," i.e. buggy *because* it's reverse-engineering `DownloadManager` bytes. *(Direct; caveat: small solo repos.)*

- **The sanctioned workaround is blind retry.** [googlesamples/mlkit #740](https://github.com/googlesamples/mlkit/issues/740) (2023-10-05) quotes ML Kit's own error string: *"Translation model files not found. Make sure to call downloadModelIfNeeded and if that fails, delete the models and retry."* "Delete and retry" is the gap baked into the error message. *(Direct, Google repo.)*

- **Download reliability is opaque even to sophisticated developers.** [mlkit #837](https://github.com/googlesamples/mlkit/issues/837) (2024-06-17): *"this process fails... my users complain that they are unable to download the model even though their Internet connection is stable... Is there any way this process can be improved?"* And [mlkit #978](https://github.com/googlesamples/mlkit/issues/978) (2025-09-26): in mainland China "Dynamic model download cannot reliably complete... Without a successful download, the Entity Extraction API cannot run at all." *(Direct, Google repo.)*

- **The canonical runtime failure.** [firebase-android-sdk #1275](https://github.com/firebase/firebase-android-sdk/issues/1275) (2020-02-25): *"FirebaseMLException: Waiting for the text recognition model to be downloaded. Please wait."* — inference throws "waiting," app can't tell when "please wait" ends. *(Direct, Google repo.)*

- **The GenAI status API — the one that already exists — is itself unreliable.** [mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) (2026-07-16): `checkFeatureStatus()` "throws `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`" when AICore is present but the feature isn't provisioned — code written exactly per the docs crashes instead of reaching the fallback branch. *(Direct, Google repo — load-bearing for "fix, don't just copy" below.)*

- **Google has acknowledged the specific gap.** On the classic `RemoteModelManager` download API: "the download API doesn't report the exact downloading progress... Google has stated that if there is more interest they would consider adding it." *(Secondary, surfaced via search — [unverified] against a primary Google statement; flagged for a browser re-check.)*

- **The absence signal:** no unified OSS library offering a model-availability state machine for Android exists — only generic file-download managers and local-model loaders. Developers aren't borrowing a solved thing; they're each solving it badly. Silence here means "no substitute," which strengthens the case rather than weakening it.

---

## Why now

1. **Capability shift — the contract already exists, on one path.** ML Kit's GenAI APIs shipped `FeatureStatus` (4 states) + `DownloadCallback` (`onDownloadStarted(bytesToDownload)`, `onDownloadProgress`, `onDownloadCompleted`, `onDownloadFailed`) at Google I/O 2025. The expensive design question — what should the state machine look like — is answered and in production. This is now a port, not an invention.

2. **Regulatory shift with a hard date.** The European Commission's Article 6(7) specification decision **DMA.100220** (adopted **16 July 2026**) compels Alphabet to let third-party AI assistants call system-level on-device models — explicitly "the Gemini Nano ODMs… hosted by AICore" — at "equal access (for example, in terms of performance)," implemented in **Android 18 by 1 August 2027** (Google appealed ~29 Sept 2026; the appeal does not suspend the deadline). The decision mandates *access and parity* but is substantively **silent on delivery mechanics** — no SLA, no lifecycle, no state machine. By 1 Aug 2027 a whole population of non-Google callers will suddenly need to know, at runtime, which model/version is present and whether it's ready — and nothing in the regulation gives them that. The idea occupies exactly the gap the regulation opens. *(Primary EC PDF was egress-blocked; reconstructed from search synthesis of the decision + annex — treat exact wording as [unverified], but the Android-18/1-Aug-2027 deadline was corroborated across sources.)*

3. **Demand shift.** On-device GenAI is now something apps are actively trying to ship (mlkit #1062, #1063, #978 are all 2025–2026 GenAI download failures), which means the delivery-opacity pain that classic ML Kit has had since 2018 is now recurring on every new model family as it lands — the clearest signal it's structural, not incidental.

---

## The capability gap

Stated as a boundary, with the page checked for each:

- **ML Kit classic (`RemoteModelManager`)** — boolean `isModelDownloaded()` + a `Task` that resolves success/failure; `DownloadConditions` (wifi/charging). **No state enum, no progress.** ([ref](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager))
- **ML Kit vision base APIs** — no query API at all; `UNAVAILABLE` on miss, redirected to GMS `ModuleInstallClient`. ([ref](https://developers.google.com/android/reference/com/google/mlkit/vision/text/TextRecognizer))
- **ML Kit GenAI** — the full contract exists: `checkFeatureStatus()` + `DownloadCallback` byte progress. ([ref](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus)) **This is the pattern to generalize.**
- **GMS `ModuleInstallClient`** — generic `areModulesAvailable()` / `installModules()` / `ModuleInstallStatusUpdate` + `ProgressInfo` bytes. Closest existing "query + trigger + progress" for classic models, but ML-untyped and off to one side. ([ref](https://developers.google.com/android/guides/module-install-apis))
- **Play for On-device AI / Feature & Asset Delivery** — full `DOWNLOADING→INSTALLED` progress state machines, but for *your* bundled packs, not ML Kit's own managed models. ([ref](https://developer.android.com/google/play/on-device-ai))
- **Firebase AI Logic** — exposes a routing *fallback* policy (`PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, …), not a download/availability state machine.
- **Apple Foundation Models** — `SystemLanguageModel.availability` returns `.available` / `.unavailable(reason)` with a distinct `.modelNotReady` ("still downloading") reason — an availability contract, but **no progress percentage and no app-triggered/observed download**. ([ref](https://developer.apple.com/documentation/foundationmodels))

**The precise gap:** ML Kit has a production-quality delivery state machine for ~3.7% of the fleet (GenAI/Nano) and essentially nothing for the ~96% reached by classic models. There is no *unified* availability+progress+typed-error contract spanning both paths. **The main competitor a developer uses today** is their own hand-rolled polling layer over `DownloadManager` bytes — not another SDK.

---

## Proposed surface

A single `ModelDownloadManager`-style contract, identical in shape to the GenAI `DownloadCallback`, extended to classic `RemoteModel`s and (via `ModuleInstallClient` underneath) the vision base models. Stated as a diff against today:

```kotlin
// TODAY (classic): a boolean and a hope
val mgr = RemoteModelManager.getInstance()
mgr.isModelDownloaded(model).addOnSuccessListener { downloaded -> /* true | false */ }
mgr.download(model, conditions).addOnSuccessListener { /* done, somehow */ }

// PROPOSED: the GenAI contract, generalized
when (mgr.checkStatus(model)) {           // AVAILABLE | DOWNLOADABLE | DOWNLOADING | UNAVAILABLE(reason)
  AVAILABLE    -> run(model)
  DOWNLOADABLE -> mgr.download(model, conditions, object : DownloadCallback {
      override fun onDownloadStarted(bytesToDownload: Long) { showDeterminateIfKnown(bytesToDownload) }
      override fun onDownloadProgress(bytesDownloaded: Long) { updateBar(bytesDownloaded) }
      override fun onDownloadCompleted() { run(model) }
      override fun onDownloadFailed(e: ModelDownloadException) { branch(e.reason) }  // NETWORK | STORAGE | UNSUPPORTED | ...
  })
  DOWNLOADING  -> observeExistingDownload(model)   // join an in-flight download, don't start a second
  is UNAVAILABLE -> showFallback(reason)           // typed: offline, bootloader-unlocked, quota, device-ineligible
}
```

- **What it is:** one availability enum, byte-level progress, a typed failure reason, and "join the in-flight download" semantics — the exact things the two hand-rolled repos built, minus their bugs.
- **What it deliberately is *not*:** not an uptime SLA; not a promise that any given model exists for any given device; not a background scheduler (that's a separate Type-E idea). It observes and reports; it does not guarantee delivery.
- **Fix, don't just copy:** the port must resolve mlkit #1062 (`checkStatus` throwing `606` instead of returning `UNAVAILABLE`) — the contract is only worth shipping if the status call never throws for a status it has a value for.
- **Time-to-first-hello-world target: under 15 minutes.** Achievable because it adds no permission, no APK size, and no key — it's a method surface on an SDK already in the build. The design constraint it must honor: the enum and callbacks must be identical across classic and GenAI, so a developer learns the contract once.

---

## Reach & sizing

Show the arithmetic; inputs are ranges because the load-bearing adoption row didn't render.

- **Device eligibility (`r_reach`):** classic ML Kit is unbundled via Play services → availability ≈ the Play-services base, **96.1% of devices at API 26** (third-party, apilevels.com / Statcounter, Apr 2026 data). GenAI is gated far narrower (~3.7% of the fleet, my arithmetic on Google's 140M+ Nano devices vs a ~3.8B third-party active base). Gating at API 31 instead of 26 costs 96.1 − 78.8 = **17.3 points** (my arithmetic).
- **Adoption (`c_ceiling`, `m_install`):** the best-adopted *standalone* on-device ML SDK, TensorFlow Lite, sits at ~1.1% apps / ~10.5% installs (third-party, AppBrain) → install-weighting multiplier **~9×** (my arithmetic, 10.5/1.17). ML Kit's classic vision APIs (barcode, text, face) are more broadly embedded than TF Lite, so its multiplier should sit in the **~2–9× band**, bounded below by universal infrastructure like Firebase (~1×) and above by TF Lite (~9×). The only Google-published aggregate is stale: "more than 25,000 applications… make use of ML Kit's features" (2020).
- **Install-weighted reach:** because the contract spans the whole classic surface rather than the GenAI ceiling, every ML Kit adopter is in scope. If ML Kit's installed share is even mid-single-digits with a ~5× multiplier, install-weighted reach is comfortably **double-digit % of the Android surface** — an order of magnitude above any GenAI-only idea, which is capped at ~3.7% by hardware.
- **Engineering cost avoided:** each adopter that hand-rolls delivery spends ~2–6 engineer-weeks building and maintaining a buggy version (bottom-up from auto-lyrics PR #7 and DeutschPlan #756). Across even a few thousand serious adopters that is thousands of engineer-weeks of duplicated, defect-prone work the platform absorbs once.

**Sensitivity:** halve both the adoption share and the multiplier and the reach falls from double-digit to low-single-digit % — but the verdict **survives**, because the demand is proven (not modeled) and the build cost is a port of a shipping contract, so the platform test (value ÷ build+maintenance) stays well above 10× even on the pessimistic inputs. The one experiment that would settle the magnitude: pull ML Kit's actual AppBrain row (or the Play SDK Index) in a browser.

---

## Adoption path

1. **The hook:** a developer with an existing `UNAVAILABLE` crash in production adds a status `when` block and a progress bar in an afternoon and deletes their polling code. The before/after diff above *is* the marketing.
2. **First real integration:** they ship a real "downloading your language model…" UI with a typed offline fallback, replacing the "keep the analyzer alive and hope" pattern. What it replaces is a support-ticket source.
3. **The dependency:** once the UX is built on typed states and progress, reverting means rebuilding the hand-rolled layer — a cost they'd endorse paying to avoid, not resent.

**First adopter:** a translation- or document-heavy app already fighting `RemoteModelManager` (the repos above are literally these). **Second wave:** the vision-base-API apps, once `ModuleInstallClient` is wrapped behind the same contract so they get states without learning a second API. **Reference implementation** is the unlock — one Google sample showing the unified `when` block across a classic model and a GenAI model.

---

## Execution plan

- **Developer preview:** generalize `DownloadCallback` + a `checkStatus` enum onto `RemoteModelManager`; answer "does the GenAI-shaped contract fit the classic delivery path cleanly?" with 3–4 partners who already hand-rolled it. Evidence collected: the failure reasons that actually occur in the field, to type the `UNAVAILABLE` reason enum correctly.
- **Alpha/Beta:** graduate when the status call provably never throws for a representable status (closes #1062), and when the vision-base path is reachable through the same contract via `ModuleInstallClient`. Checkable condition: a single code sample runs unchanged against a classic model and a GenAI model.
- **GA:** commit to the enum and callback surface and a stability contract that the status values and reason codes are versioned independently of the underlying model. The commitment is behavioral, not an SLA.

**Org dependencies, honestly:** this needs the Play Services / GMS team (they own `ModuleInstallClient` and the delivery bytes) and the AICore team (GenAI path) to agree on one contract. If they don't, the fallback is a classic-only port against `RemoteModelManager`, which still clears the bar — but the unified-across-both-paths version, which is the differentiated one, requires that yes.

---

## The case against

The strongest argument against is **"the platform will absorb this itself, so why make it an ML Kit API"** (adoption failure mode #2). It is a fair hit. `ModuleInstallClient` already exposes `ProgressInfo` bytes for classic Play-Services modules; the GenAI path already has the full contract; Play for On-device AI has delivery state machines. A skeptic can say the pieces exist and the job is documentation plus a thin wrapper — Type H, not a report. The honest rebuttal is that the pieces existing in three incompatible places *is* the problem: a developer today must learn `RemoteModelManager` (boolean), `ModuleInstallClient` (generic GMS), and `DownloadCallback` (GenAI) to cover one conceptual job, and the proof they can't stitch it themselves is that the ones who tried shipped bugs. The value is the *unification and the typed contract*, not any single missing primitive. That is a real API decision with a durability commitment, not a docs page.

The second-strongest: **safety of over-promising.** If ML Kit publishes an availability contract, developers will read it as a delivery *guarantee* and file bugs when a model never arrives on a constrained device. Mitigation is in the surface design — `UNAVAILABLE(reason)` is typed precisely so "this device will never get this model" is a first-class, non-exceptional answer, and the contract explicitly disclaims delivery SLAs. Get the reason enum wrong and the idea generates the very support load it was meant to remove.

Not the live risk here: "API outran the hardware" (#1 — the opposite; classic reach is ~96%) and "undifferentiated against a free substitute" (#7 — there is no free substitute, only hand-rolled code).

---

## Kill criteria

**The single observation that would reverse this recommendation:** ML Kit ships a progress/state extension to `RemoteModelManager` (porting `DownloadCallback` to classic models) in a release before this is prioritized — *checkable at [ml-kit/release-notes](https://developers.google.com/ml-kit/release-notes) every run.* If it appears there, this is done and the report should be retired.

**Load-bearing assumption:** that classic-model delivery opacity is still unaddressed. If the "Google would consider adding progress if there's interest" statement has already become a shipped API, the premise is gone — verify in a browser, since that claim is currently [unverified].

**Re-check trigger if shelved:** the DMA Android 18 implementation (due 1 Aug 2027). If Google's own interop implementation defines a mandated delivery/status surface for third-party model access, either this becomes redundant (that surface *is* the contract) or far more urgent (third parties need it and nothing provides it) — the direction depends on what Android 18 actually exposes.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, because ML Kit *is* the managed-delivery front door — it is the one surface whose entire premise is "we deliver the model for you," which makes the delivery contract its native responsibility rather than a bolt-on. LiteRT and MediaPipe hand you a file path and defer delivery to Play for On-device AI; Firebase AI Logic delegates provisioning to AICore. Only ML Kit both owns managed models *and* already proved the contract on its GenAI path. The internal risk to name: if this lands in GMS core as a generic module-install improvement, it will be ML-untyped and developers won't find it — the same fragmentation that created the problem. It belongs in ML Kit precisely so there is one typed contract per the job, not one per the delivery mechanism.

---

## Open questions

- **ML Kit's actual installed share.** The AppBrain row didn't render; the Play SDK Index doesn't fetch. Settled by a browser lookup or a Google-internal figure.
- **Exact DMA wording on delivery mechanics.** The EC primary PDFs were egress-blocked. Whether the decision's "equally effective access" language already implies an availability-signal obligation is the hinge between "urgent" and "redundant" — settled by reading DMA.100220 and its Annex §4 directly.
- **Whether "Google would add progress if there's interest" is still true.** Currently a single secondary source. Settled by the `RemoteModelManager` reference page and recent release notes.
- **How often classic delivery actually fails in the field, and why.** The issue tracker shows it happens; nobody has published a rate. Settled only by the developer-preview telemetry the execution plan collects.

---

## Runners-up

- **On-device evaluation & quality harness (Type D).** Apple shipped an Evaluations framework; ML Kit *prescribes* an eval workflow and ships no tooling behind it. Strong, and the closest competitor — lost because its demand signal is inference ("Apple did it") rather than developers caught hand-building it, and feasibility/privilege are a notch weaker than a delivery contract the platform uniquely owns.
- **Standalone on-device content-moderation classifier (Type G).** Regulatory clock (US minors laws from Jan 2026, Play output-liability policy), Bumble open-sourced one. Lost on the tunability risk: safety is each company's proprietary policy surface, so a one-size classifier dies on contact with a real trust-and-safety team unless tunability is designed in first.
- **On-device neural TTS API (Type A).** Clean whitespace — Google ships nothing; Picovoice (Orca) charges for it; Apple added speech generation. Lost the gate on Platform Privilege: OSS TTS (Piper-class) means a competent team could ship a Gradle dependency, so "why us" is weaker than for a delivery contract.
- **Reach tiering for GenAI (Type F).** Convert the ~3.7% flagship demo into a graceful-degradation story across the fleet. Lost on Feasibility headroom — the honest version can't claim a small model matches Nano, and the whole idea lives or dies on that gap.
- **Constrained-decoding / grammar-forced output extension (Type B).** Addresses the 30–50% constraint-violation rate in shipped on-device apps. Partially pre-empted by the GenAI Structured Output (Alpha, Jul 2026); kept as a runner-up pending whether Structured Output already closes it.

---

*Sources: [ML Kit RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) · [DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) · [TextRecognizer](https://developers.google.com/android/reference/com/google/mlkit/vision/text/TextRecognizer) · [MlKitException](https://developers.google.com/android/reference/com/google/mlkit/common/MlKitException) · [GMS ModuleInstallClient](https://developers.google.com/android/guides/module-install-apis) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [quickstart-android #586](https://github.com/firebase/quickstart-android/issues/586) · [mlkit #740](https://github.com/googlesamples/mlkit/issues/740) · [mlkit #837](https://github.com/googlesamples/mlkit/issues/837) · [mlkit #978](https://github.com/googlesamples/mlkit/issues/978) · [mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) · [firebase-android-sdk #1275](https://github.com/firebase/firebase-android-sdk/issues/1275) · [auto-lyrics PR #7](https://github.com/whoxamxl/auto-lyrics/pull/7) · [DeutschPlan #756](https://github.com/MdRahmatUllah/DeutschPlan/issues/756) · [apilevels.com](https://apilevels.com/) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · EC decision DMA.100220, 16 Jul 2026 (primary PDF egress-blocked this run)*
