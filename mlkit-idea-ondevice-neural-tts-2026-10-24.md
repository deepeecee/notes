# On-device neural TTS — the one GenAI capability ML Kit can give the whole fleet, not the flagships

**Type:** A (new capability API), argued as a Type F (reach) play · **Verdict:** Prototype / developer-preview · **Opportunity: 6/10 (strong capability, contested moat)**
*2026-10-24 · Prepared for Android ML Kit · Evidence current as of 2026-10-24*

> On a Tuesday a reading-app engineer wires up "listen to this chapter." The platform option is `android.speech.tts.TextToSpeech` — a 2011 engine-abstraction whose best voices need a network and whose chosen voice silently falls back to a robotic default. So they pull a 330 MB Kokoro model into ONNX Runtime, hand-write a sentence-ahead streaming layer because the model returns audio in whole chunks, add an AAC "cruise mode" so it doesn't cook the battery, and port a smaller model as a fallback for old phones. That is two-to-three months of weekend work, and a builder described exactly this on Hacker News in April 2026. ML Kit ships no on-device neural voice at all — and the models to do it now fit in ~80 MB and run on ~98% of the Android fleet, against Gemini Nano's ~3.7%.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 6/10 — Prototype | composite 3.65 × 2 = 7.3, −1 for a gate at exactly 3 (G1), no S1=5 bonus → ~6.3, reported 6 |
| Platform privilege (gate) | 3/5 — pass (weak) | A competent team ships this on free [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) + Kokoro today; platform privilege lives in *managed delivery, watermarking, and curated voices*, not the raw model |
| Feasibility headroom (gate) | 5/5 — pass | Piper ~20–63 MB RTF ~0.17 and Kokoro-82M int8 ~82 MB near-realtime, CPU-only, ~200–400 MB RAM on mid-tier — far below Nano's ~12 GB floor |
| Durability (gate) | 4/5 — pass | Surface is text-in/audio-out: no structured-output drift to break on model refresh; main risk is organizational (which Google team owns it) |
| Demand evidence (25%) | 4/5 | Picovoice *charges* for on-device TTS; ElevenLabs cloud bill $0.05–0.10/1K chars; sherpa-onnx 15.5k★ active; Kokoro ecosystem thousands of stars; verbatim builders hand-rolling it |
| Install-weighted reach (15%) | 4/5 | ~5–6% install-weighted SOM across 3+ categories, on a device class (API 26+, ~98%) that exists in enormous volume — the eligibility intersection is maximal |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The **borrow** path (sherpa-onnx + Kokoro/Piper) is free and already runs on Android; the platform's savings are delivery, QA, and maintaining models OSS abandons (Piper is archived) |
| Integration cost / TTFHW (15%) | 4/5 | One Gradle line, no API key, no dangerous permission, emulator-capable; the single friction is model delivery (APK size vs first-use download) |
| Substitute half-life (15%) | 3/5 | 2–3 years: Firebase AI Logic already ships *cloud* Gemini TTS, and Google's own Nano could add audio out — the offline/free/private case is what persists |
| Strategic complement (10%) | 4/5 | Commoditizes a complement (voice output) that drives Android engagement, accessibility compliance, and offline reach in growth markets; clears the platform test |
| **Composite** | **3.65** | Weighted mean of S1–S6 |

*Least trustworthy line in this table:* install-weighted reach (S2). The device-eligibility number (~98%) is Google-origin data relayed by third parties; the adopting-app share (~5–6%) rests on AppBrain ratios and my own `p_job` and ceiling estimates, because the AppBrain category tables could not be opened directly this run.

---

## The problem

The job is small and relentless: *"let the user hear this text, in a voice that doesn't embarrass the brand, without a network and without a per-character cloud bill."* It belongs to reading and reference apps (ebooks, dictionaries, scripture), news apps ("listen to this article"), navigation (turn-by-turn), language-learning, and accessibility tools. What they do instead today is one of three bad options, and naming the workaround prices the API.

