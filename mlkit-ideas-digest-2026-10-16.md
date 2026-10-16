# ML Kit Idea Browser — Daily Digest

**Run date:** 2026-10-16 15:17 UTC · **Prepared for:** Android ML Kit Product Lead
**Ledger status:** First recorded run — no prior digest/ledger found in this repo or session (fresh container). This file starts the repeat-avoidance ledger.
**Freshness:** ML Kit release notes show nothing new 2026-08-01 → 2026-10-16 (latest: genai-prompt beta4, 2026-07-21). The August 2026 landscape snapshot still holds.

---

## Deep dive this run

**On-device content moderation classifier (Type G — trust/safety/compliance)**
→ Full report: `mlkit-idea-on-device-moderation-2026-10-16.md`
**Verdict: Shelve for ML Kit / Reframe · Opportunity 4/10.**
One-liner: The capability is real, demanded, and feasible — but Google is *already building it in the Android framework* (`ContentSafetyManager` + SafetyCore, staged at API level 10000), so an ML Kit version would duplicate its own platform's system service. The residual gap (app-owned/tunable policy vs. a user toggle, on-device **text** toxicity, and reach to pre-Android-17 devices) is genuinely open but likely belongs to the SafetyCore team.

---

## Top ideas this run (deep-dive + runners-up), ranked

| # | Idea | Type | Est. opportunity | Status / verdict | Key metadata |
|---|---|---|---|---|---|
| 1 | **On-device eval & quality-measurement harness** | D (Tooling) | ~6–7/10 (est.) | **Highlighted — promote next run** | Apple shipped an Evaluations framework + token counting; ML Kit has a prose "evaluate prompt quality" page with *no code*. Un-absorbed by SafetyCore; ships fast (no model to train). Lost this run only to moderation's regulatory hook; likely scores higher. |
| 2 | On-device content moderation classifier | G (Trust/safety) | 4/10 | Shelve for ML Kit / Reframe (deep dive) | Demand 4/5, Feasibility 4/5, Reach 4/5; sunk by substitute half-life 2/5 (`ContentSafetyManager`) + borrow 2/5. Regulatory tailwind (DSA, TAKE IT DOWN, UK OSA, AI Act Art.50) but no single clean deadline. |
| 3 | Model-availability & delivery observability contract | E (Delivery) | ~5/10 (est.) | Runner-up | Clearest developer-voiced pain in the ML Kit issue tracker (silent, unobservable model downloads). Max platform privilege; weak demo appeal; durability risk. |
| 4 | Reach / sub-8 GB GenAI tiering | F (Reach) | ~5/10 (est.) | Parked | The defining 3.7%-of-fleet tension + DMA Art.6(7) tailwind (Android 18 by 2027-08-01). Feasibility is the whole game; Firebase hybrid may absorb it. Needs a device-RAM distribution source. |
| 5 | On-device neural TTS | A (New API) | ~5/10 (est.) | Candidate for a future run | Clean whitespace — Google ships nothing, Picovoice sells Orca, Apple shipped speech generation. Platform privilege only moderate; an OSS path competes. |

*Runner-up opportunity figures are quick triage estimates, not full-rubric composites; only #2 was scored in full this run.*

---

## Highlighted / high-priority

- **Trending-up and recommended as next deep dive:** the **on-device evaluation harness (Type D)**. It is the cleanest un-absorbed, fast-to-ship opportunity in the current landscape and directly answers "developers can't tell whether their on-device AI feature got better or worse between releases."
- **Time-sensitive to watch:** `ContentSafetyManager` leaving **API level 10000** (any Android 17/18 developer preview or ML Kit release note). If it ships with an app-controlled policy contract + a UGC-harm text taxonomy, idea #2 is killed outright; if it ships only the user-toggle version, the residual re-opens as a Prototype.
- **Dated forward forcing function across several ideas:** EU DMA Article 6(7) — Android must expose system-level on-device AI models to third parties in Android 18 by **2027-08-01**. Reshapes the substrate under ideas #2, #3, and #4.

---

## Ledger (ideas taken deep — do not repeat without new evidence)

| Date | Idea slug | Type | Verdict |
|---|---|---|---|
| 2026-10-16 | on-device-moderation | G | Shelve for ML Kit / Reframe |
