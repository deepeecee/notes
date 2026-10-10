# ML Kit GenAI Ready — the availability-and-fallback boilerplate, packaged into one call

**Type:** C (Developer experience), with E (delivery/lifecycle) and F (reach) dimensions · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Strong but contested)**
*2026-10-10 · Prepared for Android ML Kit · Evidence current as of 2026-10-10*

> Right now an Android engineer wiring up on-device summarization writes the same fifty lines every integrator writes: call `checkFeatureStatus()`, branch four ways on `UNAVAILABLE / DOWNLOADABLE / DOWNLOADING / AVAILABLE`, fire `downloadFeature()`, render a progress bar, catch `ErrorCode.BUSY` with backoff, and decide what to show the ~96% of phones that can't run Gemini Nano at all. Google's own showcase app ships exactly this block by hand ([Androidify PR #170](https://github.com/android/androidify/pull/170)). This idea packages that block into one call with a typed readiness result and a declared fallback. The number that matters: the capability it fronts reaches ~3.7% of the fleet on-device, but the boilerplate burdens 100% of integrators.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong but contested | Derived below from composite 3.9 |
| Platform privilege (gate) | 5/5 — pass | Wraps `checkFeatureStatus`/`downloadFeature`/AICore quota — surfaces only the OS owner controls ([ML Kit GenAI docs](https://developers.google.com/ml-kit/genai/summarization/android)) |
| Feasibility headroom (gate) | 5/5 — pass | Orchestration is model-free; universal extractive tier ships <2 MB. One dependency: exposing remaining-quota needs AICore cooperation |
| Durability (gate) | 3/5 — pass (weak) | Wraps Beta APIs; charter overlaps Firebase AI Logic + MediaPipe (now maintenance-only). A broken lifecycle contract is worse than none |
| Demand evidence (25%) | 5/5 | Google's own app, a purpose-built probe app, 2+ wrapper libs, and 3 dated `googlesamples/mlkit` issues (#1062/#1070/#1078) |
| Install-weighted reach (15%) | 3/5 | ~1–4% install-weighted (ceiling ~10%); only low-thousands of apps absolute. My arithmetic on AppBrain ratios |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Borrow wins *today*: copy the sample block or pull `flutter_gemma_builtin_ai`. Weeks, not months |
| Integration cost / TTFHW (15%) | 5/5 | One Gradle line, one call, no key, emulator-friendly, negligible size |
| Substitute half-life (15%) | 3/5 | Firebase AI Logic hybrid could extend from Prompt to task APIs and absorb this; wrappers iterate monthly |
| Strategic complement (10%) | 4/5 | One-line GenAI adoption drives AICore/Nano gravity and curbs the fragmentation pushing devs to cloud/cross-platform |
| **Composite** | **3.9** | Weighted mean of S1–S6 |

*Least trustworthy row: install-weighted reach (S2). There is no authoritative per-SDK adoption count for Android — Google publishes no Maven stats and the Play SDK Index doesn't render to a fetcher — so every app/install figure here is third-party estimate or my arithmetic on AppBrain ratios, not a Google number. A second caveat colors the whole report: the agent proxy DNS-blocked `developers.google.com` and `firebase.google.com` this run, so several Google-published figures are cache- or search-sourced, flagged inline.*

**Opportunity derivation:** composite 3.9 × 2 = 7.8; −1 because a gate (Durability) scores exactly 3; +1 because S1 is a 5 (externally-verified demand). That yields 7.8. I round *down* to 7, not up to 8, because the single biggest risk — Google absorbing this into Firebase AI Logic — is live and near-term, and the verdict is Prototype, not Build.

---

## The problem

The job, stated as an engineer's: *"I have two days to put on-device summarization behind a button, and it must not crash or show a dead button on the 96% of phones that can't run the model."* The competing solution is their own code, and today their own code is the only option.

Every ML Kit GenAI feature (Summarization, Rewriting, Proofreading, Image Description, Prompt — all Beta, Speech Recognition Alpha; [release notes](https://developers.google.com/ml-kit/release-notes)) is fronted by the same lifecycle. The developer must call `checkFeatureStatus()` before showing any UI, interpret a four-state result, trigger an on-demand model download that needs network on first use, render download progress, guard foreground-only execution (`BACKGROUND_USE_BLOCKED`), and handle a per-app inference quota that surfaces as `ErrorCode.BUSY` and a battery quota as `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`. None of that is the feature; all of it is tax, and it is paid identically by every integrator.

This is structurally produced, not an accident of immature tooling. A managed on-device model *must* gate on device eligibility (the model isn't everywhere), *must* meter per-app usage (one resident model shared across apps), and *must* deliver on demand (shipping Nano in every APK is impossible). Those three platform necessities generate the readiness/download/quota surface mechanically. And because availability is genuinely non-uniform across a 3.8-billion-device fleet, the "what do I show the ineligible user" decision is forced on every single app — the atlas calls this out as P1 (reach cliff), P8 (silent model-delivery failure), P14 (hand-rolled hybrid routing) and P15 (non-deterministic quota) simultaneously.

What they do *instead* today: copy Google's sample block, pull a community wrapper, or — most often — route to a cloud API and skip on-device entirely (an empirical study of 149 LLM apps found 88.6% use cloud APIs, 1.3% on-device). The workaround's cost *is* the value of this API.

---

## Proof & signals

The demand here is loud, dated, and mostly on GitHub (Stack Overflow and Reddit were proxy-blocked this run — a measurement gap, not a quiet channel).

- **Developers doing it by hand — including Google.** Google's own showcase app Androidify migrated to the genai library and still "manages the download asynchronously… and falls back to Firebase AI if Nano is unavailable or unsuccessful" by hand ([PR #170](https://github.com/android/androidify/pull/170), Oct 2025, *verified*). Google's official Android skill ships the canonical scaffold every integrator copies — a four-way `when(FeatureStatus)` plus a `DownloadStatus` flow ([get-started.md](https://raw.githubusercontent.com/android/skills/main/device-ai/ml-kit-genai-prompt-api/references/get-started.md), *verified*). One developer built an entire app just to answer the availability question: [MLKit-GenAI-Readiness](https://github.com/AgiMaulana/MLKit-GenAI-Readiness) — "tells you, at a glance, whether a device can actually run Google's ML Kit GenAI features" (*verified*).
- **Someone building it for free because the platform won't.** Third-party wrapper libraries now exist that *are* this idea: `flutter_gemma_builtin_ai`'s `ensureReady()` "throws immediately on unavailable states and only starts a download when the status is downloadable or downloading," then falls back to a bundled model ([pub.dev](https://pub.dev/packages/flutter_gemma_builtin_ai), *verified*); `gemini_nano_android` does the same. On the raw-LLM side, commercial SDKs **RunAnywhere** (per-request policy engine) and **Cactus** (routes to cloud when on-device confidence drops) sell exactly this routing (*prior-art agent, single-source*). Willingness to build and sell the thing the platform vacated is the strongest demand signal available.
- **Community voice — the official pattern is reported broken.** Three `googlesamples/mlkit` issues in a low-volume repo, all 2026, form a dense pain cluster:
  - [#1062](https://github.com/googlesamples/mlkit/issues/1062) (Jul 2026, *verified*): the prescribed safeguard crashes. "These APIs throw `GenAiException(606) FEATURE_NOT_FOUND` instead of returning `UNAVAILABLE` whenever AICore is installed but the feature is not provisioned." Result: apps following the sample "never hit their fallback path on most devices."
  - [#1070](https://github.com/googlesamples/mlkit/issues/1070) (Aug 2026, *verified*): "Sustained back-to-back inference… hits a rolling per-app quota that is not documented anywhere" — ~36–41 generations, then `ErrorCode.BUSY`. The ask is almost verbatim this idea: "ideally, expose the remaining quota… so apps can switch to a fallback before they hit the limit."
  - [#1078](https://github.com/googlesamples/mlkit/issues/1078) (Oct 2026, *verified*): `checkStatus()` returns AVAILABLE and `download()` reports complete, yet inference fails `COMPUTE_ERROR` — "left trusting success signals that don't reflect whether the model can run."
- **A real app speccing the fallback by hand.** [a-news-provider #73](https://github.com/rh-id/a-news-provider/issues/73) (Sep 2026, *verified*): "on-device via ML Kit GenAI Summarization… on supported flagship devices," "check the model's status… handle states like unavailable or still downloading," gate English-only, "hide feature on unsupported devices," offer BYO-key cloud fallback. One developer re-deriving the entire proposed API as a to-do list.
- **The absence signal:** the ML Kit issue tracker is low-volume overall, so three independent 2026 issues each hitting a different facet (availability, quota, delivery) is *strong* for this channel, not weak.

---

## Why now

1. **Capability shift.** The task-shaped GenAI APIs matured onto the managed AICore path over the last year — Prompt reached Beta (beta2, Apr 2026), Structured Output / System Instructions / Thinking Mode landed Jul 2026 ([release notes](https://developers.google.com/ml-kit/release-notes), *cache-sourced; live page unreachable this run*). The lifecycle surface only became universal once the APIs were worth adopting. That inflection is recent.
2. **Competitive shift.** Apple shipped a first-class readiness enum — `SystemLanguageModel.availability` returns `.available` / `.unavailable(reason)` ([Apple docs](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel), *cache-sourced*, Jun 2026). Apple has made "is the model here?" a clean one-liner while ML Kit still returns a raw int that throws the wrong exception (#1062). The ergonomics gap is now visible and comparable.
3. **Regulatory shift.** The EU's July 2026 DMA decision requires Alphabet to expose system-level on-device AI models to third parties, in Android 18, by **1 August 2027**, at performance equivalent to Google's own. A clean, documented availability-and-delivery contract is precisely the kind of surface that mandate will be read to require — building it deliberately now beats having it defined for you.

A genuine three-part why-now, though note (2) and (3) argue "do it cleanly and soon," not "or a competitor wins the market tomorrow." This is correct-and-time-boxed, not correct-and-on-fire.

---

## The capability gap

What exists, precisely:

- **ML Kit itself:** ships the primitives (`checkFeatureStatus`, `downloadFeature`, the quota error codes) but **no** unified helper and **no** built-in fallback tier ([summarization docs](https://developers.google.com/ml-kit/genai/summarization/android), *cache-sourced*). The `UNAVAILABLE` branch and `BUSY` retry are the developer's problem.
- **Firebase AI Logic — the load-bearing competitor.** Its hybrid inference already automates on-device↔cloud fallback: `PREFER_ON_DEVICE` "attempts to use the on-device model; automatically falls back to the cloud-hosted model if the on-device model is unavailable or unsupported" ([developer.android.com/ai/hybrid](https://developer.android.com/ai/hybrid), *live-verified*). **But** it fronts the *raw* `generateContent` / Prompt surface, **not** the task-shaped Summarize/Rewrite/Proofread APIs; it falls back only to *cloud* (no offline/extractive tier); it requires a Firebase project and often billing; and it is explicitly **experimental** ([Firebase docs](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference), *cache-sourced*).
- **MediaPipe / LiteRT:** no availability/fallback orchestration; models are side-loaded; LLM Inference is now **maintenance-only**, steering to LiteRT-LM ([MediaPipe LLM docs](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android), *cache-sourced*).
- **Apple:** a rich readiness enum, but **no** automatic fallback — "model unavailable" is still the app's problem.
- **Qualcomm / Samsung / MediaTek / OSS:** model zoos and runtimes, no device-tier routing as a first-party feature; the pattern exists only as third-party SDKs and research.

**The main competitor a developer uses today** is therefore not another platform — it is *their own copied boilerplate*, and secondarily Firebase AI Logic hybrid for the Prompt API only.

---

## Proposed surface

Primary **Type C** (collapse hand-rolled boilerplate into one call), carrying **Type E** (a declared lifecycle contract) and an honest, bounded **Type F** (reach) dimension. The same problem admits all three types, and the choice is the interesting decision: Type B (richer status enum) under-serves because the pain isn't the enum, it's the orchestration; pure Type F (universal quality tiering) over-promises because — see feasibility — there is no honest Nano-quality fallback for generative tasks. C-with-a-bounded-F is the version that survives contact with a trust-and-safety and a QA team.

The before/after is the product:

```kotlin
// Before — the block every integrator writes (abridged from Google's own sample)
when (summarizer.checkFeatureStatus().await()) {
    FeatureStatus.UNAVAILABLE   -> hideSummarizeButton()      // the 96% — now what?
    FeatureStatus.DOWNLOADABLE,
    FeatureStatus.DOWNLOADING   -> summarizer.download(callback) // wire a progress UI
    FeatureStatus.AVAILABLE     -> runWithBusyRetry()           // catch ErrorCode.BUSY yourself
}
// ...plus 606-vs-UNAVAILABLE workaround (#1062), quota backoff (#1070), COMPUTE_ERROR guard (#1078)

// After
val result = GenAiReady.summarize(text) {
    fallback = Fallback.Extractive          // universal, on-device, ships <2 MB
    onCloud  = CloudPolicy.OptInViaFirebase // optional, developer-authorized
}
when (result) {
    is Ready.Value       -> show(result.text, tier = result.tier) // ON_DEVICE_ABSTRACTIVE | EXTRACTIVE | CLOUD
    is Ready.Downloading -> showProgress(result.progress)         // standard, no hand-rolled UI
    is Ready.Unavailable -> show(result.reason)                   // typed, branchable
}
```

What it deliberately does **not** do: it does not claim Nano-quality output on ineligible devices, it does not silently send user content to the cloud (cloud is opt-in and developer-declared), and it does not invent new model capabilities — it orchestrates existing ones and surfaces an honest quality `tier`. The remaining-quota signal (#1070's ask) is included *if* AICore exposes it; that is the one org dependency.

**TTFHW target: under 15 minutes** — one Gradle line, one call, works in the emulator with the extractive fallback so a developer sees a result before owning a Nano device. That is the whole design constraint; if it needs a Firebase project to say hello, it has failed.

---

## Reach & sizing

Inputs (all third-party estimate or my arithmetic unless noted; AppBrain used for *ratios*, not absolute counts):

- Target categories (Productivity, Communication, News, Social, Business, Education, Books & Reference) ≈ ~30% of ~2.03M Play apps → ~610K; serious (≥50K installs) ≈ ~49K apps.
- `p_job` = 0.20 (band 0.15–0.30): ~1-in-5 serious apps in these categories plausibly want summarize/rewrite/proofread.
- **SAM ≈ 10K apps** (range 4.5K–22K).
- Device eligibility: GenAI minSdk = API 26 ≈ ~97% of installs — *this is the fallback point: the API's reach is the whole API-26+ base, not Nano's ~3.7%.*
- Install-weighting `m_install` ≈ **9×** (TFLite: 10.5% of installs vs 1.17% of apps — ML-SDK adoption is heavily install-skewed).
- **SOM (3-yr) ≈ ~2,000 apps** (range 700–6,600) ≈ ~0.1% of Play, well under TFLite's ~1.2% ceiling.
- **Install-weighted reach ≈ 1–4% of the Android surface** (central ~2%; long-run ceiling ~10%). A handful of mega-apps (a top messenger, a mail client, a browser) adopting would move whole points alone.

**Engineering cost avoided:** at ~2,000 adopters × ~2–3 saved engineer-weeks (glue + cross-device QA + ongoing maintenance as device lists and quota behavior drift) × loaded cost, the numerator is real but modest — this is a *friction* play, not a *capability* play.

**Sensitivity:** halve `p_job` to 0.10 and halve the ceiling → SOM ~500–1,500 apps, install-weighted ~0.5–2%. The verdict (Prototype, friction-reducer) **survives** the halving — it was never resting on big absolute numbers. Reach is a *qualified strength*: install-weighted and strategically leveraged, weak on absolute app count.

---

## Adoption path

1. **The hook:** the 15-minute win — drop in one line, get summarization working *in the emulator* via the extractive tier, with the Nano path lighting up automatically on an eligible device. No key, no Firebase project.
2. **First real integration:** the app ships the button to 100% of users with a declared fallback instead of hiding it on 96% — replacing their copied `checkFeatureStatus` block and their `BUSY` retry loop. This is what Androidify would delete.
3. **The dependency:** once an app relies on the typed `Unavailable` reasons and the quality `tier` for its own UI and analytics, removing the wrapper means re-deriving the device matrix by hand — a dependency they'd endorse, because it absorbs the maintenance that #1062/#1078 show is genuinely hard.

**First adopter:** Google's own Androidify and the ML Kit sample apps — they already hand-roll it, so they are the reference implementation and the dogfood. Second wave: the Flutter/RN wrapper authors (`flutter_gemma_builtin_ai`) fold onto the official surface, and one visible consumer app (a note-taker, an RSS reader like a-news-provider) doing summarize-everywhere pulls the category.

---

## Execution plan

- **Developer preview (now):** ship `GenAiReady.summarize/rewrite/proofread` as a thin wrapper over the existing primitives, with the extractive tier and typed results — *no* platform changes required. Question it answers: do integrators delete their boilerplate and does the typed `Unavailable` reduce the #1062-class bug reports? Partners: the ML Kit sample apps, Androidify, and 3–5 wrapper-lib authors.
- **Alpha/Beta — graduation condition:** AICore exposes a *remaining-quota* signal and an authoritative availability result that doesn't throw `606` (#1062/#1070). Checkable: the wrapper can pre-empt `BUSY` before it fires on a Pixel 9a/10. This is the org dependency — **the AICore team must say yes**, and if they don't, the idea stays a DX wrapper with no quota foresight (still useful, materially weaker).
- **GA:** commit a versioned readiness/lifecycle contract — the state machine, the `Unavailable` reason taxonomy, and output-stability of the extractive tier — held independently of Nano model refreshes. This is the Type-E promise, and breaking it is worse than never making it.

---

## The case against

The strongest argument against, made fairly: **the platform absorbs this underneath you (rubric failure mode #2), and the absorber is Firebase AI Logic.** Firebase hybrid already does automatic on-device↔cloud fallback for the Prompt API. Extending it to wrap the task-shaped Summarize/Rewrite APIs and adding a no-billing path is a smaller lift for the Firebase team than standing up a parallel ML Kit surface — and if they do it, this idea is 70% redundant. Google shipping *two* overlapping fallback orchestrators would actively worsen the fragmentation the idea claims to fix. That is the real risk, and it is live.

The second argument is **build-vs-borrow (failure mode #7):** the borrow path already works. A developer can copy the sample or pull `flutter_gemma_builtin_ai` today, for free, this afternoon. A platform API that merely tidies borrowable glue captures a sliver — which is exactly what a G1 privilege shortfall looks like at 18 months.

The mitigations, after the argument not before it: the task-shaped + no-Firebase + extractive-tier scoping is precisely the ground Firebase hybrid *doesn't* hold, so the honest move is to **build it as the ML Kit-native front door and explicitly route cloud fallback *through* Firebase** rather than competing with it — one orchestrator, two backends. And the borrow path stops winning only if the platform adds the parts borrowers *can't* build: an authoritative availability result and a remaining-quota signal. Absent that AICore cooperation, the honest verdict is a DX convenience, not a platform API — which is why the gate is Prototype, not Build.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Firebase AI Logic hybrid inference adds task-shaped API support (Summarize/Rewrite/Proofread) *and* a no-Firebase-project path before this reaches Beta — announced at I/O '27 or in a Firebase release note. That makes the ML Kit surface redundant; promote a runner-up (on-device moderation classifier) instead.

**Load-bearing assumption:** that the AICore team will expose an authoritative availability result and a remaining-quota signal (the #1062/#1070 asks). Everything that separates this from a borrowable wrapper rests on that one belief.

**Re-check trigger if shelved:** the DMA Article 6(7) implementation detail published ahead of 1 Aug 2027 — if it mandates an availability/delivery contract, this goes from "nice" to "required," and the build decision flips regardless of Firebase.

---

## Fit for this team

ML Kit, not Firebase or MediaPipe, should own the *task-shaped* front door: ML Kit already owns Summarization/Rewriting/Proofreading, so the readiness wrapper belongs beside them, and ML Kit's no-key, no-backend ergonomics are the whole TTFHW advantage. Firebase's strength is the cloud account and billing relationship — so the clean division is **ML Kit owns on-device task APIs and their lifecycle; cloud fallback is delegated to Firebase.** The ecosystem's biggest internal risk is two Google teams shipping overlapping fallback orchestrators; this report's recommendation is explicitly the opposite — one orchestrator (ML Kit) with Firebase as a backend — and if the org can't commit to that boundary, that is a more important finding than the API itself.

---

## Open questions

- **Does AICore expose, or can it expose, remaining per-app quota?** Settles whether the Beta graduation condition is reachable. (#1070 asks for it; no API surface found.)
- **What is the real cross-device failure rate of `checkFeatureStatus()`?** #1062 says it throws `606` on Pixel 9a/10 but returns `UNAVAILABLE` on 7a. A device-matrix test would size how broken the status quo is. Not determinable without hardware.
- **Is ML Kit GenAI converging with or diverging from MediaPipe/LiteRT organizationally?** Unresolved in public sources and decisive for the durability gate.
- **Exact current 140M+ Nano figure and its date** — Google-attributed (Apr 2026 per [Techjack], 21 Jul 2026 per [ecorpit]) but the live Google post was unreachable this run; both are secondary.

---

## Runners-up

- **On-device neural TTS (Type A)** — genuine whitespace (Picovoice Orca sells into it; Apple added speech generation; Google has no developer API). Lost on scope: it needs a new model Google must build and own, a far heavier commitment than wrapping existing surfaces. Strongest standalone idea; held for a dedicated run.
- **On-device user-content moderation classifier (Type G)** — strong why-now (DMA, minors laws from Jan 2026, Play output liability) and max platform privilege. Lost on substitute half-life: ShieldGemma/LlamaGuard-class models can be borrowed via MediaPipe/LiteRT today, so S5 is weak without a tunable-policy + liability framing. Best promotion target if the kill criterion fires.
- **On-device eval / quality-regression harness (Type D)** — Apple shipped an Evaluations framework; ML Kit publishes a prose "evaluate prompt quality" page with no harness behind it. Lost on G1: a third party can build an eval runner (it's a test harness + LLM-as-judge), so platform privilege is only moderate.
- **Delivery/lifecycle SLO contract alone (Type E)** — the pure-E version of this same problem. Lost to the C-primary framing: a contract with no one-line API to consume it is invisible in a demo and loses every prioritization argument (the chronic Type-E failure). Folded in here as the GA commitment instead.

---

*Sources:*
- [ML Kit GenAI summarization docs](https://developers.google.com/ml-kit/genai/summarization/android) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Firebase AI Logic hybrid inference (developer.android.com)](https://developer.android.com/ai/hybrid) · [Firebase AI Logic hybrid docs](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference)
- [Androidify PR #170](https://github.com/android/androidify/pull/170) · [Android GenAI skill get-started](https://raw.githubusercontent.com/android/skills/main/device-ai/ml-kit-genai-prompt-api/references/get-started.md) · [MLKit-GenAI-Readiness](https://github.com/AgiMaulana/MLKit-GenAI-Readiness) · [flutter_gemma_builtin_ai](https://pub.dev/packages/flutter_gemma_builtin_ai)
- [googlesamples/mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) · [#1070](https://github.com/googlesamples/mlkit/issues/1070) · [#1078](https://github.com/googlesamples/mlkit/issues/1078) · [a-news-provider #73](https://github.com/rh-id/a-news-provider/issues/73)
- [Apple SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel) · [MediaPipe LLM Inference (Android)](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android)
- [Extractive-vs-abstractive survey (arXiv 2010.04529)](https://arxiv.org/abs/2010.04529) · [Pointer-generator / ROUGE bias (arXiv 1704.04368)](https://arxiv.org/abs/1704.04368)
- [Gemini Nano 140M+ devices (Techjack)](https://techjacksolutions.com/?p=70981) · [Gemini Intelligence 12GB floor (ecorpit)](https://ecorpit.com/gemini-intelligence-hardware-floor-android-ai-fallback-2026/)
