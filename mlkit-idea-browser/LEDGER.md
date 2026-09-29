# ML Kit Idea Browser — Ledger

A running log of ideas produced by the `mlkit-idea-browser` skill, newest first. Future runs read this to avoid repeating a lead idea and to confirm when nothing new has surfaced. Each run produces one deep report (the lead) plus named runners-up.

---

## 2026-09-29 — Run 1 (first run; no prior ledger)

**Lead idea — "The Availability Contract"** · Type C (+E, +F) · **Verdict: Prototype** · **Opportunity 7/10**
One ML Kit call that owns the whole on-device-GenAI lifecycle — availability, model download, quota/foreground errors, and an app-chosen degradation ladder — so a feature is safe to ship to every device instead of hidden for the ~96% that can't run Gemini Nano.
Report: [`mlkit-idea-genai-availability-contract-2026-09-29.md`](./mlkit-idea-genai-availability-contract-2026-09-29.md)
Key metadata: gates 5/5/4 (all pass); composite 3.65; demand STRONG (official tracker issues #1069/#1070, two DIY readiness repos, Google's own `androidify` PR #170); why-now = DMA Case DMA.100220 (Android 18 / 1 Aug 2027) + Firebase ML shutdown 15 Jun 2027. Highlighted: **regulatory clock**, **Firebase AI Logic is the absorption risk**.

**Runners-up considered this run:**
1. On-device eval / regression-testing harness (Type D) — dropped: weak Platform Privilege (a small team can ship it).
2. On-device neural TTS API (Type A) — dropped: heavier feasibility/durability; may belong in the Android framework.
3. Callable on-device moderation classifier for user content (Type G) — dropped: T&S teams want proprietary policy; tunability gate risk.
4. Deferred/opportunistic inference scheduling (Type E) — partially absorbed into the lead's `autoDownload`/`onBusy` policy; worth a standalone report later.
