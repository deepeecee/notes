# On-device GenAI Evaluation & Output-Stability Toolkit — catch the regression Nano hands you when it updates itself

**Type:** D (Tooling) + E (Delivery/lifecycle) · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (promising, reach-gated)**
*2026-10-12 · Prepared for Android ML Kit · Evidence current as of 2026-10-12*

> A developer ships a summarize button backed by the ML Kit Prompt API. It works on their Pixel 10. Three weeks later AICore quietly updates Gemini Nano from v3 to v4 on a slice of users, and the button starts truncating mid-word and emitting a nonsensical mix of languages — exactly the open bug reports sitting on Google's own on-device sample repo today. The developer finds out from a one-star review, because there is no harness, no golden-set gate, and no token/usage readout in the ML Kit path to catch it. Apple shipped all three at WWDC26. ML Kit ships a prose page that tells you to build it yourself or go to the cloud.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — promising, reach-gated | composite 3.2 → ×2 = 6.4, no gate at exactly 3, S1 not a 5 → 6 |
| Platform privilege (gate) | 4/5 — pass | Only the platform sees AICore's installed Nano version and can surface usage telemetry/drift signals; host-side golden-diff is borrowable, so not a 5 ([AICore](https://developer.android.com/ai/aicore)) |
| Feasibility headroom (gate) | 4/5 — pass | `countTokens`/`getTokenLimit` already ship; quota/error model documented; CI-time design is buildable now ([GenerativeModel ref](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)) |
| Durability (gate) | 4/5 — pass | Eval tooling is easy to version and hold for 5 years; the output-stability *contract* component is the part that carries real risk |
| Demand evidence (25%) | 3/5 | Job massively validated in cloud (promptfoo 26k★, deepeval 19k★, paid LangSmith/Braintrust); on-device slice is latent — symptom bug reports, one 10-download Flutter package |
| Install-weighted reach (15%) | 2.5/5 | ~3.7% Nano device gate × near-zero measurable GenAI-adopter install share today; rises to moderate (~3.5) in 3 years. **The binding weakness.** |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The "borrow" path fails: every cloud eval tool evaluates an HTTP endpoint, and on-device inference never touches the network |
| Integration cost / TTFHW (15%) | 3/5 | Runtime telemetry can be one wrapper; a real golden-set regression gate requires the developer to author a dataset — an afternoon, not 15 minutes |
| Substitute half-life (15%) | 3/5 | Tied to AICore internals an OSS tool can't reach, so ~2–3 years; the live risk is Google itself absorbing it |
| Strategic complement (10%) | 4/5 | Free eval de-risks adoption of the *entire* GenAI API portfolio — "a capability you can't measure is one developers are afraid to change" |
| **Composite** | **3.2** | weighted mean of S1–S6 |

*Least trustworthy row: install-weighted reach. AppBrain and apilevels.com were both unreachable this run, so the adoption ceiling and the ~3.7% device figure rest on third-party estimates and one Google-attributed count I could not re-confirm from source. Treat the sizing as directional.*

---

## The problem

The job, stated as a developer's: *"I shipped an AI feature on top of a model I don't control and can't pin, and I have no way to know when it gets worse."* The customer is an Android engineer, not an ML engineer — their ML people are server-side — and the competing solution is a manual spreadsheet of inputs and expected outputs, rated by hand.

