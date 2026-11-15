# Model Pinning & Output-Stability Contract for ML Kit GenAI — bring the cloud's version pin down to on-device

**Type:** E — Delivery & lifecycle · **Verdict:** Prototype (developer-preview to collect demand evidence) · **Opportunity: 7/10 (Foundational)**
*2026-11-15 · Prepared for Android ML Kit · Evidence current as of 2026-11-15*

> A developer at a fintech app ships a feature that parses Gemini Nano's Structured Output into a Kotlin `@Generable` object on a Pixel 10. It works. Six weeks later, AICore pushes nano-v4 to that device through a Play system update, the model's output distribution shifts, a field the parser expected comes back malformed, and the feature throws `STRUCTURED_OUTPUT_INVALID_VALUE` (-105) in production — with no code change on their side and no way to pin the model that worked. ML Kit's own docs warn this can happen; they give the developer a read-only version string and no way to hold a version still. The one number that matters: today a developer can pin an exact Gemini model on Google's *cloud* path and cannot on the *on-device* path.

**Badges:** *Nobody else has it* · *Google already does this on cloud, not on-device* · *Demand proven on cloud, unproven on-device*

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Foundational | composite 3.55 × 2 = 7.1 → 7; no gate scored 3; S1 not a 5, so no bonus. Reach (S2) is the drag that keeps it off 8 |
| Platform privilege (gate) | 5/5 — pass | AICore pushes Nano via Play system updates and is system-controlled; only the model's owner can pin it. [AICore](https://developer.android.com/ai/aicore) |
| Feasibility headroom (gate) | 4/5 — pass | AICore already keeps prior + updated model resident ~3 days for rollback — multi-version residency is a solved mechanism; the contract pins version + schema, not determinism ([prior-art, AICore dev preview](https://developers.google.com/ml-kit/genai/aicore-dev-preview)) |
| Durability (gate) | 4/5 — pass | EU DMA decision (16 Jul 2026) mandates third-party *access and customisation* of Google's on-device models — a regulatory tailwind for exactly this; capped by ML Kit/AI-Edge org-convergence uncertainty |
| Demand evidence (25%) | 3/5 | Cloud analogue strong and recent ([Anthropic pin removal](https://news.ycombinator.com/item?id=47775389), [promptfoo 27k★](https://github.com/promptfoo/promptfoo)); **zero documented on-device Nano breakage yet** |
| Install-weighted reach (15%) | 2/5 | GenAI gated to ~3.7% of the fleet (140M Nano / ~3.8B actives); real but flagship-only today |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Borrow = ship your own `.task`/GGUF weights and leave the managed path entirely; no managed-path pin exists to self-build |
| Integration cost / TTFHW (15%) | 4/5 | Additive to the Prompt API; `getBaseModelName()` and `STABLE`/`PREVIEW` stages are building blocks already shipping |
| Substitute half-life (15%) | 4/5 | Structural: the platform controls model updates, so the tension can't self-resolve; DMA extends relevance |
| Strategic complement (10%) | 5/5 | De-risks the whole GenAI portfolio for serious apps; Apple is moving the *opposite* way (removing adapters in OS 27) |
| **Composite** | **3.55** | Prototype band (3.0–3.9): structurally strong, demand and reach soft |

*Least trustworthy score: Demand (S1). The entire demand case transfers from cloud LLMs; there is no public report of a Gemini Nano version update breaking a specific app's parsing, because the raw Prompt API is still Beta and few apps parse its output yet.*

---

## The problem

The job, stated as a developer's: *"I shipped a feature that reads structured data out of the on-device model. I need the output to mean the same thing next quarter as it does today, or I can't put it in front of users."* The customer is an Android engineer, not an ML engineer — their team's ML people are server-side ([the org split every large consumer app has](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)) — and the competing solution is the model they can't control.

ML Kit GenAI is built on a model the *platform* owns and updates. AICore "manages the distribution of Gemini Nano and handles future updates" ([AICore](https://developer.android.com/ai/aicore)); updates arrive through Google Play system updates, not developer action, and all apps on a device share one base model. This is the right design for a managed platform — and it structurally produces the problem. The developer writes code against the behavior of one model version and the platform swaps the model under them. ML Kit's own "Select a model" documentation states the consequence plainly: **"Different versions of Gemini Nano may return different output from the same prompt."** The only control offered is a read-only `getBaseModelName()` and a two-level `ModelReleaseStage.STABLE` / `PREVIEW` selector — you can *read* which build you got, and you cannot *hold* it.

This is not an accident of immature tooling that a bug-fix closes. It is the permanent tension of any system-managed on-device model: the platform must update the model (quality, safety, battery — nano-v4 claims "up to 4x faster" and "up to 60% less battery" ([Gemma 4 blog, Apr 2026](https://developer.android.com/blog/posts/gemma-4-the-new-standard-for-local-agentic-intelligence-on-android))), and the developer must have a stable surface to build on. Those pull in opposite directions, and today the platform resolves the tension entirely in its own favor for the developer-facing Prompt API.

What do developers do instead today? Three options, all bad. (1) Stay on the six fixed task APIs (Summarize, Proofread, Rewrite, Image Description, Speech, and the structured task helpers), which Google stabilizes for them — more on this below. (2) Leave the managed model entirely and ship their own weights via MediaPipe LLM Inference / LiteRT-LM ([docs](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference)), paying in APK size, model maintenance, and lost hardware acceleration. (3) Ship on the raw Prompt API and absorb the drift risk — which almost nobody sophisticated will do for a feature that matters.

---

## Proof & signals

The on-device version of this pain is **not yet publicly documented** — say that first, because it's the honest weak point. What *is* documented is (a) the cloud analogue, strongly and across every vendor, and (b) the platform's own acknowledgment that the on-device risk is real.

- **The platform already names the risk — and engineers around it, but only halfway.** Google's August 2025 announcement states, verbatim: *"By shipping GenAI APIs with LoRA adapters, we ensure each API meets our quality bar regardless of the version of Gemini Nano running on a device"* ([Android Developers Blog, Aug 2025](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)). This is the single most important signal in the report: Google treats version drift as a risk worth engineering against — but the LoRA-adapter guarantee covers only the six fixed task APIs, **not** the raw Prompt API and Structured Output, where the developer defines the contract and parses the output themselves. The gap is a line Google has already drawn and left half-crossed. *(Google-published.)*
- **Developers demand pinning and revolt when it's removed.** When Anthropic moved a model to an undated alias that "always refers to the newest version," a developer posted *"applications built on Sonnet can break unpredictably when the version changes"* and that they "could not find a way to pin a specific version" ([HN, 2026](https://news.ycombinator.com/item?id=47775389)). *(Community thread; verbatim surfaced via search.)*
- **Schema validation changed under production apps, without notice.** OpenAI's community forum: *"Structured Output Schema Validation Changed Without Notice — Previously Valid Schemas Now Rejected"* ([2026](https://community.openai.com/t/structured-output-schema-validation-changed-without-notice-previously-valid-schemas-now-rejected/1384139)); and a pipeline stable "almost a year" that began "returning JSON objects with missing dictionary keys and keys at the wrong level" with prompts unchanged, to which OpenAI staff replied that JSON mode "does not guarantee that the response will follow a specific schema" and pointed users to **pinning snapshots** ([2026](https://community.openai.com/t/chat-completion-responses-suddenly-returning-malformed-or-inconsistent-json/1368077)). *(Vendor forum.)*
- **Someone built the tooling, and it has real traction.** promptfoo — prompt/output regression testing with explicit **model-drift** detection — sits at ~27k stars and was acquired by OpenAI; its docs name "provider model updates" as a top cause of drift ([repo](https://github.com/promptfoo/promptfoo), [drift docs](https://www.promptfoo.dev/docs/red-team/model-drift/)). A funded, acquired tool whose job is detecting output drift is willingness-to-pay for the problem this contract would prevent. *(OSS traction + vendor doc.)*
- **It reaches Google's own stack.** Google AI Studio's developer forum: *"Structured outputs just suddenly started failing"* on one model while others with the identical prompt and schema worked ([discuss.ai.google.dev, 2025–26](https://discuss.ai.google.dev/t/structured-outputs-just-suddenly-started-failing/78731)). *(Community thread.)*
- **The absence signal.** The `googlesamples/mlkit` issue tracker shows no on-device drift complaints yet. I read that as *too early*, not *no pain* — the Prompt API reached Beta only in 2026 and Structured Output's schema compiler is still `alpha1`, so the apps that will feel this haven't shipped at volume. Silence here is a timing fact, not a verdict.

---

## Why now

1. **Capability shift — the surface that exposes drift just shipped.** Structured Output landed on the Prompt API in 2026 (`@Generable`/`@Guide` → typed Kotlin objects, error codes `-104`/`-105`, `finishReason = PARSE_CLASS_ERROR`; schema compiler `com.google.mlkit:genai-schema-compiler:1.0.0-alpha1`). Before structured parsing, "the output changed" was a fuzzy quality complaint; with a typed schema and a hard validation error, drift becomes a **production crash with a stack trace**. The Prompt API itself moved Alpha→Beta (`genai-prompt:1.0.0-beta5`, release notes 2026-10-26).
2. **A model transition is mid-flight.** nano-v4 (Gemma 4 base) was announced Apr 2026 for flagships "later this year," while nano-v3 remains the default; capabilities already gate on version (System Instructions need v3+, Thinking Mode needs v4+), and the known-issues page already lists build-specific behavior (prefix caching failing on nano-v4 with FAST) ([Gemma 4 blog](https://developer.android.com/blog/posts/gemma-4-the-new-standard-for-local-agentic-intelligence-on-android); [9to5Google, Apr 2026](https://9to5google.com/2026/04/02/gemini-nano-4-android/)). A live v3→v4 rollout is precisely when drift bites.
3. **Regulatory shift — the DMA points the same way.** The European Commission's final decision on Alphabet interoperability (adopted **16 July 2026**) requires Google to let third parties "discover, access, use and customise all on-device models that are part of Google Android," Gemini Nano included. A developer-controllable, versioned handle on the on-device model is not just a nicety under that regime — it's closer to the direction the Commission is compelling. *(Decision date and on-device-model scope confirmed via legal-press and the EC business portal; the widely-cited "Android 18 by 1 August 2027" implementation date appears in third-party press only and should be verified against the EC decision text before it's load-bearing.)*

---

## The capability gap

| Surface | Pin an exact version? | Output-stability contract? | Source |
|---|---|---|---|
| ML Kit Prompt API (on-device) | No — read-only `getBaseModelName()` + `STABLE`/`PREVIEW` stage | No; docs warn output may differ across versions | [select-model](https://developers.google.com/ml-kit/genai/prompt/android/select-model) |
| ML Kit release notes / known issues | No deprecation or support-window policy found | No | [release-notes](https://developers.google.com/ml-kit/release-notes) |
| Firebase AI Logic — **cloud** path | **Yes** — exact string (e.g. `gemini-3-flash-preview`) | Usual pinned-string stability | [config options](https://firebase.google.com/docs/ai-logic/hybrid/android/configuration-options) |
| Firebase AI Logic — **on-device** path | No — category-based (`STABLE`/`PREVIEW`) only | No | same |
| Apple Foundation Models | No; model shifts across OS (26.4→27); **removing custom adapters in OS 27** | No; "inherently non-deterministic"; ships Evaluations (measurement, not stability) | [WWDC26 s241](https://developer.apple.com/videos/play/wwdc2026/241/), [adapter forum](https://developer.apple.com/forums/thread/831314) |
| Qualcomm / Picovoice / MediaPipe / llama.cpp | De-facto, via self-shipped weights | No contract — stability is emergent from a frozen file | [MediaPipe](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference), [Qualcomm AI Hub](https://aihub.qualcomm.com/) |

The exact boundary: **no vendor running a system-managed on-device LLM offers any version-pinning or output-stability contract**, and Apple is withdrawing the one partial mechanism (base-model-bound custom adapters) in OS 27. The only route to reproducible on-device output today is to leave managed models entirely and ship your own weights — which is the main competitor here: not another platform, but MediaPipe/LiteRT-LM self-hosting. The sharpest internal fact is that **Google already pins exact model strings on its cloud path and declines to extend it on-device.** This idea is not catching up to a rival; it is finishing a line Google itself drew.

---

## Proposed surface

A Type E delivery contract: a versioned handle on the managed model plus an observable lifecycle the app can act on. It deliberately does **not** promise bit-identical output — on-device inference is non-deterministic, and promising determinism would be dishonest. It promises three things a developer can actually build on: a pinned base-model version, stable Structured-Output schema conformance for that version, and a guaranteed migration window.

```kotlin
// Opt into a pinned model with a stability channel, instead of "whatever AICore has today"
val options = PromptOptions.builder()
    .setModelPin(ModelPin.resident())          // pin the version currently on this device
    // or .setModelPin(ModelPin.channel(LTS))   // pin to a long-term-support channel
    .build()

// Observe the contract the platform commits to
generativeModel.pinLifecycle.collect { state ->
    when (state) {
        is PinActive            -> { /* nothing to do */ }
        is DeprecationAnnounced -> scheduleRevalidation(state.replacement, state.sunsetDate)
        is GraceOverlap         -> abTestAgainst(state.replacement) // both builds resident
        is MigrationRequired    -> fallToStableOrReprompt()
    }
}
```

**The contract the platform commits to:**
- **Version pin.** The pinned base-model build stays resident and selected for this app until its sunset date, even as AICore updates the shared default for other apps. (AICore already co-resides prior and updated models for ~3 days for rollback; this extends that residency, bounded, for pinned apps.)
- **Schema-conformance stability.** For a pinned version, Structured-Output validation (`-105`) behavior won't regress — a schema that conforms today conforms until sunset. This, not a pin alone, is the real product: a pure version pin blocks a major model switch but not within-version adapter tweaks, so the guarantee has to be about *conformance*, not just the version string.
- **A deprecation window.** A committed minimum overlap (propose ≥ 2 Nano releases or a fixed number of months) between "replacement announced" and "pinned version removed," surfaced through `DeprecationAnnounced(replacement, sunsetDate)` so migration is scheduled, not discovered in a crash.

**What it does not do:** promise identical bytes; pin forever (storage is finite — sunset is real); or apply below the Nano device class.

**Time-to-first-hello-world: under 15 minutes.** Opting into `ModelPin.resident()` is two lines. The honest caveat: handling `DeprecationAnnounced` well is more than hello-world — but the hook is cheap, and an app that ignores it simply falls back to today's unpinned behavior, so there is no cliff for the lazy integrator.

---

## Reach & sizing

Inputs, with provenance: Gemini Nano reaches **140M+ devices** (Google, Apr 2026) against ~3.8B Android actives (third-party) → **~3.7%**, my arithmetic. Structured Output needs API 26+ (≈99% of the fleet, [apilevels mirror](https://apilevels.com/)) — so the real gate is the Nano device class, not the OS floor. The addressable apps are those using the raw Prompt API to parse output, a subset of GenAI adopters.

Using the TensorFlow-Lite/LiteRT analogue for a specialized on-device ML SDK — ~1.08% of apps but ~10.41% of installs ([AppBrain](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks), third-party) — the **install-weighting multiplier is ~9.6×**: this capability lands in rare but high-install apps. Of ~280K apps with ≥50K installs, gate by a specialist-SDK adoption ceiling (~0.5–1% of apps) and by Nano device reach, and the near-term serviceable pool is **low thousands of apps**, install-weighted toward the serious end. Engineering-cost-avoided is modest per app (the pin saves a QA-and-migration burden, not months of build) but concentrated in exactly the apps — fintech, health, enterprise — that will not ship a feature whose output can change under them.

**Sensitivity.** Halve the adoption ceiling and halve the "parses raw output" fraction and the near-term pool drops to the hundreds. The verdict doesn't survive as a *Build* at that point — which is why the honest call is Prototype: the install-weighted reach today is genuinely small, and it grows only as nano-v4+ widens the Nano base. The decision hinges on one unobserved fact (does on-device drift actually break apps at volume?), and that is an experiment, not a sizing argument.

---

## Adoption path

1. **The hook** — a 15-minute opt-in to `ModelPin.resident()` that makes a demo app's Structured-Output feature reproducible across a simulated model bump. The win is "my parser stops being a time bomb."
2. **First real integration** — a regulated app (banking, health, insurance) that currently *refuses* the raw Prompt API ships a parsing feature it previously kept server-side, because the stability contract clears its change-management bar.
3. **The dependency** — once a team's release process assumes "pinned until sunset, migrate on the callback," removing the contract means re-accepting unscheduled drift, which they'd resent — a dependency they'd endorse.

First adopter is a compliance-sensitive app that wants on-device for privacy but can't tolerate silent output change; the second wave is the broad productivity/note-taking/communication category once nano-v4 widens reach and one visible app proves the pattern.

---

## Execution plan

- **Developer preview** — ship `ModelPin.resident()` + a `DeprecationAnnounced` callback to AICore Dev Preview partners during the live nano-v3→v4 transition. Question it answers: *does a managed-path pin materially reduce drift incidents, and do partners actually wire the deprecation callback?* This is also the only way to collect the S1 evidence the report lacks.
- **Alpha/Beta** — graduate when (a) at least one partner reproduces a real v3→v4 drift incident the pin would have prevented, and (b) AICore commits to a residency/storage budget for pinned builds on the target device class.
- **GA** — publish the overlap-window SLA and the schema-conformance guarantee as a versioned, independently-supported contract.

**Org dependency, named honestly:** the public surface is ML Kit's, but the model-residency and delivery machinery is **AICore's** (Android framework). ML Kit cannot ship the residency guarantee alone; AICore has to commit the storage budget and the overlap window. If AICore says no, this degrades to a schema-conformance-only guarantee with no true version pin — worth less, and worth saying so now.

---

## The case against

The strongest version: **the platform already solved this for the surfaces that matter.** The six task APIs carry LoRA adapters that hold a quality bar across Nano versions; those are what most apps use, and they're expanding. The raw Prompt API — the only exposed surface — is Beta, used by few, and those few are sophisticated enough to handle drift themselves. So the contract serves a small, shrinking segment, and the live failure mode is #2 on the rubric's list: **the platform absorbs the problem underneath you.** Google's own LoRA approach, plus a plausible extension of Firebase AI Logic's cloud pin to its on-device path, could close this gap without a new ML Kit surface. A second failure mode is #1, *the API outran the hardware*: stability only matters where GenAI runs (~3.7%), so this reads as a flagship concern today.

The fair rebuttal: a stability contract is a *precondition* for the high-install, regulated apps to adopt the raw Prompt API **at all** — it unlocks a segment rather than serving the current one, and that segment is exactly the install-weighted mass. And the task-API escape hatch only covers the fixed six jobs; the whole point of the Prompt API is the jobs that *aren't* on that list. But the honest weight still lands on "absorption risk is real, and the demand is unproven on-device" — which is why this is a Prototype, not a Build.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Firebase AI Logic (or AICore directly) ships exact-version pinning or an output-stability/deprecation-window contract on the **on-device** path — bringing the cloud-style pin down to on-device under a different team. That is the platform absorbing the problem; ML Kit owning a separate contract becomes redundant. Checkable against Firebase AI Logic release notes and the AICore changelog each quarter.

**Load-bearing assumption:** enough apps will parse raw/structured Prompt API output — rather than staying on the LoRA-stabilized task APIs — for on-device drift to become a production problem worth a public contract.

**Re-check trigger if shelved:** nano-v4 reaches broad rollout **and** the first public report appears of a Nano version update breaking a shipped app's Structured-Output parsing. At that point demand turns direct and this promotes to Build.

---

## Fit for this team

ML Kit owns the Prompt API and is the sanctioned front door to AICore, so the *contract's public surface* belongs here. But two teams have a real claim. **AICore** owns the model-residency machinery the guarantee depends on — so this is ML Kit's contract on AICore's implementation, and must be scoped as a joint commitment. **Firebase AI Logic** already implements exact-version pinning on its cloud path and has the concept in-house; a reasonable person could argue the on-device pin should live there for consistency. The argument for ML Kit over Firebase: ML Kit is the on-device-only, lower-level surface where a developer has *already* committed to the managed Nano path and has no cloud fallback to pin instead — which is exactly the developer who needs this. If the org decides the pin belongs in Firebase AI Logic, that is a legitimate outcome and a more useful conclusion than ML Kit claiming contested territory.

---

## Open questions

- **Is there any documented on-device drift incident?** Not found. This is the gap that most changes the verdict; the developer preview exists to close it.
- **What is AICore's storage budget for co-resident pinned builds on the target device class?** Not published; determines whether a true version pin or only schema-conformance is feasible.
- **Does the DMA decision's text specify a version-access or stability obligation, and on what date?** The 16 Jul 2026 decision and on-device-model scope are confirmed; the "Android 18 / 1 Aug 2027" implementation mapping is third-party press only and needs the EC decision text to confirm.
- **Exact current output-token ceiling.** Docs advise avoiding >4K output; the specific "4096, raised July 2026" figure is unverified.
- **Freshness caveat:** `developers.google.com` did not resolve for direct fetch this session; ML Kit facts rest on WebSearch snippets and the `developer.android.com` doc mirror. Re-verify `select-model`, release notes, and known-issues in a browser before this is load-bearing.

---

## Runners-up

- **On-device user-content moderation classifier (Type G)** — strong platform-privilege and regulatory timing, but ShieldGemma/LlamaGuard run on-device via MediaPipe *today*, so the borrow path is real and the privilege gate is softer than it first looks.
- **Sub-8GB GenAI reach / tiering (Type F)** — the biggest-impact idea (the ~26× gap between classic ML Kit and GenAI reach), but Feasibility is the whole game and an honest version likely lands as a prototype with unproven mid-tier quality; deferred for depth rather than killed.
- **On-device eval / token-accounting harness (Type D)** — Apple shipped an Evaluations framework and ML Kit prescribes a prose eval workflow with no tooling behind it; lost on Platform Privilege (a three-person team can ship an eval harness as a Gradle lib), though the token-accounting piece that needs AICore internals is privileged.
- **On-device neural TTS (Type A)** — clean whitespace (Google ships nothing; Picovoice Orca sells into it), but a model-sourcing and feasibility problem that doesn't fit a lifecycle-contract run; strong standalone candidate for a future report.

---

*Sources:*
- [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai)
- [ML Kit Prompt API](https://developers.google.com/ml-kit/genai/prompt/android) · [Select a model](https://developers.google.com/ml-kit/genai/prompt/android/select-model) · [Structured Output](https://developers.google.com/ml-kit/genai/prompt/android/structured-output)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [Known issues](https://developers.google.com/ml-kit/known-issues)
- [AICore](https://developer.android.com/ai/aicore) · [AICore Dev Preview](https://developers.google.com/ml-kit/genai/aicore-dev-preview)
- [Android Developers Blog — latest Gemini Nano with ML Kit GenAI (Aug 2025)](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)
- [Gemma 4 / Nano 4 (Apr 2026)](https://developer.android.com/blog/posts/gemma-4-the-new-standard-for-local-agentic-intelligence-on-android) · [ML Kit Prompt API Alpha (Oct 2025)](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) · [9to5Google — Gemini Nano 4](https://9to5google.com/2026/04/02/gemini-nano-4-android/)
- [Firebase AI Logic — hybrid config options](https://firebase.google.com/docs/ai-logic/hybrid/android/configuration-options)
- [Apple Foundation Models adapter](https://developer.apple.com/apple-intelligence/foundation-models-adapter) · [Apple forum — adapters discontinued OS 27](https://developer.apple.com/forums/thread/831314) · [WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/)
- [HN — Anthropic version pinning removal](https://news.ycombinator.com/item?id=47775389) · [HN — GPT-4o deprecation](https://news.ycombinator.com/item?id=44839842)
- [OpenAI forum — structured output schema change](https://community.openai.com/t/structured-output-schema-validation-changed-without-notice-previously-valid-schemas-now-rejected/1384139) · [OpenAI forum — malformed JSON](https://community.openai.com/t/chat-completion-responses-suddenly-returning-malformed-or-inconsistent-json/1368077) · [Google AI forum — structured outputs failing](https://discuss.ai.google.dev/t/structured-outputs-just-suddenly-started-failing/78731)
- [promptfoo](https://github.com/promptfoo/promptfoo) · [promptfoo — model drift](https://www.promptfoo.dev/docs/red-team/model-drift/)
- [MediaPipe LLM Inference](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference) · [Qualcomm AI Hub](https://aihub.qualcomm.com/) · [Picovoice picoLLM](https://picovoice.ai/products/language/llm/)
- [AppBrain — ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels](https://apilevels.com/)
- EU DMA — Alphabet interoperability decision, adopted 16 Jul 2026 (EC business portal; Wolters Kluwer Competition Blog)
