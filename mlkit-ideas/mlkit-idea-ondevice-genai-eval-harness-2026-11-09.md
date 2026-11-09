# On-device GenAI Eval & Telemetry — a measurement layer for ML Kit GenAI, because developers ship it blind

**Type:** D (Tooling) · **Verdict:** Prototype (developer-preview) · **Opportunity: 7/10 (Strong, reach-gated)**
*2026-11-09 · Prepared for Android ML Kit · Evidence current as of 2026-11-09*

> *Badges: Apple already shipped this · Strong demand, narrow reach · Observability-first*

> An Android engineer ships a feature on the ML Kit Prompt API, then watches a user-filed bug: on-device Translate rendered "keep the children away" as "Kill the children" ([issue #1072](https://github.com/googlesamples/mlkit/issues/1072)). They have no way to know whether the next Nano model update made that better or worse, no per-response token or cost count, and `checkFeatureStatus()` reports the model AVAILABLE on a device where every inference then fails COMPUTE_ERROR ([#1078](https://github.com/googlesamples/mlkit/issues/1078)). Apple shipped an on-device Evaluations framework and a per-response usage object this year. ML Kit ships the inference and routes quality measurement to the cloud. The gap: **no repository on GitHub runs on-device GenAI quality eval above ~50 stars**, while the cloud equivalent, promptfoo, has ~27,000.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, reach-gated | Composite 3.9 → formula gives ~8.8 (×2, +1 for S1=5); adjusted **down** to 7 because install-weighted reach (S2) is the binding weakness, not a rounding detail |
| Platform privilege (gate) | 4/5 — pass | Per-response usage, cached-token counts, quota state, and availability SLO are AICore-internal; only the platform can expose them. The harness scaffolding itself is less privileged |
| Feasibility headroom (gate) | 4/5 — pass | Telemetry half trivial; quality-judge half is the risk, mitigated by the new [Embeddings API](https://developer.android.com/blog/posts/android-intelligence-system-in-app-agents-ads) (similarity scoring) + hybrid cloud calibration |
| Durability (gate) | 4/5 — pass | Tooling durability is high, but the measured surface (Prompt API, Nano) churns every quarter — the harness contract must stay stable while targets move |
| Demand evidence (25%) | 5/5 | Issue #315 (2021) → live 2026 GenAI issues (#1062, #1078, #1070, #1061); case study [arXiv 2604.24636](https://arxiv.org/abs/2604.24636); clean absence signal vs promptfoo 27k★ |
| Install-weighted reach (15%) | 2/5 | Gated to the Gemini Nano base, ~140M devices ≈ ~3.7% of ~3.8B Android actives (Google figure ÷ third-party denominator, my arithmetic) |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Devs can borrow promptfoo-style scaffolding on the desktop; they **cannot** build per-response usage/cached-token/availability accounting — that is platform-internal |
| Integration cost / TTFHW (15%) | 4/5 | Telemetry wrap is one Gradle line + a session wrapper; a golden-set eval run needs dev-supplied data, so >15 min for the quality half |
| Substitute half-life (15%) | 3/5 | A general model can't reliably self-evaluate (confirmed below), so the tool stays needed; erosion comes from the measured target moving, and from promptfoo adding an Android runner |
| Strategic complement (10%) | 5/5 | Measurement is what lets a brand-sensitive team ship on-device GenAI at all → drives Prompt/Agentic API adoption, Android engagement, device differentiation; neutralizes Apple's eval advantage |
| **Composite** | **3.9** | Weighted mean; Prototype band (3.0–3.9), one notch under the Build line |

*Least trustworthy row: install-weighted reach. Both the 140M device figure and the 3.8B denominator are relayed third-hand, and no Google-published Nano coverage percentage exists ([snapshot gap](https://developers.google.com/ml-kit/release-notes)).*

---

## The problem

A large consumer app that puts on-device GenAI in front of users has a measurement hole with three faces, and every team patches it by hand.

**They cannot tell, in production, whether the feature is even running.** The Prompt API exposes an availability check, but developers report it lying: `checkFeatureStatus()` returns AVAILABLE on devices where inference fails with COMPUTE_ERROR ([#1078](https://github.com/googlesamples/mlkit/issues/1078)), throws FEATURE_NOT_FOUND instead of UNAVAILABLE so the fallback branch never fires ([#1062](https://github.com/googlesamples/mlkit/issues/1062), opened 2026-07-16), and gets stuck at "Downloading" after a low-storage error ([#1080](https://github.com/googlesamples/mlkit/issues/1080)). This is the same complaint, verbatim, that ML Kit developers filed in 2021 about classic models — *"there is still no way to get availability and download status… we have no indicator about that"* ([#315](https://github.com/googlesamples/mlkit/issues/315)) — now migrated onto the GenAI surface.

**They cannot tell whether an update made quality better or worse.** On-device models refresh underneath the app — nano-v3 to Nano 4 this year — and the app team learns about a regression from a user bug report, like the Translate example above, or from the default `ModelConfig` silently switching the requested AICore feature between releases ([#1061](https://github.com/googlesamples/mlkit/issues/1061)). There is no golden-set harness, no regression delta, no alarm.

**They cannot tell what it costs or when it will be throttled.** Sustained generation hits an undocumented per-app inference quota surfacing as `GenAiException.BUSY` with no accounting of how close you were ([#1070](https://github.com/googlesamples/mlkit/issues/1070)).

This is structurally produced, not a bug. A 100M-install app runs under a brand bar far above any benchmark number — "right 92% of the time" is a no-ship — so the team *must* measure before shipping and *must* catch regressions after. But the org is server-side (its ML people don't write Android runtime code), and the signals they need (per-response usage, cached-token counts, quota headroom, true availability) live inside AICore where no app can reach them. So they do the only thing left: pin an ad-hoc list of "golden" prompts, eyeball the output, and build validation-and-retry scaffolding to defend against failures they can't quantify. The published case study [*Less Is More*](https://arxiv.org/abs/2604.24636) (arXiv 2604.24636, Apr 2026) is the sharp version: an on-device small model violated a simple word-length instruction in **30–50% of early generations**, prompt hardening only reached 10–15% ("still too high for production"), and the team concluded "the most reliable on-device LLM feature is one where the LLM does the least." That conclusion is what blind shipping looks like.

---

## Proof & signals

- **Developers doing it by hand:** The ML Kit issue tracker is the direct voice. Beyond the availability cluster above, [#1083](https://github.com/googlesamples/mlkit/issues/1070) (getAnalyticsLogs crash) and #1076 (ClientTelemetry confusion) show teams reaching for telemetry that isn't theirs to read. Evidence status: **confirmed, verbatim**.
- **Someone charging money / spending stars for it — but only in the cloud:** promptfoo (~26,990★, pushed 2026-11-09), confident-ai/deepeval (~19,383★), ragas (~16,269★). All are cloud/CI tools; at most they point a judge at a local Ollama endpoint on a *developer's* machine. None ships an in-app, on-device runtime. Evidence status: **confirmed-live** via the GitHub API.
- **The absence signal (the strongest finding here):** a GitHub search for on-device/mobile LLM eval harnesses returns only 0–4★ personal repos; the query `edge LLM benchmark android ios evaluation` returned `total_count: 0`. Lab benchmarks exist (MobileAIBench, SmartBench, lm-Meter) but, as the research literature notes, *"none combines an on-device regression suite with production phone telemetry."* The academic framing of the cost: *"without a standardized multi-task regression testing framework, capability degradation or regression is often detected only weeks or months after deployment"* ([arXiv 2508.20737](https://arxiv.org/abs/2508.20737)). I read the silence as a capability that is painful and nascent — hand-rolled, not yet consolidated into a tool — which is the early-gap signature, not the no-market signature. Evidence status: **confirmed-live** (star counts), **inference** (what the silence means).
- **Community voice:** archived LocalLLaMA mirrors (reddit.com is blocked to the fetcher) show developers asking whether anyone does better than "manual testing with a few sample prompts," and others hand-building golden-set diff tools because "regressions are subtle." Evidence status: **indirect** (mirror, not primary).

---

## Why now

1. **Capability shift — the thing to measure got both more valuable and more volatile.** The Prompt API moved alpha → **Beta** (`genai-prompt:1.0.0-beta2`), and on 2026-11-05 Google shipped an [Agentic API](https://developers.google.com/ml-kit/genai/agent/android) (auto-executing function calls, multi-turn history, orchestration loop) plus an **Embeddings API** (EmbeddingGemma 2), **Structured Output**, and **Prefix Caching** ([ADS announcement](https://developer.android.com/blog/posts/android-intelligence-system-in-app-agents-ads)). An agent loop with tool calls is far harder to eval by eyeball than a single prompt — the measurement debt just grew. *(All confirmed-live; these are **stale** in the Aug-2026 snapshot and the report flags that below.)*
2. **Competitive shift — Apple shipped the comparable, on-device, a year ahead.** WWDC26 [session 241](https://developer.apple.com/videos/play/wwdc2026/241/) confirms an **Evaluations framework** ("quantify accuracy as you tweak your prompts"), **token counting** (`tokenCount(for:)`, iOS 26.4), and a per-response **usage** object exposing input, **cached**, output, and **reasoning** token counts. ML Kit has none of these on-device; its official quality path routes to [Vertex AI in the cloud](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html). Evidence status: **confirmed-live**.
3. **Regulatory shift — a dated forcing function.** The EU's July 2026 DMA decision requires Alphabet to expose system-level on-device AI models to third parties "at equivalent performance" by **1 August 2027** in Android 18. Third-party expectations of what a platform on-device AI surface must provide are about to be set by law; "you can call it but you can't measure it" is a weak position to hold into that deadline.

A real three-part why-now. The weakest leg is #1 being partly self-inflicted urgency (Google set its own volatility), but the Apple leg is externally dated and hard to argue with.

---

## The capability gap

Precise boundary, each negative with the page checked:

- **ML Kit GenAI:** exposes inference and, now, an input-side `countTokens` reference in the Beta Prompt API — so the Aug-2026 "Google exposes no token count" claim is **stale for input**. But there is no per-response **usage** object (no cached/output/reasoning accounting), no evaluation harness, and no regression tooling; quality is routed to cloud Vertex AI ([release notes](https://developers.google.com/ml-kit/release-notes); the per-response-usage negative is the feasibility agent's inference, **unverified** pending a direct read of the `com.google.mlkit.genai.prompt` package reference, which the host blocked).
- **AI Edge Portal:** benchmarks LiteRT models across 100+ physical devices for init time, latency, and memory — **performance only, no output-quality metric** ([page](https://developers.google.com/edge/ai-edge-portal)). It also targets the LiteRT path, not the AICore-managed Nano path the Prompt API uses.
- **Firebase AI Logic:** orchestration (PREFER_ON_DEVICE / fallback), no eval, no documented on-device usage accounting ([hybrid docs](https://developer.android.com/ai/hybrid)).
- **Qualcomm AI Hub / Workbench:** numerical parity vs a float reference and perf profiling — **not semantic quality judging** ([get-started](https://aihub.qualcomm.com/get-started)).
- **OSS/commercial:** mature but cloud/CI (promptfoo, DeepEval, Ragas); nothing runs quality eval on the device.

**The main competitor is not another platform — it is the developer's own spreadsheet of golden prompts plus manual spot-checking**, with promptfoo-on-a-laptop for the teams that have invested. The thing this replaces is a human reading outputs.

---

## Proposed surface

A two-layer tooling SDK, deliberately split because the two layers have different verdicts.

**Layer 1 — Observability (Build-ready).** A thin wrapper around a Prompt/Agentic session that auto-captures, per call: latency (first-token and total), the true availability/feature-status transition, quota headroom before `BUSY`, error codes, and token/usage accounting — the platform exposing the per-response **usage** object Apple already ships (input, cached, output, reasoning). Stored locally; optionally aggregated. This is the privileged core: an app cannot compute cached-token counts or quota headroom itself.

```kotlin
val session = PromptSession.create(config, telemetry = MlKitTelemetry.capture())
val result = session.generate(prompt)          // usage + latency + availability captured automatically
result.usage.cachedInputTokens                 // today: unavailable to the app
MlKitTelemetry.lastRun().quotaHeadroomPct       // today: you find out at BUSY
```

**Layer 2 — Evaluation (Prototype).** A golden-set runner: the developer supplies inputs and either reference outputs or assertions; the harness runs them on-device against the current model, emits a **regression delta** vs a saved baseline, and surfaces per-case diffs. Scoring uses three ladders, strongest first: (a) **structured assertions** (format, length, schema via the Structured Output API) — deterministic, free; (b) **semantic similarity** via the new on-device Embeddings API — cheap, no judge bias; (c) **LLM-as-judge** using the on-device model for *pairwise, same-rubric* regression comparisons only, with an **optional cloud/human calibration** hook.

**Time-to-first-hello-world:** Layer 1 can hit **15 minutes** (one Gradle line, wrap the session, read a dashboard). Layer 2 cannot — it needs a dev-supplied golden set — and pretending otherwise would be the design lying. What has to be true for Layer 1's 15 minutes: the telemetry wrapper ships in the same artifact as the Prompt API, no new permission, no key.

Deliberate exclusions: no cloud upload of user content by default (on-device is the point); no absolute 1–10 "quality score" presented as ground truth (see the case against).

---

## Reach & sizing

Arithmetic, with each input sourced, following the skill's recipe. All adoption figures are **third-party estimates** (AppBrain is a crawl with unpublished methodology); API-reach is third-party (StatCounter-derived).

- `A_cat`: ~279,000 apps above 50K installs across all categories; GenAI-text-plausible categories (Productivity/Communication/Education/Tools/Social) give an envelope of **~60,000–120,000** apps (only Tools, ~25K, and totals were directly retrievable; the rest is an order-of-magnitude bracket) — [AppBrain categories](https://www.appbrain.com/stats/android-market-app-categories).
- `r_reach` (OS): API 26+ ≈ **~98%** — not binding — [apilevels.com](https://apilevels.com/).
- `r_reach` (device): the binding gate. Gemini Nano runs on **~140M devices** (Google, Apr 2026) ≈ **~3.7%** of ~3.8B actives (my arithmetic on a Google numerator and a third-party denominator); Nano-4-class is narrower still (~1–3%, single agency estimate).
- `c_ceiling`: the most-adopted specialized on-device ML SDK (TensorFlow Lite) reaches **~1% of apps / ~9–11% of installs**, with ~12× install-weighting — [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks). A measurement layer sitting above the Prompt API ceilings **below** that.

**Install-weighted reach today:** optimistically ~10% of installs for a specialized on-device SDK, but intersected with ~3.7% Nano eligibility, the *effective* reach is low single-digit percent of the Android surface — and that is the honest number. **Realistic 3-year adopting-app count: low single-thousands**, not the 60K envelope.

**Engineering cost avoided** is the better numerator: every team shipping on-device GenAI currently rebuilds golden-set scaffolding and validation/retry layers (the *Less Is More* case study spent a 5-day sprint partly on exactly this). At even a few engineer-weeks saved across a few thousand adopters, the platform test clears on the cost side — but the reach gate means the *count* of adopters is small until Nano spreads.

**Sensitivity:** halve both the plausible-job fraction and the adoption ceiling and the adopter count drops to the hundreds — at which point the **quality** layer (Layer 2) is a feature, not a platform API. Layer 1 (observability) survives the cut, because its value per adopter is higher and its privilege is absolute. The honest reading: **the sizing supports building Layer 1 now and gating Layer 2 on Nano reach growing.**

---

## Adoption path

1. **The hook:** a team already fighting [#1062](https://github.com/googlesamples/mlkit/issues/1062)-class availability bugs adds one Gradle line and finally sees, on a real device, why `checkFeatureStatus()` lied. Fifteen minutes to a dashboard.
2. **First real integration:** they wire the usage object into their existing analytics and the regression runner into CI, replacing a hand-maintained prompt spreadsheet.
3. **The dependency:** once a release gate says "block if regression delta > X on the golden set," removing it means shipping blind again — a dependency the tech lead endorses rather than resents.

First adopter: a team **already on the Prompt API in production and already filing these issues** — the issue tracker names them. Second wave: brand-sensitive apps (keyboards, accessibility tools like Envision, communication apps) that can't ship generation they can't measure. The unlock for the second wave is one visible reference app publishing "we caught a Nano-update regression before our users did."

---

## Execution plan

- **Developer preview (Layer 1 first):** ship the telemetry wrapper + per-response usage object to the teams in the issue tracker. Question it answers: do they adopt a one-line observability layer, and does exposing usage/quota change their shipping behavior? Evidence collected: the S1 "pain converts to adoption" assumption.
- **Alpha (Layer 2):** ship the golden-set runner with assertion + embedding scoring. Graduation condition: on a labeled regression set, the on-device pairwise judge beats a random baseline by a margin a brand team would trust, **and** embedding-similarity catches the regressions the judge misses. If it can't, ship Layer 2 with judge **off by default** (assertions + embeddings only).
- **GA:** commit a versioned usage schema and a stable telemetry contract — independent of the model version, which is the whole point.

Org dependencies, named honestly: the usage/quota/availability signals require the **AICore** team to expose internals ML Kit currently fronts but doesn't surface — the hardest yes. The cloud-calibration hook touches **Firebase AI Logic**. If AICore says no, Layer 1 degrades to app-observable signals only (latency, error codes, approximate output tokens) — weaker, but still shippable.

---

## The case against

The strongest argument against is **reach, not demand** — adoption failure mode #1, "the API outran the hardware." A measurement layer is only as reachable as the thing it measures, and the Prompt API runs on ~3.7% of the fleet. A skeptic says: you are proposing tooling for a capability that most of the Android base can't run, so the install-weighted value is small and will stay small until Nano reaches mid-tier silicon — build it in 2028. The honest rebuttal is narrow: the harness is *no more* gated than the API it serves, so if shipping the Prompt API is worth doing, measuring it is worth doing — but that rebuttal concedes the absolute reach is small today, which is why the verdict is Prototype, not Build, and why Layer 1 leads.

The second argument is **feasibility of the quality half** — the embarrassment threshold. A Nano-class model judging its own output is itself biased: position bias, verbosity bias, self-preference, and rubric drift, all worsening as the model shrinks ([BabelJudge, arXiv 2606.22329](https://arxiv.org/abs/2606.22329); small judges trail GPT-4o/Claude-class judges materially per [Galtea](https://galtea.ai/blog/exploring-state-of-the-art-llms-as-judges)). A quality score that is itself wrong is worse than no score. This is real, and it is why the design restricts on-device judging to *relative, pairwise, same-rubric* deltas where biases partially cancel, leans on deterministic assertions and embedding similarity first, and keeps a cloud/human calibration hook. The mitigation is honest, but it means Layer 2's headline can't be "trustworthy absolute quality score."

The third, weaker argument — undifferentiated vs a free substitute (#7) — is partly answered: promptfoo *could* add an Android runner, but it cannot expose cached-token counts or quota headroom, because those are platform-internal. The observability layer is defensible; the eval scaffolding is more contestable.

---

## Kill criteria

**The single observation that would reverse this recommendation:** a developer preview showing that on-device Nano-class pairwise judging cannot beat a random baseline on a labeled regression set by a brand-trustable margin **and** that embedding-similarity scoring misses the regressions that matter. That kills Layer 2; Layer 1 survives on its own merits.

**Second reversal (reach):** if Gemini Nano device coverage is still under ~5% of the Android base through 2027, the install-weighted reach doesn't justify a committed public *quality* surface — hold Layer 2 at preview and ship only observability.

**Load-bearing assumption:** that the pain visible in the issue tracker (#1062, #1078, #1070) converts into adoption of a one-line measurement layer, rather than teams continuing to hand-roll because their scaffolding already exists.

**Re-check trigger if shelved:** Nano reaching mid-tier silicon, or Google deciding to answer Apple's Evaluations framework directly — at which point this *is* the spec for that answer.

---

## Fit for this team

ML Kit, not elsewhere. ML Kit owns the GenAI front door — the Prompt and Agentic APIs — so the layer that measures them belongs beside them. It is **not** MediaPipe (the model/runtime layer), **not** AI Edge Portal (cloud perf benchmarking on the LiteRT path, not the AICore-managed Nano path), and **not** the Android framework. The privileged signals — per-response usage, cached-token counts, quota headroom, true availability — are AICore-internal, and ML Kit is already the sanctioned surface over AICore, so exposing them through ML Kit extends an ownership it already has rather than claiming new territory. The one cross-team seam is the optional cloud-calibration judge (Firebase AI Logic), which is why it is optional.

---

## Open questions

- **Does a per-response usage object already exist in the Beta package reference?** The feasibility agent inferred it does not (only input `countTokens`), but `developers.google.com` was unreachable this session. A direct read of `com.google.mlkit.genai.prompt` settles the single most load-bearing capability claim.
- **What is Nano 4's real mid-tier reach?** Every device-list and RAM-floor figure is third-party press; no Google coverage percentage exists. This is the input the entire reach score turns on.
- **Can embedding-similarity alone carry regression detection** without a judge, well enough to ship Layer 2 judge-off? Settles whether the feasibility risk is fatal to Layer 2 or merely a default setting.
- **Is ML Kit and MediaPipe/AI Edge converging or diverging organizationally?** Decides whether this harness should span both the AICore and LiteRT paths or stay AICore-only.

---

## Runners-up

- **Delivery/availability observability as a committed SLO (Type E)** — the highest-privilege framing of the same #315/#1062 pain, but narrower; folded into this idea's Layer 1 rather than run as its own report. Lost on scope, not merit.
- **On-device neural TTS (Type A)** — genuine whitespace (Picovoice Orca sells into it; Apple shipped speech generation; Google has only the decade-old `TextToSpeech`). Lost this run on **Platform Privilege**: a competent team ships an equivalent Gradle dependency, so the G1 case is weaker than a platform-internal telemetry layer. A strong standalone candidate for a future run.
- **Standalone safety/moderation classifier for user content (Type G)** — real demand (Bumble open-sourced one; Play policy makes devs accountable). Lost on the **tunability** risk: one-size moderation dies on contact with each app's proprietary policy, needing a longer feasibility case than one run allows.
- **Sub-8GB reach tier for GenAI (Type F)** — the biggest prize by reach, directly attacking the ~3.7% gate. Lost this run on **Feasibility Headroom**: no Google GenAI API targets sub-8GB today and the quality-at-tier claim needs its own benchmarking pass before it survives a skeptic.

---

*Sources:*
- [Apple WWDC26 session 241 — Foundation Models](https://developer.apple.com/videos/play/wwdc2026/241/)
- [ML Kit issue #315 — on-device model download/availability API](https://github.com/googlesamples/mlkit/issues/315)
- [ML Kit issue #1062 — checkFeatureStatus unreliable](https://github.com/googlesamples/mlkit/issues/1062)
- [ML Kit issue #1078 — reports AVAILABLE but inference fails](https://github.com/googlesamples/mlkit/issues/1078)
- [ML Kit issue #1070 — undocumented per-app inference quota](https://github.com/googlesamples/mlkit/issues/1070)
- [ML Kit issue #1080 — stuck Downloading after low storage](https://github.com/googlesamples/mlkit/issues/1080)
- [ML Kit issue #1061 — default ModelConfig feature switch regression](https://github.com/googlesamples/mlkit/issues/1061)
- [ML Kit issue #1072 — on-device Translate mistranslation](https://github.com/googlesamples/mlkit/issues/1072)
- [arXiv 2604.24636 — Less Is More: on-device SLM integration](https://arxiv.org/abs/2604.24636)
- [arXiv 2508.20737 — Rethinking Testing for LLM Applications](https://arxiv.org/abs/2508.20737)
- [arXiv 2606.22329 — BabelJudge (on-device quantized judge reliability)](https://arxiv.org/abs/2606.22329)
- [Galtea — small LLMs as judges](https://galtea.ai/blog/exploring-state-of-the-art-llms-as-judges)
- [promptfoo (GitHub)](https://github.com/promptfoo/promptfoo)
- [Android Developers Blog — What's new in intelligent apps (ADS, 2026-11-05)](https://developer.android.com/blog/posts/android-intelligence-system-in-app-agents-ads)
- [ML Kit GenAI Agentic API](https://developers.google.com/ml-kit/genai/agent/android)
- [Android Developers Blog — Automated Prompt Optimization for ML Kit (Vertex AI)](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html)
- [Google AI Edge Portal](https://developers.google.com/edge/ai-edge-portal)
- [Firebase AI Logic hybrid inference](https://developer.android.com/ai/hybrid)
- [Qualcomm AI Hub](https://aihub.qualcomm.com/get-started)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [apilevels.com — Android version distribution](https://apilevels.com/)
- [AppBrain — ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [AppBrain — app category stats](https://www.appbrain.com/stats/android-market-app-categories)
