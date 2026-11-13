# ML Kit Idea Browser — Digest · 2026-11-13

*One deep idea per run (the skill generates and scores a single opportunity, with runners-up as the comparison class). This run had no prior ledger in this repo — first run, nothing to diff against.*

**Top pick + runners-up this run, ranked by composite score:**

| # | Idea | Type | One-line | Verdict | Opportunity | Flag |
|---|---|---|---|---|---|---|
| 1 | **On-device moderation classifier** | G — Trust/safety | Managed ML Kit SDK that scores user text (and non-CSAE image) for toxicity/harassment/sexual/violence/self-harm/spam on-device, before it leaves the phone. | **Prototype** | **6/10** | 🔥 **Trending · regulatory clock** |
| 2 | On-device GenAI eval harness + token accounting | D — Tooling | Let developers measure whether their on-device AI feature got better or worse across Nano refreshes (ML Kit ships a prose eval page with no code; Apple shipped the framework). | Prototype (est.) | — | ⭐ High-leverage; latent demand |
| 3 | On-device neural TTS | A — New API | A modern on-device text-to-speech developer API (Picovoice Orca and Apple already fill this; may be closing — verify ML Kit's new speech-synthesis entry). | Prototype (est.) | — | Possibly already shipping |
| 4 | One-line availability + fallback facade | C — DX | Collapse the checkFeatureStatus + download + BUSY/quota + fallback boilerplate every integrator hand-writes into one managed call. | Shelve/park (est.) | — | — |
| 5 | Output-stability contract across Nano refreshes | E — Lifecycle | Platform commitment that GenAI output format/behavior stays stable through model updates, versioned independently of the model. | Shelve/park (est.) | — | Max privilege, weak why-now |

> Only idea #1 was taken through full research and scoring this run; #2–#5 are the scored-down runners-up (triaged, not deep-researched).

## #1 — On-device moderation classifier (deep idea)

- **Title:** On-device Moderation Classifier — score user content before it leaves the phone
- **Type / Verdict / Opportunity:** G (Trust, safety & compliance) · **Prototype / developer-preview** · **6/10** (composite 3.70)
- **One-sentence description:** A first-class, ML-Kit-managed on-device SDK that scores arbitrary user-generated text (and non-CSAE image) across the harm taxonomy and returns calibrated per-category scores — the managed on-device version that no vendor ships today.
- **Why high-priority / trending now:** Jigsaw's **Perspective API shuts down 31 Dec 2026** (the free de-facto toxicity standard, no migration path), forcing a large installed base to re-pick moderation in exactly this window; Google **Play's UGC/child-safety policy** mandates moderation and rejects non-compliant apps (expanded to anonymous-chat apps 26 Aug 2026); EU DSA / UK Online Safety Act / EU AI Act Art. 50 form a dated statutory backbone; and GDPR data-minimization makes shipping user content to a cloud scorer a liability.
- **The sharp tension (the non-obvious finding):** the Perspective shutdown is simultaneously the strongest *why-now* AND the strongest *case-against* — Google is exiting standalone moderation tooling on the record ("less demand for a standalone tool"), and a general on-device model is already absorbing toxicity scoring on flagships. The defensible wedge is narrow: the **mid-tier fleet (~95% of devices) that can't run a general model**, as a privacy-preserving, compliance-grade **first-stage filter** (scores + advisory actions, never a block/allow verdict), with the CSAE slice routed to Android SafetyCore rather than owned.
- **Full report:** `mlkit-idea-ondevice-moderation-classifier-2026-11-13.md`

---
*Freshness flags surfaced this run (landscape snapshot is Aug 2026): ML Kit GenAI now advertises an **Embeddings API (text + image)** and **on-device speech synthesis**, neither in the snapshot; Android **SafetyCore / `ContentSafetyManager`** (on-device, image-scoped, approved-apps-gated) is being wired into the Photo Picker. `developers.google.com` was not allow-listed in this session, so the "no ML Kit moderation API" negative is search-sourced, not doc-fetched.*
