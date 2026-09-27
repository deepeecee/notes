# On-device Content Safety API — the moderation classifier every UGC app rebuilds by hand, on the 96% of Android that Nano can't reach

**Type:** G — Trust, safety & compliance (with a Type F reach spine) · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (Prototype — real gap, short fuse)**
*2026-09-27 · Prepared for Android ML Kit · Evidence current as of 2026-09-27*

> An Android engineer at a mid-size marketplace app is wiring up comment posting on a Tuesday. Legal says every listing photo and message has to be screened before it hits the backend — Play policy requires it and the UK Online Safety Act now bites. There is no ML Kit call for this, so they do what nine thousand GitHub stars' worth of developers did before them: bolt on `open_nsfw_android`, hand-tune a threshold, and ship a cloud fallback to Hive at $3 per 1,000 images. The platform whose OS already runs a safety classifier inside AICore gave them nothing to call.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **6/10 — Prototype** | composite 3.25 × 2 = 6.5, −1 because two gates sit at exactly 3; S1 is a 4 not a 5 so no bonus |
| Platform privilege (gate) | 3/5 — pass | AICore already runs safety classifiers internally but exposes none ([Android AI docs](https://developer.android.com/ai/gemini-nano)); but strong OSS (open_nsfw, Detoxify, ShieldGemma weights) means a 3-person team can approximate it |
| Feasibility headroom (gate) | 4/5 — pass | dedicated small models (MobileBERT-class text ~28 MB, MobileNet/EfficientNet-Lite image 3–25 MB) run on 2018-era SoCs; huge headroom ([MediaPipe text classifier](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)) |
| Durability (gate) | 3/5 — pass | ML Kit surface is durable & on-device, but score-stability across model refreshes is unaddressed and "moderation" is a politically fraught charter |
| Demand evidence (25%) | 4/5 | paid market at $1–3/1,000 images ([Hive](https://thehive.ai/pricing), [AWS Rekognition](https://aws.amazon.com/rekognition/pricing/)); [nsfwjs 9k★](https://github.com/infinitered/nsfwjs), [open_nsfw_android 1.9k★](https://github.com/devzwy/open_nsfw_android); [Bumble Private Detector](https://github.com/bumble-tech/private-detector) precedent |
| Install-weighted reach (15%) | 3/5 | ~3,000 apps at yr3 (mid), but only ~1% install-weighted surface; concentrated in the largest UGC apps (my arithmetic on third-party inputs) |
| Build-vs-buy-vs-borrow (20%) | 3/5 | the **borrow** path (nsfwjs, Detoxify, open_nsfw_android) is free and mostly works — this caps the delta; the platform's value is maintenance + text+image + tuning, not novelty |
| Integration cost / TTFHW (15%) | 4/5 | can be one Gradle line, no API key, no dangerous permission, works in the emulator, like other ML Kit vision APIs |
| Substitute half-life (15%) | 2/5 | a general on-device model absorbs this as a prompt; Nano already classifies internally; Jigsaw is sunsetting Perspective *because* "AI capabilities have evolved" ([search-confirmed](https://www.perspectiveapi.com/)) |
| Strategic complement (10%) | 3/5 | directly helps devs meet Play's own UGC-moderation requirement, keeps trust on-device — but also helps cross-platform apps |
| **Composite** | **3.25** | weighted mean of S1–S6 |

*Least trustworthy score: install-weighted reach. AppBrain's per-category "50K+ installs" table and its ML-SDK %apps/%installs split were both egress-blocked this run, so the ~1% figure rests on a substituted 20% category-share prior and an 8× install-weighting multiplier, not the real crawl.*

---

## The problem

The job, stated as an engineer's job under a deadline: *before user content (a comment, a chat message, a marketplace photo, a profile picture) is stored or shown, decide whether it is unsafe, on the device, without a network round-trip.* The customer is an Android developer who is not an ML engineer; the competing solution is their own code plus a cloud bill.

This problem is structurally produced, not incidental. Google Play's UGC policy requires apps that host user content to provide reporting and to act on it, and the AI-Generated Content policy (effective 31 Jan 2024) additionally requires generative-AI apps to *prevent offensive output in advance* ([Play policy](https://support.google.com/googleplay/android-developer/answer/14094294)). Apple's Guideline 1.2 mandates a content filter, report mechanism, and 24-hour action ([App Store guidelines](https://developer.apple.com/app-store/review/guidelines/)). So every consumer app with UGC — and there are many — is *required* to moderate, while the platform ships no first-party tool to do it. The gap between "you must moderate" and "here is nothing to moderate with" is the opportunity.

What they do instead today, concretely: (1) call a **cloud** API — Hive at $3/1,000 images, AWS Rekognition at ~$1/1,000, Sightengine, WebPurify at $0.0015–0.0026/image, OpenAI's free multimodal endpoint — paying per-DAU, shipping user content off-device, and eating latency and offline gaps; or (2) **hand-roll** an on-device classifier from OSS: `open_nsfw_android` (an explicitly Android, on-device NSFW repo, 1,959★), `nsfwjs` (8,995★, still actively maintained in 2026), `Detoxify` for text (1,305★), or Bumble's open-sourced `Private Detector`. The cloud path's recurring cost and the hand-rolled path's maintenance burden are exactly what a platform API is priced against.

A 100M-install app feels this differently than a hobbyist: per-inference cloud cost multiplied by DAU is a real line item, sending user photos to a third party is a privacy and regulatory liability, and the app can't moderate when the user is offline. On-device moderation converts a variable cloud cost into a fixed, private, offline-capable primitive — for the class of apps that generate the most content.

---

## Proof & signals

- **Someone is charging money for it (strongest signal):** Hive Visual Moderation at **$3.00/1,000 images** ([pricing](https://thehive.ai/pricing)); Amazon Rekognition content moderation at **~$1/1,000 images** ([AWS pricing](https://aws.amazon.com/rekognition/pricing/)); WebPurify automated at **$0.0026/image**, human review at $0.02/photo ([WebPurify pricing](https://www.webpurify.com/image-moderation/pricing/)); Sightengine from **$29/mo for 10,000 ops** ([Sightengine pricing](https://sightengine.com/pricing)). A mature paid market at published per-call prices is willingness-to-pay for a capability the platform vacated. *All confirmed against 2026 pricing pages.*
- **Developers doing it by hand (OSS, with traction):** [`infinitered/nsfwjs`](https://github.com/infinitered/nsfwjs) — **8,995★**, last push 2026-08-04; [`devzwy/open_nsfw_android`](https://github.com/devzwy/open_nsfw_android) — an on-device Android/TensorFlow NSFW classifier, **1,959★**; [`notAI-tech/NudeNet`](https://github.com/notAI-tech/NudeNet) — 2,456★, pushed 2026-06; [`unitaryai/detoxify`](https://github.com/unitaryai/detoxify) — toxic-text, 1,305★, active 2026-07. *Star counts confirmed via GitHub search API.* The existence of an explicitly-Android on-device NSFW repo with ~2k stars is direct evidence developers want this offline and rebuild it themselves.
- **An app that shipped it and blogged the cost:** **Bumble open-sourced its "Private Detector"** (EfficientNet-v2, >98% accuracy, Apache-licensed) in October 2022, framed as "democratising access" so other platforms could fight cyberflashing ([TechCrunch](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/)). A production consumer app built exactly this, on-device, and gave it away — the clearest precedent there is.
- **Community voice:** recurring "Ask HN: recommend an NSFW content detection API" and "What do you use for content moderation of UGC?" threads; and a Feb-2026 "**Show HN: Built a free moderation API after failing to find one**" ([HN 46914190](https://news.ycombinator.com/item?id=46914190)) — a developer shipped a whole API because existing filters "flag innocent words like 'assistant' but miss toxic content." The title is the pain statement.
- **The absence signal:** steady-state complaint volume is *moderate*, not a flood. Read honestly, that means moderation is normalized as "a thing you pay a cloud vendor for" — the pain shows up as OSS self-integration and cloud invoices, not forum outrage. The louder signal is the absence of any first-class on-device option, not a wall of angry threads.

Demand-evidence strength: **4/5**. It falls short of 5 only because the specifically *on-device* framing is evidenced by OSS workarounds and one precedent rather than developers demanding an on-device SDK by name.

---

## Why now

Three parts, each dated — and I'll be honest that the on-device-specific timing is the weak leg.

1. **Capability shift (2024→2026):** small distilled classifiers crossed the "genuinely useful under 50 MB" line. Tiny-Toxic-Detector (2.1M params, ~8 MB) hits 86–91% on toxicity benchmarks ([arXiv 2409.02114](https://arxiv.org/abs/2409.02114)); MediaPipe ships a ~28 MB MobileBERT-class text classifier ([docs](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)); EmbeddingGemma (308M, <200 MB RAM) landed Sep 2025. The image side (MobileNet/EfficientNet-Lite) has been viable for years.
2. **Regulatory shift (Jul 2025 → Apr 2026 → Jan 2027):** UK Online Safety Act children's-safety duties in force 25 Jul 2025 ([Ofcom](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/statement-protecting-people-from-illegal-harms-online)); COPPA 2.0 compliance deadline 22 Apr 2026; a wave of US state age-appropriate-design codes effective 2026–27. App *developers*, not just very-large platforms, are now datedly accountable for content and minor safety across three major jurisdictions. **Caveat, stated plainly:** none of these require moderation to run *on-device* — cloud satisfies them equally. This is a why-now for moderation *tooling*, and only a circumstantial (privacy/cost/latency) pull toward on-device.
3. **Demand shift (Jan 2026):** Jigsaw is **sunsetting the Perspective API** — the standard free cloud text-moderation baseline — with service ending 31 Dec 2026 and no new sign-ups since Jan 2026 ([Perspective](https://www.perspectiveapi.com/)). That vacates the go-to free text option just as obligations tighten. But note the double edge: Jigsaw's stated reason is that "AI capabilities have evolved, and there is now less demand for a standalone tool" — the same force that opens the text gap is the substitute risk in S5.

A DMA tailwind sits behind all three: the EU's Art. 6(7) Alphabet decision (adopted 16 Jul 2026) requires Google to expose AICore on-device models to third parties in Android 18 by **1 Aug 2027** ([DMA case](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)). That is an interoperability order, not a moderation duty — but it makes system safety models something Google is being compelled to open anyway.

---

## The capability gap

Be exact about the boundary:

- **Google ML Kit** — no moderation, safety, or toxicity API. Image Labeling is a generic 400+-entity labeler, not a safety classifier ([ML Kit](https://developers.google.com/ml-kit)). *Confirmed 2026-09-27.*
- **MediaPipe Text Classifier** — a generic, **bring-your-own-model** classifier; ships a sentiment model, not a moderation model ([docs](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)).
- **AICore / Gemini Nano** — runs input/output safety classifiers **internally and does not expose them**; the docs put safety squarely on the developer ([Android AI](https://developer.android.com/ai/gemini-nano)).
- **Google Perspective / Checks** — cloud, and Perspective is being retired.
- **Apple Sensitive Content Analysis** — the one genuine on-device, third-party-callable moderation framework that ships. But it is **images/video only, nudity + (new in OS 27) gore/violence only, returns a boolean sensitivity flag not tunable category scores, and is iOS-only** ([Apple docs](https://developer.apple.com/documentation/sensitivecontentanalysis/detecting-nudity-in-media-and-providing-intervention-options)). It covers none of text, harassment, spam, or PII.
- **ShieldGemma / LlamaGuard** — downloadable *model weights*, not APIs; ShieldGemma-2 is 4B (too big for mid-tier), Llama Guard 3-1B-INT4 is 440 MB.

**The precise gap:** on mobile there is no on-device, first-class, cross-content (text + image), tunable, multi-category moderation classifier developer API. The market splits cleanly into turnkey-but-cloud (OpenAI, Hive, Rekognition, Azure) and on-device-but-raw (BYO models). Apple half-filled the image half on iOS; Android has nothing.

**The main competitor a developer uses today:** a cloud moderation API (Hive/Rekognition/Sightengine) or a hand-integrated OSS model — not another platform SDK.

**The non-obvious reframe** — the sentence a reader wouldn't reach alone: *moderation is mis-filed as a Gemini-Nano/GenAI feature, and that misfiling is why it doesn't exist.* Built on Nano, it inherits the ~3.7%-of-Android reach cliff and reads as a flagship demo. Built as a dedicated small classifier, it runs on **96.1% of Android (API 26+)** — making moderation one of the very few "AI safety" capabilities that is actually a *whole-fleet platform capability* rather than a flagship party trick. The reframe simultaneously flips its reach score and its feasibility.

---

## Proposed surface

A dedicated dual small-model API — **not** Nano-backed — in the ML Kit vision/NL family:

```kotlin
val moderator = ContentSafety.getClient(
    ContentSafetyOptions.Builder()
        .setCategories(HARASSMENT, SEXUAL, VIOLENCE, SELF_HARM, SPAM)
        .setThreshold(HARASSMENT, 0.8f)          // caller owns the policy
        .build()
)

// text
val result: SafetySignal = moderator.classifyText(comment).await()
// image
val imgResult: SafetySignal = moderator.classifyImage(inputImage).await()

when (result.action(SEXUAL)) {
    Action.WARN  -> showAreYouSureDialog()
    Action.BLUR  -> blur()
    Action.ALLOW -> post()
}
```

- **Inputs/outputs:** text string or `InputImage` in; per-category confidence scores out, plus a caller-configured `Action` (default **WARN/BLUR, never silent delete**). It returns *signals*, the app owns the *policy*.
- **Model class:** MobileBERT-class TFLite text classifier (~28 MB; MiniLM/DistilBERT INT8 for multilingual) + MobileNet/EfficientNet-Lite image classifier (3–25 MB, 224×224 INT8), fine-tuned on toxicity + NSFW + violence labels. No Gemini Nano dependency.
- **Device requirements:** API 26+; runs on sub-8 GB devices; NNAPI/GPU delegate optional.
- **What it deliberately does NOT do:** no autonomous takedown (quality caps it at pre-filter/warn/blur — see the case against), no CSAM hash-matching (that's a regulated, hash-database domain, not a classifier's job), no identity/face matching, no promise of legal compliance ("a tool, not a warranty").
- **TTFHW target: under 15 minutes** — one Gradle line, no API key, no new dangerous permission, bundled or on-demand model. Achievable because it mirrors the existing ML Kit vision integration pattern. The one thing that must be true: the default thresholds must be sane enough that hello-world works without tuning.

---

## Reach & sizing

*All arithmetic below is mine, on third-party inputs; AppBrain's crawl was egress-blocked this run, so read this as order-of-magnitude.*

- Serious-app base (>50K installs): ~157,000 apps [third-party estimate, flagged].
- UGC-heavy categories ≈ 20% → **A_cat ≈ 31,400 apps**.
- **p_job** (fraction with real UGC that would moderate) = 0.40 → **SAM ≈ 12,600 apps** (range 7,000–20,000).
- Device eligibility at API 26+ = **96.1%** ([apilevels.com](https://apilevels.com/)) — a near-non-issue; a 21% haircut only if you gate to API 31.
- 3-yr adoption penetration = 25% → **SOM ≈ 3,000 apps** (range 1,000–6,600). Cross-check: a mature specialized on-device ML SDK reaches ~1–2% of all apps (21k–43k) — SOM sits well under that ceiling, so it isn't overreaching.
- **Install-weighted reach ≈ 0.4%–2.5% of the Android surface (mid ~1%)**, applying an ~8× install-weighting multiplier — because moderation demand concentrates in the 142 billion-install and 1,255 hundred-million-install apps. Landing a handful of marquee UGC apps dominates the figure.
- **Engineering cost avoided:** each adopter saves the multi-week build + perpetual maintenance of a hand-rolled text+image classifier (bottom-up from the OSS repos' commit/issue history) minus a ~1-day integration. Across ~3,000 apps this clears the platform test, though not by the wide margin a higher-reach idea would.

**Sensitivity:** halve both soft assumptions (p_job 0.40→0.20, adoption 0.25→0.125) and SOM falls ~75% to ~750 apps, install-weighted reach to ~0.28%. The estimate is roughly quadratically sensitive to these two, so the honest read is a **0.1%–0.6% floor / ~2.5% ceiling** band. The verdict (Prototype, not Build) survives the downside — and would not have flipped to Build even on the upside, because reach isn't the binding constraint; substitute half-life is.

---

## Adoption path

1. **The hook (15 min):** a dating or marketplace dev drops in `classifyImage` to blur unsolicited nudes before send — the Bumble use case, now one Gradle line instead of a fine-tuned EfficientNet.
2. **First real integration:** they replace their cloud moderation call on the *pre-filter* stage (screen on-device, escalate only ambiguous cases to their server or a human), cutting cloud spend and keeping clean content fully private.
3. **The dependency:** once thresholds are tuned to their community and the warn/blur UX is wired into their posting flow, ripping it out means re-integrating a cloud vendor and re-adding per-DAU cost — a switching cost they'd endorse, not resent.

**First adopter:** a mid-size dating or C2C-marketplace app (cyberflashing and listing-photo abuse are acute, cloud cost stings, and offline moderation matters). **Second wave:** messaging and social apps once one visible app ships it and blogs the cost saving — platform APIs spread by reference implementation.

---

## Execution plan

- **Developer preview:** ship text + image classifiers with sane defaults to 3–5 design partners (a dating app, a marketplace, a kids-adjacent app). Question it answers: *do developers accept on-device scores good enough for warn/blur but not autonomous action?* Evidence collected: real false-positive tolerance and threshold behavior in production.
- **Alpha→Beta graduation condition:** partners keep it in the pre-filter path for 90 days without reverting to cloud-only, and the false-positive rate on their real content stays below their support threshold.
- **GA:** commit to a frozen category taxonomy and — critically — a **score-stability contract** across model refreshes (scores versioned independently of the model), because a moderation classifier whose scores drift silently breaks every caller's tuned thresholds.
- **Org dependencies, honestly:** the AICore/Nano team owns the internal safety models; if this must reuse them, that team has to say yes, and if they won't, the dedicated-small-model path (recommended anyway for reach) sidesteps them. A Trust & Safety / legal sign-off on the "tool not warranty" liability framing is a hard gate — without it, this doesn't ship.

---

## The case against

The strongest argument against, made properly: **the platform will absorb this underneath you, and soon.** A general on-device model already classifies safety as a side effect — AICore runs exactly these filters internally, and "is this text harassing? return a score" is a one-line prompt to Nano/Gemma. Jigsaw retired Perspective with the explicit reasoning that "AI capabilities have evolved, and there is now less demand for a standalone tool." That is the substitute risk stated by the incumbent itself. Ship a dedicated moderation classifier and there is a real chance it is redundant within 18–24 months as the general on-device model does 80% of it for free — the classic "the platform absorbed the problem underneath you" failure mode, and here the platform is *your own roadmap*.

The second argument: **the borrow path is good enough.** `nsfwjs`, `open_nsfw_android`, and `Detoxify` are free, MIT/Apache, and mostly work; a competent team wires one in over a few weeks. A platform API has to beat *free-and-mostly-working*, and its edge is only maintenance-against-evolving-abuse plus the text+image unification — a real but not overwhelming delta (hence S3 = 3).

The third, subtler one: **safety is each company's policy surface.** A one-size classifier may be unusable for a team with its own nuanced policy; if the tunability story is weak, it dies on contact with their T&S team.

Mitigations, after the argument: the absorption risk is precisely why the verdict is *developer-preview to collect evidence and move fast*, not a five-year Build — you ship the reach-and-ergonomics version now, while the general-model path is still gated to 3.7% of the fleet, and you win the 96% it can't reach. The borrow risk is answered by owning maintenance and bundling to near-zero APK cost. The policy risk is answered by returning scores + caller-owned actions, never verdicts. But none of these fully retire the S5 threat, which is why S5 is a 2.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if ML Kit's own Prompt API (or a Gemma small model) ships a documented, first-party "classify this content for safety" path that runs below ~8 GB RAM — i.e. the general-model substitute arrives on the broad fleet — before this reaches beta. Check at each I/O and each ML Kit release-notes update. If it lands, this collapses from "new API" to "sample code on top of Prompt."

**Load-bearing assumption:** that a dedicated small classifier's quality is good enough for warn/blur/pre-filter adoption at scale. If real-world false-positive rates on partner content prove unusable even for warn (the UnsafeBench-style 20–48% FP on artistic/edge images is the warning sign), the whole thing is a demo.

**Re-check trigger if shelved:** a regulator anywhere mandating *on-device* (not merely *any*) moderation, or a partner showing the cloud-cost saving is large enough to pull adoption on its own.

---

## Fit for this team

ML Kit is the right owner *if* it's built as a dedicated classifier in the vision/NL family — that's ML Kit's core competency (turnkey, on-device, whole-fleet task APIs), and moderation is a task API, not a GenAI feature. It is the **wrong** fit if forced onto the Prompt API / Nano path, where it inherits the reach cliff and belongs to the AICore team. If the org decides safety must live with the model, then this is an AICore/Firebase AI Logic story, not ML Kit — and that's a legitimate conclusion. The internal risk to name: with MediaPipe already owning BYO text/image classification, this could fragment further unless ML Kit and MediaPipe agree on who owns the pre-trained-safety-model surface.

---

## Open questions

- **Real false-positive rates on partner content**, not benchmarks — the load-bearing quality question. Settled by a developer-preview measurement.
- **Whether AICore's internal safety models can be exposed** as a maintained public classifier, or whether legal/policy blocks it — settled by an internal conversation with the AICore team.
- **The true install-weighted reach** — settled by rendering AppBrain's per-category "50K+ installs" table and its ML-SDK %apps/%installs split, both blocked this run.
- **Whether the DMA Art. 6(7) exposure obligation (Aug 2027) will be read to cover a safety classifier** — settled by the final Commission specification text.
- **Multilingual coverage floor** — a moderation API that only works in English is a non-starter for global UGC apps; what's the smallest multilingual model that clears the embarrassment threshold?

---

## Runners-up

Five ideas were on the slate this run; the moderation classifier beat them because it pairs the strongest paid-demand evidence with a clean, checkable whitespace and whole-fleet feasibility.

- **On-device eval / quality-measurement tooling (Type D)** — Apple shipped an Evaluations framework + token accounting; ML Kit ships a prose "evaluate prompt quality" page with no harness behind it. Sharp, checkable gap and fast to build, but demand evidence for *on-device* eval specifically is thinner than for moderation (weaker S1). Strong second choice.
- **Structured document understanding — tables/forms/key-value (Type B)** — Apple already shipped `RecognizeDocumentsRequest`; ML Kit text recognition returns only blocks/lines. Clear demand (banking, expense, health) but the insight is "catch up to Apple," which is less generative than a genuine whitespace.
- **On-device neural TTS developer API (Type A)** — real whitespace (Picovoice's Orca sells into it; Apple added speech generation; Android's `TextToSpeech` is a decade-old parametric API), but higher model-sourcing/privilege risk and a narrower per-app job than moderation.
- **A sub-8 GB reach/tiering path for GenAI (Type F)** — addresses the defining 26× reach gap directly, but partly absorbed by Firebase AI Logic's existing `PREFER_ON_DEVICE`/cloud routing, which softens the whitespace.
- **On-device speaker diarization / speaker ID (Type A)** — clean whitespace (Picovoice sells Falcon/Eagle; nobody ships it first-party), but narrower install-weighted reach, concentrated in meeting/notes/podcast apps.

---

*Sources:*
- [ML Kit](https://developers.google.com/ml-kit) · [ML Kit GenAI](https://developers.google.com/ml-kit/genai) · [MediaPipe Text Classifier](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier) · [Android Gemini Nano / AICore](https://developer.android.com/ai/gemini-nano)
- [Apple Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis/detecting-nudity-in-media-and-providing-intervention-options) · [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Apple child-safety newsroom](https://www.apple.com/newsroom/2026/06/apple-previews-new-child-safety-features/)
- [ShieldGemma 2 model card](https://ai.google.dev/gemma/docs/shieldgemma/model_card_2) · [Llama protections](https://www.llama.com/llama-protections/) · [Tiny-Toxic-Detector arXiv](https://arxiv.org/abs/2409.02114) · [Llama Guard 3-1B-INT4 arXiv](https://arxiv.org/abs/2411.17713)
- [Hive pricing](https://thehive.ai/pricing) · [AWS Rekognition pricing](https://aws.amazon.com/rekognition/pricing/) · [WebPurify pricing](https://www.webpurify.com/image-moderation/pricing/) · [Sightengine pricing](https://sightengine.com/pricing) · [OpenAI moderation](https://help.openai.com/en/articles/4936833)
- [nsfwjs](https://github.com/infinitered/nsfwjs) · [open_nsfw_android](https://github.com/devzwy/open_nsfw_android) · [NudeNet](https://github.com/notAI-tech/NudeNet) · [Detoxify](https://github.com/unitaryai/detoxify) · [Bumble Private Detector](https://github.com/bumble-tech/private-detector) · [TechCrunch on Bumble](https://techcrunch.com/2022/10/24/bumble-open-sourced-its-ai-that-detects-unsolicited-nudes/) · [Show HN 46914190](https://news.ycombinator.com/item?id=46914190)
- [Perspective API](https://www.perspectiveapi.com/) · [Play UGC/AI-content policy](https://support.google.com/googleplay/android-developer/answer/14094294) · [Ofcom OSA statement](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/statement-protecting-people-from-illegal-harms-online) · [EU DMA Alphabet case](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
- [apilevels.com](https://apilevels.com/) · [UnsafeBench arXiv](https://arxiv.org/pdf/2405.03486)
