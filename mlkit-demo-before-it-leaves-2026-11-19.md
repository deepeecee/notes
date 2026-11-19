# Below the 9 bar: best of 2 — "Before It Leaves" - the private stuff never leaves the phone, even on a plane

**Mechanism:** B (private context), with a D (cross-app agent) action step | **Tier:** T1 core, T2 for the clean cross-app handoff | **Target event:** The Android Show I/O Edition, expected ~May 2027 (fallback Made by Google, ~Aug 2027) | **Life domain:** photos and memories
**On-device benefit:** privacy + offline | **Device:** Android flagship phone (Pixel 11 / 2026 Nano-4 class)
**Verdict:** Prototype first (capped) | **Switch Score: 5/10 author, 4/10 blind verifier (Promising / Weak)**
*2026-11-19 | Baseline refreshed 2026-11-19 | Apple parity checked 2026-11-19*

> You bought iPhone for privacy. A premium iPhone owner about to send a photo of a form, a group shot with other people's kids, or a screenshot of a text does one of two things today: crop and scribble by hand, or send it and hope. On stage, in airplane mode, the presenter says "share this safely." Faces of strangers and an account number blur in place in about two seconds, and the cleaned image drops into WhatsApp. Nothing was uploaded, because the whole point is that this content never could be. The phone proves the privacy Apple only promises.

This run did not clear David's 9 bar. It is delivered as the best of two candidates taken deep, per standing rule 1. The honest cap is named below.

---

## Scores

| Item | Score | Evidence |
|---|---|---|
| **Switch Score** | **5/10 author, 4/10 verifier** | author: composite 3.35 x2 = 6.7 -> 7, minus 1 each for G1 and G2 at 3 = 5. verifier: same composite, minus 1 each for G1, G2, G3 at 3 = 4. |
| G0 on-device is the magic | 5 | The content being redacted (IDs, logins, strangers) is exactly what a user will never upload, so cloud is structurally disqualified. Airplane mode is a genuine, visible proof, not a nicety. |
| G1 iPhone-can't gap | 3 | No cloud product does redact-before-share on iPhone, so it escapes the cloud-parity cap. But Apple owns the on-device pieces (Clean Up, sensitive-content detection, Visual Intelligence) and could ship first-party "redact in Photos" within ~12 months. The durable gap is only the cross-app handoff. |
| G2 live-able and honest | 3 | Airplane-mode redaction is honestly on-device and stage-safe as a short burst. But one missed PII item on stage visibly breaks the privacy promise, and cross-app push runs ~52% reliable. 4-of-5 clean runs needs heavy scripting of a fixed input. |
| G3 ML Kit is the hero | 3 (verifier) / 4 (author) | ML Kit GenAI produces the visible redaction. But the cross-app push is AppFunctions, a closed preview gated to privileged system assistants, so an outside developer cannot build the full pitch today. The verifier's 3 is the fairer read. |
| S1 switch pull (25%) | 3 | Sharing is daily; the redaction trigger is occasional and latent, not top-of-mind. Attacks the privacy/anxiety force, the exact reason this persona is on iPhone. |
| S2 holy-smokes (20%) | 4 | Before/after is legible in under 10 seconds: an account number and strangers' faces, then gone, on a plane. |
| S3 moat durability (15%) | 3 | The magical, copyable half (redaction) has a sub-12-month first-party copy window. The durable half is the gated handoff. |
| S4 grounded horizon (15%) | 3-4 | The redaction pipeline is demonstrable on real hardware now; the ML Kit ask is specific. |
| S5 developer pull (15%) | 3-4 | Partners want an on-device redaction API tonight, but only the manual-share half is buildable by outsiders until AppFunctions opens. |
| S6 stage safety (10%) | 3 | Short and wifi-free, but GenAI non-determinism plus perfect-recall requirement plus ~52% cross-app reliability make a rehearsed pre-recorded fallback mandatory. |
| **Composite** | **3.35** | Prototype first band. Two to three gates at 3 cap the verdict at Prototype first. |

Thinnest evidence: whether Apple ships first-party on-device redaction inside 12 months. If it does, G1 and S3 both fall and the idea moves to Pass.

---

## Run of show (90 seconds)

