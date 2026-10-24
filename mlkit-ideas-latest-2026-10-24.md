# ML Kit idea browser — latest run (2026-10-24)

First run of this skill in the repo — no prior ledger exists, so every idea below is new. One idea was taken deep this run (full report linked); the rest are the triaged candidate slate, scored lightly.

**Full report for the lead idea:** [`mlkit-idea-ondevice-neural-tts-2026-10-24.md`](./mlkit-idea-ondevice-neural-tts-2026-10-24.md)

---

## ⭐ Lead idea (taken deep this run)

### 1. On-device neural TTS API — the one GenAI capability ML Kit can give the whole fleet, not the flagships
One drop-in ML Kit API for offline, natural text-to-speech, giving reading/news/navigation/accessibility apps a neural voice without a cloud bill or the robotic 2011-era `TextToSpeech`.
- **Type:** A (new capability), argued as a Type F reach play · **Verdict:** Prototype / dev-preview · **Opportunity: 6/10**
- **Why it leads:** wins the two heaviest rubric dimensions — demand (Picovoice *charges* for it; ElevenLabs cloud bill $0.05–0.10/1K chars; sherpa-onnx 15.5k★) and feasibility (Kokoro-82M ~82 MB / Piper ~20–63 MB run CPU-only on mid-tier, ~98% device eligibility vs Gemini Nano's ~3.7%).
- **🔥 Trending signal:** 2025's breakout small-TTS models (Kokoro, Piper) draw thousands of GitHub stars; builders hand-roll streaming layers on iOS/browser daily.
- **The honest tension:** the free "borrow" path (sherpa-onnx + Kokoro) already works on Android, so the moat is in *managed delivery + Art. 50 watermarking + curated voices*, not the model — which is exactly what holds it at a 6, not a build-now.

---

## Runner-up candidates (triaged, not taken deep)

### 2. On-device GenAI eval / output-regression harness
A test harness so developers can tell whether a Gemini Nano model update silently regressed their AI feature.
- **Type:** D (tooling) · **Status:** strong candidate, parked
- **🔥 High-priority / competitive:** Apple shipped an Evaluations framework at WWDC26; ML Kit *prescribes* an eval workflow but ships no tooling behind it — a sharp, documented gap.
- **Why parked:** external demand evidence (25% rubric weight) is thinner than TTS's "a vendor charges money for it."

### 3. On-device moderation / safety classifier for user content
A callable classifier so apps can moderate user-generated content on-device before it hits their backend.
- **Type:** G (trust/safety/compliance) · **Status:** parked for a dedicated run
- **🔥 Regulatory clock:** Play makes developers liable for generated output; minor-safety laws landed in-client from Jan 2026. Strong platform privilege.
- **Why parked:** the one-size-classifier tunability problem is a real adoption risk that needs its own analysis.

### 4. Output-stability / model-version delivery contract
A commitment that an app's parsed GenAI output won't break when Nano refreshes v2→v3→v4.
- **Type:** E (delivery/lifecycle) · **Status:** parked
- **Why parked:** maximal platform privilege and chronically under-proposed, but the demand is invisible-in-production, making it hard to evidence (S1).

### 5. Hybrid-routing / capability-detection API — ❌ gate fail
An API to detect on-device availability and route between on-device and cloud.
- **Type:** C · **Status:** killed on G1 (platform privilege)
- **Why killed:** largely pre-empted — Firebase AI Logic already ships `PREFER_ON_DEVICE` / `PREFER_CLOUD` modes.

### 6. Speaker diarization / speaker ID
On-device "who spoke when" for meeting-notes and transcription apps.
- **Type:** A · **Status:** parked
- **Why parked:** genuine whitespace (Picovoice sells it) but narrower install-weighted reach than TTS and a stricter feasibility gate.

---

## Metadata
- **Run date:** 2026-10-24
- **Ideas surfaced:** 6 (1 deep, 5 triaged) — all new (first run)
- **Research:** 5 parallel agents (prior-art, demand, feasibility, sizing, regulatory/competitive), all returned
- **Freshness note vs the Aug-2026 landscape snapshot:** Firebase AI Logic now exposes a *cloud* Gemini TTS (`gemini-3.1-flash-tts-preview`) — new, and relevant to the TTS idea's substitute risk. The snapshot's TTS-whitespace entry still holds for the *on-device* case.
