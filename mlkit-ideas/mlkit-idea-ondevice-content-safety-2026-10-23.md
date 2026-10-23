# On-Device Content Safety — a one-line moderation classifier apps run on their users' content

**Type:** A (new capability API), with a Type E delivery contract · **Verdict:** Build (developer preview) · **Opportunity: 8/10 (Strong)**
*2026-10-23 · Prepared for Android ML Kit · Evidence current as of 2026-10-23*

> A developer at a 50-person dating app is told by Play review, this week, that the app will be pulled unless it moderates image uploads. Their options today: wire every user photo to Hive at [$3.00 per 1,000 images](https://thehive.ai/pricing) — a line item that grows with every DAU and ships private photos to a third party — or spend a month porting Bumble's open-sourced nude-detector to TFLite and owning the quantization, device testing and model updates forever. ML Kit, the on-device SDK they already use for barcode scanning, has no answer. There is no `ContentSafety.classify()`. This proposes one.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 8/10 — Strong | composite 4.25 → ×2 = 8.5, −1 because two gates sit at exactly 3 (privilege, durability), +1 because S1 is a 5; rounded to 8 |
| Platform privilege (gate) | 3/5 — pass | Models are OSS (ShieldGemma, Llama Guard 3-1B) → a 3-person team *can* ship a Gradle wrapper. Platform's real privilege is system-managed model delivery + a compliance posture, not exclusivity ([ShieldGemma](https://ai.google.dev/gemma/docs/shieldgemma/model_card), [Llama Guard 3-1B](https://huggingface.co/meta-llama/Llama-Guard-3-1B)) |
| Feasibility headroom (gate) | 4/5 — pass | MobileBERT/DistilBERT-INT8 + EfficientNet-Lite total tens of MB, 10–60 ms on a 2021 Pixel-6-class CPU, **no NPU** ([MediaPipe text](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier), [image](https://developers.google.com/edge/mediapipe/solutions/vision/image_classifier)) |
| Durability (gate) | 3/5 — pass | Safety is a permanent need and the DMA all but compels on-device-model access, but classifier output stability across model refreshes is unaddressed and is the live risk |
| Demand evidence (25%) | 5/5 | Priced market (Hive, [Azure Content Safety](https://azure.microsoft.com/en-us/products/ai-services/ai-content-safety)), [nsfwjs 9.0k★](https://github.com/infinitered/nsfwjs), [Bumble built + open-sourced its own](https://github.com/bumble-tech/private-detector), Play hard-requires moderation, HN cost/privacy threads |
| Install-weighted reach (15%) | 4/5 | UGC categories (Social/Communication/Dating + slices) carry outsized install share; classifier runs on ~96% of fleet at minSdk 26 ([apilevels.com](https://apilevels.com/)) vs Nano's ~3.7% |
| Build-vs-buy-vs-borrow (20%) | 4/5 | Borrow (wrap nsfwjs) "mostly works" for simple NSFW; robust multi-harm text+image with updates + multilingual + evasion is 8–16 engineer-weeks and perpetual maintenance the platform absorbs |
| Integration cost / TTFHW (15%) | 5/5 | Designable to one Gradle line, no API key, no dangerous permission, system-delivered model (negligible APK) |
| Substitute half-life (15%) | 3/5 | The general on-device model (Nano via the Prompt API) can be *prompted* to moderate — ML Kit's own roadmap is the substitute. Mitigated by Nano's 3.7% reach and the need for auditable, tunable scoring |
| Strategic complement (10%) | 4/5 | Commoditizes a complement (safety) to Android engagement + Play; differentiates vs iOS's nudity-only `SensitiveContentAnalysis`; reduces Play's own review burden |
| **Composite** | **4.25** | weighted mean of S1–S6 |

*Least trustworthy row:* **install-weighted reach**. The AppBrain per-category app counts (`A_cat`) never rendered through the research tooling, so the app-count SAM is an estimate; the device-reach and install-weighting multipliers behind it are better sourced.

---

## The problem

The job, stated as a developer's: *"My app hosts user content, Play policy makes me liable for it, and I need to screen text and images for harm before they reach other users or my backend — without shipping every byte to a cloud vendor and paying per call."* The customer is an Android engineer under a Play-review deadline, not an ML engineer; the competing solution is their own code or a metered cloud API.

This problem is structurally produced, not accidental. A consumer app that hosts user-generated content operates under three constraints at once. First, **Play makes the developer accountable for content they didn't create** — the [User Generated Content policy](https://support.google.com/googleplay/android-developer/answer/9876937) requires "robust, effective, and ongoing UGC moderation, including an in-app system for reporting and blocking objectionable UGC," and apps get rejected at review for lacking it (a [Discourse app hit exactly this wall](https://meta.discourse.org/t/discourse-google-play-user-generated-content-policy-violation/238395)). Second, **cost scales linearly with DAU**: a per-call cloud moderator is cheap in beta and a margin line item at full rollout, so teams ration it. Third, **the highest-value content is often the content you can't send to the cloud** — a messaging app that promised privacy, or any app handling minors' content under tightening law, cannot route it to a third-party classifier.

What they do *instead* today, concretely: pay [Hive](https://thehive.ai/pricing) (~$3.00/1,000 images, $0.50/1,000 text) or [Azure AI Content Safety](https://azure.microsoft.com/en-us/products/ai-services/ai-content-safety) (per-1,000 records/images); use the free-but-cloud [OpenAI Moderation API](https://developers.openai.com/api/docs/guides/moderation); or hand-roll a classifier by porting aging open weights (Yahoo `open_nsfw`, MobileNet) to whatever runtime they're on. Every one of those workarounds has a cost, and that cost is the price of the proposed API.

This is a platform problem, not an app problem, by the test in the derivation: every UGC app solves it identically and badly, because moderation is table-stakes safety, not product differentiation. A dating app does not win by having a better-engineered nude-detector than a forum app; both just need one that works and passes review. When every app builds the same thing identically and badly, it belongs in the platform.

---

## Proof & signals

**Developers doing it by hand.** [`infinitered/nsfwjs`](https://github.com/infinitered/nsfwjs) — **9.0k stars, 599 forks** — "NSFW detection on the client-side via TensorFlow.js." [`unitaryai/detoxify`](https://github.com/unitaryai/detoxify) — ~1.2k stars, a PyTorch toxic-comment classifier. [`nipunru/nsfw-detector-android`](https://github.com/nipunru/nsfw-detector-android) — an on-device Android nudity classifier, and a swarm of Flutter wrappers (`flutter_nsfw_detector`, `nsfw_detector_flutter`) re-porting the same handful of models. *The repeated re-implementation of the same aging weights across every client runtime is itself the demand signal* (star counts confirmed via direct GitHub fetch; last-push dates recalled, not re-verified).

**Someone charging money for it.** A priced market exists: Hive ($3.00/1,000 images, $0.50/1,000 text), Azure Content Safety (per-1,000, 5,000/month free tier), [Amazon Rekognition](https://aws.amazon.com/rekognition/pricing/) (~$0.001/image), plus enterprise players [Checkstep](https://www.checkstep.com/) and [Bodyguard.ai](https://www.bodyguard.ai/). Willingness to pay for a vacated capability is the strongest single demand signal, and it's unambiguous here (pricing figures confirmed via search extraction of vendor pages; the dollar values are third-party-sourced because the live pages render rates as placeholders to a fetcher).

**Apps that shipped it themselves.** [Bumble built "Private Detector," a lewd-image classifier, and open-sourced it in Oct 2022](https://github.com/bumble-tech/private-detector) "so that others in the tech community" could reuse it ([TechCrunch](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)). A production dating company building and donating its own classifier is a direct statement that no platform primitive existed. [Reddit's FY2025 10-Q](https://www.sec.gov/Archives/edgar/data/1713445/000171344525000227/rddt-20250930.htm) frames moderation load as a scaling risk requiring "ever-increasing numbers of moderators."

**Community voice.** On Hacker News, "[Built a free moderation API after failing to find one](https://news.ycombinator.com/item?id=46914190)" (the title is the complaint). In a [feed-moderation thread](https://news.ycombinator.com/item?id=47917698), developers state the on-device case plainly: cloud token cost to moderate "an entire infinite-scrolling feed … would be astronomical," and "users don't want to send their private social feeds or DMs to a third-party server." An [Ask HN on UGC moderation](https://news.ycombinator.com/item?id=42830018) shows teams stitching together OpenAI + manual review queues.

**The absence signal.** ML Kit's own GitHub issue volume on this is near-zero — but that is *because ML Kit has no moderation surface to file issues against*, not because the need is absent. The need surfaces in the OSS and commercial layers instead, which is where you'd expect it when the platform has vacated the category.

*Evidence-quality caveat, stated up front because a skeptic will find it:* all five research passes hit WebFetch DNS failures in this environment and fell back to search-engine extraction of the target pages. GitHub repo metrics are directly confirmed; vendor pricing and HN quotes are confirmed via extraction of the live pages (real, dated URLs) but not direct fetches; Reddit and Stack Overflow were entirely inaccessible, so those two channels are unsampled.

---

## Why now

1. **Capability shift (2024–2026).** Safety classification got small enough to run on the wide fleet. Google published [ShieldGemma](https://arxiv.org/abs/2407.21772) (text, Jul 2024) and [ShieldGemma 2](https://arxiv.org/abs/2504.01081) (image, 4B, Mar 2025), and lightweight specialized classifiers now **match or beat cloud moderation APIs on in-domain English** (a small classifier hit F1 0.80 on the OpenAI-Moderation test set where Perspective scored 0.66, [arXiv 2505.02009](https://arxiv.org/abs/2505.02009)). The models exist; the managed API does not.

2. **Competitive/regulatory shift (2026–2027).** The sharpest date is **1 August 2027**: the European Commission's [DMA Article 6(7) specification decision against Alphabet](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) (adopted 16 July 2026) requires Google to expose Android 18 on-device AI capabilities — explicitly including on-device AI models — to third parties, with developer-facing eligibility milestones at 1 Feb and 1 May 2027. Google may have to expose on-device model access *anyway*; shipping a sanctioned classifier is the graceful version of that. Reinforcing it on the demand side: the EU [DSA](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2065) notice-and-action duty (in force since 17 Feb 2024, binds **all** hosting services regardless of size) and the [UK Online Safety Act](https://www.legislation.gov.uk/ukpga/2023/50/contents) illegal-content (17 Mar 2025) and children's-safety (Jul 2025) duties.

3. **Demand shift (2026).** Google's own free toxicity option is disappearing: **Perspective API is sunsetting — service ends 31 Dec 2026, with new-access requests already stopped in Feb 2026 and no migration path** (reported from perspectiveapi.com; *[confirm at primary]*). [Cohere deprecated its Classify endpoint in Sept 2025](https://docs.cohere.com/docs/content-moderation-with-classify). The free cloud toxicity shelf is emptying exactly as the on-device case strengthens — which *widens* the gap this addresses rather than filling it.

Three dated shifts, all real. This is a strong why-now.

---

## The capability gap

Be exact about the boundary. **ML Kit ships no safety, moderation, toxicity, or content-classification API at all** ([release notes](https://developers.google.com/ml-kit/release-notes), [GenAI index](https://developers.google.com/ml-kit/genai)). AICore applies safety filters to Gemini Nano's *own* input and output, but those are internal and non-disableable — they are not a classifier a developer can call on arbitrary user content. [MediaPipe's text classifier](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier) is **bring-your-own-model** — it ships a sentiment benchmark model, not a moderation model. ShieldGemma and [Llama Guard 3-1B](https://huggingface.co/meta-llama/Llama-Guard-3-1B) are **raw open weights** you self-host via LiteRT/MediaPipe, owning conversion, quantization, delivery and updates.

Across the fence: Apple's [Foundation Models](https://developer.apple.com/documentation/foundationmodels) guardrails likewise screen only Apple's own model's I/O. The one genuinely managed, on-device, developer-callable moderation primitive anywhere is Apple's [`SensitiveContentAnalysis`](https://developer.apple.com/documentation/sensitivecontentanalysis) — and it is narrow (nudity-only), iOS-only, and entitlement-gated. Every production service with real coverage — Hive, OpenAI, Azure, Rekognition, Checkstep, Bodyguard, the former Two Hat (folded into Azure) — is **cloud-only** and, bar OpenAI's free tier, metered per call.

So the gap is specifically shaped: *the models exist (ShieldGemma, Llama Guard) and the managed-on-device pattern exists (SensitiveContentAnalysis), but no one has combined them into a one-line managed on-device moderation classifier for developer-supplied UGC on Android.*

**The main competitor** a developer uses today instead: a cloud moderation API — Hive if paying, OpenAI's free Moderation endpoint if not — plus, for simple image NSFW, a borrowed copy of nsfwjs/`open_nsfw`.

---

## Proposed surface

A new ML Kit **vision + NL task API**, `ContentSafety`, that returns *scored, tunable* per-policy classifications the caller acts on — explicitly **not** an autonomous-removal black box. The feasibility work makes the posture non-negotiable: a wide-fleet-sized classifier clears the bar for triage/pre-filter, not for silent removal, especially out-of-domain and non-English.

```kotlin
val safety = ContentSafety.getClient(
    ContentSafetyOptions.Builder()
        .setPolicies(HARASSMENT, SEXUAL, VIOLENCE, SELF_HARM, DANGEROUS, SPAM)
        .build()
)

// Text
val result: SafetyResult = safety.classify(userMessage).await()
result.score(HARASSMENT)      // 0.0..1.0 calibrated confidence
result.flagged(threshold = 0.8)  // caller sets the bar per policy
result.reviewRecommended      // true when near the decision boundary

// Image
safety.classify(InputImage.fromBitmap(photo)).await()
```

- **Inputs/outputs:** text (≤ a few KB) or an `InputImage`; returns per-policy calibrated scores in 0..1 plus a `reviewRecommended` flag for the boundary zone. The caller owns thresholds and the removal/queue decision.
- **Model class behind it:** a Google-tuned lightweight classifier (a ShieldGemma-distilled / MobileBERT-class text head + an EfficientNet-Lite-class image head), INT8, tens of MB.
- **Device requirements:** **minSdk 26, no NPU required**, runs on CPU on the wide fleet; model **system-delivered via [Play for On-device AI](https://developers.google.com/ml-kit/release-notes)** so it isn't bundled into every APK and updates centrally. Works offline after first download.
- **What it deliberately does *not* do:** (1) **CSAM** — carved out explicitly; CSAM detection legally requires hash-matching (PhotoDNA/PDQ) against restricted databases and mandatory [NCMEC reporting under 18 U.S.C. §2258A](https://www.law.cornell.edu/uscode/text/18/2258A), which a generic classifier cannot discharge. The API should refuse to pose as a CSAM tool and point to the hash-matching regime. (2) **Autonomous removal** — it scores, the app decides. (3) **A legal-compliance guarantee** — it is a tool, not a safe harbor.

**TTFHW target: under 15 minutes.** Achievable because: one Gradle line, no console project, no API key, no new dangerous permission, model fetched by Play services (negligible APK delta), works in the emulator. If any of those slips — e.g. an API key or a dangerous permission creeps in — that's a design failure, not a footnote, because each step compounds down the adoption funnel.

---

## Reach & sizing

Inputs, each with provenance (AppBrain figures are third-party crawl estimates; device buckets are Google-published bands):

- Total Play apps: **~2.03M** ([AppBrain](https://www.appbrain.com/stats/number-of-android-apps), third-party).
- `A_cat` (serious UGC apps, ≥50K installs, across Social/Communication/Dating + UGC slices of Photography/Video/Entertainment/Games): **~25,000–50,000 — estimate, softest input** (the AppBrain category table would not render; only the Tools row, 25,202 apps ≥50K, was readable).
- `r_reach` = **0.96** at minSdk 26 ([apilevels.com](https://apilevels.com/), Statcounter-derived, third-party).
- `m_install` (install/app multiplier for a specialized on-device ML SDK): **~9–10×** store-wide, from TensorFlow Lite's 1.08% apps / 10.41% installs ([AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)).
- `c_ceiling` (3-yr adoption, % of eligible apps): TFLite sits at ~1–2% of *all* apps, but within the *UGC-serious* pool a Play-compliance-driven free SDK should run higher — assume **10–25%**.

**Arithmetic (mine):**
- Eligible SAM = 25,000–50,000 × 0.96 ≈ **24,000–48,000 apps**.
- SOM (year 3) = Eligible SAM × 0.10–0.25 ≈ **2,400–12,000 adopting apps**.
- Engineering cost avoided = SOM × (E_diy − E_int) × loaded weekly cost. With E_diy ≈ 8–16 wk (source/quantize/device-test/multilingual/maintain) and E_int ≈ 1 wk → Δ ≈ 7–15 wk; at ~$8,000/wk: 2,400 × 7 × $8k ≈ **$134M** at the low end, 12,000 × 15 × $8k ≈ **$1.4B** at the high end.
- **Platform test:** build + 5-yr maintenance of a classifier API ≈ $10–30M. Even the low-end $134M clears **>4×**, the midpoint clears **>10×**. Passes.

**Install-weighted reach** is the number that matters for a platform, and it's the robust one: adopters skew to giants. The named UGC anchors alone — WhatsApp (10B+), Instagram (5B+), Telegram/Snapchat/TikTok (1B+), Discord (~690M), Tinder (~530M), Reddit/Bumble (100M+) — mean that even a few dozen adoptions cover a large share of Social/Communication/Dating install surface. Honest framing: **high install-weighted reach within UGC categories; modest as a share of *all* Android installs.**

**Sensitivity.** Halve the two softest inputs (`A_cat` and `c_ceiling`): SOM ≈ 600–3,000 apps, cost avoided ≈ $34–360M — still clears the platform test. **The verdict survives**, because the device-reach (96%) and install-weighting (10×) multipliers, not the shaky app count, carry it. Cross-check against revealed demand (nsfwjs 9k★, Bumble, Detoxify, a Flutter wrapper ecosystem): real but modest, which argues for the *lower* end of `c_ceiling` and against the $1.4B headline.

---

## Adoption path

1. **The hook (15 min):** a dating/forum/chat developer facing Play review drops in one Gradle line and gets `safety.classify(image)` returning a nudity score before resubmitting — the fastest path through the UGC-policy gate that exists.
2. **First real integration:** they route uploads and messages through it as a pre-filter feeding their report/review queue, replacing either a Hive bill that grew with DAU or a hand-ported TFLite model they didn't want to maintain.
3. **The dependency:** once thresholds are tuned to their community and the pre-filter is load-bearing for Play compliance, removing it means rebuilding the model pipeline and re-owning updates — a cost they'd endorse, because the thing they're offloading is perpetual maintenance against evolving evasion, not a feature.

**Who adopts first:** mid-size UGC apps under Play-review or EU/UK compliance pressure that lack an in-house ML team — the segment that today borrows nsfwjs. **Who follows:** larger social/dating apps adopt it as a cheap, private pre-filter ahead of their existing cloud/human stack (not a replacement). **Second wave unlock:** one visible reference app (a Bumble-scale name) publicly citing it, plus the DMA 1 Aug 2027 milestone normalizing on-device model APIs.

---

## Execution plan

- **Developer preview (Q1):** ship text-first, English, scored output, backed by a distilled ShieldGemma-class head delivered through Play for On-device AI. *Question it answers:* do developers accept a scored/tunable triage API over a cloud yes/no? *Partners:* 3–5 mid-size UGC apps. *Evidence collected:* calibration vs their ground truth, threshold behaviour, false-positive tolerance.
- **Alpha/Beta:** add the image head and a stated multilingual set. *Graduation condition (checkable):* ≥0.75 F1 on a held-out multilingual in-domain benchmark at the shipped model size, and preview partners keeping it in the review loop after 60 days.
- **GA:** commit the surface **plus an output-stability contract** — scores versioned independently of the model, with a migration window when the model refreshes, because a classifier whose scores silently shift on update is worse than one you never shipped.

**Org dependencies, honestly:** this needs the AICore/Play-for-On-device-AI team to deliver and update the model (the Type E half of the idea), and a Trust & Safety sign-off on tunability and liability framing. If Play-for-On-device-AI won't host the model, it falls back to a bundled model and the APK-size and privilege arguments both weaken. If T&S insists safety is each company's proprietary policy surface, the one-size classifier has to become clearly "a signal, not a verdict," or the idea dies on contact.

---

## The case against

The strongest argument against is adoption failure mode #2, **the platform absorbs the problem underneath you — and it's your own roadmap doing it.** ML Kit's Prompt API already has structured output (Alpha, Jul 2026) and system instructions; a developer can prompt Gemini Nano with "classify this message for harassment, return JSON." If Google leans into that, a dedicated classifier looks redundant. This is the real reason S5 is only a 3. The honest rebuttals: Nano reaches ~3.7% of the fleet while this classifier reaches ~96%; a 50 ms CPU classifier is far cheaper and lower-latency than decoding a 3B model for a yes/no at feed scale; and regulators and T&S teams want *auditable, calibrated, versioned* scores, not a free-form LLM's mood. But if Nano coverage crosses ~40% **and** the Prompt API gets a reliable low-latency classification mode, the dedicated API's rationale genuinely collapses to "a Prompt recipe."

The second argument is #7, **undifferentiated against a free substitute.** For simple image NSFW, nsfwjs is right there and free. The defense is narrow and real: the platform's durable value isn't the first classification, it's absorbing the *maintenance* — multilingual coverage, adversarial-evasion updates, device testing, and system-managed delivery without APK bloat — which is exactly what kills borrowed code eighteen months later. If the idea can't credibly promise *better-maintained than your fork of nsfwjs*, it's a feature, not a platform API.

The third is the **tunability/liability trap** specific to safety APIs: one classifier cannot encode every app's content policy, and a Google-branded "safety" tool invites developers to treat it as a compliance guarantee it legally isn't. Mitigation is in the product shape — scored not binary, caller-set thresholds, `reviewRecommended`, CSAM explicitly carved out, and documentation that says "signal, not safe harbor." These mitigations are load-bearing, not garnish.

---

## Kill criteria

**The single observation that reverses this:** Google ships a first-class, managed, on-device safety/moderation **task** (in ML Kit *or* MediaPipe) backed by a delivered model before developer preview — then there's nothing to build, promote a runner-up. Checkable against the [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) and MediaPipe task list each run.

**Load-bearing assumption:** that a wide-fleet-sized classifier (<~80 MB) clears ~0.75 F1 on *multilingual in-domain* content. If an independent benchmark shows the best model at that size falls below ~0.7 F1 multilingual, the autonomous/pre-filter case dies and only "triage signal for human review" survives — a much smaller idea.

**Re-check trigger if shelved:** the DMA 1 Aug 2027 compliance milestone, or Perspective's 31 Dec 2026 shutdown landing with no Google on-device replacement — either would re-open it.

---

## Fit for this team

ML Kit is the right front door, not MediaPipe or Firebase AI Logic. The target developer is an Android engineer who already uses ML Kit for barcode scanning and text recognition and wants a *task-shaped, one-line, model-included* API — the exact ergonomic ML Kit exists to provide and MediaPipe (bring-your-own-model) deliberately doesn't. Firebase AI Logic is the wrong home because it's cloud-capable and cross-platform, which defeats the on-device privacy/cost thesis. The honest tension: MediaPipe Tasks *could* ship this as a ready "content safety" task and arguably should own the model plumbing, so the clean division is **ML Kit owns the developer-facing task API; MediaPipe/AICore owns the model and delivery** — the same split ML Kit GenAI already has with AICore. The risk to name: if this lands in both ML Kit and MediaPipe uncoordinated, it fragments the story further, which is this ecosystem's chronic failure.

---

## Open questions

- **Per-category app counts.** `A_cat` is an estimate; the AppBrain category table (Social/Communication/Dating ≥50K-install rows) needs a manual browser read to firm up the SAM. *Settled by:* opening [the AppBrain category page](https://www.appbrain.com/stats/android-market-app-categories) directly.
- **Perspective sunset date.** The 31 Dec 2026 shutdown is reported from perspectiveapi.com via search extraction, not a direct fetch. *Settled by:* loading perspectiveapi.com in a browser.
- **Multilingual quality at mobile size.** No clean head-to-head of a <80 MB classifier across languages exists. *Settled by:* benchmarking a distilled ShieldGemma head on a held-out multilingual set.
- **Will Play-for-On-device-AI host a first-party ML Kit model?** Determines whether the APK-size and privilege arguments hold. *Settled by:* an internal conversation with that team.
- **Does ML Kit's own Prompt-API roadmap already plan a classification mode?** If so, this is a recipe, not an API. *Settled by:* the internal roadmap.

---

## Runners-up

- **On-device eval / quality-measurement tooling (Type D, whitespace #9)** — sharp gap (Apple shipped an Evaluations framework; ML Kit *prescribes* a prose eval workflow with no tooling), fast to build. Lost on S1: developers don't loudly demand eval harnesses because they don't know they need them — thinner external demand than moderation.
- **Modern on-device neural TTS (Type A, whitespace #1)** — Google has no neural TTS developer API; Picovoice sells Orca; Apple shipped speech generation. Lost on feasibility/size: quality TTS at mid-tier size is a harder G2 story than a classifier.
- **Deferred/opportunistic inference scheduling (Type E, whitespace #8)** — maximum platform privilege, real production pain (foreground-only + quotas). Lost on S1: the pain is invisible in demos and under-voiced publicly, so demand evidence is thin.
- **Guaranteed schema-constrained output (Type B)** — strong DIY demand, but **ML Kit shipped Structured Output (Alpha) in Jul 2026**, so it's a narrower extension than it first appears — demoted on arrival.
- **On-device embeddings / local-RAG API (Type A)** — real trend, but EmbeddingGemma + MediaPipe text embedder already cover much of it; closer to a packaging job than whitespace.

---

*Sources:*
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit GenAI](https://developers.google.com/ml-kit/genai)
- [MediaPipe text classifier](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier) · [MediaPipe image classifier](https://developers.google.com/edge/mediapipe/solutions/vision/image_classifier)
- [ShieldGemma model card](https://ai.google.dev/gemma/docs/shieldgemma/model_card) · [ShieldGemma (arXiv 2407.21772)](https://arxiv.org/abs/2407.21772) · [ShieldGemma 2 (arXiv 2504.01081)](https://arxiv.org/abs/2504.01081)
- [Llama Guard 3-1B](https://huggingface.co/meta-llama/Llama-Guard-3-1B) · [Detoxify](https://github.com/unitaryai/detoxify) · [nsfwjs](https://github.com/infinitered/nsfwjs) · [nsfw-detector-android](https://github.com/nipunru/nsfw-detector-android)
- [Bumble Private Detector](https://github.com/bumble-tech/private-detector) · [TechCrunch on Bumble open-sourcing](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels) · [Apple SensitiveContentAnalysis](https://developer.apple.com/documentation/sensitivecontentanalysis)
- [Hive pricing](https://thehive.ai/pricing) · [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation) · [Azure AI Content Safety](https://azure.microsoft.com/en-us/products/ai-services/ai-content-safety) · [Amazon Rekognition pricing](https://aws.amazon.com/rekognition/pricing/) · [Checkstep](https://www.checkstep.com/) · [Bodyguard.ai](https://www.bodyguard.ai/) · [Cohere Classify deprecation](https://docs.cohere.com/docs/content-moderation-with-classify)
- [Perspective API](https://perspectiveapi.com/)
- [Google Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937) · [Enabling safe AI experiences (Android blog)](https://android-developers.googleblog.com/2024/06/enabling-safe-ai-experiences.html) · [Discourse Play rejection thread](https://meta.discourse.org/t/discourse-google-play-user-generated-content-policy-violation/238395)
- [EU DSA (Reg. 2022/2065)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2065) · [DMA Alphabet interoperability decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [UK Online Safety Act 2023](https://www.legislation.gov.uk/ukpga/2023/50/contents) · [Ofcom online safety](https://www.ofcom.org.uk/online-safety/) · [KOSA (S.1748)](https://www.congress.gov/bill/119th-congress/senate-bill/1748) · [California AB 2273](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202120220AB2273)
- [18 U.S.C. §2258A (CSAM reporting)](https://www.law.cornell.edu/uscode/text/18/2258A) · [NCMEC CyberTipline](https://report.cybertip.org/)
- [HN: free moderation API](https://news.ycombinator.com/item?id=46914190) · [HN: moderating a feed on-device](https://news.ycombinator.com/item?id=47917698) · [HN: Ask HN UGC moderation](https://news.ycombinator.com/item?id=42830018)
- [Reddit FY2025 10-Q](https://www.sec.gov/Archives/edgar/data/1713445/000171344525000227/rddt-20250930.htm)
- [AppBrain app count](https://www.appbrain.com/stats/number-of-android-apps) · [AppBrain categories](https://www.appbrain.com/stats/android-market-app-categories) · [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks) · [apilevels.com](https://apilevels.com/)
- Feasibility quality studies: [arXiv 2505.02009](https://arxiv.org/abs/2505.02009) · [arXiv 2505.04640](https://arxiv.org/abs/2505.04640) · [arXiv 2501.01256](https://arxiv.org/abs/2501.01256) · [DistilBERT (arXiv 1910.01108)](https://arxiv.org/abs/1910.01108)