Option one is `android.speech.tts.TextToSpeech`, the platform's own 2011-era engine-abstraction API. It plays an utterance; it does not expose a modern neural voice as a developer surface, its highest-quality voices require a connection, and — per a long-standing Stack Overflow thread (#51510129) — it returns *success* even when the requested voice isn't installed, so your voice silently degrades to a robotic default. Option two is a cloud TTS API — ElevenLabs at [$0.05–0.10 per 1,000 characters](https://elevenlabs.io/pricing/api), or Google's own Cloud / Firebase TTS — which is a recurring bill that scales linearly with DAU (the margin pattern the problem atlas documents at Duolingo) and, fatally for privacy-sensitive content, ships the user's text off-device. Option three is to hand-roll an on-device model, which is where the real signal lives: builders are importing Kokoro-82M or Piper via ONNX Runtime and writing their own streaming, battery, and fallback layers.

This is structurally produced, not an accident of tooling. A 100M-install app operates under a fleet that is overwhelmingly *not* flagship (P1: Nano reaches ~3.7%), a large share of users who are offline or on constrained networks (P13: Google's own figure is that more than half of Indian and Indonesian users have no wifi), cloud cost that scales with engagement (P3), and a size budget where every 6 MB of APK costs ~1% of install conversion (P4). Voice output collides with all four at once: it's wanted broadly, needed offline, expensive in the cloud, and heavy if bundled naively. A capability sitting at that intersection is exactly where a platform earns its keep — *if* it can offer something the free OSS path can't.

---

## Proof & signals

- **Someone charging money for it.** [Picovoice Orca](https://picovoice.ai/products/voice/streaming-text-to-speech/) is a packaged on-device streaming neural TTS SDK with native Android (`ai.picovoice:orca-android`) and iOS bindings, "commercial license only," 8 languages, ~41 MB peak RAM, ~106 ms first-token latency (vendor figures). It explicitly [positions against ElevenLabs and Amazon Polly](https://picovoice.ai/elevenlabs-pricing/) as the on-device replacement. A vendor selling exactly this is the strongest single demand signal available. *Confirmed via search; Orca's list price is not public.*
- **The cloud bill it would vacate.** ElevenLabs at [$0.05–0.10/1K chars](https://elevenlabs.io/pricing/api) is a flat per-character rate across tiers — a recurring cost an on-device path erases. *Confirmed, official page.*
- **Developers doing it by hand (OSS, forks excluded, stars>50):** [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 15,480★, pushed 2026-10-24 — the reference offline on-device speech stack, very active; [rhasspy/piper](https://github.com/rhasspy/piper) 11,307★ but **archived** since 2025-08-26; [coqui-ai/TTS](https://github.com/coqui-ai/TTS) 46,135★ but dead since 2024-08-16; the Kokoro-82M ecosystem — [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) 2,806★, [nazdridoy/kokoro-tts](https://github.com/nazdridoy/kokoro-tts) 1,958★, [Kokoros](https://github.com/lucasjinreal/Kokoros) 832★ — all pushed within the last two months. A developer even wrapped sherpa-onnx into React Native "because no offline TTS exists out of the box." *Exact counts via authenticated GitHub.*
- **Community voice (verbatim).** A reader-app builder on HN: *"Piper is also dead, though it's also still the best option for local TTS on low-end [hardware]"* ([43591241](https://news.ycombinator.com/item?id=43591241), Mar 2025). Another, shipping an on-device TTS app because he *"ran out of audiobooks on a flight,"* describes building the sentence-ahead streaming layer himself because Kokoro returns audio per-chunk ([47780234](https://news.ycombinator.com/item?id=47780234), Apr 2026). *HN text confirmed; engagement counts not retrievable this run.*
- **The absence signal — read it honestly.** Two of the three most-referenced local neural TTS engines are abandoned (Piper archived, Coqui dead), and developers keep building on them anyway (piper-plus, paroli forks) — a vacuum, not satiation. But the sharpest hand-rolling sits on **iOS, browser/WebGPU, and cross-platform wrappers, not Android-native Kotlin**, and the r/androiddev channel was unreachable. So the pain is proven for on-device TTS in general; the *Android-specific* chorus is thinner than the overall demand predicts. That gap is a reason to developer-preview, not to assume.

---

## Why now

1. **Capability shift (2025).** The small-neural-TTS frontier crossed the ship bar. Kokoro-82M (StyleTTS2-based, ~82 MB int8) tops open-model TTS arenas (Artificial Analysis Elo ~1057) and runs near-realtime on mid-tier CPUs; Piper runs faster-than-realtime on budget ARM. Before ~2024 this quality did not fit in ~80 MB.
2. **Competitive shift (June 2026).** At WWDC26 Apple said its second-generation on-device Foundation Model can *"understand and generate speech"*; Personal Voice has shipped on-device neural TTS (user's own cloned voice) since iOS 17 (2023). Apple has publicly planted a flag on on-device speech generation; Google has announced no modern neural on-device TTS developer API. *Honest caveat: Apple's own developer-facing speech-generation API is itself unconfirmed ([open dev-forum question](https://developer.apple.com/forums/thread/832868)) — the gap is real but "API parity" is unproven on both sides.*
3. **Regulatory shift (2025–2026).** The [European Accessibility Act](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0882) applies from 28 June 2025 and makes text-to-speech an in-scope requirement for e-book reading systems and a multi-sensory-channel tailwind for content apps — though **not** a blanket "every app must read aloud" mandate, so don't overclaim it. Separately, [EU AI Act Article 50](https://artificialintelligenceact.eu/transparency-rules-article-50/) (in force 2 Aug 2026) requires synthetic audio to be machine-readable-marked as AI-generated, with the marking duty on the *provider* of the generative system.

This is a genuine three-part why-now, with the demand leg strongest and the regulatory leg real but narrower than it first looks.

---

## The capability gap

What exists, each checked:

- **Google — nothing on-device.** ML Kit GenAI covers summarization, proofreading, rewriting, image description, prompt, and *speech recognition* — STT, the opposite direction — but [no TTS/audio-generation package](https://developers.google.com/ml-kit/genai) exists. MediaPipe audio is [classification/embedding only](https://ai.google.dev/edge/mediapipe/solutions/audio/audio_classifier). **New since the Aug-2026 snapshot:** [Firebase AI Logic now exposes "generate speech"](https://firebase.google.com/docs/ai-logic/generate-speech) via `gemini-3.1-flash-tts-preview` — but it runs **cloud-side**, not on-device. LiteRT can *run* community TTS ports (a [litert-community Kokoro](https://huggingface.co/litert-community/Kokoro-82M) exists, measured RTF ~1.8 on a Pixel 8a) but ships no packaged TTS API.
- **Apple —** [Personal Voice](https://developer.apple.com/videos/play/wwdc2023/10033) is on-device neural but replays only the *user's own* cloned voice for accessibility; AVSpeechSynthesizer is parametric. No general neural voice bank as a dev API confirmed.
- **Qualcomm —** ships an optimized [MeloTTS](https://huggingface.co/qualcomm/MeloTTS-EN) model through the AI Hub compile toolchain, Snapdragon-tied — a model + toolchain, not a drop-in API.
- **Samsung / MediaTek —** no documented third-party neural TTS developer SDK.
- **OSS —** Kokoro/Piper via sherpa-onnx/ExecuTorch run on Android, but the developer assembles the runtime, streaming, and fallback themselves.

**The precise boundary:** neural TTS is everywhere as a *model* and nowhere as a managed, drop-in, first-party **developer API** on Android. **The main competitor a developer uses today is sherpa-onnx + a Kokoro/Piper model** — free, working, and self-assembled. That is the thing to beat, and it is why this is a Prototype, not an automatic Build.

---

## Proposed surface

A `Tts` client in the ML Kit GenAI family, scoped deliberately narrow:

```kotlin
val tts = Tts.getClient(
    TtsOptions.builder()
        .setVoice(Voice.EN_US_NEUTRAL_A)   // curated, fixed voice set
        .setQualityTier(QualityTier.AUTO)  // picks model class per device
        .build()
)
tts.checkFeatureStatus().addOnSuccessListener { /* AVAILABLE / DOWNLOADABLE */ }

// Streaming is first-class, because every hand-roller had to build it:
val stream = tts.synthesizeStreaming(text)        // emits PCM chunks as produced
stream.collect { chunk -> audioTrack.write(chunk.pcm) }  // first audio sub-second
```

- **Inputs/outputs:** UTF-8 text in; 24 kHz 16-bit PCM out, streamed. A one-shot `synthesize(text): AudioData` for short strings.
- **Model class behind it:** a Piper/VITS-class voice as the ship-everywhere floor (API 26+, ~20–60 MB, CPU-only); a Kokoro-82M-class voice as the premium tier on capable devices, delivered via Play for On-device AI so it isn't bundled into the APK.
- **What it deliberately does *not* do:** no arbitrary voice cloning, no user-supplied target voices — fixed, curated voices only. This is a product decision forced by [EU AI Act Art. 50](https://artificialintelligenceact.eu/transparency-rules-article-50/) and [Play's AI-content policy](https://support.google.com/googleplay/android-developer/answer/14094294): all output carries a machine-readable provenance watermark, and the no-cloning stance keeps the API out of the impersonation/scam-voice liability that a Personal-Voice-style feature would invite.
- **TTFHW target: under 15 minutes.** Achievable iff the default voice is either lightweight-bundled or downloads on first use behind `checkFeatureStatus()`, with no API key and no dangerous permission. The one honest friction is that trade-off — bundle (APK size tax) vs on-demand (first-use network) — which is itself the Type E delivery problem this API inherits.

---

## Reach & sizing

All arithmetic mine, from third-party AppBrain ratios and Google-origin distribution data relayed by third parties.

- **Device eligibility (`r_reach`):** API 26+ ≈ **98.3%** of the fleet; API 31+ ≈ **69.2%** — against Gemini Nano's ~3.7%. A neural TTS at an API-26 floor is **~26× Nano's reach**; even at API 31, ~19×. *Google-origin, third-party relay.*
- **Addressable apps (`A_cat × p_job`):** six TTS-plausible categories ≈ 24.3% of the catalog; size-weighted `p_job` ≈ 0.40–0.45 → **SAM ≈ 10.9% of all apps** (~219k apps; ~44k in the ≥50K-install tier). *A_cat AppBrain-anchored; p_job my estimate.*
- **3-year SOM:** benchmarked to the TensorFlow Lite analogue (1.08% of apps / 10.41% of installs → a **~9–10× install-weighting multiplier**), a well-promoted first-party API reaches ceiling `c` ≈ 8% of the SAM → **~0.87% of all apps ≈ 17,400 apps**. Sanity check: TF Lite sits at ~1.08% of all apps after ~8 years, so 0.87% in 3 years inside a bounded SAM is aggressive-but-plausible.
- **Install-weighted reach:** 0.87% × [5–9.5×] × eligibility → **~3–8% of the Android app-install surface, central ~5–6%** — already meeting or exceeding Nano's *entire current device reach*, concentrated in high-value content apps.
- **Engineering cost avoided (platform-test numerator):** each adopter avoids the 2–3 months of streaming/fallback/battery work the HN builders described, plus perpetual maintenance of models OSS abandons. Across ~17k apps this clears the 10× platform-test bar comfortably at central inputs.

**Sensitivity (half `p_job`, half ceiling):** SOM compresses to ~0.22% of apps (~4,400 apps), install share ~1–2%. **The verdict survives**: the headline eligibility thesis (~98% vs 3.7%) doesn't depend on `p_job` or ceiling at all, and the business shrinks to "modest but real," not "negligible."

---

## Adoption path

1. **The hook:** one Gradle line and a `synthesizeStreaming()` call that produces audible speech in the emulator in under fifteen minutes — beating the multi-week sherpa-onnx assembly a reader-app dev faces today.
2. **First real integration:** a reading/news/navigation app replaces its cloud TTS bill (or its robotic `TextToSpeech` fallback) with offline neural voice, keeping sensitive text on-device.
3. **The dependency they'd endorse:** the platform maintains the voices, handles the Art. 50 watermarking, and delivers models without bundling — the exact three jobs the developer least wants to own forever (Piper being archived is the cautionary tale).

**First adopter:** an accessibility/reading app under EAA pressure — the kind already using ML Kit (Envision uses ML Kit summarization for blind/low-vision users). Second wave: news apps copying a visible "listen offline" reference implementation.

---

## Execution plan

- **Developer preview:** ship a Piper-class EN voice + streaming API to ~5 reading/accessibility partners. Question it answers: *is the Android-native demand real, or is the energy genuinely all on iOS/browser?* — the one gap the demand research couldn't close.
- **Alpha/Beta:** add the Kokoro-class premium tier and Play-for-On-device-AI delivery. Graduation condition: first-audio latency < 500 ms on a named mid-tier device, and watermark provenance verified against the Art. 50 machine-readable standard.
- **GA:** commit the voice set, the PCM output contract, and a versioning policy that freezes voices independently of model refresh.

**Org dependencies (stated honestly):** this needs the AICore/Play-for-On-device-AI team for managed delivery and a voice-model owner — and it reopens the ML Kit vs MediaPipe vs LiteRT ownership question. If no team will own a *model* for five years, the honest fallback is Type D: ship the streaming/delivery/watermarking wrapper around a LiteRT-run community voice rather than a first-party model.

---

## The case against

The strongest argument against is **G1 and S3 together: the borrow path already works.** sherpa-onnx (15.5k★, actively maintained) plus a free Kokoro or Piper model runs on Android *today*, at arena-topping quality, for zero marginal cost. The rubric's own list of how platform APIs die names this exactly — "undifferentiated against a free substitute" — and it's the live failure mode here, not a theoretical one. If ML Kit ships a thin wrapper over the same models, it inherits a permanent maintenance liability to compete with free software that already exists.

The honest rebuttal is that the OSS path is undifferentiated only on the *model*. What it cannot offer is what the platform uniquely can: system-managed model delivery so a 330 MB voice doesn't become an APK-size tax; a standardized Art. 50 provenance watermark that a trust-and-safety team will actually accept; curated non-clonable voices that keep the developer out of impersonation liability; and a maintained home so apps aren't building on an archived repo. That is why the proposed surface is a Type-A capability wrapped in Type-E delivery and Type-G compliance — the capability is commodity, the *wrapper* is the privilege. A reader who concludes "just ship TTS" has found the capability; the non-obvious part is that the defensibility is entirely in delivery and compliance, and a proposal that ships only the model deserves to lose to sherpa-onnx.

The second-order risk is **absorption by Google's own roadmap (failure mode #2):** Firebase already ships cloud Gemini TTS, and Nano could add audio output. But both inherit either the network dependency or the ~12 GB RAM floor, so a dedicated small-model offline path has a structural reason to persist for the offline/free/private use case.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google announcing on-device audio *output* from Gemini Nano as a developer-callable capability at I/O 2027 — that collapses S5 (the platform absorbs it underneath the API) and makes a separate TTS surface redundant. Checkable, dated.

**Load-bearing assumption:** that Android-native developers actually want this enough to adopt — the demand evidence is strong for on-device TTS in general but thin specifically on Android (the energy is on iOS/browser). The developer preview exists to test exactly this.

**Re-check trigger if shelved:** sherpa-onnx losing maintenance (as Piper did), or an EAA harmonized standard naming in-app TTS explicitly — either would move S1/S6 up.

---

## Fit for this team

ML Kit is the right front door *for the API surface* — it already owns the drop-in GenAI developer experience and the `checkFeatureStatus` pattern this needs. But the defensible parts live in other teams: managed delivery is Play-for-On-device-AI, and if no one will own a voice model for five years, LiteRT (running a community voice under an ML Kit wrapper) is the more honest home. The real internal risk is the one this whole ecosystem keeps hitting: a capability landing in the wrong part of Google's stack and fragmenting the story further. The recommendation is that ML Kit owns the *surface and contract*; it should not try to own the *model* unless a durable owner exists.

---

## Open questions

- **Is the demand Android-native?** Could not confirm — r/androiddev was blocked and npm numbers were unreachable. A direct dig (r/androiddev, Play Console feedback, Android dev Discords) would settle it.
- **The full AppBrain ≥50K-install column** for the six target categories couldn't be opened; `p_job` and the 3-year ceiling are my estimates anchored to the one recoverable cell (Tools = 25,202). A re-run on an unrestricted network firms up the SOM.
- **Does EU AI Act Art. 50's machine-readable watermark standard exist in final form yet?** The marking duty is clear; the technical standard is still being set, which affects how buildable the provenance requirement is at GA.
- **Primary EU legal text** (EAA Annex I wording, DMA decision scope) couldn't be opened directly this run — dates are multi-source-confirmed, exact statutory wording is owed before publication.

---

## Runners-up

- **On-device GenAI eval / output-regression harness (Type D)** — sharp documented gap (ML Kit prescribes an eval workflow but ships no harness; Apple shipped Evaluations) and strong strategic-complement logic, but external demand evidence (S1, 25% weight) is thinner than TTS's "vendor charging money."
- **On-device moderation / safety classifier (Type G)** — best regulatory clock (Play output-liability, minor-safety laws), strong platform privilege, but the one-size-classifier tunability problem is a real adoption risk; parked for a dedicated run.
- **Output-stability / model-version delivery contract (Type E)** — maximal platform privilege, chronically under-proposed, but invisible-in-production demand makes S1 hard to evidence.
- **Hybrid-routing / capability-detection API (Type C)** — largely pre-empted: Firebase AI Logic already ships `PREFER_ON_DEVICE` / `PREFER_CLOUD` modes, so it fails G1 on privilege.
- **Speaker diarization / speaker ID (Type A)** — genuine whitespace (Picovoice sells it), but narrower install-weighted reach than TTS and a stricter feasibility gate.

---

*Sources:*
- [ML Kit GenAI API index](https://developers.google.com/ml-kit/genai)
- [ML Kit release notes](https://developers.google.com/ml-kit/release-notes)
- [MediaPipe audio classifier](https://ai.google.dev/edge/mediapipe/solutions/audio/audio_classifier)
- [Firebase AI Logic — generate speech (cloud Gemini TTS)](https://firebase.google.com/docs/ai-logic/generate-speech)
- [litert-community Kokoro-82M](https://huggingface.co/litert-community/Kokoro-82M)
- [android.speech.tts.TextToSpeech reference](https://developer.android.com/reference/android/speech/tts/TextToSpeech)
- [Picovoice Orca — on-device streaming TTS](https://picovoice.ai/products/voice/streaming-text-to-speech/)
- [Picovoice vs ElevenLabs pricing](https://picovoice.ai/elevenlabs-pricing/)
- [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
- [rhasspy/piper (archived)](https://github.com/rhasspy/piper)
- [coqui-ai/TTS](https://github.com/coqui-ai/TTS)
- [thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)
- [nazdridoy/kokoro-tts](https://github.com/nazdridoy/kokoro-tts)
- [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)
- [Artificial Analysis — Kokoro-82M](https://artificialanalysis.ai/text-to-speech/models/kokoro-82m-v1-0)
- [qualcomm/MeloTTS-EN (AI Hub)](https://huggingface.co/qualcomm/MeloTTS-EN)
- [Apple Personal Voice (WWDC23)](https://developer.apple.com/videos/play/wwdc2023/10033)
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels)
- [Apple dev-forum: WWDC26 speech-generation API question](https://developer.apple.com/forums/thread/832868)
- [HN 43591241 — "Piper is also dead"](https://news.ycombinator.com/item?id=43591241)
- [HN 47780234 — on-device audiobook reader](https://news.ycombinator.com/item?id=47780234)
- [European Accessibility Act — Directive (EU) 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0882)
- [EU AI Act Article 50 (transparency)](https://artificialintelligenceact.eu/transparency-rules-article-50/)
- [Google Play AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/14094294)
- [StyleTTS2 (NeurIPS 2023)](https://papers.neurips.cc/paper_files/paper/2023/file/3eaad2a0b62b5ed7a2e66c2188bb1449-Paper-Conference.pdf)
