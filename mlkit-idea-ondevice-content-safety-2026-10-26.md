# ML Kit Content Safety — a developer-owned, on-device toxicity + imagery classifier, before the content leaves the phone

**Type:** G (Trust, safety & compliance), with a Type-B image wrapper and a Type-A text core · **Verdict:** Build, text-first · **Opportunity: 7/10 (Strong, time-boxed)**
*2026-10-26 · Prepared for Android ML Kit · Evidence current as of 2026-10-26*

> A trust-and-safety engineer at a 100M-install dating app spent last quarter standing up moderation: Bumble's open-sourced *Private Detector* bolted onto a 7-year-dead Yahoo NSFW model for images, a self-hosted Detoxify wrapper for English text, and a cloud call to Hive at ~$3 per 1,000 images for everything else. Three stacks, three failure modes, one that ships suspected illegal imagery to a US server the EU no longer lets them use. There is still no first-party, on-device, callable classifier that scores *their users'* text and images before anything leaves the device — on Android or iOS, nobody ships the text half at all.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Strong, time-boxed | composite 4.1 × 2 = 8.2, minus 1 for Durability gate at exactly 3; S1 is 4 not 5 so no uplift |
| Platform privilege (gate) | 4/5 — pass | AICore safety filters are internal-only ([Android blog, Oct 2024](https://android-developers.googleblog.com/2024/10/introduction-to-privacy-and-safety-gemini-nano.html)); a system-delivered shared model is privilege no Gradle dep has |
| Feasibility headroom (gate) | 4/5 — pass | small encoder/embedding + linear head runs fleet-wide; weak on non-English, CSAM excluded |
| Durability (gate) | 3/5 — pass, flagged | regulatory tailwind is durable, but Google is **sunsetting Perspective after 2026** ([FAQ](https://developers.perspectiveapi.com/s/about-the-api-faqs)) — its own text-toxicity service |
| Demand evidence (25%) | 4/5 | nsfwjs 9.0k★, devzwy/open_nsfw_android ~2.0k★, Detoxify active, Bumble + Samsung built their own |
| Install-weighted reach (15%) | 5/5 | ~96% of devices at minSdk 24/26 vs ~3.7% for Nano; adopters skew to 100M–1B+ apps |
| Build-vs-buy-vs-borrow (20%) | 4/5 | DIY is multi-month multilingual ML work (Bumble, Samsung did it); borrow (Detoxify/open_nsfw) is English-skewed and self-maintained |
| Integration cost / TTFHW (15%) | 5/5 | one Gradle line, one call returning scores, no key, no cloud, small model |
| Substitute half-life (15%) | 2/5 | image half is being absorbed *now* by `ContentSafetyManager` and Apple SCA; general models creep from above |
| Strategic complement (10%) | 5/5 | safe-by-default Android complements Play's own UGC-moderation mandate; on-device is a privacy wedge vs cloud |
| **Composite** | **4.1** | Build threshold, but carried by reach/integration/complement, not by the two lethal dimensions |

*Least trustworthy line: Substitute half-life. The image substitute (`ContentSafetyManager`, Apple SCA) is shipping as this is written, so the honest half-life on the image half is under a year; the whole case rests on the **text** core and developer-policy tunability surviving longer, which is a judgment, not a measurement.*

---

## The problem

A large consumer Android app's core loop leaks users at exactly the moments it invites them to produce content: the chat message, the profile photo, the marketplace listing, the comment, the uploaded clip. Every one of those is a moderation decision, and the app is now legally accountable for getting it right (see **Why now**). The job to be done is a developer's job under a compliance deadline: *given a piece of user text or an image, before I store it or show it to another user, tell me whether it is toxic, harassing, self-harm-related, sexual, or violent — cheaply, at my DAU volume, without shipping my users' private content to a third party.*

What do they do *instead* today? Three workarounds, each with a named cost. (1) **Cloud moderation APIs** — Hive at ~$3/1,000 images and ~$0.50/1,000 text calls ([pricing](https://hivemoderation.com/pricing)), Sightengine's tiers ([pricing](https://sightengine.com/pricing)), Azure Content Safety, OpenAI's free-but-cloud omni-moderation endpoint. This is a per-inference cost multiplied by DAU, plus a data-transfer that has become a regulatory liability. (2) **Hand-rolled on-device models** — porting a dead Yahoo NSFW net or wrapping Detoxify, then owning quantization, device testing, and multilingual drift forever. (3) **Keyword lists and regex**, which a published Android walkthrough admits cannot tell "breast cancer" from "naked breasts" ([ProAndroidDev](https://proandroiddev.com/how-to-detect-nsfw-text-content-in-android-effective-filtering-methods-ai-solutions-df3fbddf0fa5)).

This is structurally a *platform* problem, not an app problem, because every app solves it identically and badly. Moderation is not where a dating app differentiates from a video app — both need "is this image sexual, is this text abusive," and both are forced to reinvent it because the ML people in these orgs are server-side while the Android people aren't ML people. A capability that every app builds the same way, badly, is the definition of something that belongs in the platform. And unlike almost every other GenAI job, it must run on *every* device, not the 3.7% that run Gemini Nano — a banned-content gate you only ship to flagships is not a safety feature.

---

## Proof & signals

- **Developers doing it by hand (strong, dated):** `infinitered/nsfwjs` — **9,015★**, last push 2026-08-04, the canonical client-side NSFW classifier. `devzwy/open_nsfw_android` — **~1,960★**, archived, explicitly "offline TF detection, ~20ms/image, one-line API" for Android: its very existence is a developer rebuilding this capability because the platform vacated it. `notAI-tech/NudeNet` — 2,490★, active. `unitaryai/detoxify` — 1,311★, pushed 2026-10-20 (this week), the de-facto OSS text-toxicity model, repeatedly re-wrapped because there is no turnkey API. A crowd of 2025–2026 Flutter packages (`flutter_nsfw_detector`, `nsfw_detector_flutter`) all advertise "no uploads, runs on LiteRT + CoreML." *Evidence status: GitHub repo-search, star/push counts live as of 2026-10-26.*
- **Someone charging money for it:** a real paid cloud market — Hive (~$1.50/1k text, ~$3/1k image), Sightengine ($29–$399/mo), Azure Content Safety, WebPurify, enterprise Two Hat/Community Sift (no public pricing). Willingness to pay for a vacated capability is the strongest single demand signal, and it is unambiguous here. *Status: third-party pricing pages; treat exact figures as indicative.*
- **Apps that shipped it themselves:** **Bumble** open-sourced *Private Detector* (EfficientNet-v2, trained on an internal lewd-image set) in 2022 "so others can fine-tune their own" ([blog](https://bumble.com/the-buzz/bumble-open-source-private-detector-ai-cyberflashing), [repo](https://github.com/bumble-tech/private-detector)) — a dating company built a classifier because nothing first-party existed. **Samsung R&D** published an on-device moderation model (NSFW16k, **F1 0.91, 0.002 false-positive rate**) at IJCNN 2021 ([arXiv 2107.11845](https://arxiv.org/abs/2107.11845)) — an OEM treating this as platform-scale need. *Status: vendor/author claims, unverified against independent benchmarks.*
- **Community voice:** a Lemmy thread has developers proposing native clients run "offline NSFW inference on feed content" and reaching only for open_nsfw2 and hand-ported Android detectors ([lemmy](https://lemmy.ndlug.org/post/129017)). A Google AI dev-forum post asks plainly how to classify "nudity, weaponry or violent images" on-device with no clean answer ([forum](https://discuss.ai.google.dev/t/tensorflow-detection-question/30179)).
- **The absence signal:** searches for on-device *safety-LLM* ports (ShieldGemma/LlamaGuard on ExecuTorch/MediaPipe) return only low-star red-team wrappers. I read that as: the community self-serves the *classifier* pattern (encoder + head) happily, but the generative-guard pattern is not yet a solved on-device thing — which is exactly consistent with the feasibility finding below that the classifier, not the guard LLM, is the fleet-wide-viable architecture.

---

## Why now

1. **A capability shift (2025–2026):** small multilingual classifiers now fit the fleet. Google's own **EmbeddingGemma** (308M, <200MB RAM quantized, <22ms on EdgeTPU, 100+ languages; [blog](https://developers.googleblog.com/en/introducing-embeddinggemma/)) makes an embedding-plus-linear-head classifier viable on mid-tier silicon — a backbone that didn't exist two years ago.
2. **A competitive/regulatory shift (dated, and the core of the thesis):**
   - **Google is sunsetting Perspective API "after 2026"** ([FAQ](https://developers.perspectiveapi.com/s/about-the-api-faqs)) — removing its *only* free first-party text-toxicity service precisely as demand peaks. The incumbent is vacating.
   - **Apple shipped the image half on-device:** Sensitive Content Analysis (`SCSensitivityAnalyzer`, on-device, nudity + now graphic violence, image/video — but **no text**; [docs](https://developer.apple.com/documentation/sensitivecontentanalysis)). Android has a nascent, framework-level `ContentSafetyManager` answer (below), image-centric and user-bound.
   - **The EU ePrivacy derogation lapsed ~April 2026**, so cloud-scanning private messages for CSAM lost its clean legal basis — turning cloud moderation of the most sensitive content into acute liability and making local classify-and-block the defensible path ([Freshfields](https://riskandcompliance.freshfields.com/post/102mopa/an-uncertain-path-forward-the-eprivacy-derogation-and-child-safety-detection)).
   - **DMA Article 6(7)** compels Google to expose Android "processing resources including on-device machine-learning models" to third parties by **1 Aug 2027** ([Commission](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)).
3. **A demand shift (live, not future):** UK OSA illegal-content duties (17 Mar 2025) and child-safety/HEAA duties (25 Jul 2025) now bind any service likely accessed by UK children ([Ofcom](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/important-dates-for-online-safety-compliance)); the EU DSA's Article 16 notice-and-action has bound all hosting services since Feb 2024; and **Google Play itself already requires** in-app reporting and moderation for both AI-generated and user-generated content as a condition of distribution ([policy](https://support.google.com/googleplay/android-developer/answer/14094294)).

Three clocks, all with dates. This is a rare case where cost-of-delay reasoning genuinely applies.

---

## The capability gap

What exists across the stack, with the page checked:

- **Google ML Kit:** no moderation, safety, toxicity, or NSFW API. Release notes through 21 Jul 2026 add none ([release notes](https://developers.google.com/ml-kit/release-notes)).
- **AICore / Gemini Nano:** input/output safety classifiers exist but guard *Nano's own* I/O; never exposed as a standalone developer classifier ([blog](https://android-developers.googleblog.com/2024/10/introduction-to-privacy-and-safety-gemini-nano.html)).
- **MediaPipe Tasks:** Text/Image Classifier are bring-your-own-model; the bundled text model is sentiment, the image model is generic labeling — no shipped safety model ([docs](https://developers.google.com/mediapipe/solutions/text/text_classifier)).
- **Perspective API:** cloud REST, full toxicity taxonomy — but cloud, and sunsetting after 2026 ([FAQ](https://developers.perspectiveapi.com/s/about-the-api-faqs)).
- **ShieldGemma (2B/9B/27B text, 4B image):** raw Hugging Face weights, not a callable ML Kit/MediaPipe task; smallest text variant is 2B ([model](https://huggingface.co/google/shieldgemma-2b)).
- **Android `ContentSafetyManager`** (`android.app.contentsafety`, verified live 2026-10-26 at [developer.android.com](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager)): a framework API — `requestContentClassification(ClassifiableContent, Executor, callback)` — that Google only began opening to third-party developers around Aug 2026. **Three things make it not the thing:** it returns a coarse **allowed/warning/blocked/unclassified** verdict, not per-category scores; that verdict is bound to **the user's device settings** (Sensitive Content Warnings), not the **developer's** policy, and returns `unclassified` when the user has it off; and it is **image-centric** ("works with images, does not check video"), still marked in-development (API level "10000"). It protects the *user*; a trust-and-safety team needs to enforce the *app's* policy.
- **Apple Sensitive Content Analysis:** the closest shipping first-class on-device UGC classifier — but iOS-only, image/video-only, **no text toxicity** ([docs](https://developer.apple.com/documentation/sensitivecontentanalysis)).

**The exact boundary:** no first-party, on-device, drop-in classifier returns the *developer's* per-category scores for user **text** (toxicity/harassment/self-harm) anywhere, and the **image** path exists only as a coarse, user-bound framework verdict (Android) or an iOS-only API. **The main competitor a developer uses today is a cloud API — Hive — not another on-device SDK.**

---

## Proposed surface

An ML Kit `ContentSafety` client, text-first, returning tunable per-category scores under the developer's own policy:

```kotlin
val safety = ContentSafety.getClient(
    ContentSafetyOptions.Builder()
        .setCategories(TOXICITY, HARASSMENT, SELF_HARM, SEXUAL, VIOLENCE, SPAM_SCAM)
        .build()
)
// Text (the differentiated core)
val result = safety.classifyText("...user message...").await()
result.score(TOXICITY)      // 0.0–1.0, developer thresholds it
result.isFlagged(SELF_HARM) // against a policy the developer set, not the user

// Image (a thin, honest wrapper over the framework path where present)
val img = safety.classifyImage(bitmap).await()
```

- **Inputs/outputs:** text or image in; a `ContentSafetyResult` of per-category float scores out, so the developer sets thresholds. Never a single verdict — the "one-size allowed/blocked" design is exactly why `ContentSafetyManager` doesn't serve this audience.
- **Model class behind it:** a small encoder / EmbeddingGemma-class backbone + per-category linear heads, system-delivered once and shared across apps (the privilege), **not** a generative guard LLM.
- **What it deliberately does NOT do:** no CSAM classifier (that is hash-matching territory — PhotoDNA/NCMEC — not a shipped model, and a legal red line); no identity/1:N face matching; no claim of human-parity in low-resource languages — it surfaces a confidence and a `language_supported` flag so developers gate borderline cases to review rather than trusting it blind.
- **Image path:** where Android's `ContentSafetyManager` is present and GA, wrap it (developer-policy scoring on top of the framework verdict); where it is not, fall back to a bundled NSFW/violence head. Be honest that the image half is a convenience layer, not the moat.
- **TTFHW target: 15 minutes.** One Gradle line, no API key, no new dangerous permission, no console project, works in the emulator, model streamed by Play on first use. This is achievable because it is a classifier, not a 200MB generative model — and if it can't hit 15 minutes, that is a finding about the design, not a footnote.

---

## Reach & sizing

*All AppBrain and apilevels figures are third-party estimates, not Google's; every multiplier below is my arithmetic.*

- **Serious-app denominator:** 277,471 apps with ≥50K installs ([AppBrain](https://www.appbrain.com/stats/libraries), third-party).
- **In-scope UGC categories** (Social, Communication, Entertainment, Games-with-chat, Dating, Video, Photo, Shopping, kids-Education): ~30–35% of serious apps → ~90,000, haircut by UGC prevalence ~45–55% → **SAM ≈ 35,000–55,000 apps (midpoint ~45,000)**.
- **Device reach:** a classifier not gated on Nano targets minSdk 24/26 → **~96% of active devices** ([apilevels](https://apilevels.com/), Apr 2026 Statcounter), versus ~3.7% for Gemini Nano — a ~26× reach advantage, and the single strongest line in the case.
- **3-year adopters:** SAM × ~20% ceiling (anchored between Firebase's saturated 73% and Crashlytics' ~6%) → **~7,000–11,000 apps**.
- **Install-weighted reach:** with a ~2× install-weighting multiplier (adopters skew to the biggest UGC apps), **~3–9% of the total Android install surface** over three years — and the distribution is head-heavy: Telegram (1B+), Roblox (500M+), Discord, Reddit, Tinder, Bumble (100M+ each) alone are ~2.5B installs in exactly these categories.
- **Engineering cost avoided:** at ~3–4 engineer-months DIY (train/quantize/multilingual-maintain, per Bumble and Samsung) minus ~1–2 weeks to integrate, across even 7,000 adopters, the numerator of the platform test clears 10× on conservative inputs.
- **Sensitivity:** halve both `p_job` and the adoption ceiling and install-weighted reach drops to ~1.5–2% — still meaningful because the head-heavy distribution means a dozen 100M+ wins carry the number regardless of the long tail. The verdict survives the haircut; what it depends on is not app-count but landing a few flagship UGC apps.

---

## Adoption path

1. **The hook:** the 15-minute win — drop one dependency, score a toxic string and an NSFW bitmap on a mid-tier emulator, no key, no cloud bill. The thing a skeptical IC tries before lunch.
2. **First real integration:** replace a Hive/Detoxify text path in a chat or comment flow, deleting a per-call cloud cost and a data-transfer their legal team flagged.
3. **The dependency:** once moderation runs on-device against the developer's own thresholds and their DPIA cites on-device data-minimisation, removing it means reopening both the cloud bill and the compliance posture — a lock-in they'd endorse, not resent.

**First adopter:** a mid-size UGC or dating app already paying for cloud moderation and already exposed under UK OSA / EU DSA — the population that open-sourced *Private Detector* in the first place. The second wave is unlocked by one visible reference integration (a Discord- or Bumble-class app saying "we moved moderation on-device with ML Kit"), which is how platform APIs actually spread.

---

## Execution plan

- **Developer preview (text-only):** ship the text classifier + per-category scores to 3–5 design partners from the paying-cloud-moderation cohort. Question it answers: *do developers trust on-device scores enough to delete a cloud path, and where is the multilingual embarrassment floor?* Collects the S1 evidence the score is thinnest on.
- **Alpha/Beta:** graduate when English + top-10-language quality clears partners' own precision/recall bars in production, and when the image path's relationship to `ContentSafetyManager` is settled (wrap vs. duplicate). Checkable condition, not "make progress."
- **GA:** commit a frozen category taxonomy and a score-stability contract versioned *independently of the model*, so a model refresh can't silently move a developer's threshold — the exact durability failure that kills safety APIs.

**Org dependencies, honestly:** this needs the AICore/Gemini-Nano team (model delivery for the shared classifier) and a hard conversation with the Android framework team that owns `ContentSafetyManager` — if both the framework and ML Kit ship content safety, the developer story fragments further, which is the ecosystem's single biggest internal risk. If that team is the right owner for a *unified* surface, say so now rather than after shipping a second one.

---

## The case against

The live failure mode from the rubric is **#2, the platform absorbs the problem underneath you** — and here it is happening in real time, from two directions. Below, Android's own `ContentSafetyManager` is already classifying images on-device; above, a general on-device model (Nano, Gemma 4) can moderate via a prompt on the devices that run it. The honest read: the **image** half of this idea has a substitute half-life under twelve months, because the framework is shipping it. If you pitch this as an image-moderation API, you are proposing to duplicate `android.app.contentsafety`, and you lose.

The idea survives *only* as the **text-first, developer-policy** classifier: text toxicity on-device is served by nobody first-party, Perspective is vacating the cloud incumbency, and the framework's user-bound allowed/blocked verdict structurally cannot serve a trust-and-safety team that must enforce *its own* policy. That is a real, durable distinction — user-protection and app-policy-enforcement are different products — but it is a narrower claim than "on-device moderation," and the report is only honest if it says so.

The second-strongest objection is **Durability (the gate at 3)**: Google sunsetting Perspective while I propose a five-year safety commitment is a fair thing for a skeptic to throw, and the mitigation is not rhetoric — it is the independently-versioned score contract and a charter tied to the Play policy that already mandates moderation, not to this year's OKR. The third is multilingual quality: Perspective over-moderates German ~4× vs English and scores Portuguese ~0.58; shipping that unflagged in user-facing UI is the embarrassment-threshold risk, mitigated only by surfacing `language_supported` and confidence honestly.

---

## Kill criteria

**The single observation that reverses this recommendation:** Android's `ContentSafetyManager` adds **text** classification *and* developer-supplied per-category thresholds before ML Kit ships — at that point the framework owns the whole surface and ML Kit should cede it. Checkable against the `android.app.contentsafety` reference and release notes each cycle; today it is image-only and user-bound, which is the entire opening.

**Load-bearing assumption:** that developer-policy enforcement (my thresholds, my categories, deterministic availability) is a genuinely different product from user-protection (the user's settings decide) — and that Google will let these be two surfaces rather than collapsing them into the framework's user-bound one.

**Re-check trigger if shelved:** Perspective's actual shutdown date landing, or a DMA-6(7) implementation detail (by 1 Aug 2027) that forces the on-device safety model open to third parties anyway — either would re-open the text gap decisively.

---

## Fit for this team

ML Kit, not MediaPipe or the framework, for three reasons: ML Kit is the sanctioned, task-shaped, 15-minute-hello-world front door the target developer already knows (MediaPipe's bring-your-own-model posture is the opposite of what a compliance-deadline IC wants); ML Kit already owns the "on-device task API" ergonomics and cross-surface reach; and the framework's `ContentSafetyManager` is deliberately a *user-protection* primitive, so a *developer-policy* classifier is a different contract that shouldn't live in `android.app`. The caveat is honest: if Google decides content safety must be one surface, the framework team may be the right owner and ML Kit should provide the developer-facing ergonomics on top rather than a parallel model — that coordination is the real work, and pretending it isn't is how Google ends up with two moderation APIs.

---

## Open questions

- **Is `ContentSafetyManager` ever going GA with text, and on what date?** It reads as in-development (API level "10000"); the roadmap is the whole kill criterion and I could not find a committed date. *Settled by: the Android framework team, or a release-notes entry.*
- **What is the real multilingual floor** of an EmbeddingGemma-head classifier on the languages these apps actually serve? *Settled by: the developer-preview partner data.*
- **Does DMA Art. 6(7)'s "on-device machine-learning models" explicitly include safety/classifier models?** The decision names the category broadly but doesn't enumerate; the annex would settle whether a third party could demand access regardless. *Settled by: the Commission decision annex.*
- **Will the AICore team deliver a shared classifier model** on the classic-ML-Kit reach footprint, or only on the Nano device list? The entire ~96% reach claim depends on the former. *Settled by: a delivery commitment.*

---

## Runners-up

- **On-device neural TTS developer API (Type A):** clean whitespace — Google ships nothing, Apple shipped speech generation, Picovoice sells Orca. Lost on a weaker regulatory why-now and a thinner platform-privilege argument (Kokoro/Piper ship as OSS Gradle deps); a strong standalone candidate for a future run.
- **On-device eval / quality-regression harness (Type D):** Apple shipped an Evaluations framework; ML Kit publishes prose guidance with zero tooling. Lost on Platform Privilege (gate ~3 — OSS can build an eval harness) and reach gated to the 3.7% GenAI base.
- **Reach tiering / graceful degradation for GenAI (Type F):** the real 26× availability gap — but partially pre-empted by Firebase AI Logic's `PREFER_ON_DEVICE`/`PREFER_CLOUD` hybrid orchestration, which already gives developers a fallback path.
- **GenAI output-stability contract across Nano refreshes (Type E):** maximal platform privilege and a genuine production pain (teams pin SDK versions), but invisible in a demo and with the thinnest external demand evidence — a strong idea that loses every internal prioritization fight, which is itself the argument for it another run.

*First run of this skill in this workspace — no prior idea ledger to dedupe against.*

---

*Sources:*
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Android `ContentSafetyManager` reference](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager)
- [cybernews — Android opens content-safety API to developers](https://cybernews.com/security/android-content-safety-manager-api-privacy-concerns/)
- [Apple Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis)
- [Perspective API FAQ (sunset after 2026)](https://developers.perspectiveapi.com/s/about-the-api-faqs)
- [AICore / Gemini Nano privacy & safety](https://android-developers.googleblog.com/2024/10/introduction-to-privacy-and-safety-gemini-nano.html)
- [MediaPipe Text Classifier](https://developers.google.com/mediapipe/solutions/text/text_classifier)
- [ShieldGemma 2B model card](https://huggingface.co/google/shieldgemma-2b)
- [EmbeddingGemma announcement](https://developers.googleblog.com/en/introducing-embeddinggemma/)
- [Llama Guard 3-1B-INT4 (arXiv 2411.17713)](https://arxiv.org/pdf/2411.17713)
- [Detoxify](https://github.com/unitaryai/detoxify) · [nsfwjs](https://github.com/infinitered/nsfwjs) · [open_nsfw_android](https://github.com/devzwy/open_nsfw_android) · [NudeNet](https://github.com/notAI-tech/NudeNet)
- [Bumble Private Detector blog](https://bumble.com/the-buzz/bumble-open-source-private-detector-ai-cyberflashing) · [repo](https://github.com/bumble-tech/private-detector)
- [Samsung on-device moderation (arXiv 2107.11845)](https://arxiv.org/abs/2107.11845)
- [Hive pricing](https://hivemoderation.com/pricing) · [Sightengine pricing](https://sightengine.com/pricing) · [OpenAI moderation (free)](https://help.openai.com/en/articles/4936833-is-the-moderation-endpoint-free-to-use)
- [UK OSA compliance dates (Ofcom)](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/important-dates-for-online-safety-compliance)
- [EU Digital Services Act](https://commission.europa.eu/strategy-and-policy/priorities-2024-2029/europe-fit-digital-age/digital-services-act_en)
- [Google Play AI-generated & UGC content policy](https://support.google.com/googleplay/android-developer/answer/14094294)
- [ePrivacy derogation & child-safety detection (Freshfields)](https://riskandcompliance.freshfields.com/post/102mopa/an-uncertain-path-forward-the-eprivacy-derogation-and-child-safety-detection)
- [DMA Art. 6(7) Alphabet interoperability decision](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [ICO — content moderation & data protection](https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/online-safety-and-data-protection/content-moderation-and-data-protection-0-0.pdf)
- [apilevels.com](https://apilevels.com/) · [AppBrain library stats](https://www.appbrain.com/stats/libraries)
