# On-Device Content Safety API — a tiered, tunable moderation classifier for the whole Android fleet, not just flagships

**Type:** A (new capability API) with a Type-F reach core · **Verdict:** Prototype (developer-preview to collect demand evidence) · **Opportunity: 6/10 (Qualified)**
*2026-11-03 · Prepared for Android ML Kit · Evidence current as of 2026-11-03*

> A dating-app engineer this Tuesday is bundling a 20 MB open-source NSFW model into their APK, wiring up a cloud moderation call at ~$3 per 1,000 images for everything the on-device model is unsure about, and writing their own fallback for the users with no network — because Play policy already holds them liable for user content and ships them no classifier to meet it. ML Kit could give them a tunable, on-device, per-category safety classifier that runs on essentially every Android phone, not the ~3.7% that run Gemini Nano. The one number that matters: the capability developers are hand-rolling runs in **2–3.5 MB on a 2019-era CPU**, so reach here is gated by adoption, not hardware.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Qualified | composite 3.65 × 2 = 7.3, −1 because Platform Privilege scores exactly 3; no +1 since S1 is 4 not 5 |
| Platform privilege (gate) | 3/5 — pass (weakest gate) | Bumble and Lovoo each shipped their own classifier; nsfwjs has 9,024★ — a 3-person team ships the tiny tier as a Gradle dep. Privilege is real only in trust/liability/policy-alignment/managed delivery, not raw inference ([bumble-tech/private-detector](https://github.com/bumble-tech/private-detector), [nsfwjs](https://github.com/infinitered/nsfwjs)) |
| Feasibility headroom (gate) | 4/5 — pass | Tiny CNN NSFW 2–3.5 MB, ~10–100 ms CPU fleet-wide; Llama Guard 3 1B-INT4 440 MB, ≥30 tok/s on commodity Android CPU ([arXiv 2411.17713](https://arxiv.org/abs/2411.17713)) |
| Durability (gate) | 4/5 — pass | Compliance is a permanent, legally-anchored need (DSA, UK OSA, US age-assurance laws); Google owns the surface it recommends filters for |
| Demand evidence (25%) | 4/5 | Two dating cos built their own; nsfwjs 9,024★ active; mature cloud-only paid market (Hive ~$3/1k images, Sightengine, AWS, Azure). Caveat: demand is shipped as code, not vocalized; skews to image-NSFW |
| Install-weighted reach (15%) | 4/5 | ~99%+ device reach for a CNN at minSdk 21–24 vs Nano's ~3.7%; UGC categories carry large install share; 2–25% install-weighted [EST] |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The **borrow** path is cheap: a free OSS NSFW model bundles in a weekend. The LLM-guard tier is genuinely engineer-months |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, on-device, no API key, no new dangerous permission, model via Play delivery; plausible <15 min for the pre-filter tier |
| Substitute half-life (15%) | 3/5 | Two live substitutes: Nano Prompt API as a moderation prompt, and Android's own `ContentSafetyManager` (API 37.x, preview). Both partial today; both closing |
| Strategic complement (10%) | 4/5 | Free, safe on-device moderation → more GenAI ships on Android safely → Play/Android gravity; directly screens the Prompt API's own I/O |
| **Composite** | **3.65** | weighted mean of S1–S6 |

Least trustworthy line: install-weighted reach (S2). AppBrain and 42matters did not resolve in this session, so the adoption-ceiling and install-multiplier inputs are estimates, not AppBrain-published figures.

---

## The problem

A consumer app that lets users post text or images has a job it cannot skip: keep prohibited content — sexual imagery sent without consent, harassment, scams, self-harm content reaching a minor — out of the product. The job is now a legal duty, not a nicety. Google Play's AI-Generated Content policy already requires in-app reporting of offensive output and tells developers to "adopt filters and classifiers," while shipping them none. The UK Online Safety Act's illegal-content and children's codes are in force. The EU DSA is fully in force. US state age-assurance laws are activating on fixed 2027 dates. The app team carries all of it in the client, in every jurisdiction at once.

What they do instead today splits in two. The privacy-sensitive minority — dating apps, encrypted messengers, browser-extension authors — bundles an open-source NSFW model and runs it on-device: Bumble open-sourced its EfficientNetV2 "Private Detector" ([1,366★](https://github.com/bumble-tech/private-detector)) explicitly so other developers could reuse it; Lovoo shipped an iOS CoreML classifier ([1,683★](https://github.com/lovoo/NSFWDetector)); a live cluster of Flutter packages bundles a ~20 MB open_nsfw-derived TFLite model that runs "no server, no telemetry." The majority routes user content to a cloud API — Hive at roughly $3 per 1,000 images, Sightengine, AWS Rekognition, Azure AI Content Safety — and pays per call, forever, with every image leaving the device.

This is structurally produced, not an accident of tooling. A 100M+ install app operates under three constraints that collide here. Its brand cannot ship an embarrassing output, so "the model is right 92% of the time" is a no-ship for final decisions but fine for a pre-filter. Its cost scales linearly with DAU, so a cloud moderation call on every upload is a margin line item. And its most sensitive content — exactly the content most important to moderate — is the content a privacy promise or an encryption guarantee forbids sending to a cloud. On-device is the architecturally correct place to screen content that must not leave the device, and it is precisely where no platform ships a usable, tunable, multi-category classifier.

---

## Proof & signals

- **Developers doing it by hand, on-device:** `bumble-tech/private-detector` (1,366★, EfficientNetV2 binary classifier, SavedModel + training code released for reuse — confirmed); `infinitered/nsfwjs` (9,024★, active to 2026-10-29, "client-side indecent content checking" — confirmed); `devzwy/open_nsfw_android` (1,961★, offline Android TF port — confirmed); `notAI-tech/NudeNet` (2,498★, ONNX — confirmed); `lovoo/NSFWDetector` (1,683★, iOS CoreML — confirmed). Traction concentrates in the open_nsfw / MobileNet image lineage.
- **A live on-device mobile cottage industry:** Flutter packages `flutter_nsfw_detector`, `nsfw_detector_flutter` (v2.0.0), `nsfw_detect` run NSFW inference fully offline via LiteRT/TFLite/CoreML, bundling a ~17–22 MB model, advertising "no internet, no server, no extra assets" (single-source: pub.dev via search). `nsfw_detect`'s own docs say detection "should be treated as one local moderation signal inside a broader safety workflow" — the developer has already discovered this is triage, not adjudication.
- **Someone charging money for it:** Hive (~$3/1k images, ~$0.50/1k text), Sightengine ($0.002/op), AWS Rekognition (~$0.001/image), Azure AI Content Safety (~$0.38/1k text, ~$0.75/1k images) — all cloud round-trip (pricing single-source; vendor pages were network-blocked). Microsoft is retiring Azure Content Moderator on 15 Mar 2027, forcing a paid migration (confirmed via Microsoft) — standing churn a stable platform primitive would absorb.
- **Apps that shipped it themselves, server-side:** Meta's "Class-RAG: Real-Time Content Moderation with RAG" ([arXiv 2410.14881](https://arxiv.org/abs/2410.14881)) confirms large platforms build GenAI-I/O safety classifiers — but in the cloud, not on-device.
- **Community voice:** here the signal is thin. HN, Stack Overflow and Reddit were network-blocked this session, so no verbatim "how do I moderate on-device on Android" thread was retrievable. **The absence signal:** demand is expressed through shipped artifacts, not forum begging. Developers quietly bundle a 20 MB model and move on. That is strong *latent* demand and weak *vocalized* demand — which means the platform's wedge is converting the cloud-paying majority who are not yet asking for this by name, a weaker position than a loud community would give.

Every star count and push date above is confirmed against the live GitHub API; pricing and pub.dev claims are single-source because the vendor hosts did not resolve.

---

## Why now

1. **Capability shift (2024–2026):** a policy-flexible safety LLM now runs on a commodity Android CPU. Meta's Llama Guard 3 1B-INT4 (Nov 2024, [arXiv 2411.17713](https://arxiv.org/abs/2411.17713)) is 440 MB and runs at ≥30 tok/s on an Android CPU with no NPU; tiny NSFW CNNs have run in a few MB for years. The missing piece was never the model — it is the packaging.
2. **Competitive/regulatory shift (2026–2027):** Apple shipped the only first-class on-device safety API, `SCSensitivityAnalyzer` (nudity-only, binary, on-device). Android exposed `ContentSafetyManager` (API 37.x, preview — [confirmed](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager)), returning allow/warn/block from one system role-holder. The EU DMA Article 6(7) decision (adopted 16 Jul 2026) forces Alphabet to expose on-device models to third parties in Android 18 by **1 Aug 2027**. The US age-assurance wave activates on fixed dates: Alabama 1 Jan 2027, Utah 6 May 2027, Louisiana 1 Jul 2027, with Texas SB 2420 already enforceable.
3. **Demand shift (2023→):** Play's AI-Generated Content policy made every GenAI-shipping app accountable for output it did not generate, and told it to add filters it does not have.

The why-now is strong but double-edged: the same DMA clock that makes platform on-device AI urgent also forces Google to open the models, which erodes the managed-path moat this API would sit on.

---

## The capability gap

Checked, with the doc page for each negative (verified via WebSearch snippets this session — `developers.google.com`, `ai.google.dev` and `developer.apple.com` bodies did not resolve):

- **ML Kit:** no moderation classifier. Safety exists only as non-tunable internal filters on the Gemini Nano Prompt API; a failed check surfaces as an exception, never as category scores ([release-notes](https://developers.google.com/ml-kit/release-notes); [GenAI Terms](https://developers.google.com/ml-kit/genai-terms)). Image Labeling returns generic ImageNet-style entities, not unsafe-content categories.
- **MediaPipe Tasks:** the runner exists; the model does not. Bundled Text Classifier does sentiment only; bundled Image Classifier is EfficientNet-Lite on ImageNet's 1,000 generic classes. Moderation requires a bring-your-own TFLite model ([text_classifier](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)).
- **ShieldGemma 1/2:** real safety models, shipped as **open weights, not an API**. Text is 2B/9B/27B; ShieldGemma 2 image is **4B** (flagship-only), with "smaller sizes" only promised ([HF card](https://huggingface.co/google/shieldgemma-2-4b-it), [arXiv 2504.01081](https://arxiv.org/abs/2504.01081)). No ML Kit/MediaPipe binding.
- **Apple `SCSensitivityAnalyzer`:** on-device, developer-callable — but nudity-only, binary, image/video only, entitlement-gated, and disabled if the user turns the system setting off ([doc](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer)).
- **Qualcomm AI Hub:** optimization catalog; no moderation/safety model surfaced.

**The main competitor a developer uses today is a cloud moderation API** (Hive/Sightengine/AWS/Azure) for the majority, or a bundled OSS CNN for the privacy-sensitive minority. The single closest *platform* competitor is Android's own **`ContentSafetyManager`** — and precisely why it is not this API: it returns one verdict (allowed/warning/blocked/unclassified), not per-category confidence scores; the classification is done by whichever opaque "Content Safety" role-holder is installed (in practice Android System SafetyCore), oriented to nudity/NCII; the developer cannot choose categories, set thresholds, or screen GenAI inputs/outputs; and it is preview-stage (API 37.x, newer than the Aug-2026 landscape snapshot — the snapshot needs updating). The whitespace is exact: **a packaged, on-device, developer-callable classifier returning tunable per-category scores for arbitrary user text and images, including for screening an app's own GenAI I/O.**

---

## Proposed surface

A tiered ML Kit Content Safety API. The developer writes against one interface; ML Kit executes the heaviest tier the device supports, and the result always carries which tier ran so the developer can branch on confidence.

```kotlin
val safety = ContentSafety.getClient(
  ContentSafetyOptions.Builder()
    .setCategories(SEXUAL, VIOLENCE, HARASSMENT, HATE, DANGEROUS, SCAM)
    .setThreshold(SEXUAL, 0.85f)          // per-category tunability
    .setPreferredTier(Tier.AUTO)          // AUTO | FAST_CPU | POLICY_LLM
    .build())

// Image (whole-fleet tier): tiny CNN, a few MB, tens of ms on CPU
val result: SafetyResult = safety.classify(image).await()
result.score(SEXUAL)        // 0.0–1.0 per category
result.tierUsed             // FAST_CPU  → triage-grade
result.verdict(SEXUAL)      // ALLOW / REVIEW / BLOCK, from the app's thresholds

// Text, or GenAI I/O screening (mid-tier, async): policy-flexible guard
val textResult = safety.classify(userMessage, policy = myPolicySpec).await()
```

- **Inputs/outputs:** `Bitmap`/`Uri`/image, or text (incl. an app's own LLM prompt and response); out is per-category float scores plus a developer-threshold verdict and the tier used.
- **Model class behind it:** Tier 1 — a few-MB MobileNet-class image classifier and a ~64 MB DistilBERT-class text classifier, CPU, whole-fleet. Tier 2 — a Llama-Guard/ShieldGemma-class policy-prompted guard (~440 MB INT4), mid-tier, async.
- **Delivery:** models ship through Play for On-device AI, so the APK grows negligibly and the size tax is avoided.
- **What it deliberately does NOT do — the exclusions carry the proposal:**
  - **No CSAM detection.** CSAM is perceptual-hash matching against legally-controlled databases (PhotoDNA, Google Content Safety / CSAI Match), not classification. The API must route there and say so, or it becomes a legal and embarrassment liability.
  - **No final-adjudication guarantee.** The output is triage — flag-for-review, blur-by-default, rate-limit — not a ban decision, and the docs say so, because small-model quality trails large by ~8–12 F1, worst on non-English.
  - **No identity, no 1:N matching.**

**TTFHW target: 15 minutes** — one Gradle line, `getClient`, `classify`, no API key, no new dangerous permission, works in the emulator. The one friction that threatens it is first-use model download (network-dependent, like all ML Kit GenAI); the fix is bundling the few-MB Tier-1 image model so a hello-world runs offline immediately and only Tier 2 downloads.

---

## Reach & sizing

Device reach is the strong number and the point of the whole idea. A CNN at minSdk 21–24 reaches **~99%+ of the Play-services base** ([ARITH] on Google's published distribution); Gemini Nano now needs ~12 GB RAM and a flagship SoC, a *shrinking* ~1–3.7% slice. So device eligibility is not the binding constraint — adoption is.

App sizing (AppBrain unreachable → estimates, flagged):
- **SAM** = UGC-bearing categories (Social, Communication, Dating, Video, Entertainment, kids/Education) ≈ 15–25% of ~2.38M Play apps = **~357K–595K apps** [EST].
- **Eligible SAM** (real UGC × >50K-install scale, ~5–8%) = **~18K–48K apps** [ARITH on EST].
- **SOM at year 3** (ML-Kit-class diffusion, 3–8% of eligible) = **~550–3,850 apps** [ARITH on EST].
- **Install-weighted reach** = **~2–25%** of the Android install surface, swinging entirely on whether a few billion-install UGC apps adopt [ARITH on EST].
- **Sensitivity:** halving the softest input (3-year capture rate) → SOM ~270–1,920 apps, install-weighted reach ~1–13%. The verdict does not flip — it stays a Prototype either way — but the spread says the honest next step is a developer preview that measures real adoption, not a bigger spreadsheet.

Engineering cost avoided is modest for Tier 1 (a team bundles an OSS NSFW model in a weekend — the borrow path) and real for Tier 2 (model sourcing, INT4 quantization, ExecuTorch integration, device testing, and perpetual policy maintenance = engineer-months). The platform test clears only if the value is counted as Tier 2 plus the cloud-cost-and-privacy deflection, not Tier 1 alone.

---

## Adoption path

1. **The hook:** a dating or social app replaces its bundled OSS NSFW model with one Gradle line and gets per-category scores plus Play-delivered model updates — a 15-minute win that also shrinks the APK.
2. **First real integration:** the app routes every upload through Tier 1 on-device as a pre-filter, sending only the uncertain minority to its existing cloud moderator — cutting per-call cloud spend and keeping clear content on the device.
3. **The dependency:** the app wires Tier 2 into its own GenAI feature's input/output screening and sets per-category thresholds tied to its Trust & Safety policy; removing it later means rebuilding the policy mapping, which the team endorses rather than resents.

**First adopter:** a privacy-positioned app already shipping an on-device classifier — Bumble, a Lovoo-class dating app, or an encrypted messenger — because they have the pain, the on-device conviction, and a reference others copy. If no such app will adopt in preview, the funnel does not start, and that is the first thing the preview must find out.

---

## Execution plan

- **Developer preview:** ship Tier 1 (image NSFW + text toxicity, per-category scores) to 3–5 design partners, at least one privacy-positioned UGC app. Question it answers: will a team replace its bundled OSS classifier with this, and does per-category scoring change their moderation flow? Evidence collected: the S1 adoption signal the sizing can't settle.
- **Alpha/Beta:** add Tier 2 (policy-prompted guard, async) and GenAI-I/O screening. Graduation condition: a design partner ships Tier 1 to production and reports measured cloud-moderation-cost or privacy-surface reduction.
- **GA:** commit the category taxonomy and the score-schema as a surface versioned **independently of the model**, with an output-stability contract across model refreshes — the single thing a moderation API cannot break, because a threshold that silently shifts meaning re-opens every integrator's compliance posture.

Org dependencies, named honestly: the **Android framework team owns `ContentSafetyManager`** and the SafetyCore role; this API either coordinates with them or fragments the story. The **Responsible-AI/ShieldGemma team** owns the models. **Play for On-device AI** owns delivery. If the framework team says this belongs in the OS, they may be right (see Fit).

---

## The case against

The strongest version: the high-demand half of this idea is the half the platform has the least right to own, and the half it can own is the half with thin demand. Image-NSFW detection — the capability with 9,000 GitHub stars and a Flutter cottage industry — is a few-MB CNN that a three-person team bundles in a weekend (Platform Privilege = 3). Meanwhile the genuinely platform-privileged parts — a trusted, liability-covering, policy-tunable, GenAI-I/O-screening guard — sit in the heavier Tier 2 where demand is quieter and mostly served by cloud today.

The live failure modes are two, named rather than recited. **#7, undifferentiated against a free substitute:** against bundled OSS, this API wins only on model updates, per-category scores, and Play delivery — real but incremental, and a skeptical lead will ask whether that clears a five-year public-API commitment. **#2, the platform absorbs the problem underneath you:** Android's own `ContentSafetyManager` is already in preview; if it grows per-category scores and developer tunability, the OS has eaten this API before it ships. Mitigation is to aim ML Kit squarely where the OS hook is weak — tunable multi-category *scores*, text, and GenAI-I/O screening — and to defer the nudity/NCII system-role piece to the framework rather than duplicate it. That mitigation is also an admission: the defensible surface is narrower than the headline.

The case against is not weak. It is the reason the verdict is Prototype, not Build.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if Android's `ContentSafetyManager` graduates from preview (API 37.x) to a stable, developer-tunable, multi-category *scoring* API with Play-delivered models before ML Kit ships this, the OS has absorbed the opportunity — reframe this as a thin ML Kit convenience wrapper over `ContentSafetyManager`, or shelve. Checkable against the Android API release notes for `android.app.contentsafety`.

**Load-bearing assumption:** that UGC-app teams want per-category *scores* and policy *tunability* enough to prefer a platform API over (a) the free OSS CNN they already bundle, or (b) the OS's verdict-only hook. The developer preview exists to test exactly this.

**Re-check trigger if shelved:** a sub-second on-device policy guard ships (removing Tier 2's async-only limit), or the EU DMA 1 Aug 2027 obligation lands and third-party demand for a safety layer over the newly-exposed on-device models spikes.

---

## Fit for this team

ML Kit is the right owner for the *tunable, scored, cross-category, GenAI-I/O* layer — it already owns the Prompt API whose inputs and outputs most need screening, and a packaged task API is its core competence. But the nudity/NCII system-role capability already lives in the Android framework (`ContentSafetyManager` + SafetyCore), and ML Kit should not duplicate it; the clean division is framework for the OS-level verdict-and-role piece, ML Kit for the developer-facing scored-and-tunable classifier. The biggest internal risk here is exactly the one this ecosystem keeps hitting — a capability landing in two parts of Google's stack and fragmenting the developer story. If the framework team intends `ContentSafetyManager` to become the tunable scoring surface, ML Kit should not build this at all, and saying so is more valuable than a weak territorial claim.

---

## Open questions

- **Real adoption rate.** AppBrain/42matters did not resolve this session, so the install-weighting multiplier and 3-year ceiling are estimates. What would settle it: AppBrain `/stats/libraries` for a comparable on-device ML SDK's %apps vs %installs, and a design-partner preview.
- **Sustained thermal/power budget.** Every per-item latency figure found is single-shot. Moderating every upload/message continuously on mid-tier silicon has no published sustained-throughput or power number. What would settle it: a pre-build measurement on a 6 GB device under continuous load.
- **Non-English quality floor.** The 1B guard trails the 8B by ~8–12 F1, worst on non-English — and UGC moderation is global. What would settle it: per-language F1 on the target taxonomy before committing a category to "scored" vs "experimental."
- **Framework team's intent for `ContentSafetyManager`.** Whether it will become tunable and scored is the whole kill criterion. What would settle it: an internal roadmap conversation, not research.

---

## Runners-up

- **On-device eval & quality harness (Type D)** — ML Kit prescribes a "evaluate prompt quality" workflow and ships no harness, token accounting, or regression tooling, while Apple shipped an Evaluations framework; lost on Platform Privilege (a 3P can ship an eval harness as a Gradle dep — a weaker G1 than the moderation idea's liability/trust angle).
- **Deferred/opportunistic inference scheduler (Type E)** — "run this batch when charging, on wifi, idle" under the shared system model; strongest gates of the slate (only the platform can schedule under its own quotas) but lost on S1 — demand is real yet invisible in a demo and unvocalized, so it could not be evidenced as well this run.
- **On-device neural TTS developer API (Type A)** — genuine whitespace (Picovoice Orca sells it; Apple ships speech generation; Google has nothing), but deferred: it is a narrower single-capability bet and the moderation idea carries a dated regulatory forcing function it lacks.
- **Model-availability state machine / delivery contract (Type E)** — the best-evidenced developer complaint in the ML Kit issue tracker (P8: models fail silently, offline, unobservably); lost this run only on reach breadth versus the moderation idea's whole-fleet story, and is a strong candidate for a future run.

---

*Sources:*
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit GenAI Terms](https://developers.google.com/ml-kit/genai-terms)
- [MediaPipe Text Classifier](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)
- [ShieldGemma 2 (image) HF card](https://huggingface.co/google/shieldgemma-2-4b-it) · [ShieldGemma 2 arXiv 2504.01081](https://arxiv.org/abs/2504.01081)
- [Apple SCSensitivityAnalyzer](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer)
- [Android ContentSafetyManager](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) · [ContentClassificationResult](https://developer.android.com/reference/android/app/contentsafety/ContentClassificationResult)
- [Llama Guard 3 1B-INT4 arXiv 2411.17713](https://arxiv.org/abs/2411.17713) · [Meta Llama Guard 3-1B-INT4 publication](https://ai.meta.com/research/publications/llama-guard-3-1b-int4-compact-and-efficient-safeguard-for-human-ai-conversations)
- [bumble-tech/private-detector](https://github.com/bumble-tech/private-detector) · [infinitered/nsfwjs](https://github.com/infinitered/nsfwjs) · [devzwy/open_nsfw_android](https://github.com/devzwy/open_nsfw_android) · [notAI-tech/NudeNet](https://github.com/notAI-tech/NudeNet) · [lovoo/NSFWDetector](https://github.com/lovoo/NSFWDetector)
- [Meta Class-RAG arXiv 2410.14881](https://arxiv.org/abs/2410.14881)
- Regulatory: [Texas SB 2420 (MoFo)](https://www.mofo.com/resources/insights/251111-texas-targets-app-stores-with-new-accountability-law) · [EU DMA Art. 6(7) specification (EC portal)](https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [UK OSA dates (Ofcom)](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/important-dates-for-online-safety-compliance) · [Google Play AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/14094294)

*Note on evidence: `developers.google.com`, `ai.google.dev`, `developer.apple.com` (bodies), `appbrain.com`, `42matters.com`, and `support.google.com` did not resolve via WebFetch in this session (outside the session's allowed network domains). Google/Apple primary docs and all sizing inputs were verified via WebSearch against those domains; where that limits confidence it is flagged inline. To firm up the sizing and the live policy wording, those hosts need allow-listing.*
