# ML Kit Document Structure — on-device tables, key-value, and form fields, not just OCR text

**Type:** B — Extension to a shipping API (Text Recognition v2) · **Verdict:** Prototype (developer preview) · **Opportunity: 7/10 (Solid)**
*2026-09-26 · Prepared for Android ML Kit · Evidence current as of 2026-09-26*

> A developer building a receipt scanner opens ML Kit Text Recognition, points it at an invoice, and gets back a bag of `TextBlock → Line → Element` boxes with pixel coordinates — and no idea which number is the total, which rows are line items, or where the table even is. So on a Tuesday they do what the top OSS repos do: they hand-write bounding-box geometry to rebuild columns, or bolt a local LLM onto the OCR to coax out JSON. Apple's `RecognizeDocumentsRequest` already returns tables, rows, cells, and lists on-device across the iPhone fleet. Google's only structured answer is a *paid cloud* API. Cloud vendors mark structure up **10–33× over plain OCR**.

---

## Scores

| Dimension | Score | Evidence behind it |
|---|---|---|
| **Opportunity** | 7/10 — Solid | composite 3.6 × 2 = 7.2; no gate scored exactly 3 (all gates 4), S1 not a 5, so no adjustment → 7 |
| Platform privilege (gate) | 4/5 — pass | Owns the Text Recognition surface + model + Play-Services delivery; only narrow ID-domain SDKs (BlinkID, Scandit, ABBYY) do on-device structure today, general case is server-class OSS |
| Feasibility headroom (gate) | 4/5 — pass | Single-pass vision task; TATR 28.8M / TableFormer 52M params, TEDS 0.84–0.89; Apple ships it fleet-wide on-device ([WWDC25 272](https://developer.apple.com/videos/play/wwdc2025/272/)) |
| Durability (gate) | 4/5 — pass | Extends GA, cross-platform Text Recognition; structure schema can be versioned independently of the model |
| Demand evidence (25%) | 4/5 | Paid vendor category (Textract, Azure DI, Document AI, Mindee, Veryfi, Nanonets) charges 10–33× over OCR; OSS devs hand-roll geometry or add a local LLM |
| Install-weighted reach (15%) | 3/5 | ~3% of install surface (range 1–6%); spans finance/business/productivity/travel/medical; but classic vision → ~1–2.5B devices eligible |
| Build-vs-buy-vs-borrow (20%) | 4/5 | DIY = geometry heuristics (fragile) or train+quantize LayoutLM/TATR (3+ eng-months, ML skill median Android teams lack); cloud "buy" is easy but per-page + off-device |
| Integration cost / TTFHW (15%) | 4/5 | Type B: add a structure option to an API teams already call; no new permission, modest size |
| Substitute half-life (15%) | 3/5 | 2–3 years: a general on-device VLM (Nano/Gemma multimodal) eventually absorbs "extract this table" as a prompt |
| Strategic complement (10%) | 3/5 | Matches Apple, defends Android differentiation and dev gravity — but cannibalizes Google's own paid Cloud Document AI and helps cross-platform apps (ML Kit vision is Android+iOS) |
| **Composite** | **3.6** | Prototype band (3.0–3.9): ship a preview to close the mid-tier feasibility crux and collect adoption evidence |

*Least trustworthy row: install-weighted reach. AppBrain's category and library tables were egress-blocked this run, so app counts and the install multiplier are labeled estimates, not read values.*

---

## The problem

The job is: **"I have an image of a receipt / invoice / form / ID / statement, and I need the structured data out of it — the line items, the totals, the field-value pairs — on-device, without shipping the user's financial or identity documents to a server."** The customer is an Android engineer on an expense, banking, tax, accounting, loyalty, or productivity-scanner app, under a deadline, and the competing solution is almost always their own code.

What they do *instead* today, in order of how often it appears in the wild:

1. **Call a cloud API** — AWS Textract, Azure Document Intelligence, or Google's own Cloud Document AI. This works, but it costs per page and, decisively, it sends the exact class of content (financial, medical, identity) that the app most wants to keep off the network.
2. **Hand-roll geometry on top of ML Kit OCR.** ML Kit Text Recognition v2 returns only a `Block → Line → Element → Symbol` hierarchy with bounding boxes — [confirmed against the API reference](https://developers.google.com/ml-kit/vision/text-recognition/v2): no tables, no rows/cells, no key-value pairs. So developers reconstruct structure from coordinates by hand. One OSS author describes it exactly: *"By treating document structure as a geometric problem, the system reconstructs rows, identifies table headers, and anchors column boundaries"* — and admits it *"does not support general invoice parsing or varying templates out of the box"* ([invoice-ocr](https://github.com/fadyabirached/invoice-ocr), pushed 2026-08-08).
3. **Bolt a local LLM onto the OCR** to force JSON, then write a *"brace-matching, format-tolerant parser built for the small formatting slips local models make"* ([receipt-lens](https://github.com/swapnilpkale/receipt-lens), 2026-08-16).

This is structurally produced, not an accident of tooling. A large consumer app operates under a privacy promise on high-value content (P9 in the problem atlas — Meta's own framing is that cloud AI "requires that users' requests are visible to the provider"), under per-DAU cost pressure (Duolingo filed ~400 bps of gross-margin compression as AI usage broadened), and with an org whose ML talent is server-side while its Android engineers are not ML people. Document-structure extraction sits precisely at the intersection: every one of these apps needs the same capability, none of them differentiates on *how* the table is parsed, and the median team cannot train and quantize a layout model. That is the definition of a platform problem, not an app problem.

---

## Proof & signals

**Someone charging money for it (the strongest signal — willingness to pay for a vacated capability):** an entire vendor category sells exactly the structure step OCR omits, and the market prices structure at a large premium over plain text.

- **AWS Textract:** plain text $1.50/1k pages; **Tables $15/1k; Forms $50/1k** — a ~10–33× markup for structure ([pricing](https://aws.amazon.com/textract/pricing/)).
- **Google Cloud Document AI:** OCR ~$1.50/1k up to **$30/1k for Form Parser / custom extractors**, plus hosted-processor fees ([pricing](https://cloud.google.com/document-ai/pricing)). *This is Google's own structured answer, and it is cloud and paid.*
- **Azure AI Document Intelligence:** layout ~$10/1k, **custom extraction $30–50/1k** ([pricing](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/)).
- **Veryfi:** **$500/mo floor** (~$0.08/receipt, $0.16/invoice), and it ships an [Android Lens demo](https://github.com/veryfi/veryfi-lens-receipts-android-demo) — but the actual extraction runs in Veryfi's cloud ([pricing](https://faq.veryfi.com/en/articles/3743986)). **Mindee** ≈0.088€/page ([pricing](https://www.mindee.com/pricing)); **Nanonets** from $499/mo ([receipt OCR](https://nanonets.com/ocr-api/receipt-ocr)).

**Developers doing it by hand (OSS):** the most-starred parser in the category, [receipt-parser-legacy](https://github.com/ReceiptManager/receipt-parser-legacy) (853★, Python), exists purely to add the structure OCR doesn't give. On Android specifically it's a long tail of small, recently-pushed reimplementations — [android-receipt-ocr](https://github.com/maqa544/android-receipt-ocr), [receipt-lens](https://github.com/swapnilpkale/receipt-lens), plus the iOS parallel [FoundationModelsOCR](https://github.com/AviTsadok/FoundationModelsOCR) — each independently wiring OCR + custom parsing. A crowded field of tiny duplicated efforts with no winner is a real, unmet need.

**Community voice:** a receipt-lens author states the market plainly — *"Expense trackers, inventory apps, budgeting apps, and receipt-organizer apps all need the same feature."* A widely-cited ML Kit tutorial warns that on real receipts *"to get better results, cloud version, other specialized OCR software or custom TensorFlow model are required"* ([tsh.io](https://tsh.io/blog/simple-ocr-implementation-on-android-with-googles-ml-kit)) — i.e. developers are told to leave the platform to get usable output.

**The absence signal:** there is **no open feature request for table/key-value output in the [ML Kit issue tracker](https://github.com/googlesamples/mlkit/issues).** I read this not as "no demand" but as demand expressed with feet rather than voice — the OCR contract is understood to stop at bounding boxes, so teams route around it silently. That is a weaker signal than a thread with 200 upvotes, and I mark it as such. *(Egress caveat: Stack Overflow, Reddit, and HN were blocked this run, so community-thread volume is under-counted, not absent.)*

---

## Why now

1. **A competitive shift, dated.** Apple shipped `RecognizeDocumentsRequest` at **WWDC 2025** (iOS 26): on-device extraction of tables (with cells grouped into rows), lists, paragraphs, and data entities (emails, phone numbers), 26 languages, [confirmed](https://developer.apple.com/documentation/vision/recognizedocumentsrequest) with a dedicated [recognize-tables](https://developer.apple.com/documentation/Vision/recognize-tables-within-a-document) doc. Critically it is a **Vision** API, not an Apple-Intelligence-gated one, so it runs across the supported-iPhone fleet on-device. Android has no equivalent. This is the sharpest "Apple beat Google on Android's home turf" item on the board.
2. **A capability shift.** Compact, single-pass layout/table models matured: Table Transformer (28.8M params), IBM's TableFormer (~52M, TEDS 0.84–0.89) run as a fixed-cost forward pass in the same size envelope ML Kit already ships (~4 MB/script for OCR). Structure extraction became a small-vision problem, not an LLM problem, roughly over 2024–2026.
3. **A regulatory shift, dated.** The EU's **July 2026 DMA decision** requires Alphabet to expose system-level on-device AI to third parties in **Android 18 by 1 August 2027**, at performance equivalent to Google's own services — pressure to have a credible first-party on-device answer rather than pushing developers to paid cloud.

---

## The capability gap

Exact boundary, each negative checked:

- **Google ML Kit Text Recognition v2** — on-device, but returns only `Block → Line → Element → Symbol` + bounding boxes. No structure ([ref](https://developers.google.com/ml-kit/vision/text-recognition/v2)).
- **ML Kit Document Scanner** — on-device, but emits a cleaned image/PDF only; no extracted data ([doc](https://developers.google.com/ml-kit/vision/doc-scanner)).
- **MediaPipe Tasks** — no document/layout/table/form task exists at all.
- **Google Cloud Document AI** — has full structure (Form Parser: tables + KV; invoice/receipt/ID processors) but is **cloud-only and paid** ([product](https://cloud.google.com/document-ai)).
- **AWS Textract / Azure Document Intelligence** — full structure, cloud-only, paid.
- **Apple Vision `RecognizeDocumentsRequest`** — full on-device structure, fleet-wide. **The one vendor that ships the target capability.**
- **On-device SDKs that do exist on Android** — Microblink [BlinkID](https://github.com/microblink/blinkid-android), [Scandit ID Capture](https://docs.scandit.com/sdks/android/id-capture/intro/), [ABBYY Mobile Capture](https://www.abbyy.com/en-us/mobile-capture-sdk/) — but **only for fixed-schema identity documents**, not arbitrary tables/forms. They prove on-device structure is feasible on Android *and* that people pay for it, while leaving the general case open.
- **OSS** — LayoutLMv3, Donut, Table Transformer, [PaddleOCR PP-Structure](https://github.com/PaddlePaddle/PaddleOCR) are server-class; no maintained Android on-device structured path.

So the gap is precise: **general-purpose, domain-agnostic on-device document structure is unclaimed on Android.** The main competitor a developer uses today is a **cloud API** (Textract or Document AI), not another on-device SDK.

---

## Proposed surface

A **Type B extension to Text Recognition** — a new opt-in that returns a document-structure graph in addition to the existing text hierarchy. Cross-platform (Android + iOS, matching the rest of ML Kit vision), **not Gemini-Nano-gated**, delivered as a compact vision model via Play Services.

```kotlin
val recognizer = TextRecognition.getClient(
    TextRecognizerOptions.Builder()
        .enableDocumentStructure()   // opt-in; adds the structure model
        .build()
)

val result: Text = recognizer.process(image).await()
val doc: DocumentStructure = result.documentStructure ?: return  // null if unavailable

for (table in doc.tables) {
    for (row in table.rows) {
        val cells: List<Text.Element> = row.cells    // cells map back to OCR elements
    }
}
val total = doc.keyValuePairs.firstOrNull { it.key.text.contains("Total") }?.value?.text
val lists = doc.lists          // list/list-item grouping
val paragraphs = doc.paragraphs
```

- **Inputs/outputs:** image in; `DocumentStructure` out — `tables` (rows→cells, each cell referencing existing OCR elements so text and geometry are never re-derived), `keyValuePairs`, `lists`, `paragraphs`. Layout labels only — **domain-agnostic**.
- **Model class:** a single-pass detector (TATR/TableFormer-class), int8-quantized, tens of MB, unbundled via Play Services.
- **What it deliberately does *not* do:** no semantic typing ("this is an invoice total" vs "a subtotal") — that's the app's job or a later Nano pass; no handwriting-specific model; no fixed vertical schemas (leave IDs to BlinkID-class specialists); no cloud tier.
- **TTFHW target: under 15 minutes.** Achievable because it rides an API teams already integrate — one builder flag, no new permission (camera is already granted), no API key. The only friction is the first-use model download, which reuses the existing Text Recognition download path.

---

## Reach & sizing

*All arithmetic mine; AppBrain/apilevels tables were egress-blocked, so app counts are labeled estimates.*

- **A_cat** (finance, business, productivity, shopping, travel, health, medical apps above 50K installs) ≈ **45,000–60,000** (central ~52,000), scaled off the recovered AppBrain anchor of 23,870 Tools apps above 50K.
- **p_job** (fraction plausibly needing document structure) ≈ **15–25%** (central 20%).
- **r_reach** ≈ **~99%** — the decisive input. As a *classic vision* feature it inherits essentially the whole Play-Services fleet ([apilevels](https://apilevels.com/): API 30 = 86.9% is already a floor), versus **Gemini Nano's ~3.7%** — a ~25× wider base.
- **c_ceiling** (3-yr adoption of a well-fit free SDK among eligible apps) ≈ **15–40%** (central 25%), using ML Kit barcode/text as the analogue.

**SOM ≈ 1,000–6,000 serious apps (central ~2,500).** **Install-weighted reach ≈ 1–6% of the Android app-install surface (central ~3%).** Because adoption concentrates in large apps (major banking, wallet, tax, scanner apps at 100M–1B+ installs), a capable feature plausibly lands on **~1–2.5B of 3.8B devices.** That device-touch number, not the 3% surface share, is the platform pitch — and it exists *only* because this is off the Nano gate.

**Sensitivity (half p_job, half c_ceiling):** SOM ≈ 640 apps (250–1,500); install-weighted ~0.7%; still hundreds of millions of devices. **The verdict moves from "large" to "solid," not to "negligible."** That the story survives aggressive discounting is the reason this is a real opportunity and not a demo.

---

## Adoption path

1. **The hook:** a receipt-to-line-items sample that runs in the emulator in under 15 minutes — the single most-requested job, delivered from an API the developer already has in their build.
2. **First real integration:** an expense/scanner/banking app replaces its hand-rolled geometry parser (or its per-page cloud bill) with `enableDocumentStructure()`, keeping data on-device — a privacy and cost win they can put in release notes.
3. **The dependency:** once the app's downstream logic consumes `DocumentStructure.tables`/`keyValuePairs`, removing it means rebuilding the parser. The lock-in is one they'd endorse, not resent, because it removed code they never wanted to own.

**First adopter:** an on-device-privacy-forward finance or scanner app (the [receipt-lens](https://github.com/swapnilpkale/receipt-lens)/Adobe-Scan archetype). **Second wave:** big banking and wallet apps once one visible reference ships and the mid-tier latency numbers are public.

---

## Execution plan

- **Developer preview:** answer the one open question — quantized latency/accuracy on **mid-tier** silicon (see kill criteria). Partner with 3–5 finance/scanner teams; ship tables + KV only. Graduation gate: p90 end-to-end < ~2s and structure accuracy within ~2–3 points of the f32 baseline on 2–3 reference mid-tier devices.
- **Alpha/Beta:** add lists/paragraphs; publish a device-matrix latency table; lock the `DocumentStructure` schema.
- **GA:** commit to output-schema stability versioned independently of the model, so a model refresh can't silently change a developer's parsed fields.

**Org dependency named honestly:** this competes for revenue with the **Cloud Document AI** team. That is the real internal blocker (see below), more than any engineering dependency. The model-delivery path (Play Services) and the OCR surface (ML Kit) are already owned.

---

## The case against

The strongest argument against is **strategic self-cannibalization, and it's why Apple shipped this and Google hasn't.** Apple has no cloud OCR business, so on-device document structure is pure platform differentiation for them. Google *sells* Cloud Document AI at $30/1k pages; a free on-device equivalent deflects exactly the receipts-and-invoices volume that is the paid product's bread and butter. The person who says no to this isn't an engineer — it's a P&L owner. The honest rebuttal: the deflected volume is the *privacy/offline/cost-sensitive* segment that would never have paid cloud rates anyway (they're currently hand-rolling geometry, not buying Document AI), and the strategic prize — matching Apple on a visible capability across ~1–2.5B devices — is worth more to Android than the incremental Document AI margin. But that is a bet, and it should be named as one.

The live **adoption failure mode** from the rubric is **#2, "the platform absorbs the problem underneath you"** — your *own* roadmap. As Gemini Nano multimodal (and Gemma-class small VLMs) spread, "extract this table as JSON" becomes a Prompt-API call, and a dedicated structure API looks redundant. The defense is timing and reach: Nano is at ~3.7% today and is autoregressive (slow, thermally throttled) — a compact single-pass vision model owns the full-fleet, low-latency niche for the 2–3 year window before general multimodal reach and speed catch up. That window is the whole opportunity, which is exactly why the verdict is **Prototype now**, not "wait."

The weaker case against — "a competent team just ships a TATR Gradle library" — is real for the ID-document niche (BlinkID already exists) but not for the general, quantized, fleet-wide, maintained case, which is precisely the part median Android teams can't do and Apple chose to do first-party.

---

## Kill criteria

**The single observation that would reverse this recommendation:** if a quantized TATR/TableFormer-class model exported to LiteRT/NNAPI **cannot** hit p90 < ~2s *and* hold table/KV accuracy within ~2–3 points of the f32 baseline on a p50 mid-tier device (≈Snapdragon 6-series / Dimensity 700-class, minSdk 24–26) without a thermal cliff on repeated captures — then this collapses to a flagship-only feature, which is a demo, not a platform capability, and it should be reframed as a Nano Prompt-API recipe instead.

**Load-bearing assumption:** that document structure is a *vision* task cheap enough to run full-fleet — i.e. that it does not need an LLM. Everything (reach, latency, the device-touch number, the privilege argument) rests on this. Apple's fleet-wide shipment is strong corroboration but not an Android quantized benchmark.

**Re-check trigger if shelved:** Gemini Nano (or a Gemma small-VLM) crossing ~30–40% fleet reach with sub-second multimodal structured output — at which point the Prompt API absorbs this and the dedicated API should not be built.

---

## Fit for this team

**ML Kit, specifically** — not MediaPipe, LiteRT, or Firebase AI Logic. The capability is a strict extension of an API ML Kit already owns and ships cross-platform (Text Recognition v2); the model-delivery mechanism (Play Services) is ML Kit's; and the whole value proposition is "add one flag to the OCR call you already make," which only works if it lives *in* that call. Putting it in MediaPipe (bring-your-own-model) or LiteRT (raw runtime) would recreate exactly the training-and-quantization burden that makes this a platform opportunity in the first place. Firebase AI Logic is the wrong home because its answer is cloud/hybrid, and the entire point here is on-device. The one team with a legitimate competing claim is **Cloud Document AI** — but their answer is cloud, so the on-device surface is genuinely ML Kit's to own.

---

## Open questions

- **Quantized mid-tier benchmark.** The decisive number (see kill criteria) does not exist publicly. What would settle it: export a TATR/TableFormer-class or PP-StructureV3-lightweight model to LiteRT/NNAPI and measure p50/p90 latency and TEDS/FUNSD-KV delta vs f32 on 2–3 mid-tier reference devices.
- **True install-weighted reach.** AppBrain category and library tables were egress-blocked; the ~3% surface / ~2,500-app figures are estimates. Pull AppBrain's "apps above 50K installs" per category and the ML Kit library %apps/%installs pair from an unblocked environment.
- **Community-thread volume.** SO/Reddit/HN were blocked; the demand case rests on paid vendors + OSS, and would be stronger with quantified thread counts.
- **Does the DMA July 2026 decision mandate any of this?** Worth reading the primary text — some of this may become required rather than optional in Android 18.

---

## Runners-up

- **On-device UGC moderation classifier (Type G)** — highest platform privilege and a real regulatory clock (Play liability policy P17; minors' age-assurance law live Jan 2026 P16), but **tunability kills the one-size version**: each app's safety policy differs, so a fixed classifier is often unusable. Parked, not gated-out.
- **On-device eval / regression harness for GenAI output (Type D)** — Apple already shipped an Evaluations framework, so the why-now is strong; lost on **S1 demand being hard to externally verify** (developers under-voice eval pain) and lower install-weighted "wow."
- **Reach-tiering to a smaller on-device model, not cloud (Type F)** — addresses the defining 26× reach tension, but **Firebase AI Logic already covers cloud fallback**, so the remaining gap (degrade to a *smaller local* model) is narrower than it first looks.
- **On-device neural TTS developer API (Type A)** — genuine whitespace (Picovoice Orca sells into it; Apple added speech generation), but **G1 privilege is softer** (OSS/commercial TTS is close to a Gradle dep) and it's a separate model class from ML Kit's vision/NL core.
- **Model-availability & download-state contract (Type E)** — the clearest *directly-quoted* developer pain in the ML Kit tracker (P8), but invisible in a demo and lower install-weighted reach; the better near-term win, and a strong candidate for a future run.

---

*Sources: [Apple RecognizeDocumentsRequest](https://developer.apple.com/documentation/vision/recognizedocumentsrequest) · [Apple recognize-tables](https://developer.apple.com/documentation/Vision/recognize-tables-within-a-document) · [WWDC25 session 272](https://developer.apple.com/videos/play/wwdc2025/272/) · [ML Kit Text Recognition v2](https://developers.google.com/ml-kit/vision/text-recognition/v2) · [ML Kit Document Scanner](https://developers.google.com/ml-kit/vision/doc-scanner) · [ML Kit issues](https://github.com/googlesamples/mlkit/issues) · [Cloud Document AI](https://cloud.google.com/document-ai) · [Document AI pricing](https://cloud.google.com/document-ai/pricing) · [AWS Textract pricing](https://aws.amazon.com/textract/pricing/) · [Azure Document Intelligence pricing](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/) · [Microblink BlinkID (Android)](https://github.com/microblink/blinkid-android) · [Scandit ID Capture](https://docs.scandit.com/sdks/android/id-capture/intro/) · [ABBYY Mobile Capture](https://www.abbyy.com/en-us/mobile-capture-sdk/) · [Veryfi Lens](https://www.veryfi.com/veryfi-lens/) · [Veryfi pricing](https://faq.veryfi.com/en/articles/3743986) · [Veryfi Android demo](https://github.com/veryfi/veryfi-lens-receipts-android-demo) · [Mindee pricing](https://www.mindee.com/pricing) · [Nanonets receipt OCR](https://nanonets.com/ocr-api/receipt-ocr) · [receipt-parser-legacy](https://github.com/ReceiptManager/receipt-parser-legacy) · [invoice-ocr](https://github.com/fadyabirached/invoice-ocr) · [receipt-lens](https://github.com/swapnilpkale/receipt-lens) · [android-receipt-ocr](https://github.com/maqa544/android-receipt-ocr) · [FoundationModelsOCR](https://github.com/AviTsadok/FoundationModelsOCR) · [Table Transformer](https://github.com/microsoft/table-transformer) · [Docling/TableFormer arXiv 2503.11576](https://arxiv.org/pdf/2503.11576) · [Docling arXiv 2408.09869](https://arxiv.org/html/2408.09869v4) · [SmolDocling](https://huggingface.co/ds4sd/SmolDocling-256M-preview) · [LayoutLMv3 arXiv 2308.07777](https://arxiv.org/pdf/2308.07777) · [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) · [ML Kit Prompt API / Nano](https://developer.android.com/blog/posts/ml-kit-s-prompt-api-unlock-custom-on-device-gemini-nano-experiences) · [apilevels](https://apilevels.com/) · [AppBrain categories](https://www.appbrain.com/stats/android-market-app-categories) · [aimultiple receipt OCR](https://research.aimultiple.com/receipt-ocr/) · [tsh.io ML Kit OCR](https://tsh.io/blog/simple-ocr-implementation-on-android-with-googles-ml-kit)*
