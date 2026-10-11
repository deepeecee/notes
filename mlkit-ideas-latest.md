# ML Kit Idea Browser — Latest Ideas

*Auto-generated index / ledger. Most recent run on top. Each run produces one deep report (`mlkit-idea-<slug>-<date>.md`) plus the runner-ups considered. Future runs: skip titles already listed here unless re-scoring.*

---

## Run 2026-10-11 — first run

**Lead idea — Eval Kit for On-Device GenAI** · Type D (Tooling) + Type E core · **Verdict: Prototype (developer-preview)** · **Opportunity 5/10** · ⚠️ *competitively forced, demand still latent*
> Give ML Kit Prompt API developers an eval/regression harness, token accounting, and — the durable core — a Gemini Nano version-pin/output-stability contract, so a silent AICore model update can't break their feature undetected.
- Metadata: composite 2.80; gates all pass (Privilege 4, Feasibility 4, Durability 3); weakest score = demand (on-device-specific signal thin: `vouch` at 10 downloads, 0 ML Kit tracker issues); why-now = Apple shipped the Evaluations framework + token accounting at WWDC26 while ML Kit ships only a prose guide.
- Full report: `mlkit-idea-ondevice-genai-eval-2026-10-11.md`

**Runner-ups considered this run** (title · one-line · why it lost):
1. **On-device neural TTS API** (Type A) — Google ships nothing beyond legacy `android.speech.tts`; Picovoice Orca sells it. *Lost: the obvious pick; wanted to test under-proposed Type D/E space. Strong future candidate — gate risk is platform privilege vs fast OSS TTS.*
2. **On-device user-content moderation classifier** (Type G) — a safety classifier a dev can call on user content. *Lost: hard tunability problem + needs a trust-&-safety co-owner. Best why-now of the slate (EU DMA deadline 2027-08-01).* ⭐ high-priority future run.
3. **Deferred/opportunistic inference scheduling** (Type E) — "run this batch when charging, on wifi, idle" under the shared system model. *Lost: thin demand evidence.*
4. **GenAI reach for sub-8GB devices** (Type F) — convert Nano's ~3.7% device reach into a platform capability. *Lost: feasibility headroom — can't promise flagship quality on mid-tier silicon.*
5. **Speaker diarization / wake word** (Type A) — Picovoice Falcon/Porcupine are de-facto standards because no platform ships one. *Lost: narrower install-weighted reach.*

**Trending / high-priority flags:** none of this run's ideas are "trending" by developer demand (on-device GenAI demand is still latent). The competitively-urgent item is the lead (Apple parity pressure); the regulatory-clock item worth a dedicated next run is the **moderation classifier** (DMA 2027-08-01).