- 0:00 The presenter holds a Pixel, toggles airplane mode on, and shows the status bar. "Everything from here runs on the phone. Nothing leaves it."
- 0:10 On screen: a photo of a printed school permission form on a kitchen table, a child's name, a home address, and a parent signature visible. "I need to send this to the class group chat. Watch what I have to do today." They pinch, crop, and fumble. "Or."
- 0:25 They tap share, pick "share safely," and say nothing else. **[HOLY-SMOKES]** The address and the signature blur in place in about two seconds. A second photo, a group shot at a birthday, loads; the faces of two kids who are not in the user's contacts soften to a blur while the user's own child stays sharp.
- 0:45 The cleaned images slide into WhatsApp, addressed to "Class of 2B," ready to send. The presenter has not typed a word.
- 1:00 "No crop tool. No cloud. On a plane. The private parts never left this phone, because with this one"-holds up the phone-"they never have to."
- 1:15 Cut to the developer line: a three-call slide (detect, redact, hand off) and "any app you build can call this."

The 15-second social clip: airplane-mode toggle (2s), the form with visible address and signature (3s), the word "share safely" and the blur happening in place (4s), the group photo with only strangers' faces blurring (3s), the drop into WhatsApp (3s). No narration needed; the blur is the whole story.

---

## Why an iPhone owner wants this

The four forces (Moesta and Christensen): the **push** is the small dread every time you send something with a stranger, an address, or an account number in it. The **pull** is a phone that removes that dread without a crop tool and proves it by working offline. The **habit** holding them is iMessage and the Apple privacy brand itself, which is the clever part: this demo attacks Apple on its own chosen ground. The **anxiety** to calm is "will it miss something," and that anxiety is also the demo's biggest live risk.

Frequency is the weak link. Sharing a photo is daily; needing redaction is occasional for most, weekly for a privacy-conscious parent or a knowledge worker who photographs forms, IDs, and receipts. That latent frequency is why S1 is a 3, not a 5. The honest read: this is a feature iPhone owners would admire in a clip, not one most would switch for. It retains the privacy-motivated buyer more than it converts the median one, which is the Kantar pattern this brief is built to avoid.

---

## Premium share math

My arithmetic, inputs sourced or marked unverified.

