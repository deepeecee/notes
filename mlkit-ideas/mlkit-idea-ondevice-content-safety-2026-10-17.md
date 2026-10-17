# On-Device Content Safety API — moderate user content on the phone, before it ever reaches a server

**Type:** G (Trust, safety & compliance) · **Verdict:** Prototype → developer preview (narrow-scope-first) · **Opportunity: 7/10 (strong case, one gate shaky)**
*2026-10-17 · Prepared for Android ML Kit · Evidence current as of 2026-10-17*

> A three-engineer team at a dating app ships a chat feature on a Tuesday. By Thursday the Play policy console flags them: they host user-generated content and have no moderation system. Their ML people are server-side and busy, so an Android engineer wires up Google's free Perspective API — which is cloud-only, rate-limited to ~1 QPS by default, and, as of its own sunset notice, shut down for good on **31 December 2026** with no migration path. There is no on-device, Google-supported replacement. ML Kit has no content-safety API at all. That gap is the idea.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — strong case | composite 3.8 ×2 = 7.6, −1 because a gate (durability) sits at 3; not +1 because demand is a 4 not a 5 |
| Platform privilege (gate) | 4/5 — pass | Only the platform can system-deliver one quality classifier to the whole fleet, keep it current against evolving abuse, and align it to Play policy; Apple already proved platforms own this on-device ([SCA](https://developer.apple.com/documentation/sensitivecontentanalysis)) |
| Feasibility headroom (gate) | 4/5 — pass | Encoder classifier fits mid-tier easily (MobileBERT ~28 MB / ~58 ms on Pixel 6 CPU; EmbeddingGemma 308M <200 MB RAM, <22 ms); quality — not silicon — is the ceiling ([MediaPipe](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier)) |
| Durability (gate) | 3/5 — pass, shaky | Child-safety is a durable charter, but Google just **killed** its own moderation API (Perspective), and owning a minor-safety classifier carries false-negative liability Google may not want ([sunset notice](https://www.perspectiveapi.com/)) |
| Demand evidence (25%) | 4/5 | Dense paid cloud market (Hive $3/1K images, Rekognition ~$0.001/image, Azure), free incumbents (OpenAI free, Perspective ~500M req/day), OSS (Detoxify 1.3k★, pushed this week), Play UGC mandate |
| Install-weighted reach (15%) | 4/5 | ~12K–40K apps ≥50K installs across social/messaging/dating/gaming, collectively multiple billions of installs; runs on ~96% of devices at minSdk 26 vs ~3.7% for Gemini Nano |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path is real — Detoxify, ShieldGemma 2B weights, free OpenAI cloud — so the honest delta is quality + bias-eval + multilingual + maintenance, not raw capability |
| Integration cost / TTFHW (15%) | 4/5 | Achievable as one Gradle line + on-demand model download, no API key, no server, no new runtime permission |
| Substitute half-life (15%) | 4/5 (minor-safety core) · 2/5 (broad toxicity) | A general on-device model does toxicity scoring as a prompt — but you will not route legally-mandated minor-safety through a general prompt; the regulated core is durable, the broad version is not |
| Strategic complement (10%) | 4/5 | Commoditizes a complement (safe UGC) that keeps Play healthy and defends the Android brand; clears the platform test |
| **Composite** | **3.8** | top of the Prototype band |

*Least trustworthy row: install-weighted reach. The per-category "≥50K installs" AppBrain rows did not fetch this run; the 12K–40K app range is my arithmetic anchored on two retrievable figures (2.03M total apps; Tools = 25,074 apps ≥50K installs).*

---

## The problem

Every consumer app with a text box between two users is, the moment it ships, a moderation problem. The core loop — post → others see it — leaks the instant a bad actor arrives, and they arrive at launch. A developer quote from Hacker News captures the lived version: *"the instant the trolls find it, you either die an MVP or live long enough to build content moderation."* The job to be done is narrow and urgent: **given a piece of user content, tell me — fast, cheaply, and ideally without shipping it to a server — whether it is unsafe, so I can block it, queue it, or warn a minor before it does harm.**

What do developers do instead today? Three things, all with costs this API is priced against. (1) They call a **cloud** moderation API: OpenAI's (free, but every message leaves the device and incurs latency and a privacy/consent surface), Perspective (free, ~1 QPS, dying), or a paid vendor — Hive at [$3 per 1,000 images](https://thehive.ai/), Rekognition at ~$0.001/image, Azure AI Content Safety per record. (2) They **hand-roll** it: Detoxify ([1,307★, last push 2026-10-14](https://github.com/unitaryai/detoxify)) is the canonical OSS toxicity model; one developer has already published a [LiteRT `.tflite` 8-language moderation build tagged "android"/"on-device"](https://huggingface.co/desert-ant-labs/toxic) — someone is literally hand-building the exact artifact this would productize. (3) They pay humans: Yubo [labeled reported content for nearly a year to train classifiers](https://blogs.lse.ac.uk/medialse/) and contracts Hive and Bodyguard on top.

Why is this a *structural* problem for large Android apps rather than a tooling accident? Because the constraints compound. Their ML talent is server-side; their Android engineers aren't ML people, and a classifier that needs both in one head is expensive for them and therefore an opportunity for a platform. Per-inference cloud cost multiplied by DAU is real money (one HN developer: *"over a billion requests, >$100,000 by typical pricing, through OpenAI's moderation API for $0"* — the free tier is the floor, but it's cloud). And sending user messages, especially minors' messages, to a third-party server is now a regulatory liability in several jurisdictions at once. On-device moderation collapses the cost, the latency, and the data-egress surface simultaneously — which is exactly why Apple built it into the OS.

---

## Proof & signals

- **Someone charging money for it:** a mature, competitive paid market — [Hive](https://thehive.ai/) ($3/1K images; cited by Reddit, Yubo), [AWS Rekognition](https://aws.amazon.com/rekognition/pricing/) (~$0.001/image), [Azure AI Content Safety](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/content-safety/) (per-record), Sightengine, WebPurify. Willingness to pay for a vacated capability is the strongest demand signal there is — and all of it is cloud. *(Pricing: third-party/vendor-page, verify exact cents before quoting.)*
- **A free incumbent is dying:** Google/Jigsaw's **Perspective API** processed [~500M requests/day in 2021](https://www.perspectiveapi.com/) and shuts down **31 Dec 2026**; new quota requests closed Feb 2026; "Jigsaw will not be offering direct migration support." Its stated reason — *"there is now less demand for a standalone tool specific to this area"* — is the single most important line in this report, and I argue against it below. *(Confirmed against multiple independent sources incl. the sunset notice and an [arXiv retrospective](https://arxiv.org/abs/2604.25580).)*
- **Developers doing it by hand:** [Detoxify](https://github.com/unitaryai/detoxify) (1,307★, pushed this week), [desert-ant-labs on-device `.tflite`](https://huggingface.co/desert-ant-labs/toxic), plus open safety weights ([ShieldGemma 2B/9B/27B](https://ai.google.dev/gemma/docs/shieldgemma/model_card), [Llama Guard](https://github.com/meta-llama/PurpleLlama)) that prove the model class exists but ship as raw weights, not a managed API.
- **The platform mandate:** Google Play's own [UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937) requires that *any* app hosting UGC — "whether a small fraction or the whole app itself" — implement "a robust, effective and ongoing moderation system," and the [AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/13985936) requires in-app reporting. Google already compels the behavior; it ships no tool to perform it.
- **The absence signal:** across ML Kit, MediaPipe (sentiment model only), and AICore (safety applied to Nano's *own* output, not exposed as a classifier), there is no content-safety API. The quiet here is not "no demand" — the paid market and the Play mandate refute that — it's Google having decided moderation is each app's problem.

---

## Why now

1. **Capability shift (2024→2026):** compact safety classifiers crossed the on-device line. [Llama Guard 3-1B-INT4](https://arxiv.org/abs/2411.17713) runs ~30 tok/s on a commodity Android CPU at ~440 MB (Meta-published); EmbeddingGemma proves a 300M-class transformer fits in <200 MB RAM. The encoder path (MobileBERT ~28 MB, ~58 ms) was viable even earlier. The tech is ready; nobody packaged it.
2. **Competitive shift (Jun 2025→):** Apple shipped [Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis) — on-device, third-party-callable (entitlement-gated), used by messaging apps to screen received images for nudity. It's narrow (image/nudity, boolean, iOS 17+), but it establishes that a platform ships on-device moderation as a first-class API. Android has no answer.
3. **Regulatory shift (a dated cluster, now):** UK OSA illegal-content duties enforceable [Mar 2025](https://www.ofcom.org.uk/online-safety/); EU DSA minor-protection duties applicable to all platforms since [Feb 2024](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2065); FTC [COPPA amendments](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) compliance 22 Apr 2026; Texas app-store age-verification enforceable [Jun 2026](https://www.wiley.law/alert-Key-Developments-With-State-App-Store-Accountability-Acts-as-Texas-Act-Takes-Effect). The why-now is strong and real — but note it rests on DSA/OSA/COPPA/state-law + the Play policy, **not** the EU DMA interoperability decision (16 Jul 2026, Android 18 by 1 Aug 2027), which concerns assistant interoperability and is the weakest leg for a moderation pitch.

---

## The capability gap

Exact boundaries, each with the surface checked:

- **Google ML Kit** — no content-safety or moderation API. GenAI APIs do summarize/proofread/rewrite/caption; AICore applies safety to [Gemini Nano's own output](https://developer.android.com/ai/gemini-nano), never as a classifier a developer calls on their content.
- **MediaPipe Text Classifier** — a callable on-device runtime, but ships only a MobileBERT **sentiment** model; moderation means training your own via Model Maker ([docs](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier)).
- **ShieldGemma / Llama Guard** — real on-device-viable safety models, but **raw open weights** the developer must quantize, bundle, update, and operate. The model existing is not the API existing.
- **Perspective / OpenAI / Hive / Azure** — real category-score moderation, all **cloud**. Data leaves the device; Perspective also leaves the market this year.
- **Apple SCA** — the only thing that is simultaneously on-device + third-party-callable + actual moderation — but **image/nudity only, boolean, iOS.** It strengthens the Android case rather than filling it.

**Main competitor a developer uses today:** a cloud moderation API — most often OpenAI's free endpoint, or Perspective until it dies — not another on-device SDK.

---

## Proposed surface

A two-tier **`ContentSafety`** API in ML Kit, system-delivered model, on-device, no key, no server. **Lead with Tier 1; treat Tier 2 as an extension, not the launch.**

**Tier 1 — Communication Safety (the recommendation):** a multimodal classifier for the regulated core — sexual content / nudity (image), CSAM-adjacent signals, and minor-directed harm (text). This is Android's answer to Apple SCA, scoped to what regulation *mandates* rather than what's merely nice.

```kotlin
val safety = ContentSafety.getClient(
    SafetyOptions.Builder()
        .setProfile(SafetyProfile.COMMUNICATION_SAFETY) // vs. GENERAL_UGC (Tier 2)
        .setSensitivity(Sensitivity.BALANCED)           // tunable, not one-size
        .build()
)
val result: SafetyResult = safety.classify(SafetyInput.image(bitmap)).await()
when (result.verdict) {                      // SAFE / REVIEW / UNSAFE — not a bare boolean
    Verdict.UNSAFE -> blockWithIntervention(result.categories) // per-category scores
    Verdict.REVIEW -> queueForHumanReview(result)
    Verdict.SAFE   -> show()
}
```

Returns **per-category scores** (Apple SCA's gap) and a three-state verdict so apps branch on `REVIEW`, matching the real "classifier gates a human queue" workflow. Tunable sensitivity and a stated profile address the fatal "one-size classifier is unusable for a real T&S team" failure of Type-G ideas. **Deliberately does not** make the final publish/block decision, claim legal sufficiency, or replace mandated human review or NCMEC reporting — the developer owns the action; the API owns the signal. Model ships via [Play for On-device AI](https://developer.android.com/guide/playcore) on-demand (keeps APK size negligible) and auto-updates against evolving abuse.

**Tier 2 — General UGC health** (broad toxicity/harassment, Detoxify-equivalent). Useful, but scores markedly lower (see below); ship it only once Tier 1 proves the delivery and eval machinery.

**TTFHW target: 15 minutes.** Met if the model is Play-delivered (no bundling), there is no API key and no server, and the emulator ships a stub model. The one thing that breaks it is a dangerous permission or a console project — so the design must avoid both.

---

## Reach & sizing

Using the evidence-sources recipe; every input tagged.

- `A_cat` (UGC-bearing categories ≥50K installs): ~25K–60K apps *(my arithmetic, anchored on AppBrain: 2.03M total apps, Tools = 25,074 apps ≥50K installs, Oct 2026 — per-category rows did not fetch).*
- `p_job` (fraction actually exchanging user content): 50–70% → **~12K–40K addressable apps ≥50K installs** *(my arithmetic).*
- `r_reach` (device eligibility): **96.1% at minSdk 26**, 96.6% at 24, 78.8% at 31 *(third-party, [apilevels.com](https://apilevels.com/), Apr 2026).* Contrast the ~**3.7%** that Gemini Nano gates to — the whole point of the encoder path is that moderation reaches the fleet Nano can't.
- **Install-weighted:** the top ~20 UGC apps alone are multiple billions of installs (Telegram [1B+](https://9to5google.com/2021/10/18/telegram-surges-past-1-billion-play-store-downloads/), WhatsApp 5B+; 100M+ tiers for Discord/Reddit/Bumble). This is a high install-skew surface — exactly where platform SDKs over-index.
- **Engineering cost avoided:** a credible on-device moderation model built in-house is a multi-month effort (model sourcing, quantization, multilingual, *bias eval*, device matrix, perpetual abuse maintenance). Even at a conservative 6 engineer-weeks saved across a few thousand serious adopters, the numerator clears the platform test comfortably.

**Sensitivity:** halve both `p_job` and the adoption ceiling and the addressable set drops to the low thousands of apps — still billions of install-weighted reach because of the install-skew, so the **verdict survives**. What it's genuinely sensitive to is not reach but substitution (below).

---

## Adoption path

1. **The hook:** a dating/social/kids app under a Play UGC flag drops in one Gradle line, Play fetches the model, and received images are screened on-device in an afternoon — no backend, no key, no per-call bill. The 15-minute win is "I satisfied the Play UGC requirement without standing up a moderation pipeline."
2. **First real integration:** it replaces a cloud moderation call (Perspective-refugee, or an OpenAI/Hive line item) for the latency- and privacy-sensitive path — screening content *before* it leaves the device.
3. **The dependency:** the model stays current against new abuse via system delivery, and the per-category scores get wired into the app's human-review queue. Removing it means re-sourcing a model and re-standing-up the pipeline — a cost they'd endorse, not resent.

**First adopter:** a youth-social or dating app facing the hardest regulatory exposure (the Yubo archetype — already spending a year of labeling and multiple vendors). **Second wave:** messaging and community apps once there's one visible reference integration. If you can't name a first adopter you have no funnel; here the Play UGC mandate *manufactures* one.

---

## Execution plan

- **Developer preview:** ship Tier 1 to 5–10 design partners drawn from the highest-regulatory-exposure categories. Question it answers: **will a real T&S team accept a platform classifier's taxonomy and tunability, or is safety too proprietary?** — the make-or-break for every Type-G idea. Collect the S1 on-device-specific demand evidence the market hasn't yet revealed.
- **Alpha/Beta:** graduate when subgroup false-positive/false-negative rates clear a published embarrassment threshold *and* ≥3 partners ship it in production. State the bias-eval gate as a checkable condition, not a vibe.
- **GA:** commit a frozen category taxonomy, a sensitivity contract, and — critically — an **output-stability guarantee across model refreshes** (versioned independently of the model), so an app's thresholds don't silently drift when the model updates.

**Org dependencies, honestly:** this needs (a) the AICore/Gemma safety-model team to supply and maintain the classifier, (b) Play for On-device AI as the delivery channel, and (c) Legal to sign off on Google shipping a minor-safety classifier at all. If Legal says no to owning that liability, the idea dies — which is why the durability gate is a 3.

---

## The case against

The strongest argument against is **Jigsaw's own**, and it deserves to be stated at full strength: *AI capabilities have evolved, and there is less demand for a standalone tool specific to this area.* A general on-device model — Gemini Nano through the [Prompt API](https://developers.google.com/ml-kit/genai/prompt-api), or Gemma — can already do toxicity classification as a prompt with structured output. If the future of moderation is "ask the model you already have," a dedicated classifier is a narrow API with a short half-life, and Google shipping one would be re-entering a market it just chose to exit. This is the live failure mode from the rubric: **the platform absorbs the problem underneath you** — and here the platform has *said so.*

This is exactly why the recommendation narrows to Tier 1. The substitute argument is strong for broad toxicity (S5 = 2) and weak for the regulated minor-safety core (S5 = 4): no serious team will route legally-mandated CSAM/minor-safety through a general-purpose prompt, because the false-negative liability and the regulatory stakes demand a dedicated, audited, versioned classifier — the same reason Apple built SCA as a distinct framework rather than folding it into Apple Intelligence. The broad Tier-2 version should be shelved until Tier 1 proves out.

The second real risk is **quality/embarrassment**, not silicon. Small toxicity classifiers have documented identity-term false positives and dialect bias; Jigsaw's own "Lost in Distillation" (WOAH 2022) warns that shrinking a model *hides* robustness loss on identity text that aggregate F1 doesn't reveal, and Perspective's model card explicitly says it is not for fully automated moderation. An on-device, UI-facing API implies exactly that automation. Mitigation lives in the eval gate above — but it is a cost, and pretending the mid-tier model matches the cloud frontier would be the dishonest version of this report.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google announces (at I/O 2027 or in release notes before it) that the **Prompt API gains a first-class, structured safety-classification profile** over user content — i.e. the general model officially absorbs the job. If that ships, Tier 1's privilege collapses to a thin wrapper and the verdict flips to shelve.

**Load-bearing assumption:** that real trust-and-safety teams will accept a *platform-supplied* taxonomy and tunability for the regulated core. If safety is too proprietary to outsource even for CSAM/minor-safety, adoption stalls at the hook. The developer preview exists to test precisely this.

**Re-check trigger if shelved:** a statutory deadline that names *on-device* moderation specifically, or a competitor (Qualcomm, Samsung) shipping a managed on-device safety API on Android — either would restore the privilege case.

---

## Fit for this team

ML Kit, not MediaPipe or Firebase AI Logic — but it's a genuine call. ML Kit is the right home because it is the on-device, task-level, "one Gradle line, no server" front door, and this capability's entire value is being on-device and keyless; Firebase AI Logic's hybrid/cloud framing undercuts the privacy wedge, and raw MediaPipe/LiteRT (bring-your-own-model) is the status quo that leaves developers hand-rolling. The honest risk is that ML Kit and MediaPipe's safety surfaces fragment further, and that the safety *model* must come from the AICore/Gemma team — so ML Kit owns the **API and delivery contract**, and the model org owns the **weights and eval**. If Google would rather make this a Prompt API profile, that's a defensible alternative home and should be weighed in the preview — it trades reach (Nano's 3.7%) for consolidation.

---

## Open questions

- **Per-category ≥50K-install app counts by Play category** — did not fetch this run; re-pull the AppBrain table by hand to firm up the 12K–40K SAM.
- **Will Legal let Google own a minor-safety classifier's liability?** Undetermined and decisive for the durability gate.
- **Does Apple SCA's adoption show real pull, or sit unused?** iOS adoption data would calibrate Android demand; not found.
- **Exact smallest model that clears the bias/embarrassment gate multilingually** — the feasibility sweet spot (100–308M encoder) is bounded by size/latency, but the quality floor is a training-data question I couldn't close from published benchmarks.

---

## Runners-up

- **Managed GenAI availability + fallback façade (Type C/E)** — collapse the `checkFeatureStatus → model download → BUSY/quota → graceful fallback` block *every* ML Kit GenAI integrator hand-writes into one declarative policy. Strongest on privilege and durability; lost to this idea on reach (gated to Nano's ~3.7% base) and because Firebase AI Logic's hybrid modes partly cover it. The closest second — worth its own run.
- **On-device eval / quality harness (Type D)** — ML Kit *prescribes* "evaluate prompt quality" with zero tooling while Apple shipped an Evaluations framework. Lost on the privilege gate (anyone can build a harness; no OS-level privilege) and thinner demand.
- **On-device neural TTS (Type A)** — real whitespace (Google ships nothing; Apple added speech generation; Picovoice Orca monetizes it). Parked: Picovoice already sells into it, and the model-delivery + quality lift is heavier than a classifier.
- **Output-stability contract for structured output (Type E)** — Structured Output just hit Alpha (Jul 2026); apps parsing Nano JSON will break across model refreshes. Strong privilege, but production-only demand evidence is thin and the surface is narrow. (Note: folded in here as the GA output-stability guarantee.)

---

*Sources:*
- [Perspective API (sunset notice)](https://www.perspectiveapi.com/) · [Perspective retrospective (arXiv)](https://arxiv.org/abs/2604.25580)
- [Apple Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis) · [Apple FM guardrails](https://developer.apple.com/documentation/foundationmodels/improving-safety-from-generative-model-output)
- [ML Kit GenAI (Gemini Nano)](https://developer.android.com/ai/gemini-nano/ml-kit-genai) · [AICore](https://developer.android.com/ai/gemini-nano) · [ML Kit Prompt API](https://developers.google.com/ml-kit/genai/prompt-api) · [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [MediaPipe Text Classifier](https://developers.google.com/edge/mediapipe/solutions/text/text_classifier) · [ShieldGemma model card](https://ai.google.dev/gemma/docs/shieldgemma/model_card) · [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/)
- [Llama Guard 3-1B-INT4 (arXiv 2411.17713)](https://arxiv.org/abs/2411.17713) · [PurpleLlama](https://github.com/meta-llama/PurpleLlama) · [Detoxify](https://github.com/unitaryai/detoxify) · [desert-ant-labs on-device toxicity](https://huggingface.co/desert-ant-labs/toxic)
- [Hive](https://thehive.ai/) · [AWS Rekognition pricing](https://aws.amazon.com/rekognition/pricing/) · [Azure AI Content Safety pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/content-safety/) · [OpenAI Moderation](https://platform.openai.com/docs/guides/moderation)
- [Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937) · [Play AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/13985936)
- [EU DSA (Reg 2022/2065)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2065) · [UK OSA / Ofcom](https://www.ofcom.org.uk/online-safety/) · [FTC COPPA amendments](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) · [State app-store laws (Wiley)](https://www.wiley.law/alert-Key-Developments-With-State-App-Store-Accountability-Acts-as-Texas-Act-Takes-Effect) · [EU DMA Alphabet interoperability](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [apilevels.com](https://apilevels.com/) · [AppBrain category stats](https://www.appbrain.com/stats/android-market-app-categories) · [Telegram 1B installs](https://9to5google.com/2021/10/18/telegram-surges-past-1-billion-play-store-downloads/)

---

### Evidence note (this run)

WebFetch failed on DNS for every host this session (a proxy/resolver issue, not policy blocks); all live checks — mine and the four research subagents' — were done through WebSearch, which surfaces official-page text but not every table row. Load-bearing claims were each independently corroborated from ≥2 sources. Figures not directly read off a primary page (vendor pricing to the cent, per-category app counts, some model sizes) are flagged inline as third-party or as my arithmetic. The ML Kit release notes were confirmed current (genai-prompt 1.0.0-beta2, 2026-04-02) and show no content-safety API, confirming the gap live.
