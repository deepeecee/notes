# ML Kit idea browser — run of 2026-10-09

*Prepared for Android ML Kit · Evidence gathered 2026-10-09 · One deep report + a shortlist of the run's candidates.*

> **Run note on this environment.** `developers.google.com`, `developer.android.com` blogs, `developer.apple.com`, the EU DMA portal, AppBrain, apilevels.com and 42matters were all egress-blocked for the research agents, so first-party Google/Apple/EU page facts below are **confirmed against search-engine snippets that quote those live pages, not against directly-fetched HTML**. GitHub (issues, PRs) *was* directly reachable, so the demand quotes are first-hand. Each load-bearing claim carries its status inline. A human on an unblocked network should re-fetch the ~6 rows marked `[snippet]` before this is forwarded externally.

---

## Shortlist — the 5 candidates this run (most promising first)

| # | Idea | Type | Verdict | Opportunity | One line |
|---|------|------|---------|-------------|----------|
| **1** | **Trustworthy unified model-delivery & availability contract** ⭐ *(deep-dive below)* | **E — Delivery/lifecycle** | **Prototype** | **6/10** | The delivery-state enum already ships four times over; the unmet, evidenced need is a *trustworthy, unified* contract — `AVAILABLE` that means it, a terminal offline state, output-stability across Nano versions, an SLA. |
| 2 | On-device GenAI eval & quality-regression harness | D — Tooling | Prototype | 5/10 | Apple shipped an Evaluations framework + token/usage accounting at WWDC26; ML Kit ships a *prose* "evaluate prompt quality" page and a cloud-only Vertex optimizer, and no on-device harness. |
| 3 | Deferred / opportunistic inference scheduling | E — Delivery/lifecycle | Prototype | 5/10 | No "run this batch when charging, on wifi, idle" primitive for on-device inference; the managed path offers only foreground-only execution and quota *errors*, and sustained inference thermally throttles to failure in production. |
| 4 | On-device safety / moderation classifier developers can call | G — Trust & safety | Prototype | 5/10 | Play policy makes the app accountable for generated output and only "recommends" filters; AICore applies safety internally but exposes no classifier; Bumble open-sourced its own. |
| 5 | On-device neural TTS as a modern developer API | A — New capability | Shelve (watch) | 4/10 | Google offers no neural TTS API (only the decade-old parametric `TextToSpeech`); Apple shipped speech generation and Picovoice sells Orca — but feasibility/reach on the p50 device is the open question and nobody has forced it. |

**High-priority / trending flags.** #1 carries a **regulatory clock** (EU DMA Art. 6(7), Android 18 by **1 Aug 2027**) and the **freshest demand** (a hand-rolled workaround PR merged **Sept 2026**, plus a 2025–2026 GenAI "status lies" issue cluster) — it is the one to move on. #2 is **"Apple already shipped it"** (WWDC26) and is the sharpest competitive gap of the five. #3/#4 are durable but invisible-in-demo, which is exactly why they stay under-proposed. #5 is real whitespace but **unverified on feasibility** — parked, not pursued.

Nothing here repeats a prior run (no ledger survived in this fresh container — see Open questions). The deep report on #1 follows.

---

# Trustworthy model-delivery contract — *the status enum you'd propose already ships; the guarantee behind it doesn't*

**Type:** E — Delivery & lifecycle · **Verdict:** Prototype (developer-preview) · **Opportunity: 6/10 (real pain, crowded surface)**
*2026-10-09 · Prepared for Android ML Kit · Evidence current as of 2026-10-09*

> *Regulatory clock* · *Core premise partly pre-empted* · *Strongest demand evidence of the run*

