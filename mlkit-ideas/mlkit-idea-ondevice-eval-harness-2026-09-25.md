# On-Device GenAI Eval & Drift Harness — catch the silent model bump before your users do

**Type:** D (Tooling), with a Type B token/usage-accounting extension · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (high-conviction gap, one open technical risk)**
*2026-09-25 · Prepared for Android ML Kit · Evidence current as of 2026-09-25*

*Badges: Apple already shipped this · Structural gap no cloud tool can reach · Scorer risk unresolved*

> On a Tuesday, an Android dev ships a summarization feature on the ML Kit Prompt API. Weeks
> later a support ticket says the summaries got worse. Nothing in their code changed — AICore
> silently bumped the Nano feature version underneath them. There is no Gemini Nano on their
> CI runner, so they're now hand-bisecting `genai-prompt` versions on a physical Pixel to find
> the regression. Every one of the dozen open-source prompt-regression harnesses built in the
> last year runs against a cloud endpoint; not one can invoke the on-device managed model. This
> gives them the harness that can.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — high-conviction gap, one open risk | composite 3.8 × 2 = 7.6; no gate scored exactly 3 (no −1); S1 is 4 not 5 (no +1); rounded **down** to 7 for flagship-gated reach and the unresolved scorer risk |
| Platform privilege (gate) | 5/5 — pass | Only Google can instrument the managed AICore/Nano path (version transitions, cached/reasoning tokens); Firebase AI Logic explicitly refuses to monitor on-device inference ([firebase.google.com](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started)) |
| Feasibility headroom (gate) | 4/5 — pass | Orchestration + token accounting are bookkeeping; risky part (on-device LLM-as-judge) is an **optional** tier, deterministic/rubric scorers cover core drift detection |
| Durability (gate) | 4/5 — pass | Pure tooling, no model to train; output-stability is literally the product's subject, so the owner is philosophically aligned |
| Demand evidence (25%) | 4/5 | Server-side eval huge & paid (promptfoo 25.4k★, deepeval 18.4k★); on-device pain articulate but expressed as manual workarounds, not yet a consolidated category |
| Install-weighted reach (15%) | 3/5 | Relevant to ~all apps on the managed GenAI path, but that path is device-floored at ~3.7% (Nano, growing) today |
| Build-vs-buy-vs-borrow (20%) | 4/5 | The **borrow** path is structurally blocked — a cloud eval tool cannot invoke the on-device managed model |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, annotate a test, no key/permission; friction is needing a Nano-capable device or Test Lab to run |
| Substitute half-life (15%) | 3/5 | Dominant risk is Google itself absorbing usage-reporting + eval into the Prompt API (as Apple did) |
| Strategic complement (10%) | 5/5 | Free, easy eval de-risks adoption of the **whole** GenAI portfolio → more Android GenAI, device differentiation vs Apple |
| **Composite** | **3.8** | weighted mean of S1–S6 |

*Least trustworthy row: install-weighted reach (S2). AppBrain's adoption tables were egress-blocked this session, so the install-weighting multiplier and app-adoption ceiling are directional, not verified reads.*

---

## The problem

The job, stated as a developer's job under a deadline: *"I shipped an on-device GenAI feature; how do I know it still works after the model changes, and prove it before my users tell me it doesn't?"* The customer is an Android engineer, not an ML engineer, and their competing solution today is their own hand-run QA checklist.

This problem is structurally produced, not accidental. A large consumer app on the managed GenAI path operates under a constraint a cloud app never faces: **the model is updated out-of-band, by the platform, on a cadence the app does not control.** AICore delivers Gemini Nano and bumps its version independent of the app's release train; ML Kit's own docs frame prompt evaluation as a way to "ensure your app's use case is compatible with different versions of Gemini Nano" ([ML Kit, evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)). So output can change with no code change — and the standard safety net, a test suite in CI, cannot exist, because there is no Nano on a GitHub Actions runner or a developer laptop. The app team's ML people are server-side; their Android people aren't ML people; nobody in the building owns "measure whether the on-device feature regressed."

