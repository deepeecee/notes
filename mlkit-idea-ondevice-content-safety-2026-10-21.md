# On-Device Content-Safety Classifier — the moderation primitive every UGC app rebuilds, that a sibling Google team is quietly shipping underneath ML Kit

**Type:** G (Trust, safety & compliance), with a C (developer-experience) wrapper · **Verdict:** Prototype · **Opportunity: 6/10 (Real but contested)**
*2026-10-21 · Prepared for Android ML Kit · Evidence current as of 2026-10-21*

> *Badges: Regulatory clock · Google is already building a weaker version · Not whitespace*

> A developer at a 200-person dating app ships a photo-chat feature on a Tuesday and is now legally on the hook for every nude a stranger sends a minor in Texas. Their options today: ship a 7-year-archived Yahoo Caffe model, hand-port `nsfwjs` to TFLite, or pipe every user image to Hive at $3 per 1,000 and hope legal signs off on user content leaving the device. There is no `ContentSafety.scan(image)` in ML Kit. Google's own ML Kit maintainer told a developer who asked for exactly this: "safe-search is not supported by the standalone kit" — use Cloud Vision. Meanwhile at least six vendors sell this as a cloud service, and one open-source NSFW model reports ~100M downloads a month.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Real but contested | composite 3.5 × 2 = 7.0, −1 because the Durability gate scores exactly 3 (ownership ambiguity + output-stability gap). Not inflated: the substrate is being built by another team |
| Platform privilege (gate) | 5/5 — pass | On-device classification tied to a system service across the trust boundary; `ContentSafetyManager` is gated behind the privileged `ROLE_CONTENT_SAFETY` role — only the platform offers a managed-model safety service ([developer.android.com](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager)) |
| Feasibility headroom (gate) | 5/5 — pass (4 for text) | Image: MobileNet/EfficientNet NSFW head ≈ 3–5 MB, single-digit ms, API 24+ — the classic ML Kit bundled-model story. Text: use a MobileBERT-class model (~25 MB) not full BERT/RoBERTa |
| Durability (gate) | 3/5 — pass, weakly | A committed owner clearly exists (SafetyCore team shipping `ContentSafetyManager`), but output stability across model refreshes is unaddressed, and *which* Google team owns it is the live question |
| Demand evidence (25%) | 4/5 | Six cloud vendors charging; `nsfwjs` 9.0k★ (active), `open_nsfw` 6.0k★ (archived), Detoxify active (push 2026-10-20), Falconsai NSFW ~100M downloads/mo [reported]; Bumble built and open-sourced its own; a developer explicitly asked ML Kit and was refused |
| Install-weighted reach (15%) | 4/5 | UGC categories (Social, Dating, Communication, Photography, Video, Entertainment); ~9× install-weighting multiplier for specialized on-device ML SDKs; API 24+ reaches 96.6% of the fleet |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The **borrow** path wins for basic image NSFW — a weekend with `nsfwjs`. Platform value is concentrated in text toxicity, fleet-wide managed delivery, and the trust boundary, not the image classifier itself |
| Integration cost / TTFHW (15%) | 4/5 | An ML Kit-style one-Gradle-line typed-result API hits a 15-min hello-world; contrast the framework's `ROLE_CONTENT_SAFETY` + `ContentSafetyAppService` machinery, which emphatically does not |
| Substitute half-life (15%) | 2/5 | **The substitute is Google's own roadmap.** `ContentSafetyManager`/SafetyCore ships the managed classifier underneath; a general on-device model answers "is this toxic?" as a prompt |
| Strategic complement (10%) | 4/5 | Free, easy moderation drives Play-policy compliance, keeps UGC apps off cloud round-trips, and counters "Android is unsafe for UGC" |
| **Composite** | **3.5** | Prototype band (3.0–3.9): developer-preview explicitly to collect the S1/S3 evidence the verdict turns on |

*Least trustworthy row: install-weighted reach. The per-category AppBrain app counts did not render this session (WebFetch DNS failed fleet-wide), so the sizing rests on a comparable-SDK multiplier and bounded estimates, not direct category counts.*

---

## The problem

