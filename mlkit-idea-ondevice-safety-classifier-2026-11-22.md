# On-Device Safety Signals — a tunable, multi-category content-safety classifier for ML Kit

**Type:** G — Trust, safety & compliance (reframed to C — Developer experience) · **Verdict: Shelve for ML Kit** · **Opportunity: 4/10 (already being absorbed)**
*2026-11-22 · Prepared for Android ML Kit · Evidence current as of 2026-11-22*

> *Badges: Strong demand · Real regulatory clock · Platform already shipping the substitute · Wrong team*

> A trust-and-safety engineer at a dating app spends this Tuesday wiring up Sightengine: user sends a photo, the app ships it to a cloud endpoint at $3 per thousand images, waits on a round trip, and prays the moderation call returns before the message does — all for content the user expected to stay private. They would rather classify it on the phone. The job is real, the per-call bill is real, and 21,000-odd Android apps have it. The twist this report exists to deliver: **Google already ships the pieces to do this on-device, and is building the OS-level version itself — just not in ML Kit.** That is why the honest answer is "don't build it here," not "here is the whitespace."

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | **4/10 — already being absorbed** | Composite math lands 3.45 (Prototype band), but the Platform-Privilege gate fails *for ML Kit* and the substitute half-life is a 1, so the honest headline is below the composite. Derivation in the note below. |
| Platform privilege (gate) | **2/5 — FAIL (for ML Kit)** | A competent team assembles on-device text+image moderation from Google's **own** shipped stack — [MediaPipe Decision Maker](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker) + [ShieldGemma](https://ai.google.dev/responsible/docs/safeguards/shieldgemma) open weights — while Android framework ships [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager). The genuine OS-level privilege sits with the SafetyCore team, not ML Kit. |
| Feasibility headroom (gate) | **5/5 — PASS** | One-shot encoder classification (~73 ms MobileBERT on mobile CPU, [arXiv 2004.02984](https://arxiv.org/abs/2004.02984)) in a few hundred MB, no Nano, no sustained-decode thermal failure. |
| Durability (gate) | **3/5 — pass, owner-dependent** | Regulatory tailwind makes the *capability* durable; output-stability of a safety classifier across model refreshes is unaddressed, and the durable owner is more plausibly Android framework than ML Kit. |
| Demand evidence (25%) | 5/5 | Four OSS re-impls with real traction + vendors charging per call + apps building their own; detail below. |
| Install-weighted reach (15%) | 5/5 | ~10–35% install-weighted at year 3; ~99.4% device eligibility at minSdk 24 (~27× the Nano base), survives halving soft assumptions. |
| Build-vs-buy-vs-borrow (20%) | 2/5 | The **borrow** path is strong and strengthening: ShieldGemma weights, MediaPipe Decision Maker, Bumble Private Detector, nsfwjs. Weeks, not months. |
| Integration cost / TTFHW (15%) | 4/5 | A turnkey ML Kit API *could* hit a 15-minute, one-Gradle-line, no-key hello-world — the single best argument for the idea. |
| Substitute half-life (15%) | 1/5 | Under 12 months: [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) is the OS-level substitute, shipping now, from Google's own roadmap. |
| Strategic complement (10%) | 3/5 | Safer UGC helps Android/Play trust and regulatory posture; also eases cross-platform moderation. Net helpful, not defended. |
| **Composite (gates-pass basis)** | **3.45** | Reported for completeness; the G1 failure and S5=1 govern the verdict, not this number. |

*Least trustworthy score: S3 (build-vs-buy). It hinges on how good MediaPipe Decision Maker actually is at labeled safety categories versus tool-routing, which Google has not benchmarked publicly — I rated the borrow path strong on its shipped existence, not on a measured safety F1.*

---

## The problem

A large consumer Android app with user-generated content runs a core loop — post, send, match, review — that leaks at exactly one point: the moment a user's text or image is about to reach other users or the app's own backend. There, the app owes a moderation decision. Today it buys that decision from the cloud. Hive charges [$3.00 per 1,000 images and $0.50 per 1,000 text records](https://thehive.ai/pricing); Sightengine charges [$29/mo for 10,000 operations then $0.002 each](https://sightengine.com/pricing); Azure AI Content Safety bills [per 1,000 text records and per 1,000 images](https://azure.microsoft.com/pricing/details/content-safety/). OpenAI's and Google's Perspective endpoints are free but still cloud — the content leaves the device, the call adds latency, and the key must be managed.

This is structurally produced, not accidental. Cloud inference cost scales linearly with DAU (Duolingo filed a ~400 bps gross-margin hit as "AI feature use expands," problem-atlas P3), so moderation — which runs on *every* message, not every AI feature — is the worst-shaped cost of all. Privacy forecloses the cloud on exactly the highest-value content: a dating app screening unsolicited nudes, a kids' app screening grooming, an encrypted messenger screening scams all want the classification to happen where the content already is. And the app's ML org is server-side (P12); asking their Android engineers to source, quantize, threshold-tune and maintain a safety model is the two-skills-in-one-head tax a platform is supposed to absorb.

The workaround today is bimodal: pay a cloud vendor per call, or hand-roll an on-device classifier. The cost of the workaround is the value an API would capture — and it is real. But "real cost" is a demand finding, not a platform-ownership finding, and that gap is where this idea comes apart.

---

## Proof & signals

Revealed demand is strong — a 5/5 on the rubric's most falsifiable axis.

- **Developers doing it by hand (OSS, with traction):** [nsfwjs](https://github.com/infinitered/nsfwjs) runs NSFW detection "all in the client's browser" and ships a React Native build that "loads a local copy of the model" — ~9.0k stars *[verified, fetched]*. [GantMan/nsfw_model](https://github.com/GantMan/nsfw_model) ~2.1k stars. [Bumble Private Detector](https://github.com/bumble-tech/private-detector), an EfficientNet nudity classifier open-sourced "to allow the wider community to use and finetune" their own — ~1.4k stars *[verified]*. [Detoxify](https://github.com/unitaryai/detoxify) ~1.3k stars *[verified]*. A fresh cluster of *offline* repos (e.g. [KOKOSde/localmod](https://github.com/KOKOSde/localmod), "fully offline content moderation API — free, self-hosted, and private") names the paid vendors as its reason to exist.
- **Someone charging money (the cloud cost an on-device API displaces):** Hive, Sightengine, Azure — per-call pricing above, all third-party-published.
- **Apps that shipped their own:** Bumble built Private Detector in-app (2019) and open-sourced it (2022). Meta quantized [Llama Guard 3-1B to ~440 MB to run on a commodity Android CPU](https://arxiv.org/abs/2411.17713). Meta reportedly ships WhatsApp "Scam Alert" with "no message content leav[ing] the device for classification" *[unverified — engineering.fb.com unreachable this session]*.
- **Community voice (verbatim, fetchable):** from the `nudity-detector` README explaining why he built an offline one — *"That's why every 'easy' option you found (Sightengine, Hive, AWS Rekognition) is paid."* ([source](https://github.com/arritgashi/nudity-detector)) *[verified, fetched]*. A verbatim Reddit/HN complaint could not be retrieved — those hosts were blocked this session.
- **The strongest signal is also the kill signal:** Google itself reads this demand and is acting on it — but at the OS layer. [Android SafetyCore](https://support.google.com/product-documentation/answer/16001929) already does on-device content classification "without sharing data with Google," and [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) is in the Android reference to expose that scan to third-party apps.

Distinguishing figures: all vendor pricing and OSS stars are third-party. SafetyCore's on-device/no-exfiltration claim is Google-published; the `ContentSafetyManager`-opening framing is Google's own reference docs plus third-party teardown reporting.

---

## Why now

Three dated shifts — the capability and competitive clocks are strong; the regulatory clock is real but must not be overclaimed.

1. **Capability shift (2025–2026):** small on-device classifiers crossed the embarrassment threshold for the common channels, and Google shipped the ingredients — [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/) (308M, <200MB at 4-bit, sub-20ms on edge accel, Sep 2025) and the [MediaPipe Decision Maker](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker) task that scores policy questions in a single forward pass.
2. **Competitive/regulatory shift (dated):** Apple shipped the on-device image channel years ago as [`SCSensitivityAnalyzer`](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer) (iOS 17). On the law: the **Texas App Store Accountability Act took effect Jan 1, 2026** and is live (the Fifth Circuit stayed the injunction), forcing *every* app to consume age signals and apply minor-differentiated behavior; the [EU AI Act Art. 50 marking duties](https://artificialintelligenceact.eu/transparency-rules-article-50/) landed **Aug 2, 2026**; the UK Online Safety Act illegal-harms duties went live **Mar 17, 2025** with Ofcom recommending proactive hash-matching. **Caveat the report must carry: none of these laws mandate *on-device* processing — they mandate the outcome.** On-device is the privacy-and-cost-preferred way to comply, not a legal requirement.
3. **Demand shift:** Google's own Play policy now tells developers, verbatim, to *"adopt filters and classifiers to block harmful inputs and outputs"* ([Play AI-generated-content policy](https://support.google.com/googleplay/android-developer/answer/14094294)) — recommending a control it does not package.

This is a strong why-now. It is also why Google is already building the answer — which is the problem.

---

## The capability gap

Be exact about the boundary, because the naive version of this report gets embarrassed here.

- **ML Kit:** no safety/moderation/toxicity/NSFW classifier. Natural-language APIs are language-ID, translation, smart reply, entity extraction only (confirmed against [ML Kit docs](https://developers.google.com/ml-kit/genai) and release notes). *True whitespace within ML Kit's own surface.*
- **MediaPipe:** the [Decision Maker](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker) task (shipped, Kotlin `com.google.mediapipe.tasks.decision`, EmbeddingGemma 2 270M) scores boolean/choice/rubric questions on-device in one pass and returns **calibrated per-category probabilities** — explicitly pitched for "guardrails," "policy checks," and "first-pass moderation on the client … without sending user content to a server." The shipped example is a tool router, not a safety classifier, but the primitive is there.
- **ShieldGemma:** Google's open-weight safety classifiers (text 2B/9B/27B; image 4B) covering sexual/dangerous/hate/harassment — a *model*, not a packaged API, and the smallest text size is heavy for mid-tier phones ([docs](https://ai.google.dev/responsible/docs/safeguards/shieldgemma)).
- **Android framework:** [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) (in development, API level 10000, access-restricted) returns allowed / warning / blocked / unclassified from on-device SafetyCore. Image/nudity-first, coarse 3-level verdict, not per-category severity, not text-tunable — *today*.
- **Apple:** [`SCSensitivityAnalyzer`](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer) — on-device, developer-callable, **nudity-only, image/video, no text, no severity, no CSAM**; the entitlement-gated license bars transmitting the result off-device.
- **CSAM:** not a learned-classifier problem — perceptual hash-matching against NCMEC/PhotoDNA lists that are legally withheld from non-vetted parties ([Tech Coalition](https://www.technologycoalition.org/)). Compute-trivial, access-impossible for a third party. This is the one genuine platform-only privilege — and a reason to scope CSAM *out* of any 3P API.

**The main competitor a developer uses today** is not another platform — it is a cloud vendor (Hive/Sightengine) *or*, increasingly, Google's own on-device stack assembled by hand.

So the snapshot's "whitespace #7 — standalone safety classifier" is now **stale**: Google moved into it via SafetyCore/`ContentSafetyManager` and MediaPipe Decision Maker. Flag it for the next landscape update.

---

## Proposed surface (and why it doesn't rescue the verdict)

If built despite the above, the only defensible shape is a **Type C developer-experience wrapper**, not a Type G new capability — a turnkey, labeled, tunable text-first classifier over the whole fleet:

```kotlin
val classifier = SafetySignals.textClient()               // one Gradle line, bundled ~few-MB model
val result = classifier.classify(userText)                // single forward pass, on-device
// result.scores: Map<SafetyCategory, Float>  — per-category severity 0..1
// categories: HARASSMENT, SEXUAL, VIOLENCE, SELF_HARM, SCAM
if (result.score(SELF_HARM) > app.selfHarmThreshold) { ... }  // app owns the threshold
```

What it must **not** do: return a verdict (apps' policies differ — the one-size-classifier death), promise CSAM (access-gated), or require Nano. The design constraint is a **15-minute hello-world** — one dependency, bundled small model, no key, no new permission. That is achievable, and it is the entire value proposition. But a 15-minute wrapper over a capability Google already ships in two other places is a *feature*, not a platform API — which is the finding, not a footnote.

---

## Reach & sizing

Install-weighted reach is genuinely large; the device story is the strong part.

- **A_cat** ≈ 39,000 serious (>50K-install) apps across Social/Communication/Dating/Entertainment/Education/Shopping *[third-party AppBrain estimate, table unfetchable — unverified]*.
- **p_job** ≈ 0.55 blended (dating ~1.0, social ~1.0, shopping ~0.4) → **SAM ≈ 21,000 UGC apps** *[my arithmetic]*.
- **r_reach** ≈ 0.994 at minSdk 24 ([apilevels.com](https://apilevels.com/), third-party, derived from Google) — a few-MB classifier ships bundled and runs in-process on essentially the whole Play-services fleet, **never touching the Nano RAM/NPU gate** that confines Gemini Nano to ~3.7%. That is a **~27× larger device base**.
- **c_ceiling** ≈ 20% (range 10–30%, analogue = a free Google-blessed safety SDK) → **SOM ≈ 4,200 apps at year 3**.
- **Install-weighted reach ≈ 10–35%** of the Android surface, because year-3 adopters skew to flagship UGC apps.

**Sensitivity:** halving the two softest inputs (p_job → 0.275, c_ceiling → 0.10) gives ~5–18% install-weighted — still multiples of the Nano base. The device-eligibility story is **insensitive to adoption assumptions** (pure minSdk math), which is its strength. Softest assumption: c_ceiling, no clean public analogue. **None of this rescues a Platform-Privilege failure** — a large market that a competent team can already serve from Google's own stack is a large market for *someone*, not a platform-API argument for ML Kit.

---

## Adoption path

1. **The hook:** the 15-minute win — drop in one dependency, classify a string, get per-category scores, no cloud bill. Plausible first adopter: a mid-size dating or Gen-Z social app already paying Sightengine and feeling the privacy pressure.
2. **First real integration:** replace the cloud moderation call on the send path for text; keep cloud for the hard cases.
3. **The dependency:** threshold-tuning and category coverage they would resent re-deriving.

The funnel starts. It just starts for a product that competes with MediaPipe Decision Maker on one side and `ContentSafetyManager` on the other — both Google's.

---

## Execution plan

- **Developer preview:** answers "do apps prefer a labeled turnkey classifier over assembling Decision Maker themselves?" Partners: 3–5 UGC apps currently paying a cloud vendor. Evidence collected: adoption friction, category-quality complaints.
- **Alpha→Beta graduation gate:** per-category precision/recall clears the embarrassment threshold on self-harm and scam (the subtle categories), not just toxicity — the one place small-model quality is unproven.
- **GA commitment:** a frozen per-category score contract versioned independently of the underlying model, so a model refresh doesn't silently move apps' thresholds.

**Org dependency, and it is fatal to ML Kit ownership:** this plan requires the Android framework / SafetyCore team to *not* ship the same thing — and they already are. An execution plan whose success depends on a sister team standing down is a wish.

---

## The case against

The strongest case against is not "it's hard" — feasibility is a 5. It is **the platform absorbed the problem underneath you** (failure mode #2 from the rubric), and it is happening in real time, twice.

First, horizontally: Google ships [ShieldGemma](https://ai.google.dev/responsible/docs/safeguards/shieldgemma) weights and the [MediaPipe Decision Maker](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker) task, so a competent Android team stands up on-device multi-category moderation in weeks from Google's *own* components — the build-vs-buy delta (S3=2) is small precisely because of this. Second, vertically: [`ContentSafetyManager`](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) is the OS-level version, from the team that actually holds the privilege (centrally-updated harm models, the trust boundary, the only path to CSAM hash access). An ML Kit safety API would be a thin wrapper competing with both, with a **sub-12-month substitute half-life** (S5=1).

The honest mitigation is not a mitigation — it is a redirect. There *is* a real gap `ContentSafetyManager` doesn't fill today (per-category *severity scores*, *text*-first, developer-*tunable* thresholds versus a coarse allowed/warning/blocked verdict). But that gap is a Type C packaging sliver that `ContentSafetyManager` will likely close as it productizes, and the right response is to put the gap on *that* team's roadmap, not to open a competing ML Kit surface.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if `ContentSafetyManager` ships to stable restricted to image/nudity with a coarse verdict **and** Google commits that it will not expose per-category text severity scores to third-party apps — then the text-DX sliver becomes a durable ML Kit opportunity and this flips to Prototype. Checkable at the next Android framework stable release.

**Load-bearing assumption:** that `ContentSafetyManager` + MediaPipe Decision Maker are the same capability most apps need, so an ML Kit API would be duplicative. If real apps find both unusable for text moderation in practice, the assumption breaks.

**Re-check trigger if shelved:** an Android framework decision to keep `ContentSafetyManager` image-only and verdict-only, or evidence that MediaPipe Decision Maker's safety-category quality is unshippable.

---

## Fit for this team

This is the decisive section. The capability is legitimate; **ML Kit is the wrong owner.** A content-safety classifier wants exactly what the Android framework / SafetyCore team already holds: a system-managed, centrally-updated model (harms evolve weekly — a static bundled classifier is a liability), the OS trust boundary, and the only lawful path to CSAM hash-matching. ML Kit's charter is task APIs over models it does not privilege; it has no structural advantage here and would fragment the story further by adding a fourth place (`ContentSafetyManager`, MediaPipe Decision Maker, ShieldGemma, *and* ML Kit) a developer must choose between. The more valuable conclusion than a weak territorial claim: **route the per-category-text-severity gap to the SafetyCore/Android-framework team as a `ContentSafetyManager` extension, and, if ML Kit does anything, ship only a thin DX convenience over MediaPipe Decision Maker — labeled as a sample, not a platform commitment.**

---

## Open questions

- **MediaPipe Decision Maker's safety-category quality.** Google publishes no safety F1/precision for it; the whole build-vs-buy verdict turns on whether it is actually good at labeled harm categories or only at tool-routing. *Settle by: benchmarking it on a public toxicity/self-harm set.*
- **`ContentSafetyManager`'s final scope and access model.** In-development, access-restricted, text-vs-image coverage unstated. *Settle by: tracking the Android framework stable release.*
- **Small-model quality on subtle categories.** Toxicity is solid; self-harm, scam and grooming are intent/context classification with thin on-device evidence. *Settle by: an internal eval on those specific categories.*
- **Whether any large app would adopt an ML Kit wrapper over Google's existing pieces.** *Settle by: the developer-preview partner interviews.*

---

## Runners-up

- **On-device neural TTS (Type A)** — strong whitespace (Google has no modern on-device TTS API; Picovoice charges; Apple shipped) and whole-fleet reach, lost because it is a single Type A and its feasibility/substitute gates needed the deeper look that this stronger-demand idea warranted first. *Strongest candidate for the next run.*
- **On-device eval + output-stability tooling for the Prompt API (Type D/E)** — Apple shipped Evaluations + token counting; ML Kit publishes a prose "evaluate prompt quality" page with no harness. Lost on thinner, mostly-cloud demand evidence (promptfoo-class prior art), but passes its gates cleanly.
- **GenAI capability-detection / fallback DX harness (Type C)** — every GenAI integrator rewrites the same `checkFeatureStatus` + `BUSY` + battery-quota + download-on-demand block. Lost on lower install-weighted reach (gated to the ~3.7% GenAI base) despite a clean Type-C privilege story.
- **On-device PII redaction before a cloud hop (Type G)** — timely with Firebase hybrid inference, lost because entity extraction already covers most of it and the privilege story is weaker than moderation's.

---

*Sources: [ML Kit GenAI](https://developers.google.com/ml-kit/genai) · [MediaPipe Decision Maker](https://developers.google.com/edge/mediapipe/solutions/decision/decision_maker) · [ShieldGemma](https://ai.google.dev/responsible/docs/safeguards/shieldgemma) · [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/) · [Android ContentSafetyManager](https://developer.android.com/reference/android/app/contentsafety/ContentSafetyManager) · [Android SafetyCore](https://support.google.com/product-documentation/answer/16001929) · [Apple SCSensitivityAnalyzer](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer) · [Play AI-content policy](https://support.google.com/googleplay/android-developer/answer/14094294) · [EU AI Act Art. 50](https://artificialintelligenceact.eu/transparency-rules-article-50/) · [Hive pricing](https://thehive.ai/pricing) · [Sightengine pricing](https://sightengine.com/pricing) · [Azure Content Safety pricing](https://azure.microsoft.com/pricing/details/content-safety/) · [nsfwjs](https://github.com/infinitered/nsfwjs) · [Bumble Private Detector](https://github.com/bumble-tech/private-detector) · [Detoxify](https://github.com/unitaryai/detoxify) · [Llama Guard 3-1B on-device](https://arxiv.org/abs/2411.17713) · [nudity-detector quote](https://github.com/arritgashi/nudity-detector) · [MobileBERT](https://arxiv.org/abs/2004.02984) · [apilevels.com](https://apilevels.com/)*
