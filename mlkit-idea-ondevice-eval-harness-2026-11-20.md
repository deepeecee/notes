# On-device GenAI Eval Harness + Usage Accounting — give ML Kit developers a way to know their Nano feature didn't silently get worse

**Type:** D (Tooling), with a Type-B extension core · **Verdict:** Prototype (developer-preview) · **Opportunity: 5/10 (Early)**
*2026-11-20 · Prepared for Android ML Kit · Evidence current as of 2026-11-20*

> *Badges: Apple already shipped this · Regulatory clock (DMA, Aug 2027) · First-party absorption risk*

> A developer at Kakao Mobility shipped an on-device Gemini Nano feature this year and, to trust it, built their own harness that measured accuracy, precision, recall, and F1 against cloud Gemini — because nothing ships to do that. Another, debugging the Prompt API in October, was reduced to reading AICore's native logs and calling `model.countTokens(req)` by hand to see "e.g. 25 tokens." ML Kit's own answer is a prose page telling you to keep a spreadsheet and re-grade it "for each new Gemini Nano version." Apple shipped the tool for this in iOS 27. Google documents the manual loop and ships none of it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Early | composite 2.8 × 2 = 5.6, −1 for gates sitting at 3; honest "correct but not yet urgent" |
| Platform privilege (gate) | 3/5 — pass | The eval *loop* is commoditizable (promptfoo exists); privilege lives only in the usage object and a model-version/drift signal, which are AICore-only |
| Feasibility headroom (gate) | 3/5 — pass | Flagship-only (no mid-tier Nano), LLM-as-judge unproven, decode throughput unpublished |
| Durability (gate) | 3/5 — pass | Young beta surface; Google's own internal eval + LoRA drift-management could absorb it |
| Demand evidence (25%) | 3/5 | General eval demand strong (promptfoo 27.5k⭐, vendors $29–$249/mo); on-device expressed demand thin but real |
| Install-weighted reach (15%) | 2/5 | Capped at ~3.7% Nano fleet; near-term adopters number in the dozens |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Borrow path (promptfoo) doesn't run on-device at all; Kakao built its own, proving real cost |
| Integration cost / TTFHW (15%) | 3/5 | Needs a physical flagship, foreground, backoff — not a 15-min emulator win |
| Substitute half-life (15%) | 2/5 | Google's own Vertex APO + per-API LoRA adapters are the substitute, on Google's roadmap |
| Strategic complement (10%) | 4/5 | De-risks adoption of the entire on-device GenAI portfolio → AICore/Nano gravity |
| **Composite** | **2.80** | Prototype band begins at 3.0; lands here because the usage-accounting sub-component independently passes as a cheap Type-B extension |

*Least trustworthy score: S2 (reach). The near-term adopter count is unmeasured — no source puts shipped ML Kit GenAI apps above low hundreds — so the sizing is a reasoned floor, not a measurement.*

---

## The problem

A consumer Android team's GenAI loop is: *detect capability → call the model → render the output → ship with confidence.* The last step is where on-device breaks in a way cloud doesn't. A server team pins a model version and A/Bs prompts behind a flag. An on-device team hands inference to AICore, which **silently refreshes Gemini Nano underneath them** — nano-v2 → v3 → v4 — and ML Kit's own documentation tells them to re-run their evaluation set "for each new Gemini Nano version" ([evaluate-prompt guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt), dated 2026-04-03). It does not give them a tool to do so, or a signal that a refresh happened. The workaround is a spreadsheet of input / expected / actual, graded by eye, because — as developers put it on Hacker News — "most of the mistakes an LLM makes are subtle" ([item 41019748](https://news.ycombinator.com/item?id=41019748)).

