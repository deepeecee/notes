# Model Availability Contract — give ML Kit's managed models the delivery state machine and SLO every other Play-delivered asset already has

**Type:** E (Delivery & lifecycle), with C (developer experience) and B (extension) elements · **Verdict:** Prototype (developer-preview) · **Opportunity: 6/10 (Qualified)**
*2026-10-25 · Prepared for Android ML Kit · Evidence current as of 2026-10-25*

*Badges: Google already half-built this · Regulatory clock (DMA, 1 Aug 2027) · Demand real but low-volume*

> It's a Tuesday and an Android engineer at a travel app ships offline translation with ML Kit. In the field, in rural India, the app calls `translate()`, gets `MlKitException.UNAVAILABLE`, and Play Services silently tries to fetch a language pack over a connection that isn't there. The app has no download state, no progress, no offline signal, no ETA — so it either spins forever or lies to the user. The engineer's fix is a retry loop that "keeps the analyzer alive and hopes." Google's own maintainer acknowledged this exact gap in 2021 — *"we had it planned but didn't have cycle"* — and it is still open across ML Kit's newest APIs in 2026. ~99.9% of Android can receive these models; none of them can tell the app how.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Qualified | composite 3.35 × 2 = 6.7, −1 for Durability gate at exactly 3 → ~5.7 ≈ 6; no +1 (S1 not a 5) |
| Platform privilege (gate) | 5/5 — pass | Only Google owns Play-Services/AICore model delivery; a 3rd party cannot commit a delivery SLO. [#315 closed to `ModuleInstallClient`](https://github.com/googlesamples/mlkit/issues/315), a GMS-only API |
| Feasibility headroom (gate) | 5/5 — pass | No model to train; surfaces delivery state that already exists inside Play Services. The hard part is organizational (committing an SLO), not technical |
| Durability (gate) | 3/5 — pass (weak) | A delivery SLO you break is worse than none; ML Kit/MediaPipe/Firebase charter overlap is unresolved ([landscape §7](https://developers.google.com/ml-kit)) |
| Demand evidence (25%) | 3/5 | Verbatim, vendor-acknowledged, recurring 2020→2026 across model families incl. GenAI ([#315](https://github.com/googlesamples/mlkit/issues/315), [#165](https://github.com/googlesamples/mlkit/issues/165), [#773](https://github.com/googlesamples/mlkit/issues/773), [#978](https://github.com/googlesamples/mlkit/issues/978), [#1062](https://github.com/googlesamples/mlkit/issues/1062)) — but one low-volume channel; SO/Reddit unsized |
| Install-weighted reach (15%) | 4/5 | API 21+ → ~99.9% device reach, ~27× the Nano surface; ML Kit ~94–95% of downloads within its SDK niche ([42matters](https://42matters.com/sdk-analysis/top-text-processing-sdks)). Absolute adoption unmeasured |
| Build-vs-buy-vs-borrow (20%) | 2/5 | **The soft spot.** `ModuleInstallClient` + `RemoteModelManager.isModelDownloaded()` + bundling already approximate the status ask; the borrow path "mostly works" |
| Integration cost / TTFHW (15%) | 4/5 | A status listener + availability query on calls devs already make; no key, no new permission, works where ML Kit works |
| Substitute half-life (15%) | 4/5 | Delivery is orthogonal to model capability, so a general model can't absorb it; the only substitute is Google's own Play Feature Delivery extended to cover ML Kit |
| Strategic complement (10%) | 4/5 | Observable+reliable delivery de-risks adoption of every ML Kit/GenAI API, and is the concrete artifact that demonstrates DMA "equally effective" access |
| **Composite** | **3.35** | Prototype band (3.0–3.9) |

*Least-trustworthy score: Build-vs-buy-vs-borrow (2). It depends on how much of the "status" ask `ModuleInstallClient` + bundling already satisfy — which is exactly the skeptic's kill below, and the reason the recommendation is scoped to the SLO and unification, not to "expose download status."*

---

## The problem

The job, stated as an engineer's: *"My app depends on an ML Kit model that isn't in the APK. I need to know — before I show UI — whether it's here, coming, stuck, or impossible on this device and network, and I need to tell the user something true."* ML Kit cannot answer that for its unbundled models. The call either works or throws `MlKitException.UNAVAILABLE` / `NOT_FOUND`, and Play Services downloads the model on its own schedule with no app-facing progress, no offline signal, and no completion guarantee.

This is structurally produced, not a bug. A 100M+ install app can't bundle every model — every 6 MB of APK costs ~1% of install conversion (Google Play's own figure), and in emerging markets, where more than half of Indian and Indonesian users have no wifi, that tax is heaviest exactly where the silent-download failure bites hardest. So apps unbundle, and unbundling hands model delivery to Play Services — a boundary only the platform sits on. The app is now accountable in its UI for an outcome it cannot observe. Translation (always downloads language packs), selfie/subject segmentation (unbundled-only), digital ink, and entity extraction have no bundled escape hatch at all ([ML Kit installation paths](https://developers.google.com/ml-kit/tips/installation-paths)); barcode, text recognition, and face detection hit it whenever the developer chooses the smaller unbundled variant.

The named app archetypes: a scanner/Tools app (the largest ≥50K-install category, [25,202 apps](https://www.appbrain.com/stats/android-market-app-categories)) using unbundled barcode/text; a travel or education app using offline translation; a notes app using digital-ink or entity extraction. What they do *instead* today is the price of the API: a hand-rolled retry loop that keeps the analyzer alive and polls, a pre-flight wifi check to avoid hanging offline, or capitulation to bundling and the install-conversion hit.

---

## Proof & signals

- **Developers doing it by hand, vendor-acknowledged:** [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315) (opened 21 Jun 2021, closed "completed" 31 Aug 2022). Verbatim: *"There is still no way to get availability and download status of the unbundled standard ML Kit models… we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* Google's `cs-googler` (22 Jun 2021): *"We had it planned but didn't have cycle to get to it."* Confirmed by direct fetch. **Evidence status: confirmed against the live issue.**
- **It recurs across model families and across six years:** digital-ink progress bar [#165](https://github.com/googlesamples/mlkit/issues/165) (2020, Google: *"the download API doesn't report the exact downloading progress… If we see more interests in it, we would consider adding such a support,"* re-poked 2023); progress "only updates when the download is complete" [#773](https://github.com/googlesamples/mlkit/issues/773) (2024, open); entity-extraction downloads *"often fail or timeout, making the feature unusable in production apps"* in mainland China [#978](https://github.com/googlesamples/mlkit/issues/978) (Sep 2025, open). **Confirmed via fetchable issue URLs (agent-reported for #165/#773/#978; #315 verified directly).**
- **It has carried into the new GenAI APIs:** [#1062](https://github.com/googlesamples/mlkit/issues/1062) (Jul 2026, open) — `checkFeatureStatus()` *"throws `GenAiException(606)` `FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`… It never reaches the `UNAVAILABLE` branch on any device where the feature is not provisioned."* The availability enum developers must branch on is itself unreliable. **Agent-reported, fetchable.**
- **A real app building the workaround:** the `mugiten` Android app added a pre-download wifi check because the app *"just hangs when wifi is not enabled on first launch"* ([issue #140](https://git.pvv.ntnu.no/mugiten/mugiten/issues/140), surfaced via search — treat wording as near-verbatim).
- **The absence signal:** there is no commercial vendor selling "ML Kit delivery status," because the capability is intrinsically platform-owned — you cannot buy what only Play Services can see. That absence is *consistent with* platform privilege, not with weak demand. But it also means the strongest external falsifier (someone charging for it) can't exist here, which caps S1.

**Honest characterization of demand: real, recurring, and vendor-acknowledged, but low-volume and unsized.** The ML Kit issue tracker is a low-traffic channel; Stack Overflow and Reddit were not fetchable this run, so breadth could not be measured. The pattern (same complaint, independent reporters, 2020→2026, newest APIs included) is the shape of a persistent structural gap — but I cannot say whether it is "thousands of developers" or "a committed few." **Closing that is the single most valuable follow-up, and it is why the verdict is Prototype, not Build.**

---

## Why now

1. **Capability shift:** ML Kit's GenAI surface shipped a *partial* delivery API in 2025 — `checkFeatureStatus()` (a 4-value enum: `UNAVAILABLE`/`DOWNLOADABLE`/`DOWNLOADING`/`AVAILABLE`) and a byte-level `DownloadCallback` — proving Google will expose delivery state. It just did it for one surface, coarsely, and buggily ([#1062](https://github.com/googlesamples/mlkit/issues/1062)). The groundwork exists; the contract doesn't.
2. **Regulatory shift (the dated forcing function):** The European Commission's DMA specification decision **DMA.100220** (dated 16 Jul 2026; proceedings opened 27 Jan 2026) orders Alphabet to give third parties *"free"* and *"equally effective"* access to Android's on-device AI models and the right to run their own on-device model — implementation **no later than 1 August 2027**. `[EC-published, via search summaries — primary annex PDF not yet read; see Open questions]`. Critically, the decision mandates *access to and invocation of* models but specifies **nothing** about how models are delivered, versioned, or kept available. That silence is the opening.
3. **Demand shift:** on-device AI moved from a flagship demo to a thing apps are actually shipping to the whole fleet via classic ML Kit, so the unobservable-delivery tax now lands on production features with real users, not prototypes.

*Caveat on an earlier internal snapshot:* the condition is **"free" + "equally effective" access** — not "equivalent performance," which is a gloss; and **"Android 18" is press inference, not EC language** (the defensible anchor is the 1 Aug 2027 calendar date). Both are corrected here.

---

## The capability gap

Be exact about the boundary, because this is where the report could get embarrassed:

- **ML Kit classic (via `RemoteModelManager`):** `isModelDownloaded()` (boolean) + `downloadModelIfNeeded()` returning an all-or-nothing `Task<Void>`. No intermediate states, no progress, no offline-vs-failed distinction, no SLO. ([Translation docs](https://developers.google.com/ml-kit/language/translation/android).)
- **ML Kit unbundled standard vision (barcode/text via Play Services):** no first-class availability API at all; Google's closure of [#315](https://github.com/googlesamples/mlkit/issues/315) points developers to the GMS `ModuleInstallClient` on detectors that extend `OptionalModuleApi`.
- **ML Kit GenAI/AICore (Gemini Nano):** `checkFeatureStatus()` 4-value enum + `DownloadCallback` byte progress — but no terminal failure taxonomy, raw bytes not %/ETA, and a known bug returning `606` instead of `UNAVAILABLE` ([#1062](https://github.com/googlesamples/mlkit/issues/1062)). AICore distribution is otherwise deliberately opaque.
- **The adversarial counter-examples (verified):** **Play for On-device AI's `AiPackManager`** and **Play Feature Delivery's `SplitInstallManager`** *both* ship mature, observable state machines (`PENDING`→`DOWNLOADING`→`TRANSFERRING`→`COMPLETED`/`FAILED`, `bytesDownloaded()`, `transferProgressPercentage()`, error codes). I fetched the [Play for On-device AI page](https://developer.android.com/google/play/on-device-ai) directly: the state machine is real, there is **no SLO**, and it delivers **only the developer's own packaged models — explicitly not ML Kit's.**
- **Apple Foundation Models:** weaker — a 3-case `availability` enum (`deviceNotEligible`/`appleIntelligenceNotEnabled`/`modelNotReady`), no progress, no SLO.

So the gap is precise, and it is **not** "nobody has a download state machine" — Google has two. It is: **ML Kit's own managed models ride neither of them**; their delivery is split across three incompatible, mostly-opaque surfaces; and **no vendor, Google or Apple, publishes any delivery SLO.** The main competitor a developer uses today is their own retry loop, or bundling.

---

## Proposed surface

A **Model Availability Contract**: one delivery state machine across all of ML Kit's managed models (classic `RemoteModel`, Play-Services `OptionalModuleApi`, and GenAI/AICore), plus a published SLO and an explicit offline/ineligible signal. Deliberately modeled on `AiPackState` so there is one Android mental model, not a fourth.

```kotlin
// One contract across every managed ML Kit model.
val availability: ModelAvailability = barcodeScanner.availability() // suspend; no throw

when (availability) {
    is Ready -> { /* use it */ }
    is Downloadable -> barcodeScanner.ensureModel(DownloadConditions(wifiOnly = false))
        .collect { p: DeliveryState -> /* Pending / Downloading(pct, eta) / Transferring / Ready */ }
    is Downloading -> showProgress(availability.percent, availability.eta)
    is IneligibleDevice -> fallBackToCloud()          // never resolvable here — a terminal state
    is UnavailableOffline -> showOfflineHint()        // resolvable when network returns
    is Failed -> handle(availability.reason)          // typed taxonomy, not a bare exception
}
```

What it **adds** beyond today: (1) a *typed terminal-vs-transient distinction* — `IneligibleDevice` and `UnavailableOffline` are different decisions, and today both collapse into `UNAVAILABLE`; (2) a *failure taxonomy* the developer can branch on instead of string-matching an exception; (3) *one surface* across classic/GenAI; (4) a **published delivery SLO** (e.g. "once `Downloadable`, on an unmetered connection the model reaches `Ready` within N minutes at the P95, or transitions to a typed `Failed`"). What it **deliberately does not do:** it does not deliver the developer's *own* models (that's `AiPackManager`), it does not change model *quality or output*, and it does not promise download on metered connections without consent.

**TTFHW target: 15 minutes.** Met if it's one `availability()` call plus a `Flow` on APIs developers already call, no new permission, no key. If reaching `Ready` requires a new consent dialog by default, that breaks the 15-minute path — so consent must stay opt-in for the unmetered case. That is a design constraint, not a footnote.

---

## Reach & sizing

Show the arithmetic; label mine.

| Input | Value | Source | Provenance |
|---|---|---|---|
| Unbundled classic ML Kit minSdk | API 21+ → ~99.9% cumulative | [Android distribution, Google data via mirror](https://capgo.app/android-distribution-chart) | Google data, 3rd-party mirror |
| Gemini Nano surface | ~3.7% | landscape snapshot (140M Google / ~3.8B 3rd-party) | mixed; % is arithmetic |
| ML Kit share within on-device text/vision SDK niche | ~94–95% of downloads | [42matters](https://42matters.com/sdk-analysis/top-text-processing-sdks) | 3rd-party vendor, undated snapshot |
| Play apps ≥50K installs (all categories) | 277,395 | [AppBrain](https://www.appbrain.com/stats/android-market-app-categories) | 3rd-party |
| Tools apps ≥50K installs | 25,202 | AppBrain | 3rd-party |

- **Reach ceiling (my math):** 99.9% ÷ 3.7% ≈ **27× more devices** addressable than the Nano surface; ~3.3–3.9B devices can *receive* an unbundled ML Kit model vs ~0.12–0.14B for Nano.
- **Addressable apps (my math, weaker):** relevant ≥50K-install categories (Tools, Productivity, Travel, Shopping, Education, Finance) plausibly sum to ~35–50% of the 277,395 → **~97,000–139,000 apps** (the 35–50% weight is my assumption; only Tools = 25,202 is measured). The true integrator count is the subset that ships an *unbundled* ML Kit model.
- **Install-weighted reach:** the honest answer is a **range**, because the middle term doesn't exist publicly: bounded below by "apps already shipping unbundled ML Kit" (ML Kit is dominant *within* its niche but the niche's absolute size is unknown) and above by the ~99.9% device-addressability ceiling.

**Sensitivity:** halve the category weight (35–50% → 17–25%) and the addressable-app band roughly halves to ~48K–70K — the verdict (Prototype) does not flip, because the verdict already rests on the unmeasured absolute-adoption number, not on the band. **The decision needs one experiment: a measured count of apps shipping unbundled ML Kit models.** That is the load-bearing unknown, and it is cheap for the ML Kit team to answer internally (Play Services telemetry) and impossible for an outsider to.

**Platform test:** the engineering-cost-avoided numerator can't be computed without the adoption count, so I won't fake it. Qualitatively: per-app savings is small (a few engineer-weeks of retry/polling glue), multiplied by an unknown but large base, against a near-zero model cost — the platform test likely passes on volume, but I can't put it above the 10× bar on evidence. That uncertainty is the Prototype gate, honestly.

---

## Adoption path

1. **The hook (15 min):** an app already calling unbundled ML Kit swaps a `try/catch` + retry loop for one `availability()` call and a progress `Flow`. The win is immediate: a real progress bar and a true offline message where there was a spinner.
2. **First real integration:** the app deletes its hand-rolled "keep the analyzer alive and hope" code and its pre-flight wifi hack, and branches on `IneligibleDevice` vs `UnavailableOffline` to drive a deliberate cloud fallback.
3. **The dependency:** the app wires UX and its own SLAs to the contract's state machine and SLO. Removing it later means re-deriving delivery state from exceptions — a regression they'd resent, not just a dependency.

**First adopter:** a scanner/Tools app or an offline-translation travel app — high unbundled-model use, visible download UX, emerging-market users where the failure is worst. **Second wave:** the GenAI adopters, once the same contract covers `checkFeatureStatus()` and fixes [#1062](https://github.com/googlesamples/mlkit/issues/1062), so a developer learns one delivery model for classic and GenAI alike.

---

## Execution plan

- **Developer preview** — unify the *existing* signals (`isModelDownloaded`/`RemoteModelManager`, `ModuleInstallClient`/`OptionalModuleApi`, GenAI `checkFeatureStatus`) behind one `availability()` + `DeliveryState` Flow, with the terminal-vs-transient distinction and failure taxonomy. *Question it answers:* do developers adopt it over their retry loops, and — the load-bearing one — **how many apps actually ship unbundled models?** (Instrument it.)
- **Alpha/Beta** — add the published SLO on an unmetered connection. *Graduation condition:* the SLO holds at P95 across the device matrix in AI Edge Portal, and preview telemetry shows a measurable drop in "stuck download" sessions.
- **GA** — freeze the state enum and the failure taxonomy as a versioned surface independent of model updates, with a multi-year support commitment. The SLO is the thing you are committing to hold.

**Org dependency, named honestly:** this requires **Play Services / Play Core** to expose delivery state and commit the SLO — the same team [#315](https://github.com/googlesamples/mlkit/issues/315) was *"waiting for a download infrastructure update from"* in 2022. If they don't say yes, ML Kit can still ship the unified *observability* layer over existing signals, but **not** the SLO — and the SLO is half the idea. That dependency is the real gate, more than any score.

---

## The case against

The strongest version, argued fairly: **the platform already solved this twice, and the ML Kit-specific gap is mostly ergonomics Google can close with `ModuleInstallClient` and docs, not a new public surface.** `AiPackManager` and `SplitInstallManager` prove Google can ship a delivery state machine; `RemoteModelManager.isModelDownloaded()` + `downloadModelIfNeeded()` already give availability+completion for the RemoteModel APIs; `ModuleInstallClient` gives progress for `OptionalModuleApi` detectors; and bundling removes the download entirely for apps that can afford the APK. A skeptic says: route ML Kit models through Play Feature Delivery, point people at `ModuleInstallClient`, write better docs, done — no five-year API commitment required. This is why Build-vs-borrow scored a 2, and it is a serious argument.

The honest rebuttal, and its limit: the borrow path leaves three things genuinely unbuilt — (1) a *unified* contract across the three fragmented surfaces (today a developer learns three delivery models); (2) the *terminal-vs-transient* and *typed-failure* distinctions that turn "it's unavailable" into an actionable branch; and (3) a **published SLO**, which no vendor has and no outsider can build. If the idea is scoped to "expose download status," the skeptic wins. Scoped to "the SLO + unification," it survives — but that is a narrower, less demo-friendly idea than it first appears, and its value rests on the unmeasured adoption count.

**The live failure mode** from the rubric is **#2, "the platform absorbed the problem underneath you"** — except here ML Kit *is* the platform, so the risk is intramural: if Play Core extends `AiPackManager`/Feature Delivery to cover managed models first, ML Kit's contract is redundant. The mitigation is to make ML Kit the owner of that extension rather than a bystander to it.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if internal Play Services telemetry shows fewer than ~5,000 apps ship an *unbundled* ML Kit model (i.e. the adoption base is a hobbyist niche, not infrastructure), the platform test fails and this drops to Shelve. *Checkable, with a threshold, answerable by the ML Kit team in a day.*

**Load-bearing assumption:** that a meaningful population of production apps unbundle ML Kit models and suffer the silent-delivery tax — plausible from reach and the 42matters niche-dominance figure, but not measured.

**Re-check trigger if shelved:** Play Core extends a delivery state machine to managed models (then ML Kit must own it, not watch it), or a DMA compliance filing forces Google to define "available" operationally (then ship first, on your terms).

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, because **ML Kit owns the managed-model abstraction** — it is the only surface that already hides "which model, delivered how" from the developer, which is precisely the thing a delivery contract must stand behind. LiteRT/MediaPipe hand the developer the weights (delivery is the app's problem — that's `AiPackManager`'s job, and it exists). Firebase AI Logic papers over availability with cloud fallback, which is a different product. The intramural risk ([landscape §7](https://developers.google.com/ml-kit): ML Kit/MediaPipe convergence is unstated) is real: if this lands in the wrong team it fragments the delivery story further. The right structure is **ML Kit owning the developer-facing contract, Play Core owning the delivery mechanism and SLO underneath** — which is also exactly the org dependency that most endangers it.

---

## Open questions

- **How many apps ship unbundled ML Kit models, install-weighted?** The load-bearing unknown. No authoritative per-SDK adoption count exists for Android (no Maven download stats; Play SDK Index doesn't render). Settle it with internal Play Services telemetry.
- **Exact DMA annex wording.** All EC facts here came via search summaries; the primary annex PDF (`digital-markets-act.ec.europa.eu/document/download/bb7151ff-5d0a-420e-abaa-a2bdbfd30c26_en`) was not read this run. Confirm the restricted/unrestricted feature split and whether "on-device models / model implementation / background execution" are truly in the un-gated set before leaning on the why-now.
- **Does the GenAI `DownloadCallback` emit true incremental progress or only terminal?** [#773](https://github.com/googlesamples/mlkit/issues/773) suggests completion-only in at least one path; verify per-surface.
- **Is the 42matters 94–95% niche-dominance figure current?** Undated snapshot; re-pull.

---

## Runners-up

- **On-device eval & quality harness (Type D)** — ML Kit *prescribes* an "Evaluate prompt quality" workflow and ships zero tooling, linking out to cloud Vertex; Apple shipped an Evaluations framework + token counting. Lost on thinner fetchable demand than delivery, but the closest second and arguably the cleaner Build.
- **On-device content-safety/moderation classifier (Type G)** — Bumble open-sourced one; Play makes devs accountable for output; regulatory clock (minors law, DMA). Lost on the tunability problem (one classifier can't be every company's policy) and uncertain team fit.
- **On-device neural TTS API (Type A)** — Google ships nothing; Apple added speech generation; Picovoice Orca sells into the hole. Lost on G1 privilege risk: Piper/Kokoro/Coqui OSS is strong.
- **GenAI reach tier for sub-8GB devices (Type F)** — converts a flagship demo into a platform capability. Lost on G2: feasibility at the embarrassment threshold is the whole game and is speculative.
- **Capability-detect + hybrid fallback one-liner (Type C)** — every team hand-rolls it. Lost because Firebase AI Logic already ships four hybrid orchestration modes.
- **Constrained-decoding / structured-output primitive (Type B)** — killed as a headline: ML Kit shipped Structured Output (Alpha, Jul 2026); largely addressed.
- **Speaker diarization / speaker ID (Type A)** — Picovoice sells both; real whitespace. Lost on narrower install-weighted reach.

---

*Sources:*
- [googlesamples/mlkit issue #315 — On-Device Model Download API](https://github.com/googlesamples/mlkit/issues/315)
- [googlesamples/mlkit issue #165 — download progress](https://github.com/googlesamples/mlkit/issues/165)
- [googlesamples/mlkit issue #773 — progress only on completion](https://github.com/googlesamples/mlkit/issues/773)
- [googlesamples/mlkit issue #978 — entity extraction offline failures](https://github.com/googlesamples/mlkit/issues/978)
- [googlesamples/mlkit issue #1062 — checkFeatureStatus 606](https://github.com/googlesamples/mlkit/issues/1062)
- [Google Play for On-device AI — AiPackManager](https://developer.android.com/google/play/on-device-ai)
- [ML Kit installation paths](https://developers.google.com/ml-kit/tips/installation-paths)
- [ML Kit translation (RemoteModelManager usage)](https://developers.google.com/ml-kit/language/translation/android)
- [Android version distribution (Google data, mirror)](https://capgo.app/android-distribution-chart)
- [42matters — top text-processing SDKs](https://42matters.com/sdk-analysis/top-text-processing-sdks)
- [AppBrain — Android market app categories](https://www.appbrain.com/stats/android-market-app-categories)
- [EU DMA developer portal — Alphabet AI interoperability (DMA.100220)](https://digital-markets-act.ec.europa.eu/dma100220-consultation-proposed-measures-interoperability-google-android-article-67-dma_en)
