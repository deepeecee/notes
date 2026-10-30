# ML Kit Content Safety — the classifier Google tells developers to adopt but doesn't ship

**Type:** G (Trust, safety & compliance), with a Type A new-capability shape · **Verdict:** Prototype / developer-preview · **Opportunity: 5/10 (Conditional)**
*2026-10-30 · Prepared for Android ML Kit · Evidence current as of 2026-10-30*

Badges: *Regulatory tailwind* · *Nobody ships it as a tunable API* · *Google already owns the models* · *Live substitute risk (Prompt API)*

> A developer at a dating or social app ships user-to-user photos and messages. Google Play's own policy holds them accountable for anything harmful their app serves and tells them to "adopt filters and classifiers" — but ML Kit ships none, so on a Tuesday they are wiring nsfwjs or Bumble's open-sourced classifier into a TFLite blob by hand, maintaining it as harms evolve, and still sending the highest-risk content to a cloud API they'd rather their E2E-encrypted product never touch. Google already trained the models for this (ShieldGemma, EmbeddingGemma) and ships them as raw weights with no API. No vendor — Google or Apple — offers a tunable, on-device, callable user-content moderation classifier.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 5/10 — Conditional | composite 3.5 × 2 = 7.0, −1 each for G1 and G2 at exactly 3 (= 5.0); S1 not a 5 so no bonus. Stated as derived. |
| Platform privilege (gate) | 3/5 — pass | Google owns ShieldGemma/EmbeddingGemma + AICore managed delivery + the Play liability anchor, but good OSS (nsfwjs, Llama Guard, Private Detector) exists and iterates faster. Rubric's literal "3." |
| Feasibility headroom (gate) | 3/5 — pass | Image CNNs fit easily (~tens of MB, F1 ~0.9); the *tunable multi-harm text* path at <few-hundred-MB is unproven (ShieldGemma 2B+ ~1–2.5 GB too big; EmbeddingGemma-308M + head is the only sub-200 MB route, turnkey evidence thin). |
| Durability (gate) | 4/5 — pass | Safety is a strategically central, regulation-backed commitment area; the gap vs 5 is a committed *versioned score-stability* contract across model refreshes. |
| Demand evidence (25%) | 4/5 | Bumble open-sourced a classifier; multiple OSS re-impls with traction; a vendor selling on-device moderation; Play policy demands it. First-person SO/Reddit/HN dev-voice unverified this session. |
| Install-weighted reach (15%) | 3/5 | UGC-heavy categories (social, messaging, dating, marketplace, kids, photo) carry high install weight, but the job isn't universal and the sizing is reconstructed (AppBrain/apilevels DNS-blocked this session). |
| Build-vs-buy-vs-borrow (20%) | 3/5 | DIY a tuned multi-harm on-device classifier = 3+ engineer-months + ML expertise; but the *borrow* path (Apache-2.0 nsfwjs/Private Detector, free Llama Guard) nearly wins for the common NSFW-image case, capping the delta. |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, `classify(text/image) → per-category scores`, no key; friction is first-use model download + a new policy/threshold surface. |
| Substitute half-life (15%) | 3/5 | The shipped Prompt API (system instructions + structured output, Jul 2026) can already be prompted to moderate — Google's own roadmap is the substitute. Calibrated, low-RAM, liability-anchored scores are the moat. |
| Strategic complement (10%) | 4/5 | Directly defends Play's largest liability surface and reduces Google's own regulatory/brand risk; modest switching cost via tuned policies. |
| **Composite** | **3.5** | Weighted mean of S1–S6. |

Least trustworthy score: **S2 (install-weighted reach)** — AppBrain and apilevels.com were DNS-blocked this session, so category install-weighting is reconstructed from WebSearch excerpts, not read off the live tables.

---

## The problem

