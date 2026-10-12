# ML Kit Idea Browser — ledger

One deep, evidence-backed opportunity report per run (see the skill `mlkit-idea-browser`). This file is the running index and avoid-repeats ledger. Newest run on top.

---

## 2026-10-12 — On-device GenAI Evaluation & Output-Stability Toolkit

**Full report:** [`mlkit-idea-ondevice-genai-eval-toolkit-2026-10-12.md`](./mlkit-idea-ondevice-genai-eval-toolkit-2026-10-12.md)

The idea taken deep this run, plus the runners-up considered and dropped. Metadata shown: idea type (A–G), verdict, opportunity score, and the one gate/score that decided it.

| # | Idea | One-sentence description | Type | Verdict · Opportunity | Decided by |
|---|---|---|---|---|---|
| ★1 | **On-device GenAI eval & output-stability toolkit** | A CI regression harness (golden-set gate keyed to `(device, Nano version)`) plus runtime token/usage/drift telemetry, so an app catches it when AICore silently updates Gemini Nano and its output degrades. | D + E | **Prototype / dev-preview · 6/10** | Clean platform-privilege + "Apple shipped this at WWDC26"; held back to prototype by weak reach (S2 ≈ 2.5) |
| 2 | On-device user-content moderation classifier | A tunable classifier apps call on *user* content before it hits their backend, driven by the EU DSA/DMA liability clock. | G | Runner-up | Safety is each app's proprietary policy surface → one-size classifier needs heavy tunability; deserves its own run |
| 3 | GenAI "for the 96%" — reach / tiering | Graceful degradation + small-model tiers so on-device GenAI works beyond the ~3.7% Nano-capable fleet. | F | Runner-up | Biggest reach, but Firebase AI Logic hybrid inference is partial prior art and sub-8GB quality is a hard feasibility story |
| 4 | On-device neural TTS as a modern developer API | A real on-device neural text-to-speech API to replace Android's decade-old parametric `TextToSpeech`. | A | Runner-up | Genuine whitespace, but Apple + Picovoice (Orca) ahead and it's a model-delivery problem, not a quarter's work |
| 5 | On-device embeddings / RAG as a first-class ML Kit API | First-party text-embedding + retrieval API for in-app semantic search and on-device RAG. | A / B | Runner-up | Prior art: MediaPipe Text Embedder + EmbeddingGemma already exist — a packaging/DX gap, not absent capability |

**Highlight — timing/trending:** the #1 idea carries a live competitive clock (Apple shipped an on-device Evaluations framework, token counting, and cached/reasoning usage reporting at WWDC26, Jun 2026) and the regulatory-clock candidate (#2, EU DSA/DMA) is the one to watch next. No "high-priority/trending" external idea feed exists for this skill — it generates ideas from first principles + live research rather than reading a votes/author/status queue, so those fields are N/A; the metadata that exists is idea-type, verdict, opportunity score, and gate evidence.

**Verdict in one line:** right idea, early — build the developer preview to measure whether Nano version-swap drift fires at population scale, not the full platform yet.

---

### Ideas already covered (do not repeat without a new angle)
- On-device GenAI evaluation / output-stability tooling (2026-10-12)
