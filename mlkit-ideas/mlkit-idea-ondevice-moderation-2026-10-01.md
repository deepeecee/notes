# On-Device Content Safety API — a one-line, calibrated moderation classifier that never leaves the phone

**Type:** G — Trust, safety & compliance (with strong Type F / reach characteristics) · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Strong, gated)**
*2026-10-01 · Prepared for Android ML Kit · Evidence current as of 2026-10-01*

> A developer at a 3M-install dating app is wiring up a report-a-photo flow on a Tuesday. There is no on-device way to screen an image before it hits their server, so they POST every upload to Hive at $3 per 1,000 images, eat 200ms of round-trip on the happy path, and write a Data Processing Agreement because they are now shipping possibly-illegal user content to a US processor. The capability to catch the obvious cases locally exists — Apple already runs nudity detection on every iPhone — but Google ships no API for it. ML Kit could: a `ContentSafety.classify(text|image)` call returning calibrated per-category scores, on-device, no key, on ~96% of Android.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, gated | composite 3.9 × 2 = 7.8, −1 for two gates at exactly 3, +1 for S1=5 → ~7.8, rounded to 7 to reflect the durability/substitute drag |
| Platform privilege (gate) | 3/5 — pass (weakest gate) | Google owns ShieldGemma + AICore safety infra + Play for On-device AI delivery + the app-store trust/liability boundary; but OSS wrappers already exist ([open_nsfw_android, 1,958★](https://github.com/devzwy/open_nsfw_android)) |
| Feasibility headroom (gate) | 4/5 — pass | Quantized DistilBERT/MobileBERT-class text classifier ≈ tens of MB, ~30–75ms, API 24+, no NPU ([TF.js toxicity, ~25MB/~30ms](https://github.com/tensorflow/tfjs-models/tree/master/toxicity)); Apple ships on-device image safety fleet-wide ([SensitiveContentAnalysis](https://developer.apple.com/documentation/sensitivecontentanalysis)) |
| Durability (gate) | 3/5 — pass (named risk) | Safety is strategically durable, but **Google is sunsetting its own moderation API, Perspective, after Dec 2026** ([Perspective FAQ](https://support.perspectiveapi.com/s/about-the-api-faqs)) — direct counter-evidence on commitment |
| Demand evidence (25%) | 5/5 | 8+ cloud vendors metering at ~$1–3/1k inferences; 700+ GitHub moderation repos; [nsfwjs 8,997★](https://github.com/infinitered/nsfwjs); DSA + UK OSA make it mandatory |
| Install-weighted reach (15%) | 4/5 | ~21–30% of install-weighted Android surface has moderatable UGC; ~8–18% capturable at a TFLite-class ceiling; reach not flagship-gated (minSdk 24 = 96.6%, [apilevels.com](https://apilevels.com/)) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Strong borrow path for basic image NSFW; but calibrated multi-category text+image, multilingual, with ongoing adversarial maintenance is 3+ engineer-months the platform absorbs |
| Integration cost / TTFHW (15%) | 4/5 | Achievable one-Gradle-line, no key, no dangerous permission; first-use model download is the one friction point (shared with all ML Kit GenAI) |
| Substitute half-life (15%) | 3/5 | On flagships a Nano prompt substitutes today; the wide-reach small-model niche (the ~96% with no Nano) has a structurally longer half-life |
| Strategic complement (10%) | 4/5 | Safer UGC → Play trust + lower platform regulatory exposure + developer gravity; DMA commoditization is a partial offset |
| **Composite** | **3.9** | Top of the Prototype band (3.0–3.9), a hair under Build |

*Least trustworthy score: install-weighted reach (S2). AppBrain's per-category 50K-install columns did not render through fetching, so A_cat is an estimate anchored on one confirmed datapoint (Tools = 23,870 apps above 50K) plus third-party category totals.*

---

## The problem

Every consumer app with user-generated content runs the same loop — a user creates something (a message, a photo, a profile, a listing, a comment) and the app publishes it to other users. The loop leaks at exactly one point: the moment before publish, when the app must decide whether the content is safe. That decision is not the app's differentiation — every dating app, marketplace, forum, and game-with-chat makes the identical decision identically and badly — which is the textbook signature of a platform problem, not an app problem.

Today the median Android team solves it one of three ways, and all three are bad. They **call a cloud vendor** (Hive at [$3/1k images](https://thehive.ai/pricing), AWS Rekognition at [$1/1k](https://aws.amazon.com/rekognition/pricing/), Azure Content Safety at [$1–1.50/1k](https://azure.microsoft.com/en-us/pricing/details/content-safety/)), which meters every inference, adds a network round-trip on the critical path, and turns a third party into a GDPR processor for content that may be illegal. They **borrow an OSS model** — [open_nsfw_android](https://github.com/devzwy/open_nsfw_android), [NudeNet](https://github.com/notAI-tech/NudeNet), [Detoxify](https://github.com/unitaryai/detoxify) — and inherit its maintenance, calibration, and multilingual gaps forever. Or they do **nothing** and wait for a regulator or an app-store review to force the issue.

The app team's org makes this worse. Their ML people are server-side; their Android people are not ML people. A capability that requires both in one head — convert a safety model to a mobile runtime, quantize it, calibrate thresholds, test across the device matrix, keep it current against adversarial drift — is expensive for them precisely because it sits in the seam between two teams. That seam is the platform's opportunity.

The structural reason this problem is permanent, not an artifact of today's tooling: moderation is adversarial and regulated. The set of harms changes (new slurs, new scams, new synthetic-media attacks), and the legal definition of "adequate moderation" changes (DSA, OSA, age codes). An app cannot freeze a classifier and walk away, and a platform that owns the classifier can absorb that recurring cost across every adopter at once.

---

## Proof & signals

- **Someone charging money for it (the strongest signal):** at least eight cloud vendors run a paying business metering moderation — [Hive](https://thehive.ai/pricing) ($3/1k images, $0.50/1k text), [AWS Rekognition](https://aws.amazon.com/rekognition/pricing/) ($1/1k), [Azure Content Safety](https://azure.microsoft.com/en-us/pricing/details/content-safety/) ($1/1k text, $1.50/1k image), [Sightengine](https://sightengine.com/pricing), [WebPurify](https://www.webpurify.com/image-moderation/live/) ($2.60/1k), [Clarifai](https://www.g2.com/products/clarifai/pricing). Paying per call is the exact cost an on-device classifier zeroes out. *All cloud; pricing pages dated 2026-10-01.*
- **Developers doing it by hand:** [infinitered/nsfwjs](https://github.com/infinitered/nsfwjs) (8,997★, pushed 2026-08-04) plus a [React Native mobile port](https://github.com/infinitered/nsfwjs-mobile) — revealed preference for *on-client* moderation; [devzwy/open_nsfw_android](https://github.com/devzwy/open_nsfw_android) (1,958★, offline Android NSFW); [notAI-tech/NudeNet](https://github.com/notAI-tech/NudeNet) (2,463★); [unitaryai/detoxify](https://github.com/unitaryai/detoxify) (1,304★, which monetizes a hosted API). GitHub `topic:content-moderation` = 723 repos, `topic:nsfw` = 578, both with fresh pushes. *GitHub REST, single-repo reads, 2026-10-01.*
- **An app that shipped it itself:** Bumble built [Private Detector](https://medium.com/bumble-tech/bumble-inc-open-sources-private-detector-and-makes-another-step-towards-a-safer-internet-for-women-8e6cdb111d81) in-house (in production 2019, [open-sourced Oct 2022](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)) to blur unsolicited nudes on-device — a dedicated data-science team spun up precisely because no platform API existed.
- **Community voice (cost/latency):** moderation vendor-comparison writing captures the pain — "at 10M calls/day, developers are looking at $2K–5K/day just on moderation," and "a moderation layer that adds 200ms to every page load isn't a moderation layer — it's a revenue leak" ([GetStream, via search snippet, 2026](https://getstream.io/blog/content-moderation-api-comparison/)). *Weakest bucket: Reddit/SO/HN were unreachable this run, so no verbatim first-person Android-dev quotes.*
- **The absence signal:** Google ships no moderation classifier in ML Kit or MediaPipe Tasks, and is **retiring** the one it has (Perspective, after Dec 2026). The gap is not oversight — it is a vacated capability with paying customers.

---

## Why now

1. **Capability shift (2024–2026):** on-device safety stopped being theoretical. Google published [ShieldGemma](https://ai.google.dev/gemma/docs/shieldgemma) (2024) and ShieldGemma 2 (4B image, 2025); Meta shipped [Llama Guard 3-1B-INT4](https://arxiv.org/abs/2411.17713) at ~440MB running ≥30 tok/s on a commodity Android CPU. The brains exist; only the managed API is missing.
2. **Regulatory shift (dated, hard):** the UK Online Safety Act's illegal-content duties became enforceable **17 Mar 2025** and children's-safety duties **25 Jul 2025**, with Ofcom and the ICO already fining ([Reddit £14.47M, 2025](https://ico.org.uk/about-the-ico/what-we-do/background-to-the-children-s-code/)); the EU DSA has bound all platforms since **17 Feb 2024**; OS-level age-signal APIs ([Google Play Age Signals](https://xident.io/blog/google-play-age-signals-apple-declared-age-range-not-verification-2026/), Apple Declared Age Range) land ~**Jan 2026**. The age APIs return *who the user is* but not *what the content is* — age-appropriate filtering still needs a content classifier, which is the gap.
3. **Demand shift (2026):** Google is sunsetting [Perspective after Dec 2026](https://support.perspectiveapi.com/s/about-the-api-faqs), actively pushing its existing free-tier moderation users to find an alternative — a demand pump timed to the exact window this API would launch into.

---

## The capability gap

What exists, checked page by page:

- **Google ML Kit** — no moderation/safety classifier ([GenAI index](https://developers.google.com/ml-kit/genai)). **MediaPipe Text Classifier** is category-agnostic with no bundled safety model ([doc](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)). **ShieldGemma** is weights-only: to use it on Android you convert `.safetensors` → MediaPipe `.task` and drive a full generative LLM through the [LLM Inference API](https://ai.google.dev/gemma/docs/conversions/hf-to-mediapipe-task) yourself, then parse its text output — not `classify(text)`. **AICore/Nano safety filters** block internally but expose no developer-queryable scorer. **Checks Guardrails** returns per-policy scores but is [cloud, alpha](https://developers.google.com/checks/guide/ai-safety/guardrails). **Perspective** is cloud and sunsetting.
- **Apple** — [SensitiveContentAnalysis](https://developer.apple.com/documentation/sensitivecontentanalysis) runs on-device but is nudity-only, image/video, boolean (not calibrated multi-category). Foundation Models guardrails are opaque and internal.
- **Qualcomm / Samsung / MediaTek** — no dedicated on-device content-safety API found from any of the three.
- **Cloud (rich, multi-category, all metered):** OpenAI Moderation (free but rate-capped), Azure Content Safety, Hive, Rekognition, Clarifai, Perspective.

**The precise boundary:** the capability exists on-device as *model weights* (ShieldGemma, Llama Guard) and as a *single-category managed task* (Apple nudity); what is missing everywhere is a **standalone, one-call, calibrated multi-category on-device classifier** a developer drops in without touching an LLM runtime. **The main competitor a developer uses today** is a cloud API (Hive / Azure / OpenAI) — or, for the on-device-minded, hand-converting ShieldGemma into a MediaPipe `.task`.

---

## Proposed surface

A managed ML Kit task, not a model. Sketch:

```kotlin
val moderator = ContentSafety.getClient(
  ContentSafetyOptions.Builder()
    .setCategories(HATE, HARASSMENT, SEXUAL, VIOLENCE, SELF_HARM, SPAM_SCAM)
    .setSensitivity(Sensitivity.BALANCED)   // the precision/recall knob
    .build())

val result = moderator.classify(text)        // also classify(bitmap)
// result.scores[HATE] -> 0.0..1.0 calibrated; result.isFlagged(category)
```

- **Inputs/outputs:** text (and image); returns calibrated 0–1 scores per category plus a tunable `isFlagged`. Scores are a **versioned output contract**, independent of the model version behind them — the single most important durability commitment.
- **Model behind it:** a small dedicated classifier (DistilBERT/MobileBERT-class for text, MobileNet-class for image), quantized, delivered via Play for On-device AI — *not* Nano. This is deliberate: it makes the API a reach win (~96% of devices) rather than a flagship feature.
- **What it deliberately does NOT do:** no removal decisions, no human-review workflow, no CSAM hash-matching (that stays a specialized, legally-controlled path), no identity inference. It returns a signal; the app owns the action.
- **TTFHW target: 15 minutes.** One Gradle line, no API key, no new dangerous permission. The binding requirement is that the default model is bundled-or-fast-fetched and the default thresholds are safe out of the box — a developer should get a sane result before they ever touch `Sensitivity`.

---

## Reach & sizing

Arithmetic is mine; inputs sourced.

- **A_cat (apps >50K installs in UGC categories):** ~27,000–44,000 *(my estimate; only [AppBrain](https://www.appbrain.com/stats/android-market-app-categories) Tools = 23,870 was retrievable — the per-category columns didn't render)*.
- **p_job (carry moderatable UGC):** 0.55 blended.
- **SAM (apps):** 27–44k × 0.55 ≈ **15,000–24,000 apps** (midpoint ~20k); ~7–12k at half p_job.
- **Device reach:** minSdk 24 = 96.6% ([apilevels.com](https://apilevels.com/)) — reach is **not** the constraint.
- **Install-weighting multiplier:** installs% ÷ apps% for [TensorFlow Lite on AppBrain](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite) (10.50% / 1.17%) ≈ **9×**. On-device ML adoption is install-skewed; app count understates it.
- **Install-weighted surface:** ~21–30% of install-weighted Android *has* moderatable UGC (the install-giants — [Telegram ~2.9B](https://www.appbrain.com/app/telegram/org.telegram.messenger), Discord ~690M, Tinder ~520M, Reddit ~250M, plus WhatsApp/Instagram/TikTok/Snapchat — are overwhelmingly the UGC-intensive apps); ~**8–18% realistically capturable** at a TFLite-class ceiling.
- **Engineering cost avoided:** at ~20k adopters × a conservative 4 engineer-weeks saved each (DIY image+text moderation, badly, plus a year of maintenance) × loaded cost, the avoided-cost numerator runs into the low hundreds of millions of dollars — comfortably past the 10× platform-test bar against a single small-model build plus five years of maintenance. *(My arithmetic; adopter count is the soft input.)*
- **Sensitivity:** halve p_job → SAM ~7–12k apps, capturable install surface ~4–9%. The verdict survives as a developer-preview case; it does not survive as a "ship immediately, huge TAM" case — which is exactly why the recommendation is Prototype, not Build.

---

## Adoption path

1. **The hook:** the 15-minute win — a dating or marketplace dev adds image screening to an upload flow and watches it flag a test nude locally, with no key and no server change.
2. **First real integration:** replaces a cloud moderation call on the *pre-filter* path — screen locally, escalate only the uncertain middle band to their existing cloud vendor. This is the honest positioning (fast on-device first pass + optional cloud escalation), and it immediately cuts the vendor bill and the latency on the happy path.
3. **The dependency:** once calibrated thresholds, per-category logic, and the decision-logging the DSA/OSA require are wired to the API's versioned scores, removing it means rebuilding the moderation pipeline — a dependency the developer endorses because it is their compliance evidence.

**First adopter:** a mid-size UGC app under UK OSA pressure that already pays a cloud vendor and wants to cut cost and transfer-risk — Bumble's own published motivation is the archetype. The visible reference implementation (a dating or chat sample app) seeds the second wave.

---

## Execution plan

- **Developer preview:** ship the text classifier first with a handful of UGC partners. Question it answers: *does the small-model precision stay above the over-blocking threshold on real user content?* Evidence it collects: per-category false-positive rates on partner data, especially identity terms and reclaimed language.
- **Alpha/Beta:** add image; graduate when precision on a held-out partner set clears a stated bar (e.g. <X% false-positive on legitimate content at the BALANCED setting) and the score contract is frozen.
- **GA:** commit the versioned score schema and a multi-year support policy — the explicit answer to the Perspective-sunset trust problem.

**Org dependencies, honestly:** this needs the AICore/ShieldGemma team to supply or bless a small-model variant (today's ShieldGemma is flagship-sized), and Play for On-device AI for delivery. If the model team will only support the 2B+ generative guard, the wide-reach thesis collapses and this becomes a flagship-only feature that Nano already substitutes — so that is the make-or-break internal yes.

---

## The case against

The strongest argument against is **substitution by Google's own roadmap** (failure mode: the platform absorbs the problem underneath you). On the ~3.7% of devices with Gemini Nano, a developer can already moderate with a Prompt-API call and a system instruction; as Nano reach grows, the flagship case for a dedicated classifier shrinks. The defense is the wide-reach design — the small model serves the ~96% Nano can't — but that defense is only as strong as the model team's willingness to maintain a non-Nano classifier, which is not guaranteed.

The second argument is **durability, and it is not hypothetical**: Google is sunsetting Perspective, its existing moderation API. Shipping a *new* moderation surface while retiring the old one invites the reasonable developer prior that this one will be killed too — and that prior taxes adoption of the whole ML Kit portfolio, not just this API. The only credible answer is the versioned output contract plus a stated multi-year policy, made loudly.

Third, **over-blocking is a product-killer**, not a footnote. On-device small models trail cloud on adversarial, contextual, and multilingual content; a classifier that flags reclaimed language or medical imagery as unsafe will be ripped out in a week. This is why the design leads with a tunable precision/recall knob and safe defaults, and why the developer preview exists to measure exactly this.

The DMA interoperability remedy is a wash, not a tailwind: it forces Google to let *rivals'* on-device models run on Android, which commoditizes the layer rather than privileging a Google-owned classifier.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if a developer-preview measurement shows the small-model (non-Nano) text classifier cannot clear the over-blocking threshold on real partner UGC — i.e. false-positive rate on legitimate content stays above the level at which partners refuse to ship it — the wide-reach thesis is dead and the idea collapses to a Nano-substitutable flagship feature.

**Load-bearing assumption:** that a quantized small classifier delivers *useful* precision on the common-case harms across the mid-tier fleet. Feasibility of *running* it is confirmed; feasibility of its *quality* at wide reach is the open bet.

**Re-check trigger if shelved:** Apple shipping a multi-category (not nudity-only) on-device content classifier, or the AICore team shipping a small ShieldGemma variant — either would change both the competitive picture and the internal-dependency answer.

---

## Fit for this team

ML Kit is the right owner *if and only if* it is framed as a managed task, because ML Kit's whole value is turning a model into a one-call API for Android devs who are not ML engineers — which is exactly the gap between ShieldGemma-the-weights and the developer who needs `classify()`. MediaPipe is the wrong owner (it is the bring-your-own-model layer that already makes developers do the plumbing). LiteRT is lower still. Firebase AI Logic is cross-platform and cloud-capable, which dilutes the on-device/privacy story that is half the point. The one honest caveat: the *model* must come from the AICore/Gemma safety team, so this is a joint effort, and if that team won't own a small-model variant, the better conclusion is "not yet," not "ML Kit should build its own safety model."

---

## Open questions

- **Small-model precision on real UGC.** Feasibility of running is confirmed; quality at wide reach is unmeasured. Settled by the developer preview.
- **Per-category 50K-install app counts.** AppBrain's table didn't render; A_cat is an estimate. Settled by a manual browser pull of AppBrain category stats.
- **Liability placement.** Does returning a safety *score* (not a decision) keep Google clear of the generated-output liability the [Play policy](https://support.google.com/googleplay/android-developer/answer/14094294) contemplates? Needs a policy/legal read.
- **Does the AICore team have a small ShieldGemma on the roadmap?** Internal question; it is the make-or-break dependency.

---

## Runners-up

- **On-device neural TTS (Type A).** Clear whitespace (Google has no modern neural TTS API; Picovoice sells Orca), strong demand — but **fails G1 cleanly**: good OSS TTS (Piper, Kokoro) ships fast, so platform privilege is thin.
- **On-device embeddings / semantic-search API (Type A/B).** Huge demand (RAG, in-app search) — but **MediaPipe already ships text embedding + RAG and EmbeddingGemma exists**, so it's a consolidation/DX play, not whitespace; short substitute half-life.
- **On-device eval & token-accounting tooling (Type D).** Sharp gap (Apple shipped evals; ML Kit prescribes a workflow and ships nothing) — but **reach is gated to the ~3.7% already using the Prompt API**, capping S2.
- **Sub-8GB reach / graceful GenAI degradation (Type F).** The defining 26× reach tension and strategically the biggest prize — but **too fuzzy as a single API**; it's a program, and it lost to a concrete surface this run.
- **Structured document understanding — tables/forms (Type B).** Real developer pain — but **Apple already beat Google here** ([`RecognizeDocumentsRequest`](https://developer.apple.com/documentation/vision)); it reads as whitespace only if you ignore iOS, so it's catch-up, not a lead.

---

*Sources:*
- https://developers.google.com/ml-kit/genai
- https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier
- https://ai.google.dev/gemma/docs/shieldgemma
- https://ai.google.dev/gemma/docs/conversions/hf-to-mediapipe-task
- https://developers.google.com/checks/guide/ai-safety/guardrails
- https://support.perspectiveapi.com/s/about-the-api-faqs
- https://developer.apple.com/documentation/sensitivecontentanalysis
- https://developer.apple.com/documentation/vision
- https://arxiv.org/abs/2411.17713
- https://arxiv.org/abs/2407.21772
- https://arxiv.org/abs/2504.01081
- https://github.com/infinitered/nsfwjs
- https://github.com/infinitered/nsfwjs-mobile
- https://github.com/devzwy/open_nsfw_android
- https://github.com/notAI-tech/NudeNet
- https://github.com/unitaryai/detoxify
- https://github.com/tensorflow/tfjs-models/tree/master/toxicity
- https://thehive.ai/pricing
- https://aws.amazon.com/rekognition/pricing/
- https://azure.microsoft.com/en-us/pricing/details/content-safety/
- https://sightengine.com/pricing
- https://www.webpurify.com/image-moderation/live/
- https://www.g2.com/products/clarifai/pricing
- https://getstream.io/blog/content-moderation-api-comparison/
- https://medium.com/bumble-tech/bumble-inc-open-sources-private-detector-and-makes-another-step-towards-a-safer-internet-for-women-8e6cdb111d81
- https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/
- https://ico.org.uk/about-the-ico/what-we-do/background-to-the-children-s-code/
- https://www.rpclegal.com/snapshots/technology-digital/spring-2025/the-online-safety-act-illegal-harms-codes-officially-in-force-focus-now-on-children/
- https://commission.europa.eu/news-and-media/news/digital-services-act-keeping-us-safe-online-2025-09-22_en
- https://xident.io/blog/google-play-age-signals-apple-declared-age-range-not-verification-2026/
- https://www.appbrain.com/stats/android-market-app-categories
- https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite
- https://apilevels.com/
- https://support.google.com/googleplay/android-developer/answer/14094294