This problem is structural, not a bug. Three constraints of the ML Kit GenAI path produce it directly. First, **the app cannot pin the model.** AICore "manages the distribution of Gemini Nano and handles future updates… you don't need to worry about downloading or updating" ([AICore docs](https://developer.android.com/ai/aicore)) — which means the model silently moves from nano-v2 → nano-v3 → nano-v4 underneath a shipped app, and there is no version-pin or version-query-then-lock API. Second, **different Nano versions produce different output.** Google itself acknowledges this obliquely: for its *pre-built* APIs (Summarization, Rewriting, Proofreading) it retrains feature-specific LoRA adapters and runs per-language evals "so each API meets its quality bar regardless of which Gemini Nano version runs on a device" ([Android Developers Blog, Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)). The raw **Prompt API**, where the developer writes their own prompt, gets none of that adapter protection — the drift lands directly on them. Third, **there is no determinism contract**: temperature/topK knobs exist but there is no `seed` and no published guarantee, and tuning them to zero reduces variance only *within* a fixed model, not across a swap.

Status-quo workaround today: nothing, or a hand-built spreadsheet. The ML Kit "Evaluate prompt quality" guide literally instructs developers to assemble a dataset of inputs and expected outputs, "run that dataset against each Gemini Nano version," score it "manually or with LLM-as-a-judge," and iterate 3–5 rounds — then points to **cloud Vertex AI** for anything at scale ([evaluate-prompt guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)). Prescribing the workflow and shipping nothing to execute it is the sharpest possible statement of the gap.

Named archetypes that feel this: note-taking and productivity apps using Summarization/Prompt, communication apps and keyboards using Rewriting, reader/email clients using summarization, education apps generating quizzes. These map 1:1 onto the shipped GenAI API set — the same apps that adopt the capability inherit the drift problem.

---

## Proof & signals

- **Developers doing it by hand, and the job validated at scale:** the cloud LLM-eval category is enormous — [promptfoo](https://github.com/promptfoo/promptfoo) (25,933★, pushed today), [deepeval](https://github.com/confident-ai/deepeval) (18,768★, pushed today), [ragas](https://github.com/vibrantlabsai/ragas) (~16k★). *Evidence status: GitHub-published, real traction.* Every one of them evaluates an HTTP endpoint. A GitHub search for "on-device LLM evaluation mobile" returned **zero** repos; of 146 Android on-device-LLM repos, zero do output eval — all are chat clients. *The asymmetry — crowded paid cloud market, empty mobile shelf — is the single strongest finding in this report.*
- **Someone charging money for it:** LangSmith (~$39/seat/mo + trace overage), Braintrust (Pro $249/mo), Humanloop (enterprise). *Third-party pricing pages, 2026.* Willingness to pay for the job is established; none sell an on-device SKU.
- **The one direct re-implementation:** [`vouch`](https://pub.dev/packages/vouch) (Flutter, v0.1.0, ~10 downloads, 0 likes) — "freeze a baseline eval suite, diff every model swap against it, gate CI." Its own framing names the exact pain: the model "changes under you: a new version, a new quantization, an OS update that swaps the system model… nothing fails loudly," and cloud tools don't fit because "they evaluate HTTP endpoints, and your inference never touches the network." *Zero traction, but it proves someone hit the wall and built precisely this.*
- **Community voice — symptom reports, dated, open:** on Google's own `google-ai-edge/gallery` repo: [#817](https://github.com/google-ai-edge/gallery/issues/817) (2026-05) "a model always generates identical results given the same prompt" regardless of temperature/top_k/top_p; [#437](https://github.com/google-ai-edge/gallery/issues/437) (2026-02) GPU mode returns only "!" to every prompt; #614 responses cut off mid-word; #562 structured JSON intermittently un-parseable. On `googlesamples/mlkit`, [#1061](https://github.com/googlesamples/mlkit/issues/1061): a beta3 update "switched the requested AICore feature from 636 to 648" and `checkStatus()` began throwing on Pixel 10 where earlier betas worked. *The substrate demonstrably shifts under apps across refreshes.*
- **The absence signal:** no Meta/Grammarly/Snap/Duolingo engineering post on testing on-device LLM output surfaced. The only party publicly doing rigorous Nano eval is **Google internally**, and it isn't exposed. Present-tense, vocal developer demand is **latent, not loud** — which is consistent with on-device GenAI being ~1 year into GA on a small installed base, not with the problem being unreal.

---

## Why now

1. **Capability shift:** the raw Prompt API graduated to Beta (Jan 2026) and added Structured Output, System Instructions, Thinking Mode and multi-image input (Jul 2026) — developers are now writing *their own* prompts against Nano, so for the first time the drift problem is theirs, not Google's adapters' ([release notes](https://developers.google.com/ml-kit/release-notes)). And nano-v4 is now live, with a documented compatibility fix shipped 2026-07-21 and a known prefix-caching failure on v4 ([known issues](https://developers.google.com/ml-kit/known-issues)) — the v2→v3→v4 churn is no longer hypothetical.
2. **Competitive shift:** at WWDC26 (Jun 2026) Apple shipped, on its on-device Foundation Models path, (a) an **Evaluations Swift framework** — "measures the quality of your intelligence features… quantify accuracy as you tweak your prompts"; (b) **token counting** — `model.tokenCount(for:)` and `model.contextSize`; (c) a **usage property** exposing input, output, cached, and reasoning token counts per response ([WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241), [Evaluating prompts doc](https://developer.apple.com/documentation/foundationmodels/evaluating-prompts-to-measure-performance-and-improve-model-responses)). Apple's own doc has a "Prevent regressions" section describing output that varies "from updates to the underlying model that you don't control." This is the clearest "Apple already shipped this" in the current landscape.
3. **Demand shift:** the cloud LLM-eval market crossed from niche to standard practice in 2025–26 (promptfoo/deepeval tens of thousands of stars); developers now *expect* an eval story, and arrive at the on-device path to find none.

A genuine three-part why-now. The competitive leg is the strongest and the most time-critical.

---

## The capability gap

What exists across the stack, with the page checked:

- **ML Kit GenAI:** input token counting **does** ship — `countTokens(...)` and `getTokenLimit` on the Prompt API `GenerativeModel` ([Kotlin reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)), counting *input request tokens only*. What's missing: no output/usage field on `GenerateContentResponse` (no equivalent of Apple's `usage.output.totalTokenCount` / `.cachedTokenCount` / `.reasoningTokenCount`); no eval harness (only the prose guide above); no output-stability or version contract. *This corrects an earlier belief that no token API exists at all — input counting does; output/usage accounting and eval do not.*
- **AI Edge Portal:** benchmarks "initialization time, inference latency, and memory usage" to catch *performance* regressions — explicitly **not** output quality; private preview; and it runs **LiteRT-LM** models you supply, not the AICore/Nano path ([AI Edge Portal](https://developers.google.com/edge/ai-edge-portal), [launch blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **Vertex AI Gen AI evaluation / Prompt Optimizer:** cloud. The optimizer has a `gemini_nano` mode, but it runs server-side on Gemini Pro/Flash — it tunes prompts *for* Nano, it does not evaluate on-device Nano output ([Vertex eval overview](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)).
- **Firebase AI Logic:** console tracks token usage for **cloud** Gemini calls; its on-device path is Chrome/Web, not Android Nano-via-AICore.
- **Qualcomm AI Hub Workbench:** does on-device numerical-correctness checks (local reference vs device run) — but for vision/audio/quantized models on the QNN stack, not LLM prompt-regression on AICore ([AI Hub docs](https://app.aihub.qualcomm.com/docs/hub/getting_started.html)).

**The main competitor a developer uses today** is not another platform — it's a hand-rolled spreadsheet plus the ML Kit prose guide, with cloud Vertex AI as the escape hatch. For teams on LiteRT-LM/MediaPipe rather than AICore, it's host-side promptfoo bent awkwardly around a local endpoint.

---

## Proposed surface

A two-part toolkit, because the feasibility work shows the eval judge cannot run at device-runtime (foreground-only execution plus per-app inference and daily battery quotas make a background judge pass return `BACKGROUND_USE_BLOCKED` / `BUSY` / `PER_APP_BATTERY_USE_QUOTA_EXCEEDED` — [error codes](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode)).

**Part 1 — CI/build-time regression harness (Type D).** A Gradle/JUnit-integrated runner that executes a developer's golden dataset against the on-device Prompt API on a connected device or a device farm, scores outputs (rule-based, ground-truth, semantic-similarity, or model-as-judge run in CI on a desktop/cloud model — *not* Nano), and **gates the build on regression against a baseline keyed to `(device, Nano version)`**. Because the app can't pin the version, baselines are version-keyed and auto-flag "this baseline was captured on nano-v3; the farm device now reports nano-v4 — re-baseline required."

```kotlin
// build-time, in androidTest
val suite = MlKitEvalSuite.load("golden/summarize.jsonl")
val report = suite.runAgainst(promptModel, judge = Judge.semantic(threshold = 0.85))
report.assertNoRegressionVs(baseline = "summarize@nano-v3")   // fails CI on drift
```

**Part 2 — runtime usage & drift telemetry (Type E).** A thin wrapper surfacing, per call, the installed Nano version, input tokens (`countTokens`), output length/latency, and error-quota events — plus a callback that fires when the installed model version changes under a shipped app. This is the piece only the platform can build, and it closes the output-usage gap versus Apple by at minimum reporting output token count alongside the already-exposed input count.

What it deliberately does **not** do: it does not promise bit-identical output across versions (impossible without a pin API), does not run a judge on-device, and does not ship opinionated quality thresholds — the developer owns the golden set and the bar.

**TTFHW target:** 15 minutes to "token counts, latency, and Nano version in logcat" via the runtime wrapper (one dependency, no new permission). The CI regression gate is honestly an afternoon, because the developer must author a golden dataset — that authoring cost is inherent to the job, not a design miss, and the harness should ship with starter datasets for the pre-built API shapes to blunt it.

---

## Reach & sizing

All arithmetic is mine; inputs labeled by source. AppBrain and apilevels.com were unreachable this run, so ceilings rest on stated planning assumptions and third-party reads.

- **Device gate:** ~140M Nano devices (Google-attributed, Apr 2026; *not re-confirmed from source this run*) ÷ ~3.8B Android actives (third-party) ≈ **3.7%**, perhaps 3.7–5.3% by now with Pixel 11 / Galaxy Fold8 launches (my arithmetic).
- **OS floor is a non-constraint:** API 26+ ≈ ~97% (third-party), API 31+ ≈ ~69% (third-party, Dec 2025). The binding gate is flagship Nano hardware, not minSdk.
- **Adopter install share today:** no adoption count exists (Google publishes no Maven stats; Play SDK Index doesn't render). Ceiling-based estimate: low-dozens-to-low-hundreds of apps shipping on-device LLMs, ≈ **0.1–0.5%** install-weighted (my estimate).
- **Addressable reach today:** well under 1% of the install-weighted surface — **small, as expected.** Three-year: if the on-device-LLM-capable base reaches ~25–40% of devices and install-weighted adoption rises to ~5–15%, reach becomes **moderate**.
- **Engineering cost avoided (the platform-test numerator):** ~0.5–2 engineer-years per serious adopter to build version-keyed golden-set regression + drift telemetry badly (my estimate, bottom-up from the fact that the borrow path doesn't transfer). Today: ~50–200 adopters → ~$7.5M–$120M pool; three-year: ~2k–10k adopters → ~$0.3B–$6B pool (order-of-magnitude only).

**Sensitivity:** halve both adopter share and the device gate and today's reach rounds to zero — this does not clear the platform test *today* on reach alone. The verdict therefore rests on per-app depth (the borrow path genuinely failing) and the strategic-complement effect, not on breadth. That is exactly why the honest verdict is *prototype to collect demand evidence*, not *build the platform*.

---

## Adoption path

1. **The hook:** the 15-minute runtime wrapper — a developer drops in one dependency and finally sees token counts, latency, and *which Nano version* served each call in logcat. Zero dataset authoring required; immediate "oh, that's why my p99 moved" value.
2. **First real integration:** the CI regression gate on a golden set, replacing the hand-rolled spreadsheet. What they ship to production is a build that fails when nano-v4 degrades their summaries before users see it.
3. **The dependency:** once a team's release process gates on this, removing it means flying blind through every AICore update — a cost they'd endorse, not resent, because the model keeps moving under them and they know it.

**First adopters:** the productivity/note-taking and keyboard apps already on the Prompt API — small in number, high in sophistication, and the ones filing the gallery bug reports. **Second wave** unlocks when a visible reference app (a Google sample, ideally) publishes "how we gate Nano releases," turning a latent practice into an expected one. If you can't name a first adopter, the funnel doesn't start; here the first adopters are literally the authors of issues #817 and #1061.

---

## Execution plan

- **Developer preview:** ship Part 1 (runtime telemetry wrapper) first and instrument it — *the question it answers is S1: do GenAI adopters actually turn on version/usage telemetry, and does drift fire in the wild?* Partners: 3–5 current Prompt API integrators. This is the cheapest way to convert latent demand into measured demand before committing to the harder harness.
- **Alpha/Beta:** CI regression harness with version-keyed baselines. **Graduation condition:** preview telemetry shows version-change-driven output drift firing for a non-trivial fraction of adopters — i.e. the problem is real at the population level, not just in bug reports.
- **GA:** commit the surface and the versioning contract. The output-stability *contract* (Type E promise that the platform signals drift and holds a telemetry schema across model refreshes) is the piece to hold, and the piece to be most careful about committing to.

**Org dependencies, honestly:** the harness needs the **AICore team** to expose the installed Nano version and ideally an output-token/usage field — without that, Part 2 degrades to input-counting plus inference. It also overlaps the **AI Edge Portal / AI Edge** team, who own device-farm benchmarking (perf, not quality); whether eval-at-scale belongs in ML Kit or in AI Edge Portal is a real org question, not a formality (see *Fit*). If AICore says no to version exposure, the idea shrinks to a CI harness anyone could approximate — a materially weaker proposition.

---

## The case against

The strongest case against is **reach, argued at full strength**: this is a tool for people who adopted a capability that ~96% of Android can't run, and measurable adoption today is a rounding error. A platform should not spend a five-year maintenance commitment on a tool whose entire addressable market fits in a few hundred apps, especially when the demand is latent — nobody is loudly asking for it, and "build it and they will adopt the GenAI APIs" is the kind of reasoning that produces shelfware. Of the rubric's failure modes, the live one is **#1, the API outran the hardware**: the eval tool is gated behind the same tiny device population as the thing it evaluates.

The honest rebuttal is not that reach is fine — it isn't — but that this is a *complement* play, not a standalone-reach play: eval is the thing that lets a cautious team trust the GenAI APIs enough to ship at all, so its value shows up as adoption of the rest of the portfolio, and that portfolio's reach grows every hardware cycle. That is a real argument, but it is a bet on a second-order effect, which is why the verdict is prototype-and-measure rather than build.

Second-strongest: **failure mode #2, the platform absorbs it.** Google could simply extend adapter protection to more surfaces so developers rarely touch the raw Prompt API — in which case drift stops being their problem. But the Prompt API's whole point is developer-authored prompts, which can't be adapter-protected, so this absorption is partial at best.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if the developer-preview telemetry (Part 1) shows that fewer than ~10% of instrumented adopters ever experience a version-driven output change that crosses their own quality bar within a 6-month window, the drift problem isn't real at population scale and the harness is solving a bug-report, not a job — shelve it.

**Load-bearing assumption:** that Nano version swaps produce developer-visible output regressions on the *raw Prompt API* often enough to matter. Everything rests on this; it is evidenced by Google's own adapter-retraining practice and the gallery bug reports, but not yet quantified at population scale — which is exactly what the preview is for.

**Re-check trigger if shelved:** on-device-LLM-capable devices crossing ~20–25% of the fleet, or Apple's Evaluations framework visibly driving iOS on-device-AI adoption that Android then needs to match.

---

## Fit for this team

ML Kit is the right owner **only if the idea is framed as the eval-and-telemetry layer for the ML Kit GenAI APIs specifically** — it owns the Prompt API surface developers depend on, and the runtime telemetry (Part 2) is inseparable from that surface. But the CI device-farm execution (Part 1 at scale) arguably belongs with **AI Edge Portal**, which already runs a device fleet and measures regressions — just performance ones. The genuine risk here is the ecosystem's chronic one: this capability landing split across ML Kit and AI Edge and fragmenting the developer story further. The cleanest answer is ML Kit owns the developer-facing API and golden-set semantics; AI Edge Portal provides the device-farm execution substrate underneath. If the org can't commit to that division, a weaker single-team version is better than a turf-split one.

---

## Open questions

- **Does ML Kit expose the installed Nano version to the app at all today?** Not found in docs this run; `checkFeatureStatus()` exists but a version string is unconfirmed. Settle by reading the full `GenerativeModel`/`ModelConfig` reference in a browser. *This is the load-bearing feasibility unknown for Part 2.*
- **Is there any newer release-notes entry than 2026-07-21?** developers.google.com was DNS-blocked this run; the snapshot may be ~1 cycle stale. Settle by loading the live release-notes page.
- **Real GenAI-adopter counts and AppBrain install-weighting.** Unavailable here; a human re-pull of AppBrain and apilevels.com would firm up every sizing number.
- **Does the ML Kit `GenerateContentResponse` have any undocumented usage field?** If output tokens are already retrievable, Part 2's headline gap shrinks.

---

## Runners-up

- **On-device user-content moderation classifier (Type G).** Strong platform privilege and a real EU DSA/DMA regulatory clock; lost because safety is each app's proprietary policy surface, so a one-size classifier risks being unusable without heavy tunability work — a bigger, slower build than the eval toolkit, and a separate research run deserves it.
- **GenAI "for the 96%" — reach/tiering (Type F).** Biggest install-weighted reach of any candidate, but **Firebase AI Logic hybrid inference** (`PREFER_ON_DEVICE`/`ONLY_ON_DEVICE` etc.) is partial prior art, and the honest small-model sub-8GB path is a hard feasibility story — weakens the clean-whitespace claim.
- **On-device neural TTS as a modern API (Type A).** Genuine whitespace (Android's `TextToSpeech` is a decade-old parametric API), but Apple and Picovoice (Orca) are already ahead, and it's a model-delivery problem, not a quarter's work — fails the "could ship fast" test the eval toolkit passes.
- **On-device embeddings/RAG as a first-class ML Kit API (Type A/B).** Lost to prior art: MediaPipe already ships a Text Embedder and EmbeddingGemma exists — it's a packaging/DX problem, not absent capability.

---

*Sources: [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit "Evaluate prompt quality" guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [Prompt API (Android)](https://developers.google.com/ml-kit/genai/prompt/android) · [GenerativeModel Kotlin reference — countTokens/getTokenLimit](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel) · [GenAiException.ErrorCode](https://developers.google.com/android/reference/com/google/mlkit/genai/common/GenAiException.ErrorCode) · [ML Kit known issues](https://developers.google.com/ml-kit/known-issues) · [AICore docs](https://developer.android.com/ai/aicore) · [Prompt API launch blog](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) · [Latest Gemini Nano with ML Kit GenAI (Aug 2025)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · [Apple WWDC26 session 241 — What's new in Foundation Models](https://developer.apple.com/videos/play/wwdc2026/241) · [Apple — Evaluating prompts](https://developer.apple.com/documentation/foundationmodels/evaluating-prompts-to-measure-performance-and-improve-model-responses) · [AI Edge Portal](https://developers.google.com/edge/ai-edge-portal) · [AI Edge Portal launch blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal) · [Vertex AI Gen AI evaluation](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview) · [Qualcomm AI Hub docs](https://app.aihub.qualcomm.com/docs/hub/getting_started.html) · [promptfoo](https://github.com/promptfoo/promptfoo) · [deepeval](https://github.com/confident-ai/deepeval) · [ragas](https://github.com/vibrantlabsai/ragas) · [vouch (pub.dev)](https://pub.dev/packages/vouch) · [gallery issue #817](https://github.com/google-ai-edge/gallery/issues/817) · [gallery issue #437](https://github.com/google-ai-edge/gallery/issues/437) · [mlkit issue #1061](https://github.com/googlesamples/mlkit/issues/1061) · [nano-4 benchmarks (Android Authority)](https://www.androidauthority.com/gemini-nano-4-benchmarks-3655763/) · ["(Why) Is My Prompt Getting Worse?" arXiv 2311.11123](https://arxiv.org/abs/2311.11123)*