This is structurally produced, not an accident of immature tooling. The app's ML people are server-side; its Android people aren't ML people, so building an eval methodology sits in nobody's lane. The model is managed by the platform, so the app can't pin it. Outputs are non-deterministic even at temperature 0, so exact-match unit tests don't fit ([item 43691671](https://news.ycombinator.com/item?id=43691671)). And on-device reliability is genuinely worse than cloud intuition suggests: a practitioner integrating a small model into the word game *Palabrita* found a 0.6B model violated a simple "give me a 5-letter word" constraint 30–50% of the time, and 10–15% even after hardening ([arXiv 2604.24636](https://arxiv.org/abs/2604.24636), v2 2026-05-06). None of these go away as the tooling matures — they are properties of shipping a platform-managed model into a brand-sensitive app.

The named app archetypes that feel this first are the ones already reaching for Nano: communication and productivity apps doing summarization and smart reply, news and reading apps describing images, and keyboard/writing apps proofreading and rewriting. Kakao Mobility is the one Google will name as building on the Prompt API ([alpha announcement](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html)), and the thing worth noticing is *what they had to build to do it*: their own in-house eval harness.

---

## Proof & signals

- **Developers doing it by hand (on-device, specific):** `googlesamples/mlkit` [issue #1078](https://github.com/googlesamples/mlkit/issues/1078) (2026-10-05) — a developer debugging Nano inference reads AICore native logs and calls `model.countTokens(req) // works, e.g. 25 tokens` by hand because there is no higher-level accounting. A separate practitioner wrote [a whole research doc](https://github.com/feich-ms/feich-docs/blob/main/mlkit-genai-256-token-limit-research.md) (2026-05-11) on the 256-token output cap and noted there was *no* Stack Overflow, Reddit, or GitHub corpus to learn from — figuring it out solo. *Evidence status: confirmed, GitHub fetched directly.*
- **Someone charging money for it (general):** Braintrust (~$249/mo), LangSmith (~$39/user/mo), Langfuse (~$29/mo), Arize — all metered LLM eval/observability. Willingness to pay for eval-as-a-product is proven. *Caveat: all are cloud/server-side; none run on-device. And Humanloop, a funded eval vendor, [shut down in Sept 2025](https://news.ycombinator.com/item?id=48637868) after the team joined Anthropic — the category is also churny.* Third-party pricing, directional.
- **Apps that shipped it themselves:** Kakao Mobility built an in-house harness measuring accuracy / precision / recall / F1 against cloud Gemini to validate their Nano feature (Android Developers Blog, Oct 2025). That is the exact artifact this proposal would commoditize.
- **OSS re-implementations (general):** promptfoo ([27.5k⭐](https://github.com/promptfoo/promptfoo)), openai/evals ([19.8k⭐](https://github.com/openai/evals)), deepeval ([19.6k⭐](https://github.com/confident-ai/deepeval)), ragas ([16.4k⭐](https://github.com/explodinggradients/ragas)). The signal cuts both ways: enormous general demand, and **zero of the big four target on-device or mobile** — every one assumes a server-side model behind an API. *Confirmed, fetched 2026-11-20.*
- **Community voice:** "[What tools are you using for AI evals? Everything feels half-baked](https://news.ycombinator.com/item?id=44194187)" — an OP who "struggled for months to build an evaluation pipeline" and now runs "custom scripts, dashboards, and weekly manual spreadsheet reviews" that "works but doesn't scale." *Search-engine paraphrase, not verbatim — HN was not directly fetchable this run.*
- **The absence signal:** no OSS repo, no vendor, and no forum thread targets on-device eval specifically. I read this as category immaturity, not settled "no need": the installed base of shipped on-device-LLM features is still tiny, and developers hitting friction currently cope by offloading to cloud or curating around the model rather than demanding a harness. *Reddit and Stack Overflow were blocked to the crawler this run, so on-device community silence is genuinely unverified, not confirmed absent.*

---

## Why now

1. **Capability shift.** On-device grading became plausible only recently. ML Kit shipped Structured Output (Kotlin `@Generable`) and Thinking Mode in 2026, and EmbeddingGemma (308M params, <200MB RAM quantized, <15ms inference on reference EdgeTPU — [Sep 2025](https://developers.googleblog.com/en/introducing-embeddinggemma/)) makes on-device semantic-similarity scoring cheap. Before these, an on-device judge had nothing to stand on.
2. **Competitive / regulatory shift.** Apple shipped the equivalent at WWDC26: usage/token accounting — including **cached and reasoning tokens** — went GA in iOS 26.4 (`response.usage`, `model.tokenCount(for:)`), and a dedicated **Evaluations framework** is new in iOS 27 beta ([session 241](https://developer.apple.com/videos/play/wwdc2026/241/)). Separately, the EU's July 2026 decision under DMA Article 6(7) requires Alphabet to expose system-level on-device AI models to third parties in Android 18 **by 1 August 2027** at equivalent performance — which turns a handful of Nano callers into a flood, every one of whom will need to measure what the exposed model does.
3. **Demand shift.** The Prompt API moved alpha (Oct 2025) → beta (Jan 2026), and Nano crossed [140M+ devices](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html) (Google, July 2026). The population that *could* need this is, for the first time, non-zero and growing.

The honest weakness: parts 1 and 2 are strong and dated; part 3 is thin. The expressed demand is adjacency plus Google's own documentation of the manual loop, not a loud on-device chorus. A thin why-now on the demand axis is the tell that this is **correct but not yet urgent**.

---

## The capability gap

- **ML Kit:** ships a prose eval guide and an **input-only** `countTokens` (a `CountTokensResponse` class used to enforce the <4000-token input cap). `GenerateContentResponse` is documented only as "a response from the model" — no evidence it carries any usage metadata. Checked: [get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started), [evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt).
- **AI Edge Portal:** benchmarks initialization time, prefill/decode speed, and peak RAM across 120+ devices — **no output-quality metric at all**, and it's in a paused private preview ([blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **Firebase AI Logic:** has `countTokens` and a `usageMetadata` object — but for **cloud** Gemini (and Chrome's built-in on-device path), not Android Nano ([ref](https://firebase.google.com/docs/ai-logic/count-tokens)).
- **Qualcomm / ONNX / OSS:** Qualcomm AI Hub and GenieX benchmark throughput only; promptfoo/deepeval/openai-evals/ragas are all cloud/CLI/CI and embed in no Android app.
- **Apple:** has shipped it — usage accounting (incl. cached + reasoning tokens) and an Evaluations framework. Note the shape difference: Apple's Evaluations runs **at dev time on a Mac**, not inside the app, while token/usage accounting is in-app and GA.

**The main competitor is not another platform — it is the developer's own spreadsheet**, plus, for anyone who wants automation, Google's *own* cloud path: Vertex AI "Automated Prompt Optimization," which can target on-device models like `gemma-3n-e4b-it`. The gap is precise: **nothing lets an Android app measure, on-device, whether its Nano output regressed across a model refresh, and nothing surfaces per-call usage from the response.**

---

## Proposed surface

Split the idea, because the two halves have very different cost and privilege:

**Core (Type-B extension, cheap, high-privilege, build now): a `usage` object on the response.** Mirror Apple and Firebase — add `response.usage` to the ML Kit Prompt API with input, output, cached-context, and (where Thinking Mode applies) reasoning token counts, read from AICore rather than reconstructed by a second `countTokens` pass. This is small, it is a clean Apple-parity story, and it is genuinely platform-only: a third party cannot surface cached/reasoning tokens AICore doesn't expose.

```kotlin
val response = model.generateContent(request)
response.usage.inputTokenCount      // from AICore, not a second tokenizer pass
response.usage.cachedTokenCount     // prefix cache hits — today you cannot see these
response.usage.outputTokenCount
response.usage.reasoningTokenCount   // when Thinking Mode is on
```

**Harness (Type-D, prototype as developer-preview): a dev-time evaluation runner.**

```kotlin
val suite = EvalSuite.fromAssets("eval/summarize.jsonl")   // input + expected pairs
val report = PromptEvaluator(model)
    .scoreWith(Scorer.embedding(EmbeddingGemma))            // semantic similarity
    .scoreWith(Scorer.rubric(model, Verdict::class))        // on-device LLM-as-judge, Structured Output
    .onModelVersionChange(RerunPolicy.FLAG)                 // detect Nano refresh, re-run, diff
    .run(suite)
// report.regressions: prompts whose score dropped since the last Nano version
```

It **deliberately does not** run in production or in background: AICore enforces foreground-only inference (`BACKGROUND_USE_BLOCKED`), throttles with `BUSY`, and caps a daily `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`, so the harness runs interactively on a physical device or a device farm (Firebase Test Lab), with backoff. It also does not promise a trustworthy LLM-judge verdict until a Nano quality number exists (see Open questions).

**TTFHW target:** the `usage` object is a one-liner — minutes. The harness realistically targets an afternoon, and it **cannot** hit a 15-minute emulator win, because Nano requires a supported flagship — which is itself a finding about who can adopt.

---

## Reach & sizing

The adopter base nests: **eval-tool adopters ⊂ on-device-GenAI shippers ⊂ Nano-eligible-device apps.** Each nesting is a hard narrowing.

- **Device ceiling:** 140M Nano devices (Google, July 2026) ÷ ~3.8B Android actives (third-party) → **~3.7% of the surface**, my arithmetic. minSdk 26 clears ~95% ([apilevels mirror](https://apilevels.com/), third-party) and is *not* the binding constraint — Nano hardware is, ~25× tighter.
- **Near-term SAM:** apps shipping ML Kit GenAI today number in the **tens to low hundreds** — unmeasured, but no source puts it higher, and Google names only Kakao. The eval-tool adopter base is a subset of that: **dozens of accounts near-term.** (The oft-cited "25,000 ML Kit apps" is a 2020 figure for *classic* vision/NL APIs, not GenAI.)
- **3-year SAM:** if on-device GenAI diffuses into the ~40K–63K plausible-category apps above 50K installs (derived from ~157K such apps total, [Wikipedia Aug 2024](https://en.wikipedia.org/wiki/List_of_most-downloaded_Google_Play_applications), × category share) at 1–5% penetration → ~1,500–7,500 shippers; eval adopters a subset → **~150–2,000 apps.** Install-weighted, adopters skew large (AppBrain on-device-ML multiplier ~2–5×), but can't exceed the device cap; a speculative extrapolation reaches ~10–15% of the surface in three years **only if** OEM Nano rollout continues — which Google controls.
- **Engineering cost avoided:** Kakao-style in-house harnesses run several engineer-weeks each; across even 1,000 adopters that is real, but the *near-term* numerator is small because the adopter count is small.

**Sensitivity:** halve both soft assumptions (penetration and category share) and the 3-year SAM falls under ~500 apps. The verdict does not survive as a "Build" at any honest input — it survives as a "Prototype" only because the `usage`-object half is cheap enough to ship regardless of how few harness adopters appear. The experiment that would settle it: instrument the Prompt API developer preview to count how many distinct apps call it, and watch the slope through the DMA deadline.

---

## Adoption path

1. **The hook:** the `usage` object. One line, immediate value (cost/latency debugging, cache-hit visibility), ships with the next Prompt API point release. It gets the SDK surface in front of exactly the developers who will later want the harness.
2. **First real integration:** a team wires the harness into their pre-release device-farm run and gates a release on "no regression vs last Nano version." It replaces their spreadsheet.
3. **The dependency:** once a team's release checklist includes "eval suite green," removing it means flying blind across the next silent Nano refresh — a dependency they'd endorse rather than resent, because the platform is the thing changing the model under them.

First adopter: a Nano-forward partner already building their own harness (Kakao is the named candidate) adopts to delete in-house code. Second wave unlocks at the DMA deadline, when exposing the on-device model to all third parties turns eval from a nice-to-have into table stakes.

---

## Execution plan

- **Developer preview (usage object + harness):** question it answers — *do developers call the usage object, and do they run the harness more than once (i.e., catch a real regression)?* Partners: the existing Prompt API preview cohort. Evidence collected: distinct-app call counts and re-run frequency — the S1 data this report is thin on.
- **Beta (graduate when):** the usage object is trivially GA-able; the harness graduates only when there is a **published nano-v3/v4 grading-quality number** clearing the embarrassment threshold for LLM-as-judge, or the harness ships embedding-and-exact-match scoring only and defers the judge.
- **GA:** commit to the usage-object schema (versioned independently of the model) and a **model-version-change signal** the harness keys off — the one genuinely platform-only contract here.

**Org dependency, named honestly:** this needs the **AICore team** to expose usage metadata and a version-change event from the response; ML Kit cannot surface what AICore doesn't emit. If AICore says no, the usage object collapses back to the reconstructed double-`countTokens` hack and the privilege argument weakens materially. That is the single yes that gates the good version of this.

---

## The case against

The live failure mode is **#2 on the rubric's list — the platform absorbs the problem underneath you.** Google already runs an internal eval pipeline (LLM raters + statistical metrics + human raters per language) and ships **per-API LoRA adapters specifically to hold a quality bar across Nano versions** ([Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)). If those adapters make Nano refreshes output-stable enough, the drift problem this tool detects partly evaporates — and the developer's need shrinks to cost accounting, which the `usage` object alone covers. Layer on Vertex AI's Automated Prompt Optimization (Google's own cloud answer to "make my prompt better") and a general-purpose Nano that keeps getting more robust, and the substitute for the *harness* is substantially Google's own roadmap. That is why S5 is a 2.

The honest mitigation is the structure of the recommendation itself: ship the cheap, high-privilege, absorption-proof half (usage accounting — Apple has it, developers count tokens by hand, it's a one-liner) and treat the harness as a preview whose job is to find out whether the drift problem is real enough to productize, rather than betting a GA commitment on it now.

The weaker case against — "it's just a Gradle lib anyone can write" — is real for the scoring loop and false for the usage object and version signal. Don't over-rotate on it; do concede the harness alone would shelve.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if Google's LoRA-adapter drift management is shown to hold output stable across a nano-v3→v4 refresh on a fixed prompt set — concretely, if a published or preview-measured regression rate across that refresh comes in **below ~2%** — the harness loses its core job and this collapses to "ship the usage object, drop the harness."

**Load-bearing assumption:** that silent Nano refreshes actually move output enough to hurt a shipped feature. The arXiv and Kakao evidence says on-device output is unreliable *in general*; it does not yet prove *refresh-to-refresh* drift is large after LoRA stabilization. Everything rests on that.

**Re-check trigger if shelved:** the DMA Article 6(7) exposure landing in Android 18 (1 Aug 2027), which would multiply the adopter base, or a published nano-v4 quality number that makes on-device LLM-as-judge trustworthy.

---

## Fit for this team

ML Kit, not elsewhere — but only for the usage object and the harness that wraps the *Prompt API* surface. ML Kit owns the developer-facing GenAI front door, so the `usage` object and the version-change signal belong on its response type. The embedding scorer, though, pulls in EmbeddingGemma via AI Edge/MediaPipe, and the judge pulls in Nano — so the harness unavoidably spans ML Kit + AI Edge, and the bigger risk is that it fragments further if AI Edge Portal (perf) and this (quality) drift into two unrelated tools. The clean story is: **AI Edge Portal measures how fast; ML Kit measures whether it's still right.** If the org can't hold that boundary, the honest conclusion is that quality eval should sit beside AI Edge Portal, not in ML Kit — and that's worth deciding deliberately rather than by accident.

---

## Open questions

- **Does `GenerateContentResponse` already carry any usage metadata?** Found no evidence it does, but `developers.google.com` would not fetch directly this run — the API reference needs a direct read to be certain. *Settle by: opening the `com.google.mlkit.genai.prompt` reference once the domain is allowlisted.*
- **What is nano-v3/v4's grading quality?** No public number; nearest is Nano 2 at 55.8 MMLU (5-shot) from the [Gemini report](https://arxiv.org/abs/2312.11805). Without it, on-device LLM-as-judge reliability is unproven. *Settle by: an internal eval of Nano grading a labeled rubric set.*
- **What is Nano's decode (not prefix) throughput?** The cited ~940 tok/s (Pixel 10 Pro) is prefix speed; decode is unpublished, and the whole perf budget for a 100-prompt suite rides on it. *Settle by: on-device measurement.*
- **How large is refresh-to-refresh output drift after LoRA stabilization?** The load-bearing assumption; unmeasured. *Settle by: diffing a fixed prompt set across a real Nano version bump.*
- **How many apps ship ML Kit GenAI today?** Unmeasured; "dozens to low hundreds" is inference. *Settle by: Prompt API preview telemetry.*

---

## Runners-up

- **On-device neural TTS (Type A)** — strong demand (Picovoice Orca charges for it; Apple added speech generation) and a clean "Google has nothing" gap, but **G1 privilege is weaker** (OSS TTS like Piper exists) and quality is the feasibility risk. The closest contender; lost because its privilege gate is softer than the usage-object's.
- **On-device safety/moderation classifier for user content (Type G)** — high privilege and a real regulatory frame, but **demand is diffuse** and one-size-fits-all moderation dies on contact with each app's own trust-and-safety policy unless tunable; needs its own run.
- **Reach/tiering for GenAI below the 3.7% fleet (Type F)** — the highest strategic prize (it attacks the defining product tension), but **G2 feasibility is the whole game** and the honest answer ("a small model can't match Nano") makes it a harder, longer report.
- **Output-stability / model-version pinning contract (Type E)** — maximum privilege, but **S1 demand is nearly invisible** (it's an in-production, undemoable problem); it is better framed as the *contract the harness above keys off* than as a standalone product.
- **Wake-word / keyword spotting (Type A)** — Porcupine is the de facto standard, so demand is proven, but it's an audio-stack idea orthogonal to the GenAI thread and competes with a mature free substitute.
- **Structured document understanding — tables/forms (Type B)** — Apple already shipped `RecognizeDocumentsRequest` with structure; this reads as whitespace only if you look at Android alone. **Gate-adjacent fail**, kept visible so it isn't re-proposed as whitespace.

---

*Sources: [ML Kit evaluate-prompt guide](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) · [ML Kit Prompt get-started](https://developers.google.com/ml-kit/genai/prompt/android/get-started) · [ML Kit genai package ref](https://developers.google.com/android/reference/com/google/mlkit/genai/prompt/package-summary) · [Prompt API alpha announcement](https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html) · [Latest Gemini Nano + ML Kit GenAI (Aug 2025)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html) · [On-device inference 140M devices (Jul 2026)](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html) · [Apple WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/) · [Apple iOS 27 what's new](https://developer.apple.com/ios/whats-new/) · [AI Edge Portal benchmarking](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal) · [Firebase AI Logic count tokens](https://firebase.google.com/docs/ai-logic/count-tokens) · [EmbeddingGemma launch](https://developers.googleblog.com/en/introducing-embeddinggemma/) · [promptfoo](https://github.com/promptfoo/promptfoo) · [openai/evals](https://github.com/openai/evals) · [deepeval](https://github.com/confident-ai/deepeval) · [ragas](https://github.com/explodinggradients/ragas) · [mlkit issue #1078](https://github.com/googlesamples/mlkit/issues/1078) · [feich 256-token research](https://github.com/feich-ms/feich-docs/blob/main/mlkit-genai-256-token-limit-research.md) · [HN: AI evals half-baked](https://news.ycombinator.com/item?id=44194187) · [HN: unit testing prompts](https://news.ycombinator.com/item?id=41019748) · [HN: unit test AI responses](https://news.ycombinator.com/item?id=43691671) · [HN: why eval startups fail](https://news.ycombinator.com/item?id=48637868) · [arXiv 2604.24636 Less Is More](https://arxiv.org/abs/2604.24636) · [Gemini technical report](https://arxiv.org/abs/2312.11805) · [apilevels.com](https://apilevels.com/) · [Most-downloaded Play apps](https://en.wikipedia.org/wiki/List_of_most-downloaded_Google_Play_applications)*
