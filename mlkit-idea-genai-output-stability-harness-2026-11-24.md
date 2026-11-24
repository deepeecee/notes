# On-Device GenAI Stability Harness — ship the version contract developers can't build, not the eval runner they already wrote 131 times

**Type:** D (tooling) fused to E (delivery & lifecycle) · **Verdict:** Prototype (developer-preview) · **Opportunity: 5/10 (Catch-up)**
*2026-11-24 · Prepared for Android ML Kit · Evidence current as of 2026-11-24*

*Badges: `Apple already shipped this` · `Thin reach today` · `Nobody on Android has it` · `Privilege lives in the lifecycle half`*

> An Android engineer ships a summarization feature on Gemini Nano, tuned against nano-v2. Weeks later AICore quietly rolls their users to nano-v3, and — in the developer's words — they "find out at the support ticket, not the deploy." They have no way to re-run their prompts against the new model before users do, no usage object to see what changed, and no way to pin. Google's own ML Kit docs tell them to "run an evaluation dataset against each Gemini Nano version" by hand. Apple shipped a framework that does exactly this on-device in June 2026. Google ships a prose page and a link to a cloud service.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Catch-up | composite 3.2 ×2 = 6.4, −1 because privilege and durability both pass only at a soft 3, S1 not a 5 so no bonus; rounded down because Apple has pre-empted and reach is thin |
| Platform privilege (gate) | 3/5 — pass | The eval *runner* is not privileged (131 OSS re-impls exist); the usage object, per-version signalling, and stability contract are platform-only ([ML Kit countTokens is input-side only](https://developers.google.com/ml-kit/genai/prompt/android/get-started)) |
| Feasibility headroom (gate) | 4/5 — pass | Tooling, no model to train; constrained by [no Nano emulator + foreground-only + quotas](https://developers.google.com/ml-kit/genai), which shapes execution but doesn't block it |
| Durability (gate) | 3/5 — pass | A stability contract is itself a durability promise; the risk is ML Kit/MediaPipe org convergence is unresolved ([landscape gap](https://ai.google.dev/edge)) |
| Demand evidence (25%) | 4/5 | promptfoo 27.6k★, DeepEval 19.6k★, Ragas 16.4k★; [131 hand-rolled regression repos](https://github.com/promptfoo/promptfoo); [on-device case study quantifies 30–50% failures](https://arxiv.org/abs/2604.24636). On-device-*specific* demand still latent |
| Install-weighted reach (15%) | 2/5 | Eval tool ceiling ≈ a subset of GenAI adopters, itself device-gated to ~3.7% and alpha → ~1,000–5,500 apps at a 3-yr ceiling (sizing agent, AppBrain-derived) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Golden-dataset+metric runner is a weekend borrow; the usage object + version contract are unbuildable by an app |
| Integration cost / TTFHW (15%) | 3/5 | Usage read is a one-liner; the full on-device regression suite is an afternoon+ (device farm, backoff, warmup) — it cannot hit 15-minute hello-world |
| Substitute half-life (15%) | 3/5 | Lifecycle/usage half is hardware-tied and durable; the harness shell is <2 years from OSS parity |
| Strategic complement (10%) | 4/5 | Free stability makes developers trust and adopt ML Kit GenAI, and answers Apple directly |
| **Composite** | **3.2** | weighted mean of S1–S6 |

*Least trustworthy row: install-weighted reach. There is no per-SDK adoption count for Android anywhere (Google publishes no Maven stats, the Play SDK Index doesn't render to a fetcher), so the base is inferred by analogy to TensorFlow Lite and Crashlytics attach rates.*

> **Evidence-quality caveat, stated up front.** This run's research subagents could fetch `api.github.com` (GitHub stars/issues — authoritative) and Apple's `developer.apple.com` `.md` docs (authoritative) directly, but **every `developers.google.com`, `android-developers.googleblog.com`, and `arxiv.org` host failed DNS resolution** under this session's network allowlist. All Google-doc and arXiv claims below were read through WebSearch snippets that quote the primary page text, not direct fetches, so page "last updated" dates are mostly unread. Re-verify the two load-bearing Google pages (the Prompt API "Evaluate a prompt" guide and the Prompt API package reference) once those domains are allowlisted. Flagged inline as `[snippet-only]`.

---

## The problem

A large consumer Android app does not integrate an on-device LLM the way it integrates a cloud one. With a cloud model, as one engineer puts it, "you lock to a specific model version string and your prompt engineering stays stable until you choose to upgrade." On-device, the platform owns the model and updates it: "Chrome [or AICore] controls when Nano gets bumped and you find out at the support ticket, not the deploy" ([Venkatakrishnan, dev.to, 2026](https://dev.to/mohanvenkatakrishnan/experiments-with-on-device-ai-what-building-on-gemini-nano-actually-teaches-you-5deo) `[snippet-only]`). The job to be done is a tech lead's, under a deadline: *prove this feature still behaves before AICore ships a model my users run but I never tested.*

This is structurally produced, not a tooling accident. On-device model delivery rides the update curve — "50% of users in a week, 80% in a month" — which creates a live "model-version × hardware-capability × OS-version matrix" in production, and "an LLM's behavior is a probability distribution over outputs, so versions can look alike on most inputs but diverge on edge cases" ([Tian Pan, 2026-04-19](https://tianpan.co/blog/2026/04/19/on-device-llm-inference-model-update-propagation) `[snippet-only]`). The brand-safety bar at 100M installs means a 92%-correct feature is a no-ship, so silent drift on the 8% is exactly the risk that keeps a team from adopting at all. And the org that would catch it is server-side: large consumer apps have very few engineers fluent in both modeling and Android runtime behavior ([atlas P12; Snap, Grammarly]).

What do they do *instead* today? Three things, all bad. They hand-roll a golden-dataset runner (see Proof). They pin to an old SDK and refuse model updates, which the platform doesn't actually let them do for AICore-managed Nano. Or they don't ship on-device at all: of 149 LLM-using Android apps studied, 132 (~89%) use a cloud API and on-device is "the least common" strategy ([Hau, Hassan, Zhou, MOBILESoft 2025, arXiv 2502.15908](https://arxiv.org/abs/2502.15908) `[snippet-only]`). That last number is the real competitor: not a rival on-device SDK, but a cloud endpoint that ships this week and never drifts under them.

---

## Proof & signals

- **Developers doing it by hand — strong.** A GitHub search for prompt regression harnesses returns ~131 repos, nearly all 2026-dated, each re-implementing the same loop: run golden prompts, grade with an LLM judge or metric functions, fail the PR on drift, emit a usage report. Examples pulled live from `api.github.com`: [`olivia0401/prompt-evaluation`](https://github.com/olivia0401/prompt-evaluation) (11★, "regression gate"), [`tainguyen07/llm-eval-harness`](https://github.com/tainguyen07/llm-eval-harness) (5★, "prompt versioning, LLM-as-judge, regression tracking"), `promptry/promptry` ("local-first prompt regression testing"), `dalsc-dev/prompt-eval-harness` ("regex, JSON schema, forbidden-token, token-budget checks"). This is the proposed harness, built repeatedly, by hand.
- **Someone charging money for it — strong, but cloud.** Eval is a funded discipline: [promptfoo](https://github.com/promptfoo/promptfoo) 27.6k★ (~66k npm installs/week per Snyk), [DeepEval/Confident AI](https://github.com/confident-ai/deepeval) 19.6k★, Ragas 16.4k★, Langfuse 37.8k★, Comet/Opik 23.5k★. Every one is cloud/server/CI. **None run on-device.** Willingness to pay is proven; the on-device entrant is absent.
- **Apps that shipped it themselves — the sharpest artifact.** A longitudinal case study of a production Android game integrating Gemma 4 E2B and Qwen3 0.6B ([Oliveira, "Less Is More," arXiv 2604.24636](https://arxiv.org/abs/2604.24636) `[snippet-only]`) quantifies what drift-blind integration costs: "we … quantified the 30–50% word-length violation rate, … discovered the KV cache degradation pattern," plus "an SLM prompted identically may wrap its JSON in markdown code fences, translate JSON keys into the output language, truncate the response mid-token, or produce valid JSON with semantically wrong values." Its conclusion — "the most reliable on-device LLM feature is one where the LLM does the least" — is a verdict on the absence of exactly this tooling.
- **Google's own admission.** The ML Kit [Evaluate-a-prompt guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) `[snippet-only]` instructs developers to "run an evaluation dataset against each Gemini Nano version and record the outputs," grade manually or via LLM-as-judge, and iterate. Google prescribing a per-version eval loop is a first-party admission that (a) outputs drift across versions and (b) catching it is currently the developer's unpaid burden.
- **Community voice.** [`googlesamples/mlkit` issue #1063](https://github.com/googlesamples/mlkit/issues/1063) (open, 2026-07-21): on a nano-v3 device, "the Summarization and Image Description APIs are not supported on nano-v3" though others are — a version bump silently removing a capability an app relied on.
- **The absence signal.** A GitHub search for on-device Android LLM eval harnesses returns 2 repos, both empty (0★). Read honestly: the generic discipline is loud and monetized; the *on-device* slice is greenfield and the pain is still latent, not yet a market. That cuts both ways and is the single biggest reason this is a Prototype, not a Build.

---

## Why now

1. **Capability shift (2026).** Gemma 4 / Nano 4 landed in the AICore Developer Preview (April 2026) with E2B/E4B variants and explicitly "higher quality results," i.e. *intended* output changes; hands-on reports note Nano 4 Fast is "sometimes overly chatty … longer, meandering answers" versus Full ([Android Authority, 2026] `[snippet-only]`). The nano-v2→v3 transition already shifted the device matrix (v3 shipped on all Pixel 10 Pro; prefix speed 510→940 tok/s on Pixel 9 Pro vs Pixel 10 Pro per the [Aug 2025 Android Developers Blog](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) `[snippet-only]` — a throughput number, not a quality one, but it marks a live version churn). Drift is happening now, under developers, with no catch mechanism.
2. **Competitive shift (June 2026) — the real clock.** Apple shipped a first-party, on-device **Evaluations framework** (WWDC26, OS 27), whose stated purpose is to "measure the quality of your feature, track it as you change a prompt, and catch regressions before they ship," integrated with Swift Testing so evals run as unit tests with pass/fail thresholds ([developer.apple.com/documentation/evaluations](https://developer.apple.com/documentation/evaluations)). Apple also shipped token accounting — `tokenCount(for:)` and `contextSize` (iOS 26.4, Feb 2026) and per-response `.usage` plus a Foundation Models Instrument (iOS 27, June 2026) ([Apple FM updates](https://developer.apple.com/documentation/updates/foundationmodels)). Apple has built the entire bundle on-device. Google ships prose and a cloud link. This is the badge: *Apple already shipped this.*
3. **Regulatory shift (statutory, 2027-08-01).** The EU's July 2026 DMA decision requires Alphabet to expose "system-level on-device AI models" and "on-device model implementation and sharing" to third parties in Android 18 by **1 August 2027, at performance equivalent to Google's own services** ([DMA developer portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). Once third parties can bring their own models to the managed path, "which model version is my user running, and did it change?" stops being a Google-only question and becomes a contract the platform must express. That dated forcing function makes the lifecycle half of this idea more urgent, not less.

All three why-nows are real, which is rare — and two of them (Apple, DMA) are external, which is what makes this a catch-up play rather than a bet.

---

## The capability gap

Checked against primary text, with the negative URL beside each:

- **ML Kit GenAI:** no shipped eval/regression tooling — the [Evaluate-a-prompt page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) is prose + a link out to Vertex AI cloud eval. It *does* expose an **input-side** `countTokens` / `CountTokensResponse` ([package reference](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/package-summary)) `[snippet-only]` — so the common claim "no token counting" is false — but there is **no per-response output usage object** and no version-stability contract.
- **Google AI Edge Portal:** benchmarks LiteRT models for init time, latency, peak memory, and *performance* regressions across a device fleet — [no output-quality metric](https://developers.google.com/edge/ai-edge-portal). (Access status reads contradictorily across caches — "private preview" vs "no longer accepting sign-ups"; resolve against the live page.)
- **MediaPipe / Model Explorer:** visualize, debug, compare, overlay performance — [debugging only, no eval](https://ai.google.dev/edge).
- **Firebase AI Logic:** its on-device path is a thin wrapper over the ML Kit Prompt API and inherits every gap; its usage metadata (cached/"thoughts" tokens) is [cloud-path only](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference).
- **Vertex AI Gen AI evaluation:** real and good, but [cloud-only](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) — it is the service ML Kit links out to.
- **Qualcomm AI Hub:** profiling + numerical-parity (quantization) checks, [not semantic output-quality or version regression](https://app.aihub.qualcomm.com/docs/hub/howitworks.html).
- **OSS/commercial (promptfoo, DeepEval, Ragas, LangSmith):** all host/server/CI; none documented to run on a phone.

**The main competitor a developer uses today** is a hand-rolled golden-dataset runner in CI against a cloud model — i.e. they avoid on-device entirely. On Android, on-device eval+stability is genuinely unfilled; the sharp caveat is that Apple has already filled it on iOS.

---

## Proposed surface

The useful move is to **not** ship an eval framework to out-promptfoo promptfoo. The harness runner is a weekend of OSS code and is operationally hostile on-device (below). Ship the three things an app provably cannot build, and let the runner be thin glue:

1. **A per-response usage object** on `GenerateContentResponse` — input, output, and cached token counts — because the Nano tokenizer is internal to AICore and an app cannot reproduce it. This mirrors Apple's `.usage`. One-line read; platform-only to provide.
2. **Version-stable behavior signalling.** Expose `getBaseModelName()` + a model-version/variant identifier (Fast vs Full behave differently) and a changelog event, so a test suite can bucket results per Nano version and assert "no regression within version, re-baseline on version change." This is the piece only the platform — which schedules the model updates — can offer.
3. **An output-stability contract + optional pinning/advance-notice**, the Type E core: a committed signal before AICore rolls a model that changes behavior, and (DMA-aligned) a window to re-validate. A stability contract you break is worse than none, so the contract is the product.

On top, a thin `genai-testing` artifact: a `GoldenSet` loader, deterministic metric functions (length, JSON-schema, forbidden-token, language-ID, ROUGE-style semantic diff), seed+`temperature=0` as a best-effort stabilizer, and results keyed to the version identifier. **LLM-as-judge is demoted to a weak, calibrated signal, not the default**: small on-device judges don't reliably align with humans ("only the best and largest models achieve reasonable alignment," [arXiv 2406.12624](https://arxiv.org/abs/2406.12624) `[snippet-only]`), and Google's own Summarization pipeline blends "LLM raters, statistical metrics and human raters" rather than trusting a small judge alone.

**Time-to-first-hello-world:** the usage object hits 15 minutes (read a field). The regression suite does **not** — and that is a finding, not a footnote. There is no official Nano emulator ([open, unanswered Google dev-forum thread] `[snippet-only]`), inference is foreground-only (`BACKGROUND_USE_BLOCKED`), rate-limited (`ErrorCode.BUSY`) and battery-quota-limited (`PER_APP_BATTERY_USE_QUOTA_EXCEEDED`), and the model downloads on demand (first run needs network). So the suite must run as on-device instrumented tests on real/farmed devices, foreground, chunked under quota with exponential backoff, with warmup handled. The design constraint: ship the usage + version APIs first (trivial integration), the runner second (device-farm-shaped).

---

## Reach & sizing

Arithmetic, with every input labeled (full method in the skill's sizing recipe; numbers are AppBrain-derived via snippet since the pages wouldn't fetch this run):

- `m_install` (install multiplier): **~11×**, using TensorFlow Lite as the on-device analogue — AppBrain 0.95% of apps / 11.19% of installs → 11.8× `[third-party, snippet]`. GenAI adopters skew to large apps, so install-weighting helps.
- `c_ceiling` (3-yr adoption): on-device ML SDKs sit near **1–2% of all apps** (TF Lite ~0.95%); a quality tool that rides on an existing SDK attaches at Crashlytics-style rates (~10–30% of its base). Stacked: eval-tool ceiling ≈ **0.05–0.3% of apps**.
- `r_reach` (device eligibility): Gemini Nano = **140M+ devices** (Google, April 2026) ÷ ~3.8B Android actives (third-party) → **~3.7%**, my arithmetic. For a *build-time* tool, reach is gated by apps shipping GenAI features, not end-user devices — but the Prompt API is alpha and "performs best on Pixel 10," so today's production base is effectively a developer-preview cohort.

**Result:** addressable apps at a 3-year optimistic ceiling ≈ **1,000–5,500 apps**; install-weighted reach ≈ **0.5–3% of the Android surface**. **Sensitivity:** halve `c_ceiling` and halve the attach rate and the base falls under ~800 apps — the verdict (Prototype, not Build) does not flip, because it was never resting on reach. The honest reading: this is thin today and its size is a bet on on-device GenAI adoption growing, which the DMA mandate and Nano 4 push but have not yet delivered. **Cross-check against revealed demand:** bottom-up says "small," revealed demand says "131 cloud harnesses, 2 empty on-device ones" — both agree the on-device market is latent. Trust that.

---

## Adoption path

1. **The hook:** the per-response usage object. A developer adds one field read, sees input/output/cached tokens, and gets something Apple users already have. Fifteen minutes, no new permission.
2. **First real integration:** a `GoldenSet` of 30–50 prompts run as an instrumented test in their existing device-farm CI, bucketed by `getBaseModelName()`, replacing the manual per-version spot-check Google's docs currently prescribe.
3. **The dependency:** once their release gate asserts "no regression against the pinned version baseline," they cannot remove it without going back to flying blind on every AICore update — a dependency they'd endorse, because it's the thing that let them ship on-device at all.

**First adopter:** an accessibility or summarization app already live on ML Kit GenAI (e.g. the Envision-class use of ML Kit summarization for low-vision users cited in the atlas) — small enough to move, exposed enough to care about drift. Second wave arrives when the DMA mandate forces third-party model support and "which version is running" becomes everyone's problem.

---

## Execution plan

- **Developer preview:** ship the usage object + `getBaseModelName()` + version-change event. Question it answers: *do developers actually gate releases on this once they can?* Partners: 3–5 current GenAI integrators. Evidence collected: the missing S1 datapoint — on-device-specific demand, which is today only latent.
- **Alpha/Beta:** add the `genai-testing` runner + metric functions. Graduation condition (checkable): ≥10 preview partners running the suite in CI and at least one catching a real cross-version regression before release.
- **GA:** commit the output-stability contract and a versioning policy for the usage/metric surface independent of the Nano model version. The contract is the durable surface; everything else can evolve.

**Org dependencies, honestly:** this needs the **AICore team** to expose the usage object and version signalling (ML Kit cannot surface what AICore doesn't emit) and to commit to the stability/advance-notice contract. If AICore says no, ML Kit can still ship the golden-dataset runner — but that half is the commoditizable half, and shipping only it would be competing with promptfoo while ceding the defensible ground. That dependency is the single biggest execution risk.

---

## The case against

The strongest case is **G1, undifferentiated against a free substitute** — argued at full strength: the thing developers most visibly want is the eval *runner*, and 131 OSS repos plus five VC-backed vendors already build it. A platform runner would be a permanent maintenance liability shipping slower than free software, and the atlas's failure-mode #7 (narrow API captures a sliver against a good free option) applies squarely to the harness. If the team hears "eval tool" and ships a runner, this is a feature, not a platform API, and it dies in eighteen months.

The rebuttal is the whole thesis of the Proposed Surface: the privilege isn't in the runner, it's in the three things the runner *consumes* — the usage object, per-version signalling, and the stability contract — none of which an app or an OSS project can build, because they require the entity that controls the model updates. Ship those and the free substitutes become clients of your platform surface rather than competitors to it.

Two live secondary risks. **Apple-shaped (competitive):** Apple shipping first means Google is validating a proven category, not pioneering — lower risk of being wrong, but also no first-mover credit, and a skeptic will ask why Google is a year behind. **The platform absorbs it (your own roadmap):** if AICore simply bakes drift-safety in silently, the developer-facing tool is redundant — but a silent fix doesn't give a developer a release gate, so the tool survives even then. The risk that does *not* apply: "API outran the hardware." A build-time tool isn't end-user-device-gated.

---

## Kill criteria

**Single observation that would reverse this:** if the developer-preview (usage object + version signalling) ships to ≥5 GenAI integrators and **fewer than one** gates a release on it within two quarters, the on-device demand is confirmed latent-not-real, and this drops to shelve. Checkable, dated, and aimed at the exact uncertainty (S1 on-device-specific).

**Load-bearing assumption:** that AICore will expose a per-response usage object and commit to version signalling. Everything defensible rests on it; without it, only the commodity half is buildable.

**Re-check trigger if shelved:** on-device GenAI adoption crossing ~10% of install-weighted surface, or the DMA Article 6(7) implementation (by 2027-08-01) mandating third-party model support on the managed path — either turns "which version is running" from a niche into a contract.

---

## Fit for this team

ML Kit, not MediaPipe/LiteRT/Firebase, is the right owner **only for the developer-facing runner and the testing artifact**, because ML Kit owns the Prompt API surface developers already call. But the load-bearing pieces — the usage object, `getBaseModelName()`/version signalling, and the stability contract — belong to **AICore**, which schedules the model updates. The honest conclusion is a split: ML Kit ships the `genai-testing` surface and the developer story; AICore must ship the metering and the contract underneath. If AICore won't commit, the better conclusion is "not yet," because ML Kit shipping the runner alone fragments the story further and competes with free software on the undifferentiated half. That split is the most important sentence in this report.

---

## Open questions

- **Does the ML Kit Prompt API already return any per-response usage object?** The package reference surfaced `CountTokensResponse` (input-side) via snippet, but the response-level reference pages wouldn't fetch. Settle by reading `GenerateContentResponse` on the live docs once `developers.google.com` is allowlisted.
- **Did a July-2026 ML Kit release note really add "Nano v4 compatibility bug fixes"?** The snapshot claims it; this run couldn't surface any 2026 ML Kit release-notes entry. Settle against the live release-notes page.
- **Is the ~12 GB RAM floor for Nano 4 real?** Every source is third-party press; no Google figure found. It bounds how fast the device base (and thus the addressable app base) grows.
- **Are ML Kit and MediaPipe/AI Edge converging or diverging organizationally?** Unresolved, and it decides whether this surface is stable enough to depend on — a direct input to the Durability gate.

---

## Runners-up

- **On-device neural TTS developer API (Type A)** — strong whitespace (Picovoice Orca sells into it; Apple added speech generation), but a well-known gap a skeptic already expects, and OSS TTS (Piper-class) weakens Platform Privilege. Held for a run where the privilege angle (voice identity, safety) can be made sharp.
- **On-device user-content moderation classifier (Type G)** — strong regulatory clock (minors laws live since Jan 2026, Play output-liability policy) and high privilege, but risks dying on contact with each app's proprietary policy surface unless tunability is designed first. A close second; deferred to give the tunability question its own treatment.
- **On-device embeddings API for semantic search/RAG (Type A/B)** — real demand, but EmbeddingGemma + MediaPipe text-embedding already fill much of it, so it leans Type B extension; lost on a softer gap.
- **Model availability/download state machine + delivery SLO (Type E)** — the most-voiced ML Kit issue-tracker pain (#1063 class), overlaps this idea's lifecycle half; folded in rather than run separately.
- **Graceful-degradation tiering for the 96% without Nano (Type F)** — the biggest strategic prize (the 26× reach gap), but Feasibility Headroom is the whole game and a crisp, honest tiering proposal needs per-tier quality numbers this run couldn't source. Parked with that as the named re-trigger.
- **Speaker diarization / speaker ID (Type A)** — clean whitespace (Picovoice Falcon/Eagle), but narrower install-weighted reach; lower priority.

---

*Sources: [ML Kit Evaluate-a-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit Prompt get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started) · [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Prompt API package reference](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/package-summary) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [MediaPipe / AI Edge](https://ai.google.dev/edge) · [Firebase AI Logic hybrid on-device](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference) · [Vertex AI Gen AI evaluation](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) · [Apple Evaluations framework](https://developer.apple.com/documentation/evaluations) · [Apple evaluating-prompts article](https://developer.apple.com/documentation/foundationmodels/evaluating-prompts-to-measure-performance-and-improve-model-responses) · [Apple managing the context window](https://developer.apple.com/documentation/foundationmodels/managing-the-context-window) · [Apple Foundation Models updates](https://developer.apple.com/documentation/updates/foundationmodels) · [Qualcomm AI Hub how-it-works](https://app.aihub.qualcomm.com/docs/hub/howitworks.html) · [Android Developers Blog: Nano v3 / ML Kit GenAI](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · ["Less Is More" on-device SLM case study, arXiv 2604.24636](https://arxiv.org/abs/2604.24636) · [LLMs in Mobile Apps, arXiv 2502.15908](https://arxiv.org/abs/2502.15908) · [Rethinking Regression Testing for Evolving LLM APIs, arXiv 2311.11123](https://arxiv.org/abs/2311.11123) · [Judging the Judges, arXiv 2406.12624](https://arxiv.org/abs/2406.12624) · [promptfoo](https://github.com/promptfoo/promptfoo) · [googlesamples/mlkit issue #1063](https://github.com/googlesamples/mlkit/issues/1063) · [Venkatakrishnan, on-device AI lessons (dev.to)](https://dev.to/mohanvenkatakrishnan/experiments-with-on-device-ai-what-building-on-gemini-nano-actually-teaches-you-5deo) · [Tian Pan, on-device model update propagation](https://tianpan.co/blog/2026/04/19/on-device-llm-inference-model-update-propagation) · [EU DMA Alphabet interoperability proceedings](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)*
