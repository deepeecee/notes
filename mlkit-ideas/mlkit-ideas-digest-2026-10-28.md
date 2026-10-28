# ML Kit Idea Browser — Daily Digest

**Run date:** 2026-10-28 · **Prepared for:** Android ML Kit Product Lead
**Evidence current as of:** 2026-10-28 · **Research:** 4 parallel agents (prior-art, demand, feasibility/reach, sizing/regulatory)

> **Ledger note:** no prior-run ledger exists in this environment, so this is treated as a fresh generation — every candidate below is newly surfaced this run (nothing to diff against a last run).

This run generated 12 candidate problems from first principles, triaged to 6 candidates across 4+ idea types, and took one deep. Below are the top 5 by relevance, the deep pick first.

---

## ⭐ #1 — On-Device Safety Classifier (TRENDING / HIGH-PRIORITY)

A one-call, whole-fleet ML Kit task that scores user text and images for a standard harm taxonomy (hate, harassment, sexual, violence, self-harm, spam) **on-device**, before content leaves the phone — returning scores for the app to act on, not a block/allow verdict.

- **Type:** G (Trust, safety & compliance)
- **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Promising)** · **Composite: 3.9**
- **Status:** Net-new API/packaging layer — *not* a Type B extension (the models exist as weights, the task does not)
- **Why high-priority / trending:** carries a live **regulatory clock** — Google Play mandates UGC moderation, UK Online Safety Act Protection of Children Code in force 25 Jul 2025, amended US COPPA full-compliance 22 Apr 2026, EU DSA live since 17 Feb 2024. Strongest demand evidence of the run (nsfwjs 9,015★, Detoxify 1,312★ active, a liquid paid cloud market, verbatim "ML Kit has no nudity classes" complaint).
- **Key metadata:** feasible on ~99% of the fleet at BERT/MobileNet scale (Google's own Perspective API runs a ~100M model); ShieldGemma's smallest text model is 2B/flagship-only, so it can't be the fleet moderator. Honest caveat: quality is **pre-filter-grade, not sole-arbiter-grade**. Borrow path (Detoxify, nsfwjs) is the main threat to the verdict.
- **Full report:** `mlkit-on-device-moderation-classifier-2026-10-28.md`

---

## #2 — On-Device Eval / Quality-Regression Harness

A tooling suite (token accounting, prompt regression tests, output-quality dashboards) so developers can tell whether their on-device AI feature got better or worse across model refreshes.

- **Type:** D (Tooling) · **Status:** runner-up
- **Why it matters:** Apple shipped an Evaluations framework at WWDC26; ML Kit publishes a prose "evaluate prompt quality" page with **no harness behind it** — a clean, dated competitive gap. Trivial feasibility (no model to train), strong strategic complement.
- **Why it lost:** install-weighted reach is capped to the ~3.7% GenAI-feature base, and external demand is thinner than moderation.

---

## #3 — Graceful-Degradation / Tiered-Capability SDK

One write-once GenAI call that degrades Gemini Nano → classic-ML-Kit extractive methods on the ~96% of devices without Nano — instead of falling back to the **cloud** (which defeats the privacy/cost reason to go on-device).

- **Type:** C/F (Developer experience / Reach) · **Status:** runner-up
- **Why it matters:** directly attacks the defining 26× reach gap; strong platform-privilege story (only the platform owns the tiering surface).
- **Why it lost:** Firebase AI Logic's hybrid inference (`PREFER_ON_DEVICE`) is a real partial incumbent, making the whitespace harder to argue cleanly.

---

## #4 — On-Device Neural TTS Developer API

A modern on-device text-to-speech API (read-aloud, accessibility, voice replies) to replace Android's decade-old parametric `TextToSpeech`.

- **Type:** A (New capability) · **Status:** parked
- **Why it matters:** genuine whitespace — Google has no modern on-device TTS; Picovoice Orca sells into it; Apple added on-device speech generation.
- **Why it lost:** strong OSS (Piper, Coqui) pressures platform privilege (G1) and the build-vs-borrow delta (S3).

---

## #5 — On-Device Speaker Diarization / Speaker ID

"Who spoke when" + speaker identity on top of the speech-recognition stream, for meeting-notes, voice-memo, and podcast apps.

- **Type:** A (New capability) · **Status:** parked
- **Why it matters:** ML Kit Speech Recognition returns a transcript with no speaker attribution; Picovoice Falcon (diarization) and Eagle (speaker ID) sell it; no platform ships it.
- **Why it lost:** parked below moderation on install-weighted reach.

---

### Killed at triage (for the record)
- **On-device embeddings in ML Kit (Type B)** — MediaPipe already ships text/image embedding and EmbeddingGemma exists, so borrow wins and it fails the Platform-Privilege gate.

### Caveats this run
Direct `WebFetch` to `developers.google.com`, `huggingface.co`, `appbrain.com`, and `apilevels.com` was blocked by the session's network allowlist; all Google-doc and sizing figures came via WebSearch snippets of the primary pages and should be re-verified against primary sources before anyone builds on them.
