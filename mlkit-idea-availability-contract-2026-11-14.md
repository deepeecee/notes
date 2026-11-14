# The Availability Contract ML Kit Already Wrote Once — give classic ML Kit the delivery observability GenAI already ships

**Type:** E — Delivery & lifecycle (with a strong C, developer-experience, component) · **Verdict:** Build · **Opportunity: 7/10 (Strong, unglamorous)**
*2026-11-14 · Prepared for Android ML Kit · Evidence current as of 2026-11-14*

> *Badges: Regulatory clock (DMA, 1 Aug 2027) · Apple already shipped this · You already shipped this — on the wrong tier · Weak rally, strong recurrence*

> A developer shipping on-device Translate keeps their analyzer alive after an `MlKitException.UNAVAILABLE` and re-runs inference "hoping Play Services downloads the model," with — in their own words — "no indicator" when the user is offline and it never will. That exact request, [issue #315](https://github.com/googlesamples/mlkit/issues/315), was filed in 2021, acknowledged by Google as "planned but didn't have cycle," and is still open-in-spirit in 2026. Meanwhile ML Kit's *own* GenAI tier shipped the fix — a status enum, byte-level progress, a typed failure — in July 2026. The gap is not a missing capability. It is a capability Google built for the ~3.7% of the fleet that runs Gemini Nano and withheld from the ~99.8% that runs classic ML Kit.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, unglamorous | composite 4.15 × 2 = 8.3, −1 for durability gate at 3; S1 not a 5, so no bonus → ~7.3, rounded to 7 |
| Platform privilege (gate) | 5/5 — pass | Play Services/GMS owns model delivery; Google's own #315 reply: "waiting for a download infrastructure update from Play Services." Nothing outside Google can observe that state |
| Feasibility headroom (gate) | 5/5 — pass | The contract already exists in Google's code: GenAI [`FeatureStatus`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) + [`DownloadCallback`](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback), and Play AI-pack [`AiPackState`](https://developer.android.com/google/play/on-device-ai). No model to train |
| Durability (gate) | 3/5 — pass, weakest | ML Kit itself is durable, but [Firebase ML shuts down 15 Jun 2027](https://firebase.google.com/docs/ml) and the Google graveyard shows a steady ML/API mortality tail; a delivery *contract* broken is worse than one never made |
| Demand evidence (25%) | 4/5 | Convergent first-party-tracker cluster 2019→Nov 2026 (#315, #773, #837, #944, #1063, #1079, #1080, #1085); but low rally intensity (≤3 👍) and no fetchable SO/Reddit/HN this run |
| Install-weighted reach (15%) | 4/5 | Classic tier reaches ~99.8% at API 21 ([apilevels](https://apilevels.com/)); m_install ≈ 9.6× (TF Lite proxy) → ~15–25% install-weighted, saturating. ML Kit's own AppBrain row not retrievable [unverified] |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The DIY path can't be done right — Play Services download state is unobservable from outside, so "keep-alive-and-hope" is the ceiling, not a weekend fix |
| Integration cost / TTFHW (15%) | 5/5 | A callback swap for devs already on ML Kit: one existing dependency, no new permission, negligible size, under 15 min |
| Substitute half-life (15%) | 4/5 | No external substitute can reach Play Services delivery state; the only thing that makes it redundant is Google's own roadmap or the DMA mandate |
| Strategic complement (10%) | 4/5 | Deepens the managed Play/ML Kit path, blunts the reason to flee to bundle-your-own/llama.cpp, and pre-positions for the DMA interoperability deadline |
| **Composite** | **4.15** | Build (≥4.0), but a reader could fairly call it a high-end Prototype — see The case against |

*Least trustworthy score:* **Demand (S1).** The first-party signal is real and recurring, but low-rally, and Stack Overflow / Reddit / HN were unreachable this run, so cross-channel intensity is estimated, not measured.

---

## The problem

A large consumer Android app does not integrate an on-device model once; it integrates the *lifecycle* of a model it does not control. For ML Kit's classic APIs — translation, segmentation, face detection, entity extraction, smart reply, digital ink — the model is not in the APK. It is delivered at runtime by Google Play Services, on a schedule the app cannot see, under network conditions the app cannot predict, to a device the app cannot fully enumerate. The job to be done, stated as the developer's: *"Tell me whether this model is here, whether it's coming, how far along it is, and — if it is never coming — why, so I can show the user something true instead of a spinner that hangs forever."*

What they do instead today is hand-roll a guess. The canonical pattern, from the developer who filed [#315](https://github.com/googlesamples/mlkit/issues/315): keep the analyzer alive on `UNAVAILABLE` and retry, "hoping Play Services eventually downloads the model." It mostly works — and then silently doesn't, for a subset of users on a subset of devices ([#837](https://github.com/googlesamples/mlkit/issues/837): "Sometimes, they just don't load for some users"), with no progress bar possible because the only progress callback fires once, at 100% ([#773](https://github.com/googlesamples/mlkit/issues/773)), and no way to distinguish "offline, will never arrive" from "downloading, wait." The alternative workaround is to bundle the model and pay the install tax — and Google Play's own figure is that every 6 MB of APK growth costs ~1% of install conversion, worst in the growth markets where more than half of users have no wifi.

This is structurally produced, not a bug. A 100M+ install app operates a fleet spanning six-year-old SoCs and users who are offline for days; model delivery is therefore *inherently* asynchronous, failure-prone, and device-specific. Every such app needs the same four facts — present, coming, how-far, why-not — and every one of them currently reconstructs those facts badly from a boolean and an exception. When every app solves the same thing identically and badly, it is a platform problem. The tell that it belongs in the platform specifically: the state the apps are guessing at *lives inside Play Services*, where only the platform can read it.

---

## Proof & signals

- **Developers doing it by hand — the keep-alive-and-retry loop.** [#315](https://github.com/googlesamples/mlkit/issues/315) (2021-06-21): *"we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs… But if the user is offline e.g. this won't happen at all and we have no indicator about that."* Google's reply: *"Yes… We had it planned but didn't have cycle to get to it,"* later *"We're waiting for a download infrastructure update from Play Services."* First-party source, Google-acknowledged, unbuilt five years on.
- **Silent, user-subset failures.** [#837](https://github.com/googlesamples/mlkit/issues/837) (2024-06-17): *"Sometimes my users complain that they are unable to download the model even though their Internet connection is stable… I sometimes see that this process fails."* Asked if resolved: *"Unfortunately not."* No maintainer root cause.
- **Progress that can't progress.** [#773](https://github.com/googlesamples/mlkit/issues/773) (2024-02-09, open): `fractionCompleted` on a Translate download fires only once, at 1.0 — a progress bar is impossible by construction. Corroborated by [#165](https://github.com/googlesamples/mlkit/issues/165) (2020).
- **The complaint migrated into the GenAI stack.** [#1080](https://github.com/googlesamples/mlkit/issues/1080) (2026-10-12, open): Prompt API *"stuck at Downloading indefinitely"* with the real storage error failing to propagate. [#1079](https://github.com/googlesamples/mlkit/issues/1079)/[#1062](https://github.com/googlesamples/mlkit/issues/1062): `checkStatus()` throws `PERMISSION_DENIED`/`FEATURE_NOT_FOUND` instead of a documented, actionable state. [#1085](https://github.com/googlesamples/mlkit/issues/1085) (2026-11-09): digital-ink download "stays pending," *"no success or failure notification arrived."*
- **Device-eligibility guesswork.** [#944](https://github.com/googlesamples/mlkit/issues/944) (2025-05-26, 3 👍, duplicated by #952/#954/#985): *"none of the features work and returns 'Feature Unavailable'"*; on a prospective device purchase, *"not clear if it is supported."*
- **The recurrence spans the product's whole life** — [#59](https://github.com/googlesamples/mlkit/issues/59) (2019, "can't download model") to [#1085](https://github.com/googlesamples/mlkit/issues/1085) (Nov 2026), across Translate, Digital Ink, Barcode, Face, Subject Segmentation, and now AICore.
- **The absence signal.** No OSS library emerged to paper over this (repo search surfaced one 0-star module), and no issue has rallied past ~3 👍. Read honestly: the pain is **high-frequency and low-rally** — developers hit it one at a time, file a bug or a workaround, and move on. It also *cannot* consolidate into an OSS fix, because you cannot wrap a state Play Services won't expose. The thin OSS layer is evidence of platform-lock, not of weak demand — but the low rally is a genuine uncertainty, carried into the scores.
- **No commercial vendor sells this**, and that is not a negative signal here: the capability is platform-locked, so a third party *can't* sell it. The strongest external falsifier available for most ideas is structurally unavailable for this one — which is why Demand is capped at 4, not 5.

---

## Why now

1. **Capability shift (2026): Google proved the pattern in its own code.** The GenAI tier shipped `FeatureStatus` (`UNAVAILABLE`/`DOWNLOADABLE`/`DOWNLOADING`/`AVAILABLE`), a `DownloadCallback` with byte-level `onDownloadProgress`, and a typed `GenAiException` ([genai-prompt 1.0.0-beta4, updated 2026-07-21](https://developers.google.com/ml-kit/release-notes)). Play for On-device AI shipped the even richer [`AiPackState`](https://developer.android.com/google/play/on-device-ai) — `transferProgressPercentage()`, a status enum including `WAITING_FOR_WIFI`, an `errorCode()`, and a live `AiPackStateUpdateListener`. The contract this idea proposes is no longer hypothetical; it is a backport.
2. **Competitive + regulatory shift (2025–2027).** Apple shipped availability-as-first-class in iOS 26 (2025): [`SystemLanguageModel.availability`](https://developer.apple.com/documentation/foundationmodels/detecting-available-apple-foundation-models) returns `.available` or `.unavailable(reason)` with `deviceNotEligible` / `appleIntelligenceNotEnabled` / `modelNotReady`, where `modelNotReady` means, verbatim, the model "is downloading." Google is behind on exactly this surface. And the EU DMA decision of **16 July 2026** (DMA.100220, Art. 6(7)) requires Alphabet to let third parties *"discover, access, use and customise"* system-level on-device models in **Android 18 by 1 August 2027**, free and at equivalent performance (Google appealed in Sept 2026; the decision stands pending ruling). "Discover" implies an availability surface — the regulation forces the door open without specifying the state API behind it.
3. **Demand shift (2026): the gap is now visible on both tiers at once.** The 2019-era classic ask (#315) sits unbuilt while the identical complaint re-appears in the GenAI issues (#1079/#1080/#1085). A reader can now see the inconsistency inside a single SDK, which is a sharper argument than either tier alone.

Three dated forcings, all real. This is a strong why-now.

---

## The capability gap

Be exact about the boundary, because the capability exists **three times** in Google's own stack and is missing on a fourth:

| Surface | Status check | Progress | Typed failure | Availability event | Doc checked |
|---|---|---|---|---|---|
| **Classic ML Kit** (Play-managed) | `isModelDownloaded()` boolean only | **none** (Task<Void>) | generic `MlKitException` | **none** (poll only) | [RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) |
| ML Kit GenAI (AICore) | `FeatureStatus` enum | byte-level `onDownloadProgress` | `GenAiException` | callback | [FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) |
| Play for On-device AI | `AiPackStatus` enum | `transferProgressPercentage()` | `AiPackErrorCode` | `AiPackStateUpdateListener` | [on-device-ai](https://developer.android.com/google/play/on-device-ai) |
| Apple Foundation Models | `.availability` enum | none (polls `modelNotReady`) | reason enum | none | [Apple docs](https://developer.android.com/) |

`DownloadConditions` on the classic tier (`requireWifi`, `requireCharging`) is a precondition you *set*, not a state you can *read* — it cannot tell you the download will never complete. Play for On-device AI has the best telemetry of all, but its own docs state "AI packs only contain models… Java/Kotlin and native libraries are not allowed," and it delivers the *developer's own* LiteRT/MediaPipe models — **not ML Kit's managed models.** So the classic tier is stranded on the one delivery system with no observability.

**The main competitor is the developer's own code** — a keep-alive-retry loop plus `isModelDownloaded()` polling — or bundling the model and eating the install-conversion tax. It is not a third-party SDK, because there cannot be one.

---

## Proposed surface

A classic-tier delivery contract that mirrors the GenAI pattern the team already ships — same shapes, so a developer who learns one learns both:

```kotlin
// New on RemoteModelManager (or per-RemoteModel)
fun checkAvailability(model: RemoteModel): Task<ModelAvailability>
// ModelAvailability = AVAILABLE | DOWNLOADABLE | DOWNLOADING | UNAVAILABLE(reason)
//   UnavailableReason = DEVICE_INELIGIBLE | OFFLINE_NO_CACHE | NOT_ENOUGH_SPACE | SERVER_UNAVAILABLE

fun download(model: RemoteModel, conditions: DownloadConditions, callback: ModelDownloadCallback)
// callback.onStarted(bytesToDownload) / onProgress(bytesDownloaded) / onCompleted() / onFailed(UnavailableReason)

fun availabilityUpdates(model: RemoteModel): Flow<ModelAvailability>   // an event, not a poll
```

The load-bearing addition is **`OFFLINE_NO_CACHE`** — a documented, distinct "this will never arrive while offline" signal, separate from a transient `NETWORK_ISSUE`. That single distinction is what #315 asked for and what no current API can express.

What it deliberately does **not** do: it does not change *which* devices are eligible (that stays model-dependent); it does not promise a download-latency SLO (this is an *observability* contract — honesty about state, not a speed guarantee); and it does not merge the underlying delivery systems (GMS and AICore stay separate — only the developer-facing contract unifies). Promising any of those would make it un-shippable, which is why they are excluded.

**Time-to-first-hello-world target: under 15 minutes.** Met because it is a callback swap for a developer already depending on ML Kit — no new Gradle coordinate, no key, no dangerous permission, negligible size. If it cannot hit that, the design is wrong, not the estimate.

---

## Reach & sizing

Show the arithmetic; every input is a third-party estimate unless marked otherwise.

- **SAM (apps).** Anchor the 3-year ceiling on TensorFlow Lite's **1.08% of apps** ([AppBrain, 2026-05](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)), the best-adopted pure on-device ML SDK. ML Kit's ready-made APIs lower the bar (pushing above TF Lite), but only the unbundled + GenAI subset counts here (bundled barcode excluded), pulling it back. Net ceiling **~1.5–3.5% of ~2.06M Play apps ≈ 30k–70k apps** (my arithmetic on AppBrain inputs).
- **Device eligibility.** The classic tier reaches **~99.8% at API 21** ([apilevels, Oct-2026](https://apilevels.com/)), so eligibility barely trims the classic subset. The GenAI subset is hardware-gated well below the 87.4% API-31 line.
- **Install-weighted reach.** Using **m_install ≈ 9.6×** (TF Lite proxy: 10.41% installs ÷ 1.08% apps) → roughly **15–25% of the install-weighted Android surface**, saturating. ML Kit's own install multiplier was not retrievable this run — flagged **[unverified]**; the proxy may over- or under-state it.
- **Engineering cost avoided.** Honest accounting: the DIY path is a polling loop plus some device-specific firefighting — a few engineer-days to a couple of weeks per app, *not* engineer-months — and it fundamentally cannot achieve offline-detection or real progress. So the platform-test numerator is driven by **breadth × a quality floor nobody can reach alone**, not by large per-app savings. This is a reliability/UX-correctness play across a huge base, not a weeks-saved play. Name that plainly rather than inflate E_diy.
- **Sensitivity.** Halve both soft assumptions (p_job and the ceiling) → ~7k–18k apps, ~8–15% install-weighted. The verdict survives because **build cost is near-zero** (the pattern is already written) — the platform test is dominated by the denominator, not the numerator. If per-app savings were the case, this would be a Prototype; because the cost side is trivial, it clears Build. The experiment that would settle it: a developer-preview on the classic Translate model, measuring whether integrators actually replace their retry loop with the callback.

---

## Adoption path

1. **The hook (15 minutes):** replace the keep-alive-retry loop and a spinner-that-can't-progress with a real `onProgress()` bar and an `availabilityUpdates()` flow on the Translate model. The visible win demos in one build.
2. **First real integration:** ship offline-aware UX — "this needs a connection once" instead of a silent hang — which directly closes #315/#837/#1085. It replaces hand-rolled guessing with a branch on a typed reason.
3. **The dependency:** once the download UX branches on `UnavailableReason`, reverting means going back to guessing. The lock-in is one a developer endorses, because it is a reliability gain, not a switching cost.

**First adopter:** an accessibility/translation app already on ML Kit (Envision uses ML Kit summarization, per the problem atlas) or any on-device Translate app, where a silent model hang is a user-visible failure. **Second wave:** keyboard-class apps (Grammarly archetype) that cannot tolerate silent failures, once a reference integration exists.

---

## Execution plan

- **Developer preview — "will they drop the retry loop?"** Classic Translate + one segmentation model gain `checkAvailability` + `ModelDownloadCallback`. Partners: 3–5 translation/vision apps. Evidence collected: adoption of the callback over the workaround.
- **Alpha/Beta — graduation is a checkable condition:** the `OFFLINE_NO_CACHE` / reason enum is stable across GMS versions, and zero "stuck/silent" repros remain on the top-5 reported devices (#837/#944/#1085 device list).
- **GA — the contract you commit to hold:** the reason enum frozen, the availability `Flow`, and — this is the answer to the durability gate — a **published output/delivery-stability policy**, the thing the graveyard shows Google has historically lacked.

**Named org dependency, honestly:** the build requires the **Google Play Services / GMS model-delivery team** to expose download state — precisely what Google said was the blocker in #315 ("waiting for a download infrastructure update from Play Services"). ML Kit owns the API surface; it does not own the state source. If GMS does not prioritize this, ML Kit cannot ship it alone. That is the central risk, and it is named in the primary source.

---

## The case against

The strongest case against is not technical — it is organizational, and it is damning. This is textbook Type-E lifecycle work: invisible in a demo, and it has lost the prioritization fight **every year since 2019.** #315 was acknowledged as "planned," deflected to another team, and never built. A report that recommends it again owes an answer to "what is different now," and the honest answer is only two things: the pattern now exists (GenAI/AI-packs proved it), and the DMA sets a deadline. If neither moves the GMS delivery team, this idea dies in 2026 exactly the way it died in 2021 — and both levers are outside ML Kit's control. The live failure mode from the rubric's list is a variant of **"the platform absorbed the problem underneath you"**: here the platform *solved* it on the tier that demos well and declined to backport to the tier that doesn't. Compounding that, the demand signal is low-rally — a skeptic reasonably says "if this mattered, one issue would have 200 reactions, not three."

The mitigations, after the argument is made fairly: scope the preview to a single model to make the GMS ask small and concrete; ride the **1 Aug 2027 DMA deadline** as the forcing function that reorders the delivery team's priorities (the mandate needs an availability surface regardless); and frame the work as *consistency debt* now that GenAI has set the developer expectation — "two delivery contracts in one SDK" is a defensible internal rallying cry where "please build lifecycle plumbing" was not. The low-rally counter is real but incomplete: platform-locked pain cannot rally into an OSS repo or a mega-thread the way app-level pain does, so recurrence-across-years is the better demand proxy than peak reactions — but it remains the softest part of the case.

---

## Kill criteria

**The single observation that reverses this recommendation:** the GMS/Play Services model-delivery team confirms it will **not** expose per-model download/availability state within the Android 18 timeframe. That is the same blocker as #315; if it still holds, the idea is un-buildable regardless of merit. Checkable now, before any commitment, by asking that team directly.

**Also kills it:** a live check showing classic `RemoteModelManager` quietly gained a progress/availability callback in a release after July 2026 — freshness is **[unverified]** this run because the release-notes page was not fetchable. Verify before building.

**Load-bearing assumption:** that the classic-tier gap is still open at GA *and* that GMS will expose the underlying state.

**Re-check trigger if shelved:** the DMA Android 18 implementation (1 Aug 2027) — the interoperability mandate may force the availability surface anyway, at which point ML Kit should own the developer-facing shape of it rather than inherit a worse one.

---

## Fit for this team

ML Kit is the right owner of the **developer-facing contract** — it owns the API surface developers already call, and no other team can fix its ergonomics. But the **build is joint**: GMS/Play Services owns the state source. It is explicitly *not* MediaPipe or LiteRT (bundle-your-own, no managed delivery to observe) and *not* Firebase AI Logic (cloud/hybrid). The one caution worth stating: if ML Kit and MediaPipe/AI Edge are converging organizationally — an open question in the landscape — decide the home before building, or this adds one more surface to an already-fragmented developer story. The more valuable conclusion, if GMS will not play, is to say so and shelve, rather than ship a half-contract ML Kit cannot keep.

---

## Open questions

- **Will GMS expose per-model download state?** The single most important unknown; it gates the whole idea. Settled by asking the delivery team.
- **Did classic `RemoteModelManager` gain any availability callback after July 2026?** Release notes not fetchable this run [unverified]. Settled by a live docs check once `developers.google.com` is reachable.
- **ML Kit's own AppBrain %apps/%installs** (the real m_install) — not retrievable; `appbrain.com` was DNS-blocked. Settled by one direct fetch once allowlisted.
- **Per-category ≥50K-install counts** beyond Tools (25,492) — needed to tighten the SAM. Same unblock.
- **ML Kit output-stability/versioning policy** — none found [unverified]; its absence is itself part of the durability gap.
- **Cross-channel demand intensity** (SO/Reddit/HN) — unreachable this run, so the low-rally read rests on GitHub alone.

---

## Runners-up

- **On-device eval / quality-regression harness (Type D)** — lost on reach and demand: gated to the ~3.7% of the fleet (and ~1.3% of LLM apps, per the atlas) that ship on-device GenAI, so despite Apple shipping an Evaluations framework, too few apps need it yet. Right idea, wrong year; re-trigger when on-device GenAI adoption crosses ~10%.
- **On-device neural TTS API (Type A)** — lost the Platform Privilege gate: redistributable OSS models (Piper, Kokoro, Orca) mean a three-person team ships a Gradle dep this quarter; the platform edge is real but thinner than a delivery contract only Play Services can offer.
- **Standalone moderation classifier for user content (Type G)** — close second; lost on tunability/privilege: each app's safety policy differs, a one-size classifier "dies on contact with a T&S team," and MediaPipe already does bring-your-own text classification. Its regulatory clock (minors law, Jan 2026) keeps it a live candidate for a future run.
- **Deferred / opportunistic inference scheduling (Type E)** — parked on demand: the problem is real (thermal throttling, quota nondeterminism) but has almost no fetchable developer-voice evidence yet.
- **Sub-8 GB GenAI reach path (Type F)** — parked on Feasibility headroom: honest quality at that tier is unproven; revisit as a tooling/tiering idea when a mid-tier model benchmark lands.

---

*Sources: [#315](https://github.com/googlesamples/mlkit/issues/315) · [#773](https://github.com/googlesamples/mlkit/issues/773) · [#837](https://github.com/googlesamples/mlkit/issues/837) · [#944](https://github.com/googlesamples/mlkit/issues/944) · [#1062](https://github.com/googlesamples/mlkit/issues/1062) · [#1063](https://github.com/googlesamples/mlkit/issues/1063) · [#1079](https://github.com/googlesamples/mlkit/issues/1079) · [#1080](https://github.com/googlesamples/mlkit/issues/1080) · [#1085](https://github.com/googlesamples/mlkit/issues/1085) · [RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager) · [GenAI FeatureStatus](https://developers.google.com/android/reference/com/google/mlkit/genai/common/FeatureStatus) · [GenAI DownloadCallback](https://developers.google.com/android/reference/com/google/mlkit/genai/common/DownloadCallback) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Apple Foundation Models availability](https://developer.apple.com/documentation/foundationmodels/detecting-available-apple-foundation-models) · [EU DMA Alphabet AI interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [Firebase ML](https://firebase.google.com/docs/ml) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels](https://apilevels.com/)*
