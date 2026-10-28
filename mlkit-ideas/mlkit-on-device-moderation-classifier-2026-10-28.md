# On-Device Safety Classifier — a one-call, whole-fleet moderation task for user content, before it leaves the phone

**Type:** G (Trust, safety & compliance) · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Promising)**
*2026-10-28 · Prepared for Android ML Kit · Evidence current as of 2026-10-28*

> *Badges: Regulatory clock · Strong external demand · Borrow path exists · Quality is pre-filter-grade, not arbiter-grade*

> A dating-app Android engineer ships a profile-bio field on a Tuesday and immediately owes Google Play "robust, effective and ongoing UGC moderation." Their ML team is server-side, so today they wire every bio to a cloud moderation API — OpenAI's free endpoint (US servers, a GDPR headache) or Sightengine at ~$29–399/mo — paying per call × DAU and sending every user's words to a third party to decide if they're allowed. There is no ML Kit task that classifies that text for hate/harassment/sexual/self-harm **on the device**, so nothing stays local and nothing is free. The one number that matters: a BERT-class classifier that does this job runs on ~99% of the Android fleet at ~zero marginal cost — and Google already runs exactly that size of model in Perspective API, just not on the phone.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Promising | composite 3.9 × 2 = 7.8, −1 because two gates (privilege, durability) sit at exactly 3, +1 because S1 demand is a 5; rounded to 7 to reflect the live borrow path |
| Platform privilege (gate) | 3/5 — pass | Model layer is borrowable (Detoxify Apache-2.0, nsfwjs MIT, Llama Guard 3-1B ExecuTorch); the privilege is fleet model-delivery (Play for On-device AI), one-call packaging, and the on-device trust boundary — not OS-exclusivity |
| Feasibility headroom (gate) | 4/5 — pass | BERT/RoBERTa/EmbeddingGemma-class (64–300 MB, <200 MB RAM, 92–98 AUC) runs on ~95–99% fleet; passes **as a high-recall pre-filter**, not as a sole autonomous arbiter |
| Durability (gate) | 3/5 — pass | Strategically aligned with Play-policy enforcement, but output stability across model refreshes is unaddressed and one-size policy is a tunability risk |
| Demand evidence (25%) | 5/5 | Multi-vendor transparently-priced cloud market, nsfwjs 9,015★, Detoxify 1,312★ (active), verbatim "ML Kit has no nudity classes" dev complaint, cost-at-scale + GDPR drivers |
| Install-weighted reach (15%) | 4/5 | UGC apps across Social/Communication/Dating/marketplaces/kids; ~99% device reach via Play-services delivery; capped because the largest install-holders already moderate server-side |
| Build-vs-buy-vs-borrow (20%) | 3/5 | Borrow wins for the simple English-NSFW case (nsfwjs ≈ a weekend); the delta is real only for multilingual text + image + delivery + maintenance |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, model delivered on demand, no API key, no new dangerous permission; first-use model download needs network |
| Substitute half-life (15%) | 3/5 | General on-device model (Nano) can't substitute at fleet scale (3.7% reach), but the OSS borrow path is near-parity for simple cases and ships monthly |
| Strategic complement (10%) | 4/5 | Directly serves Play-policy compliance and keeps user content on-device (privacy vs. cloud); not a lock-in, and the same need exists on iOS |
| **Composite** | **3.9** | weighted mean of S1–S6 |

*Least trustworthy score: Build-vs-borrow (S3). It hinges on how much of the DIY cost developers actually perceive, and on AppBrain adoption comparables I could not fetch this run (see Open questions).*

---

## The problem

The job, stated as a developer's: *"My app now hosts user content, Google Play requires me to moderate it, my team has no on-device ML people, and I need every piece of that content checked before I store or show it — ideally without shipping my users' words to a third party or paying per call forever."*

