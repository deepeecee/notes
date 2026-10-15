# On-Device GenAI Measurement — give the Prompt API a `usage` object and a quota gauge before an eval harness

**Type:** D (Tooling), with a Type B (extension) core · **Verdict:** Prototype / Developer-Preview · **Opportunity: 5/10 (Credible, flagship-gated)**
*2026-10-15 · Prepared for Android ML Kit · Evidence current as of 2026-10-15*

> *Badges: `Apple already shipped both halves` · `Privileged data nobody else can read` · `Reach-gated to ~3.7%` · `Demand real on tokens, thin on eval`*

> A developer shipping a Gemini Nano feature through the ML Kit Prompt API runs ~40 generations
> back-to-back in a loop, and the calls start failing with `ErrorCode.BUSY`. There is no documented
> quota, no remaining-budget readout, no output-token count on the response — so they do what one
> did in August 2026: reverse-engineer the limit by hand and file an issue asking Google to "expose
> remaining quota, even coarsely." Apple developers asked for the same thing on their platform, and
> at WWDC26 Apple shipped it — `tokenCount`, a four-way `usage` breakdown, and an Evaluations
> framework. Google ships none of it for mobile. The one number that matters: the most useful
> measurements here are ones **only AICore can produce**, and a third party cannot compute them at all.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Credible, flagship-gated | composite 3.1 × 2 = 6.2, −1 for G3 (Durability) scoring exactly 3 → ~5.2 → 5. No +1 (S1 is not a 5). |
| Platform privilege (gate) | 4/5 — pass | Output/cached/reasoning token counts and live quota state are held only by AICore; no third-party tokenizer or quota API exists ([GenAiException.ErrorCode](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode), [#1070](https://github.com/googlesamples/mlkit/issues/1070)). The eval-harness half is less privileged (OSS can do deterministic checks). |
| Feasibility headroom (gate) | 5/5 — pass | Tooling; no model to train. Input `countTokens()` already ships; adding a response `usage` field is an API change Google controls; eval can run in test targets/CI as Apple proved ([WWDC26 Evaluations](https://developer.apple.com/videos/play/wwdc2026/298)). |
| Durability (gate) | 3/5 — pass (the risk) | A measurement/eval contract is lower-churn than a model API, but output-stability across Nano refreshes — the thing the tool measures — is itself unversioned today. Google API mortality prior is real ([killedbygoogle](https://killedbygoogle.com/)). |
| Demand evidence (25%) | 3/5 | Token/quota demand is dated, specific, Android-native ([#1070](https://github.com/googlesamples/mlkit/issues/1070)) and mirrored cross-platform by Apple devs ([thread 800238](https://developer.apple.com/forums/thread/800238), [797208](https://developer.apple.com/forums/thread/797208)); eval-harness demand is thin (no serious OSS on-device harness; no commercial on-device eval). |
| Install-weighted reach (15%) | 2/5 | GenAI is gated to Nano hardware ≈3.7% of the base (140M/3.8B, my arithmetic); Prompt API early with one named 3P adopter (Kakao Mobility). |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The privileged telemetry a dev literally cannot build (infinite delta, but platform-gated); the eval harness has a borrowable server-oriented path (promptfoo/DeepEval adapted). Blended. |
| Integration cost / TTFHW (15%) | 4/5 | Reading `response.usage` is one field, no new permission, negligible size — under 15 min. The eval harness is a test/CI dependency, an afternoon. |
| Substitute half-life (15%) | 3/5 | A general model can't substitute for privileged data, but Google's **own** roadmap could ship the `usage` field piecemeal, or Firebase AI Logic could extend `usageMetadata` to the on-device path. |
| Strategic complement (10%) | 4/5 | Making GenAI measurable raises confidence to adopt the Prompt API → more AICore/Nano usage, more Android engagement and device differentiation, and closes a visible Apple-parity gap. |
| **Composite** | **3.1** | Weighted mean. Verdict band 3.0–3.9 = Prototype / developer-preview to collect S1 evidence. |

*Least trustworthy line: install-weighted reach (S2). The AppBrain ML Kit %-apps/%-installs split and the per-category serious-app counts could not be fetched this run (DNS-blocked), and the 140M Nano figure is a third-party estimate with no Google-published confirmation found — so the reach number is directional, not sourced to Google.*

---

## The problem

The job, stated as a developer's job under a deadline: *"I added a Gemini Nano feature with the ML Kit Prompt API. I need to know what it costs me against the quota, why it sometimes fails, and whether my last prompt change made the output better or worse — before I ship it to users who will blame my app, not Google's model."* Today they can answer none of the three from the SDK.

Concretely, the Prompt API (Beta; `genai-prompt` had reached beta4 by October 2026 per issue traffic, though the October 2025 launch blog still reads "Alpha" — a stale-doc flag) exposes a **pre-request, input-only** `countTokens()` plus `getTokenLimit()` ([Kotlin reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)). The *response* carries only `result.text` and a `FinishReason` — **no output-token count, no cached/prefix-cache signal, no reasoning-token usage**. Per-app inference quota is not introspectable; it surfaces only reactively as `GenAiException.ErrorCode.BUSY` (9) with a `getRetryDelay()` hint, and a longer-horizon `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` (27). Execution is foreground-only. Models download on demand and update underneath the app.

What developers do *instead* today: (1) for quota, they discover the limit empirically and hand-roll backoff — exactly what [mlkit#1070](https://github.com/googlesamples/mlkit/issues/1070) documents; (2) for cost/usage, they cannot measure it at all, because the data lives in AICore; (3) for quality regression, they either don't measure (the common case) or wire their test flow out to **cloud Vertex AI Gen AI Evaluation Service** — which is Google's only sanctioned eval story ([evaluation-overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)), a cloud dependency bolted onto an on-device feature.

This is structurally produced, not a bug. A shared, system-managed model with per-app quotas and silent version refreshes *necessarily* hides its accounting from any one app — and *necessarily* makes output drift across refreshes an app's problem to detect. Every GenAI app hits this identically and badly, which is the signature of a platform problem, not an app problem.

---

## Proof & signals

- **Developers doing it by hand (Android-native, strongest single signal):** [mlkit#1070](https://github.com/googlesamples/mlkit/issues/1070) (opened Aug 9 2026): *"Sustained back-to-back inference through the Prompt API hits a rolling per-app quota that is not documented anywhere … neither the quota's existence, its approximate size, nor the retry-delay semantics are documented. Developers will misread mass BUSY failures as model or device breakage (we initially did)."* The reporter asks Google to *"expose remaining quota (even coarsely) so apps can route to a fallback before hitting the wall."* No official response as of this run. Evidence status: **confirmed, fetched.**
- **Version churn bisected by hand:** [mlkit#1061](https://github.com/googlesamples/mlkit/issues/1061) — a beta2→beta3 behavior change (`"beta2 succeeds on the same device, in the same session, minutes apart, with the same source code"`), plus [#1078](https://github.com/googlesamples/mlkit/issues/1078) on beta4 `COMPUTE_ERROR`. These are availability/API breaks more than output-quality drift, so they support the *regression-pain* thesis only partially. **Confirmed, fetched; caveat noted.**
- **Cross-platform demand, then vendor willingness-to-fix:** Apple developers filed the same request — [*"I'm a little surprised to find there is no token counter … If tokens are a first-class constraint, a counter should be too"*](https://developer.apple.com/forums/thread/800238) and a formal enhancement request ([thread 797208](https://developer.apple.com/forums/thread/797208), FB19724539). Apple then **shipped the fix** (below). A platform converting this exact demand into a shipped API is the strongest validation available that token accounting matters. **Confirmed.**
- **The absence signal (eval):** GitHub search for on-device LLM eval / prompt-regression harnesses returns only hobby repos (≤3★); the serious OSS eval tools — [promptfoo](https://github.com/promptfoo/promptfoo) (~10.8k★), [DeepEval](https://github.com/confident-ai/deepeval) (~13.9k★), [Ragas](https://github.com/explodinggradients/ragas) (~14k★), [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) — are **all server/desktop-oriented**, none run against a model executing on an Android device. No vendor charges for on-device/mobile eval. I read this as: the eval need is real in principle but **not yet revealed** among Android GenAI developers, partly because the addressable population is tiny and partly because Reddit/SO/HN were crawler-blocked this run so the channel is "no signal found," not "confirmed silent."

Distinguish Google-published from third-party throughout: the quota error codes and `countTokens` behavior are **Google-published**; the 140M Nano figure and star counts are **third-party estimates**.

---

## Why now

1. **Capability shift — the Prompt API matured into something worth measuring (dated).** Structured Output (Alpha), System Instructions and Thinking Mode (Beta) landed July 2026, and the output ceiling rose to 4096 tokens. "Thinking Mode" in particular creates reasoning-token cost that is now completely invisible to the developer — a measurement gap that *did not exist* before July 2026.
2. **Competitive shift — Apple shipped both halves (dated, and this is the sharp one).** iOS 26.4 (2026-03-31) added `SystemLanguageModel().contextSize` and `tokenCount(for:)`; WWDC26 session 241 added a response `usage` with `input.totalTokenCount`, `input.cachedTokenCount`, `output.totalTokenCount`, and `output.reasoningTokenCount`; and a dedicated **Evaluations** Swift framework (WWDC26, *"Meet the Evaluations framework"* — session id reported inconsistently as 298/382, [unverified]) runs quality/regression checks inside test targets via a `.evaluates` trait. Google ships neither for mobile. The gap is now demonstrable with a side-by-side API diff.
3. **Regulatory shift — weaker here, name it honestly.** The EU DMA Article 6(7) decision (July 2026) forces Alphabet to expose on-device AI models to third parties in Android 18 by 2027-08-01. That raises the number of callers of the managed model, which indirectly raises the value of a shared measurement contract — but it is not a why-now for *measurement* specifically. Two strong legs, one weak; the honest read is "correct and becoming urgent," not "urgent."

---

## The capability gap

Exact boundary, each negative with the surface checked:

- **ML Kit Prompt API:** input `countTokens()`/`getTokenLimit()` only; **no** response `usage`, cache-hit, or reasoning-token data; quota only via exceptions ([reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)).
- **ML Kit eval:** no shipped harness. A prose *"evaluate prompt quality"* page and a Jan 2026 [Automated Prompt Optimization](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html) blog — both route to **cloud** Vertex AI.
- **AI Edge Portal:** latency/memory/accelerator and hardware-regression detection — **no output-quality scoring** ([docs](https://developers.google.com/edge/ai-edge-portal)).
- **MediaPipe / LiteRT-LM:** built-in tokenizers inside `.task` bundles, **no exposed token-count or eval API**.
- **Firebase AI Logic:** a full `UsageMetadata` (prompt/candidates/cached/thoughts tokens) — for the **cloud** path only; the on-device path *is* the ML Kit Prompt API, so it inherits the no-usage gap.
- **Qualcomm AI Hub:** numerical-correctness validation + perf benchmarking — **no generative output-quality or usage tooling**.
- **Apple:** ships **both** halves (above).

**Main competitor a developer uses today:** nothing on-device — they fall back to cloud Vertex AI for eval and to hand-rolled `try/catch`+backoff for quota. The competitor is the developer's own code plus a cloud round-trip, which is exactly what an on-device platform should be eliminating.

---

## Proposed surface

This problem admits several types; the choice is the recommendation. Split it:

**Core (Type B extension — ship this first, high confidence):** add usage to the Prompt API response and a coarse quota gauge.

```kotlin
// response.usage — new, mirrors Apple's four-way accounting
class GenAiUsage(
  val inputTokenCount: Int,
  val cachedInputTokenCount: Int,   // prefix-cache hits — privileged, AICore-only
  val outputTokenCount: Int,
  val reasoningTokenCount: Int,     // Thinking Mode cost, invisible today
)

// coarse remaining-budget readout, what #1070 explicitly asked for
suspend fun GenerativeModel.inferenceBudget(): InferenceBudget  // e.g. APPROX_FULL / LOW / EXHAUSTED + resetHint
```

*Deliberately not:* an exact quota count (invites apps to pace to the millisecond against a shared resource) or a cross-app budget view. Coarse buckets + a reset hint are enough to route to a fallback, and safe to commit to.

**Developer-preview (Type D — collect S1 before committing):** an on-device/CI eval harness — a JUnit/Compose-test trait that runs a prompt suite against the real on-device model, records `usage` and a metric per case, and gates regressions (`assertThat(meanScore).isAtLeast(0.8)`). Model-as-judge defaults to a **local** small model (so it runs offline), with Vertex AI as an opt-in for higher-fidelity judging — the inverse of Google's current cloud-first default.

**TTFHW target:** under 15 minutes for the core — add the dependency, read `response.usage.outputTokenCount`, done, in the emulator where Nano is available. If the harness can't hit an afternoon-to-first-regression-gate, that's a finding about the harness design, not a footnote.

---

## Reach & sizing

Show the arithmetic; give ranges.

- **Device eligibility:** Nano-capable hardware ≈ **3.7%** of the ~3.8B Android active base (140M ÷ 3.8B, *my arithmetic*; 140M is a **third-party estimate** — [techjacksolutions, Jul 2026](https://techjacksolutions.com/?p=70981) — with no Google-published count found this run). OS floors are **not** the gate: API 26+ ≈ 98.4% and API 31+ ≈ 69.3% ([Google distribution data, Dec 2025](https://9to5google.com/2026/01/30/android-16-is-on-7-5-of-devices-in-latest-distribution-numbers-update/), cumulative mine). The ~25× gap between OS-eligible and Nano-eligible is pure hardware.
- **App side:** specialized on-device ML SDKs cap at low-single-digit % of all apps even for the category leader. Apps plausibly adopting GenAI (productivity, communication, news, social, education, tools >50K installs) are an **app-count ceiling in the low tens of thousands**; the *serviceable* near-term slice willing to ship a flagship-gated Beta API is realistically **hundreds to low thousands**. (AppBrain category and ML Kit figures were DNS-blocked this run — this is bounded estimation, not a sourced count.)
- **Install-weighting:** adopters over-index on installs (a comparable Jetpack library shows ~2.4× install-over-app skew), so install-weighted reach of *GenAI-capable* surface is roughly mid-single-digit to ~10%.
- **Engineering cost avoided:** the core saves every adopter the quota reverse-engineering in #1070 (days, recurring as quotas change) and makes `usage`-based cost control possible at all. The harness saves the "stand up cloud Vertex eval for an on-device feature" detour. Modest per-app, but it accrues to the exact apps Google most wants deepening their Nano usage.

**Sensitivity:** halve both the serviceable-app fraction and the adoption ceiling and the *reach* case gets worse, not better — which is why the verdict is Prototype, not Build. The core survives anyway, because its value is per-adopter unavoidable cost, and because reach grows mechanically as Nano reaches mid-tier (nano-v4). The decision the sizing forces: **don't gate the core on reach; gate the eval harness on demand evidence.**

---

## Adoption path

1. **The hook:** a developer debugging random `BUSY` failures finds `inferenceBudget()` and `response.usage` in the release notes and gets, in one line, the answer they were reverse-engineering. That is the fifteen-minute win.
2. **First real integration:** they wire `usage` into their own cost/latency dashboard and route to a cloud fallback when the budget reads LOW — replacing hand-rolled backoff with a supported signal.
3. **The dependency:** once their CI gates on the eval harness, removing it means flying blind through the next Nano refresh — a dependency they'd endorse, not resent, because it's what lets them *change* their prompt safely.

**First adopter:** the named 3P partner already on the Prompt API — [Kakao Mobility](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) — plus Google's own first-party Nano apps (Pixel Screenshots, Recorder), which can dogfood the harness and produce the reference implementation the second wave copies.

---

## Execution plan

- **Developer preview (core):** ship `response.usage` + `inferenceBudget()` behind the existing Prompt API. Question it answers: do adopters wire usage into real cost/fallback logic? Partners: Kakao + first-party. Evidence collected: usage-field adoption rate, whether the coarse budget is actionable.
- **Alpha/Beta (harness):** graduate only if the preview shows developers asking for regression gating (the S1 evidence currently thin). Checkable condition: ≥N preview teams request CI integration, or file eval-related issues.
- **GA:** commit to the `usage` schema versioned **independently of the Nano model** — the one durability promise that makes the whole thing trustworthy.

**Org dependencies, named honestly:** the usage/cache/reasoning counts and quota state live in **AICore**, owned by another team. If they won't surface prefix-cache and reasoning-token counts, the core degrades to input+output tokens + coarse budget — still useful, still ahead of today, but short of Apple parity. That dependency is the single biggest execution risk and the plan should not pretend otherwise.

---

## The case against

The strongest case against, argued at full strength: **this is a feature, and the platform will absorb it underneath you.** The highest-value part — a response `usage` object — is a field Google can add to the Prompt API in a point release without any "measurement toolkit" existing as a product. If that happens, the standalone framing collapses and only the eval harness remains, and the eval harness has the *weakest* evidence (no OSS reimplementations, no commercial WTP, crawler-blocked developer channels). Combined with reach gated to ~3.7% of devices, a skeptic can fairly say: small addressable base, the good half is just an API field, the speculative half is unproven.

The live failure mode from the rubric is **#2, "the platform absorbs the problem underneath you"** — and here the platform is *you*. The mitigation is to lean into it rather than resist: treat the `usage` field as a plain Type B extension to ship now (cheap, privileged, dated demand), and treat the harness as a developer-preview bet explicitly scoped to collect the demand evidence it currently lacks. That reframing is why the verdict is Prototype, not Shelve: the core is almost unarguable; the product-sized version of it is not yet earned.

---

## Kill criteria

**The single observation that would reverse this:** if Google's own roadmap already has `usageMetadata` for the on-device path landing in a Prompt API release before mid-2027 (check ML Kit release notes), the *standalone* recommendation dies — fold it into that work. Conversely, if a developer-preview of the harness draws fewer than a handful of teams asking for CI regression gating within two quarters, the Type D half is shelved and only the Type B core proceeds.

**Load-bearing assumption:** that AICore will expose prefix-cache and reasoning-token counts to the ML Kit layer. Everything approaching Apple parity rests on it.

**Re-check trigger if shelved:** nano-v4 reaching mid-tier devices (lifting S2 reach out of low-single-digits), or an EU-DMA-driven surge of third-party callers of the managed model that makes a shared measurement contract load-bearing.

---

## Fit for this team

ML Kit, specifically, because ML Kit *is* the sanctioned front door to AICore's managed Nano path — the surface where the quota and usage actually originate. MediaPipe/LiteRT-LM run bring-your-own models where the app already owns the tokenizer and can measure itself; Firebase AI Logic owns the cloud `usageMetadata` but defers on-device to ML Kit. The eval harness could plausibly live in AI Edge Portal (which already does perf regression) — and if the org prefers that, the honest conclusion is to put the harness there and keep only the `usage`/quota extension in ML Kit. What must not happen is the measurement story fragmenting across three surfaces the way the inference story already has; whoever owns it, it should be one place.

---

## Open questions

- **Does AICore expose prefix-cache and reasoning-token counts internally at all?** If not, even the platform can't ship Apple-parity usage, and the core is capped at input+output. *Settled by:* an AICore API audit (internal).
- **Is `usageMetadata` for the on-device path already on the Firebase/ML Kit roadmap?** *Settled by:* checking the live ML Kit release notes and internal roadmap — this run could not fetch developers.google.com directly (DNS-blocked), so freshness past the August snapshot is inferred, not read.
- **Real serviceable app count.** AppBrain category/ML Kit figures were unreachable this run; the sizing is bounded estimation. *Settled by:* a manual AppBrain + Play SDK Index pull in a browser.
- **Is there latent eval demand the crawler couldn't see?** Reddit/SO/HN were blocked. *Settled by:* a developer-preview, which is the recommended way to generate the S1 evidence rather than guess at it.

---

## Runners-up

- **On-device text-embeddings / semantic-search API (Type A).** Lost on Platform Privilege: EmbeddingGemma + MediaPipe text-embedding already give a competent team a borrow path, so G1 is soft.
- **Deferred / opportunistic inference scheduling (Type E)** — "run this batch when charging, idle, on wifi" under the shared model. Highest privilege of any candidate and nobody ships it; lost this run only on Demand (no revealed signal because there's no workaround to leave traces). Strong re-pick candidate for a future run.
- **User-content safety/moderation classifier (Type G).** Real regulatory why-now, but risks dying on contact with each company's proprietary policy surface unless tunability is designed in; parked for a dedicated run.
- **Reach tiering, one API across device classes (Type F).** Killed: Firebase AI Logic hybrid inference (`PREFER_ON_DEVICE`/`PREFER_CLOUD`) already ships the core of it.
- **Structured document understanding — tables/forms (Type B).** Viable but catch-up: Apple already shipped `RecognizeDocumentsRequest` with structure; it's closing a gap, not opening a lead.
- **On-device neural TTS (Type A).** Big genuine whitespace, but fails on Feasibility/Durability headroom for user-facing quality on mid-tier silicon — a separate, harder report.

---

*Sources: [mlkit#1070](https://github.com/googlesamples/mlkit/issues/1070) · [mlkit#1061](https://github.com/googlesamples/mlkit/issues/1061) · [mlkit#1078](https://github.com/googlesamples/mlkit/issues/1078) · [ML Kit Prompt API reference](https://developers.google.com/ml-kit/genai/prompt/android) · [GenerativeModel (Kotlin)](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel) · [GenAiException.ErrorCode](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode) · [ML Kit Prompt API launch blog](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) · [Automated Prompt Optimization](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [Vertex AI Gen AI Evaluation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) · [Apple FM — WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241) · [Apple Evaluations — WWDC26 (298/382)](https://developer.apple.com/videos/play/wwdc2026/298) · [Apple TN3193 context window](https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window) · [Apple forum 800238](https://developer.apple.com/forums/thread/800238) · [Apple forum 797208](https://developer.apple.com/forums/thread/797208) · [promptfoo](https://github.com/promptfoo/promptfoo) · [DeepEval](https://github.com/confident-ai/deepeval) · [Android distribution Dec 2025](https://9to5google.com/2026/01/30/android-16-is-on-7-5-of-devices-in-latest-distribution-numbers-update/) · [140M Nano estimate](https://techjacksolutions.com/?p=70981)*
