# ML Kit Content Moderation — the developer-policy UGC safety classifier Android ships everything for except the API itself

**Type:** G (Trust, safety & compliance), with a Type F (Reach) mechanism · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Strong, quality-gated)**
*2026-11-06 · Prepared for Android ML Kit · Evidence current as of 2026-11-06*

> Right now a Flutter dev shipping a marketplace app pulls `flutter_nsfw_detector` into their build, bundles a ~17 MB TFLite model into the APK, and ships English-only NSFW screening they can't tune and won't maintain — because their alternative is wiring every user photo and message through Hive at [$3 per 1,000 images](https://thehive.ai/pricing), which at 1M DAU is roughly $90k/month. Meanwhile Google Play's own policy has, since [19 March 2025](https://support.google.com/googleplay/android-developer/answer/14747720), *required* their app to moderate user content. Android already runs an on-device safety model fleet-wide for Google Messages; it just won't let that developer call it with their own policy.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, quality-gated | composite 3.9 → ×2 = 7.8, −1 (a gate scores 3), +1 (S1 = 5) = 7.8; deflated to 7 for the unresolved deliberate-abstention and multilingual-floor risks that make this Prototype, not Build |
| Platform privilege (gate) | 4/5 — pass | A thin TFLite wrapper is a weekend ([nsfwjs](https://github.com/infinitered/nsfwjs), 9k★), so the *wrapper* version fails; the system-delivered, auto-updated, no-APK-bloat, CSAE-capable classifier is genuinely privileged — only Play-services delivery reaches the fleet without bloat, and [SafetyCore](https://support.google.com/product-documentation/answer/16001929) already does |
| Feasibility headroom (gate) | 4/5 — pass | English binary toxicity ~0.95–0.97 AUC on INT8 MobileBERT-class (~25 MB), image NSFW ~0.91 F1 ([arXiv 2107.11845](https://arxiv.org/abs/2107.11845)) — the exact weight class ML Kit already runs fleet-wide; multilingual is the compromise |
| Durability (gate) | 3/5 — pass | Regulation gives safety a durable charter, but output-score stability across model refreshes is unaddressed and the [Google API mortality prior](https://killedbygoogle.com/) is a real adoption tax |
| Demand evidence (25%) | 5/5 | Vendors charging money ([Hive](https://thehive.ai/pricing), [AWS Rekognition](https://aws.amazon.com/rekognition/pricing/) $0.001/img, [GCP Vision](https://cloud.google.com/vision/pricing) $1.50/1k) + OSS wrappers bundling 17–22 MB models + [Perspective API sunset](https://perspectiveapi.com/) + binding regulation |
| Install-weighted reach (15%) | 4/5 | UGC apps ≈ 15–30% of Play installs; 7 biggest exceed 20B cumulative installs; classification runs at minSdk 29 ≈ 91% device reach — **least-trustworthy score** (sizing estimated, AppBrain table was unreadable) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path is real: copy a maintained Flutter/TFLite NSFW wrapper and English screening mostly works in a few days |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, no API key, no new dangerous permission, model delivered by Play (no APK bloat); minus the availability check + first-run model download |
| Substitute half-life (15%) | 3/5 | A general on-device model (Gemini Nano/Gemma) can answer "is this toxic?" as a prompt in 2–3 years — but it's flagship-gated, so the reach moat protects the classifier |
| Strategic complement (10%) | 4/5 | De-risks every UGC app on Android, and directly tools Google Play's *own* CSAE/UGC policy compliance |
| **Composite** | **3.9** | Just under the 4.0 Build line |

The score I trust least is **install-weighted reach (S2)**: AppBrain's category tables wouldn't render to the research tooling, so the 15–30%-of-installs band is triangulated from download-share proxies and named mega-apps, not read off the "apps above 50K installs" column.

---

## The problem

A consumer app that accepts user-generated content inherits a legal and brand liability the instant a user hits submit, and the moderation decision has to happen in the submit path — synchronously, cheaply, at the rate of every post, DM, photo, and listing. The engineer who owns that path is an Android generalist, not an ML engineer; their company's ML talent is server-side. So they face a build-or-buy with no good option: send everything to a cloud moderation API and eat per-inference cost that scales with DAU plus a privacy story they have to defend, or hand-roll an on-device classifier they don't have the ML skills to maintain.

They are overwhelmingly choosing cloud today, and the prices are real: [Hive](https://thehive.ai/pricing) at $3/1k images and $0.50/1k text, [AWS Rekognition](https://aws.amazon.com/rekognition/pricing/) at $0.001/image, [Google's own Cloud Vision SafeSearch](https://cloud.google.com/vision/pricing) at $1.50/1k. One developer on Hacker News described running ["over a billion requests (>$100,000 by typical moderation API pricing)"](https://news.ycombinator.com/item?id=49177920) through a free endpoint; another priced ["25 million explicit images ... around $19,500/mo on Google Cloud Vision vs €99/mo"](https://news.ycombinator.com/item?id=17730878) self-hosted. The ones who can't stomach that are hand-rolling on-device — there are maintained, fully-offline Flutter/TFLite NSFW packages ([nsfw_detector_flutter](https://pub.dev/packages/nsfw_detector_flutter), [flutter_nsfw_detector](https://pub.dev/packages/flutter_nsfw_detector)) that bundle a 17–22 MB model straight into the APK.

This is structurally a platform problem, not an app problem, on the test from `idea-types.md`: every UGC app solves "is this text or image harmful?" identically and badly, and none of them treats moderation as differentiation — they treat it as a tax. The reason it belongs *on-device* and *on the platform* specifically is that moderation is a **classification** task, not a generative one, so it fits in a small model that runs across the whole Play-services fleet — unlike every Gemini Nano feature, which is RAM-bound to the [~3.7% of the base that runs Nano](https://android-developers.googleblog.com/). The job that is most universal is, uniquely, the one the platform can actually reach everyone with.

---

## Proof & signals

- **Someone charging money for it.** A metered market exists across [Hive](https://thehive.ai/pricing), [AWS Rekognition](https://aws.amazon.com/rekognition/content-moderation/), [Azure AI Content Safety](https://azure.microsoft.com/pricing/details/content-safety/), and [Google Cloud Vision](https://cloud.google.com/vision/pricing). Willingness to pay for a capability the platform could vacate is the strongest single demand signal, and here it's unambiguous. *Evidence: vendor pricing pages; several read via search snippet, not direct fetch — directionally solid, exact current rates [partly unverified].*
- **Developers doing it by hand, on-device.** [nsfwjs](https://github.com/infinitered/nsfwjs) (9.0k★), [GantMan/nsfw_model](https://github.com/GantMan/nsfw_model) (2.1k★), [Detoxify](https://github.com/unitaryai/detoxify) (1.3k★ toxic-text), and crucially the two Flutter packages above that ship a TFLite model fully offline into the APK. The APK-bloat workaround is the tell: developers are paying 17–22 MB of install size — a direct [install-conversion cost](https://apilevels.com/) in growth markets — because no platform API exists. *Evidence: live GitHub/pub.dev reads.*
- **The free crutch is being pulled.** Google's own [Jigsaw Perspective API](https://perspectiveapi.com/) — the free cloud toxicity scorer a generation of apps leaned on — **shuts down 31 December 2026**, stopped accepting new usage requests after February 2026, and offers no migration path, with Jigsaw citing "less demand for a standalone tool." An [April 2026 arXiv paper](https://getstream.io/blog/perspective-api-alternative/) ("Bye Bye Perspective API") documents the fallout. *Evidence: confirmed independently against the sunset notice.* This simultaneously removes the default free option and signals that cloud-era standalone moderation is ending — not that the need ended.
- **Community voice.** From a "What do you use for content moderation of UGC?" thread, a top recommendation for OpenAI's free moderation endpoint carried the caveat that it means ["potentially sharing data with OpenAI"](https://news.ycombinator.com/item?id=42830018) — the privacy objection an on-device API answers by construction. Developers also complain keyword filters ["flag everything with 'ass' (including 'assistant' and 'class')"](https://news.ycombinator.com/item?id=42830018), pushing them to heavier pipelines. *Evidence: HN via search snippet — re-confirm wording before quoting publicly.*
- **The absence signal.** No major consumer app has blogged about shipping on-device moderation. I read that as the capability being hard enough that only server-side teams attempt it — which is exactly the gap a platform API closes, not evidence of no demand.

---

## Why now

1. **Capability shift (2025–2026).** Quantized classification models crossed the fleet-wide bar. INT8 MobileBERT-class text classifiers (~25 MB) and MobileNet-class NSFW detectors (~5–22 MB) now hit near-cloud quality in English and sit in the same weight class ML Kit image labeling and Smart Reply already run offline across the Android 9+ fleet. Google *itself* shipped [Android System SafetyCore](https://support.google.com/product-documentation/answer/16001929) in late 2024 and now exposes [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) — proof the on-device safety model and its fleet delivery already exist.
2. **Regulatory shift (binding now).** The [EU DSA](https://eur-lex.europa.eu/eli/reg/2022/2065) has applied to all platforms since **17 Feb 2024**; the UK Online Safety Act's [illegal-harms duties](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/codes-of-practice) took force **17 Mar 2025** and its [child-safety codes with "highly effective age assurance"](https://www.ofcom.org.uk/online-safety/protecting-children/) from **25 Jul 2025**; and Google Play's own [Child Safety Standards](https://support.google.com/googleplay/android-developer/answer/14747720) for Social and Dating apps became mandatory **19 Mar 2025**, applying regardless of whether the app has child users. Moderation moved from optional to statutory while I was writing the snapshot.
3. **Demand shift (2026).** The Perspective sunset (Dec 2026) retires the default free toxicity tool at the same moment obligations peak, leaving a cohort of apps actively shopping for a replacement — ideally one that is cheaper, private, and offline.

All three carry dates. The why-now is strong.

---

## The capability gap

What exists, checked against live docs:

- **Google / Android.** [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) ships (`requestContentClassification(...)`), but it is a **user-consent sensitive-content shim**, not a developer-policy moderation API: it returns only `TYPE_ALLOWED / TYPE_WARNING / TYPE_BLOCKED / TYPE_UNCLASSIFIED`, classifies "based on the user's settings," and the judgment is performed by the system role-holder ([`ROLE_CONTENT_SAFETY`](https://developer.android.com/reference/android/app/role/RoleManager) = SafetyCore). No harm categories, no scores, no developer-set thresholds, no "enforce *my* community guidelines." ML Kit's catalog has [no moderation/toxicity/NSFW model](https://developers.google.com/ml-kit). MediaPipe text/image classification is [bring-your-own-model](https://ai.google.dev/edge/mediapipe/solutions/vision/image_classifier). AICore/Nano safety filters are an internal gate, not a callable classifier.
- **Apple.** [Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis) ships on-device to third parties — but **image/video nudity only**, entitlement-gated, no text, no probabilities, no tuning. Apple partially beat Google to on-device moderation, and still left the whole text-toxicity and tunable-policy surface empty.
- **Cloud (the actual main competitor).** The thing a developer uses today instead is a **cloud moderation API** — [OpenAI's free omni-moderation](https://developers.openai.com/api/docs/guides/moderation), [Hive](https://docs.thehive.ai/docs/visual-moderation-api), [Perspective](https://perspectiveapi.com/) (until Dec 2026). [Azure](https://techcommunity.microsoft.com/blog/aiazureaiservicesblog/announcing-the-public-preview-of-hybrid-azure-ai-content-safety/4253334) is the only vendor with an on-device SDK, and it's a C++ server/edge component, not an Android app API.

Precisely what's missing: **an Android, on-device, multi-category (toxicity / hate / sexual / violence / self-harm), text-and-image, developer-tunable moderation classifier that any app can call with its own policy, no privileged role.** Nobody ships it.

---

## Proposed surface

An ML Kit `ContentSafety` API, shaped like image labeling (a classifier that returns labels + confidences) rather than like the platform's user-settings shim.

```kotlin
val safety = ContentSafety.getClient(
    ContentSafetyOptions.Builder()
        .setCategories(TOXICITY, SEXUAL, VIOLENCE, HATE, SELF_HARM)
        .setMinConfidence(0.0f)          // app sets its own thresholds
        .build())

val result: ContentSafetyResult = safety.classify(TextContent(userMessage)).await()
// result.labels: List<ContentSafetyLabel(category, confidence 0f..1f, localeConfidence)>
// The APP's policy decides the action. ML Kit returns signals, never a verdict.
```

- **Inputs/outputs:** text and single images in; a list of `(category, confidence, per-locale reliability)` out. The `localeConfidence` field is the honesty mechanism — the model tells the developer when it is out of its linguistic depth instead of silently guessing.
- **Model class & delivery:** a quantized MobileBERT/EmbeddingGemma-class text head + MobileNet-class image head, delivered by [Play for On-device AI](https://developers.google.com/) so it adds ~0 MB to the APK and updates without an app release.
- **Device requirements:** target minSdk 29 (~91% of active devices) — not Nano-gated.
- **What it deliberately does *not* do:** it returns no verdict and takes no action (the app's policy owns that, which is where liability sits); it does **not** cover CSAE/CSAM (a separate, legally-gated first-party path — see the case against); and it does not promise uniform quality across all languages (it reports per-locale confidence instead).

**Time-to-first-hello-world target: 15 minutes.** Achievable only if the model is Play-delivered (no key, no bundle, no new dangerous permission) and availability degrades to a typed result the developer can branch on rather than an exception. If first-run model download forces a network round-trip the developer has to design around, that's the one friction point keeping this at S4 = 4, not 5 — and it's a design constraint, not a footnote.

---

## Reach & sizing

Inputs, each sourced, with the soft ones flagged:

- `A_cat`: Play has ~1.55M apps ([AppBrain, Jun 2025](https://www.appbrain.com/stats/number-of-android-apps)); UGC-bearing categories are historically ~8–15% → **~125k–230k apps**, of which maybe **~15k–45k** clear a ~50K-install "commercially real" bar. *The 50K-install column was unreadable — this step is an estimate.*
- `m_install`: on-device ML is heavily install-skewed — TensorFlow Lite sits in <1% of apps but ~11% of installs (≈11.8×, [AppBrain ML SDKs](https://www.appbrain.com/stats/libraries/tag/machine-learning)). UGC concentrates in the biggest apps for the same reason.
- `r_reach`: minSdk 29 ≈ **90.8%** of active devices ([apilevels.com](https://apilevels.com/)).

**Install-weighted reach:** UGC apps plausibly sit in **~15–30% of all Play installs**; the seven largest alone (WhatsApp, Facebook at [5B+](https://play.google.com/store/apps/details?id=com.whatsapp); Instagram, Telegram, TikTok, Snapchat at 1B+) exceed **20 billion cumulative installs**. That is a genuine Type-F reach story, and it's real precisely because classification isn't Nano-gated.

**Engineering cost avoided:** a conservative `E_diy − E_int` of ~3 engineer-weeks saved per adopter (model sourcing, quantization, device QA, and — the part teams under-price — perpetual maintenance against multilingual and adversarial drift) across even 10k adopters is thousands of engineer-months absorbed by one platform team. That clears the platform test comfortably on the numerator.

**Sensitivity.** Halve the UGC category share (8% not 15%) and halve the adoption ceiling, and install-weighted reach drops toward ~8–12% — still meaningful, still multi-category, verdict survives. What does *not* survive halving is my confidence in the absolute app counts; the robust claim is the directional one (UGC is a minority of apps but a large, install-heavy slice), and the honest output is that the exact SAM needs one afternoon with AppBrain's rendered tables to pin down.

---

## Adoption path

1. **The hook (15 min):** one Gradle line, classify a string, get calibrated labels back — the demo that replaces a developer's keyword blocklist and immediately stops flagging "class" and "assistant."
2. **First real integration:** screening the submit path for an image-sharing or messaging feature, replacing either a cloud moderation bill or a hand-bundled TFLite model — and shrinking the APK by the 17–22 MB that model cost.
3. **The dependency:** compliance posture. Once an app wires moderation into its DSA/OSA/Play-policy story and its [Play Console self-certification](https://support.google.com/googleplay/android-developer/answer/14747720), ripping it out means re-opening a legal workstream — a lock-in developers endorse rather than resent, because it's their obligation the API is discharging.

**First adopter:** a mid-size dating or marketplace app on Android-first growth markets, already feeling both the Play CSAE mandate and the cloud bill, without a server-side ML team. The second wave is the mega-apps, who adopt only after output stability and a per-locale quality floor are proven — which is exactly what a developer preview exists to establish.

---

## Execution plan

- **Developer preview:** ship English text + image NSFW to a dozen design partners from the dating/marketplace/kids cohort. Question it answers: *is the borrow path (S3) actually beaten once maintenance and APK size are priced in, and what's the real false-positive rate developers will tolerate in the submit path?*
- **Alpha/Beta — graduation condition:** a published per-locale quality floor for the top ~10 languages, and a committed output-score-stability contract across at least one model refresh. If multilingual quality can't clear an agreed floor, the honest move is to ship English-plus-N and say so, not to paper over it.
- **GA:** frozen label schema versioned independently of the underlying model, an explicit multi-year support policy, and the CSAE firewall documented.

**Org dependencies, named honestly:** this needs the SafetyCore/Android trust-and-safety team (who own the model and the `ROLE_CONTENT_SAFETY` plumbing) to say yes to a *developer-policy* surface that they have so far deliberately not exposed, and it needs a ruling that the ML-Kit-vs-MediaPipe-vs-platform ownership question lands on ML Kit. If trust-and-safety says no, the idea is dead regardless of demand — which is the load-bearing risk below.

---

## The case against

The strongest case against is not feasibility and not demand — both are solid. It is that **Google's absence here may be a deliberate abstention, not an oversight**, exactly like face identity / 1:N matching. A developer-policy moderation classifier makes Google the detector of "toxic," "hateful," and "sexual" for the whole ecosystem, and a platform that returns those labels inherits a reputational and legal blast radius every time the model is wrong in a politically charged way. `ContentSafetyManager`'s "based on the user's settings" framing looks like a chosen answer to that liability — keep the judgment with the OS and the user, never hand a tunable harm-detector to arbitrary apps. If that reading is right, this is a shelve, and no amount of demand evidence overrides it.

The report's answer — and it has to be argued, not asserted — is that the product returns **signals, not verdicts**, and takes **no action**: the app's policy decides, and liability sits with the policy-setter, the same division Perspective and OpenAI's moderation endpoint already operate under without Google melting down. That reframes Google's role from "arbiter" to "detector," which is the role it already plays inside SafetyCore. But this is a judgment call for the trust-and-safety org, and it is genuinely contestable — hence Prototype, not Build.

The live *adoption* failure mode, from the rubric's list, is **the platform absorbing the problem underneath you (S5)**: a general on-device model answering "is this toxic?" as a prompt. The mitigation is real but partial — the general model is flagship-gated for the foreseeable future, so a small fleet-wide classifier keeps a reach moat that the prompt path can't match until Nano-class models reach mid-tier RAM. And the quieter risk is the **borrow path (S3)**: for the English-NSFW 80% case, a maintained Flutter wrapper genuinely mostly works, so the API has to win on the 20% — multilingual, maintained, no-bloat, compliance-grade — or it's a feature, not a platform API.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if Google's trust-and-safety org confirms that exposing a *developer-tunable* harm classifier (scores + categories, app-set thresholds) is a standing policy abstention rather than an unfilled gap — the same posture as face identity — then this is a documented shelve. Checkable by one conversation with the SafetyCore/`ROLE_CONTENT_SAFETY` owners.

**Load-bearing assumption:** that a single on-device model can hold a *publishable* quality floor across enough languages that the big install-weighted apps will adopt. If the honest floor is "English plus six languages," the reach number (S2) shrinks toward the cloud-still-wins zone for global apps.

**Re-check trigger if shelved:** a mid-tier (sub-8 GB) Gemini Nano / Gemma tier shipping — which would simultaneously kill this (general model absorbs it) *and* revive a different, larger idea (a general on-device safety-judgment API).

---

## Fit for this team

ML Kit, not the platform `ContentSafetyManager` and not MediaPipe. `ContentSafetyManager` is a framework API bound to the system role-holder and the user's settings — it structurally can't be the developer-policy, tunable, scored surface this needs, because its whole design point is that the OS and user, not the app, hold the judgment. MediaPipe gives you the runtime but makes the developer bring and maintain the model — which is the exact burden this idea removes. ML Kit is the sanctioned developer front door that already ships *opinionated, model-included* classifiers (image labeling, Smart Reply) across the whole fleet; a `ContentSafety` client is the same shape. The one honest caveat is the unresolved ML-Kit/MediaPipe convergence question — if that reorg is in flight, it has to be settled before this ships, or the capability fragments the developer story further rather than consolidating it.

---

## Open questions

- **Does `ClassifiableContent` accept text, or only media?** The reference class wouldn't render; it determines how much of SafetyCore's existing plumbing a text-toxicity path could reuse. *Settle by: reading the `android.app.contentsafety.ClassifiableContent` page in a browser.*
- **What is the real per-locale quality floor** for a single quantized on-device model across the top ~15 Play-market languages? *Settle by: benchmarking against multilingual HateCheck and a held-out multilingual toxicity set in the developer preview.*
- **What is SafetyCore's delivery channel and model size**, exactly? Only the ~5–6 MB system APK is public, not the model. *Settle by: internal confirmation — it determines whether ~0 MB APK impact is real.*
- **Is the exposure of developer-tunable moderation a policy abstention?** The single most decision-relevant unknown. *Settle by: one conversation with trust-and-safety.*

---

## Runners-up

- **On-device GenAI evaluation & regression harness (Type D).** Strong gates (feasibility trivial, high durability) and a clean why-now ([Apple shipped an Evaluations framework](https://developer.apple.com/) at WWDC26 while ML Kit ships only a prose "evaluate prompt quality" page). Lost on reach: its TAM is bounded by GenAI-API adoption, i.e. the ~3.7% Nano base — the opposite of the winner's fleet-wide story.
- **GenAI reach-tiering for sub-8 GB devices (Type F).** The highest strategic ceiling (converts flagship demos into platform), but the honest feasibility answer for *generative* quality on mid-tier is still "not yet," so it parks on G2 pending a mid-tier Nano/Gemma tier.
- **On-device neural TTS (Type A).** Clean whitespace ([Picovoice Orca](https://picovoice.ai/) sells it, Apple added speech generation, Google offers nothing modern), but weaker on the platform test than a safety classifier and carries no regulatory forcing function.
- **Availability/delivery lifecycle contract (Type E).** Maximum platform privilege, but invisible in a demo and it lost on demand evidence — the pain is real but under-documented publicly.

---

*Sources:*

- [Android ContentSafetyManager reference](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager)
- [android.app.contentsafety package summary](https://developer.android.com/reference/kotlin/android/app/contentsafety/package-summary)
- [Understanding Android System SafetyCore (Google support)](https://support.google.com/product-documentation/answer/16001929)
- [Google confirms Android SafetyCore (The Hacker News)](https://thehackernews.com/2025/02/google-confirms-android-safetycore.html)
- [Apple Sensitive Content Analysis framework](https://developer.apple.com/documentation/sensitivecontentanalysis)
- [ML Kit](https://developers.google.com/ml-kit)
- [MediaPipe image classifier](https://ai.google.dev/edge/mediapipe/solutions/vision/image_classifier)
- [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation)
- [Hive Moderation pricing](https://thehive.ai/pricing) · [Hive API docs](https://docs.thehive.ai/docs/visual-moderation-api)
- [AWS Rekognition content moderation](https://aws.amazon.com/rekognition/content-moderation/) · [pricing](https://aws.amazon.com/rekognition/pricing/)
- [Azure AI Content Safety embedded SDK preview](https://techcommunity.microsoft.com/blog/aiazureaiservicesblog/announcing-the-public-preview-of-hybrid-azure-ai-content-safety/4253334) · [pricing](https://azure.microsoft.com/pricing/details/content-safety/)
- [Google Cloud Vision pricing](https://cloud.google.com/vision/pricing)
- [Jigsaw Perspective API (sunset notice)](https://perspectiveapi.com/) · [Perspective shutdown coverage](https://getstream.io/blog/perspective-api-alternative/)
- [nsfwjs](https://github.com/infinitered/nsfwjs) · [GantMan/nsfw_model](https://github.com/GantMan/nsfw_model) · [Detoxify](https://github.com/unitaryai/detoxify)
- [nsfw_detector_flutter](https://pub.dev/packages/nsfw_detector_flutter) · [flutter_nsfw_detector](https://pub.dev/packages/flutter_nsfw_detector)
- [On-Device Content Moderation (arXiv 2107.11845)](https://arxiv.org/abs/2107.11845)
- [HN: OpenAI moderation thread](https://news.ycombinator.com/item?id=49177920) · [HN: image moderation cost](https://news.ycombinator.com/item?id=17730878) · [HN: UGC moderation](https://news.ycombinator.com/item?id=42830018)
- [EU DSA (Reg. 2022/2065)](https://eur-lex.europa.eu/eli/reg/2022/2065) · [DSA package](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act-package)
- [Ofcom illegal-harms codes](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/codes-of-practice) · [Ofcom protection of children](https://www.ofcom.org.uk/online-safety/protecting-children/)
- [Google Play Child Safety Standards policy](https://support.google.com/googleplay/android-developer/answer/14747720) · [Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [EU DMA Alphabet AI interoperability decision](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [apilevels.com](https://apilevels.com/) · [AppBrain ML SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning) · [killedbygoogle](https://killedbygoogle.com/)