> On 19 September 2026 an Android developer merged a pull request into a shipping app whose entire job is to wait for an ML Kit model to download: check the module, request it, listen on `InstallStatusListener`, give up after 60 seconds, and show the user "Background removal is being prepared. Please wait a moment and try again." They wrote that because `installModules()` reports success the moment the *request* is accepted, not when the model arrives — so the app has to re-derive the truth by hand. This is not a 2021 artifact; it is this month. The job to be done is not "tell me the model's state" — ML Kit exposes that in four different places now. It is "give me *one* state I can trust across your whole surface," and no platform, Google's or Apple's, ships it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **6/10 — Prototype** | composite 3.6 × 2 = 7.2, minus 1 for Durability gate at exactly 3; no +1 (S1 is 4, not 5). |
| Platform privilege (gate) | 5/5 — pass | Delivery is owned by Play Services + AICore; only the OS can commit a contract that `AVAILABLE` ⇒ inference runs. |
| Feasibility headroom (gate) | 4/5 — pass | No model to run; this is contract + plumbing. The hard part is organizational, not compute. |
| Durability (gate) | **3/5 — pass (flagged)** | A delivery SLA you break is worse than none; output-stability across Nano v2→v4 and cross-team ownership are unaddressed. |
| Demand evidence (25%) | 4/5 | Quoted, dated, multi-year GitHub cluster + a Sept-2026 hand-rolled PR + a 12-👍 issue; but no vendor sells it and no canonical wrapper library exists. |
| Install-weighted reach (15%) | 4/5 | Applies to every unbundled classic model (≈ whole Play-services base) plus the GenAI path; ML Kit ≈85–90% within-text-processing SDKs [snippet]. |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The *observability* half is cheaply borrowable (PR #232 is the copy-paste), which is why the naive idea fails; only the *guarantee* half has real, un-borrowable delta. |
| Integration cost / TTFHW (15%) | 4/5 | A unified `awaitAvailable()` / status-flow is a few lines; <15-minute hello-world is reachable. |
| Substitute half-life (15%) | 3/5 | The substitute is Google's *own* existing surfaces, which already do ~70% of the job; only unification + the trust guarantee are durable. |
| Strategic complement (10%) | 4/5 | Trustworthy delivery is the precondition for putting any on-device feature in user-facing UI — the substrate the whole GenAI portfolio needs, and the DMA's "well-documented framework." |
| **Composite** | **3.6** | weighted mean of S1–S6. |

*Least trustworthy score: install-weighted reach (S2). The AppBrain %installs÷%apps multiplier could not be fetched this run, so reach rests on a within-category dominance figure and the classic-ML-Kit "whole-fleet" assumption, not a computed install-weighted number.*

---

## The problem

A large consumer Android app does not bundle most ML models — bundling is a growth tax (Google's own published figure: ~1% of install conversion per 6 MB), so the model is delivered after install, by Play Services or AICore, over a network the user may not have. That single decision creates a class of bug the app team cannot fix from inside their own code: **the feature silently does nothing, for some users, some of the time, and the app has no honest signal about why.**

Derived from first principles, this is structural, not a bug. The app's loop (capture→edit→share, scan→act, type→correct) has an inference step in the middle. The model backing that step is owned by the platform and delivered on the platform's schedule. The app is accountable for the UX but owns neither the model nor its delivery. Any time the party accountable for an outcome controls none of the inputs, you get a workaround industry — and that is exactly what the evidence shows.

What teams do *instead* today, concretely: for classic vision detectors the documented answer is to drive `ModuleInstallClient.areModulesAvailable()` + `installModules()` + a hand-written `InstallStatusListener` with your own timeout; for translation you call `RemoteModelManager.getDownloadedModels()` and scan the returned set because there is no simple "is it ready" boolean on Android (iOS got `isModelDownloaded:`); for GenAI you call `checkFeatureStatus()`, get one of four states — and then, per the issue tracker, discover the state can be wrong.

The reason this is a *platform* problem and not an app problem: every app solves it identically and badly, against a surface only Google controls. That is the platform test passing on the "why us" axis. The reason it is *not* the easy win it looks like: Google has already shipped most of the observable-state surface. The opportunity is narrower and harder than "add a status API," and the honest version of this report is about where the real, un-shipped gap is.

---

## Proof & signals

**Developers building the workaround by hand — dated this month.** `o-benjamin/fansa-uchiwa-android` **PR #232** ("Wait For ML Kit Module Download Before Removing Background"), **merged 19 Sep 2026**, implements the full missing state machine inline: check installed → request download → wait on `InstallStatusListener` capped at 60 s → surface hand-defined reason codes (`module_unavailable`, `module_timeout`, `process_failed`), "because the `installModules()` Task completes when the request is *accepted*." (first-hand, GitHub) <https://github.com/o-benjamin/fansa-uchiwa-android/pull/232>

**The flagship feature request, with the exact lived quote.** `googlesamples/mlkit` **#315** — author G00fY2: *"There is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs… and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* A Google contributor replied *"We're waiting for a download infrastructure update from Play Services"* (Feb 2022); closed "completed" Aug 2022 by pointing developers at `ModuleInstallClient` — i.e. "build it yourself." (first-hand) <https://github.com/googlesamples/mlkit/issues/315>

**Engagement signal.** `react-native-vision-camera` **#2256**: "Waiting for the barcode module to be downloaded… Since the error looks 'unknown', what can it be, the best strategy to wait and to retry?" — **👍12 / 🎉6 / 🚀3**, the strongest reaction count found; the eventual fix was to *bundle* the model and opt out of the unobservable path entirely. (first-hand) <https://github.com/mrousavy/react-native-vision-camera/issues/2256>

**A multi-year cluster, surviving version bumps and issue closures:** face #308 (recurs 2021→2024, "confirming, the issue still exist on version 17.1.0"), code-scanner #641 (**open**, "Press button after five minutes, same message… no login… it does not seem it's the app but rather a constraint on the delivery-side (Google)"), model-download-fails #837 ("Sometimes my users complain that they are unable to download the model even though their Internet connection is stable"). (first-hand) <https://github.com/googlesamples/mlkit/issues/641>

**Progress is binary, too.** `firebase-android-sdk` **#1656**: "Right now, it only provides updates at 0.0 (started) and 1.0 (completed)." Open since 2020, zero comments — dated and quoted, but *quiet*, so weak on its own. (first-hand) <https://github.com/firebase/firebase-android-sdk/issues/1656>

**The GenAI twist — the state exists and is not trusted.** The Prompt/Summarization APIs ship `checkFeatureStatus()` (UNAVAILABLE/DOWNLOADABLE/DOWNLOADING/AVAILABLE) and byte-level `DownloadCallback` [snippet], so the complaint *moves* rather than disappearing: #1078 — "Nano… reports AVAILABLE but every inference fails COMPUTE_ERROR — model package missing"; #944/#954 — "Feature Unavailable," leaking raw `AICore failed with error type 3-PREPARATION_ERROR and error code 606-FEATURE_NOT_FOUND`; #1061 — a default-config change "switched the requested AICore feature from 636 to 648, which no shipping AICore provides," i.e. availability breaking across SDK versions. (first-hand) <https://github.com/googlesamples/mlkit/issues/1078>

**The absence signal.** No standalone wrapper library with real traction solves this, and no vendor sells it — the demand shows up as per-app inline patches, not a canonical fix or a paid product. I read that as: the pain is broad and shallow-per-app (a few days each), not acute-and-concentrated — which caps willingness to pay and is exactly why it reads as a platform-hygiene job, not a product category. No Play-Store *review* evidence surfaced either, consistent with the failure being invisible to end users as a *model* problem (the feature just does nothing).

---

## Why now

1. **Capability shift — the surface finally fragmented enough to need consolidating.** As of mid-2026 the delivery state lives in four places: classic `RemoteModelManager` (boolean), GMS `ModuleInstallClient` (for vision detectors), GenAI `checkFeatureStatus()` + `DownloadCallback`, and Play for On-device AI `AiPackState` (full progress %) [all snippet]. Each shipped for its own surface; none is unified, and the GenAI one is demonstrably not yet trustworthy (#1078). You cannot write the consolidation story until the pieces exist — now they do.
2. **Competitive/regulatory shift — a statutory date.** The European Commission adopted specification decision **DMA.100220 on 16 July 2026** under Art. 6(7), putting *"Google's on-device AI models which are part of the… operating system"* in scope and requiring third parties be able to both call them and run their own *"through complete and well-documented frameworks and APIs… free of charge,"* implemented in **Android 18 by 1 August 2027** [snippet]. A discovery/invocation contract for on-device models is precisely the kind of framework that order points toward. <https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en>
3. **Demand shift — GenAI raised the stakes.** When the undelivered model backed a barcode scanner, the failure was annoying. When it backs a generative feature the app advertised, a wrong `AVAILABLE` (#1078) is a visibly broken promise. The move to on-device GenAI converts a latent delivery bug into a brand risk.

---

## The capability gap

- **Google, classic:** `RemoteModelManager.isModelDownloaded()` is translation-shaped and boolean, no progress; vision detectors route through GMS `ModuleInstallClient` + `InstallStatusListener`, which the developer wires themselves. There is no distinct terminal "offline — this will never arrive" state, which is the exact gap #315 names. [snippet + first-hand issues]
- **Google, GenAI:** a good 4-state enum and byte progress — but no *guarantee* that `AVAILABLE` means inference runs (#1078), and the state regresses across SDK/model versions (#1061). The contract is cosmetic until it is trustworthy. [snippet + first-hand]
- **Google, Play for On-device AI:** the richest state machine (`transferProgressPercentage()`, listeners) — but only for *custom* models you ship as AI packs, not ML Kit's own models. [snippet]
- **Apple:** `SystemLanguageModel.availability` collapses to `.available` / `.unavailable(reason)` with three reasons — `deviceNotEligible`, `appleIntelligenceNotEnabled`, `modelNotReady` — and **no progress and no distinct downloading state at all** (`modelNotReady` is the opaque catch-all). Confirmed against Apple's documentation JSON API. So Apple is *behind* Google on richness here — a rare case where Android leads. <https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason>
- **Qualcomm / OSS:** delivery is manual/CLI (`geniex pull`); no managed in-app delivery state machine. (first-hand) <https://github.com/qualcomm/GenieX>

**The main competitor a developer uses instead is not another platform — it is their own `InstallStatusListener` loop** (PR #232), plus the defensive move of bundling the model to avoid the download path entirely (#2256). The gap, stated precisely: there is no **single, cross-surface, contract-grade** availability API where `AVAILABLE` is a guarantee, where a terminal offline/"won't-arrive" state exists, where progress is uniform, and where the states are stable across model and SDK versions.

---

## Proposed surface

One availability façade across every ML Kit model (classic + GenAI), with a guarantee attached:

```kotlin
// One call, one state type, for any ML Kit feature.
val flow: Flow<ModelAvailability> = MlKitModels.availability(BarcodeScanning)
// states: Available(verified=true) | Downloadable(sizeBytes)
//       | Downloading(progress: Float) | Unreachable(reason: Offline|Ineligible|QuotaExhausted)
//       | Unavailable(reason)  // terminal, honest

suspend fun ensureReady(): Result<Unit>  // awaitable; resolves only when inference is actually runnable
```

What makes it *not* the four things that already ship:
1. **`Available` is verified, not announced.** The platform confirms the model package is present and loadable before it reports `Available`, closing #1078. This is the un-borrowable part — only the owner of AICore/Play Services can honor it.
2. **A terminal `Unreachable(Offline)` state.** The one signal #315 asked for and none of the four surfaces give: "stop waiting; this will not arrive on this network."
3. **Uniform progress** across classic and GenAI (fixes #1656's binary 0.0/1.0).
4. **Version-stable states**, pinned independently of the model/SDK version (fixes #1061), as part of the output-stability contract below.

Deliberately *not* in scope: choosing *which* model, routing to cloud (that is Firebase AI Logic), or any new inference capability. It is a delivery contract, nothing more. **TTFHW target: <15 minutes** — one dependency line, one `availability()` collect, no key, no new permission. Reachable because the plumbing already exists; the work is consolidation and the guarantee, not new infrastructure.

---

## Reach & sizing

Inputs (all directional; primary sources were blocked this run):
- Android active base **~3.8–3.9B** (third-party; Google's last official figure is 3B from 2021) [snippet].
- Classic ML Kit reaches ≈ the whole Play-services base; the delivery problem applies to **every unbundled model**, across barcode/translate/face/segmentation and the GenAI path.
- ML Kit ≈ **85–90% share within apps that use any text-processing SDK** (42matters) — a dominance/ceiling proxy, **not** an install-weighted number [snippet].
- Device eligibility is a near-non-issue for classic models (API 26+ ≈95% [stale snippet]); the GenAI slice is the familiar ~3.7% (140M+ Nano devices, Google Jul 2026, against ~3.8B — my arithmetic).

**My arithmetic, ranged, not a point estimate:** this is plumbing every ML-Kit-using app benefits from without adopting a new product, so the relevant number is not "apps that adopt a new API" but "integrators who shed the workaround." If even the within-category dominance figure is directionally right, the *problem* touches a double-digit percentage of the serious-app install-weighted surface. I explicitly cannot compute the `%installs÷%apps` multiplier this run (AppBrain blocked), so I will not put a single number on it. **Sensitivity:** halve the reach assumption and the verdict does not flip — the idea's weakness is never reach, it is that the observable-state substitute already ships (S3/S5), so reach sensitivity is not the deciding experiment. The deciding experiment is in Kill criteria.

**Engineering cost avoided:** per app, days-to-low-weeks of workaround code (PR #232 is the unit) plus the recurring tax of it breaking on model/SDK updates (#1061). Across the classic-ML-Kit base that is real aggregate savings, but *shallow per app* — which is why this is platform hygiene, not a headline API.

---

## Adoption path

1. **The hook:** a developer with a flaky "model not downloaded" bug (there are many — #641 is open) replaces their `InstallStatusListener` block with `MlKitModels.availability(...)` and gets the terminal `Unreachable(Offline)` state they could never derive. Fifteen minutes, fewer lines, a bug closed.
2. **First real integration:** they gate the feature's UI on `ensureReady()` and delete their hand-rolled timeout — shipping a trustworthy "preparing…" state instead of a silent dead feature.
3. **The dependency:** once the UI trusts `Available`, removing the contract means re-accepting silent failures — a dependency they'd endorse, not resent.

First adopters are the RN/Flutter wrapper maintainers (vision-camera #2256 is the reference case: one popular wrapper adopting it fixes the problem for thousands of downstream apps at once). Second wave is the GenAI early adopters, for whom a wrong `AVAILABLE` is a brand bug, not an annoyance.

---

## Execution plan

- **Developer preview:** ship the unified `availability()` façade over the *existing* surfaces (no guarantee yet) and answer one question — do integrators consolidate onto it, or keep their inline code? Partners: the top RN/Flutter camera/translate wrappers.
- **Alpha/Beta:** add the **verified-`Available`** guarantee and the terminal `Unreachable` state. Graduation condition: `AVAILABLE`-then-fail reports (the #1078 class) drop to ~zero across the partner set on real devices.
- **GA:** commit the **output-stability + state-versioning contract** — states and their meaning pinned independently of Nano/SDK version. This is the surface you must hold for five years.

**Org dependencies, named honestly:** this cannot ship from the ML Kit team alone. The verified-`Available` guarantee needs the **Play Services / AICore delivery team** to expose package-presence truth (the same team that said in #315 they were "waiting for a download infrastructure update"). If they don't commit, the idea degrades to a cosmetic façade over the existing four surfaces — real but much weaker. That dependency is the single biggest risk to the plan and the reason the verdict is Prototype, not Build.

---

## The case against

The strongest case against, argued at full strength: **the platform already absorbed this problem** (adoption failure mode #2, your own roadmap eating your API). `checkFeatureStatus()`, `RemoteModelManager`, `DownloadCallback` and Play `AiPackState` already exist; a skeptic will say the residual gap is a docs-and-bugfix job (fix #1078, add a boolean, improve the guide), not a new public surface — and much of it genuinely is. This is a Type C/E hybrid whose honest core is "make the existing surfaces trustworthy and consolidate them," and that framing loses internal prioritization fights to demoable work precisely because it is invisible in a demo.

The mitigation does not fully dissolve the objection, which is why the score is what it is: the *verified-`Available` guarantee* and the *terminal offline state* are not borrowable and not a docs fix — they require platform-owned truth about package presence and network reachability. That part is a real platform API. But if the delivery-infra team won't expose that truth, what's left is consolidation, and consolidation alone is a 3/5 idea. The live risk here is not that the hardware outran the API or that a free substitute undercuts it — it is **deprecation-by-a-thousand-cuts avoided only if the contract is held**: a delivery SLA you break is worse than the four messy surfaces you replaced.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if the Play Services / AICore delivery team declines to expose verified package-presence (so `Available` cannot be made a guarantee) **and** the GenAI `AVAILABLE`-then-fail class (#1078) is fixed as an isolated bug within one release — then the residual is pure consolidation, this drops below Prototype, and runner-up #2 (eval tooling) should take the slot. Checkable by: a design conversation with that team, and watching whether #1078 closes as a point-fix or a contract change.

**Load-bearing assumption:** that `AVAILABLE`-then-fail and the missing offline-terminal state are *structural* (the delivery layer genuinely can't tell the app the truth), not incidental bugs. If they're incidental, this is a bug report, not a platform API.

**Re-check trigger if shelved:** the DMA Android-18 implementation (due 2027-08-01) — if Google must expose a third-party on-device-model discovery/invocation framework anyway, this contract becomes the natural, and near-mandatory, shape of it.

---

## Fit for this team

ML Kit is the right owner *only if* it can broker the Play Services/AICore guarantee; it is the sanctioned front door to both classic models and (via the Prompt API) AICore, so it is the one place a *unified* contract across classic + GenAI could live. MediaPipe/LiteRT own runtimes, not managed delivery; Firebase AI Logic owns cloud routing, not on-device package truth; Play for On-device AI owns custom-model delivery but not ML Kit's own models. If, however, the real owner of delivery truth is the Play Services team, the honest conclusion is that **ML Kit should define the contract and Play Services must back it** — and if that brokering can't happen, this should not ship from ML Kit as a façade pretending to a guarantee it can't keep.

---

## Open questions

- **Install-weighted reach multiplier** (`%installs÷%apps` for ML Kit) — not computable this run; AppBrain was egress-blocked. Settle with one unblocked AppBrain fetch.
- **Did anything change Aug–Oct 2026?** No ML Kit release-note entry after ~2026-07-21 surfaced, but the page could not be byte-verified (egress-blocked). Re-fetch release notes + Maven for `genai-prompt`/`genai-summarization`.
- **Is #1078 structural or incidental?** The whole verdict hinges on it (see Kill criteria) and it can only be settled inside Google.
- **No idea ledger persisted** in this fresh container, so repeat-avoidance across runs is currently unenforced. If this skill is meant to run daily, it needs a committed ledger file (see run note).

---

## Runners-up (considered and dropped this run)

- **On-device GenAI eval/quality harness (Type D):** sharpest competitive gap — Apple shipped an Evaluations framework + token/usage/cache/reasoning accounting at WWDC26 (confirmed, Apple docs); ML Kit ships a *prose* "evaluate prompt quality" page + cloud-only Vertex APO, no on-device harness; AI Edge Portal measures latency/memory only. Lost the slot **only on demand evidence** — this run gathered none for it, and on-device eval demand is plausibly thin while so few apps ship on-device GenAI (S1 unverified). Promote next run with a demand pass.
- **Deferred/opportunistic inference scheduling (Type E):** maximal platform privilege, no competitor, ties to real thermal-throttling failures — but invisible-in-demo and demand not researched this run.
- **On-device safety/moderation classifier (Type G):** strong privilege + Play-liability + regulatory pull; risk is that T&S policy is each company's proprietary surface, so a one-size classifier may be unusable without heavy tunability.
- **On-device neural TTS (Type A):** genuine whitespace (Google has only the parametric `TextToSpeech`; Apple shipped speech generation; Picovoice sells Orca) — **failed the feasibility gate for this run**, un-verified on the p50 device, so parked rather than pursued.
- *(Dropped at triage: speaker diarization/ID, sub-8GB reach tiering, age-signal enforcement — all viable, none beat #1 on the demand × privilege combination this run.)*

---

*Sources (cited above):*
- *ML Kit model-delivery feature request #315 — https://github.com/googlesamples/mlkit/issues/315*
- *Hand-rolled workaround PR (merged 2026-09-19) — https://github.com/o-benjamin/fansa-uchiwa-android/pull/232*
- *react-native-vision-camera #2256 — https://github.com/mrousavy/react-native-vision-camera/issues/2256*
- *"Waiting for module" cluster — https://github.com/googlesamples/mlkit/issues/641 (also #308, #837)*
- *Binary download progress — https://github.com/firebase/firebase-android-sdk/issues/1656*
- *GenAI AVAILABLE-but-fails #1078 — https://github.com/googlesamples/mlkit/issues/1078 (also #944, #954, #1061, #1070)*
- *Apple Foundation Models availability enum — https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason*
- *Qualcomm GenieX — https://github.com/qualcomm/GenieX*
- *EU DMA Art. 6(7) Alphabet decision (DMA.100220) — https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en*