The job: a developer at a 100M-install consumer app has to stop their own users from making the app a vector for illegal or brand-destroying content — unsolicited nudes in chat, CSAM, toxic harassment, scam links, violent media — and must do it on content their users generate, in the client, without shipping that content to a server. This is not a "delight" feature; it is a compliance obligation with a deadline, and the competing solution is almost always the developer's own code or a cloud bill.

This problem is *structurally* produced, not an accident of tooling. Four of the large-app constraints converge on it. The brand cannot host an embarrassing — here, *illegal* — output. Regulatory exposure is simultaneous across jurisdictions and, since January 2026, lands in the client: age-assurance and minor-protection law now obliges the app, not just the platform. Per-inference cloud cost scales linearly with DAU, and moderation runs on *every* post, so the cloud path is the worst-case cost shape — a tax on engagement itself. And privacy promises foreclose the cloud path on exactly the highest-value content: an app that end-to-end encrypts messages cannot send them to Hive. The workaround an app runs today — a bundled OSS model, a per-image cloud call, or nothing — is precisely what a platform API is priced against.

The apps with this job are nameable: dating (Bumble, Tinder — 100M+ each), messaging (WhatsApp, Telegram, Discord 500M+), social and short-video (Instagram, TikTok, Snapchat — 1B+), plus the long tail of live-stream, kids-adjacent, and photo-sharing apps. The install-weighted surface is enormous because UGC skews to giant apps.

Crucially, this is a *platform* problem, not an app problem, by the skill's own test: every app solves it identically and badly (bundle a stale NSFW model or buy a cloud API), rather than solving it differently as differentiation. Nobody competes on *how* they detect a nude; they compete on everything downstream of the verdict.

---

## Proof & signals

