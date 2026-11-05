# ML Kit Idea Browser — ledger

Persistent record of ideas surfaced by the `mlkit-idea-browser` skill, so future runs avoid repeats and can confirm whether anything is new since the last run. Newest run on top.

> Note on framing: this skill *generates* one deep, first-principles-plus-research opportunity report per run — it does not browse a community feed, so there are no external authors or vote counts. "Metadata" below maps to the skill's own fields: idea **type** (A–G), **verdict**, **opportunity score**, and gate status. "High-priority / trending" maps to verdict (Build > Prototype > Shelve) and to any live regulatory or competitive clock.

---

## Run 2026-11-05 — first run

**Report:** `mlkit-idea-reach-tiers-2026-11-05.md`

**Headline idea — ML Kit GenAI Reach Tiers** · Type F (Reach) + C/E · **Verdict: Prototype** · **Opportunity 6/10 (time-boxed bridge)**
One GenAI call that degrades across *on-device* model tiers (flagship Nano → Google-delivered small model → explicit degraded) instead of vanishing on the ~96% of Android that can't run Gemini Nano, with the served tier surfaced to the app.
- Metadata: gates all pass but marginal (privilege 3, feasibility 3, durability 3); composite 3.35. Demand strong (funded vendors RunAnywhere, Cactus; open ML Kit bug #1062). Substitute half-life short (Firebase could absorb it).
- **Trending / clock:** EU DMA Case DMA.100220 (adopted 2026-07-16) forces Google to expose AICore/Nano to third parties; on-device-model date reported as 1 Jan 2027 — the dominant why-now.
- Kill criterion: Firebase AI Logic adds an on-device-small-model tier to `PREFER_ON_DEVICE` before this reaches beta.

**Runners-up considered this run** (not yet taken deep — candidates for future runs):
1. On-device eval & quality harness (Type D) — lost on platform privilege (OSS eval tools iterate fast).
2. Standalone safety/moderation classifier for user content (Type G) — tunability risk; needs a dedicated research run.
3. On-device neural TTS (Type A) — genuine whitespace (Picovoice Orca; Apple has it; Google doesn't); strong standalone candidate.
4. Output-stability / versioning contract across model refreshes (Type E) — max privilege, but demand hard to source and undemoable.

**Snapshot corrections logged this run** (landscape.md is dated Aug 2026; update when revising it):
- Gemini Nano 4 **shipped** on ~7 production flagships (Pixel 11 family + Galaxy Z Flip8/Fold8), not preview-only (~Aug 2026).
- "~3.7% of fleet" is **derived arithmetic**, not a published Google figure; only "140M+ devices" (~Apr 2026) is Google-published.
- Apple Foundation Models now exposes Private Cloud Compute + third-party server models (Claude, Gemini) via a `LanguageModel` protocol (WWDC26).
- Firebase Hybrid cloud default model now `gemini-3.5-flash`; MediaPipe LLM Inference is maintenance-only (LiteRT-LM is the forward path).
- DMA: the "1 Aug 2027 / Android 18" date is press framing for the full feature set; EC draft measures put on-device models at 1 Jan 2027 (exact adopted date unverified).

---

<!-- Next run: append above this line. Do not repeat the headline idea or runners-up without a materially new angle. -->