What they do *instead* today is the tell. They fall back to a manual QA checklist, or they hand-bisect SDK versions on a physical device. In ML Kit issue [#1061](https://github.com/googlesamples/mlkit/issues/1061) (opened 2026-07-16), a developer isolates a Prompt API regression by hand: *"Same source code, same device, same AICore. Only the `genai-prompt` version changed"* — the beta3 default silently switched the AICore feature from 636 to 648. That is regression testing performed by a human because no harness exists. This is a platform problem, not an app problem: every app on the managed path has this identical need and solves it identically badly, and none of them can differentiate on it.

---

## Proof & signals

- **Developers doing it by hand (OSS):** A dozen freshly-committed one-off prompt-regression harnesses appeared in the last ~12 months — [`Andrew-most-likely/prompt-ci`](https://github.com/Andrew-most-likely/prompt-ci) (7★, "catch regressions before your users do"), [`promptry/promptry`](https://github.com/promptry/promptry) (4★, "local-first prompt regression testing"), [`Yeachan-Heo/prompt-replay`](https://github.com/Yeachan-Heo/prompt-replay) (6★, "record, replay, and compare"), [`geminimir/promptproof`](https://github.com/geminimir/promptproof) (3★, "record→replay + policy-as-code… regressions, budget creep"). Independent devs re-implementing the *same* record→replay→diff→fail primitive is unsettled pain. **Every one targets cloud endpoints; none runs against an on-device model.** A GitHub query for `on-device llm eval language:kotlin` returns **zero repositories** (fetched 2026-09-25).
- **Someone charging money for it:** The server-side eval/observability market is crowded and paid — LangSmith (~$39/seat/mo + usage, [langchain.com/pricing](https://www.langchain.com/pricing)), Braintrust (usage-based, "eval-first" CI/CD gating), Humanloop (~$500/mo reported), Langfuse (~$30/seat/mo). Willingness to pay for eval/regression/cost tracking is proven. All are cloud/trace-based; a device-resident model a user runs offline is out of their scope.
- **Community voice (quote, don't paraphrase):** From a Gemini Nano developer write-up (DEV Community, 2026-07-17): *"there's no Gemini Nano on a GitHub Actions runner, and probably not on your laptop today either… If your test suite needs a real model, you don't have a test suite — you have a manual QA checklist,"* and *"On device Chrome controls when Nano gets bumped and you find out at the support ticket, not the deploy."* (That's Chrome's Nano, but the drift/no-CI pain is identical to Android's.)
- **Apps that shipped it themselves:** No dedicated Meta/Snap/Grammarly post on *on-device* output-stability eval surfaced — treat as absence, not disinterest. But **Google's own** blog describes an internal eval pipeline (LLM-based raters + statistical metrics + human raters, LoRA adapters trained on eval results) to hold quality across Nano versions ([Android Developers Blog, 2025-08](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)). Google does the eval; app developers get no equivalent.
- **The absence signal:** The on-device eval *category* is genuinely quiet. I read that as structural, not disqualifying — adjacent server-side eval is enormous and monetized (the problem is validated), and the reason the on-device instantiation is missing is repeatedly stated by developers (the model isn't on the runner; updates land out-of-band). That is a gap no existing tool fills, not a gap nobody wants filled.

---

## Why now

1. **Capability shift:** The managed GenAI surface only recently became large enough to have a lifecycle worth testing — Prompt API to Beta (Jan 2026), Structured Output/System Instructions/Thinking Mode and a raised 4,096-token output ceiling (Jul 2026). Structured and multi-step outputs are exactly what breaks silently across model refreshes.
2. **Competitive shift (dated, and the sharp one):** At **WWDC 2026 (June)** Apple shipped a first-party **Evaluations framework** for Foundation Models ([session 241](https://developer.apple.com/videos/play/wwdc2026/241/)) — *"measures the quality of your intelligence features… beyond what unit tests alone can catch"* — and in **iOS 26.4** added a per-response and per-session `usage` property exposing `input.totalTokenCount`, **`input.cachedTokenCount`**, `output.totalTokenCount`, and **`output.reasoningTokenCount`** (corroborated across [Apple session 241](https://developer.apple.com/videos/play/wwdc2026/241/), [artemnovichkov.com](https://artemnovichkov.com/blog/tracking-token-usage-in-foundation-models), [zats.io](https://zats.io/blog/counting-tokens-in-foundation-models/)). Apple has both halves of this idea in production. Android has neither.
3. **Demand shift:** The proliferation of cloud prompt-regression micro-tools and the paid eval market through 2026 show teams now treat prompt drift as a release-gating concern — a posture that arrived on-device only after the managed path got real.

The why-now is strong on all three legs, and the competitive leg is the clincher: this is a gap where a peer platform has visibly, datedly shipped the thing.

---

## The capability gap

Precise boundaries, each with the page checked (Google/Apple docs were WebFetch-blocked this session, so negatives were confirmed via search-index snippets — flagged):

- **ML Kit:** No on-device eval harness. The "Evaluate prompt quality" page is **prose that offloads to the cloud** Vertex AI Gen AI evaluation service ([evaluate-prompt](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)); the adjacent "Automated Prompt Optimization" is also cloud-side, using server Gemini Pro/Flash ([Android Developers Blog, 2026-01](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html)). On tokens, ML Kit exposes **input-only** `countTokens` / `getTokenLimit` on the on-device `GenerativeModel` ([reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)); a per-response usage object with output/cached/reasoning counts was **not confirmed** (reference page unfetchable) — the gap Apple just filled.
- **Firebase AI Logic:** *"AI monitoring in the Firebase console does not show any data for on-device inference"* — cloud path only ([docs](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started)).
- **AI Edge Portal:** Benchmarks latency, peak memory, init time across ~120 device types — **performance, not output quality**; private preview ([Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **Vertex AI eval service:** Real, but **cloud-only** — the thing ML Kit's guide points to ([docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)).
- **MediaPipe / LiteRT-LM:** Token counts only (`sizeInTokens`, `lastPrefillTokenCount`); no quality/regression harness; dev supplies the model (unmanaged path).
- **Qualcomm GenieX:** A quality harness is being *formalized* ([issue #1411](https://github.com/qualcomm/GenieX/issues/1411)) but is in-progress and Snapdragon-specific, dev-supplied model.
- **OSS (promptfoo, DeepEval, Ragas, lm-evaluation-harness):** Python/Node CLI/CI tools; **none has an Android runtime binding** to a managed system model.

**Main competitor a developer uses today:** their own hand-rolled record/replay script plus a manual QA pass on a physical device — because the cloud tools they'd otherwise reach for cannot see the on-device model.

---

## Proposed surface

A Type D tooling product with a small Type B extension. Two pieces:

**1. On-device eval & drift harness** — a test-time library that runs *inside* an instrumented Android test (or Firebase Test Lab) on a Nano-capable device, where the managed model actually lives.

```kotlin
// Record a golden set once, against a pinned model/feature version
val harness = GenAiEval.forPromptApi(model)
harness.record(dataset = "summarize-golden.jsonl")   // captures outputs + model/feature version + usage

// In CI-on-device: replay and assert no drift vs the golden set
val report = harness.replay(dataset = "summarize-golden.jsonl") {
    scorer = Scorers.all(
        Scorers.schemaValid(MySummary::class),        // deterministic
        Scorers.embeddingSimilarity(threshold = 0.9), // EmbeddingGemma, on-device
        Scorers.judge(rubric = "faithful, <=3 bullets") // OPTIONAL tier — Nano-as-judge
    )
}
assertThat(report.regressions).isEmpty()
report.modelVersionDelta   // "AICore feature 636 -> 648" — the #1061 pain, surfaced automatically
```

- **Inputs:** a golden dataset (inputs + recorded outputs), a pinned model/feature version, a scorer stack.
- **Outputs:** a typed drift report — per-case pass/fail, score deltas, and the **model-version delta** that explains a regression.
- **Scorer tiers (this is where feasibility lives):** deterministic (schema/regex/exact-match) → embedding-similarity (EmbeddingGemma, on-device, <200 MB) → **optional** LLM-as-judge. The core drift-detection value needs *no* judge.
- **Deliberately does NOT:** train models, run in the cloud, or promise a single quality score — it detects *change* against a baseline the developer defines.

**2. Usage-reporting extension (Type B)** — add a per-response/per-session `usage` object to the Prompt API returning output, cached/prefix, and reasoning-token counts — closing the exact gap Apple shipped in iOS 26.4.

**Time-to-first-hello-world target: under 15 minutes** — one Gradle line, annotate an existing instrumented test, run on a connected Pixel. What must be true: the harness ships as an unbundled artifact, needs no API key or new permission, and degrades to deterministic-only scorers if EmbeddingGemma/judge aren't present. The one honest asterisk: "hello world" requires a Nano-capable device or a Test Lab device — but that is intrinsic to the problem, not a design failure.

---

## Reach & sizing

Show the arithmetic; give ranges. **All app-adoption inputs are directional — AppBrain was egress-blocked this session.**

- **Device floor (the binding constraint):** the managed GenAI path runs on **Nano-capable devices only — ">140M" (Google-published, 2026)** ≈ **~3.7%** of a **~3.8B** third-party actives denominator ([Android Developers Blog, 2026-07](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html); percentage is my arithmetic against a third-party denominator). API-level reach is not the limiter — API 26+ is 96.1%, API 31+ is 78.8% (StatCounter web-traffic, Apr 2026, *not* Play data) — Nano eligibility is.
- **Addressable set:** unlike a runtime API, this tool is relevant to **essentially every app that adopts any ML Kit GenAI API** — it is not a niche within the base, it *is* the base's testing layer. So its ceiling tracks GenAI adoption itself.
- **Adoption ceiling (directional):** a specialized on-device ML SDK realistically reaches low-single-digit **% of apps** (~1–5%) at three years, install-weighted several× higher (multiplier ~1.5–3× for infra SDKs). No Google-published count of ML Kit GenAI / Prompt API adoption exists.
- **Engineering cost avoided:** each adopter otherwise builds record/replay + version tracking + on-device run infra (the one-off OSS repos show this is real work) and maintains it as the model updates — call it 3–8 engineer-weeks to build badly plus recurring maintenance, against a <1-week integration.

**Sensitivity:** halve both soft assumptions — GenAI adoption and the eval-attach rate — and the *count* shrinks, but the verdict doesn't flip, because the decision here isn't gated on volume: it's gated on **whether Google will match a shipped Apple capability and whether the on-device scorer works.** The honest reframing: today's absolute reach is small and flagship-gated; it grows mechanically as Nano spreads (nano-v4; the EU DMA Article 6(7) decision of 2026-07-16 requires Alphabet to open on-device models to third parties in Android 18 by **2027-08-01**, [DMA portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). This is tooling that should ship *ahead* of the reach curve, not behind it.

---

## Adoption path

1. **The hook:** a 15-minute "catch a regression" quickstart — record a golden set, bump the SDK, watch the harness flag the drift and name the model-version delta. It lands because it maps 1:1 onto the pain in issue #1061.
2. **First real integration:** the harness runs in the team's pre-release instrumented-test suite (on Firebase Test Lab devices), gating releases on "no GenAI drift." It replaces a manual QA checklist.
3. **The dependency:** golden datasets accrete into the team's institutional definition of "correct," and the release gate becomes load-bearing — removing it means flying blind through the next Nano bump, which they'd resent losing, not resent keeping.

**Who adopts first:** a team already burned by a silent regression — the #1061 reporter's archetype — followed by any partner shipping a structured-output feature (the most drift-prone). The second wave is unlocked by a reference implementation in the ML Kit sample app and one visible partner citing it in a talk.

---

## Execution plan

- **Developer preview** — ships deterministic + embedding scorers and the model-version-delta report; the **question it answers** is the load-bearing one: *does on-device Nano-as-judge clear the embarrassment threshold, or must judging stay deterministic/cloud-offline?* Partners: 3–5 teams already on the Prompt API with structured output. Evidence collected: scorer reliability, and whether "attach to existing test" actually hits 15 minutes.
- **Alpha/Beta** — graduate when (a) deterministic + embedding scoring detects seeded regressions with an acceptable false-positive rate on ≥3 partner datasets, and (b) the usage-reporting extension lands in the Prompt API. Checkable, not vibes.
- **GA** — commit to the harness API surface and, critically, to an **output-stability/version-signalling contract**: the harness is only as good as the version metadata the runtime exposes.

**Org dependencies, honestly:** the usage-reporting extension needs the **Prompt API / AICore** team to expose per-response usage (they own that surface — this is not ML Kit's to ship alone). If they say no, piece 2 dies and piece 1 ships without token accounting. The version-delta feature needs AICore to expose feature-version transitions to the SDK; if it can't, the harness degrades to "outputs changed" without the "why."

---

## The case against

The strongest argument against, argued at full strength: **the platform absorbs this underneath you (adoption failure mode #2).** Apple didn't ship a separate eval *tool* — it put `usage` on the response object and an Evaluations framework in the SDK. The clean answer for Google is the same: bake usage reporting into the Prompt API and ship a thin eval affordance in ML Kit, at which point a standalone "harness" is redundant packaging around primitives that live in the API. That is a real risk and it's also, in part, the *right* outcome — which is why the verdict is Prototype, not Build: the preview's job is partly to discover how much of this should be a distinct surface versus a feature of the Prompt API. It also sets the S5 substitute half-life at ~2–3 years, with Google itself as the likeliest substitute.

The second-strongest: **the scorer doesn't work on-device.** If Nano-as-judge is unreliable (point-wise scoring gives tied scores to right and wrong outputs; judge bias is documented) and deterministic scorers prove too blunt for the free-text features people most want to test, the tool detects only crude drift and developers keep their manual pass. This is why judging is an optional tier and the preview validates it first.

What this is *not*: it is not "the API outran the hardware" (it runs wherever the GenAI API runs, by construction) and not "undifferentiated against a free substitute" (the free substitutes structurally cannot reach the on-device managed model).

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google ships a per-response `usage` object *and* a first-party on-device eval affordance directly in the Prompt API / ML Kit within ~2 release cycles (by ~mid-2027). If the primitives land in the API, a separate harness is redundant and the right move is a docs+samples effort, not a product.

**Load-bearing assumption:** that a useful amount of drift can be caught by deterministic + embedding scorers *without* a reliable on-device judge. If false, the tool's value collapses to the free-text cases it can't score.

**Re-check trigger if shelved:** on-device Nano-as-judge crosses a demonstrated reliability bar (a published result, or a working GenieX-style KLD-vs-teacher method portable to the managed path), which would move Feasibility from 4 toward 5 and make the judged tier shippable.

---

## Fit for this team

ML Kit is the right owner of the **harness**, because ML Kit is the sanctioned front door to the managed AICore/Nano path and already owns the "Evaluate prompt quality" guidance surface — it should ship code behind that page rather than a link to the cloud. But the **usage-reporting extension is not ML Kit's alone**: token/usage metadata originates in the Prompt API/AICore runtime, so that piece is a joint commitment. If the org's honest read is that eval belongs with AICore as a first-party API feature (the Apple pattern), that's a legitimate and possibly better outcome — and saying so is more valuable than ML Kit staking a weak claim. The one thing that must not happen is this landing in a *third* place (a new AI Edge tool) and fragmenting the developer story further, which is this ecosystem's standing internal risk.

---

## Open questions

- **Does the on-device Prompt API already return output/cached/reasoning token counts?** Unconfirmed — the Kotlin reference page was WebFetch-blocked. Settle by fetching [the `GenerativeModel` reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel) in a browser. If it does, piece 2 is smaller than assumed.
- **Can Gemini Nano judge its own outputs acceptably?** No published evidence either way. Settle with a small preview study on partner datasets.
- **What are the real ML Kit GenAI adoption numbers?** No Google-published count; AppBrain blocked this session. Settle from AppBrain's `machine-learning-sdks` tag page in an unblocked session.
- **Does AICore expose feature-version transitions to the SDK?** Determines whether the harness can name *why* an output drifted, not just *that* it did.

---

## Runners-up

- **On-device UGC safety/moderation classifier (Type G)** — the close #2, and the only runner-up that **passes** platform privilege (Google ships no standalone moderation classifier for user content; MediaPipe text classification is sentiment-only). Dropped this run, not on privilege but on scope: it carries a G2 tunability + liability landmine (one-size classifiers die on contact with a real T&S team), its demand is more diffuse, and its regulatory driver (EU DSA / Play generated-content policy) needs its own verification pass. **Deserves its own run.**
- **On-device neural TTS (Type A)** — **fails** platform privilege: Picovoice **Orca** already ships as a drop-in Maven dep (`ai.picovoice:orca-android`). Real Google gap, already commoditized.
- **Speaker diarization / wake word (Type A)** — **fail** privilege: Picovoice **Falcon** and **Porcupine** are one-line Maven deps; DMA will force wake-word access open anyway.
- **GenAI reach/tiering to sub-8GB (Type F)** — partly **absorbed** already by Firebase AI Logic's `PREFER_ON_DEVICE`/cloud hybrid routing.
- **Delivery/availability lifecycle contract (Type E)** — max privilege but demand is invisible in production and hard to evidence; parked.
- **Structured document understanding — tables/forms (Type B)** — a gap where **Apple already beat Google** (Vision `RecognizeDocumentsRequest`), not open whitespace.

---

*Sources:*
- [ML Kit — Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)
- [ML Kit — GenerativeModel reference](https://developers.google.com/android/reference/kotlin/com/google/mlkit/genai/prompt/GenerativeModel)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Android Developers Blog — latest Gemini Nano with ML Kit GenAI (2025-08)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)
- [Android Developers Blog — Automated Prompt Optimization (2026-01)](https://android-developers.googleblog.com/2026/01/how-automated-prompt-optimization.html)
- [Android Developers Blog — on-device inference (2026-07)](https://android-developers.googleblog.com/2026/07/android-on-device-inference.html)
- [Firebase AI Logic — hybrid on-device (monitoring caveat)](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started)
- [Google AI Edge Portal — benchmark blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)
- [Vertex AI evaluation overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)
- [Apple WWDC26 session 241 — Foundation Models framework](https://developer.apple.com/videos/play/wwdc2026/241/)
- [Tracking token usage in Foundation Models — artemnovichkov](https://artemnovichkov.com/blog/tracking-token-usage-in-foundation-models)
- [Counting tokens in Foundation Models — zats.io](https://zats.io/blog/counting-tokens-in-foundation-models/)
- [ML Kit issue #1061 — genai-prompt beta3 regression](https://github.com/googlesamples/mlkit/issues/1061)
- [prompt-ci](https://github.com/Andrew-most-likely/prompt-ci) · [promptry](https://github.com/promptry/promptry) · [prompt-replay](https://github.com/Yeachan-Heo/prompt-replay) · [promptproof](https://github.com/geminimir/promptproof)
- [promptfoo](https://github.com/promptfoo/promptfoo) · [deepeval](https://github.com/confident-ai/deepeval)
- [LangChain/LangSmith pricing](https://www.langchain.com/pricing)
- [Qualcomm GenieX issue #1411](https://github.com/qualcomm/GenieX/issues/1411)
- [Picovoice Orca (Android)](https://picovoice.ai/docs/quick-start/orca-android/) · [Falcon](https://picovoice.ai/docs/quick-start/falcon-android/) · [Porcupine](https://picovoice.ai/docs/quick-start/porcupine-android/)
- [EU DMA — Alphabet interoperability decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