- **Someone charging money for it (the strongest signal).** All cloud, all metered — the exact cost/privacy envelope on-device removes:
  - Hive Moderation: image $3.00 / 1,000, text $0.50 / 1,000, audio $0.03/min ([pricing](https://thehive.ai/pricing), via snippet — vendor-published).
  - Google Cloud Vision **SafeSearch**: $1.50 / 1,000 units ([pricing](https://cloud.google.com/vision/pricing)). *Google already monetizes this as a cloud service and ships no on-device equivalent.*
  - Sightengine ($29–$399/mo, 100+ classes), Amazon Rekognition ($0.001/image), Azure AI Content Safety, OpenAI Moderation (free but cloud), Checkstep ($75k/yr enterprise). Six+ vendors is proven willingness to pay for a capability the platform vacated.
- **Developers doing it by hand.** `infinitered/nsfwjs` 9.0k★ (active, Oct 2026); `yahoo/open_nsfw` 6.0k★ but **archived since 2018** and still depended on; `GantMan/nsfw_model` 2.1k★; `Falconsai/nsfw_image_detection` reports **~100M downloads in a trailing 30-day window** [third-party/promotional, not platform-verified]; `unitaryai/detoxify` 1.3k★, pushed 2026-10-20. On mobile specifically there is a cluster of hand-rolled wrappers — `nipunru/nsfw-detector-android` (Firebase ML + TFLite, on-device), `flutter_nsfw_detector` (CoreML/LiteRT). The proliferation of hand-ports *is* the demand signal that no first-party primitive exists.
- **Apps that shipped it themselves.** Bumble built **"Private Detector"** (2019, nude-image blur, claimed 98%) and **open-sourced it Apache-2.0 in Oct 2022** (EfficientNet) explicitly so others could reuse it ([Bumble](https://bumble.com/the-buzz/bumble-open-source-private-detector-ai-cyberflashing-dick-pics), [TechCrunch](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)). A company open-sourcing its classifier so competitors can use it is a flare that no platform primitive existed.
- **Community voice, verbatim.** ML Kit plugin issue #111 (2021-08-08): a developer — *"I want to do this on the device not on the cloud"* — asked whether he needed *"a seperate model for the inappropriate filtering?"* The maintainer replied *"safe-search is not supported by the standalone kit,"* pointed him to **Google Cloud Vision**, and closed it ([GitHub](https://github.com/bharat-biradar/Google-Ml-Kit-plugin/issues/111)). That is the whole thesis in one thread: developer wants on-device moderation, Google's own kit has no answer, developer is pushed to the paid cloud API.
- **The absence signal.** No Snap/Meta engineering blog on *on-device* content classification surfaced — those orgs do it at server scale. The on-device gap bites hardest for the small and mid-tier Android teams who can't staff a server-side trust-and-safety ML group, which is exactly the population a platform primitive serves.

*Evidence caveat applied throughout: WebFetch DNS failed fleet-wide this session, so several primary-doc facts are sourced from WebSearch snippets of those same primary pages rather than a direct fetch. Flagged inline.*

---

## Why now

1. **Capability shift.** Small safety classifiers now fit the whole fleet. A quantized MobileNet NSFW head is ~3–5 MB at single-digit ms (TF Lite's own `Mobilenet_V1_quant` ≈ 4.3 MB, ~6 ms NNAPI on a 2018 Pixel 3); a MobileBERT-class toxicity model is ~25 MB at tens of ms ([MobileBERT paper](https://arxiv.org/pdf/2004.02984); [TF Lite NLP](https://blog.tensorflow.org/2020/09/whats-new-in-tensorflow-lite-for-nlp.html)). This is categorically unlike Gemini Nano — a short flagship list, text-only — which reaches ~3.7% of the fleet (my arithmetic: Google's 140M+ Nano devices, Apr 2026, ÷ ~3.8B third-party Android actives; neither a Google-published coverage %).
2. **Regulatory/competitive shift, with dates.** **Texas SB 2420 (App Store Accountability Act) is live now** — enjoined Dec 2025, the injunction stayed by the Fifth Circuit, SCOTUS declined to vacate 2026-07-06 — so developers are statutorily obliged to act on age/content signals today, no grace period ([MoFo summary](https://www.mofo.com)). California (Jan 1 2027), Alabama (Jan 1 2027), Utah (~May 2027), Louisiana (Jul 1 2027) form a 2027 wall. The **EU DMA Alphabet decision** (adopted 2026-07-16) forces Google to expose system-level on-device AI models to third parties in Android 18 by **2027-08-01** ([EU portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). And Google Play's standing policy already tells developers to **"adopt… filters and classifiers to block harmful inputs and outputs"** ([Play policy](https://support.google.com/googleplay/android-developer/answer/16353813)) — guidance, with no provided control.
3. **Demand shift.** The most-downloaded NSFW model doubled from 50M (Feb 2025) to a reported ~100M downloads/mo, and Apple shipped `SensitiveContentAnalysis` in iOS 17 — so "scan your users' media on-device" is now a baseline expectation developers carry cross-platform.

Three dated forces that all point the same way is a strong why-now — unusually strong for this space.

---

## The capability gap

Be exact about the boundary, because this is where the report would get embarrassed if it claimed pure whitespace — and it is not whitespace.

- **ML Kit: nothing.** No moderation/toxicity/NSFW API across Vision, NL, or GenAI ([guides](https://developers.google.com/ml-kit/guides), [search-sourced]). Confirmed by the maintainer in issue #111.
- **MediaPipe Text Classifier: bring-your-own-model.** Categories are "defined during training"; the bundled default is movie-review *sentiment*, not safety ([docs](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier), [search-sourced]).
- **AICore / Gemini Nano: gates its own output only.** Safety filters wrap Nano's generations; docs state "developers are solely responsible for the safety of their API client" ([developer.android.com](https://developer.android.com/ai/gemini-nano)). Not callable on arbitrary user content.
- **Perspective API: cloud REST.** Text toxicity, but requests go to Google servers ([docs](https://developers.perspectiveapi.com)).
- **The decisive finding — `android.app.contentsafety.ContentSafetyManager`.** A real, documented **Android framework** API (verified on developer.android.com) that lets a granted app call on-device SafetyCore classification: `requestContentClassification(ClassifiableContent, Executor, callback)` returning `ContentClassificationResult` with `TYPE_UNCLASSIFIED(0) / TYPE_ALLOWED(1) / TYPE_WARNING(2) / TYPE_BLOCKED(3)`, gated behind `RoleManager.ROLE_CONTENT_SAFETY` with a server-side `ContentSafetyAppService` the role-holder implements. It is backed by the `com.google.android.safetycore` system service that already powers Sensitive Content Warnings in Google Messages. **It is pre-release** — some constants carry Google's "Added in API level 10000" placeholder — and Cybernews reports Google is "opening access to other developers" ([ContentSafetyManager](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager); [SafetyCore](https://support.google.com/product-documentation/answer/16001929); [Cybernews](https://cybernews.com/security/android-content-safety-manager-api-privacy-concerns/)).
- **Apple `SensitiveContentAnalysis` (iOS 17+): shipping but narrow.** On-device, images + video + live streams, **nudity only**, binary is-sensitive (no probability list, no tunable thresholds), entitlement-gated ([Apple docs](https://developer.apple.com/documentation/sensitivecontentanalysis)).
- **Qualcomm / Samsung / MediaTek:** no first-party 3P moderation classifier found [absence of evidence].

**The main competitor a developer uses today** is therefore one of two things: a bundled OSS NSFW model (image, free, a weekend) or a cloud moderation API (text+image, metered, privacy-exposing). The platform's *own* `ContentSafetyManager` is the third, arriving shortly — and that changes the question from "build it?" to "who owns the developer-facing surface, and is it ergonomic enough to adopt?"

---

## Proposed surface

Not a parallel classifier — ML Kit as the **developer-first front door to SafetyCore**, the way ML Kit's GenAI APIs are the sanctioned front door to AICore. The framework's `ContentSafetyManager` is privileged-role, image/nudity-centric, and returns a user-setting-driven allowed/warning/blocked verdict. The ML Kit wedge is the three things it is *not*: multi-category tunable scores, text toxicity, and a 15-minute Gradle integration with no role, no service subclass, no entitlement.

```kotlin
// One Gradle line, no ROLE_CONTENT_SAFETY, no ContentSafetyAppService.
val safety = ContentSafety.getClient(
    ContentSafetyOptions.Builder()
        .setCategories(NUDITY, VIOLENCE, TOXICITY, SCAM)   // opt in per category
        .setThreshold(NUDITY, 0.8f)                        // developer-tunable
        .build()
)

// Image — reuses the ML Kit InputImage the app already has
val result: SafetyResult = safety.classify(inputImage).await()
if (result.score(NUDITY) > 0.8f) blur()

// Text — the differentiated leg; SafetyCore/Apple don't offer tunable text
val textResult = safety.classify("is this message abusive?").await()
textResult.scores()  // Map<Category, Float>, not a single verdict
```

- **Inputs/outputs:** `InputImage` or `String` in; a typed `Map<Category, Float>` out (not a user-setting verdict). Categories the developer opts into; thresholds the developer sets. Where SafetyCore is present and the user setting applies, the API routes to it; where it is not, a bundled ~3–5 MB image head and ~25 MB MobileBERT text model provide the fleet-wide fallback.
- **Model class:** MobileNet/EfficientNet (image), MobileBERT (text) — *not* ViT or full BERT; that architecture discipline is the feasibility caveat, not a footnote.
- **Device requirements:** API 24+ for the bundled path (96.6% of the fleet); SafetyCore path where the module is present.
- **What it deliberately does NOT do:** no CSAM hash-matching (that stays first-party/NCMEC, a deliberate abstention like face identity); no "is this illegal" legal judgment — it returns scores, the developer owns the action and the liability framing; no generation, no redaction.
- **TTFHW target: 15 minutes.** Achievable *only* because it avoids the role/service machinery — which is the entire argument for ML Kit owning the surface rather than leaving developers on the framework API. First-use model download needs network (the standard ML Kit caveat).

---

## Reach & sizing

Showing the arithmetic; inputs flagged by provenance.

- **A_cat** (UGC apps ≥50K installs across Social, Dating, Communication, Photography, Video, Entertainment): **~20,000–40,000** [my estimate; bounded above by the one confirmable AppBrain figure — Tools, the largest category, has 25,149 apps ≥50K installs ([AppBrain](https://www.appbrain.com/stats/android-market-app-categories)); per-category rows did not render this session].
- **p_job** (fraction plausibly needing moderation): ~0.5 — most apps in these categories carry UGC.
- **SAM** = 10,000–20,000 apps. **r_reach** ≈ 1.0 (API 24+ = 96.6%, [apilevels.com](https://apilevels.com/), StatCounter-sourced). **Eligible SAM** ≈ SAM.
- **c_ceiling:** comparable specialized on-device ML SDK = TensorFlow Lite at **1.17% of apps / 10.50% of installs**, ~11% of *top* apps ([AppBrain TFLite](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite), third-party). Applied to top-skewed UGC apps: ~10% three-year adoption.
- **SOM (year 3):** ~**1,000–2,000 apps.**
- **Install-weighted reach:** the ~**9× multiplier** (TFLite's 10.50% installs ÷ 1.17% apps) plus the fact that the UGC giants (WhatsApp/Instagram/TikTok 1B+, Discord 500M+, Tinder/Bumble 100M+) dominate the category → if the giants adopt, **~10–15% of install-weighted Android surface**; if only mid-tier adopts, low single digits.
- **Engineering cost avoided:** image NSFW is a ~1–2 week borrow; the real saving is text + fleet delivery + maintenance, ~7–11 engineer-weeks saved per adopter. Across ~1,500 adopters ≈ **$60–90M** avoided [my rough arithmetic, ~$6k/loaded eng-week].
- **Platform test:** ~$60–90M ÷ (build + 5-yr maintenance, ~$15–25M) ≈ **3–5×** — *below* the ~10× bar on conservative inputs. An honest drag, and a direct input to the verdict.

**Sensitivity.** Halve `p_job` (0.25) and `c_ceiling` (~5%): SOM falls to ~250–500 apps and the platform test drops below 2× — the verdict **flips to Shelve**. So the decision is genuinely sensitive to whether developers want a *tunable multi-category text+image* primitive badly enough to adopt over the free image borrow and the arriving framework API. That is precisely a question a developer-preview answers and desk research cannot — which is why the verdict is Prototype, not Build.

---

## Adoption path

1. **The hook:** a dating or messaging app blurs unsolicited nudes in chat with four lines and no server — the Bumble Private Detector capability, as a Gradle dependency, in an afternoon.
2. **First real integration:** text toxicity scoring on comments/DMs, replacing either a cloud moderation bill or a brittle keyword list (the proandroiddev tutorial's own complaint: keyword matching "cannot detect euphemisms or newly emerging slang").
3. **The dependency:** once the app's trust-and-safety logic branches on `SafetyResult` categories and thresholds, and its compliance posture cites the on-device classifier, removing it means re-architecting moderation and re-opening the legal question. Endorsed stickiness, not resented lock-in.

**First adopter:** a mid-tier dating or community app under live US state-law exposure, with UGC and no server-side T&S ML team — the population that can't build this and can't afford Hive at scale. **Second wave:** the giants, *if* on-device deflects enough cloud moderation cost and satisfies the privacy/E2EE constraint. Reference implementation is the seed — a visible dating app doing nude-blur on-device is the demo every competitor then wants.

---

## Execution plan

- **Developer preview:** ship the ergonomic wrapper over SafetyCore's `ContentSafetyManager` *plus* a bundled fallback, to 3–5 design partners (one dating, one messaging, one kids-adjacent). Question it answers: do developers want tunable per-category scores and text, or is the framework's allowed/warning/blocked verdict enough? This is the S1/S3 evidence the sizing is sensitive to.
- **Alpha/Beta:** graduate when a partner ships to production and the text model clears the embarrassment threshold on a real abuse corpus (not a benchmark). Checkable condition: false-negative rate on held-out unsolicited-nude and toxicity sets below the partner's refusal bar.
- **GA:** commit a category taxonomy and a **versioned output contract** so a model refresh can't silently move an app's verdicts — the Durability gap that otherwise kills this.

**Org dependency, named honestly:** the Android framework / SafetyCore team owns `ContentSafetyManager` and the model behind it. This cannot ship as an ML Kit API without their yes, because ML Kit would be the front door to *their* service. If they decline — or decide the framework API is the only developer surface — ML Kit's move is dead and the right answer is to influence `ContentSafetyManager`'s ergonomics instead. That dependency is the single biggest execution risk and is outside ML Kit's control.

---

## The case against

The strongest case against, argued at full strength: **the platform is absorbing this problem underneath you, and it's your own house doing it.** `ContentSafetyManager` + SafetyCore is a committed, shipping (pre-release) Google surface for on-device content classification. The rubric's failure mode #2 — "the platform absorbed the problem underneath you" — is not hypothetical here; it is in the SDK reference. Combined with the free image-NSFW borrow path (failure mode #7, undifferentiated against a free substitute), the substitute half-life is short: this is why S5 is a 2 and the composite sits at 3.5, not higher.

The honest rebuttal — the reason the verdict is Prototype and not Shelve — is that the framework API as documented is a *different, weaker product*: nudity/image-centric, privileged-role, user-setting-driven verdict, no tunable text toxicity, no 15-minute integration. ML Kit's history is exactly this move: it is the ergonomic front door to AICore. There is a real, defensible wedge in being the developer-first, tunable, text-and-image, one-Gradle-line surface over the same substrate. But "real wedge" is a hypothesis about developer preference, and the sizing flips to Shelve if that preference is weak — so it must be *tested* in preview, not asserted. The mitigation is not a feature; it is the preview itself.

Secondary risk: safety is each company's proprietary policy surface (the Type-G trap). A one-size classifier is unusable to a real T&S team unless thresholds and categories are tunable — which is why tunability is in the surface, not bolted on.

---

## Kill criteria

**The single observation that would reverse this recommendation:** `ContentSafetyManager` graduates from pre-release to a shipped public API *with developer-tunable multi-category scores and text support* before the ML Kit preview reaches partners. If the framework API ships the differentiated product itself, the ML Kit wedge is gone and the right move is to contribute to that API, not wrap it. Checkable: watch the `android.app.contentsafety` reference for the "API level 10000" placeholder resolving to a real API level, and inspect whether the result type changes from a verdict enum to per-category scores.

**Load-bearing assumption:** developers of UGC apps want tunable multi-category *text+image* scoring enough to adopt an ML Kit API over (a) the free image-only OSS borrow and (b) the framework's verdict-only API. Everything else survives if this holds and collapses if it doesn't.

**Re-check trigger if shelved:** a US state age-assurance law surviving final appeal with a hard filtering mandate (not just age signals), which would convert "nice to have" into "ship by date X" and lift demand past the borrow path.

---

## Fit for this team

This is the crux, and it cuts against a confident land-grab. On-device content classification is **already being built in the Android framework** (`ContentSafetyManager`/SafetyCore), not in ML Kit. The ecosystem's biggest internal risk — a capability fragmenting across Google's stack — is live here: there would now be a framework API *and* an ML Kit API over the same service. The only coherent story is the one ML Kit already tells for AICore: ML Kit is the ergonomic, developer-first SDK front door, and SafetyCore is the privileged system substrate. If the framework team intends `ContentSafetyManager` to be the sole developer surface, ML Kit should not build a competing one — it should make that API not require a `ROLE_CONTENT_SAFETY` grant and a service subclass to call. Either way, the valuable conclusion for this team is: **go talk to the SafetyCore owners before writing a line of API** — the ownership question decides everything downstream, and it is answerable with an internal conversation, not more research.

---

## Open questions

- **Per-category breadth of `ContentSafetyManager`.** Does it classify beyond nudity (toxicity/violence/scam), or is it nudity-centric like the Messages feature it powers? [unverified against primary docs — WebFetch DNS failed; secondary coverage suggests image/nudity-centric.] This determines how much differentiation the ML Kit wedge actually has.
- **Does it return scores or only a verdict?** The documented result is a four-value enum; whether a scored variant exists is unconfirmed. If scores exist, the wedge shrinks.
- **Per-category AppBrain app counts** for the six UGC categories — did not render this session; needed to replace the `A_cat` estimate with a measured number.
- **Where does Bumble's Private Detector actually run** — on-device or server? The open-sourced artifact *could* run on-device but no source confirms it does.
- **Nano fleet %.** The ~3.7% figure is my arithmetic on Google's 140M (Apr 2026) and a third-party denominator; no Google-published coverage percentage exists.

---

## Runners-up

- **Model-delivery state machine (Type E)** — the clearest developer-voiced pain in the ML Kit tracker (silent download failures) and maximal platform privilege, but invisible in a demo and lower-urgency than a regulatory clock; lost on why-now strength.
- **On-device neural TTS (Type A)** — cleanest technical whitespace (Google has no answer; Apple and Picovoice do), but no dated forcing function and a larger model; lost on why-now.
- **On-device eval/quality harness (Type D)** — Apple shipped one and ML Kit prescribes a workflow it ships no tooling for, but reach is gated to the few apps already shipping GenAI (~3.7% fleet); lost on install-weighted reach (S2).
- **Constrained-decoding primitive (Type B/C)** — real pain (30–50% constraint violations in shipped apps), but narrower audience and Nano-gated; lost on reach.

---

*Sources:*
- [ML Kit guides](https://developers.google.com/ml-kit/guides) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [android.app.contentsafety.ContentSafetyManager](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) · [ContentClassificationResult](https://developer.android.com/reference/android/app/contentsafety/ContentClassificationResult) · [Understanding Android System SafetyCore](https://support.google.com/product-documentation/answer/16001929) · [Cybernews coverage](https://cybernews.com/security/android-content-safety-manager-api-privacy-concerns/)
- [MediaPipe Text Classifier](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier) · [Gemini Nano / AICore](https://developer.android.com/ai/gemini-nano) · [Perspective API](https://developers.perspectiveapi.com)
- [Apple SensitiveContentAnalysis](https://developer.apple.com/documentation/sensitivecontentanalysis) · [Apple Foundation Models safety](https://developer.apple.com/documentation/foundationmodels/improving-the-safety-of-generative-model-output)
- [Hive pricing](https://thehive.ai/pricing) · [Google Cloud Vision pricing](https://cloud.google.com/vision/pricing) · [Cloud Vision SafeSearch docs](https://cloud.google.com/vision/docs/detecting-safe-search) · [AWS Rekognition moderation](https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html)
- [nsfwjs](https://github.com/infinitered/nsfwjs) · [yahoo/open_nsfw](https://github.com/yahoo/open_nsfw) · [GantMan/nsfw_model](https://github.com/GantMan/nsfw_model) · [Falconsai/nsfw_image_detection](https://huggingface.co/Falconsai/nsfw_image_detection) · [unitaryai/detoxify](https://github.com/unitaryai/detoxify) · [nipunru/nsfw-detector-android](https://github.com/nipunru/nsfw-detector-android)
- [Bumble Private Detector (buzz)](https://bumble.com/the-buzz/bumble-open-source-private-detector-ai-cyberflashing-dick-pics) · [bumble-tech/private-detector](https://github.com/bumble-tech/private-detector) · [TechCrunch](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)
- [ML Kit plugin issue #111](https://github.com/bharat-biradar/Google-Ml-Kit-plugin/issues/111) · [Immich NSFW discussion #3833](https://github.com/immich-app/immich/discussions/3833) · [proandroiddev NSFW text](https://proandroiddev.com/how-to-detect-nsfw-text-content-in-android-effective-filtering-methods-ai-solutions-df3fbddf0fa5)
- [Play GenAI content policy](https://support.google.com/googleplay/android-developer/answer/14094294) · [Play GenAI safeguards](https://support.google.com/googleplay/android-developer/answer/16353813)
- [EU DMA Alphabet interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [Texas SB 2420 summary (MoFo)](https://www.mofo.com)
- [MobileBERT paper](https://arxiv.org/pdf/2004.02984) · [TF Lite for NLP](https://blog.tensorflow.org/2020/09/whats-new-in-tensorflow-lite-for-nlp.html) · [TF Lite image classification](https://www.tensorflow.org/lite/examples/image_classification/overview)
- [AppBrain categories](https://www.appbrain.com/stats/android-market-app-categories) · [AppBrain TensorFlow Lite](https://www.appbrain.com/stats/libraries/details/tensorflow/tensorflow-lite) · [apilevels.com](https://apilevels.com/)
