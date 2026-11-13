# On-device Moderation Classifier — score user content before it leaves the phone

**Type:** G (Trust, safety & compliance) · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (mandated job, soft moat)**
*2026-11-13 · Prepared for Android ML Kit · Evidence current as of 2026-11-13*

> *Badges: Regulatory clock (real, dated) · Perspective API dies 31 Dec 2026 · Nobody ships the managed on-device version · Soft privilege*

> An Android engineer at a dating or chat app is wiring up user bios and first messages this
> Tuesday. Play policy requires them to moderate it; GDPR makes shipping it to a cloud scorer a
> data-transfer liability; and the free scorer they planned to use, Jigsaw's Perspective API, is
> switched off on 31 December 2026. Their choices today are: pay Hive per call, self-host raw
> ShieldGemma weights and own all the MLOps, or hand-roll a word list that leetspeak defeats. None
> is a one-Gradle-line call that keeps the content on the device. That call doesn't exist on any
> platform — and ~95% of the Android fleet can't run a general model that would substitute for it.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — mandated job, soft moat | composite 3.70 × 2 = 7.4, −1 because two gates (privilege, durability) sit exactly at 3; S1 is 4 not 5 so no bonus |
| Platform privilege (gate) | 3/5 — pass (soft) | Text toxicity has no technical barrier — a team can wrap [Detoxify](https://github.com/unitaryai/detoxify) or [Llama Guard 1B](https://arxiv.org/abs/2411.17713) in an SDK. Privilege is maintenance + fleet distribution + the SafetyCore substrate, not capability |
| Feasibility headroom (gate) | 4/5 — pass | Small encoder <100 MB, <200 MB RAM, <50 ms, minSdk-26 ([EmbeddingGemma 308M, <200 MB](https://developers.googleblog.com/en/introducing-embeddinggemma/)); the real limit is precision at base rates, not size/latency |
| Durability (gate) | 3/5 — pass (soft) | Google just killed [Perspective](https://perspectiveapi.com/) citing "less demand for a standalone tool" — a direct, recent signal against a standalone Google moderation product |
| Demand evidence (25%) | 4/5 | Mandatory under [Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937); paid cloud vendors (Hive, Sightengine, Azure); but on-device-*specific* demand is early |
| Install-weighted reach (15%) | 4/5 | UGC spans Social + Communication + Dating + chat-gaming; API-26 reaches ~94.8% of devices vs Nano's ~3.7% |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path (Detoxify + quantize) mostly works for blunt profanity; delta is real only on multilingual, obfuscation, nuance, and perpetual maintenance |
| Integration cost / TTFHW (15%) | 5/5 | `getClient()` → `classify(text)` → category scores; one Gradle line, no key, no cloud round-trip, <15-min hello-world is reachable |
| Substitute half-life (15%) | 3/5 | On flagships a Nano prompt already does ~80% of this; the wedge survives only on the mid-tier where no general on-device model exists |
| Strategic complement (10%) | 3/5 | Helps Play compliance and the privacy narrative, but Google's own exit from Perspective cuts against the strategic read |
| **Composite** | **3.70** | Prototype band (3.0–3.9): developer-preview to collect the missing on-device demand evidence |

*Least trustworthy row: S3 (build-vs-buy). The borrow path is cheap enough that the honest engineer-weeks-saved number is modest for the easy categories, and I'm estimating it, not measuring it against a named team's commit history.*

---

## The problem

The job to be done, stated as an engineer's job under a deadline: *"I host user-generated content, my app gets rejected from Play without a moderation system, and I need to score a username / bio / message / uploaded image for toxicity, harassment, sexual content, and spam — cheaply, at my DAU, without becoming the reason user content leaked to a third party."* The customer is an Android IC, not an ML engineer; the app's ML talent is server-side and busy. The competing solution is their own code or a cloud bill.

This problem is structurally produced, not accidental. A large consumer app that hosts UGC operates under four constraints a hobby app doesn't: (1) Play's UGC policy makes moderation a **distribution gate**, not a nice-to-have — [apps are rejected for lacking in-app reporting/moderation](https://support.google.com/googleplay/android-developer/answer/9876937); (2) it runs at a DAU where per-call cloud moderation is a line item; (3) it carries GDPR/children's-data exposure in many jurisdictions at once, so routing user content — often minors' content — to a third-party cloud scorer is itself a processing/transfer liability under [GDPR Art. 5(1)(c) data minimization](https://gdpr-info.eu/art-5-gdpr/); and (4) its device fleet spans six-year-old SoCs, so any solution gated to flagship silicon reaches almost none of its users.

What do they do *instead* today? Three workarounds, each with a named cost. **Cloud moderation** — [OpenAI's omni-moderation](https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/) (free) or Perspective (free, dying) or [Hive](https://hivemoderation.com/)/[Sightengine](https://sightengine.com/pricing)/[Azure Content Safety](https://azure.microsoft.com/en-us/pricing/details/content-safety/) (paid, ~$0.5–3 per 1K) — all of which send content off-device. **Self-hosted weights** — [ShieldGemma](https://ai.google.dev/gemma/docs/shieldgemma) or [Llama Guard 3-1B-INT4](https://arxiv.org/abs/2411.17713), which runs on an Android CPU today but leaves the team owning quantization, packaging, device fragmentation, taxonomy mapping, and updates. **A word list** — the [badwords](https://github.com/nyvorin/badwords)/[go-away](https://github.com/TwiN/go-away) family that obfuscation, leetspeak and Unicode homoglyphs defeat. The value of the proposed API is priced against these: it is the cloud scorer's privacy/latency cost avoided, minus the integration cost of one managed on-device SDK.

This is a platform problem, not an app problem, on exactly the test that matters: every UGC app solves it **identically and badly** (the differentiation is their policy thresholds, not the classifier), and the hardest parts — model maintenance across a fragmented fleet, the on-device classification substrate, and the policy-gated CSAE slice — can only be done well by whoever owns the OS and the model-delivery channel.

---

## Proof & signals

- **Developers doing it by hand (OSS):** [unitaryai/detoxify](https://github.com/unitaryai/detoxify) — 1,315★, pushed 2026-11-11, the reference OSS toxicity model teams port. The profanity-filter ecosystem is large and active — [badwords](https://github.com/nyvorin/badwords) (699★), [profanity-check](https://github.com/vzhou842/profanity-check) (660★), [go-away](https://github.com/TwiN/go-away) (301★, pushed the day of research) — but it is overwhelmingly **web/backend** (JS/PHP/Go/Python). The absence signal is sharp: every *Android/Kotlin-native* on-device moderation repo is tiny (single-digit stars). Android devs either call a cloud API or hand-roll a word list; no established on-device Android library exists. *[Confirmed, GitHub, Nov 2026.]*
- **Someone already built exactly this, to near-zero adoption:** [`local_toxicity_guard`](https://pub.dev/packages/local_toxicity_guard) (Flutter, ONNX MiniLM, 6 categories, "text never leaves the device") — **8 downloads**. [`litert-community/Shieldstral-1.0-3B`](https://huggingface.co/litert-community/Shieldstral-1.0-3B) and other LiteRT-format safety models exist on Hugging Face. Read this as unmet-and-unsolved, not saturated — the capability is reachable but nobody has packaged it as a first-class, maintained API. *[Confirmed.]*
- **Someone charging money for it:** Hive (quote-only, est. ~$3/1K images), Sightengine ($29–99/mo + overage), WebPurify ($200+/mo), Azure (~$0.75/1K text records), [AWS Comprehend Toxicity](https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-comprehend-trust-safety-features/). Willingness-to-pay for the cloud form is proven. **Counter-signal:** the two most-used text scorers — OpenAI Moderation and Perspective — are *free*, so the wedge cannot be "stop paying per call"; it must be privacy, offline, latency, and data-minimization compliance.
- **The displacement signal (strongest):** **[Perspective API shuts down 31 December 2026](https://perspectiveapi.com/)** — stopped accepting new requests February 2026, no migration support, officially reasoned as "AI capabilities have evolved, and there is now less demand for a standalone tool." It was the de-facto free standard for automated toxicity measurement ([academic post-mortem already written](https://arxiv.org/abs/2604.25580)). A large installed base must re-pick a moderation solution inside the exact window this product would launch into. *[Confirmed against perspectiveapi.com, 2026-11-13.]*
- **Big players are going on-device (direction of travel):** [Apple Communication Safety](https://support.apple.com/en-us/105069) scans messages locally for nudity; Meta ships client-side nudity protection in encrypted Instagram DMs (on-device because the server can't see E2EE content); [Discord open-sourced an ML CSAM-detection model](https://discord.com/safety/how-discord-leverages-machine-learning-to-fight-csam) as an extra layer. The privacy/latency rationale for on-device moderation is validated at platform scale. *[Confirmed.]*
- **Community voice gap (stated honestly):** Reddit, Stack Overflow and HN developer-voice could not be verified this run — those hosts are not allow-listed in this session's network and return blocks. The grassroots-pain signal is therefore thinner than the structural ones (policy mandate + vendor market + Perspective shutdown), which are strong. This is a named gap, not a smoothed-over one.

---

## Why now

1. **Capability shift (2025–2026).** On-device safety classification crossed from research to shipping. [Llama Guard 3-1B-INT4](https://arxiv.org/abs/2411.17713) (~440 MB) runs at ~30 tok/s on a commodity Android CPU; [EmbeddingGemma](https://developers.googleblog.com/en/introducing-embeddinggemma/) (308M, <200 MB RAM, sub-15 ms on EdgeTPU) makes an embeddings→tiny-toxicity-head path trivially cheap. **Freshness note:** ML Kit's GenAI surface now advertises an **Embeddings API (text + image)** — not present in the August-2026 landscape snapshot — which lowers the build cost of the recommended classifier path and should be reflected in the snapshot.
2. **Competitive / regulatory shift (dated).** [Play Child-Safety/UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937) binds developers directly and is enforced by app removal (mandatory 19 Mar 2025; [expanded to anonymous/random-chat apps 26 Aug 2026](https://support.google.com/googleplay/android-developer/answer/9876714)). [EU DSA](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act) has applied to all hosting services since 17 Feb 2024; [UK Online Safety Act](https://www.ofcom.org.uk/online-safety/) illegal-content duties since 17 Mar 2025 and children's codes since 25 Jul 2025; [EU AI Act Art. 50](https://artificialintelligenceact.eu/article/50/) transparency obligations since 2 Aug 2026. This is genuine cost-of-delay with real dates, not manufactured urgency.
3. **Demand shift (2026).** The free default is being removed: Perspective's 31 Dec 2026 shutdown forces a re-selection event across its installed base precisely as the regulatory floor rises.

The why-now is strong and triangulated. The one honest caveat: *nothing mandates on-device specifically.* The on-device case rests on the GDPR/children's-data minimization interaction — a strong inference, not a quoted statute.

---

## The capability gap

Be exact about the boundary. The field splits four ways, and the gap sits cleanly between them:

- **Cloud managed APIs, full taxonomy, dev-callable, WTP proven** — OpenAI (free), Hive/Sightengine/Azure/AWS/WebPurify (paid). All require sending content off-device. ([OpenAI omni-moderation](https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/).)
- **On-device safety *models* you self-host** — [ShieldGemma](https://ai.google.dev/gemma/docs/shieldgemma) (smallest is 2B, ~2–3 GB live RAM → flagship-only), [Llama Guard 3-1B-INT4](https://arxiv.org/abs/2411.17713) (on-device-feasible but raw weights), [Detoxify](https://github.com/unitaryai/detoxify). Technically prove feasibility; no managed SDK, so the team owns all MLOps.
- **On-device guardrails bound to a generative model's *own* I/O** — ML Kit GenAI (AICore internal classifiers) and [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels) guardrails. These vet only what their own LLM reads/writes; they are not exposed as standalone classifiers and cannot score content the app already holds. Apple developer-forum threads through 2026 show developers explicitly asking for a way to moderate their *own* user content and not getting it.
- **One on-device, platform-managed classifier** — Android **SafetyCore / `ContentSafetyManager`** ([support.google.com](https://support.google.com/product-documentation/answer/16001929), [teardown](https://www.androidauthority.com/android-photo-picker-sensitive-content-warning-apk-teardown-3708303/)). Runs locally, results not shared with Google — the closest thing to the idea. **But** it is image sensitive-content/nudity-scoped, "in development," access-gated to approved apps, and surfaced as an Android platform API, not an ML Kit developer SDK. Being wired into the Photo Picker (Android 17 QPR2, Sep 2026) shows Google circling this space.

**ML Kit itself:** no moderation, toxicity, or content-classification API. GenAI surface is Summarization, Proofreading, Rewriting, Image Description, Prompt, Speech Recognition, and the newer Embeddings/speech-synthesis additions. Safety is framed as internal to AICore, with docs stating the developer is "solely responsible for the safety" of their app. *(Caveat: `developers.google.com` is not allow-listed in this session, so this negative is search-sourced across the GenAI overview and launch materials, not doc-fetched. Re-fetch the release notes once the host is allowed; this is the one load-bearing negative I could not verify at the primary source.)*

**The precise missing thing:** a first-class, managed, developer-callable **on-device** SDK — ML Kit `getClient()` ergonomics, Google maintaining the model and updates — that any rank-and-file Android dev calls to score arbitrary **user text (and non-CSAE image)** they already hold, across toxicity/harassment/sexual/violence/self-harm/spam, returning category scores, before it hits their backend. The main competitor a developer uses today is a cloud API (OpenAI/Perspective/Hive), not another platform.

---

## Proposed surface

Type G — a safety classifier. What it returns, how tunable it is, and where liability sits are the product.

```kotlin
// One Gradle line; no API key; no cloud round-trip.
val moderator = ContentModeration.getClient(
    ModerationOptions.Builder()
        .setCategories(TOXICITY, HARASSMENT, SEXUAL, VIOLENCE, SELF_HARM, SPAM)
        .setMinConfidence(0.0f)              // developer owns the threshold
        .build()
)

// Returns calibrated per-category scores, NOT a block/allow verdict.
val result: ModerationResult = moderator.classify(userText).await()
result.scores[HARASSMENT]        // e.g. 0.82
result.suggestedAction           // ALLOW / REVIEW / ESCALATE — advisory only
```

**Model class:** a quantized small encoder (DistilBERT/EmbeddingGemma-class, <100 MB binary, <200 MB RAM), *not* an LLM-guard — this is what buys wide reach. An optional high-end tier can route to an LLM-guard (ShieldGemma/Llama Guard via AICore) on eligible devices for the nuanced categories.

**What it deliberately does not do:** (1) it does **not** return a block/allow verdict — it returns calibrated scores and an advisory action, because the policy decision is the developer's differentiation and their liability; (2) it does **not** ship a freely callable on-device **CSAE/nudity** detector — that slice stays policy-gated and must route through the approved SafetyCore/`ContentSafetyManager` path, for the same abuse-surface reason face 1:N matching is withheld; (3) it is a **first-stage assistive filter**, not the sole decision-maker on high-stakes categories.

**TTFHW target: under 15 minutes.** Reachable: one Gradle dependency, no key, no new dangerous permission, model fetched on first use like other GenAI APIs. The binding design constraint is not integration — it's calibration (below).

---

## Reach & sizing

Inputs, each labelled; this is bottom-up off install tiers, not total-apps × an invented rate.

- `r_reach` = device eligibility: **~94.8%** at minSdk 26 ([apilevels.com](https://apilevels.com/), third-party, Statcounter-derived). The small-classifier path sacrifices almost nothing on reach — the central contrast with Nano's ~3.7% (Google: 140M+ Nano devices Apr 2026; percentage is my arithmetic against a ~3.8B third-party denominator).
- Addressable apps (meaningful scale + genuine UGC): **~10K (low) to ~120K (high)**, mid ~20K — anchored on ~67,563 apps above 1M installs (third-party, testerscommunity 2026), × a UGC-category fraction of ~15–30% (my coding: Social ~0.90, Dating ~0.95, Communication ~0.80, Entertainment/Lifestyle ~0.20, chat-gaming ~0.15).
- Install-weighted surface: dominated by a few hundred whale apps (Discord ~580M installs, Snapchat, Reddit, Telegram, Instagram/Threads, Tinder/Bumble/Hinge/Grindr, Twitch chat, Roblox) → **tens of billions of installs**. The install-weighted TAM is a few hundred whales + a ~10K–50K mid-market body, all reachable at API 26.
- `E_diy − E_int`: engineer-weeks saved. Honest and modest for blunt profanity (the borrow path is a few weeks); real for multilingual + obfuscation-robust + maintained-across-fleet (model sourcing, quantization, device testing, perpetual updates).

**Sensitivity.** The count-weighted range swings ~6× on whether you count the >50K tail or only >1M, and ~2× on the Entertainment/Games `p_job`. The **install-weighted** figure is far more robust — it's concentrated in a few hundred apps with public install badges. **The decision-relevant flip:** if the whale apps mostly keep their in-house/cloud moderation (they can afford it and want control), the real market is the ~10K–50K mid-market that can't, and the per-app value there is lower. That is the one experiment worth running before committing (see Kill criteria).

**Platform test:** engineering-cost-avoided is modest per app for the easy categories and concentrated in a mid-market that may not individually pay much — so this clears the platform bar on *compliance-floor + privacy*, not on raw engineer-weeks saved. That is why the verdict is Prototype, not Build.

---

## Adoption path

1. **The hook (15 min):** drop in `ContentModeration.getClient()`, score your existing message/bio field, see calibrated toxicity/harassment scores on a real mid-tier device with no key and no cloud bill. The win is "I'm Play-compliant and nothing left the device."
2. **First real integration:** replace the cloud moderation call (or the dying Perspective call) in the pre-send / pre-upload path with the on-device first-stage filter; keep a cloud escalation for the `REVIEW`/`ESCALATE` tail. What it replaces: a per-call bill and a data-transfer liability.
3. **The dependency:** calibrated thresholds tuned to their policy, an offline moderation path competitors can't match, and a compliance posture their legal team signed off on — all expensive to unwind in a way they'd endorse, not resent.

**First adopter:** a mid-market UGC app under acute pressure from the 26 Aug 2026 anonymous-chat Play expansion or the Perspective shutdown — a dating or random-chat app without a sophisticated in-house trust-and-safety stack. The second wave is the reference-implementation effect: one visible app ships "private on-device moderation" and the category follows.

---

## Execution plan

- **Developer preview** — answers: *does the small-classifier precision clear the embarrassment threshold on real partner UGC at real base rates?* Partners: 3–5 mid-market UGC apps. Evidence collected: production precision/recall per category, false-positive complaints, threshold settings developers actually pick. This is the S1/precision evidence the composite is short on.
- **Alpha/Beta** — graduates when a named partner runs it as their production first-stage filter for ≥90 days with a false-positive rate they tolerate in live UI, on mid-tier devices. Checkable, not a mood.
- **GA** — commit to a frozen category taxonomy and calibrated-score output **versioned independently of the model**, so a model refresh doesn't silently move every developer's thresholds. This is the output-stability contract that a durable Type-G API lives or dies on.

**Org dependencies, honestly:** the CSAE/nudity slice requires the **SafetyCore / `ContentSafetyManager`** team's approved-apps path — ML Kit cannot ship that openly and shouldn't try. And there is an unresolved ownership question (below). If the SafetyCore team says no, the product ships text-only + generic-NSFW and routes CSAE to their gate — which is the right design anyway.

---

## The case against

The strongest version, argued fairly. **Google's own revealed preference contradicts the idea.** The same event that is the sharpest why-now — Perspective's shutdown — is also the sharpest argument against: Google is *exiting* standalone moderation tooling, on the record, because "AI capabilities have evolved and there is now less demand for a standalone tool." A platform asking its ML Kit team to ship a standalone on-device moderation classifier is proposing to re-enter a market the same company just left, with the same stated thesis (the general model absorbs it) pointing the other way.

The live failure mode from the rubric's list is **#2, the platform absorbs the problem underneath you** — and here the absorber is Google's own roadmap twice over. On flagships, a developer can already prompt Gemini Nano via the ML Kit Prompt API with a safety system-instruction and get ~80% of toxicity classification for free (S5 = 3). On the gated image slice, SafetyCore/`ContentSafetyManager` is the platform's answer and it isn't ML Kit's. The dedicated classifier's defensible ground is narrow: the **mid-tier**, where no general on-device model runs and no SafetyCore text classifier exists.

The secondary risk is **#7, undifferentiated against a free substitute** (G1 soft): the borrow path (Detoxify + quantize) is genuinely cheap for blunt profanity, and cloud text moderation is free today. The classifier earns its keep only on the parts that are hard to borrow — multilingual robustness, obfuscation resistance, maintained calibration, and offline/privacy — and must be marketed there, not on price or on toxicity-scoring-as-capability.

**Mitigations (after the argument, not instead of it):** anchor on reach + compliance, not capability; ship scores + advisory actions, never verdicts, so precision-at-base-rate is the developer's tuning problem, not an embarrassment the platform owns; version the output schema independently of the model; and route CSAE to SafetyCore rather than pretending to own it. The honest shape of this is a **Prototype that exists to test one number** — production precision at real base rates — because if that number is bad, the first-stage-filter framing collapses and the idea is a shelve.

---

## Kill criteria

**The single observation that would reverse the recommendation:** in developer preview, if the small-classifier **false-positive rate at a partner's real base rate** (toxicity/CSAE are often <1–2% of content) is high enough that partners set thresholds so conservatively that recall collapses — i.e. it can't be both safe-enough and quiet-enough in live UI — the first-stage-filter value proposition fails and this becomes a shelve. Checkable test: ≥1 partner running it ≥90 days in production with a tolerated FP rate.

**Load-bearing assumption:** that the defensible market is the mid-tier/mid-market that can't run a general on-device model and can't afford a sophisticated in-house trust-and-safety stack — i.e. the whales keep their own moderation, and that's fine.

**Re-check trigger if shelved:** (a) EU DMA Art. 6(7) implementation (by 1 Aug 2027) forcing Alphabet to expose on-device AI models to third parties changes the privilege calculus; or (b) a general on-device model reaching the mid-tier fleet, which would *remove* the last defensible wedge and confirm the shelve.

---

## Fit for this team

Why ML Kit rather than SafetyCore, MediaPipe, or Firebase AI Logic? The **text** classifier fits ML Kit's charter precisely: a managed, maintained, task-shaped on-device SDK with `getClient()` ergonomics for a rank-and-file Android dev — exactly the gap between "self-host weights" (LiteRT/MediaPipe territory) and "cloud" (Firebase AI Logic). But the honest conclusion is a **split**: the gated **image/CSAE** slice belongs to **SafetyCore/`ContentSafetyManager`**, which already owns the approved-apps path and the Photo Picker integration. The biggest internal risk in this ecosystem is a capability landing in the wrong part of Google's stack and fragmenting the developer story further — so the right answer is ML Kit for text + generic-NSFW, SafetyCore for CSAE, one coherent story, not two overlapping classifiers.

---

## Open questions

- **Production precision at real base rates** — the number the whole verdict turns on. Settled only by developer preview on partner UGC.
- **Do the whale apps actually want this,** or do they keep in-house moderation for control? Settles whether the market is "few hundred whales + mid-market" or "mid-market only." Settle with 5 partner interviews before building.
- **ML Kit release notes, primary source** — the no-moderation-API negative is search-sourced; re-fetch once `developers.google.com` is allow-listed.
- **Is ML Kit / MediaPipe converging or diverging organizationally** — unresolved in public, and it decides who should even own this.
- **Reddit/SO/HN developer-voice** — blocked this run; the grassroots-pain signal is thinner than the structural ones until checked.

---

## Runners-up

- **On-device GenAI eval harness + token accounting (Type D)** — sharpest gap (ML Kit ships a prose "evaluate prompt quality" page with no code; Apple shipped an Evaluations framework), but demand is latent and not externally posted, so it scores worse on S1 (the heaviest weight). Lost on demand evidence, not on merit.
- **On-device neural TTS (Type A)** — pure whitespace and strong demand (Picovoice Orca; Apple shipped speech generation), but Type-A, feasibility/size risk on mid-tier, and the freshness check suggests ML Kit may have *just* added speech synthesis (verify). Possibly already closing.
- **One-line availability + fallback facade (Type C)** — real boilerplate every integrator writes, but risks being incidental (docs) rather than structural; lower "reader wouldn't reach it alone" value.
- **Output-stability contract across Nano refreshes (Type E)** — maximum platform privilege, but weak externally-verifiable demand (it's invisible until production) and no datable why-now. Failed on S1.

---

*Sources:*
- [ML Kit GenAI overview](https://developers.google.com/ml-kit/genai)
- [Perspective API (shutdown notice)](https://perspectiveapi.com/) · [post-mortem paper](https://arxiv.org/abs/2604.25580)
- [Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937) · [Child-safety expansion](https://support.google.com/googleplay/android-developer/answer/9876714)
- [Android SafetyCore / ContentSafetyManager](https://support.google.com/product-documentation/answer/16001929) · [Photo Picker teardown](https://www.androidauthority.com/android-photo-picker-sensitive-content-warning-apk-teardown-3708303/)
- [ShieldGemma](https://ai.google.dev/gemma/docs/shieldgemma) · [ShieldGemma 2 paper](https://arxiv.org/abs/2504.01081) · [Llama Guard 3-1B-INT4 paper](https://arxiv.org/abs/2411.17713)
- [EmbeddingGemma](https://developers.googleblog.com/en/introducing-embeddinggemma/) · [MLPerf Mobile](https://arxiv.org/abs/2012.02328)
- [Detoxify](https://github.com/unitaryai/detoxify) · [local_toxicity_guard](https://pub.dev/packages/local_toxicity_guard) · [Shieldstral LiteRT](https://huggingface.co/litert-community/Shieldstral-1.0-3B)
- [OpenAI omni-moderation](https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/) · [Hive](https://hivemoderation.com/) · [Sightengine pricing](https://sightengine.com/pricing) · [Azure AI Content Safety](https://azure.microsoft.com/en-us/pricing/details/content-safety/) · [AWS Comprehend toxicity](https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-comprehend-trust-safety-features/)
- [EU DSA](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act) · [UK Online Safety Act / Ofcom](https://www.ofcom.org.uk/online-safety/) · [EU AI Act Art. 50](https://artificialintelligenceact.eu/article/50/) · [GDPR Art. 5](https://gdpr-info.eu/art-5-gdpr/)
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels) · [Apple Communication Safety](https://support.apple.com/en-us/105069) · [Discord ML CSAM](https://discord.com/safety/how-discord-leverages-machine-learning-to-fight-csam)
- [apilevels.com](https://apilevels.com/)
