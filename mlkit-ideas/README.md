# ML Kit Idea Browser — run ledger

This folder holds the output of the `/mlkit-idea-browser` skill, run on a schedule.

**How the skill actually works** (vs. the scheduled prompt's phrasing): it is *not* a feed of community-submitted ideas with votes/authors/status. Each run derives Android on-device-AI problems from first principles, researches them live, and produces **one deep, scored opportunity report**. So "top ideas" = the chosen idea plus the runners-up it beat, and "metadata" = the type (A–G), verdict, and opportunity score. There are no vote/author fields to report because no such source exists.

Keep this ledger updated each run so the next run can avoid repeats and confirm briefly when nothing new is warranted.

## Ledger

| Date | Idea | Type | Verdict | Opportunity | File |
|---|---|---|---|---|---|
| 2026-10-05 | GenAI Observability — on-device evals + token/usage object for ML Kit | D (+ privileged B core) | Prototype | 6/10 | [report](./mlkit-idea-genai-observability-2026-10-05.md) |

### Runners-up seen so far (candidates considered and dropped — pick from here or derive fresh next run)
- Model availability & delivery observability (Type E) — *strong next candidate; narrower than it first looks because `RemoteModelManager`/`checkFeatureStatus()` cover part of it.*
- On-device neural TTS (Type A) — clean whitespace; needs a feasibility-first run.
- Deferred/opportunistic inference scheduling (Type E) — novel; demand is derived, not voiced.
- Hybrid routing policy engine (Type F/E) — Firebase AI Logic mode flags already occupy the space.
- Standalone safety/moderation classifier (Type G) — strong regulatory why-now; one-size-classifier usability is the gate risk.
