# Model Delivery Contract — the download state machine Google already built, pointed at the models developers actually ship

**Type:** E (Delivery & lifecycle), with a Type B/C extension component · **Verdict:** Build · **Opportunity: 8/10 (Strong infrastructure bet)**
*2026-10-31 · Prepared for Android ML Kit · Evidence current as of 2026-10-31*

> On a Tuesday, an Android engineer ships a translation feature with ML Kit. It works on their Pixel. Then the crash-free-but-feature-missing reports arrive: users on slow networks, users offline, users on a two-year-old phone where the model download silently never completes. Their code caught `MlKitException.UNAVAILABLE`, kept the analyzer alive, and — in the words of the developer who filed the request — "hope[d] for the Play Services to eventually download the model." There is no progress bar they can draw and no way to tell the offline user why the feature isn't there. This proposes the one thing that fixes it: a unified, observable delivery state machine plus the industry's first delivery SLO, across every ML Kit model that downloads on demand. It is not a new capability — Google already built the ideal version of it, for the wrong models.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 8/10 — Strong infrastructure bet | Composite 4.05 × 2 = 8.1; no gate scored 3 (no −1), S1 was 4 not 5 (no +1) → 8. The 8 leans on privilege + confidence, not on a sized ceiling (see S2 caveat) |
| Platform privilege (gate) | 5/5 — pass | Model delivery is owned by Play Services; `RemoteModelManager` and `ModuleInstallClient` are platform-only, and `AiPackState` is already Google's. Only the platform can offer a delivery SLO. [Play on-device AI](https://developer.android.com/google/play/on-device-ai) |
| Feasibility headroom (gate) | 5/5 — pass | The state machine already ships three times over (`AiPackStatus`, `FeatureStatus`, iOS `NSProgress`). This is API/contract plumbing, not a model — no silicon gate. |
| Durability (gate) | 4/5 — pass | ML Kit is an active, non-deprecated SDK (releases through Oct 2026). The additive state-machine half is low-risk; the SLO half is the part that needs an owner willing to hold a contract for five years. |
| Demand evidence (25%) | 4/5 | Verbatim, dated, Google-acknowledged, and partly unresolved in the official tracker ([#315](https://github.com/googlesamples/mlkit/issues/315), [#773 open](https://github.com/googlesamples/mlkit/issues/773), [#1062 open](https://github.com/googlesamples/mlkit/issues/1062)). Narrow/low-volume; no commercial vendor (structurally impossible — you can't resell Play Services delivery). |
| Install-weighted reach (15%) | 4/5 | Classic ML Kit runs on the [TFLite-in-Play-services 1B+ MAU](https://android-developers.googleblog.com/) substrate (Google-published); the downloaded-model subset is the addressable surface. Hard adoption multiplier **unverified** — AppBrain was unreachable this run. |
| Build-vs-buy-vs-borrow (20%) | 3/5 | A sealed state class + poll loop is a cheap *borrow* for the happy path; the device/OS-specific failure tail and the SLO are not borrowable at any price. The borrow option caps this at 3. |
| Integration cost / TTFHW (15%) | 5/5 | A status call + callback, one Gradle line, no new permission, works in the emulator, deletes hand-rolled code. Sub-15-minute hello-world is realistic. |
| Substitute half-life (15%) | 4/5 | No general model can absorb "is the model present and will Play Services deliver it." The real substitute risk is Google's *own* roadmap (Play for On-device AI extending to first-party models). |
| Strategic complement (10%) | 5/5 | De-risks adoption of *every* ML Kit API, increases on-device inference, and is the instrumentation Google needs to prove DMA performance-equivalence. Clears the platform test. |
| **Composite** | **4.05** | Weighted mean of S1–S6. Sits right at the Build threshold — an honest Build, not a comfortable one. |

The scoring is least trustworthy on **install-weighted reach (S2)**: I could not retrieve AppBrain's %-apps/%-installs figures this run (host unreachable), so the adoption multiplier and three-year ceiling are asserted from the capability's breadth, not computed. If a hard number came in low, S2 falls to 3 and the composite to ~3.9 (Prototype) — see sensitivity.

---

## The problem

The job, stated as an engineer's job under a deadline: *"Ship an ML Kit feature that behaves predictably for a user whose model isn't on the device yet — including the user who is offline, on a slow network, in a blocked region, or on a phone where the download just fails — and show them something truthful while they wait."* The competing solution is their own code, and it loses.

This problem is structurally produced, not an accident of tooling. A 100M+ install Android app cannot bundle every model: Google Play's own figure is that each 6 MB of APK growth costs ~1% of install conversion, worse in growth markets, so large apps push models to on-demand download precisely to protect the install funnel. Dynamic delivery then hands them a reliability problem they cannot see into. Model delivery is owned by Play Services; the calling app gets, for the classic unbundled models, a single boolean (`isModelDownloaded()`) and a `Task` that either succeeds or throws — "downloads for each model type may encounter different `MlKitException.ErrorCode`s," so retry logic branches per model by hand. There is no progress value on Android (iOS, oddly, already returns `NSProgress`), no "will-never-be-available-on-this-device" terminal state, and no offline signal. Google's own installation-paths doc concedes the consequence plainly: if you use the on-demand path, "inference requests will fail until the download is completed."

What do they do instead today? They hand-roll it. They catch `UNAVAILABLE`, keep the analyzer alive, poll, and hope. They write sealed status types (`NotStarted / Pending / Resolved / Stalled / Failed`) and manual retry loops with timeouts, as public gists and sample repos show. On the newer GenAI/Nano path they get a real four-value enum (`FeatureStatus`) and a byte-progress callback — but in 2026 that state machine is itself buggy: `checkFeatureStatus()` throws `FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE` on un-provisioned devices, and downloads get stuck in `DOWNLOADING` after a low-storage error with no recovery signal. So the app can't trust the status even where a status exists. This is the whitespace: not "there is no state machine," but "the state machine is boolean on the high-reach models, buggy on the low-reach ones, excellent only for models you supply yourself, and nowhere backed by a contract."

---

## Proof & signals

The section a skeptic reads first. Everything load-bearing here is sourced; where I could not retrieve a channel, I say so rather than smoothing it over.

- **Developers doing it by hand — the hero signal.** [googlesamples/mlkit #315, "ML Kit: On-Device Model Download API"](https://github.com/googlesamples/mlkit/issues/315) (opened 2021-06-21). Verbatim: *"There is still no way to get availability and download status of the unbundled standard ML Kit models"* … *"Currently we keep the analyzer alive when a MlKitException.UNAVAILABLE exception occurs … and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* Google's own reply: *"We had it planned but didn't have cycle to get to it."* **Status [verified]: closed/completed 2022-08-31 — but only partially**, by pointing developers to Play Services `ModuleInstallClient` for detectors that extend `OptionalModuleApi` (e.g. BarcodeScanner). A general availability/download-status API for all unbundled models was never shipped. The flagship request was acknowledged, half-answered, and closed — the sharpest possible demand signal short of a vendor charging for it.
- **The pain recurs, dated and still open.** [#773](https://github.com/googlesamples/mlkit/issues/773) (open, 2024-02-09): Translation download "only updates when the download is finished instead of incrementally" — no usable progress bar. [#1062](https://github.com/googlesamples/mlkit/issues/1062) (open, 2026-07-16): `checkFeatureStatus()` "throw[s] `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`," reproduced on Pixel 9a and Pixel 10 — the GenAI state machine misreports availability. [#1080](https://github.com/googlesamples/mlkit/issues/1080) (open, 2026-10-12): GenAI prompt "stuck at 'Downloading' after low storage error." [#978](https://github.com/googlesamples/mlkit/issues/978) (open, 2025-09-26): entity-extraction model download "not usable in mainland China" — a geographic/offline delivery failure. A 2019→2026 tail of stuck/silent downloads ([#59](https://github.com/googlesamples/mlkit/issues/59), [firebase/quickstart-android #784](https://github.com/firebase/quickstart-android/issues/784)) shows the reliability problem is old and device-specific, with Google itself noting "more download retries are needed."
- **Someone charging money for it: structurally absent, and that absence is not a negative.** No third party sells "ML Kit delivery observability," because you cannot resell a wrapper around Play-Services-owned delivery — the privileged surface is the product. The willingness-to-pay signal that usually validates a Type A idea is unavailable here by construction; weigh the issue-tracker signal accordingly rather than marking demand down for a signal that cannot exist.
- **Apps shipping around it:** public gists and sample repos (e.g. an on-device-model download gist recommending a `Progress/Done/Failed` sealed state with temp-file-then-rename and size verification) show the DIY state machine the platform should own. Traction here is weak/indirect — treat as corroboration, not proof.
- **The absence signal:** Stack Overflow and Reddit were **crawler-blocked this run** (400 "not accessible"); I have no verifiable quotes from either. That is a tooling limit, not evidence the threads don't exist — flagged in Open questions.

Distinguishing provenance: the 1B+ MAU and Android-distribution figures below are **Google-published**; the 140M Nano figure is **Google-attributed via the July 2026 Android Developers blog**; AppBrain adoption figures are **unretrieved** this run.

---

## Why now

1. **Capability shift — on-device GenAI went preview→production in a year.** ML Kit's Prompt API moved [Alpha (30 Oct 2025)](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) → Beta (28 Jan 2026) → feature-complete betas through ~21 Jul 2026 (Structured Output, System Instructions, Thinking Mode), with Function Calling in Preview 26 Oct 2026 ([release notes](https://developers.google.com/ml-kit/release-notes)). The installed base is now large enough that silent-availability failures hit real users, and the 2026 open issues (#1062, #1080) are the proof.
2. **Competitive + regulatory shift.** Competitively, Apple's [Foundation Models framework](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) (iOS 26, 9 Jun 2025; continued iOS 27, 2026) ships exactly the observability ML Kit lacks: a first-class `availability` state machine with typed unavailable reasons (`deviceNotEligible`, `modelNotReady`), `tokenCount(for:)`, `contextSize`, and a documented "updating prompts for new model versions" contract. Regulatorily, the EU DMA specification decision **Case DMA.100220** (Alphabet/Android, Art. 6(7), ~16 Jul 2026; compliance in Android 18 by **1 Aug 2027**) requires free, performance-equivalent third-party access to Android's on-device model layer, including Gemini Nano, and the ability for third parties to install/run/share their own on-device models. *[Primary text not byte-verified this run — the Commission hosts were unreachable; reconstructed from search snippets quoting the portal. Verify before quoting the decision verbatim.]*
3. **Demand shift — the cloud fallback is being removed.** [Firebase ML shuts down 15 Jun 2027](https://developers.google.com/ml-kit/migration), removing the cloud path apps lean on when an on-device model is missing. When "just call the cloud" disappears, a trustworthy on-device availability signal stops being optional and becomes load-bearing.

This is an unusually strong three-part why-now: a capability curve, a dated competitor, and a dated statutory forcing function all pointing the same way.

---

## The capability gap

Be exact about the boundary — this is where the report would get embarrassed if it were loose.

- **ML Kit classic unbundled (translation, segmentation, entity extraction):** `RemoteModelManager.isModelDownloaded()` → boolean; `.download()` → success/failure `Task`. No state enum, **no progress on Android** (iOS returns `NSProgress`), no offline/terminal signal. ([reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager))
- **ML Kit GenAI (Prompt/Nano):** `FeatureStatus` = `UNAVAILABLE / DOWNLOADABLE / DOWNLOADING / AVAILABLE`, with a byte-level `DownloadCallback`. Rich — but beta, AICore-gated to ~3.7% of the fleet, and demonstrably buggy in 2026 (#1062, #1080).
- **Play for On-device AI:** the *ideal* machine already exists — `AiPackStatus` with ten states (`NOT_INSTALLED, PENDING, DOWNLOADING, TRANSFERRING, COMPLETED, FAILED, CANCELED, WAITING_FOR_WIFI, REQUIRES_USER_CONFIRMATION, UNKNOWN`), `bytesDownloaded()`, `totalBytesToDownload()`, `transferProgressPercentage()` — **but only for models the app supplies**, not ML Kit's own. ([doc](https://developer.android.com/google/play/on-device-ai))
- **Apple Foundation Models:** typed `availability` + reasons, OS-managed download, **no progress, no app control.**
- **No vendor anywhere — Google, Apple, Qualcomm (GenieX), MediaPipe — publishes a delivery SLO.** Play's install-time "guarantee" is a packaging behavior, not a contract.

The **main competitor** a developer uses today is their own hand-rolled sealed-state + retry + poll loop, with "ship the model in the APK and eat the install-conversion cost" as the fallback. That is the thing this is priced against.

---

## Proposed surface

A **Model Delivery Contract**: one observable delivery state machine + incremental progress + offline/terminal signal, exposed uniformly across *all* ML Kit downloadable models, backed by a delivery SLO. The design move is not invention — it is porting the `AiPackState` machine Google already ships onto ML Kit's own delivery, and committing to a contract on top.

The observable state machine (Type B/C extension — adopt the shape Google already owns):

```kotlin
// Uniform across translation, segmentation, entity extraction, GenAI, …
val flow: Flow<ModelDeliveryState> = MlKit.modelDelivery(model).observe()

sealed interface ModelDeliveryState {
  object Available : ModelDeliveryState
  object Downloadable : ModelDeliveryState               // will download on request
  data class Downloading(val bytesDone: Long,
                         val bytesTotal: Long) : ModelDeliveryState   // fixes #773
  object WaitingForWifi : ModelDeliveryState             // from AiPackStatus
  object WaitingForNetwork : ModelDeliveryState           // the offline signal #315 asked for
  object NeverAvailableOnThisDevice : ModelDeliveryState  // terminal — stop hoping
  data class Failed(val reason: DeliveryError,
                    val retryable: Boolean) : ModelDeliveryState       // typed, not per-model guesswork
}
```

The contract (Type E — the platform-privileged half nobody else can offer):

- **Delivery SLO**, published per model-class and per network state: e.g. "given connectivity, time-to-available at p50/p95," a success-rate commitment, and an explicit "this model will never be delivered on devices below spec X" terminal guarantee so apps stop polling forever.
- **Output-stability note:** delivery is orthogonal to model output, so the five-year commitment here is about *states and timings*, not generation schemas — which makes it a safer contract to hold than a GenAI output contract.

What it deliberately does **not** do: it does not promise a model will fit, run fast, or produce good output; it does not schedule deferred inference (that is a separate Type E idea); it does not expose AICore internals. It answers exactly one question — *will this model be here, when, and if not why* — and nothing else.

**Time-to-first-hello-world target: under 15 minutes.** What has to be true: it ships as a method on existing ML Kit model handles (no new artifact, no key, no new permission), returns a `Flow`/callback that works in the emulator, and the migration is "delete your poll loop, collect this flow." If it can't hit 15 minutes it has failed its own design brief — but because the surface already exists in two sibling products, this is achievable.

---

## Reach & sizing

Showing the arithmetic, with the one input I couldn't get flagged.

- **Capability reach (device eligibility):** the classic-unbundled half runs on the ML Kit classic substrate — [TFLite-in-Play-services, 1B+ MAU, Google-published] — gated well below API 26, so effectively the whole modern Play-services base ([≥API 26 ≈ 97.6%](https://apilevels.com/), Google Play Dec 2025). The GenAI half is gated to the Nano base: 140M+ devices (Google, Jul 2026) against ~3.8B Android actives (third-party denominator) → **~3.7%, my arithmetic**. The feature's *reach ceiling* is therefore set by the classic half and is very high.
- **Addressable apps / install-weighted reach:** this is the number I could not compute. AppBrain (the only usable %-apps *and* %-installs source) was unreachable this run, so I have no adoption multiplier or three-year ceiling. Qualitatively: the feature applies to any app calling a *downloaded* (not bundled) ML Kit model; large apps disproportionately choose dynamic delivery to protect install conversion (P4), which skews the install-weighted base upward even if the app-count share is modest. I will not put a false point estimate on it.
- **Engineering cost avoided (numerator of the platform test):** per adopting team, this removes a hand-rolled sealed-state + retry + offline-detection layer that the 2019→2026 issue tail shows teams get wrong for years — call it 1–3 engineer-weeks to build badly, recurring maintenance across device/OS-specific failures, versus ~hours to integrate. The SLO additionally removes risk that teams currently cannot buy at any price.

**Sensitivity.** Halve the two softest assumptions — the downloaded-model share of the ML Kit base, and the adoption ceiling. The *reach* number falls, but the verdict survives, because the build cost is near-zero marginal: the surface is ported from `AiPackState`, not invented, so the platform test (value ÷ build+maintenance) stays well above 10× even at low adoption. The decision is robust to the sizing gap precisely because the thing is cheap to ship. **This is the rare case where the missing number doesn't flip the call** — but if I'm wrong that most big apps use *dynamic* rather than *bundled* models, the pain is smaller than the issue tracker implies, and that is the one experiment worth running (instrument delivery-path choice across the top 200 ML Kit apps).

---

## Adoption path

1. **The hook:** a developer with a `#773`-shaped bug (no progress bar) or a `#315`-shaped bug (offline users silently feature-less) swaps their poll loop for `observe()` and ships a real progress UI in an afternoon.
2. **First real integration:** they delete their retry/availability code and depend on the typed `Failed(reason, retryable)` and `NeverAvailableOnThisDevice` states to drive UI — replacing the single most error-prone part of their ML Kit integration.
3. **The dependency they'd endorse:** once their UX promises "download in progress, 40%" and "unavailable on this device, here's why," they can't go back to a boolean — and the SLO lets their PM promise a feature availability number to *their* leadership, which is a dependency a tech lead defends rather than resents.

**First adopters:** translation-heavy apps and the apps already filing these issues (the self-identified requesters in #315, #773, #978). **Second wave:** GenAI adopters once the `FeatureStatus` bugs (#1062, #1080) are folded into the unified surface. The funnel starts with a named, credible set of builders asking for exactly this.

---

## Execution plan

- **Developer preview:** unify the classic-unbundled models behind the `AiPackState`-shaped `Flow`, no SLO yet. Question it answers: do teams actually delete their hand-rolled code? Partners: the #315/#773 requesters. Evidence collected: integration-time and lines-deleted.
- **Alpha/Beta:** fold in the GenAI path and *fix* `FeatureStatus` (#1062) as part of unification; add progress to the classic path (#773). Graduation condition: one named production app shows a real progress/availability UI driven entirely by the API, and the GenAI status API reliably returns `UNAVAILABLE` instead of throwing.
- **GA:** commit the delivery SLO and the state schema, versioned independently of any model. This is the surface held for five years.

**Org dependencies, honestly:** the delivery mechanism is owned by the **Play Services / Play for On-device AI** team, not ML Kit. ML Kit owns the developer-facing surface for its own models but cannot commit a delivery SLO alone. If that team says no to a contract, the state-machine half still ships (it's a read over existing delivery) but the differentiated SLO half does not. An execution plan that pretended ML Kit controlled delivery would be a wish; it doesn't, and the SLO is a joint commit.

---

## The case against

The strongest argument against, at full strength: **the platform will absorb this underneath you.** Google already owns the ideal state machine in Play for On-device AI and a (buggy) one in GenAI. The honest read is that the "right" long-term home for a unified model-delivery machine may be Play for On-device AI extended to deliver first-party ML Kit models — in which case ML Kit shipping its own surface now is either a stopgap that gets deprecated (a churn event across the portfolio, failure mode #6) or a fork that fragments the delivery story further. This is the live failure mode here — not "the API outran the hardware" (feasibility is trivial) and not purely "undifferentiated free substitute," though the basic progress-bar half *is* borrowable and a skeptic is right that, absent the SLO, a team can hand-roll a passable version in a few weeks.

The mitigation, made only after conceding the argument: the state-machine half should be *designed as* the `AiPackState` shape precisely so that if Play for On-device AI later becomes the unified home, ML Kit's surface is a thin, forward-compatible façade over it rather than a competing abstraction — i.e. build it to be absorbed gracefully. And the SLO is the part no substitute reaches and no hand-rolled code can promise; that is where the durable value sits, which is also why the recommendation is Build-but-jointly, not Build-alone.

---

## Kill criteria

**The single observation that would reverse this:** if Google announces at I/O 2027 that Play for On-device AI delivers ML Kit's own first-party models through `AiPackState`, the state-machine half is redundant on arrival and only the SLO survives — downgrade to "contribute the SLO to that effort," not a standalone ML Kit surface.

**Load-bearing assumption:** that a meaningful share of ML Kit's *install-weighted* base uses dynamically downloaded (not bundled) models, so silent-delivery failure actually bites at scale. If most large apps bundle, the pain is real but narrow. This is the AppBrain gap and the experiment named in Reach & sizing.

**Re-check trigger if shelved:** either the DMA Android 18 compliance work (by 1 Aug 2027) forcing a delivery/availability definition anyway, or a third open-issue cluster on GenAI availability bugs — either resurfaces this.

---

## Fit for this team

ML Kit is the right owner of the *developer-facing availability surface for its own models* — nobody else should be teaching developers how to observe translation-model delivery. But the *delivery mechanism and any SLO* belong to Play Services / Play for On-device AI, which already owns `AiPackState`. So the honest conclusion is a split: ML Kit owns and ships the observable surface and the `FeatureStatus` fix; the delivery SLO is a joint commit with the Play team, and if a unified delivery home emerges there, ML Kit's surface should be built to fold into it. Saying "this is partly another team's" is more valuable here than claiming the whole territory, because the biggest internal risk in this ecosystem is a capability landing in the wrong part of Google's stack and fragmenting the developer story further — and delivery is exactly where that fragmentation already exists (two state machines, two products).

---

## Open questions

- **AppBrain %-apps / %-installs for ML Kit** — unretrieved (host unreachable this run). Would settle the adoption multiplier and three-year ceiling, i.e. S2. *Settle by:* re-running with AppBrain reachable, or a manual browser pull.
- **Dynamic vs bundled model share across the top ML Kit apps** — the load-bearing assumption. *Settle by:* instrumenting delivery-path choice across the top 200 ML Kit apps, or a Play SDK Index pull (which also didn't render to a fetcher).
- **DMA.100220 primary text** — reconstructed from search snippets; the on-device-model scope wording and the exact decision date (16 vs 27 Jul 2026) are not byte-verified. *Settle by:* fetching the Commission case-summary PDF with the EU hosts allow-listed.
- **Stack Overflow / Reddit developer voice** — crawler-blocked this run, so demand rests on the official tracker alone. *Settle by:* an unblocked crawl to confirm (or not) broader volume.

---

## Runners-up

- **On-device user-content moderation classifier (Type G)** — strong regulatory clock (minors laws from Jan 2026; Play output liability) and Bumble open-sourced its own, but the one-size-fits-all/tunability problem risks the Durability gate; needs its own run to handle liability framing.
- **GenAI eval harness + token accounting (Type D)** — Apple shipped Evaluations + `tokenCount`; ML Kit ships a prose "evaluate prompt quality" page with no tooling. Lost on demand *strength*: compelling competitive gap but thinner dated developer-voice evidence than the delivery pain.
- **On-device neural TTS (Type A)** — genuine whitespace (Google has nothing; Picovoice sells Orca), but G1 Platform Privilege is shaky: OSS TTS models make a Gradle-dependency equivalent plausible for a small team.
- **Deferred/opportunistic inference scheduling (Type E)** — real (no vendor offers it) but narrower demand evidence and a harder "what does the app actually observe" design than the delivery-state idea; a sibling, not a competitor.
- **On-device speaker diarization / speaker ID (Type A)** — Picovoice sells both and it's clean whitespace, but narrow install-weighted reach and the same OSS-privilege question as TTS.

The delivery-contract idea beat these on the one dimension that falsifies from outside the building — dated, verbatim, Google-acknowledged demand in Google's own tracker — combined with maximum platform privilege and trivial feasibility. It is the highest-confidence Build even if not the most exciting demo.

---

*Sources: [mlkit #315](https://github.com/googlesamples/mlkit/issues/315) · [mlkit #773](https://github.com/googlesamples/mlkit/issues/773) · [mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) · [mlkit #1080](https://github.com/googlesamples/mlkit/issues/1080) · [mlkit #978](https://github.com/googlesamples/mlkit/issues/978) · [mlkit #59](https://github.com/googlesamples/mlkit/issues/59) · [firebase/quickstart-android #784](https://github.com/firebase/quickstart-android/issues/784) · [RemoteModelManager reference](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Prompt API Alpha blog](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) · [Thinking Mode](https://developers.google.com/ml-kit/genai/prompt/android/thinking-mode) · [On-device inference blog, 140M](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html) · [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [ML Kit migration / Firebase ML shutdown](https://developers.google.com/ml-kit/migration) · [DMA Alphabet proceeding](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [apilevels.com](https://apilevels.com/)*
