# The Output-Stability Contract — let an app pin a managed on-device model's *behavior*, so a silent Nano refresh can't change what ships to 100M users

**Type:** E (Delivery & lifecycle), with a Type B extension leg · **Verdict:** Prototype (developer-preview) · **Opportunity: 6.5/10 (real gap, feasibility is the open question)**
*2026-10-13 · Prepared for Android ML Kit · Evidence current as of 2026-10-13*

> A team at a 100M-install app wires up ML Kit's Prompt API, ships a summarize feature, and it works. Three weeks later a user files a bug: the summaries got worse. Nothing in their code changed — AICore refreshed Gemini Nano underneath them. They have no version to pin, no way to A/B the old behavior against the new, and the only remedy anyone has found is to roll the whole SDK back. One team documented exactly this: `FeatureStatus.AVAILABLE` exposure fell from **8.7% to 0.6–1.4%** across preview versions and their conclusion was "rolling back to beta2 is the only option we found" ([mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061)). The managed stack gives them a capability and no contract.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6.5/10 — real gap, feasibility-limited | composite 3.85 → ×2 = 7.7, −1 because two gates sit at exactly 3 (feasibility, durability); lands ~6.5 |
| Platform privilege (gate) | 5/5 — pass | Only the model-delivery owner can pin a *managed* model's behavior. Apple structurally refuses and tells devs to version prompts instead ([Apple docs](https://developer.apple.com/documentation/foundationmodels/updating-prompts-for-new-model-versions)); AICore "manages updates" with no handle ([developer.android.com/ai/gemini-nano](https://developer.android.com/ai/gemini-nano)) |
| Feasibility headroom (gate) | 3/5 — pass, the live risk | Can't keep many old Nano binaries resident on a storage-constrained device; literal weight-pinning doesn't scale. But the quality-consistency machinery (LoRA + eval pipeline) already exists ([Android blog, Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)) |
| Durability (gate) | 3/5 — pass, barely | Firebase ML — Google's *prior* on-device ML distribution layer — shuts down 15 Jun 2027 ([migration docs](https://developers.google.com/ml-kit/migration)); ~300 products in the Google graveyard. A lifecycle contract you break is worse than none |
| Demand evidence (25%) | 4/5 | Continuous 2021→2026 availability-reliability trail (#315, #1062, #1078, #773); output-drift documented with production metrics (#1061); developers fleeing to self-hosted GGUF |
| Install-weighted reach (15%) | 3/5 | Nano gates to ~4% of the API-26+ base, but the lifecycle-contract half covers unbundled classic models (whole Play-services base); adopters skew to large apps (~9× install multiplier) |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Output pinning is impossible on the managed path; the only "borrow" is exiting to self-hosted GGUF — months of work plus forfeiting the managed availability machinery |
| Integration cost / TTFHW (15%) | 4/5 | Extends the existing `checkFeatureStatus`/`downloadFeature` flow: one version handle + one migration callback, no new permission |
| Substitute half-life (15%) | 4/5 | A contract, not a capability — a bigger/better Nano makes drift *worse*, not redundant. Main risk is the platform itself shipping it |
| Strategic complement (10%) | 4/5 | Without it, devs route off AICore/Nano to self-hosted llama.cpp/GGUF; a stability contract keeps "add AI to your app" on the Google-managed path |
| **Composite** | **3.85** | Prototype band (3.0–3.9) |

*Least trustworthy line:* S1 for the **output-drift** half specifically. The availability-reliability pain is broadly corroborated; the pinning pain rests mostly on one rich multi-developer thread (#1061) plus the inference that GGUF-bundling is drift-driven. HN/Reddit/Stack Overflow were unreachable from this environment, so I have no breadth confirmation there.

---

## The problem

The job, stated as a developer's job under a deadline: *"I need to ship an on-device GenAI feature to 100M users and still be able to promise, to my own PM, that it will behave the same next month as it does in the demo today."* On the managed stack that promise is currently un-keepable, and it fails in two linked ways.

**First, the availability signal the app depends on is not trustworthy.** The Aug-2026 landscape snapshot treated availability signalling as whitespace; that is now **stale** and should be corrected. ML Kit GenAI *does* ship a real state machine today: `checkFeatureStatus()` returns a `FeatureStatus` — `UNAVAILABLE` (0), `DOWNLOADABLE` (1), `DOWNLOADING` (2), `AVAILABLE` (3) — and `downloadFeature()` drives a `DownloadCallback` with `DownloadStarted / DownloadProgress / DownloadCompleted / DownloadFailed` (constants confirmed via the [developers.google.cn mirror](https://developers.google.cn/android/reference/com/google/mlkit/genai/common/FeatureStatus) and the [Flutter wrapper's docs](https://pub.dev/documentation/google_mlkit_genai_prompt/0.2.0/); the primary `developers.google.com` pages would not resolve from this environment). The gap moved: the signal exists but **lies**. [mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) reports `checkStatus()` throwing `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE`, so the documented mitigation "itself throws." [mlkit #1078](https://github.com/googlesamples/mlkit/issues/1078) is worse: `checkStatus()` returns `AVAILABLE`, then `generateContent()` fails `INFERENCE_ERROR` because a required file is missing from the model package the downloader "reports Completed but never restores." The signal says yes and the model isn't there.

**Second — and this is the part no vendor addresses — the managed model changes underneath a shipped app, and there is no version to hold onto.** This is structural, not a bug. The managed path's whole value proposition ("AICore manages the distribution of Gemini Nano and handles future updates") means the model is a moving target by design. For a feature behind a demo that's fine. For a feature in front of 100M users where the brand "can't ship an embarrassing output," a model that silently changes behavior is a feature you can't actually commit to. The workaround today is to abandon the managed stack and bundle your own fixed GGUF weights via llama.cpp/LiteRT — which is why the most-starred on-device-LLM Android projects all ship their own model files ([SmolChat-Android, 898★](https://github.com/shubham0204/SmolChat-Android); and a cluster of similar repos). They are paying to leave the managed world in order to get determinism the managed world won't give them.

What they do *instead* today, concretely: pin the entire SDK to an old version (#1061), hand-roll a capability-detect-and-fallback block (the [fast-mlkit-translate-text](https://github.com/JasonCareter/fast-mlkit-translate-text) wrapper exists only to paper over availability + download management), or exit to self-hosted weights. Each workaround's cost is the value of the contract.

---

## Proof & signals

- **Developers doing it by hand — availability (STRONG):** The flagship complaint is [mlkit #315](https://github.com/googlesamples/mlkit/issues/315) (2021→2022): *"There is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* Google's own replies: *"We had it planned but didn't have cycle to get to it"* and *"We're waiting for a download infrastructure update from Play Services."* The current-generation versions are #1062, #1078, and [#773](https://github.com/googlesamples/mlkit/issues/773) (download progress "only updates when the download is finished… the result, updated one time, is 1.0"), plus a dated cluster of silent-download failures (#760, #744, #837, #978, #1063, #1080).
- **Developers doing it by hand — drift (MODERATE, but rich):** [mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061). Same source code, same device, "minutes apart," one version works and the next throws; a production comment shows `AVAILABLE` exposure collapsing 8.7% → 0.6–1.4% across versions; the remedy is "rolling back to beta2 is the only option we found." **Precision matters here:** the investigator traced *this specific* drift to the library AAR requesting a different AICore feature ID across versions, not the Nano binary autonomously refreshing. The lived pain is identical to the drift thesis (same code breaks device-by-device after the managed stack moves, remedy is pinning), but I present it as drift from the *managed stack*, not proof that the model binary silently rewrites itself.
- **Someone charging money / voting with their feet:** The GGUF-bundling ecosystem (above) is the "willingness to pay" signal in disguise — developers spending engineer-months to self-host rather than trust the managed model.
- **The vendor already does the hard half:** Google's [Aug 2025 post](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) states a *goal* of consistent output **quality** across Nano versions, backed by a per-language evaluation pipeline (LLM raters + statistical metrics + human raters) and per-feature LoRA adapters. **This is the load-bearing insight: the mechanism to hold behavior steady across refreshes largely exists — it is exposed as an aspiration, not a contract, and carries no version handle a developer can pin to.** The gap is a commitment, not a capability.
- **The absence signal:** No vendor — Google, Apple, Qualcomm, OSS — ships model-version pinning for a managed on-device model. Apple is the most explicit refusal: it documents three model versions tied to iOS 26.0–26.3 / 26.4 / 27.0, keeps the old model "only as part of the beta program," and tells developers to *version their prompts* and test against old and new, not pin the model. Silence across every vendor on the exact thing means this is either genuinely hard or genuinely under-valued — probably both, which is where platform opportunities live.

---

## Why now

1. **Capability shift (Aug 2025).** Google shipped the eval-pipeline-plus-LoRA machinery that makes behavioral stability technically approachable ([Android blog](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)). Before this, "pin the behavior" had no mechanism; now it has one that just isn't exposed.
2. **Competitive/regulatory shift (Jun–Jul 2026).** Apple made model-version churn an explicit, documented developer concern at WWDC26 and chose prompt-versioning over model-pinning — publicly ceding the pinning ground. In parallel the EU DMA Article 6(7) decision against Alphabet (Case DMA.100220, adopted **16 Jul 2026**) mandates that third parties get **free-of-charge, "equally effective"** *access to call* Google's on-device models, implemented in Android 18 by **1 Aug 2027** (hotword deferred to Android 19 / 1 Aug 2028). Correction to the snapshot's framing: the operative obligation is *access/interoperability*, **not** a delivery or output-stability mandate, and the language is "equally effective," not "equivalent performance." So regulation does **not** build this for Google and does **not** make it redundant — but it does drag on-device-model governance into a regulated surface, which is exactly the moment to define the contract layer before someone else's shape is imposed.
3. **Demand shift (2026).** The current GenAI issue tracker (#1061/#1062/#1078/#1080, all 2026) shows teams moving from "can I call it" to "can I *depend* on it in production" — the signature of a capability crossing from demo into shipped features.

---

## The capability gap

Precisely what each surface offers, with the page checked:

- **ML Kit GenAI:** availability state machine (`FeatureStatus`, `downloadFeature`, `DownloadCallback`) — **yes**; output-stability/version-pin — **no** (the Prompt API exposes a `seed` for determinism *within a given model*, which is not stability *across* model refreshes). [FeatureStatus ref](https://developers.google.cn/android/reference/com/google/mlkit/genai/common/FeatureStatus).
- **AICore / Gemini Nano:** "manages distribution and handles future updates" — no developer-facing version handle or pin ([developer.android.com/ai/gemini-nano](https://developer.android.com/ai/gemini-nano)).
- **Apple Foundation Models:** `SystemLanguageModel.availability` (coarse enum, no download progress); explicitly **no** pinning — [updating-prompts-for-new-model-versions](https://developer.apple.com/documentation/foundationmodels/updating-prompts-for-new-model-versions).
- **Firebase AI Logic:** a mode router (`PREFER_ON_DEVICE` etc.), **not** a lifecycle state machine and **no** stability contract ([developer.android.com/ai/hybrid](https://developer.android.com/ai/hybrid)).
- **Play for On-device AI (beta):** best-in-class delivery state machine (`AiPackManager`, `AiPackState`: PENDING/DOWNLOADING/TRANSFERRING/COMPLETED/…) but for the *developer's own* models, with **no** model-version construct and **no** delivery SLA ([developer.android.com/google/play/on-device-ai](https://developer.android.com/google/play/on-device-ai)).
- **Play Feature/Asset Delivery:** the mature generic analogue (`SplitInstallManager`, `AssetPackManager`) — robust lifecycle, but model-agnostic and versioned to the app binary, not to model behavior.

**The main competitor** a developer uses today instead: self-hosted GGUF via **llama.cpp / LiteRT-LM**. Not another platform — the developer's own bundled weights, chosen precisely because they don't change under you.

**The precise boundary that is missing:** a surface that couples (1) a *model-aware* availability/lifecycle state that is truthful, with (2) a pinnable **behavioral version** the platform commits to serve — or migrate off, on a stated schedule, through an eval gate. Items 1 and 2 have never been shipped together, because today the only way to get (2) is to exit the managed world that provides (1).

---

## Proposed surface

A lifecycle **contract** layered onto the existing ML Kit GenAI availability API. Two commitments the managed stack lacks:

**A. A truthful, model-aware lifecycle state.** Harden the existing signal so `AVAILABLE` cannot be returned when inference will fail (close #1062/#1078 by construction), and add the model-behavior version to the status object:

```kotlin
val status = summarizer.checkFeatureStatus()   // existing
// new: the behavior the app is bound to, and what's coming
val binding = summarizer.behaviorBinding()
//   binding.current: ModelBehaviorVersion("nano-v3-sum-lora-7")
//   binding.pinned:  ModelBehaviorVersion? (null = float with platform)
//   binding.migrationOffered: ModelBehaviorVersion?  // staged next behavior
//   binding.supportWindow: until 2027-04-01            // when current stops being served
```

**B. A pinned behavioral version with an eval-gated, time-boxed migration — not infinite weight retention.** The developer pins to `binding.current`. When the platform wants to move the behavior, it does *not* flip silently: it populates `migrationOffered`, keeps serving the pinned behavior through a bounded support window (one deprecation cycle, e.g. 90 days — **not** forever), and lets the app run the platform's *existing* eval pipeline (the Aug-2025 LoRA/eval machinery, exposed) against both before switching:

```kotlin
summarizer.pinBehavior(binding.current)          // stop floating
// later, when migration offered:
val delta = summarizer.evaluateMigration(myGoldenSet)  // reuses the platform eval harness
if (delta.regressionWithinBudget) summarizer.acceptMigration()
```

What it deliberately does **not** do: it does not promise byte-identical weights forever (infeasible on storage-constrained devices — see the gate), does not expose raw sampler internals, and does not apply to cloud fallback. The contract is *behavioral equivalence within a stated budget, plus advance notice and an eval gate*, not weight immutability.

**Time-to-first-hello-world target: under 15 minutes** for the truthful-status half (it's one added field on a call teams already make). The *stability guarantee* itself is not a 15-minute win — adopting the golden-set + migration workflow is an afternoon — and that's an honest finding about the design, not a footnote: pillar A ships value immediately, pillar B is the durable hook.

---

## Reach & sizing

Inputs, each labeled by provenance:

- Serious-app denominator: **~157K** free apps with >50K installs (third-party, AppBrain-derived, Aug 2024 — [Wikipedia](https://en.wikipedia.org/wiki/List_of_most-downloaded_Google_Play_applications)).
- Device eligibility: **API 26+ ≈ 96.1%**, **API 31+ ≈ 78.8%** (third-party, web-traffic-derived, [apilevels.com](https://apilevels.com/), Apr 2026 — directional ±a few points).
- Nano eligibility: **140M+ devices** (stated Google figure, ~Apr 2026; first-party URL unverified this session) against **~3.8B** active Android (third-party; note Google's *last official* figure is 3B, I/O 2021). My arithmetic: 140M ÷ (3.8B × 0.961) ≈ **~3.8%** of the API-26+ base is Nano-eligible.
- Install-weighting multiplier: **~9×** — TensorFlow Lite runs 10.5% of installs on 1.17% of apps ([AppBrain](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite)); this confirms the ~8× hypothesis and is a property of *specialized* ML SDKs (Firebase's ratio is ~1.0×).
- Adoption-ceiling analogue: TFLite at **~1% of apps by count / ~10% install-weighted** is the realistic 3-year ceiling shape.

**Steps.** Addressable serious apps plausibly needing an on-device-model lifecycle contract: GenAI-relevant categories (Communication, Social, Productivity, Education, Photography, Tools, Business) hold on the order of 50–75K of the ≥50K-install apps (anchored by Tools = 23,870 confirmed; others not individually retrievable). At roughly a third to two-thirds carrying a real summarize/rewrite/classify job → **~15K–45K addressable serious apps** (central ~25–30K). At a TFLite-shaped 3-year adoption ceiling (~1% of apps, install-heavy), actual uptake is a fraction of that pool but **install-weighted reach is ~9× its app-count share** — the number that matters for a platform.

**Sensitivity.** Halve the two softest assumptions (p_job and the Nano-eligible share): the *drift/stability* half of the value shrinks with Nano reach (it only bites where the managed model runs, ~4%), but the *truthful-availability* half applies to classic unbundled models across the **whole Play-services base** and survives the cut. So the verdict is robust *for pillar A* and Nano-reach-sensitive *for pillar B* — which is itself the argument for shipping A first and letting Nano's device base grow into B.

---

## Adoption path

1. **The hook:** the truthful-status field drops into code teams already write; it closes a class of production bugs (#1062/#1078) in one line. That alone earns the dependency.
2. **First real integration:** a team pins their shipped feature's behavior and wires the golden-set eval into CI — replacing "roll back the whole SDK and hope" (#1061) with a gate.
3. **The dependency:** once a team's release process depends on the migration signal + eval gate, removing it means going back to unmanaged drift — a dependency they'd *endorse*, because it's what lets them keep promising the feature to their PM.

**First adopter:** a team already on ML Kit GenAI in production and already burned by drift — the #1061 reporter's org is a literal, named candidate. Second wave: the GGUF-self-hosting cluster, *if* the contract is credible enough to pull them back onto the managed path. If it isn't, the funnel stalls at wave one — which is the kill test below.

---

## Execution plan

- **Developer preview:** expose the behavior-version handle + truthful status to 3–5 design partners already shipping GenAI features. Question it answers: *can per-device storage/thermal budgets actually hold two concurrent Nano behaviors through a 90-day window on the p50 Nano-eligible device?* That is the gating unknown; the preview exists to answer it, not to "make progress."
- **Alpha/Beta:** graduate when (a) the migration window is demonstrated on mid-tier Nano hardware within storage budget, and (b) at least two partners run the eval gate in CI against a real golden set. Checkable, not vibes.
- **GA:** commit the state machine, the version-handle schema (versioned independently of the model), and the support-window contract.

**Org dependencies, honestly:** this is a **joint ML Kit + AICore/Nano** commitment. ML Kit owns the surface (`FeatureStatus` lives there) but the behavioral-equivalence machinery and the on-device version retention live with the AICore/Nano team. If that team won't commit to a support window and to exposing the eval pipeline, pillar B cannot ship and the idea collapses to pillar A (still worth doing). Name that dependency at the preview gate, not after.

---

## The case against

The strongest case against, argued fairly: **this is the "API outran the hardware" failure mode wearing a contract.** Behavioral pinning on a managed model ultimately needs the device to hold more than one model behavior resident during a migration — and the binding constraint on the fleet is memory and storage, not compute. Apple, which controls its hardware far more tightly than Google controls the Android fleet, looked at exactly this and chose *not* to offer pinning — it tells developers to re-version their prompts and keeps the old model only in beta. That is a strong signal from a sophisticated actor that the honest answer might be "the juice isn't worth the storage," and that the right product is better *prompt*-versioning tooling plus honest status, not model-behavior pinning at all.

The mitigation, made only after conceding the point: the contract is deliberately *not* weight-immutability. It is behavioral-equivalence-within-budget + advance notice + an eval gate + a bounded window. Most of that (the eval pipeline, the LoRA adapters that already absorb base-model changes) is built. If even the bounded two-behavior window proves infeasible on mid-tier Nano hardware, the honest fallback is to ship pillar A (truthful status, which has no such cost) and reframe pillar B as prompt-versioning + migration-notice tooling — real value, lower claim. The secondary risk — **the platform absorbs it** — is also live: if I/O 2027 ships an AICore version pin, this was our own roadmap, which is a fine outcome but not a separate bet.

---

## Kill criteria

**The single observation that reverses this recommendation:** if a developer preview shows that the p50 Nano-eligible device cannot hold two model behaviors resident through even a 60–90 day migration window within its storage/thermal budget, pillar B collapses into "we'll try to keep quality similar" — which *is* the status quo (the Aug-2025 aspiration) and not a product. Checkable in the preview, before GA commitment.

**Load-bearing assumption:** that developers' flight to self-hosted GGUF is materially driven by distrust of managed-model drift — not merely by wanting bigger models or guaranteed offline. If the GGUF cluster is about model *choice* rather than *stability*, the pull-back-to-managed demand thins and S1/S6 drop.

**Re-check trigger if shelved:** a spike in #1061-class drift issues after the Nano 4 rollout, or a second large app publicly pinning to an old ML Kit version to avoid output drift.

---

## Fit for this team

ML Kit GenAI is the sanctioned front door to AICore and already owns the availability surface (`FeatureStatus`) this extends — so the contract belongs here, not in Firebase AI Logic (a cross-platform router with no lifecycle) or LiteRT-LM (the self-host escape hatch this is explicitly meant to make less necessary). The caveat is real: the behavioral-equivalence half lives with AICore/Nano, so this is a territory ML Kit can *own the surface of* only if it can *co-commit the guarantee with* the model team. If that co-commitment isn't available, the more honest conclusion is that pillar A ships from ML Kit and pillar B waits for the model org — a cleaner answer than ML Kit claiming a guarantee it can't keep.

---

## Open questions

- **Android RAM/storage distribution across the Nano-eligible fleet** — unpublished anywhere found. This is the single biggest missing input for the feasibility gate; without it the 2-behavior-window question is unanswerable on paper and must be settled empirically in the preview.
- **Is the #1061 drift representative or a preview-lane artifact?** The reporter noted the preview lane is "clearly churning." Whether GA-channel Nano drifts behaviorally for shipped apps is unconfirmed — settle by watching GA-channel issues through a Nano version bump.
- **First-party confirmation of the 140M Nano figure and a current official Android active-device count** — both relied on third-party relay this session (Google docs DNS-blocked); re-verify against the live Android Developers Blog.
- **Does Play for On-device AI's roadmap already intend a version construct?** It ships none today, but it's the natural home for delivery-side versioning and could collide with or absorb pillar A.

---

## Runners-up

- **On-device neural TTS (Type A).** Strong demand (Picovoice sells Orca; Apple shipped speech generation) and genuine whitespace, but **G1 privilege is weaker** — competent teams ship TTS as a Gradle dependency, and Picovoice already does cross-platform. Bigger build, thinner moat. Lost on privilege + effort.
- **On-device wake word (Type A).** Porcupine is the de facto standard *precisely because* it ships as a dependency that works everywhere — a textbook **G1 fail**. Killed at the gate.
- **On-device moderation/safety classifier (Type G).** Strong why-now (Play liability, minors-law Jan 2026, Bumble open-sourced one), but a one-size classifier dies on contact with each app's proprietary trust-&-safety policy unless deeply tunable. Parked as a strong candidate for its own run.
- **On-device eval/quality harness (Type D).** Apple shipped Evaluations; ML Kit has a prose page and no tooling. Good idea, but lower privilege (OSS can build eval harnesses) — and it's actually a *component* of this idea (the migration gate reuses it), so it's folded in rather than competing.
- **Graceful-degradation tiering / reach (Type F).** The 26× Nano-coverage gap is the biggest strategic prize, but feasibility (real quality at each tier) is the whole game and unproven. Parked for a dedicated run.

---

*Sources:* [mlkit #315](https://github.com/googlesamples/mlkit/issues/315) · [mlkit #773](https://github.com/googlesamples/mlkit/issues/773) · [mlkit #1061](https://github.com/googlesamples/mlkit/issues/1061) · [mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) · [mlkit #1078](https://github.com/googlesamples/mlkit/issues/1078) · [mlkit #1080](https://github.com/googlesamples/mlkit/issues/1080) · [ML Kit GenAI + Gemini Nano, Android blog Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · [FeatureStatus reference (.cn mirror)](https://developers.google.cn/android/reference/com/google/mlkit/genai/common/FeatureStatus) · [ML Kit GenAI Prompt (Flutter wrapper docs)](https://pub.dev/documentation/google_mlkit_genai_prompt/0.2.0/) · [AICore / Gemini Nano](https://developer.android.com/ai/gemini-nano) · [Firebase AI Logic hybrid](https://developer.android.com/ai/hybrid) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [Apple: updating prompts for new model versions](https://developer.apple.com/documentation/foundationmodels/updating-prompts-for-new-model-versions) · [Apple: SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [EU DMA Alphabet AI interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [ML Kit migration / Firebase ML shutdown](https://developers.google.com/ml-kit/migration) · [SmolChat-Android](https://github.com/shubham0204/SmolChat-Android) · [fast-mlkit-translate-text](https://github.com/JasonCareter/fast-mlkit-translate-text) · [AppBrain TensorFlow Lite stats](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite) · [apilevels.com](https://apilevels.com/) · [killedbygoogle](https://killedbygoogle.com/graveyard.json)*
