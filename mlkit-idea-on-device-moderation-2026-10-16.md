# On-device content moderation — the one ML Kit shouldn't build, because the Android framework already is

**Type:** G (Trust, safety & compliance) · **Verdict:** Shelve for ML Kit / Reframe · **Opportunity: 4/10 (Already being built — wrong door)**
*2026-10-16 · Prepared for Android ML Kit · Evidence current as of 2026-10-16*

> A trust-and-safety engineer at a dating app spends this Tuesday hand-porting Yahoo's decade-old `open_nsfw` weights into a TFLite asset, because there is still no Google on-device API that will tell her whether the photo a user just attached is explicit. She ships it, adds ~17 MB to the APK, and now owns retraining it forever. The capability she wants is real, the demand is proven, and it runs fine on a mid-tier CPU. The catch this report exists to deliver: Google is already shipping exactly this — as `ContentSafetyManager` in the Android *framework*, not ML Kit — and an ML Kit copy would be a lower-privilege duplicate of its own platform's system service.

**Badges:** *Nobody in ML Kit has it* · *But the platform absorbed it underneath you* · *Apple already shipped the image half* · *Regulatory tailwind, no single clean deadline*

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 4/10 — "wrong door" | Composite 3.3 → ~6 by the mapping, adjusted **down** because the decisive strategic fact (ContentSafetyManager/SafetyCore is staged in the framework at API level 10000) means the marginal value of an *ML Kit* version is low. Adjusting down is the conservative direction and is explained in "The case against." |
| Platform privilege (gate) | 3/5 — pass (borderline) | Genuine on-device/system privilege exists — but it lives in [SafetyCore](https://thehackernews.com/2025/02/google-confirms-android-safetycore.html), the Android framework, not ML Kit; and for the image case a good OSS path ([nsfwjs](https://github.com/infinitered/nsfwjs), open_nsfw ports) iterates fast. |
| Feasibility headroom (gate) | 4/5 — pass | MobileNet NSFW ~3–6 MB at low-ms on CPU; MediaPipe MobileBERT toxicity ~28 MB quantized, ~57 ms Pixel-6 CPU ([MediaPipe docs](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)). Quality ceiling, not device budget, is the limit. |
| Durability (gate) | 3/5 — pass | Google can commit, but moderation-verdict stability across model refreshes is unaddressed, and verdict drift is a live T&S problem. Google's API-mortality base rate is a real adoption tax ([killedbygoogle](https://killedbygoogle.com/)). |
| Demand evidence (25%) | 4/5 | Multiple OSS re-implementations with current traction (nsfwjs 9,007★, pushed 2026-08-04; [Lovoo CoreML](https://github.com/lovoo/NSFWDetector) 1,680★; [Bumble](https://github.com/bumble-tech/private-detector) 1,360★); commercial WTP ([Hive](https://thehive.ai/pricing) $3/1k images). Text toxicity on-device is thin. |
| Install-weighted reach (15%) | 4/5 | Device class (CPU, API 26+) covers ~96–97% of the fleet ([Capgo, Nov 2025](https://capgo.app/plugins/android-distribution-chart/)); install-weighted reach ~5–12% of total Android, dominated by whether the top ~30 UGC apps adopt — my arithmetic. |
| Build-vs-buy-vs-borrow (20%) | 2/5 | The **borrow** path already wins for the highest-demand case: copy an `open_nsfw`/nsfwjs TFLite model, ship in a weekend. Only text + multilingual + calibration is worth more than a few weeks. This is the dimension that sinks the composite. |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, CPU, no key, API 26+ — ML Kit's own ergonomic ceiling. First-use model download is the one friction point. |
| Substitute half-life (15%) | 2/5 | **The problem.** Google's own roadmap (ContentSafetyManager/SafetyCore) makes an ML Kit version redundant in <12 months, and OSS is at image parity shipping monthly. The dominant failure mode in the rubric. |
| Strategic complement (10%) | 4/5 | Free, easy moderation raises Android engagement, serves Play-policy compliance, creates switching cost — but the complement accrues whether it ships in ML Kit or the framework. |
| **Composite** | **3.3** | Weighted mean of S1–S6. Maps to "Prototype," overridden down to Shelve-for-ML-Kit by the Fit-for-team finding. |

*Least trustworthy row: install-weighted reach. The AppBrain category table and apilevels.com would not fetch this session, so the app-count inputs are my estimates, not pulled figures; the device-coverage share is Google data relayed third-party.*

---

## The problem

The job, stated as an engineer's job under a deadline: *"A user just posted an image or a message inside my app. Before I show it to anyone else, tell me — on the device, for free, in milliseconds — whether it's explicit, violent, or abusive, so I don't ship it to 100M people or into a regulator's complaint."* The customer is a trust-and-safety or Android engineer at a UGC app; the competing solution is their own code or a per-call cloud bill.

This problem is structurally produced, not incidental. A 100M+ install consumer app operates under constraints that make cloud moderation expensive and on-device moderation hard to build alone: cost scales linearly with DAU (Duolingo filed ~400 bps of gross-margin compression as it widened AI access — the only hard public number tying AI feature expansion to unit economics), privacy promises foreclose sending the highest-value content to a server (Meta's stated rationale for confidential compute), and the ML org is server-side, so putting a classifier on-device needs a person fluent in both modeling and Android runtime behavior — a rare and expensive hire. The result is that apps either pay a cloud moderation vendor forever or hand-roll a TFLite port and own it forever.

What they do *instead* today is the thing to price against. Three workarounds dominate: (1) a cloud moderation API — [Hive](https://thehive.ai/pricing) at $3.00/1,000 images and $0.50/1,000 text calls, [AWS Rekognition](https://aws.amazon.com/rekognition/) at ~$0.001/image, or Google's own cloud [Perspective API](https://developers.perspectiveapi.com/) for toxicity; (2) a hand-ported on-device model — Yahoo's `open_nsfw` lineage, [nsfwjs](https://github.com/infinitered/nsfwjs), or Bumble's open-sourced classifier; or (3) nothing, and a reactive report-and-takedown queue. Named apps that chose to build it themselves rather than wait for a platform: Bumble (Private Detector), Lovoo (NSFWDetector, CoreML), and Yahoo (the `open_nsfw` base half the ecosystem forks).

---

## Proof & signals

- **Developers doing it by hand (on-device):** [`infinitered/nsfwjs`](https://github.com/infinitered/nsfwjs) — 9,007★, pushed 2026-08-04, client-side NSFW in TensorFlow.js, the flagship DIY tool. [`alganzory/HaramBlur`](https://github.com/alganzory/HaramBlur) 2,094★ (real-time on-device blur). [`devzwy/open_nsfw_android`](https://github.com/devzwy/open_nsfw_android) 1,958★ (offline Android classifier ported from Yahoo's model; now archived). Fresh 2026 mobile wrappers keep appearing — `watadarkstar/react-native-nsfw-detector` (CoreML, pushed 2026-07-19), `nexas105/flutter_nsfw_scaner` (CoreML+TFLite, 2026-08-18), and pub.dev Flutter packages that advertise fully-offline inference and note "~17 MB to your APK." Each is a team re-solving the same problem from scratch.
- **Someone charging money for it:** [Hive](https://thehive.ai/pricing) — a multi-billion-valuation business built on this job, ~$3/1k images; [Sightengine](https://sightengine.com/); [AWS Rekognition](https://aws.amazon.com/rekognition/) moderation; [Azure AI Content Safety](https://learn.microsoft.com/azure/ai-services/content-safety/). All cloud. Willingness to pay for a capability the platform vacated is the strongest single demand signal, and it's unambiguous here.
- **Apps that shipped it themselves:** Bumble's [Private Detector](https://github.com/bumble-tech/private-detector) (1,360★) — EfficientNet-v2 trained on an internal lewd-image set, open-sourced in Oct 2022 explicitly because, in Bumble's framing, *"there's a need to address this issue beyond Bumble's product ecosystem"* ([TechCrunch, 2022-10-24](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)). Lovoo, another dating app, open-sourced an on-device CoreML detector.
- **Community voice:** recurring HN threads across years — ["Ask HN: What do you use for content moderation of UGC?"](https://news.ycombinator.com/item?id=42830018) (~Jan 2025) and the self-documenting ["Show HN: Built a free moderation API after failing to find one"](https://news.ycombinator.com/item?id=46914190) (~2026).
- **The absence signal — and the twist:** the native-Android *on-device* image slot is served mainly by small/stale repos (the healthy projects are browser or iOS), while on-device *text* toxicity is genuinely thin — most options are cloud or server. Quiet native-Android on-device signal usually means "nobody made it accessible." Here it means something sharper: **Google is about to fill it from the framework, not from an SDK** (see "The capability gap").

---

## Why now

Three dated shifts — honest about their strength:

1. **Capability shift:** small on-device moderation models crossed the device budget. ML Kit's own image labeler adds ~3.8 MB bundled; MediaPipe already ships an on-device MobileBERT text-classification task at ~28 MB quantized / ~57 ms on a Pixel-6 CPU ([MediaPipe docs](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)); Google released [ShieldGemma 2](https://ai.google.dev/gemma/docs/shieldgemma), a ready-made safety classifier (image 4B / text 2B+), in 2025. The pieces exist.
2. **Competitive/regulatory shift:** Apple shipped the on-device image half in 2023 — the [Sensitive Content Analysis framework](https://developer.apple.com/documentation/sensitivecontentanalysis) (`SCSensitivityAnalyzer`, on-device, user-content nudity), expanded at WWDC 2026 to video streams. On the regulatory side the clock is *already running* rather than looming: EU DSA notice-and-action on all UGC apps (in force 2024-02-17), the US TAKE IT DOWN Act's 48-hour NCII/deepfake removal (FTC enforcing since 2026-05-19), UK Online Safety Act children's-safety duties (in force ~2025-07-25), EU AI Act Article 50 AI-content transparency (from 2026-08-02), and Google Play's own gen-AI policy that already makes the developer accountable for user/AI content ([Play policy](https://support.google.com/googleplay/android-developer/answer/14094294)).
3. **Demand shift:** the one firm *forward* date is 2027-08-01 — the EU DMA Article 6(7) decision against Alphabet (adopted 2026-07-16) requires Android to expose system-level on-device AI models (Gemini Nano and third-party models) to third parties in Android 18, free and at equivalent performance.

The honest read: the why-now is **real but diffuse**. No single clean deadline forces *this* API; the US state age-assurance wave that looked like a clock (Texas SB 2420) is enjoined (preliminary injunction 2025-12-23), and Utah/Louisiana slipped to 2027. Urgency comes from the stack of already-in-force content-safety obligations, not from one statute.

---

## The capability gap

Be exact about the boundary, each negative tied to the page checked:

- **Google ML Kit:** no moderation classifier. Vision ([docs](https://developers.google.com/ml-kit/vision)) is barcode/face/text/pose/segmentation/object/image-labeling; image labeling returns generic concept labels, not safety. Natural Language ([docs](https://developers.google.com/ml-kit/language)) is language-ID/entity-extraction/smart-reply — no toxicity. GenAI safety filters ride the Gemini Nano call's *own* I/O and are not a dev-callable classifier for arbitrary user content. **Freshness check:** the [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) show nothing shipped Aug→Oct 2026; latest entries are genai-prompt beta4 (2026-07-21). The August snapshot still holds.
- **Google MediaPipe:** text/image classification are **bring-your-own-model** — no prebuilt moderation model ([docs](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)).
- **Google ShieldGemma 2:** a ready-made safety *model* exists ([docs](https://ai.google.dev/gemma/docs/shieldgemma)) — but at 4B (image)/2B+ (text) params, documented for server/Python, with no on-device Android packaging, quantization, or latency story.
- **Apple:** [SensitiveContentAnalysis](https://developer.apple.com/documentation/sensitivecontentanalysis) ships on-device, dev-callable, image/video nudity only — **no text.** The one real competitor, and Android has no equivalent.
- **Qualcomm/Samsung/MediaTek:** compile toolchains only; no moderation model shipped.

**Then the thing a naive report would miss.** Google *is* building the Android answer — in the framework. [`android.app.contentsafety.ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) is a staged public API: an app with the right permission calls it, SafetyCore classifies **on-device**, and it returns one of four verdicts — *allowed / warning / blocked / unclassified* — leaving the app to show, blur, or hide. It's confirmed by [Google](https://thehackernews.com/2025/02/google-confirms-android-safetycore.html) and its [help page](https://support.google.com/product-documentation/answer/16001929), and [Cybernews](https://cybernews.com/security/android-content-safety-manager-api-privacy-concerns/) reports Google is opening it to third-party developers. Status, verified today: **API level 10000** — the placeholder for an unreleased level — docs last updated August 2026, i.e. in the SDK, not yet in a shipped Android release. SafetyCore already powers Google Messages' on-device nudity and spam/scam classification.

**The main competitor a developer uses today** is therefore not another SDK — it's a cloud moderation API (Hive/Rekognition/Perspective) plus a hand-rolled TFLite fallback. But the main competitor *to an ML Kit API* is Google's own `ContentSafetyManager`.

---

## Proposed surface (and why it shouldn't be ML Kit's)

If — against this report's recommendation — ML Kit shipped it, the honest surface would be a one-liner: `ContentSafetyClassifier.classify(ClassifiableContent)` → a typed `SafetyVerdict` with per-category scores (sexual, violence/gore, hate/harassment, self-harm), tunable thresholds, English-first text + image, CPU path, API 26+, first-use model download, 15-minute hello-world. That is achievable — the feasibility is a 4/5.

The problem is that this surface is ~90% `ContentSafetyManager` with a different package name. Shipping it in ML Kit would mean (a) a second on-device moderation code path for Google to maintain, (b) developer confusion over which door to use, and (c) ML Kit carrying a model-retraining and verdict-stability burden that the framework's shared SafetyCore residency is structurally better placed to own. The template's rule applies: when another team is the better owner, saying so is the more valuable conclusion.

**Where a real, un-absorbed surface does exist** — the residual worth a re-trigger — is the *delta* against `ContentSafetyManager`, and it is narrower than "a moderation API":
1. **Developer-owned policy vs. a user toggle.** `ContentSafetyManager`'s verdicts depend on the *user's* Sensitive Content setting (the user can disable it). The regulatory jobs (DSA, TAKE IT DOWN, Play accountability) require the *app* to moderate what a user *posts to others*, under the app's own policy, regardless of the viewer's setting. A compliance-grade, app-controlled, auditable classification contract is not what SafetyCore's consumer-protection toggle provides.
2. **On-device text toxicity** with a self-harm/hate/sexual/harassment taxonomy — the genuinely thin part of the ecosystem, where cloud (Perspective) still leads and SafetyCore's text focus is spam/scam, not the UGC harm taxonomy.
3. **Reach to pre-Android-17 devices.** `ContentSafetyManager` at API 10000 will gate to new Android versions — re-creating the exact 3.7%-style reach problem. A classic-ML-Kit-style classifier reaching ~96–97% of the fleet (CPU, API 26+) is the one thing an SDK could do that a new-framework API cannot.

---

## Reach & sizing

Arithmetic (mine, with sourced inputs; AppBrain/apilevels unreachable this session so app counts are estimates, device share is Google data relayed via [Capgo](https://capgo.app/plugins/android-distribution-chart/)):

- `A_cat` (UGC apps ≥50K installs, all relevant categories) ≈ 15k–30k [my estimate].
- `p_job` = 0.40 (dating/marketplace/social are ~0.7–0.9 UGC; Communication/Photography padded with non-UGC utilities).
- `r_reach` = 0.97 (API 26+ ≈ 96–97% of fleet).
- `c_ceiling` = 10–25% of eligible SAM (specialized, newer on-device ML SDK analogue, below the 1–2%-of-all-apps mature band).

→ **SAM** 6k–12k apps → **Eligible SAM** ~5.8k–11.6k → **SOM@yr3** ~580–2,900 apps (central ~1,450) = 0.02–0.12% of the ~2.5–3M catalogue, consistent with a specialized on-device SDK.

**Install-weighted reach** is dominated by the head, not the tail: if ~half of the top ~30 UGC apps (Instagram, TikTok, Snap, WhatsApp, Discord, Reddit, Tinder, Bumble, OfferUp, Mercari, YouTube Kids…) adopt, reach is ~20–40% of the UGC install surface ≈ **5–12% of the total Android install surface**. **Sensitivity:** halving `p_job` and `c_ceiling` cuts SOM ~4× but barely moves install-weighted reach — because it only thins the tail. **The decision rests almost entirely on whether a handful of major apps adopt, not on the long tail.** And that is exactly the population most able to hand-roll or to call `ContentSafetyManager` directly.

Engineering cost avoided per adopter is modest where **borrow** already works (image: a weekend) and meaningful only for text + multilingual + calibration + maintenance (a few engineer-weeks). Against build + 5 years of maintenance of a *duplicate* of the framework's own service, the platform-test numerator does not clear the bar for an ML-Kit-specific build.

---

## Adoption path

1. **The hook:** one Gradle line, `classify()` on a bitmap in the emulator, a verdict in 15 minutes — ML Kit's signature win.
2. **First real integration:** blur-and-reveal on inbound images (the Bumble/Apple-SCA UX), replacing a hand-ported TFLite model or a per-call cloud spend.
3. **The dependency:** calibrated multilingual text + image with reach across old devices, which a team would resent re-owning.

But name the plausible first adopter honestly: the dating and marketplace mid-tier (Hinge-scale, OfferUp-scale) that can't afford Bumble's in-house DS team. The majors will reach for `ContentSafetyManager` or keep their own. A funnel that starts in the mid-tier and is capped above by the platform's own API is a feature's funnel, not a platform API's.

---

## Execution plan

Not recommended for ML Kit. If pursued as the *residual* (compliance-grade text + reach), the only defensible shape is a **joint developer preview with the SafetyCore/Android-framework team**, whose question is: "Is the developer-owned, policy-tunable, auditable classification contract distinct enough from `ContentSafetyManager` to justify a second surface?" Org dependency is total: this cannot ship without the SafetyCore team's yes, and if they say no, there is no ML Kit product here. That dependency is the finding.

---

## The case against

The strongest case against is not weak, and it is the recommendation. **The live failure mode is #2 on the rubric's list: the platform absorbed the problem underneath you.** `ContentSafetyManager` + SafetyCore is Google building this capability as a system service — the architecturally correct place for a shared, on-device, model-backed moderation primitive — and an ML Kit version would be a lower-privilege duplicate competing with its own platform. Reinforcing it: the **borrow** path already wins for the highest-demand case (image NSFW is a weekend with `open_nsfw`/nsfwjs), so build-vs-buy-vs-borrow is a 2; and the **quality ceiling**, not the device budget, is the binding engineering risk — independent work shows on-device NSFW models false-flag 21.5–47.9% of artistic nudity ([Riccio et al., 2024](https://arxiv.org/abs/2409.17156)) and toxicity models over-flag identity-term and sarcastic text, so any honest product is soft-flag-and-reveal, never silent auto-block, which narrows the value further.

The fair mitigation: the residual (developer-owned policy, on-device text toxicity, pre-Android-17 reach) is genuinely un-absorbed, and the demand (4/5) and regulatory tailwind are real. That is why the verdict is Shelve-*and-reframe* with a concrete re-trigger, not kill.

---

## Kill criteria

**The single observation that would reverse this recommendation:** `ContentSafetyManager` ships in a GA Android release (leaving API level 10000) **with** an app-controlled policy/threshold contract that is independent of the user's Sensitive Content setting **and** a UGC-harm text taxonomy. If it ships *that*, even the residual closes and this should be killed outright. If it ships only the user-toggle consumer-protection version, the residual (compliance-grade, app-owned, text-inclusive, wide-reach) opens back up and this returns as a Prototype.

**Load-bearing assumption:** that `ContentSafetyManager`'s verdicts are gated to the user's Sensitive Content setting and a fixed/opaque taxonomy. Verified from secondary coverage and the staged reference; **not** yet confirmed against a GA spec, because none exists.

**Re-check trigger if shelved:** next ML Kit release notes or Android 17/18 developer preview that moves `ContentSafetyManager` off API level 10000 — re-read its spec against the three residual requirements above.

---

## Fit for this team

This is the crux. The capability clears the platform test — the platform *should* own on-device moderation — but **ML Kit is the wrong part of Google's stack for it.** The right owner is the Android framework / SafetyCore team, which already controls the system service, the shared on-device model residency, and the trust boundary. ML Kit's value is ergonomics and reach over classic on-device tasks; duplicating a framework system service fragments the developer story further, which this ecosystem's own history warns against. The genuinely ML-Kit-shaped slice is the **reach layer** — a CPU, API-26+ classifier for the ~96–97% of devices a new-framework API will not reach — and even that should be built with the SafetyCore team, not against it.

---

## Open questions

- **Is `ContentSafetyManager` user-toggle-gated and fixed-taxonomy, or app-controllable?** Settles whether the residual exists. Needs a GA spec; none published. *(Load-bearing.)*
- **What modalities and taxonomy will it expose at GA** — image-only like Apple's SCA, or text too, and with what harm categories? Determines whether on-device text toxicity stays open.
- **Which Android release and minSdk** will it require? Determines the size of the reach gap an SDK could fill.
- **Are MediaPipe/AI Edge and ML Kit converging?** If MediaPipe gains a prebuilt moderation model, the residual narrows further. No public roadmap statement exists either way.
- **Android RAM distribution** across the fleet is unpublished — the biggest missing input for any low-end reach claim.

---

## Runners-up

- **On-device evaluation & quality-measurement harness (Type D)** — *the strongest Build candidate for a future run.* Apple shipped an Evaluations framework + token counting; ML Kit publishes a prose "evaluate prompt quality" page with no code behind it. Un-absorbed by SafetyCore, moves fast (no model to train), and directly addresses "developers can't tell if their AI feature got better or worse between releases." Lost this run only because moderation had the stronger regulatory hook — but it likely scores higher. **Promote next.**
- **Model-availability & delivery observability contract (Type E)** — the clearest developer-voiced pain in the ML Kit issue tracker (silent, unobservable model downloads). Maximum platform privilege; weak demo appeal; durability risk. Lost on "invisible in a demo."
- **Reach / sub-8 GB GenAI tiering (Type F)** — the defining 3.7% tension and a DMA tailwind, but feasibility is the whole game and Firebase hybrid may absorb it. Parked pending a device-RAM distribution source.
- **On-device neural TTS (Type A)** — clean whitespace (Google ships nothing; Picovoice sells Orca; Apple shipped speech generation), but platform privilege is only moderate and an OSS path competes. A legitimate Type A for a future run.

---

*Sources:* [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) · [ML Kit Vision](https://developers.google.com/ml-kit/vision) · [ML Kit Language](https://developers.google.com/ml-kit/language) · [ContentSafetyManager reference](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) · [Google confirms SafetyCore (The Hacker News)](https://thehackernews.com/2025/02/google-confirms-android-safetycore.html) · [Understanding SafetyCore (Google support)](https://support.google.com/product-documentation/answer/16001929) · [Cybernews: ContentSafetyManager opening to developers](https://cybernews.com/security/android-content-safety-manager-api-privacy-concerns/) · [Apple SensitiveContentAnalysis](https://developer.apple.com/documentation/sensitivecontentanalysis) · [ShieldGemma](https://ai.google.dev/gemma/docs/shieldgemma) · [MediaPipe text classifier](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier) · [Bumble Private Detector](https://github.com/bumble-tech/private-detector) · [TechCrunch: Bumble open-sources Private Detector](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/) · [nsfwjs](https://github.com/infinitered/nsfwjs) · [Lovoo NSFWDetector](https://github.com/lovoo/NSFWDetector) · [open_nsfw_android](https://github.com/devzwy/open_nsfw_android) · [HaramBlur](https://github.com/alganzory/HaramBlur) · [Hive pricing](https://thehive.ai/pricing) · [AWS Rekognition](https://aws.amazon.com/rekognition/) · [Perspective API](https://developers.perspectiveapi.com/) · [Azure AI Content Safety](https://learn.microsoft.com/azure/ai-services/content-safety/) · [HN: Ask HN moderation](https://news.ycombinator.com/item?id=42830018) · [HN: built a moderation API after failing to find one](https://news.ycombinator.com/item?id=46914190) · [Riccio et al. 2024 (NSFW false positives on art)](https://arxiv.org/abs/2409.17156) · [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/) · [Google Play AI content policy](https://support.google.com/googleplay/android-developer/answer/14094294) · [EU DMA Alphabet AI interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) · [Capgo Android distribution](https://capgo.app/plugins/android-distribution-chart/) · [killedbygoogle](https://killedbygoogle.com/)