This is not a market category; it's a structural consequence of the constraints a large consumer Android app operates under. **(1)** The core loop of any UGC app — post→appear, match→chat, list→browse — leaks the moment a user types something harmful into the input, and the leak is a legal and brand liability, not just a bad experience. **(2)** Google Play *mandates* a fix: public-facing UGC apps "must implement robust, effective and ongoing UGC moderation" plus in-app reporting and blocking ([Play UGC policy, Google-published](https://support.google.com/googleplay/android-developer/answer/9876937)). **(3)** The app's ML expertise is server-side; its Android engineers are not ML engineers — exactly the "requires both in one head" gap a platform should close. **(4)** Per-inference cost multiplied by DAU turns moderation into a line item that scales linearly with growth, which is why self-host guides frame it as "a volume problem before it's a model-quality problem."

What they do **instead** today, in order of frequency: call a cloud moderation API (OpenAI's free omni-moderation on US servers; Perspective API, which also sends data to Google; or paid Sightengine/Azure/AWS Rekognition at ~$0.001/image and up); or hand-roll a keyword blocklist; or borrow an OSS model (nsfwjs for images, Detoxify for text) and wire up TensorFlow Lite themselves; or ship nothing and hope. Every one of these is the status quo your API is priced against. The two free options are the tell: developers reach for them *because* they're free, and accept shipping user content to a US third party as the cost — which means a private, on-device, zero-marginal-cost option is addressing a trade-off they're already making reluctantly.

This is a platform problem rather than an app problem by the atlas test: every UGC app solves it nearly identically and badly, none of them differentiates on "which cloud moderation vendor we use," and the capability they all want — classify this text/image for a standard harm taxonomy — is the same across all of them.

---

## Proof & signals

- **Someone charging money for it (willingness-to-pay):** a transparently-priced multi-vendor market. [Sightengine](https://sightengine.com/pricing) publishes $29/$99/$399 monthly tiers and overage at $0.0015–0.002/op, with a dedicated dating-profile product; [AWS Rekognition](https://aws.amazon.com/rekognition/content-moderation) lists ~$0.001/image dropping to $0.0004 at volume; Azure AI Content Safety and WebPurify (~$0.0026/image automated) bill the same per-unit shape. **All are cloud-only.** A paid market this liquid for a capability no platform ships on-device is the strongest single demand signal available. *(Vendor pricing via WebSearch snippets of the primary pages; third-party.)*
- **Free-but-not-private incumbents:** [OpenAI moderation](https://platform.openai.com/docs/guides/moderation) is free for API users (US servers, flagged as a GDPR concern for EU data); [Perspective API](https://perspectiveapi.com) is free but "sends data to Google." Both cloud-only. The free price makes willingness-to-pay harder to read but sharpens the privacy case.
- **Developers doing it by hand (OSS, GitHub figures pulled 2026-10-28):** [infinitered/nsfwjs](https://github.com/infinitered/nsfwjs) — **9,015 stars**, last push 2026-08-04, a client-side NSFW image classifier with ~102 repos in its ecosystem (incl. a React-Native port); [unitaryai/detoxify](https://github.com/unitaryai/detoxify) — **1,312 stars**, last push 2026-10-20 (actively maintained), the most-starred text-toxicity model repo; Flutter TFLite NSFW packages that add ~17 MB and run fully offline. The clearest native-Android precedent, [nipunru/nsfw-detector-android](https://github.com/nipunru/nsfw-detector-android) (56★), is **abandoned since 2020 and built on the now-deprecated Firebase AutoML** — a developer who tried to do this on Android natively and whose tool rotted when Google moved the ground under it.
- **Community voice (verbatim):** the NativePHP NSFW-checker README states that *"ML Kit's default labeller returns general scene and object labels; its label set contains no nudity or pornography classes at all,"* and recommends treating the Android path as *"a cheap first pass in front of a server-side check"* ([packagist](https://packagist.org/packages/codypchristian/nativephp-nsfw-checker)). That is a dated, current statement that today's on-device Android tooling does not cover moderation — exactly the gap. On HN, ["What do you use for content moderation of UGC?"](https://news.ycombinator.com/item?id=42830018) draws answers naming OpenAI/Azure/AWS and LLM-first-pass pipelines, and the much-cited ["You either die an MVP or live long enough to build content moderation"](https://news.ycombinator.com/item?id=28684250) captures that every growing UGC platform is eventually forced into this.
- **Cost / privacy at scale:** self-host analyses put human review at ~$0.625/post versus automated at ~$0.0004/post, and GDPR/HIPAA teams cite "sending user data to third parties is a problem" as the reason they build in-house. On-device flattens the per-call curve to ~zero and removes the third party entirely.
- **The absence signal:** no vendor ships a first-class, on-device, developer-callable **multi-category** moderation task for arbitrary user content on the general Android fleet. That silence, next to a liquid paid market, reads as an un-built API rather than an absence of need.

---

## Why now

1. **Capability shift (2024–2026):** the model class that fits the whole fleet matured and got proven in production. Google's *own* Perspective API runs a ~102M-param Charformer, chosen for serving latency ([Jigsaw KDD'22 paper](https://arxiv.org/pdf/2202.11176)); Detoxify reports 92–98 AUC at BERT/RoBERTa scale and quantizes to [64 MB INT8 at AUC 0.92](https://huggingface.co/Trakerlack/distilbert-toxic-onnx-int8); [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/) (308M, <200 MB RAM, 100+ languages, Google-published) is a ready multilingual backbone. The quality that was cloud-only is now a sub-200 MB on-device model.
2. **Regulatory / policy shift (dated, already live):** UK Online Safety Act **Protection of Children Code in force 25 Jul 2025**; amended US **COPPA effective 23 Jun 2025, full compliance 22 Apr 2026**; EU **DSA illegal-content duties applicable to all hosting services since 17 Feb 2024** (fines to 6% of global turnover). Adjacent but worth watching: the EU DMA Art. 6(7) Alphabet decision (16 Jul 2026) forces Google to open on-device AI surfaces to third parties in **Android 18 by 1 Aug 2027** — a reason to define Google's own on-device safety surface before someone else's rides in on the interop mandate. *(Regulatory dates via policy-tracker/law-firm snippets; re-verify primary texts.)*
3. **Demand shift:** Play tightened UGC obligations (incl. a 2023 rule that AI-content apps let users report offensive output in-app), so the share of apps that *must* moderate, rather than merely *could*, rose — turning a nice-to-have into a store-gated requirement.

Three real, dated drivers. The why-now is genuine, not manufactured.

---

## The capability gap

What exists across the stack, with the page checked:

- **Google ML Kit** — no safety/toxicity/moderation classifier. NL APIs are Language ID, Translation, Smart Reply, Entity Extraction; image labeling has **no nudity/moderation classes** ([ML Kit guides](https://developers.google.com/ml-kit/guides)).
- **ML Kit GenAI / Gemini Nano** — safety is an **internal guardrail on the model's own generation**, not a classifier you can call on arbitrary user content; the docs put the onus on the developer ("solely responsible for the safety of their API client") ([ml-kit-genai](https://developer.android.com/ai/gemini-nano/ml-kit-genai)). And Nano reaches only ~3.7% of the fleet, so it could never moderate everyone's content anyway.
- **MediaPipe Text Classifier** — generic on-device classifier whose **prebuilt models are sentiment-only** (SST-2/MobileBERT, English); toxicity means bring-your-own-model + TFLite conversion ([MediaPipe text classifier](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier)).
- **ShieldGemma (Google's safety model)** — exists in **2B/9B/27B text** (Gemma 2) and **4B image** (ShieldGemma 2), distributed as **raw weights on HuggingFace/Kaggle only; not an ML Kit API, not a MediaPipe prebuilt task** ([Google blog](https://developers.googleblog.com/en/smaller-safer-more-transparent-advancing-responsible-ai-with-gemma/); [paper](https://arxiv.org/pdf/2407.21772)). The smallest text variant is 2B — LLM-class, ~1.7 GB RAM at Q4 ([estimate](https://llmrun.dev/model/google-shieldgemma-2b)) — so it's a flagship/Nano-class model, not a whole-fleet one.
- **Apple** — Foundation Models safety is guardrails on the model's *own* output; the only true on-device dev-callable moderation API is [Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis), which detects **nudity in images/video only** — no text, no multi-category taxonomy.
- **Cloud (Perspective, OpenAI, Azure, AWS, Hive, Sightengine)** — full taxonomies, all cloud-only.
- **OSS/borrow** — [Llama Guard 3-1B](https://huggingface.co/meta-llama/Llama-Guard-3-1B) has a real INT4 ExecuTorch mobile build (~440 MB, ~30 tok/s on commodity Android CPU, MLCommons 13-hazard taxonomy; [paper](https://arxiv.org/abs/2411.17713)); Detoxify and nsfwjs cover text and image at BERT/MobileNet scale.

**The precise boundary:** the *model* exists and is largely a borrow-or-wrap problem (ShieldGemma weights, Llama Guard 3-1B, Detoxify). What is missing is the **API/packaging/delivery layer** — a prebuilt, fleet-wide, one-call moderation task with a model that ships via Play rather than bloating the APK. This is therefore **not a Type B extension of anything Google already exposes**; it's net-new packaging over a solved model problem.

**Main competitor** a developer uses today: a cloud moderation API (OpenAI's free endpoint for the cost-insensitive, Sightengine/Azure for the serious), or the nsfwjs/Detoxify DIY path.

---

## Proposed surface

A new ML Kit task, `SafetyClassifier`, that returns per-category risk scores for text and images — and, crucially, **does not make the block/allow decision**. The decision and the escalation policy stay with the app, because moderation thresholds are each company's policy, not Google's.

```kotlin
val classifier = SafetyClassification.getClient(
    SafetyClassifierOptions.Builder()
        .setCategories(HATE, HARASSMENT, SEXUAL, VIOLENCE, SELF_HARM, SPAM)
        .setTier(Tier.AUTO)          // AUTO picks the best model the device can run
        .build()
)
val result: SafetyResult = classifier.classify(SafetyInput.text(userBio)).await()
// result.score(SEXUAL) -> 0.0..1.0 ; result.confidence ; result.modelVersion
```

- **Model class behind it:** a small multilingual text classifier (EmbeddingGemma-class backbone or a distilled ShieldGemma head) at <200 MB RAM for the text path, and a MobileNet-class CNN (~4–14 MB) for the image path. Delivered via **Play for On-device AI** (SoC/RAM-targeted AI packs) so it is not in the APK.
- **Device requirements:** the whole-fleet tier targets API 24+ (~99% reach); a `Tier.HIGH_ACCURACY` option may light up ShieldGemma-2B on Nano-class hardware for apps that want it, surfaced honestly rather than hidden.
- **What it deliberately does *not* do:** it does not block, publish, ban, or store anything; it does not claim a precision high enough to be a sole autonomous arbiter; it returns **scores and a confidence**, and the design *expects* the app to escalate the ambiguous middle to its own backend or a human. `modelVersion` is returned so the app can pin behavior.

**Time-to-first-hello-world target: under 15 minutes.** What has to be true: one Gradle line, no API key, no new dangerous permission, model fetched on first use (network needed once), and a sample that shows the score→threshold→escalate pattern so developers don't mistake it for a block/allow gate. If we can't ship that escalation pattern as the default sample, the API will be misused as an arbiter — that's a design finding, not a footnote.

---

## Reach & sizing

Show the arithmetic; every input is a range because AppBrain was unreachable this run.

- **A_cat** — UGC apps ≥50K installs across Social, Communication, Dating (+ marketplaces, kids, forums): **~8,000–25,000 core, up to ~40,000 broad** *(estimated from ~2.04M Play apps [42matters, Jul 2025] × core-UGC category share × the small fraction clearing 50K installs; AppBrain's exact column was blocked)*.
- **p_job** — fraction plausibly needing moderation: **0.6–0.9** need it (Play mandates it); **0.4–0.7** would want an *on-device pre-filter* specifically (discounting those satisfied server-side).
- **m_install** — install-weighting multiplier: **~2–4×** (on-device ML SDKs concentrate in higher-install apps; exact ML Kit %installs÷%apps not retrieved).
- **c_ceiling** — 3-yr adoption ceiling: **~1–2% of all apps** for a specialized on-device ML SDK, applied to the UGC-addressable subset, not all apps.
- **r_reach** — **~0.95–0.99** via Play-services delivery (API 24+ ≈ 99.1%, [capgo Dec 2025](https://capgo.app/android-distribution-chart/)); collapses to ~0.10–0.20 if gated to Nano-class hardware — which is why the whole-fleet small-model tier is the entire ballgame.

**Order-of-magnitude SOM:** take A_cat ≈ 15,000 core UGC apps × p_job 0.5 (on-device pre-filter want) × c_ceiling 1.5% × r_reach 0.97 ≈ **~110 seriously-adopting apps at year three** — but install-weighted, these are high-DAU apps, so the *install* reach is materially larger than the app count suggests (my arithmetic, on blocked inputs).

**Engineering cost avoided** is the platform-test numerator: each adopter avoids sourcing + quantizing + multilingual + image + device-matrix testing + delivery + ongoing maintenance. Honest DIY for the *full* multilingual text+image+delivery version is **~2–4 engineer-months**; for a single-language English NSFW pre-filter it's **~a weekend with nsfwjs**. That spread is the whole risk in the sizing.

**Sensitivity:** halve p_job (0.25) and halve c_ceiling (0.75%) and the adopting-app count drops ~4× to the low tens. The verdict does **not** survive as a confident "Build" under that stress — which is precisely why this is a **Prototype**, not a Build: the one experiment worth running is whether mid-market UGC apps adopt an on-device pre-filter when the borrow path is a weekend away.

---

## Adoption path

1. **The hook:** a 15-minute sample that takes a dating-app bio field from "unmoderated" to "scored on six categories, locally, free." The win is visible and store-compliance-relevant immediately.
2. **First real integration:** the app ships the on-device classifier as a **high-recall pre-filter** in front of its existing cloud call — clearing the obvious cases locally (free, private) and escalating only the ambiguous middle. What it replaces is a chunk of per-call cloud spend and the "everything goes to a third party" posture.
3. **The dependency they'd endorse:** once the classifier is the first stage and the app's thresholds and escalation logic are tuned around its scores and `modelVersion`, removing it means re-architecting the moderation pipeline — a lock-in the developer *wants*, because it's saving them money and keeping data local.

**First adopter:** a mid-market dating or community app under acute Play/child-safety pressure, with a cloud bill it resents and a privacy story it wants to tell — not a Meta-scale app (those already moderate server-side and won't switch). Second wave: comment/marketplace SDKs that embed the task so their own customers inherit it. If no mid-market UGC app will put an on-device pre-filter in front of its cloud call, the funnel doesn't start — that's the kill test below.

---

## Execution plan

- **Developer preview:** answer one question — *will mid-market UGC apps adopt an on-device pre-filter when the borrow path is a weekend?* Partners: 3–5 dating/community apps. Evidence collected: adoption friction, whether the pre-filter-not-arbiter framing holds in practice, and real operating-point precision/recall per category on partner content.
- **Alpha → Beta graduation condition (checkable):** at least one partner ships the classifier to production as a pre-filter *and* reports a measurable cloud-call reduction without a moderation-quality regression; multilingual text covers the top ~10 languages at ≥0.9 AUC in-distribution.
- **GA commitment:** a frozen category taxonomy, scores versioned via `modelVersion` independently of the underlying model, and an explicit output-stability policy across model refreshes (the durability risk below).

**Org dependencies, honestly:** this needs the AICore/Gemma team to bless a distilled/quantized ShieldGemma-or-EmbeddingGemma head for redistribution via Play for On-device AI, and the Play for On-device AI team to carry the model. If either says no, the fallback is a self-contained small classifier ML Kit owns outright — more maintenance, but no cross-team dependency. A trust-and-safety sign-off on the taxonomy and the "scores not decisions" liability posture is also required; without it the API dies on contact with legal.

---

## The case against

The strongest case is **Undifferentiated against a free substitute (rubric failure mode #7), compounded by the borrow path.** For the simplest and most common first need — English NSFW image detection — a developer clones nsfwjs or a Flutter TFLite package in a weekend and is done; for text, Detoxify is Apache-2.0 and quantizes to 64 MB. A platform API competing against free software that ships monthly, for a job a weekend already solves, is the textbook G1 risk eighteen months out. The honest rebuttal is narrow but real: the borrow path does *not* give you multilingual coverage, an image+text unified taxonomy, device-matrix-tested quantization, or model delivery that keeps the APK small — and it rots (nipunru/nsfw-detector-android is the ghost of exactly this). The platform's defensible work is the packaging, delivery, and multi-year maintenance, not the model. But that is a *narrower* value proposition than "we give you moderation," and the sizing sensitivity shows the verdict flips if mid-market apps don't value it.

The second live risk is **quality at the operating point.** Small-model AUC of 92–98 is production-usable for triage, but a third-party 2026 benchmark reproduces ShieldGemma-2B at **F1 0.42–0.59**, far below Google's in-distribution 0.81 ([arxiv 2605.28830](https://arxiv.org/html/2605.28830v1)). Moderation's asymmetry — a false negative publishes harmful content, a false positive censors a user — means a single small model should never be the sole arbiter. The design mitigates this by returning scores+confidence and shipping the escalation pattern as the default, but it means the honest pitch is "a free, private, high-recall first stage," not "moderation solved." An API that over-promises here is worse than none, because the brand damage of a visible miss lands on Google.

The risk that is *not* live: **the API outran the hardware.** The whole-fleet small-model tier runs on ~99% of devices today, so unlike a Nano-gated idea, this one is not waiting on silicon.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if, in developer preview, fewer than ~1 in 3 partner UGC apps will put the on-device classifier in front of their existing cloud call — because the borrow path or the free cloud endpoint is "good enough" — then the differentiated value (packaging + delivery + maintenance) isn't worth a five-year public surface, and this reverts to a shelved idea with a sample repo instead of an API.

**Load-bearing assumption:** that a sub-200 MB, Play-delivered, multilingual, maintained first-party task is worth adopting *over* a free weekend borrow — i.e., that developers price the maintenance and multilingual cost of borrowed code at something close to its real value.

**Re-check trigger if shelved:** a regulatory mandate that makes *on-device* moderation specifically required (e.g., a data-residency rule that forbids sending user content to a cloud moderator), or Apple extending Sensitive Content Analysis to text + a full taxonomy, which would turn this from "nice" into "Google is the only major platform without it."

---

## Fit for this team

ML Kit is the right owner, not MediaPipe, LiteRT, or Firebase AI Logic — but only if it embraces being the **task/packaging** layer. MediaPipe already offers the bring-your-own-model text classifier and the LLM Inference path; those are the raw materials, not the product. Firebase AI Logic is cloud-tilted and would reintroduce the exact "content leaves the device" problem the idea exists to solve. The on-device, one-call, no-ML-expertise-required, classic-ML-Kit-shaped task is squarely ML Kit's franchise — the same shape as Barcode, Text Recognition, and Smart Reply. The internal risk is the opposite of a land grab: if this lands as *another* raw model on Kaggle, or as a MediaPipe sample, it fragments the developer story further and nobody adopts it. The value is in ML Kit refusing to make the developer touch ExecuTorch or quantization at all.

---

## Open questions

- **AppBrain adoption comparables** (ML Kit %apps/%installs, per-category "≥50K installs" columns) — blocked this run (appbrain.com not in the session network allowlist). These set m_install and the sizing floor; re-run once whitelisted.
- **Real operating-point precision/recall** per harm category for a <200 MB model on partner content — the number the whole feasibility argument turns on, and the thing only a preview can measure. The vendor AUCs are in-distribution and optimistic.
- **Google's authoritative device-distribution figures** — I used capgo's Dec 2025 mirror because the official dashboard and apilevels.com were unreachable.
- **ShieldGemma license/redistribution terms for Play delivery** — read via search snippets, not the model card (huggingface.co blocked); confirm before assuming a distilled head can ship.
- **Perspective API's reported Dec-31-2026 shutdown** — a single third-party claim I could not verify against Jigsaw; if true, it's a demand accelerant worth confirming.
- **Freshness note:** no stale snapshot claims were contradicted, but every Google-doc check this run came via WebSearch snippets rather than a direct fetch (developers.google.com et al. blocked), so re-verify the ML Kit release notes and the ShieldGemma/EmbeddingGemma model cards directly before building on them.

---

## Runners-up

- **On-device eval / quality-regression harness (Type D)** — Apple shipped an Evaluations framework at WWDC26; ML Kit publishes a prose "evaluate prompt quality" page with no harness behind it. Clean competitive gap, trivial feasibility, strong strategic complement — lost on install-weighted reach (it serves only the ~3.7% GenAI-feature base) and thinner external demand than moderation.
- **Graceful-degradation / tiered-capability SDK (Type C/F)** — one write-once GenAI call that degrades Nano → classic-ML-Kit extractive methods on the ~96% of devices without Nano, instead of Firebase's cloud fallback (which defeats the privacy/cost reason to go on-device). Strong platform-privilege story; lost because Firebase AI Logic's hybrid inference is a real partial incumbent, making the gap harder to argue cleanly.
- **On-device neural TTS developer API (Type A)** — genuine whitespace (Google has no modern on-device TTS; Picovoice Orca sells into it; Apple added speech generation). Parked on G1/S3: strong OSS (Piper/Coqui) pressures platform privilege and the build-vs-borrow delta.
- **On-device speaker diarization / speaker ID (Type A)** — meeting-notes and voice-memo whitespace (Picovoice Falcon/Eagle sell it); parked below moderation on install-weighted reach.
- **On-device embeddings in ML Kit (Type B)** — killed at triage: MediaPipe already ships text/image embedding and EmbeddingGemma exists, so borrow wins and it fails G1.

---

*Sources:*
- [Google Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [ML Kit guides](https://developers.google.com/ml-kit/guides) · [ML Kit GenAI / Gemini Nano](https://developer.android.com/ai/gemini-nano/ml-kit-genai) · [MediaPipe Text Classifier](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier)
- [ShieldGemma announcement](https://developers.googleblog.com/en/smaller-safer-more-transparent-advancing-responsible-ai-with-gemma/) · [ShieldGemma paper](https://arxiv.org/pdf/2407.21772) · [third-party ShieldGemma benchmark](https://arxiv.org/html/2605.28830v1) · [ShieldGemma-2B RAM estimate](https://llmrun.dev/model/google-shieldgemma-2b)
- [Llama Guard 3-1B](https://huggingface.co/meta-llama/Llama-Guard-3-1B) · [Llama Guard 3-1B paper](https://arxiv.org/abs/2411.17713)
- [Detoxify](https://github.com/unitaryai/detoxify) · [DistilBERT toxic INT8 (64 MB)](https://huggingface.co/Trakerlack/distilbert-toxic-onnx-int8) · [Perspective API paper](https://arxiv.org/pdf/2202.11176) · [Perspective API](https://perspectiveapi.com) · [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/)
- [nsfwjs](https://github.com/infinitered/nsfwjs) · [nsfw-detector-android (abandoned)](https://github.com/nipunru/nsfw-detector-android) · [NativePHP NSFW-checker](https://packagist.org/packages/codypchristian/nativephp-nsfw-checker)
- [Apple Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis) · [Apple Foundation Models safety](https://developer.apple.com/documentation/foundationmodels/improving-the-safety-of-generative-model-output)
- [OpenAI moderation](https://platform.openai.com/docs/guides/moderation) · [Sightengine pricing](https://sightengine.com/pricing) · [AWS Rekognition moderation](https://aws.amazon.com/rekognition/content-moderation)
- [HN: content moderation for UGC](https://news.ycombinator.com/item?id=42830018) · [HN: die an MVP or build moderation](https://news.ycombinator.com/item?id=28684250)
- [Android distribution (capgo, Dec 2025)](https://capgo.app/android-distribution-chart/)
