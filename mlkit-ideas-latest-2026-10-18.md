# ML Kit Idea Browser — Latest Run

*Run date: 2026-10-18 · Prepared for Android ML Kit*

**Note on format:** the ML Kit Idea Browser is a research-and-judgment generator — each run *derives and scores one deep opportunity* against three gates and six weighted criteria, not a feed of votable entries. So the "metadata" here is the skill's own output (idea **Type** A–G, **Verdict**, **Opportunity /10**, evidence-backed), not author/votes/tags. This is the first recorded run — no prior ledger existed, so every idea below is new.

## Top idea (taken deep this run)

**1. On-Device GenAI Eval & Drift Harness** — *Type D (Tooling) + E · Verdict: Prototype/developer-preview · Opportunity 6/10* 🔥 **trending** · ⏱ **competitive clock**
A Gradle test/CI harness that lets an app evaluate the real on-device Gemini Nano model, catch silent output drift when AICore rolls Nano v3→v4 underneath it, and account for on-device tokens — the half Google left unbuilt after shipping `getBaseModelName()` as the tripwire.
→ Full report: [`mlkit-idea-ondevice-genai-eval-drift-harness-2026-10-18.md`](./mlkit-idea-ondevice-genai-eval-drift-harness-2026-10-18.md)
Why it's trending / high-priority: **Apple shipped the competing Evaluations framework + on-device token counting at WWDC26 (June 2026); ML Kit ships only a prose "evaluate prompt quality" page with no code.** Demand is real but *latent* (anchor: ML Kit issue #1061, a dated version-swap regression with "no workaround at the API level"), which is exactly why the honest verdict is Prototype-to-measure, not Build.

## Runners-up considered this run

**2. Model-availability / download state machine** — *Type E · not taken: partly already addressed* 
The strongest *vocal* developer demand in the ML Kit tracker (issues #1061/#1078/#1062 — managed-model state the SDK misreports), but `checkFeatureStatus()` + `getBaseModelName()` already cover part of it; an extension, not whitespace. Lost on non-obviousness.

**3. On-device safety / moderation classifier** — *Type G · not taken: tunability risk* ⚖️ **regulatory clock**
Real statutory pressure (US minors-assurance laws from Jan 2026; Play makes developers liable for output) and Bumble open-sourced its own classifier — but a one-size classifier dies against each app's proprietary policy surface. Parked for a dedicated run.

**4. On-device neural TTS developer API** — *Type A · not taken: weak platform privilege*
Genuine whitespace — Google ships no modern on-device TTS and Picovoice sells Orca into the hole — but redistributable models mean a small team could ship it, and it adds no portfolio-complement leverage. Failed the Platform Privilege gate.

**5. Deferred / opportunistic inference scheduling** — *Type E · not taken: demand unmeasurable*
Most novel (nobody ships "run this batch when charging, on wifi, idle" under the shared system model) with maximal platform privilege, but demand is almost entirely inferred this run. Lost on unmeasurable demand evidence.

---

*High-priority / trending flag: only idea #1 is flagged, on the strength of a dated competitive move (Apple, WWDC26) plus a live, open regression in ML Kit's own issue tracker. The regulatory clock on #3 (and indirectly on #1, via the EU DMA "equivalent performance" obligation due 2027-08-01) is the other timing signal to watch.*
