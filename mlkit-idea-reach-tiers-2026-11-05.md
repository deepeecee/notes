# ML Kit GenAI Reach Tiers — one GenAI call that degrades across on-device model tiers instead of vanishing

**Type:** F (Reach), with C (developer experience) and E (delivery) · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (time-boxed bridge)**
*2026-11-05 · Prepared for Android ML Kit · Evidence current as of 2026-11-05*

> On a Tuesday, an Android dev wires up ML Kit's Summarization API, sees it work on their Pixel 11, ships it — and gets a crash report from the other 96% of their users, because `checkFeatureStatus()` on a Pixel 9a throws `FEATURE_NOT_FOUND(606)` instead of returning `UNAVAILABLE`, and their `when` block never reaches the fallback branch ([googlesamples/mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062), open since 2026-07-16). Today their only sanctioned fix is to bolt on a cloud model — paying per call, breaking offline, and sending user text off-device, which is the opposite of why they chose on-device. This proposes the missing branch: one call, routed to the best *on-device* tier for each phone, with the tier it got surfaced instead of hidden.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — time-boxed bridge | composite 3.35 × 2 = 6.7, minus ~1 for a cluster of marginal (3/5) gates; S1 is 4 not 5 so no demand bonus. Rounds to 6, sitting at the 5–6 line |
| Platform privilege (gate) | 3/5 — pass (weakest) | Firebase/RunAnywhere/Cactus already ship managed routing; platform-only edge is a *shared, system-delivered* small model + OS-managed AICore access ([developer.android.com/ai/hybrid](https://developer.android.com/ai/hybrid)) |
| Feasibility headroom (gate) | 3/5 — pass (constrained) | Small-model proofreading/short-rewrite clears the bar; open abstractive summarization does not (1B unfaithful in 64–83% of summaries, [arXiv 2510.09915](https://arxiv.org/abs/2510.09915)) |
| Durability (gate) | 3/5 — pass | ML Kit GenAI still Beta/Alpha, no GA ([release notes](https://developers.google.com/ml-kit/release-notes), latest Jul 2026); but DMA creates a legal duty to maintain the access surface |
| Demand evidence (25%) | 4/5 | Two funded vendors sell this (RunAnywhere ~10.3k★ YC; Cactus, paid cloud API); OSS plugins ship the pattern; open bug #1062 |
| Install-weighted reach (15%) | 3/5 | ~96% of fleet is non-Nano (robust) but realizable adopted surface ~0.1–0.5% install-weighted (my model) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path already works: RunAnywhere (Apache) and Cactus (MIT) drop in today; platform edge is shared-model delivery teams under-price |
| Integration cost / TTFHW (15%) | 4/5 | Extends the existing GenAI call + one config block à la Firebase `onDeviceConfig`; no key, no new permission; first-use model download is the one friction |
| Substitute half-life (15%) | 2/5 | Firebase could repoint `PREFER_ON_DEVICE` at a small on-device model in one release; Nano device coverage grows on its own |
| Strategic complement (10%) | 4/5 | Converts a 4%-of-fleet demo into a platform capability; pulls developers onto AICore/Play model delivery |
| **Composite** | **3.35** | Weighted mean of S1–S6 |

*Least trustworthy row: install-weighted reach. The ~96% non-Nano denominator is solid; the realizable-adoption figure rests on two un-anchored assumptions (`p_job`, 3-yr adoption ceiling) and an unpublished fleet-RAM distribution.*

> **Evidence caveat (methodology):** all five research agents hit WebFetch host-resolution failures for `developers.google.com`, `firebase.google.com`, `ec.europa.eu`, `apilevels.com` and `appbrain.com` in this session. Those pages were read through WebSearch extracts (which quoted the primary sources); `github.com`, `pub.dev`, `developer.android.com` and `developer.apple.com` did fetch directly. Figures attributed to the un-fetchable hosts should be re-verified by direct fetch before anyone bets a roadmap on them.

---

## The problem

The job: *"I added an on-device GenAI feature and now I have to make it not-break for the 96% of my users whose phone can't run it."* The developer is an Android IC under a ship deadline, not an ML engineer. The competing solution is their own glue code.

ML Kit GenAI is Gemini-Nano-only, and Nano is a flagship capability. Google states 140M+ devices run Gemini Nano (published, ~Apr 2026); against a ~3.8B third-party Android-actives denominator that is ~3.7% — **~96% of the fleet cannot run it** (my arithmetic; the percentage is not a Google figure). Nano 4 *tightened* the floor to ~12GB RAM and shipped on roughly seven production flagships as of Aug 2026 ([9to5Google](https://9to5google.com/2026/08/27/gemini-intelligence-nano-4/)); even a Pixel 9 or a two-year-old flagship is excluded. So any feature built on ML Kit GenAI is, by default, invisible to almost everyone who installs the app.

What developers do *instead* today — the thing this API is priced against — is one of two workarounds, both bad for the reason they adopted on-device in the first place:

1. **Hand-rolled capability detection + cloud fallback.** Call `checkFeatureStatus()`, and if it isn't `AVAILABLE`, route to a cloud model. Google's own recommended "reach" story is to layer Firebase AI Logic's Hybrid API on top — but its `PREFER_ON_DEVICE` mode falls back to **cloud**, not to a smaller on-device model ([developer.android.com/ai/hybrid](https://developer.android.com/ai/hybrid)). Cloud fallback costs money per inference × DAU, fails with no network, and sends user content off-device — erasing the privacy, latency, offline, and zero-cost benefits that justify on-device at all.
2. **Nothing** — ship the feature to the 4% and accept it silently missing for everyone else, which also means shipping the crash in bug #1062 to the majority of devices.

This is structurally a platform problem, not an app problem. Every app that wants on-device GenAI hits the identical device wall and solves it identically and badly; none of them differentiates on *how they detect Nano and degrade*. By the atlas test — "if every app solves it identically and badly, it belongs in the platform" — graceful degradation across on-device tiers is platform work.

---

## Proof & signals

- **Developers charging money for it (the strongest signal):** Two independently funded vendors sell on-device↔fallback routing as their whole product. **RunAnywhere** (YC-backed, ~10.3k GitHub stars, read 2026-11-05) pitches "Same code, different silicon, no branching in your app" and a `capabilities()` call because "enum presence alone does not mean an engine is installed" ([repo](https://github.com/RunanywhereAI/runanywhere-sdks)). **Cactus** (Oxford Seed Fund + Google for Startups, MIT core + *paid* usage-based cloud API) headlines automatic failover "if the local model cannot handle the task complexity or context window" ([InfoQ, Dec 2025](https://www.infoq.com/news/2025/12/cactus-on-device-inference/)). Money is changing hands to solve exactly the hand-rolled-fallback problem.
- **OSS shipping the pattern as canon:** The `gemini_nano_android` Flutter plugin documents the hand-rolled block verbatim — "`// 1. Try On-Device (Fast, Free, Private)` … `// 2. Fallback to Cloud`" — "because on-device models have limitations … or might not be downloaded yet" ([pub.dev](https://pub.dev/documentation/gemini_nano_android/0.1.0)). `flutter_device_ai` (v0.2.0, ~Oct 2026) encodes the full `GenAiException` taxonomy and a `LocalLlmFallbackAdapter` running a GGUF model "when the OS has no model."
- **The platform's own check is broken on the fallback path:** [#1062](https://github.com/googlesamples/mlkit/issues/1062) (open, 2026-07-16) — the documented mitigation "is impossible to apply: the mitigation itself throws," so "the app crashes instead," affecting "the majority of Android devices." Corroborated by #1071, #1078, #1079 on the same capability-detection surface.
- **Community voice (indirect):** Android Police: "Google solved Android's update mess, then created a new AI fragmentation problem." A dev post titled, flatly, "Gemini Nano isn't on most of your users' phones." A sizing post estimating Nano 4 "will miss 97–99% of users."
- **The absence signal:** No Snap/Meta/Grammarly engineering blog surfaced complaining about ML Kit Nano coverage — because those teams run their own runtimes (llama.cpp, ExecuTorch). That is a finding: the sophisticated apps have already left the managed path, which is both demand validation (they needed more reach) and a warning (they didn't wait for Google). And no raw HN/SO/Reddit thread was retrievable with permitted tools, so "developers resent this out loud" rests on blogs and vendor copy, not forum quotes.

The nuance a skeptic must see: **every shipping fallback routes to the cloud.** That is a quiet market verdict that on-device-small-model quality isn't yet trusted — which the feasibility data confirms for summarization and refutes for proofreading. The opportunity is not "add a small-model tier to everything." It is to own the two or three tasks where on-device-all-the-way-down genuinely beats cloud fallback, and ship the degradation contract the cloud crowd can't offer when the network is gone or the bytes can't leave the device.

---

## Why now

1. **Capability shift — Gemma 4 E2B, Apr 2, 2026.** A ~2B on-device model (~1.3GB quantized) that is explicitly "the foundation for the next Gemini Nano," so code targeting it is forward-compatible with the flagship Nano 4 path ([developer.android.com Gemma 4 post](https://developer.android.com/blog)). For the first time there is a sanctioned small-device model to route *to*.
2. **Regulatory shift — EU DMA Case DMA.100220, adopted 16 July 2026.** The decision compels Alphabet to expose system-level on-device models (Gemini Nano / AICore) to third parties and to let them run their own on-device models, free and at equivalent performance. The on-device-model implementation date is reported in the EC draft measures as **1 January 2027** (press framings of "1 Aug 2027 / Android 18" are the full-feature-set outer deadline; the exact adopted ODM date is [unverified] pending the EC Annex). This is the dominant why-now, and it cuts both ways (see "The case against").
3. **Demand shift — the fallback market formed in 2025–2026.** RunAnywhere's YC launch (Aug 2025) and Cactus's cloud API (Dec 2025) are both <18 months old. Developers are wiring these paths *right now*; the window to be the default is before they finish.

---

## The capability gap

What exists, checked against live docs where fetchable:

- **ML Kit GenAI** — binary gating only: `checkFeatureStatus()` returns `UNAVAILABLE / DOWNLOADABLE / DOWNLOADING / AVAILABLE`, no degradation, no cloud path. On a non-Nano device it reports `UNAVAILABLE` and the feature is simply gone ([developers.google.com/ml-kit/genai](https://developers.google.com/ml-kit/genai)).
- **Firebase AI Logic Hybrid** — managed single-call routing *and* a served-path flag (`inferenceSource`), but the on-device tier is Nano-only and the fallback is cloud ([developer.android.com/ai/hybrid](https://developer.android.com/ai/hybrid)). This is the closest thing that exists — and it is exactly one branch away from the proposal.
- **Apple Foundation Models** — one on-device model, and its scale path is the cloud (Private Cloud Compute / server models via the new `LanguageModel` protocol). No smaller on-device tier for ineligible iPhones; the capability is absent there ([developer.apple.com](https://developer.apple.com/foundation-models-framework/)).
- **Qualcomm GenieX, LiteRT-LM, MediaPipe LLM Inference** — bring-your-own-model runtimes; the developer selects model and backend. No managed task-level tiering.

Precise boundary: **no vendor ships a managed, task-level layer that degrades flagship-on-device → smaller-on-device → explicit-degraded while staying on-device, and surfaces an on-device *quality tier* (not just an on-device-vs-cloud source flag).** The main competitor a developer uses today is Firebase Hybrid (or RunAnywhere/Cactus) — all of which answer the 96% with the cloud.

---

## Proposed surface

A managed tier, not a new model. One call; the platform picks the tier; the result carries the tier that served it.

```kotlin
val result = GenAiTieredClient
    .proofread(text)                 // or .rewrite(text, tone) / .summarizeExtractive(text)
    .onDeviceOnly()                  // never leaves the device; no cloud leg
    .await()

when (result.tier) {
    Tier.FLAGSHIP   -> // Gemini Nano (v3/v4) via AICore
    Tier.COMPACT    -> // Google-delivered Gemma-4-E2B-class model, shared system asset
    Tier.DEGRADED   -> // deterministic/extractive fallback, or a typed "unavailable" reason
}
```

- **Tiers:** `FLAGSHIP` (Nano via AICore) → `COMPACT` (a task-fine-tuned small model delivered once by Play for On-device AI as a shared system asset, so the ~1.3GB is not paid per-app in APK size) → `DEGRADED` (deterministic path or a typed reason — never the #1062 crash).
- **Tasks at launch, chosen by feasibility, not ambition:** proofreading first (safest), short-form tone rewriting (user reviews output), extractive / short summaries. **It deliberately does *not* do** open-domain abstractive summarization at the COMPACT tier — small models hallucinate above the embarrassment threshold there — and it does not add a cloud leg (that is Firebase's job; this is the on-device-only complement).
- **TTFHW target: <15 minutes.** Achievable only if it is a config flag on the GenAI call the developer already wrote, with the COMPACT model delivered by the platform (not bundled) and no new permission. If it needs a console project or a per-app model download in the APK, the target is missed — that is a design constraint, not a footnote.

The one genuinely new primitive is `result.tier`: an honest, per-request statement of which on-device quality tier ran, so the app can adjust UI (show a confidence note, offer "summarize in full on a cloud path" as the app's own choice) instead of pretending quality is uniform.

---

## Reach & sizing

Robust part first. **~96% of the Android fleet cannot run Gemini Nano** (140M+ devices, Google-published ~Apr 2026; percentage is my arithmetic against a ~3.8B third-party denominator, stable at ~95–96% whether you use Google's "3B+" or the third-party figure). The job (proofread/rewrite/summarize) is broadly relevant across Productivity, Communication, News, Education, Social, Business.

Realizable part (my model, not a published figure), via the sizing recipe:

- `A_cat` ≈ 10,000 apps with ≥50K installs in the six plausible categories (range 7.5–13k)
- `p_job` = 0.25 (coded; range 0.15–0.35) · `r_reach` = 0.95 at API 26 · `c_ceiling` = 0.15 of the eligible pool, benchmarked to the TFLite on-device-ML analogue (0.95% of apps / 11.19% of installs, [AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks), Oct 2025) · `m_install` ≈ 11.8
- SAM 2,500 → eligible 2,375 → **SOM@3yr ≈ 356 apps** (range 90–480) → store-wide app share 0.018% → **install-weighted reach ≈ 0.2% (range 0.1–0.5%)**.

**Sensitivity:** halving both soft inputs quarters the realizable surface to ~0.05%. The *device-wall* premise is untouched; the *large-app-footprint* premise is not — it is small either way. A second hard gate sits underneath: the fleet RAM distribution is unpublished, and non-Nano devices skew older and lower-RAM, so the fraction that can host a ~1.3GB COMPACT model is likely [unverified] 40–70%, which could halve the surface again. **Honest conclusion: this is a broad *device* opportunity with a modest *realizable adopted* surface, and the number is not yet knowable — the developer-preview exists to measure it.**

---

## Adoption path

1. **The hook:** the dev who just hit #1062 adds one line (`.onDeviceOnly()` with graceful tiers) and the crash becomes a typed `DEGRADED` result. Fifteen minutes, no cloud bill.
2. **First real integration:** a notes/mail/messaging/keyboard app ships proofreading that now works on mid-tier phones, replacing either a cloud call they were paying for or a feature they'd hidden.
3. **The dependency:** once the app's UI branches on `result.tier` and relies on the platform-delivered COMPACT model, removing it means re-bundling a model and re-solving device testing — a cost they'd endorse, not resent.

First adopter: a privacy- or cost-sensitive app with a short-text task (a keyboard, a notes app, a secure messenger) where cloud fallback is actively undesirable. Second wave: the long tail that copies whatever the reference app did. If no such first adopter can be named, the funnel doesn't start — and the named candidates here are plausible but unconfirmed.

---

## Execution plan

- **Developer preview (EU-first, ahead of the Jan 2027 DMA date):** ship proofreading at COMPACT tier to a handful of partners. Question it answers: *do developers prefer on-device-small-model fallback over cloud fallback for short tasks, and is COMPACT proofreading quality above their embarrassment threshold in the field?* That is the S1/S5 evidence the whole verdict hangs on.
- **Alpha/Beta:** graduate when (a) COMPACT proofreading field-rejection rate is below an agreed bar, and (b) the shared-model delivery path via Play for On-device AI meets a size/latency budget on real mid-tier devices. Add short rewriting and extractive summaries only if they clear the same bar.
- **GA:** commit to a frozen tier contract and an output-stability policy versioned independently of the underlying models — the thing that makes `result.tier` trustworthy across refreshes.

**Org dependencies, honestly:** this needs the AICore team (model access), the Play for On-device AI team (shared-model delivery), and a decision about the ML Kit / Firebase AI Logic boundary — because Firebase already owns the routing surface. If that boundary isn't resolved, this ships as a second router and deepens the fragmentation it's meant to cure.

---

## The case against

The strongest argument is **absorption by the platform's own roadmap (failure mode #2), and it is live.** Firebase AI Logic's Hybrid API already does managed, single-call, task-level routing and already surfaces the served path. Google owns AICore, owns the Nano/Gemma model ladder, and owns Play model delivery. A reviewer can fairly say: the entire proposal is "repoint the non-Nano branch of `PREFER_ON_DEVICE` at a small on-device model instead of the cloud" — a feature in an existing product, not a platform API, and one Google could ship in a release without a new SDK. That is why Platform Privilege scores only 3 and Substitute Half-life only 2.

The honest rebuttal, held at full strength: that one change *is* the thesis, nobody has made it, and the market has instead standardized on cloud fallback — which is a real gap for offline, privacy-bound, and cost-sensitive tasks. And the DMA cuts against the idea too: once third parties get direct AICore access (EU, 2027), sophisticated apps can bypass any managed path entirely, so this API cannot be defended as *access* — only as *orchestration convenience*. Convenience APIs are real but lower-ceiling, and the sizing confirms a modest realizable footprint. The feasibility ceiling (abstractive summarization fails at COMPACT) further narrows the honest surface to a few short-text tasks. Net: this is a genuine, time-boxed bridge, not a durable moat — which is exactly why the verdict is Prototype, not Build.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Firebase AI Logic adds an on-device-small-model tier to `PREFER_ON_DEVICE` (routing non-Nano devices to a Gemma-class model instead of cloud) before this reaches beta. If that ships, the idea is absorbed and should be cancelled, not continued. *Check: watch Firebase AI Logic release notes through 2027.*

**Load-bearing assumption:** that developers want on-device-*all-the-way-down* for a meaningful set of tasks, rather than being satisfied with cloud fallback. Every shipping product today bets the other way. The preview exists to test exactly this.

**Re-check trigger if shelved:** COMPACT-tier faithfulness for short summarization crosses the embarrassment threshold (a published small-model result, or Google's own fine-tuning, pushing sub-2B faithfulness materially up), which would widen the viable task set from "proofreading-plus" to "most of GenAI."

---

## Fit for this team

ML Kit owns the task-level GenAI front door (Summarize/Rewrite/Proofread) and the `checkFeatureStatus()` surface the crash lives on, so the degradation contract belongs beside them. **But the stronger conclusion may be that this is a Firebase AI Logic feature, not an ML Kit API** — Firebase already owns managed routing and path-surfacing, and shipping a second router in ML Kit would fragment the story ML Kit is supposed to simplify. The most valuable outcome of this report may be forcing that boundary decision before either team builds. If Firebase is the owner, ML Kit's job shrinks to fixing #1062 and exposing a richer tier enum — smaller, but honest.

---

## Open questions

- **Fleet RAM distribution** — unpublished; determines how many non-Nano devices can host a ~1.3GB COMPACT model. Settle with a Play-telemetry RAM histogram (internal).
- **COMPACT proofreading field quality** — the preview's core measurement; no public number answers it.
- **The exact DMA on-device-model date** — 1 Jan 2027 (EC draft) vs press framings of Aug 2027; read the adopted EC Annex text directly.
- **ML Kit ↔ Firebase AI Logic ownership** — no public roadmap statement on whether they converge or diverge; this gates the whole execution plan.

---

## Runners-up

- **On-device eval & quality harness (Type D)** — Apple shipped an Evaluations framework + token counting; ML Kit publishes a prose "evaluate prompt quality" page with no code behind it. Lost on Platform Privilege: OSS eval tooling (promptfoo-style) ships fast and the privilege hook is thin.
- **Standalone safety/moderation classifier for user content (Type G)** — strong platform privilege and a regulatory angle, but risks dying on contact with trust-and-safety teams unless tunability is solved; parked for a run that can research the tunability question properly.
- **On-device neural TTS (Type A)** — genuine whitespace (Picovoice Orca sells into it; Apple has it; Google has nothing but a decade-old parametric `TextToSpeech`), but a bigger model/feasibility question than a one-run report can close; a strong standalone candidate for a future run.
- **Output-stability / versioning contract across model refreshes (Type E)** — maximum platform privilege, but demand evidence is hard to source (teams pin SDK versions quietly) and it's invisible in a demo; lost on S1 evidence availability this run.

---

*Sources: [googlesamples/mlkit #1062](https://github.com/googlesamples/mlkit/issues/1062) · [RunAnywhere SDK](https://github.com/RunanywhereAI/runanywhere-sdks) · [Cactus / InfoQ](https://www.infoq.com/news/2025/12/cactus-on-device-inference/) · [gemini_nano_android](https://pub.dev/documentation/gemini_nano_android/0.1.0) · [Firebase/Android Hybrid](https://developer.android.com/ai/hybrid) · [ML Kit GenAI](https://developers.google.com/ml-kit/genai) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Apple Foundation Models](https://developer.apple.com/foundation-models-framework/) · [Gemini Nano 4 devices (9to5Google)](https://9to5google.com/2026/08/27/gemini-intelligence-nano-4/) · [Small-model summary faithfulness (arXiv 2510.09915)](https://arxiv.org/abs/2510.09915) · [AppBrain ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · EU DMA Case DMA.100220 (EC, adopted 2026-07-16; primary PDF not fetchable this session)*
