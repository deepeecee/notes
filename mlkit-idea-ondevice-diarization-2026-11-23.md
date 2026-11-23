# On-device speaker diarization — the "who spoke when" layer ML Kit already built and never shipped

**Type:** B — Extension to the Speech Recognition API · **Verdict:** Prototype → developer preview (leaning Build) · **Opportunity: 7/10 (Whale-gated)**
*2026-11-23 · Prepared for Android ML Kit · Evidence current as of 2026-11-23*

> *Badges: Nobody-on-platform ships it · Google already runs it in Recorder · Whale-gated reach · Evidence gathered search-only (docs domain blocked)*

> An Android developer building a meeting-notes or voice-memo app in November 2026 can call ML Kit's GenAI Speech Recognition API, get a clean streaming transcript back — and have no idea who said which line. To get speaker labels they bolt on `sherpa-onnx`, fight to port a PyTorch `pyannote` model onto a phone, or pay Picovoice ~$6,000–$30,000 a year. Google itself solved this on-device in 2022 — "Turn-to-Diarize" powers the Pixel Recorder's speaker labels in real time on a phone — but never exposed it as a developer API. This is the rare idea where the hard research is done, shipping inside a first-party app, and the only missing thing is the public surface.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Whale-gated | composite 3.75 × 2 = 7.5; −1 for G1 scoring exactly 3; +1 for S1 = 5 → ~7.5, held at 7 for the reach conditionality |
| Platform privilege (gate) | 3/5 — pass | OSS (`sherpa-onnx`) ships an Android diarization path, so the raw capability isn't OS-exclusive; the platform edge is a tuned, system-delivered model + integration with the managed speech stream + no 30 MB in every APK |
| Feasibility headroom (gate) | 4/5 — pass | VAD + segmentation + embedding + clustering, no LLM; runs on API-31 mid-tier; Google's own Turn-to-Diarize proves real-time on-device ([research.google](https://research.google/blog/who-said-what-recorders-on-device-solution-for-labeling-speakers/)) |
| Durability (gate) | 4/5 — pass | Output is timestamps + anonymous labels — a schema far more stable across model refreshes than generative text; ML Kit has held vision/NL surfaces GA for years |
| Demand evidence (25%) | 5/5 | Converging independent signals: OSS at 16k–33k★, $6–30k/yr SDKs + per-minute cloud add-ons, Argmax's stated #1 request, a dated Apple-forum plea for a native API |
| Install-weighted reach (15%) | 3/5 | Device eligibility strong (API 31+ = **77.7%**, [composables mirror of Google data](https://composables.com/android-distribution-chart)); but install-weighted reach is <1% from the long tail, swinging to ~10–20% only if a whale adopts |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The borrow path is real — `sherpa-onnx` ships prebuilt Android diarization APKs — which caps the delta, even though doing it *well* needs audio-ML expertise most Android teams lack |
| Integration cost / TTFHW (15%) | 4/5 | Achievable as one Gradle line + system-delivered model if designed as a Speech Recognition extension; first use needs network for model download |
| Substitute half-life (15%) | 3/5 | ~2–3 years; the live threat is OSS parity (`sherpa-onnx` shipping monthly) and a possible Apple native API, not absorption by a general LLM |
| Strategic complement (10%) | 4/5 | Makes Android the private, on-device home for the exploding meeting/voice/wearable-notes category; clears the platform test |
| **Composite** | **3.75** | Weighted mean of S1–S6 |

*Least trustworthy line: install-weighted reach. The whole upside hinges on whether 1–2 named whale apps route diarization through the API, and I have no evidence of their intent — only that the capability now fits on-device. The AppBrain category table never rendered, so A_cat and p_job are my apportionment, not fetched counts.*

---

## The problem

The job, stated as a developer's job under a deadline: *"I have a recording with several people in it. My transcript is useless for meeting notes, call summaries, or a clinical scribe until each line is attributed to a speaker, and I need that to happen on the device because the audio is a private conversation I don't want to send to a server."* The customer is an Android engineer on a meeting-notes, voice-memo, call-recorder, podcast, lecture-capture, or medical-scribe app; the competing solution is their own glued-together pipeline.

This problem is structurally produced, not accidental. A consumer audio app's loop is **record → transcribe → act** (summarize, extract tasks, search). ML Kit now serves the transcribe step on-device via the GenAI Speech Recognition API, but that API returns partial and final *text* responses and nothing else — no speaker field ([ML Kit speech-recognition reference](https://developers.google.com/android/reference/com/google/mlkit/genai/speechrecognition/package-summary), confirmed via search; the docs host could not be fetched directly this session). So the loop leaks at exactly the point where a transcript becomes a *meeting*: attribution. Every app in the category hits the same wall, and — the tell for a platform problem — they all solve it identically and badly.

What they do *instead* today, concretely: (1) port `pyannote` off PyTorch to ONNX themselves and fight the mobile-deployment issues its maintainers acknowledge; (2) adopt `sherpa-onnx`, which hands them two ONNX models and a clustering step to wire up and a device matrix to test; or (3) license Picovoice Falcon/Eagle at an annual fee. The cost of that workaround — engineer-months, or thousands of dollars a year — is the value of the API.

The org-shape argument makes it a platform problem specifically. The teams that need this are Android app teams; their ML expertise, where it exists, is server-side. Diarization requires audio-ML knowledge (speaker-embedding models, clustering, diarization-error tuning) that a median Android team does not have in-house. A capability that needs both an Android engineer and an audio-ML engineer in one head is expensive for an app and cheap for a platform that already employs the second engineer — and Google does: the Turn-to-Diarize team.

---

## Proof & signals

- **Developers doing it by hand (fetched from the GitHub API):** `k2-fsa/sherpa-onnx` — 16,164★, pushed 2026-11-23 — ships on-device diarization with prebuilt **Android** APKs. `m-bain/whisperX` (25,619★) and `pyannote/pyannote-audio` (10,836★) are the reference pipelines. On Apple, `FluidInference/FluidAudio` (3,326★, CoreML on-device) and `argmaxinc/argmax-oss-swift` (6,472★) exist *because the platform doesn't*. The clincher is the hand-rolling at the bottom of the distribution: `qutschwalze/meeting-transcriber-sherpa` — "100% offline speech-to-text app for **Android** (Sherpa-ONNX, Kotlin/Compose) **with speaker diarization—no cloud**," and `samson6460/pyannote-onnx-extended`, a developer manually porting pyannote's pipeline off PyTorch. When independent developers rebuild the same block, that block is an API.

- **The platform-port friction, quoted (fetched GitHub issues):** pyannote issue #1537, "Get rid of ONNX WeSpeaker" — *"the ONNX dependency seems to cause lots of problem to pyannote users."* Issue #604 asks about *"portability options… (mobile, different backends for ONNX)."* The reference model resists the phone; that friction is the opportunity.

- **Someone charging money for it:** Picovoice sells **Falcon** (batch diarization), **Bluebird** (streaming diarization, beta), and **Eagle** (speaker ID) as on-device licensed SDKs — third-party aggregators put the tiers near ~$6,000/yr and ~$30,000/yr (estimated, not vendor-confirmed; [picovoice.ai](https://picovoice.ai/products/voice/speaker-diarization/) was not directly fetchable). **Argmax** sells **SpeakerKit Pro**. Every major cloud STT vendor bills diarization: AssemblyAI relays a **+$0.02/hr batch / +$0.12/hr streaming** add-on; Deepgram ~$0.002/min (third-party, figures conflict). Buyers exist at both ends of the market.

- **Community voice (verbatim):** Argmax, launching SpeakerKit, stated the *"top feature request from developers building with WhisperKit was on-device speaker diarization"* ([argmaxinc.com/blog/speakerkit](https://www.argmaxinc.com/blog/speakerkit), via search). An Apple developer, [forum thread 829751](https://developer.apple.com/forums/thread/829751) "Native diarization in '27?" (fetched): *"The current limitation is speaker attribution — I need to identify which speaker is producing each segment… I'd strongly prefer a native solution if one exists or is planned. Do I need to stay with third-party libraries, or is this coming?"* The same "Ask HN: what do you use for speaker diarization?" recurs yearly, with the standing complaint that whisperX only emits `SPEAKER_00`-style tags.

- **The absence signal:** No large consumer-app engineering blog surfaced describing a *custom from-scratch* on-device diarizer — because the OSS pipelines are good enough to adopt rather than rebuild. Read that correctly: it means the demand is real but the **borrow** path already partly serves it, which is precisely the risk the Build-vs-Borrow score reflects, not a reason to doubt demand.

---

## Why now

1. **Capability shift (2022→2026).** On-device diarization crossed from research to shipping. Google's Turn-to-Diarize diarizes hours of audio in real time on a phone ([research.google, 2022](https://research.google/blog/who-said-what-recorders-on-device-solution-for-labeling-speakers/); [arXiv 2210.13690](https://arxiv.org/abs/2210.13690)); a litert-community Android reference now runs pyannote segmentation + a WeSpeaker embedding on a Pixel GPU delegate at ~1.2 ms/window with fp16 near-lossless ([HuggingFace](https://huggingface.co/litert-community/Speaker-Diarization-LiteRT), via search). The models fit in tens of MB.

2. **Competitive/regulatory shift (2025–2027).** Apple shipped `SpeechAnalyzer`/`SpeechTranscriber` in iOS 26 with time-ranges but **no diarization** — and developers are publicly asking Apple for it, with iOS-27 "Core AI" rumors unconfirmed. Separately, the EU DMA Article 6(7) decision on Alphabet (Case DMA.100220, July 2026) forces third-party access to on-device model and always-on-audio capabilities on Android, implemented in Android 18 (press cites 1 Aug 2027; not confirmed against the primary decision this session). A first-party diarization API is on the right side of that opening rather than a casualty of it.

3. **Demand shift (2024–2026).** The private, on-device meeting/voice-notes category is exploding — Granola, Plaud, Otter's on-device push, and AI wearables like Omi, whose community's top request is literally "On-Device Speaker Diarization (Who's Talking)." These apps' entire pitch is that the conversation never leaves the device, which a cloud diarizer breaks.

All three are dated and real. The why-now is strong.

---

## The capability gap

Checked against each stack (negatives stated with the surface I checked; docs host blocked, so these are via search):

- **ML Kit** — Speech Recognition returns partial/final text; no speaker field. Vision has face *detection*, never identity. No audio diarization anywhere.
- **MediaPipe** — audio tasks are classification only (YAMNet); no diarization, no speaker embedding task.
- **Apple** — `SpeechTranscriber` gives transcription + time-ranges, no speaker attribution; Foundation Models is a text LLM. Confirmed by the standing developer radar/forum request.
- **Qualcomm AI Hub** — Whisper-family ASR only; no diarization model in catalog.
- **Samsung / MediaTek** — no third-party diarization developer API found (Samsung ships speaker labels *inside* its own Voice Recorder, not as an SDK).
- **OSS / commercial** — this is where it lives: `pyannote`, `sherpa-onnx`, `FluidAudio`, Picovoice Falcon/Bluebird/Eagle, Argmax SpeakerKit.

**The precise boundary:** every platform ships on-device ASR with word/segment timestamps; none ships the **clustering step** that turns those timestamps into "Speaker A / B / C." That one missing step is the whole product. **The main competitor a developer uses today is `sherpa-onnx`** (free, on-device, Android-ready) or Picovoice (paid, supported) — not another platform.

---

## Proposed surface

A Type B extension to the Speech Recognition API: keep the transcription stream, add an optional speaker track. Diarization runs as its own small pipeline (VAD → segmentation → speaker-embedding → clustering), independent of Gemini Nano, so it reaches the whole API-31 base rather than the ~3.7% Nano slice.

```kotlin
val recognizer = SpeechRecognition.getClient(
    SpeechRecognizerOptions.builder(context)
        .setDiarization(                       // the only new line
            DiarizationOptions.builder()
                .setMaxSpeakers(6)             // hint; unknown-count allowed
                .setMode(NEAR_REALTIME)        // or BATCH for recorded files
                .build())
        .build())

// Each result now carries anonymous, session-scoped speaker labels:
result.segments.forEach { seg ->
    // seg.text, seg.startMs, seg.endMs, seg.speakerTag  // 0,1,2… not a name
}
```

**Inputs/outputs:** audio in (mic or raw 16 kHz PCM, matching the existing speech API); out is the current transcript plus per-segment `speakerTag` (an integer) and timing. **Model class:** a system-delivered VAD + speaker-embedding model (Turn-to-Diarize lineage), downloaded on demand via the existing AICore / Play-for-On-device-AI delivery path — so nothing ships in the APK. **Device requirement:** API 31+, no Nano dependency. **What it deliberately does NOT do:** no 1:N speaker *identification*, no persisted voiceprints, no cross-session "this is Alice." Labels are anonymous and reset per session. That exclusion is a product decision, not a limitation (see "The case against" and "Fit").

**TTFHW target: under 15 minutes.** It's reachable *only* if the model is system-delivered (no asset bundling, no key) and diarization is a boolean on an API the developer already called. If diarization instead required a separate SDK, a model download the developer manages, or a new permission, it misses the target — so system-managed delivery is a design constraint, not a nice-to-have.

---

## Reach & sizing

Device eligibility is the strong input: **API 31+ = 77.7%** of active Android (Google distribution data via [composables mirror](https://composables.com/android-distribution-chart), 2026-10-01), versus 99% at API 26+. Decoupling from Nano is what buys this — a Nano-gated version would sit at ~3.7%.

Install-weighting multiplier, from a comparable on-device ML SDK: TensorFlow Lite is **0.95% of apps / 11.19% of installs → ~11.8×** (AppBrain, via search). Specialized on-device ML concentrates in big apps.

My arithmetic (inputs estimated where tagged):
- A_cat ≈ 47,000 "quality" apps across Communication, Business, Productivity, Music&Audio, Education, Medical (estimated; AppBrain category table did not render).
- p_job ≈ 5% (only the multi-speaker-audio subset qualifies) → SAM ≈ **2,350 apps**.
- Eligible at API 31+ (×0.777) ≈ 1,830; year-3 ceiling ×15% → **~275 apps adopting**.
- Long-tail install-weighted reach: the dedicated apps (Otter ~5M, Notta ~3.3M, Recorder, Rev, PLAUD, Fireflies) total ~20M installs → **<1% of the ~4B Android surface**.
- **Whale swing:** if any one of Samsung Voice Recorder (1B+), Zoom (~1.4B), Teams (500M+), Meet (500M–1B+), or Google's own Recorder routes through the API, eligible installs jump by 0.5–1B → install-weighted reach of **~10–20% of the Android surface**. The 11.8× multiplier is the formal statement of this concentration.

**Sensitivity:** halving p_job (2.5%) and c_ceiling (7.5%) cuts year-3 adopters from ~275 to ~68 — a 4× haircut — and the long-tail reach to ~0.03% of surface. The whale scenario is unchanged, because whales are discrete adoption events, not functions of p_job. **The honest reading: the long-tail case does not clear the platform test on its own; the opportunity is a bet on capturing one or two whales, and the first experiment is to confirm whether Google Recorder and one external meeting app would adopt a public API.**

---

## Adoption path

1. **The hook:** a developer with a working ML Kit transcript flips `setDiarization(...)` on and sees `speakerTag` populate in the emulator in minutes — no new SDK, no model to source.
2. **First real integration:** a meeting-notes or voice-memo app ships speaker-attributed transcripts and summaries, replacing a `sherpa-onnx` integration or a Picovoice license and deleting their model-maintenance burden.
3. **The dependency:** once summaries, action-item extraction, and search are keyed on `speakerTag`, removing it means rebuilding the attribution layer — a dependency the developer endorses because it's doing real work, not lock-in they resent.

**First adopter:** Google Recorder itself (it already has the model) is the reference implementation; it makes the API credible. **Second wave:** the private-notes long tail (Granola/Plaud/Omi-class apps) whose whole pitch is on-device. **The unlock for real reach** is a whale — most plausibly Samsung (already doing on-device labels in its Recorder) standardizing on the platform API, or a meeting app moving its cloud diarization on-device for privacy.

---

## Execution plan

- **Developer preview:** ship the Turn-to-Diarize-lineage model behind the API to a handful of partners (one meeting app, one wearable, Google Recorder as dogfood). Question it answers: does near-real-time DER on real multi-party phone audio clear the "usable with light correction" bar, and can a partner hit the 15-minute hello-world? Evidence collected: the whale-intent signal that S2 rests on.
- **Alpha → Beta:** graduate when near-real-time DER on a partner's real audio stays in the usable band on a p50 API-31 device within a stated thermal/power budget, and the speaker-track schema is frozen. Checkable condition, not "make progress."
- **GA:** commit to the segment/`speakerTag`/timing schema and an output-stability contract — speaker tags stable within a session across model refreshes. Version the schema independently of the model.

**Org dependencies, honestly:** this needs the AICore / Play-for-On-device-AI team for model delivery, and it needs a charter decision on whether diarization lands in **ML Kit** or **MediaPipe** (which already owns on-device audio tasks). If the audio-ML model owners won't commit a supported, versioned model, this is a wish — that's the yes that has to come from outside the ML Kit team.

---

## The case against

The strongest argument is **undifferentiation against a free substitute (G1 / adoption failure mode #7).** `sherpa-onnx` is free, on-device, actively maintained (pushed today), and already ships Android APKs with diarization. A capable team *can* adopt it in a couple of weeks. So the platform isn't offering a capability nobody has — it's offering a *better-delivered* version of a capability that's already borrowable. That is exactly what a Platform-Privilege score of 3 looks like eighteen months later, and it's why this is a prototype-to-preview, not an unconditional build.

The honest rebuttals, made fairly: (1) the borrow path still costs model sourcing, ONNX porting (pyannote's own maintainers flag the pain), a device matrix, streaming-clustering quality work, and perpetual maintenance — which is why Picovoice and Argmax can charge for it; (2) system-managed model delivery (nothing in the APK, updated centrally) is something no OSS library can offer; (3) integration with the managed speech stream and a frozen output contract is platform-only. But these are advantages of *degree*, not a moat, and the report should not pretend otherwise.

The second live risk is **reach (failure mode #1, "API outran the integrators"):** if no whale adopts, this serves a few hundred long-tail apps and a few million installs — a feature, not a platform API. It does **not** fail on hardware (77.7% eligible) or on demand (which is unambiguous); it fails on whether the big audio apps move on-device. That is the one thing to de-risk first.

I did look for a stronger case against and did not find one that kills it — the capability is real, feasible, demanded, and legally clean when scoped to anonymous diarization. The weakness is reach-conditionality, and it's a known, testable weakness, not a hidden flaw.

---

## Kill criteria

**The single observation that would reverse this:** Apple shipping native on-device diarization in `SpeechAnalyzer` at WWDC 2027 **and** `sherpa-onnx`/LiteRT reaching turnkey one-file Android integration — together they would collapse both the differentiation and the why-now. Checkable at WWDC27 and by watching `sherpa-onnx` release notes for a drop-in Android diarization artifact.

**Load-bearing assumption:** that at least one high-install audio app (Google Recorder counts) will route diarization through a public API within three years. Everything in the reach case rests on it.

**Re-check trigger if shelved:** a named whale (Samsung, Zoom, Teams, Meet) publicly moving transcription/diarization on-device for privacy — that's the signal the whale market has arrived.

---

## Fit for this team

ML Kit is the right owner *if* the decision is "a task API, delivered like barcode scanning." The counter-argument is real: **MediaPipe already owns on-device audio tasks** and the speaker-embedding/clustering primitive is more MediaPipe-shaped than ML Kit-shaped. The deciding factor is the surface: diarization's natural home is *attached to the transcript*, and ML Kit owns the Speech Recognition API the transcript comes from. Shipping it as a Speech Recognition extension (Type B) rather than a standalone MediaPipe task is what delivers the 15-minute hello-world and inherits an adoption base. If instead it ships as a bare MediaPipe audio task, it fragments the developer story further — the exact failure this ecosystem keeps repeating. **Recommendation: ML Kit owns the API surface; MediaPipe/AICore owns the model.** The scope boundary — anonymous diarization yes, 1:N speaker identification no — must be held by ML Kit as policy, matching its existing face-detection-not-identity posture, because speaker identification is a biometric (BIPA enumerates "voiceprint"; [740 ILCS 14/10](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004)) and belongs in the same deliberate-abstention bucket as face identity.

---

## Open questions

- **Whale intent.** Would Google Recorder adopt a public API, and would Samsung standardize its on-device labels on it? Settle with partner conversations in the developer preview. This is the highest-value unknown.
- **Near-real-time DER on p50 silicon.** No published streaming-diarization DER/power number exists for a 2022 mid-tier SoC specifically; the best device data is a 2024 Pixel 8a, embedding-stage only. Settle by measuring on a target device matrix.
- **ML Kit vs MediaPipe ownership.** No public roadmap statement on whether the two are converging. Settle internally before committing a surface.
- **Primary-source verification.** This run could not fetch `developers.google.com`, `picovoice.ai`, `arxiv.org`, `huggingface.co`, AppBrain, or `apilevels.com` directly (DNS blocked by session network policy); all are via WebSearch summaries. Re-verify the ML Kit speech reference, Picovoice pricing, DER numbers, and the DMA deadline against primary pages once those hosts are allow-listed.
- **Snapshot staleness found:** ML Kit GenAI Speech Recognition has moved to `1.0.0-alpha2` since the Aug-2026 snapshot (still transcription-only, advanced mode still Pixel-10-gated). Worth updating the landscape file.

---

## Runners-up

- **On-device neural TTS (Type A)** — huge demand (Speechify, accessibility) and wide reach, but failed Platform Privilege at the margin: OSS Piper/Kokoro make the capability borrowable, and `TextToSpeech` is Android-framework turf, not ML Kit's. Strong idea, weaker *platform-ownership* case.
- **On-device eval / quality harness (Type D)** — sharpest why-now (Apple shipped Evaluations; ML Kit prescribes a prompt-eval workflow with zero code behind it), platform-fast to build, but its demand (S1) and reach (S2) are capped by the ~3.7% Nano base, since only GenAI adopters need it.
- **Capability-detect + graceful-fallback block (Type C)** — every GenAI integrator hand-rolls the same `checkFeatureStatus` + download + `BUSY`/battery-quota + bootloader block; a clean idea that compounds across every GenAI API, but also Nano-reach-capped and lower-drama than diarization.
- **Standalone moderation classifier (Type G)** — real regulatory pull, but dies on tunability: trust-and-safety teams treat moderation policy as proprietary, so a one-size classifier is hard to make adoptable. Parked pending a dated statutory trigger.
- **Speaker identification / 1:N voice matching** — deliberately excluded, not lost: it's a biometric (BIPA voiceprint, GDPR Art. 9) and belongs in the face-identity abstention bucket. Listed so it isn't mistaken for the opportunity.

---

*Sources:*
- [Google Research — "Who said what? Recorder's on-device solution for labeling speakers" (Turn-to-Diarize)](https://research.google/blog/who-said-what-recorders-on-device-solution-for-labeling-speakers/)
- [Turn-to-Diarize paper, arXiv 2210.13690](https://arxiv.org/abs/2210.13690)
- [litert-community Speaker-Diarization-LiteRT](https://huggingface.co/litert-community/Speaker-Diarization-LiteRT)
- [ML Kit GenAI Speech Recognition API reference](https://developers.google.com/android/reference/com/google/mlkit/genai/speechrecognition/package-summary)
- [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
- [pyannote/pyannote-audio](https://github.com/pyannote/pyannote-audio) · [issue #1537](https://github.com/pyannote/pyannote-audio/issues/1537)
- [FluidInference/FluidAudio](https://github.com/FluidInference/FluidAudio) · [argmaxinc/argmax-oss-swift](https://github.com/argmaxinc/argmax-oss-swift)
- [Argmax SpeakerKit launch blog](https://www.argmaxinc.com/blog/speakerkit)
- [Apple Developer Forums thread 829751 — "Native diarization in '27?"](https://developer.apple.com/forums/thread/829751)
- [Picovoice speaker diarization](https://picovoice.ai/products/voice/speaker-diarization/) · [speaker recognition (Eagle)](https://picovoice.ai/products/voice/speaker-recognition/)
- [Android version distribution mirror (composables)](https://composables.com/android-distribution-chart) · [apilevels.com](https://apilevels.com/)
- [AppBrain machine-learning SDK stats](https://www.appbrain.com/stats/libraries/tag/machine-learning/machine-learning-sdks)
- [Illinois BIPA, 740 ILCS 14 (voiceprint)](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004) · [GDPR Art. 9](https://gdpr-info.eu/art-9-gdpr/)
- [EU DMA — Alphabet interoperability proceedings](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en)
