# Managed-Model Delivery Observability — give apps the same download state machine for Google's models that they already have for their own

**Type:** E (Delivery & lifecycle), with a Type C ergonomic wrapper · **Verdict:** Prototype (developer preview) · **Opportunity: 8/10 (Strong)**
*2026-09-30 · Prepared for Android ML Kit · Evidence current as of 2026-09-30*

*Badges: `Nobody else has it` · `Platform-only` · `Regulatory clock (adjacent)` · `Trivial feasibility` · `Weak build-vs-borrow delta`*

> On a Tuesday, an Android engineer at a translation or scanner app wraps their ML Kit call in a `try/catch`, catches `MlKitException.UNAVAILABLE`, and then — because there is no other option — keeps the analyzer alive in a loop and *hopes* Google Play services downloads the model. If the user is offline, the download never happens and the app has no way to know: no state, no progress, no failure signal, just a spinner that never resolves. This idea gives them the same observable download state machine (`PENDING → DOWNLOADING(42%) → COMPLETED / FAILED`) that Android *already ships* for developer-packaged models — wired, for the first time, to the models Google itself delivers. The one number that matters: this request has been open, refiled, and unaddressed for **eight years** (since 2018), across four different ML Kit model families, with **zero** OSS libraries filling the gap.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 8/10 — Strong | composite 3.95 × 2 ≈ 7.9; no gate scores 3 (gates are 5/5/4) and S1 is 4 not 5, so no adjustment → 8. Deliberately not rounded to 9: the build-vs-borrow delta is genuinely weak. |
| Platform privilege (gate) | 5/5 — pass | Only Play services / AICore controls the download of managed models; no third party can observe a transfer it doesn't own. The delivery is inside GMS. |
| Feasibility headroom (gate) | 5/5 — pass | No model, no silicon dependency — pure plumbing. Android already ships this exact state machine three times ([SplitInstall](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus), AssetPack, [AiPack](https://developer.android.com/google/play/on-device-ai)). |
| Durability (gate) | 4/5 — pass | A status enum is trivial to hold for five years; the risk is only on the *SLO* side (promising availability is harder than reporting it). Keep the contract to observability, not guarantees. |
| Demand evidence (25%) | 4/5 | Filed 2018 ([firebase #47](https://github.com/firebase/firebase-android-sdk/issues/47), closed *not planned*), refiled 2021 ([mlkit #315](https://github.com/googlesamples/mlkit/issues/315)), recurring through 2024 across four model families; **0** OSS wrappers. Docked 1: no commercial vendor charges for it (structurally can't) and SO/Reddit legs were unretrievable this run. |
| Install-weighted reach (15%) | 4/5 | Applies to *every* unbundled ML Kit model across the ~99% GMS base (classic) / 96.1% at API 26+; ML Kit installs skew ~1.4–1.5× toward high-install apps. Docked: all-apps penetration denominator unverified; GenAI slice capped at ~4–5% Nano devices. |
| Build-vs-buy-vs-borrow (20%) | 3/5 | The honest weak spot. The borrow path — poll `isModelDownloaded()`, retry, show an indeterminate spinner — is a few days and "mostly works." The API's value is the edge cases (offline-never-arrives, device-specific silent failures), not the happy path. |
| Integration cost / TTFHW (15%) | 5/5 | A status query + a listener; one Gradle line; no API key; no new dangerous permission; negligible size; works in the emulator. Mirrors an API shape devs already know. |
| Substitute half-life (15%) | 4/5 | A general model cannot absorb plumbing it can't see. The only substitutes are Google's own roadmap or the DMA-mandated interop API (see Case against). |
| Strategic complement (10%) | 4/5 | Makes every ML Kit and GenAI feature safer to ship, which grows on-device adoption and Play/Android gravity. Value is real but diffuse. |
| **Composite** | **3.95** | Weighted mean of S1–S6. Just under the 4.0 Build line → Prototype, explicitly to collect the missing S1 (commercial/enterprise) and S3 (real engineer-weeks saved) evidence. |

*Least trustworthy row: **install-weighted reach.** Every adoption figure I could recover is category-relative (42matters snippets); the all-apps ML Kit penetration table and per-category "≥50K installs" columns were egress-blocked this run and are estimated, not sourced.*

---

## The problem

The job, stated as a developer's job under a deadline: *"Ship an ML Kit feature that doesn't hang forever on a spinner when the model isn't there yet — and tell the user something honest while they wait."* The customer is an Android IC; the competing solution is their own retry loop.

Unbundled ML Kit models — translation, entity extraction, subject segmentation, and the thin face-detection module — are not in the APK. They download on first use via Google Play services. This is the right call for APK size (Google Play's own figure: ~6 MB of growth costs ~1% of install conversion). But the app that triggers the download is given almost nothing to observe. For classic models the entire surface is a boolean: `RemoteModelManager.isModelDownloaded()` returns `Task<Boolean>`, and `download()` returns a fire-and-forget `Task<Void>`. There is **no `DOWNLOADING` state, no progress, and no distinguishable failure reason.** So the app catches `MlKitException.UNAVAILABLE`, kicks a download, and waits. If the device is offline the download silently never starts, and the app cannot tell "downloading, 40%" apart from "will never arrive." The GenAI APIs are slightly better — `checkFeatureStatus()` returns a four-value enum and `downloadFeature()` fires a byte-count callback — but the callback reports cumulative bytes with **no total denominator**, so the docs themselves recommend an *indeterminate* progress bar, and it covers only Gemini Nano, not arbitrary models.

This is structural, not a bug. A 100M+ install app operates under constraints a small app doesn't: it can't bundle every model (install-conversion tax), it can't assume network (Google's own figure: more than half of Indian and Indonesian Android users have no wifi), and its ML people are server-side while its Android people aren't ML people. So the one thing it needs from the platform is a *contract about delivery it can reason about in the client* — exactly the thing that requires both skills in one head, and therefore exactly the thing a platform should absorb. What they do instead today is hand-roll a poll-and-hope loop and file bugs when it fails on a specific device they can't reproduce.

Note which idea *type* this is, because the same problem admits several and the choice is the interesting decision. Type B would add a richer status enum to the existing check. Type C would make the SDK handle retries so the app never asks. Type E — the one I'm recommending — commits to an **observable state machine plus a delivery contract**. I pick E over B/C because the pain in the evidence is not "the enum is thin," it's "I cannot *observe* what is happening and I cannot tell a slow download from a dead one." That is a state-machine gap, not an ergonomics gap.

---

## Proof & signals

- **Developers doing it by hand (direct, dated, verbatim):** [googlesamples/mlkit #315](https://github.com/googlesamples/mlkit/issues/315), opened 21 June 2021 by G00fY2, now closed with nothing shipped — *"there is still no way to get availability and download status of the unbundled standard ML Kit models… Currently we keep the analyzer alive when a `MlKitException.UNAVAILABLE` exception occurs and hope for the Play Services to eventually download the model. But if the user is offline e.g. this won't happen at all and we have no indicator about that."* **I fetched and confirmed this issue directly.** It explicitly references an even older request, [firebase-android-sdk #47](https://github.com/firebase/firebase-android-sdk/issues/47) (25 Sept 2018), closed *as not planned*.
- **The pain recurs across surfaces and years** (all in googlesamples/mlkit): [#405](https://github.com/googlesamples/mlkit/issues/405) "check if a translate model is downloaded" (Dec 2021); [#740](https://github.com/googlesamples/mlkit/issues/740) "Translation model files not found… delete the models and retry" (Oct 2023, **still open**); [#829](https://github.com/googlesamples/mlkit/issues/829) segmentation "Please wait" that never resolves (Jun 2024); [#760](https://github.com/googlesamples/mlkit/issues/760) face detection "Local version is 0 and remote version is 0" on Android 14 (Dec 2023); [#308](https://github.com/googlesamples/mlkit/issues/308) (May 2021) and [#59](https://github.com/googlesamples/mlkit/issues/59) (Feb 2019) same silent failure. Four model families, 2018→2024.
- **Someone charging money for it:** *None found, and that is honest and expected.* This is plumbing specific to Google's own delivery pipe, so no third party can sell it — which removes the strongest single demand signal the rubric prizes (willingness to pay) and is why S1 is a 4, not a 5.
- **The absence signal:** GitHub repository search for a wrapper returns **`total_count: 0`** (`mlkit model download`, `mlkit download manager`, both zero); the 1,030 `mlkit` Kotlin repos are demos and toolkits, none tracking download state. Nobody has hand-rolled a reusable solution — people re-solve it inline each time. Silence here means "not sellable and not abstractable by outsiders," which points *toward* platform ownership, not away.
- **Evidence limitation, stated plainly:** the Stack Overflow and Reddit legs could not be retrieved — both domains, plus `developers.google.com`, `appbrain.com`, and `ec.europa.eu`, were egress-blocked to the crawler this run. The GitHub and `developer.android.com` evidence (the load-bearing rows) came from **direct fetches**; the ML Kit doc enums and DMA wording rest on WebSearch excerpts of the live pages and are marked as such throughout.

---

## Why now

1. **Capability shift (shipped 2025–2026):** Android now ships a first-class, observable model-delivery state machine — but only for developer-packaged models. Play for On-device AI's [AI Delivery library](https://developer.android.com/google/play/on-device-ai) exposes `AiPackManager` + `AiPackStateUpdateListener` with states `PENDING, DOWNLOADING, TRANSFERRING, COMPLETED, FAILED, CANCELED, WAITING_FOR_WIFI, REQUIRES_USER_CONFIRMATION, NOT_INSTALLED` and real `transferProgressPercentage()`. **I fetched this page directly.** The primitive exists and is proven; it is simply not wired to the models Google delivers on the app's behalf.
2. **Competitive/regulatory shift (16 July 2026):** The European Commission's Article 6(7) specification decision, Case DMA.100220, requires Alphabet to give third-party AI services "equally effective," free access to system-level on-device AI models, model install/run, and *central model sharing*, shipping in Android 18 by **1 August 2027** (corroborated across secondary sources; the primary text was egress-blocked). This forces documented model-access APIs onto exactly this territory — a forcing function *and*, as the Case against notes, a redundancy risk.
3. **Demand shift (2025–2026):** GenAI features are now something mainstream apps actually try to ship, and every one of them must first clear `checkFeatureStatus()` and an on-demand download before showing UI. The population of apps hitting the delivery wall is growing precisely as the flagship GenAI push lands.

The why-now is real but not screaming: the underlying request is eight years old, which means it is *correct and chronically under-prioritized* rather than newly urgent. That is itself the finding — delivery observability is invisible in a demo and shows up only in production, so it loses every internal prioritization fight to something demoable. That is the opportunity.

---

## The capability gap

Be exact about the boundary. What ships today:

- **Android developer-packaged models:** full observable state machine with real percentage — `SplitInstallManager` (dynamic features), `AssetPackManager` (asset packs), `AiPackManager` (AI packs). Confirmed by direct fetch.
- **ML Kit classic unbundled models:** boolean only — `isModelDownloaded()` → `Task<Boolean>`; `download()` → `Task<Void>`. No `DOWNLOADING`, no progress, no typed failure. *This is the confirmed hole.*
- **ML Kit GenAI:** `checkFeatureStatus()` → `{UNAVAILABLE, DOWNLOADABLE, DOWNLOADING, AVAILABLE}` plus a byte-count callback with **no total** (indeterminate progress only), Nano-only.
- **Firebase model downloader:** `DownloadType` is a policy selector, not an observable lifecycle; completion is a `Task`.
- **Apple Foundation Models:** *weaker than Google* — `SystemLanguageModel.availability` is a pre-flight gate (`available` / `unavailable(.deviceNotEligible | .appleIntelligenceNotEnabled | .modelNotReady)`) with **no progress API at all**; `.modelNotReady` is opaque.
- **Qualcomm AI Hub:** build-time model fetch, no runtime delivery API. **MediaPipe/LiteRT-LM:** no load progress; [an open request (#6002)](https://github.com/google-ai-edge/mediapipe/issues/6002) asks for exactly a `setProgressListener` — confirming absence.

**The main competitor is the developer's own retry loop.** There is no rival SDK; the status quo is `isModelDownloaded()` + a polling `Handler` + a `try/catch` + a spinner. That is the thing this API replaces.

The exact gap, in one sentence: *Android ships a best-in-class observable delivery state machine, but only for models the developer packages — never for the models the platform manages, which are the ones the app cannot observe because it doesn't own the transfer.*

---

## Proposed surface

A single delivery-observability contract over Play-services-managed models, reusing the state vocabulary developers already know from `SplitInstall`/`AiPack`. Before/after (Type C wrapper on a Type E contract):

**Before (today, hand-rolled):**
```kotlin
try { translator.translate(text) }
catch (e: MlKitException) {
  if (e.errorCode == MlKitException.UNAVAILABLE) {
    translator.downloadModelIfNeeded()   // Task<Void>, fire-and-forget
    // ...now poll isModelDownloaded() on a Handler and hope; if offline, spin forever
  }
}
```

**After (proposed):**
```kotlin
ModelDelivery.of(translator).stateFlow.collect { s ->
  when (s.status) {
    ModelStatus.DOWNLOADING -> showProgress(s.bytesDownloaded, s.totalBytes)   // real %
    ModelStatus.WAITING_FOR_NETWORK -> showOfflineHint()                       // the offline case, finally observable
    ModelStatus.READY -> enableFeature()
    ModelStatus.FAILED -> showRetry(s.failureReason)                           // typed, not a bare exception
  }
}
```

- **Returns:** an observable `StateFlow<ModelDeliveryState>` with `status` (the shared enum: `NOT_AVAILABLE, DOWNLOADABLE, PENDING, DOWNLOADING, WAITING_FOR_NETWORK, READY, FAILED`), `bytesDownloaded`, `totalBytes` (the denominator GenAI lacks today), and a typed `failureReason`.
- **What it deliberately does NOT do:** it does not *guarantee* availability, does not promise a download SLO, does not schedule deferred inference, and does not expose Nano internals. It reports state; it does not sign a delivery contract with teeth. Keeping the scope to observability is what makes the Durability gate a 4 rather than a coin-flip.
- **TTFHW target: 15 minutes.** Achievable because there is no key, no new permission, and the shape mirrors an API developers have already integrated. The design constraint that enforces this: the flow must be derivable from an *existing* ML Kit client object, so adoption is one call, not an architecture change.

---

## Reach & sizing

Show the arithmetic; every input is a range because the denominator is genuinely missing.

- **Device eligibility:** classic unbundled models reach ~99% of the GMS base (API 21+); GenAI *build* floor API 26+ = **96.1%**, API 31+ = **78.8%** ([apilevels.com](https://apilevels.com/), StatCounter Apr 2026, confirmed). GenAI *runtime* is capped near ~4–5% (140M+ Nano devices, Google Apr/Jul 2026, against a ~3–4B base — my arithmetic on a Google numerator and a third-party denominator).
- **Addressable apps:** ~157K apps above 50K installs on Play (AppBrain 2024, snippet). The ~7 relevant categories plausibly cover ~35–50% → **~55K–80K apps** as SAM above the quality line. *This split is my estimate — the per-category "≥50K installs" column was egress-blocked.*
- **Install weighting:** ML Kit's download share runs **~1.4–1.5×** its app share across two independent 42matters category cuts, so the install-weighted surface is meaningfully larger than the app count implies and is concentrated in high-traffic apps — the ones whose spinners are seen most.
- **Engineering cost avoided:** modest per app (the borrow path is cheap — see S3), so the platform-test numerator here is *reliability and support-cost reduction at scale*, not engineer-weeks. This is the honest reframing: the value is fewer production incidents like #740/#760, not weeks saved per team.

**Sensitivity:** halve both soft assumptions (p_job and the category share) and SAM drops to ~14K–20K apps — still material given the 1.4–1.5× install skew, but the verdict's *strength* depends on the reliability argument, not the app count. If the only value were engineer-weeks saved, halving the inputs would flip this to a clear Shelve. It doesn't flip, because the load-bearing value is "every ML Kit feature becomes safe to ship," which the app count doesn't capture.

---

## Adoption path

1. **The hook (15 min):** drop-in replacement for the poll-and-hope loop — one `stateFlow` on a client they already have, a real progress bar in the emulator, and the offline case finally visible.
2. **First real integration:** a translation or document-scanner app replaces its bespoke retry `Handler` and ships an honest "downloading / offline / retry" UX. What it replaces: inline polling code and the associated crash-on-timeout bugs.
3. **The dependency:** once the app's download UX is driven by the platform state flow, removing it means re-implementing the offline and device-specific-failure handling by hand — which is exactly what they filed bugs about. They'd endorse the lock-in because it's the part they never wanted to own.

**First adopter:** a high-volume unbundled-model app that has already filed or starred one of these issues — a translation, scanner, or accessibility app (Envision already ships ML Kit summarization for low-vision users). **Second wave** unlocks when the same flow covers GenAI feature downloads, folding the growing Nano-app population in behind one contract.

---

## Execution plan

- **Developer preview** — *Question it answers:* do teams replace their hand-rolled loops when given the flow, and what edge cases (offline, low storage, device-specific "version 0") does it need to name? *Partners:* 3–5 apps from the issue threads. *Evidence collected:* the missing S3 number — real engineer-weeks and support tickets removed.
- **Alpha/Beta** — *Graduation condition:* the state machine covers all classic unbundled models and the GenAI download path with a *real* total-bytes denominator, verified across the device classes in #760/#59.
- **GA** — *Committed surface:* the status enum and progress fields, versioned independently of any model. Explicitly **no** availability SLO at GA.

**Org dependency, honestly:** this requires the Play services / GMS model-delivery team to expose transfer state the app process can subscribe to — that team, not ML Kit, owns the download. If they say no, ML Kit can only improve the enum on its own side (a Type B consolation), not deliver the observable transfer. That is the plan's single external yes.

---

## The case against

The strongest argument against, argued at full strength: **the platform is about to absorb this from underneath, twice over.** First, by its own roadmap — Google already built the observable state machine three times; extending it to managed models is the obvious next step someone will ship regardless, which makes this less an "idea" than a "why isn't it done." Second, and more sharply, the **DMA decision forces documented, parity-level model-access APIs onto this exact territory by 1 August 2027.** If Google must expose managed on-device models to third parties "equally effectively" anyway, a bespoke observability API risks being overtaken by the compliance API — potentially designed by legal timelines rather than DX taste.

The rebuttal, which is why the verdict is Prototype not Shelve: the DMA mandate (per the regulatory research) is about *access and parity* — install/run/share models — and does **not** appear to name *availability signalling or delivery observability* as a requirement [unverified — primary text was egress-blocked]. Access parity says rivals can *use* the model; it does not say the app can *watch it download*. That observability layer is the defensible wedge precisely because the regulation doesn't compel it and Google's compliance API may not surface it.

Which named failure mode is the live risk? **"The platform absorbed the problem underneath you"** (rubric failure mode #2) — here uniquely doubled by a regulatory clock. Not the hardware (feasibility is trivial), not a free substitute (none exists), not chicken-and-egg (single-party adoption). The mitigation is scope discipline: ship the observability contract *now*, in DX-quality form, so it defines the shape before the compliance deadline does.

---

## Kill criteria

**The single observation that would reverse this recommendation:** Google ships, or publicly commits on its Android 18 / 1 Aug 2027 DMA roadmap to, an app-observable download/progress state for managed ML Kit or Nano models. If that appears in release notes or the DMA compliance spec, this idea is already done or mooted — check the [ML Kit release notes](https://developers.google.com/ml-kit/release-notes) and the DMA developer portal each run.

**Load-bearing assumption:** the Play-services model-delivery team can and will expose transfer state to the calling app process. Everything else follows; if that's a no, the idea collapses to a thin Type B enum improvement.

**Re-check trigger if shelved:** a spike in new #740-class issues (open, unresolved, cross-device) after a GenAI-feature adoption wave, indicating the borrow path is breaking at scale — which would raise S3 and push the composite over 4.0 into Build.

---

## Fit for this team

ML Kit is the right *front door* but not the *owner*. The developer-facing API — the `stateFlow` on an ML Kit client — belongs in ML Kit, because ML Kit owns the surface developers already call and the whole point is that they don't have to learn a new one. But the *transfer state* is owned by Google Play services / the GMS delivery layer, and the AI-pack precedent lives in the Play Core / Play for On-device AI team. So the honest conclusion is a **joint surface**: ML Kit presents it, Play services provides it. If forced to one owner, ML Kit should present it and treat the Play-services dependency as the gating negotiation — because the alternative (a fourth parallel delivery API in yet another corner of the stack) is exactly the fragmentation that is this ecosystem's biggest internal risk.

---

## Open questions

- **The all-apps ML Kit penetration denominator.** Every figure recovered is category-relative (42matters); the AppBrain all-apps ML Kit table and per-category "≥50K installs" columns were egress-blocked. *Settled by:* re-running those two AppBrain fetches from an unrestricted network.
- **Does the DMA compliance spec name delivery observability?** The wedge depends on it *not* being mandated, and the primary decision text was unreachable. *Settled by:* reading Case DMA.100220's operative text directly on the EU portal.
- **Will the Play-services delivery team expose transfer state?** The plan's single external yes. *Settled by:* one scoping conversation with GMS model delivery.
- **What did closing #315 and #47 actually mean?** Both are closed with nothing shipped; whether "won't do" or "superseded" changes how to pitch this internally. *Settled by:* reading the close comments (the fetch confirmed closed state but not the closing rationale).

---

## Runners-up

- **On-device GenAI eval / regression harness (Type D):** Apple shipped an Evaluations framework + token counting; ML Kit ships only a prose "evaluate prompt quality" page. Strong, but reach is capped at the ~4–5% Nano base and demand evidence is thinner than the delivery pain. Lost on S1/S2.
- **On-device safety & moderation classifier (Type G):** real demand (Bumble open-sourced one; Play policy makes devs liable for output) and a minors-law clock, but dies on tunability — one classifier can't be every app's trust-and-safety policy. Parked, not killed.
- **On-device neural TTS (Type A):** genuine whitespace (Picovoice sells Orca; Apple added speech generation; Google has nothing), but fails G2 today — quality/size on the p50 device is unproven, and it's really a Type F reach problem. Reframe candidate.
- **GenAI reach-tiering to sub-8GB fleet (Type F):** addresses the 26× "defining tension," but G2 feasibility is the whole game and collapses to "ship a smaller model," which llama.cpp/MLC already do by ignoring gating. Lost on the feasibility gate.
- **Capability-detect-and-fallback boilerplate as an API (Type C):** the block every integrator writes; strong, but it partly *merges into* the recommended idea (observability is the harder half of the same boilerplate), so it's a component, not a competitor.

---

*Sources:*
- [googlesamples/mlkit #315 — On-Device Model Download API (fetched directly)](https://github.com/googlesamples/mlkit/issues/315)
- [firebase-android-sdk #47 — original 2018 request](https://github.com/firebase/firebase-android-sdk/issues/47)
- [mlkit #405](https://github.com/googlesamples/mlkit/issues/405) · [#740 (open)](https://github.com/googlesamples/mlkit/issues/740) · [#829](https://github.com/googlesamples/mlkit/issues/829) · [#760](https://github.com/googlesamples/mlkit/issues/760) · [#308](https://github.com/googlesamples/mlkit/issues/308) · [#59](https://github.com/googlesamples/mlkit/issues/59)
- [mediapipe #6002 — load progress listener request](https://github.com/google-ai-edge/mediapipe/issues/6002)
- [Play for On-device AI / AI Delivery library (fetched directly)](https://developer.android.com/google/play/on-device-ai)
- [Play Feature Delivery — SplitInstallSessionStatus](https://developer.android.com/reference/com/google/android/play/core/splitinstall/model/SplitInstallSessionStatus)
- [ML Kit RemoteModelManager](https://developers.google.com/android/reference/com/google/mlkit/common/model/RemoteModelManager)
- [Firebase custom model downloader](https://firebase.google.com/docs/ml/android/use-custom-models)
- [Apple SystemLanguageModel.availability](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.property)
- [apilevels.com — Android version distribution](https://apilevels.com/)
- [ML Kit release notes (kill-criteria watch)](https://developers.google.com/ml-kit/release-notes)
- EU DMA Case DMA.100220 (Alphabet Art. 6(7) interoperability decision, 16 July 2026) — [EU DMA developer portal](https://digital-markets-act.ec.europa.eu/developer-portal/interoperability/alphabet-specification-proceedings-interoperability-ai-services_en) *(primary text egress-blocked this run; corroborated via secondary sources)*