- Segment: premium ($600+) iPhone owners who chose iPhone partly for privacy. Counterpoint H1 2026 premium share: Apple 65%, Samsung 19% [[Counterpoint](https://counterpointresearch.com/cn/insights/Memory-Price-Surge-Triggers-Shifts-in-Smartphone-BOM-Structure)].
- Weekly hit rate: a privacy-leaning parent or professional photographs and shares a form, ID, receipt, or group photo roughly weekly [unverified, my estimate].
- Force moved: anxiety (privacy proof), not habit. It does not touch iMessage, Watch, or AirDrop lock-in.
- Implied switch lift: low. With iPhone loyalty at 87% [CIRP Q1 2026] and AI historically retaining rather than converting [Kantar], I would model this as a consideration nudge for the privacy segment, not a switch driver. Call it under 1 point of switch intent on its own [unverified, my estimate].

---

## Why only Android, and for how long

Apple parity today: Apple has Clean Up (manual object removal), on-device sensitive-content detection, and Visual Intelligence, all on-device, but no agentic "find every private thing and redact it, then share" flow [[Apple support](https://support.apple.com/guide/mac-help/mchl35c53342)]. iOS 27 Siri AI adds in-app actions but has no app-to-app intent invocation; only Siri and Shortcuts orchestrate, and third-party access is in beta with apps reaching customers in 2027 [[WWDC26 s8011](https://developer.apple.com/videos/play/wwdc2026/8011/)].

The structural gap that lasts: Android lets a system assistant drive a third-party app's write action, including through a zero-code UI-automation fallback when no integration exists. Apple has no system-driven screen-automation path for third-party apps, and its App Review posture gates agentic apps [[AppFunctions](https://developer.android.com/ai/appfunctions), [nowsecure](https://nowsecure.com/blog/2026/08/05/what-appsec-teams-need-to-know-about-app-intents-siri-ai-and-the-new-ios-27-attack-surface/)]. That is counter-positioning (Helmer): Apple's sandbox is the thing stopping it.

The problem: that durable gap sits on the handoff, not on the holy-smokes transform. The redaction itself, the part the audience gasps at, is on-device image work Apple can copy first-party. My estimated copy window for the visible magic is under 12 months; for the autonomous cross-app handoff, 18 months or more. The demo would be far stronger if the durable half were the magic half.

---

## The capability bet

What ML Kit ships today, capability by capability:

- On-device OCR and face detection: available in ML Kit Vision today [confirmed]. Enough to find PII text and faces.
- Deciding "whose face stays": needs contact-matching against the user's own people. Face detection returns landmarks, not identity clustering; identity grouping is a Google Photos product feature, not a public ML Kit API [confirmed-absence]. This is a real gap.
- The redaction (inpaint or blur) over detected regions: feasible on-device today [inferred, feasible].
- Reasoning "what counts as private here": Prompt API multimodal (text + image), Nano 4, with a ~4000-token input ceiling [confirmed [get-started ref](https://developer.android.com/agents/skills/device-ai/ml-kit-genai-prompt-api/references/get-started)]. One image at a time is fine; this does not need library scale.
- The cross-app push into WhatsApp: AppFunctions, an experimental closed preview, gated to privileged system assistants by EXECUTE_APP_FUNCTIONS; a third-party app cannot invoke another app's functions [confirmed [AppFunctions](https://developer.android.com/ai/appfunctions)]. This is T2 for an outside developer and the single biggest blocker to the "any developer can build this" claim.

**The ML Kit ask:** (1) an on-device "redact-regions" capability, a PII-and-face detector bound to an inpaint step, exposed through ML Kit GenAI so any app can request a cleaned image; (2) on-device contact-aware face identity grouping, so "keep my people, blur strangers" is a one-call primitive; (3) general availability of cross-app AppFunctions execution so a partner app, not only the system assistant, can complete the share. Items 1 and 2 are the roadmap gold here, because they are buildable and nobody exposes them yet.

---

## The developer beat

The code slide, pseudocode, labeled as such:

```kotlin
val plan = redactor.detect(image)        // ML Kit: PII text + faces
  .keep(myContacts)                      // identity-aware: my people stay
val clean = redactor.redact(image, plan) // on-device inpaint/blur
Share.to("whatsapp", clean)              // AppFunctions handoff (GA pending)
```

The partner who ships it first: any app that receives user-uploaded images and carries liability for what is in them. A healthcare or banking app wants "redact before upload" tonight. A social app (Reddit, Nextdoor) wants "blur strangers and plates" to cut doxxing. The first two calls are buildable the quarter the redaction API lands; the third waits on AppFunctions GA.

---

## Build and stage plan

- Device: a Nano-4-class flagship (Pixel 11 or 2026 equivalent); Nano 4 is in developer preview with production "later in 2026" [announced [Gemma 4](https://developer.android.com/blog/posts/announcing-gemma-4-in-the-ai-core-developer-preview)]. Confirm a production device by the event date.
- Prototype effort: moderate. The detect-and-redact pipeline is assemblable today from ML Kit Vision plus an inpaint model; the identity-aware "keep my people" step and the AppFunctions handoff need internal builds.
- Fallback: a rehearsed, pre-recorded redaction on a fixed input, because a live miss is a privacy-promise failure, not a cosmetic one.
- Rehearsal risks: GenAI non-determinism on which regions it flags; the perfect-recall requirement; cross-app push at ~52% reliability; model-download state.
- Honest device floor: this runs on the top of the installed base only. Nano 4 and AppFunctions are flagship-and-preview today, not the 140M-device Nano base. Say so on stage.

---

## Rough edges we'd accept

A premium buyer would forgive a plain redaction UI, a short list of supported target apps at launch, and a manual confirm before the share fires. What they will not forgive, and what the demo cannot ship with, is a miss: one unredacted account number teaches the opposite of the intended lesson. The line is bright. Unpolished handoff is acceptable; imperfect recall is not. That single requirement is what holds this at Prototype first rather than Stage it.

---

## The case against

The strongest honest case: the magic and the moat point in opposite directions. The part that makes an iPhone owner gasp is the on-device redaction, which Apple can ship first-party inside a year because it already owns every piece. The part Apple cannot copy quickly is the autonomous cross-app handoff, which is invisible, fragile, and today locked to a closed preview no developer can touch. So the demo spends its holy-smokes budget on a copyable feature and rests its durability on its least-available component. The live failure mode is the trust-zone miss (failure mode 7): a single leaked digit on stage inverts the message. The fix is to make the redaction the entire demo, drop the fragile cross-app step to a plain share sheet, and pick an input where recall can be guaranteed. That is a safer demo, but a smaller one, and still a Prototype-first, not a switcher.

---

## Kill criteria

**Kill criterion:** if Apple ships a first-party on-device "redact sensitive content" action in Photos or the share sheet in iOS 27.x or 28, the visible magic is matched and this falls to Pass.
**Load-bearing assumption:** that a premium iPhone owner feels enough recurring dread about sharing private images to change phones over it, rather than merely admire the clip. The evidence (87% loyalty, AI as a retainer not a converter) says probably not. This is the assumption the whole Switch Score rests on.

---

## Runners-up (the candidate set this run screened)

1. **"Album, Sent"** (mechanism D, tier T2, cross-app photo agent). "Make mom a Diwali album from this year and text it on WhatsApp," curated over the private library offline. **Killed at G1 (score 2):** Google Gemini Spark already ships cloud album curation, de-dupe, and share, reachable by iPhone owners through Google's own iOS app, and Gemini cross-app actions already demoed WhatsApp send [[TechCrunch](https://techcrunch.com/2026/09/04/googles-gemini-spark-can-now-manage-your-google-photos-library/)]. A cloud product doing the job on iPhone caps the gap. This was the Pass-1 moment-first candidate; its failure forced the Pass-2 pivot that produced the delivered idea.
2. **"Find it like you'd say it"** (B, T1, on-device natural-language photo search). Killed as table stakes: Apple Photos does on-device NL search including video scenes, and Google Photos "Ask Photos" covers the cloud version [[Apple](https://support.apple.com/guide/mac-help/mchl35c53342), [TechCrunch](https://techcrunch.com/2024/05/14/google-photos-introduces-an-ai-search-feature-ask-photos)].
3. **"The memory that finds you"** (F, T2, proactive montage on an anniversary). Killed as table stakes: Apple and Google both auto-surface Memories movies; no 10x.
4. **"Print-ready in one breath"** (D, T1, photo book curated and ordered from a print app). Runner-up, not taken deep: narrow weekly job, low switch pull, same cross-app dependency as the delivered idea.
5. **Horizon sketch worth watching:** a fully on-device library-scale curation agent that reasons over tens of thousands of photos offline. It fails G2 today because there is no library-scale multi-image API and the Prompt API input ceiling is ~4000 tokens; the real mechanism is pre-indexed on-device embeddings (EmbeddingGemma, proven offline in shipping apps like Ente). Promotes when ML Kit exposes an on-device image-embedding and multi-image ranking API [[EmbeddingGemma](https://developers.googleblog.com/en/introducing-embeddinggemma/)].

---

## What would lift this run to a 9

The ceiling in photos and memories is low this cycle because Google itself ships cloud photo AI on iOS, so most photo jobs are already available to iPhone owners and the gate G1 caps them. A 9 needs a weekly job where cloud is disqualified by the content and Apple cannot build the magic first-party within 18 months. The redaction idea gets the first half and fails the second. The honest path to a 9 is to move the durable cross-app-openness moat onto a frequent job in a domain Apple's sandbox blocks structurally (messages, money, or accessibility), rather than photos, where the visible magic is always copyable image work.

---

*Sources: [ML Kit GenAI Prompt API get-started](https://developer.android.com/agents/skills/device-ai/ml-kit-genai-prompt-api/references/get-started) · [AppFunctions](https://developer.android.com/ai/appfunctions) · [Gemma 4 in AICore preview](https://developer.android.com/blog/posts/announcing-gemma-4-in-the-ai-core-developer-preview) · [Build intelligent Android apps: on-device inference](https://developer.android.com/blog/posts/build-intelligent-android-apps-on-device-inference) · [Apple Siri AI, WWDC26 s8011](https://developer.apple.com/videos/play/wwdc2026/8011/) · [Apple Photos search](https://support.apple.com/guide/mac-help/mchl35c53342) · [Gemini Spark in Google Photos](https://techcrunch.com/2026/09/04/googles-gemini-spark-can-now-manage-your-google-photos-library/) · [Google Photos Ask Photos](https://techcrunch.com/2024/05/14/google-photos-introduces-an-ai-search-feature-ask-photos) · [EmbeddingGemma](https://developers.googleblog.com/en/introducing-embeddinggemma/) · [Ente on-device ML](https://help.ente.io/photos/features/search-and-discovery/machine-learning) · [AndroidWorld benchmark](https://arxiv.org/pdf/2405.14573) · [iOS 27 agent attack surface](https://nowsecure.com/blog/2026/08/05/what-appsec-teams-need-to-know-about-app-intents-siri-ai-and-the-new-ios-27-attack-surface/)*

---

*Run note: the memory ledger at `/areas/mlkit-demo-ledger.md` was not reachable in this session (the memory filesystem is not mounted), so this run had no cross-session repeat check and created a local ledger instead. Two candidates were taken deep; the delivered idea is the higher-scoring. No verified 9 was found. One blind verifier was run on the delivered idea (author 5/10, verifier 4/10).*