The job is a product-team job under regulatory and brand pressure, not a feature wish. A consumer app that accepts user-generated content — a dating app with profile photos and DMs, a social or messaging app, a marketplace with listing images, a kids' app, a forum — is held accountable by Google Play for harmful content it serves, independent of who generated it. Play's AI-Generated Content policy states that "developers are responsible for ensuring that their generative AI apps do not generate offensive content," names "filters and classifiers that screen harmful inputs and outputs" as a recommended safeguard, and mandates in-app reporting of offensive output (Play policy, [answer/14094294](https://support.google.com/googleplay/android-developer/answer/14094294); announced Oct 2023; *policy confirmed, exact current wording via WebSearch summary — Google domains were not directly fetchable this session*).

What these teams do *instead* today: (a) call a cloud moderation API (Hive, OpenAI omni-moderation, Perspective, Azure AI Content Safety) — which forecloses the privacy posture of E2E-encrypted products and adds per-call cost that scales with DAU; (b) bolt a borrowed OSS model onto the client themselves; or (c) ship nothing and accept the policy risk. This is structurally produced, not an accident of tooling: the quality bar for safety at 100M-user scale is far above any benchmark number, the org is server-side (on-device moderation needs someone fluent in both modeling and Android runtime), and regulation lands in the client in many jurisdictions at once. Every UGC app solves the same problem identically and badly — the textbook definition of a platform problem (atlas P17, P18).

The precise gap is not "nobody can moderate content." It is that nobody offers a **tunable, pre-trained, on-device, callable classifier over arbitrary *app* content** — a thing the app calls on its users' text and images, branching on per-category scores it can threshold to its own policy, without the content leaving the device.

---

## Proof & signals

- **A platform built it and gave it away.** Bumble open-sourced **Private Detector**, an EfficientNet-v2 lewd-image classifier, "to help the tech community combat cyberflashing" — shipped in-app 2019, open-sourced Oct 2022 ([github.com/bumble-tech/private-detector](https://github.com/bumble-tech/private-detector), Apache-2.0, ~1.4k★ as read 2026-10-30; [The Register, 2022-10-31](https://www.theregister.com/2022/10/31/in_brief_ai/)). Open-sourcing a classifier *specifically for others to reuse* is the strongest demand signal available: it proves a major platform judged the gap worth filling and that no primitive existed. *Evidence status: repo fetched directly; blog via WebSearch (bumble.com not fetchable this session).*
- **Developers hand-roll it on Android specifically.** [nipunru/nsfw-detector-android](https://github.com/nipunru/nsfw-detector-android) bolts a custom TFLite model onto ML Kit's AutoML path — a developer using ML Kit as a carrier precisely because it ships no safety classifier. Flutter equivalents bundle models at ~17 MB APK cost ([flutter_nsfw_detector](https://pub.dev/packages/flutter_nsfw_detector), [nsfw_detector_flutter](https://pub.dev/packages/nsfw_detector_flutter)).
- **OSS re-implementations with real traction.** [nsfwjs](https://github.com/infinitered/nsfwjs) (client-side TF.js, ~7–9k★, five classes); [Detoxify](https://github.com/unitaryai/detoxify) (BERT/RoBERTa/ALBERT toxic-text, ~1.3k★ — note: *not* DistilBERT-based as sometimes claimed); Meta's Llama Guard family self-hosted as guardrails.
- **Someone sells on-device moderation as a service.** STRV markets on-device content moderation, claiming a custom model "smaller than 3 MB" ([strv.com](https://www.strv.com/blog/strv-now-offering-on-device-content-moderation-product-engineering)); Clarifai pitches client-side nudity checks explicitly at dating apps ([clarifai.com](https://clarifai.com/blog/how-to-check-user-generated-content-and-images-for-unwanted-nudity)). *Marketing, not independently verified.*
- **Academic validation that on-device NSFW works.** [arXiv:2107.11845](https://arxiv.org/abs/2107.11845) reports on-device NSFW image F1 0.91 (P 0.95 / R 0.88, ~0.002 false-positive rate on safe images).
- **The absence signal.** First-person developer threads (Stack Overflow, Reddit, HN) could not be retrieved this session (crawler-blocked / unresolvable), so that leg of the demand case is **unverified, not confirmed-empty** — a gap worth closing before committing.

---

## Why now

1. **Capability shift.** Small, tunable safety models matured. Google released **ShieldGemma** (text; 2B/9B/27B; four tunable harm categories; [arXiv:2407.21772](https://arxiv.org/abs/2407.21772)) and **ShieldGemma 2** (image; Gemma-3 4B; [arXiv:2504.01081](https://arxiv.org/abs/2504.01081)), and **EmbeddingGemma** (308M, sub-200 MB RAM with QAT; [arXiv:2509.20354](https://arxiv.org/abs/2509.20354), ~Sep 2025). The models for this exist; the API does not.
2. **Regulatory shift.** UK Online Safety Act 2023 illegal-content duties in force 2025-03-17 and children's-safety/age-assurance duties from 2025-07-25, with Ofcom actively enforcing; EU AI Act Article 50 transparency obligations from **2026-08-02**. US state app-store/minor-safety laws (Texas SB 2420, Utah SB 142, California AADC) are real but **contested** through 2026 (multiple injunctions and stays) — cite as a trend, not a clean date. *All regulatory dates via secondary legal-alert sources; primary statutes not opened.*
3. **Demand shift.** Google Play's own developer-accountability policy (Oct 2023) tells developers to adopt classifiers and mandates in-app reporting — Google is asking developers to do something it gives them no tool to do.

This is a genuine why-now, but note the honest weakness: the capability has existed for over a year and the regulation is partly in flux, so this is "correct and moderately urgent," not "urgent this quarter."

---

## The capability gap

Checked across the stack (*Google-domain checks via WebSearch summaries; direct fetch DNS-blocked this session*):

- **ML Kit:** no moderation classifier. The Oct 26, 2026 release added `genai-text-to-speech`, `genai-embedding`, and `genai-agent` alpha artifacts — **no `genai-safety`** ([ML Kit release notes](https://developers.google.com/ml-kit/release-notes)). *Note: this is newer than the August 2026 snapshot the skill carries — update it; TTS and embedding are now shipping alphas.*
- **MediaPipe:** Text Classifier and Image Classifier are generic bring-your-own-model tasks; the image classifier ships only scene/object architectures (MobileNet/EfficientNet-Lite). No pre-trained moderation model ([ai.google.dev/edge/mediapipe](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)).
- **AICore / Gemini Nano:** applies safety filters internally to gate its *own* model's input/output; exposes no callable classifier over arbitrary app content, no threshold tuning.
- **ShieldGemma / EmbeddingGemma:** Google's own safety and embedding models — shipped as **raw open weights, not an ML Kit/managed API** ([ShieldGemma card](https://ai.google.dev/gemma/docs/shieldgemma/model_card), [ShieldGemma 2 card](https://ai.google.dev/gemma/docs/shieldgemma/model_card_2)). Exactly the EmbeddingGemma-is-a-model-not-an-API pattern.
- **Apple:** Sensitive Content Analysis (`SCSensitivityAnalyzer`, iOS 17+) is on-device, platform-owned, and callable — but **nudity-centric, non-tunable (binary flag, no probabilities, no retraining), and results are locked on-device** by system policy ([developer.apple.com](https://developer.apple.com/documentation/sensitivecontentanalysis)). It is the closest thing anyone ships, and it is narrow.
- **Cloud vendors (Hive, OpenAI, Perspective/Jigsaw, Azure AI Content Safety, Rekognition):** feature-rich, but **cloud-only — no on-device mobile SDK**.

**The main competitor a developer uses today** is a cloud moderation API (Hive/OpenAI/Azure) or a borrowed OSS model (nsfwjs/Private Detector/Llama Guard) on the client. Apple's SCA is the only platform-owned on-device option and it exists only on iOS and only for nudity.

Net: **as of Oct 2026, no vendor ships a tunable, pre-trained, on-device, callable user-content moderation classifier as a first-class mobile developer API.** That is real whitespace, not a policy abstention (unlike face identity).

---

## Proposed surface

An ML Kit **Content Safety** API (candidate artifact `genai-safety`) wrapping Google's own safety models behind a managed, system-delivered classifier.

```kotlin
val classifier = ContentSafety.getClient(
  ContentSafetyOptions.builder()
    .setCategories(HATE, HARASSMENT, SEXUAL, DANGEROUS, VIOLENCE)
    .setThreshold(SEXUAL, 0.8f)          // per-category, tunable to the app's policy
    .build())

// text
val r: SafetyResult = classifier.classify("<user message>").await()
if (r.score(SEXUAL) > r.threshold(SEXUAL)) { /* app branches */ }

// image
val ri: SafetyResult = classifier.classify(bitmap).await()
```

- **Returns:** per-category calibrated scores (not a single binary flag — the thing Apple's SCA withholds), plus the model/score-contract version.
- **Model behind it:** text via EmbeddingGemma-308M + trained heads (sub-200 MB RAM path) or a distilled ShieldGemma; image via an EfficientNet/MobileNet-class classifier (ShieldGemma-2 distilled or a Private-Detector-class CNN). Delivered and shared via AICore/Play so apps don't each pay the model's RAM/APK cost.
- **Deliberately does NOT:** make the accept/block decision (the app owns its policy and threshold), send anything off device, or claim legal compliance — it returns signals; liability framing is explicit.
- **Device path:** built on *small* models and managed delivery, **not** Nano-gated — so it rides the ~96% API-26+ base, not the ~3.7% Nano fleet. This is the single most important design choice.
- **TTFHW target: <15 min** — one Gradle line, no API key, no new dangerous permission. What has to be true: the model downloads on first use (network once), and the default category set works without policy configuration. If it can only hit 15 minutes for the image path and the tunable multi-harm text path needs an afternoon, say so — that is a finding about scope.

---

## Reach & sizing

*Heavy caveat: AppBrain and apilevels.com were DNS-blocked this session; figures are reconstructed from WebSearch excerpts and are estimate-grade, third-party unless marked.*

- Classic/small-model ML Kit reaches **~96% of the GMS base at API 26+** ([apilevels.com snapshot, third-party](https://apilevels.com/)); ~70% at API 31+. A non-Nano design keeps reach near-universal — the 26× advantage over the ~3.7% Nano fleet (140M+ devices, Google, Apr 2026, against ~3.8B third-party actives → ~3.7%, my arithmetic).
- **p_job:** UGC-handling apps concentrate in Social, Dating, Communication, Photography, Marketplace, Kids, and Education. Install-weighted, these are among the highest categories — but the job is *not* universal (a flashlight or banking app has no UGC). A defensible install-weighted-relevant share is **~15–25%**, not >50%.
- **Engineering cost avoided (platform-test numerator):** a competent team doing a tuned, on-device, multi-harm classifier properly burns ~3+ engineer-months plus ongoing harm-taxonomy maintenance (E_diy high); integration of a one-line API is ~1 engineer-week (E_int low). The delta is real — *but discounted by the borrow path*: for the common NSFW-image case, a free Apache-2.0 model is a weekend, so the honest savings apply mainly to the tunable multi-harm scope.

**Sensitivity:** halve p_job (say only dating + the most exposed social apps truly adopt) and halve the adoption ceiling, and the verdict does **not** flip from Prototype — because the value is driven by a small number of very-high-install UGC apps plus the regulatory floor, not by broad adoption. If instead the Prompt API absorbs moderation (see case against), the verdict flips to Shelve. **The decision hinges on substitution, not on sizing** — so the experiment to run is a substitution test, not a market study.

---

## Adoption path

1. **The hook:** a dating or social app drops in the image classifier and ships pre-send nudity screening in an afternoon, replacing a cloud call and removing content from their egress path.
2. **First real integration:** they adopt the tunable text categories for DMs and user posts, branching on calibrated scores to their own policy, and cite it in their Play data-safety and T&S posture.
3. **The dependency:** tuned per-category thresholds and the on-device privacy guarantee become part of their compliance story; removing it means re-introducing cloud egress of user content — expensive in a way they'd endorse, not resent.

**First adopter:** a privacy-positioned messaging or dating app (the Bumble/Signal archetype) that already wants content off the cloud. **Second wave:** marketplaces and kids' apps driven by the regulatory floor. **Reference implementation** — one visible app doing on-device moderation well — is what starts the funnel.

---

## Execution plan

- **Developer preview:** ship the **image** classifier first (feasibility is a 5 here) with 3–5 UGC partners; question it answers — do calibrated per-category scores beat the binary OSS models enough to switch? Evidence collected: the missing first-person demand quotes and real threshold-tuning behavior.
- **Alpha/Beta:** add the tunable multi-harm **text** path on EmbeddingGemma-308M + heads; graduate only when the sub-200 MB combo demonstrably clears the embarrassment threshold on a p50 device — a checkable condition, not "make progress."
- **GA:** commit a **versioned score-stability contract** — thresholds must mean the same thing across model refreshes, or every update silently re-tunes every adopter's policy.
- **Org dependencies (named honestly):** the Gemma/ShieldGemma model team must agree to a distilled, redistributable, managed on-device variant; AICore must carry delivery; and a Trust & Safety owner must own the harm taxonomy. If the Gemma team says no to a sub-200 MB tunable variant, the text path does not exist and this collapses to an image-only API.

---

## The case against

The strongest argument against is **substitution by Google's own roadmap** (adoption failure mode #2, "the platform absorbed the problem underneath you"). The Prompt API already ships system instructions and structured output (Jul 2026); a developer can prompt Nano to "classify this for these harms, return JSON scores." If that is good enough, a dedicated classifier is redundant. The counter — and it is real but not decisive — is that the Prompt API is Nano-gated (~3.7%), slower, and returns uncalibrated, unstable judgments unsuitable for production T&S, where a consistent, thresholded, auditable score is the whole point. But this is the live risk, and it is why the verdict is Prototype, not Build: the preview exists to prove a calibrated classifier beats a prompt.

The second argument is the **G1 borrow problem**: for the most common case (NSFW image), free Apache-2.0 models already work, so the platform captures only the margin above them (calibration, tuning, managed delivery, liability anchor, the privacy of not shipping a model into every APK). That margin is real but thin for the easy case and fat only for the hard tunable-multi-harm case — exactly the case whose feasibility (G2) is least proven.

The third, from the idea-types G warning: **safety is each company's proprietary policy surface**, so a one-size classifier may be unusable. The mitigation is designed in — per-category tunable thresholds and app-owned decisions — but if real T&S teams need per-harm custom taxonomies the API can't express, it dies on contact with them. This is why developer-preview partners must be real T&S teams, not demo apps.

None of these is fatal; together they cap the honest opportunity at 5/10 and the verdict at Prototype.

---

## Kill criteria

**The single observation that would reverse this recommendation:** a developer-preview partner's T&S team demonstrates that prompting the (now shipping) Prompt API with a safety system-instruction and structured output reaches production-acceptable, stable moderation on their content — i.e. the Prompt API is the classifier. If that holds for two of five preview partners, shelve and fold the guidance into the Prompt API docs instead.

**Load-bearing assumption:** that a **tunable, multi-harm classifier can run in a single feature's RAM budget (<few hundred MB) at production quality** — the EmbeddingGemma-308M-plus-heads path. Turnkey evidence for that specific combination is thin and unverified; it is the thing to prototype first.

**Re-check trigger if shelved:** Google distilling ShieldGemma into a sub-200 MB on-device bundle, or a US state law surviving injunction with a hard client-side content-safety mandate and a date.

---

## Fit for this team

ML Kit is the right owner over MediaPipe, LiteRT, or Firebase AI Logic for one reason: **ML Kit is the sanctioned, managed front door to AICore and Google's on-device models**, and a safety classifier's value is in being *managed* — system-delivered (no per-app APK/RAM cost), versioned, and liability-anchored. MediaPipe's BYO-model path puts the model-sourcing and maintenance burden back on the developer, which is the exact problem. LiteRT is lower-level still. Firebase AI Logic hides availability behind silent cloud fallback — the opposite of an on-device privacy guarantee. If the organization decides the harm taxonomy belongs with the Gemma/Responsible-AI team instead, that is a legitimate conclusion — but the *developer surface* belongs in ML Kit.

---

## Open questions

- **First-person developer demand** (Stack Overflow / Reddit / HN threads) — blocked this session; retrieve to confirm the demand case's weakest leg. Settled by a re-run with those domains allowed.
- **Can EmbeddingGemma-308M + a trained head deliver a tunable multi-harm taxonomy at production quality on a p50 device?** — the load-bearing feasibility assumption. Settled by a prototype benchmark.
- **Exact install-weighting of UGC categories** — AppBrain/apilevels blocked; settled by reading the live %apps/%installs tables.
- **US state-law docket status** — fast-moving; settled by checking primary dockets, not legal alerts.
- **Will Google distill ShieldGemma for on-device, absorbing this as a model rather than an API?** — settled by the Gemma team's roadmap.

---

## Runners-up

- **Observable model-delivery state machine + SLO (Type E)** — *was this run's lead candidate; killed by freshness.* It was the single best-evidenced ML Kit pain for five years (tracker issues [#315](https://github.com/googlesamples/mlkit/issues/315) "keep the analyzer alive on UNAVAILABLE and hope," [#773](https://github.com/googlesamples/mlkit/issues/773) progress jumps straight to 1.0, [#760](https://github.com/googlesamples/mlkit/issues/760) a Googler conceding the signal is "not quite useful"). But between the Aug and Oct 2026 snapshots Google largely closed it — GenAI now has `FeatureStatus` + byte-level `DownloadCallback`; vision models got `ModuleInstallClient` progress; `RemoteModelManager.isModelDownloaded` exists. The surviving gap (no *progress* API for Android RemoteModelManager classic models — Translation, Entity Extraction) is a thin Type B that fails the build-vs-buy delta. A clean example of the "does it already ship?" gate working.
- **On-device neural TTS (Type A)** — *also overtaken by freshness:* `genai-text-to-speech 1.0.0-alpha1` shipped in the Oct 26, 2026 release (21 locales). No longer whitespace; at most a Type B extension now.
- **On-device evals + token accounting (Type D)** — Apple ships an Evaluations framework and token/usage reporting; ML Kit publishes a prose "evaluate prompt quality" page with no harness. Real gap, but G1 is weak (anyone can build an eval harness) and the shipping `genai-agent`/`genai-embedding` surface is moving fast. Worth a future run.
- **Deferred / opportunistic inference scheduling (Type E)** — "run this batch when charging, on wifi, idle" under the shared system model. Platform privilege is maximal, but demand evidence is weak (nobody hand-rolls what the quota system forbids), so S1 can't be sourced yet.

---

*Sources (accessed 2026-10-30; Google-domain and AppBrain/apilevels pages via WebSearch summaries because direct WebFetch of those domains was DNS-blocked this session):*

- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [Google Play AI-Generated Content policy (answer/14094294)](https://support.google.com/googleplay/android-developer/answer/14094294)
- [ShieldGemma model card](https://ai.google.dev/gemma/docs/shieldgemma/model_card) · [ShieldGemma 2 card](https://ai.google.dev/gemma/docs/shieldgemma/model_card_2) · [arXiv:2407.21772](https://arxiv.org/abs/2407.21772) · [arXiv:2504.01081](https://arxiv.org/abs/2504.01081)
- [EmbeddingGemma arXiv:2509.20354](https://arxiv.org/abs/2509.20354)
- [MediaPipe Text Classifier](https://ai.google.dev/edge/mediapipe/solutions/text/text_classifier)
- [Apple Sensitive Content Analysis](https://developer.apple.com/documentation/sensitivecontentanalysis) · [Apple Foundation Models `SystemLanguageModel`](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)
- [Bumble Private Detector (GitHub)](https://github.com/bumble-tech/private-detector) · [The Register, 2022-10-31](https://www.theregister.com/2022/10/31/in_brief_ai/)
- [nsfw-detector-android](https://github.com/nipunru/nsfw-detector-android) · [nsfwjs](https://github.com/infinitered/nsfwjs) · [Detoxify](https://github.com/unitaryai/detoxify) · [flutter_nsfw_detector](https://pub.dev/packages/flutter_nsfw_detector) · [nsfw_detector_flutter](https://pub.dev/packages/nsfw_detector_flutter)
- [On-Device Content Moderation, arXiv:2107.11845](https://arxiv.org/abs/2107.11845)
- [STRV on-device content moderation](https://www.strv.com/blog/strv-now-offering-on-device-content-moderation-product-engineering) · [Clarifai UGC nudity check](https://clarifai.com/blog/how-to-check-user-generated-content-and-images-for-unwanted-nudity)
- Cloud moderation vendors: [Hive](https://thehive.ai), [OpenAI omni-moderation](https://platform.openai.com/docs/guides/moderation), [Perspective API](https://perspectiveapi.com), [Azure AI Content Safety](https://learn.microsoft.com/azure/ai-services/content-safety/)
- ML Kit delivery-observability tracker issues: [#315](https://github.com/googlesamples/mlkit/issues/315) · [#773](https://github.com/googlesamples/mlkit/issues/773) · [#760](https://github.com/googlesamples/mlkit/issues/760) · [#829](https://github.com/googlesamples/mlkit/issues/829) · [Play for On-device AI](https://developer.android.com/google/play/on-device-ai) · [ModuleInstall APIs](https://developer.android.com/android/guides/module-install-apis)
- [apilevels.com](https://apilevels.com/) · [EU DMA Alphabet interoperability proceeding](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) (*checked; about AI-assistant interoperability, not moderation — not applicable*)
