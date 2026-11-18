# On-Device Eval & Regression Harness — catch the quality drop before your users do, when the OS swaps the model underneath you

**Type:** D (Tooling), with an E (lifecycle) motivation · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (Prototype)**
*2026-11-18 · Prepared for Android ML Kit · Evidence current as of 2026-11-18*

> It's a Tuesday. Your app summarizes support threads with the ML Kit Prompt API. A Play review says the summaries "got weird this week." You check: AICore quietly rolled a device cohort from Gemini nano-v3 to nano-v4, and your carefully tuned prompt now returns three sentences where QA signed off on one. You have no baseline, no diff, no way to have caught it in CI — ML Kit's own guidance told you to "build a test set and use an LLM-as-a-judge," then linked you to a **cloud** service. Apple shipped developers a framework for exactly this at WWDC26. You have a spreadsheet.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **6/10 — Prototype** | composite 3.35 × 2 = 6.7, −1 because the Platform-Privilege gate scores exactly 3 → ~5.7, rounded to 6 |
| Platform privilege (gate) | 3/5 — **pass (weak)** | Model-version identity + token/usage accounting need AICore signals only the platform has; but the test-runner + LLM-judge core is a buildable Gradle wrapper around the [Prompt API](https://developers.google.com/ml-kit/genai) |
| Feasibility headroom (gate) | 5/5 — pass | No model to train; a harness runs at build/CI time. Only token-usage accounting depends on a new AICore signal |
| Durability (gate) | 4/5 — pass | A report-schema surface is stable; risk is team charter, not output drift. [killedbygoogle](https://killedbygoogle.com/) base rate is the standing tax |
| Demand evidence (25%) | 4/5 | Generic job proven: [promptfoo 27.4k★](https://github.com/promptfoo/promptfoo), four eval-vendor acquisitions in 18 months. **On-device-specific demand is thin** — see caveat |
| Install-weighted reach (15%) | 2/5 | Gated to ~3.7% of Android (140M Nano devices ÷ ~3.8B, my arithmetic). Install-concentrated but a low-single-digit device class |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Borrow path exists: promptfoo + a local HTTP bridge to the phone + a cloud judge. A few weeks, mostly works |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, no new permission, small size; friction is authoring the test dataset. ~30–60 min to first result |
| Substitute half-life (15%) | 3/5 | ~2–3 years; the live substitute risk is Google folding eval into the Prompt API itself |
| Strategic complement (10%) | 4/5 | De-risks adopting the whole ML Kit GenAI portfolio; directly answers Apple's platform-completeness story |
| **Composite** | **3.35** | Weighted mean; lands in the "Prototype and developer-preview to collect S1 evidence" band (3.0–3.9) |

*Least-trustworthy score: **Demand (S1)**. The 25%-weighted signal borrows almost all its strength from the **cloud/server** eval market. Direct evidence that **Android on-device** developers are doing this by hand is one strong case (Grammarly) plus structural argument plus silence from ML Kit devs. If the generic demand does not migrate on-device, this score is a 2, and the composite drops to ~2.9 (Shelve).*

---

## The problem

The job, stated as a developer under a deadline: *"The on-device model my feature depends on changes without my say-so, and I have no automated way to know whether my feature still works after it changes."*

This is structurally produced, not an accident of current tooling. A large consumer Android app that ships a GenAI feature on ML Kit operates under a constraint a server-side team never faces: it does not own its model and cannot pin it. [AICore manages Gemini Nano distribution and updates](https://developer.android.com/ai/aicore), rolling nano-v2 → v3 → v4 across device cohorts on its own schedule — keeping old and new versions for roughly three days as a rollback window, per Android Central. A server team calling Gemini or GPT pins a dated model string and gates releases on an eval suite. The Android team gets the model swapped underneath a shipped binary, on devices it doesn't control, with no release of its own to blame.

Name the archetypes: note-takers and email clients using the Prompt API for summaries and smart compose; messaging apps doing on-device rewrite and tone adjustment; reader and productivity apps extracting structure. What do they do *instead* today? Three things, all bad. Most **eyeball it** — ship the prompt, watch Play reviews, react. Serious shops **hand-roll a harness**: stand up a local HTTP bridge to a test device, script the Prompt API, and call a *cloud* LLM as judge — the only path the existing OSS tools support, since every one assumes a pinnable server model. A few **pin the SDK version** and refuse to upgrade, which freezes them out of new capabilities to avoid output drift.

Crucially — and this is the concession that keeps the report honest — Google already solves this *for its own canned APIs*. Per the [Android Developers Blog (Aug 2025)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html): *"By shipping GenAI APIs with LoRA adapters, we ensure each API meets our quality bar regardless of the version of Gemini Nano running on a device."* So Summarization, Rewriting, and Proofreading are stabilized by per-feature adapters. The drift exposure is concentrated in the **Prompt API** — the custom-prompt path where the developer owns the prompt, Google owns the changing base model, and no per-app adapter guarantees anything. That is where this idea lives, and scoping it there is what separates it from a solved problem.

---

## Proof & signals

- **Developers doing it by hand (the generic job — STRONG):** [promptfoo](https://github.com/promptfoo/promptfoo) at **27.4k★** ("Make decisions based on metrics, not gut feel"), [OpenAI evals](https://github.com/openai/evals) at **19.8k★** (helps you understand "how different model versions might affect your use case"), [deepeval](https://github.com/confident-ai/deepeval) at **19.5k★** (explicitly to "prevent prompt drifting"), plus Ragas (~15k★) and Giskard (~5k★). Five frameworks, 5k–27k stars, all CI/server/desktop. **None target an on-device mobile model.** The job is universally tooled; the on-device case is the hole.
- **Someone charging money for it (STRONG):** Four eval/observability vendors acquired or mega-funded inside ~18 months — [OpenAI acquired promptfoo](https://promptfoo.dev/blog/promptfoo-joining-openai) (Mar 2026), [ClickHouse acquired Langfuse](https://www.webpronews.com/clickhouse-acquires-langfuse-raises-400m-at-15b-valuation-for-ai-push) (Jan 2026), Anthropic acqui-hired Humanloop (2025), and [Braintrust raised a Series B at ~$800M post](https://www.braintrust.dev/blog/announcing-series-a) (reported Feb 2026, customers include Notion and Stripe). Willingness to pay for "measure and monitor LLM output quality" is unambiguous. Every one is cloud — on-device is unserved.
- **Apps that shipped it themselves (MEDIUM):** Grammarly consolidated onto a ~1B-parameter on-device model and reported building *"an offline evaluation framework… to simulate production behavior"* ([grammarly.com/blog/engineering](https://www.grammarly.com/blog/engineering/), via snippet — host blocked). A ProAndroidDev piece titled ["Why a 1B On-Device LLM Needs a Harness"](https://proandroiddev.com/why-a-1b-on-device-llm-needs-a-harness-4068cf22e818) is directly on-thesis (body unread).
- **That silent updates really break prompts (STRONG, canonical):** ["How Is ChatGPT's Behavior Changing over Time?"](https://arxiv.org/abs/2307.09009) (Chen, Zaharia, Zou; arXiv 2307.09009, 2023) measured GPT-4 accuracy on one task falling **84% → 51%** between two dated snapshots, concluding the "same" LLM service "can change substantially in a relatively short amount of time, highlighting the need for continuous monitoring." A provider-managed model drifting is a documented, measurable phenomenon, not a fear.
- **The absence signal (WEAK — and the weakness is the finding):** Direct searches of googlesamples/mlkit issues and Stack Overflow for ML Kit GenAI / Gemini Nano output-quality complaints returned **zero** threads. The APIs are beta (`genai-summarization:1.0.0-beta1`), adoption is early, so pain hasn't accumulated in public. This is pre-pain, not validated pain — read it as "no noise yet," and do not inflate it into demand.

---

## Why now

1. **Capability shift (2026).** The Prompt API graduated to Beta (Jan 2026) and gained model selection across Gemma 4 (E2B/E4B), Structured Output, Thinking Mode, and multi-image input through mid-2026 ([release notes](https://developers.google.com/ml-kit/release-notes)). Developers now author *custom* prompts against a *changing* model menu — the exact surface where drift bites and where LoRA stabilization does not reach.
2. **Competitive + regulatory shift (Jun–Jul 2026).** Apple shipped a first-party **Evaluations framework** at [WWDC26 Session 298](https://developer.apple.com/videos/play/wwdc2026/298) — define metrics, auto-grade on-device-model outputs, catch regressions as the managed model updates across OS versions — plus [token counting and context-size APIs](https://developer.apple.com/videos/play/wwdc2026/241) in iOS 26.4. Separately, the EU's [DMA Article 6(7) decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) (Jul 2026) requires Alphabet to expose on-device AI models to third parties by 1 Aug 2027 — more third parties on the managed model means more apps exposed to its drift.
3. **Demand shift (2025–2026).** "Evals as a deployment gate" became standard practice, evidenced by the acquisition wave above. The expectation that you gate releases on an eval suite is now industry-default; Android on-device is the one place a developer can't.

Three dated why-nows, and the strongest is competitive: Apple shipped the analogue. This must be framed as **closing a gap Apple opened**, not entering virgin territory.

---

## The capability gap

Checked across the stack, each negative with the page I checked:

- **ML Kit GenAI** — [the "Evaluate prompt quality" page](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt) is **prose only**: it tells you to "develop a comprehensive set of inputs and expected outputs," "run your evaluation dataset and record the outputs… evaluate manually or use LLM-as-a-judge," iterate 3–5×, then links out to the **cloud** Vertex service and a data-driven optimizer. No shipped Android harness, no scoring library, no regression-diff across Nano versions, no token accounting ([GenAI overview](https://developers.google.com/ml-kit/genai)). *This is the sharpest gap: Google specifies the exact workflow and ships nothing to run it on-device.*
- **AI Edge Portal** — benchmarks init/prefill/decode speed and peak memory across a device fleet; measures **no output quality**, and is private preview ([Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)).
- **`google-ai-edge/eval`** — a real Google OSS CLI, but **host/desktop-driven**, aimed at ML engineers, runs academic benchmarks (ifeval, mmlu, bbh) against **LiteRT-LM model files**; it does **not** target the managed AICore/Nano path, has no LLM-as-judge, no rubric scoring, no token accounting ([github.com/google-ai-edge/eval](https://github.com/google-ai-edge/eval)). Naming this explicitly matters — it's the thing a skeptic points to.
- **Firebase AI Logic** — the on-device path reuses ML Kit's prose guidance and ships no client eval; evaluation means the **cloud** [Vertex Gen AI evaluation service](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview).
- **MediaPipe** — the LLM Inference API is now maintenance-only/deprecated on Android+iOS (focus shifted to LiteRT-LM); no eval tooling. *(Freshness update vs. the Aug-2026 snapshot — note it.)*
- **Apple** — **shipped** the Evaluations framework + token/usage accounting (above).
- **OSS (promptfoo/deepeval/Ragas)** — cloud/desktop; judge metrics expect a cloud API key; the only on-device path is a hand-rolled HTTP bridge to the phone.

**The main competitor a developer uses today:** not another platform — it's **promptfoo/deepeval wired by hand to a test device, with a cloud model as judge.** That is the status quo this API is priced against.

---

## Proposed surface

A build-time-first eval harness, delivered as an ML Kit test artifact, centered on the Prompt API.

```kotlin
// 1. Define a dataset (JSON/code). 2. Run against the managed model. 3. Score + diff.
val suite = EvalSuite.fromAsset("support_summary_cases.json") // (prompt, rubric|expected)

val report = OnDeviceEval.run(
    client = promptClient,                 // the same GenerativeModel the app ships
    suite = suite,
    scorers = listOf(
        Scorer.ExactMatch,
        Scorer.Rubric(rubricModel = RubricModel.OnDevice),   // Nano/Gemma-4 judge
        Scorer.LlmJudge(judge = Judge.Cloud(vertexModel))    // optional stronger judge
    ),
)

report.passRate            // aggregate, per-scorer
report.tokenUsage          // input/output/cached — parallels Apple response.usage
report.modelVersion        // e.g. "nano-v4" — the privileged signal from AICore
report.diffAgainst(baseline)   // regression report when modelVersion changed
```

- **Inputs/outputs:** a test dataset in → an aggregate report (pass rates, latency, token usage, per-case outputs) out, plus a **diff** against a stored baseline keyed to the model version.
- **The privileged slices** (what OSS can't replicate): `modelVersion` identity from AICore, `tokenUsage` from the system model, and a first-party on-device judge option.
- **Where it runs:** primarily an instrumented test (`connectedCheck` on a device/emulator in CI); optionally an in-app canary for production monitoring.
- **What it deliberately does NOT do:** it does not pin or roll back the model (that's lifecycle/Type E, named below); it does not promise a single "quality score" — it reports metrics the developer defines; it does not ship a safety classifier (separate idea).
- **TTFHW target: 30–60 minutes.** The irreducible friction is authoring a test set; the 15-minute bar is unreachable here because *you have to write the cases* — and that's a finding about the design, not a footnote. Ship 10 starter cases per API to compress it.

---

## Reach & sizing

All inputs flagged by provenance; arithmetic is mine.

- **Device gate (the binding constraint):** 140M+ Nano devices (**Google-published**, Apr 2026) ÷ ~3.8B Android actives (third-party) → **~3.7%** (my arithmetic). The most capable Nano-4 tier is narrower, ~1–3% (third-party estimate).
- **minSdk is a non-constraint:** API 26+ reaches ~99%, API 31+ ~77.7% ([apilevels.com](https://apilevels.com/) data, via snippet). The harness reaches as far as the GenAI APIs do — so Nano hardware, not API level, is the ceiling.
- **Adoption ceiling anchor:** TensorFlow Lite, the closest comparable on-device ML SDK, sits near **~1% of all Play apps / ~11% of installs** — a ~10× install-weighting multiplier ([AppBrain ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks), via snippet). A specialized on-device ML SDK tops out around 1% of apps after years.
- **Universe:** ~280,000 Play apps with ≥50K installs (AppBrain quality tier).

**My funnel (ranges, softest assumptions flagged):**
1. In a GenAI-text-relevant category (Productivity, Communication, Social, Tools, Education, Business): ~35–50% of 280K → **~98K–140K apps** *[soft: only Tools, 25,492 at ≥50K, is verified]*.
2. Actually ships an on-device GenAI feature within ~2 yrs, gated by ~3.7% device reach: 2–8% → **~2,000–11,000 apps** (SAM, center ~5,000) *[soft: gated by device reach]*.
3. Attach a dedicated eval harness over 3 yrs at 10–30%: **~200–3,300 apps** (SOM, center **~1,000–1,500**) *[soft: dev-tooling attach rate is the biggest unanchored lever]*.

**Install-weighted:** small app count, but adopters skew to the largest GenAI shippers (~10× multiplier), so the SDK plausibly touches 10–30% of the on-device-GenAI cohort's *installs* while remaining a fraction of 1% of apps.

**Sensitivity:** halve the two softest inputs (relevant-category share and attach rate) and SOM falls to ~300–500 apps. The verdict **does not** flip — it was already Prototype, and the honest reading is that reach is modest and device-gated, which is *why* it's Prototype. **Engineering cost avoided** is a few engineer-weeks per adopter (a hand-rolled bridge + judge), times ~1,000–1,500 apps — real, but below the ~10× platform-test threshold on reach alone. The case rests on **strategic complement and competitive parity**, not reach.

---

## Adoption path

1. **The hook:** `./gradlew connectedCheck` turns red when a prompt regresses against a stored baseline — a CI failure a developer already understands, in a workflow they already run.
2. **First real integration:** the eval suite becomes the release gate for the app's GenAI feature, replacing the hand-rolled bridge + cloud-judge script and the "watch Play reviews" reflex.
3. **The dependency:** once baselines accumulate across model versions, removing the harness means losing the only record of how the feature behaved on nano-v2 vs v3 vs v4 — a switching cost the developer *endorses*, because it's their own regression history.

**First adopter:** a serious productivity or communication app already on the Prompt API in production (the Grammarly-class shop that would otherwise build this itself). **Second wave:** unlocked when one such app publishes a reference integration — platform tooling spreads by visible reference implementation, and by the DMA-driven influx of third parties onto the managed model in 2027.

---

## Execution plan

- **Developer preview** — ship the harness + 10 starter cases per GenAI API to 3–5 design partners already shipping Prompt API features. *Question it answers:* does a build-time harness change behavior, or do teams still eyeball it? *Evidence collected:* the missing S1 — direct on-device demand.
- **Alpha → Beta** — graduate when `modelVersion` + `tokenUsage` signals are exposed by AICore and at least two partners gate releases on the suite. *Checkable condition,* not "make progress."
- **GA** — commit to a versioned report schema independent of the model, so a baseline recorded today still parses after nano-v5.

**Org dependency, named honestly:** the privileged signals (`modelVersion`, `tokenUsage`) require the **AICore team** to expose them. If they say no, the harness degrades to a test-runner a 3-person team could ship as OSS — i.e. the G1 gate collapses to a fail. This is the single external yes the plan depends on.

---

## The case against

The strongest argument, made fairly: **the core is undifferentiated against a free substitute** (rubric failure mode #7). A competent team can wire promptfoo to a test device with a local HTTP bridge and a cloud judge in a few weeks — the demand agent confirmed that's the existing hand-rolled path. Strip away the two platform-only signals and what remains is a convenience wrapper, which is exactly what a G1 = 3 looks like eighteen months out. Compounding it, **reach is gated to ~3.7%** (failure mode #1, "the API outran the hardware") — if on-device GenAI stays niche, the addressable base stays small. And the premise is **narrower than it first appears**: Google's LoRA adapters already stabilize the canned APIs, so the drift argument only holds for the Prompt API path.

The honest mitigation is not to overclaim reach. It's that (a) the differentiated slices — model-version diffing and token accounting — are precisely the things OSS *cannot* build, (b) shipping first-party is partly a **defensive, credibility move** against Apple's platform-completeness story, where "we have no answer to Evaluations" is itself a cost, and (c) the DMA mandate structurally grows the exposed population by Aug 2027. The live risk to watch is not a competitor — it's **Google absorbing the problem underneath the idea** by folding eval into the Prompt API directly (failure mode #2, your own roadmap eating your API). That would be a *fine* outcome for developers; it just might not need a separate harness to get there.

---

## Kill criteria

**The single observation that reverses this recommendation:** if, by WWDC27 (Jun 2027), iOS developer adoption of Apple's Evaluations framework is visibly weak — few sample apps, thin session follow-through, no third-party tooling built on it — that is direct evidence the on-device eval job doesn't matter *to app developers* even when a platform ships it for free, and this becomes a Shelve. Conversely, a measurable regression attributed to a nano-version swap, documented publicly by a named app, flips it toward Build.

**Load-bearing assumption:** that demand for the proven *cloud* eval job migrates to the *on-device* case as Nano reach grows — the thing S1 cannot yet show.

**Re-check trigger if shelved:** Nano device reach crossing ~10% of the base, or the AICore team exposing a model-version signal (which would make the privileged harness cheap to build and the OSS version cheap to build *against* you).

---

## Fit for this team

ML Kit, not MediaPipe, LiteRT, Firebase, or AI Edge. The harness must measure outputs of the **AICore-managed Gemini Nano** path — and ML Kit GenAI is the sanctioned front door to exactly that path. AI Edge Portal and `google-ai-edge/eval` target **self-hosted LiteRT-LM model files** (which you *can* pin, so they have a different, smaller drift problem) and measure performance, not output quality. Firebase's eval story is cloud Vertex. The one genuine tension: "eval/benchmark" is already an **AI Edge brand**, so there's a real org-placement argument this belongs there. The deciding fact is which model it measures — the managed, unpinnable one is ML Kit's, and the harness is only interesting *because* that model drifts. If the conclusion were that AI Edge should own it, that would be worth saying; here, the managed-path ownership points to ML Kit.

---

## Open questions

- **How many apps actually ship a Prompt API feature today?** Not public. Settle it with first-party telemetry the ML Kit team already has internally.
- **Does AICore expose, or can it expose, a stable model-version string and per-request token usage to apps?** The entire G1 gate hinges on this. Settle it with the AICore team.
- **Is on-device LLM-as-judge good enough to score a sibling on-device model's output,** or does credible scoring require a cloud judge (undercutting the on-device pitch)? Settle it with a feasibility prototype on nano-v4/Gemma-4 E4B.
- **Exact ML Kit vs TF Lite adoption figures** — AppBrain's ML Kit row and per-category ≥50K counts were behind blocked hosts; verify if `appbrain.com` and `apilevels.com` are allow-listed.
- **Did ML Kit ship any eval tooling between Aug and Nov 2026?** The `developers.google.com` release-notes page did not fetch directly in this session; the negative rests on search excerpts. Confirm against the live page.

---

## Runners-up

- **On-device text embeddings API** (Type A) — strong demand (semantic search, RAG), but **already shipped**: MediaPipe Text Embedder + EmbeddingGemma cover it. Converts to a convergence/Type-B story, not whitespace. Lost on novelty.
- **On-device content-moderation classifier** (Type G) — strong whitespace + regulatory timing, but fails on **tunability**: safety is each company's proprietary policy surface, so a one-size classifier dies on contact with a real trust-and-safety team. Gate risk.
- **On-device neural TTS** (Type A) — genuine whitespace (Google has no modern API; Picovoice Orca sells into it), but **feasibility risk** on the p50 device, and a narrower reach story. Park with a re-check trigger.
- **Output-stability / model-version contract** (Type E) — strong platform privilege, but a **subset** of this idea's motivation; folded in as the "why now" rather than run as its own report.

---

## A note on this run's format

This skill *generates* one deep, researched opportunity per run rather than fetching an external idea feed, so there is no author/votes/status feed to report — the "metadata" a reader should treat as the idea's standing is the **rubric scoring** (type, verdict, opportunity score) above. There was **no prior ledger or earlier run** in this repository, so every candidate here is new this run; the lead idea plus the four runners-up are the "top ideas" surfaced. The highest-priority / most time-sensitive signal is the **competitive clock**: Apple shipped the analogous Evaluations framework at WWDC26, which is the fact that most argues for acting now.

---

*Sources:*
- [ML Kit — Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)
- [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Android Developers Blog — latest Gemini Nano with ML Kit GenAI (Aug 2025)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)
- [AICore — Gemini Nano](https://developer.android.com/ai/aicore)
- [Vertex AI Gen AI evaluation service](https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview)
- [AI Edge Portal (Google Cloud blog)](https://cloud.google.com/blog/products/ai-machine-learning/benchmark-llms-on-device-with-ai-edge-portal)
- [google-ai-edge/eval](https://github.com/google-ai-edge/eval)
- [Firebase AI Logic — hybrid on-device](https://firebase.google.com/docs/ai-logic/hybrid/android/get-started)
- [Apple — Evaluations framework, WWDC26 Session 298](https://developer.apple.com/videos/play/wwdc2026/298) · [token counting / usage, Session 241](https://developer.apple.com/videos/play/wwdc2026/241) · [What's new in ML](https://developer.apple.com/machine-learning/whats-new/)
- [promptfoo](https://github.com/promptfoo/promptfoo) · [OpenAI evals](https://github.com/openai/evals) · [deepeval](https://github.com/confident-ai/deepeval) · [Ragas](https://github.com/explodinggradients/ragas)
- [How Is ChatGPT's Behavior Changing over Time? (arXiv 2307.09009)](https://arxiv.org/abs/2307.09009)
- [OpenAI acquires promptfoo](https://promptfoo.dev/blog/promptfoo-joining-openai) · [ClickHouse acquires Langfuse](https://www.webpronews.com/clickhouse-acquires-langfuse-raises-400m-at-15b-valuation-for-ai-push) · [Braintrust Series A](https://www.braintrust.dev/blog/announcing-series-a)
- [Grammarly engineering blog](https://www.grammarly.com/blog/engineering/) · [ProAndroidDev — Why a 1B On-Device LLM Needs a Harness](https://proandroiddev.com/why-a-1b-on-device-llm-needs-a-harness-4068cf22e818)
- [AppBrain — machine-learning SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels.com](https://apilevels.com/)
- [EU DMA — Alphabet interoperability (AI services) proceeding](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [killedbygoogle](https://killedbygoogle.com/)
