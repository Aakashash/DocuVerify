# DocuVerify — Phases 1–4: product approach

This document is a **single narrative** of *why* and *how* each phase is built. For granular requirement IDs (P1.x, P2.x, …), see **`PHASE-1-2.md`** (historical filename; content spans Phases 1–3 there and will diverge over time).

**Stack:** React Native **0.85**, Hermes, **plugin-first** document capture (no custom live camera overlay for capture).

---

## Context

**DocuVerify** (display name; native module registration remains **`FirstMobileApp`**) helps users capture **loan-related documents** on device: scan → optional quality check → optional OCR and lightweight field hints. Work is split so **capture**, **quality**, and **OCR/mapping** can evolve independently.

---

## Phase 1 — Capture pipeline & foundation

### Goals

Give users a clear path from app open to **document scan**, with correct **platform permissions** and a **navigation shell** that can grow (quality, OCR screens later).

### Approach

- **React Navigation** (**native stack**): **Home** explains the flow; **Document scan** is where capture actions live.
- **Android:** request **runtime `CAMERA`** before opening the scanner; declare **`CAMERA`** in the manifest.
- **iOS:** **`NSCameraUsageDescription`** in `Info.plist` (no `PermissionsAndroid` on iOS).
- **Root wiring:** `GestureHandlerRootView` + `SafeAreaProvider` in **`App.tsx`**; **`import 'react-native-gesture-handler'` first** in **`index.js`** so navigators and gestures behave reliably.

### What we use

| Area | Role |
|------|------|
| `@react-navigation/native`, `@react-navigation/native-stack` | Stack navigation |
| `react-native-screens` | Native-backed stack |
| `react-native-gesture-handler` | Gesture + navigator expectations |
| `react-native-safe-area-context` | Safe areas |

### Where it lives

- `App.tsx`, `index.js`, `src/navigation/`, `src/screens/HomeScreen.tsx`, `src/screens/DocumentScanScreen.tsx` (shell)
- `android/app/src/main/AndroidManifest.xml`, `ios/FirstMobileApp/Info.plist`

---

## Phase 2 — Document edges, crop, preview (native plugin)

### Goals

One **native full-screen document scanner** handles **detection, corners (where supported), and perspective crop**; the app shows a **preview** of the cropped image from a **file path** (not a second camera stack).

### Approach

- **Single dependency** for capture: **`react-native-document-scanner-plugin`** — native UI, not a JS-drawn overlay.
- Call **`DocumentScanner.scanDocument`** from **`DocumentScanScreen`** with **`ResponseType.ImageFilePath`**, **`maxNumDocuments: 1`**, and a high **`croppedImageQuality`** (e.g. 92).
- Treat **cancel** as a normal exit; **errors** and empty results → **`Alert`**.
- Preview with **`Image`** using a normalized **`file://`** URI where needed.

### What we use

| Package | Role |
|---------|------|
| `react-native-document-scanner-plugin` | Scan, crop, return image path |

### Where it lives

- `src/screens/DocumentScanScreen.tsx` (scan + preview + clear)
- `jest.setup.js` mocks the plugin so Jest never loads native scan code

**Explicitly out of scope here:** custom live edge UI (`react-native-vision-camera` + SVG/Reanimated overlay) — reserved only if the product later abandons plugin-first capture.

---

## Phase 3 — Post-capture image quality (heuristics)

### Goals

After a **successful** scan, run a **fast, offline** check on the **same cropped file** to flag likely **blur** or **wash-out / glare-ish** images, without blocking the user by default (**advisory** UX).

### Approach

- **Decouple** from the scanner: input is only a **local image path**.
- **Pipeline:** native **resize** to a modest max dimension → read bytes → **JPEG decode in JS** → **grayscale heuristics**:
  - **Blur:** variance of a **Laplacian** on interior pixels (higher ≈ sharper).
  - **Bright / glare hint:** fraction of pixels above a **high luminance** threshold (not a full “glare model”).
- Map metrics to **`summary`** (`ok`, `maybe_blurry`, `maybe_overexposed`, `needs_review`) and **copy** for the banner.
- **UX:** optional **“Checking image quality…”**; if not `ok`, show **Quality advisory** with **Retake** (clear + scan again) and **Use anyway** (dismiss banner). If analysis fails, show a **soft message**; preview stays.
- **Tuning:** thresholds in **`src/quality/constants.ts`** — expect **device QA** to refine.

### What we use

| Package | Role |
|---------|------|
| `@bam.tech/react-native-image-resizer` | Downscale before decode |
| `react-native-fs` | Read resized file as base64 |
| `jpeg-js` | Decode to RGBA in JS |

### Where it lives

- `src/quality/` — `assessDocumentImageQuality`, `computeQualityFromRgba`, `constants`, `types`
- `src/quality/computeQualityFromRgba.test.ts` — pure math tests
- `jest.setup.js` — mocks FS + resizer

**Why heuristics, not ML here:** predictable, explainable, no model lifecycle; good MVP before optional on-device ML for quality.

---

## Phase 4 — OCR & loan-field hints (ML + heuristics)

### Goals

Turn the **cropped scan** into **plain text** with **on-device OCR**, then surface **best-effort loan-oriented hints** (not a credit decision or guaranteed form fill).

### Approach

**Two layers:**

1. **OCR (on-device ML)**  
   - **`@react-native-ml-kit/text-recognition`** (Google ML Kit) via **`extractTextFromDocument(imagePath)`** — normalizes **`file://`**, returns a single string.

2. **Structured hints (heuristics in TypeScript)**  
   - **`mapLoanFieldsFromText(rawText)`** applies **regex / line patterns** only — no second ML model.
   - **Structured fields today:** optional **applicant name** (lines like `Applicant:` / `Name:`), **emails**, **US-style phones**, **date-like tokens**, plus **disclaimer notes**.
   - **Intentionally not promoted** to structured rows: **dollar amounts** and **SSN** (sensitive / policy); they may still appear in **full OCR text** for manual review.

**UX / navigation**

- After scan + preview (and quality pass completes), user taps **“Extract text for loan application”** → **`LoanExtraction`** screen with **`imagePath`** + **`displayUri`**.
- Screen runs OCR → mapping → shows **suggested fields**, **notes**, **retry** on failure, and **selectable full OCR text**.

**Testing**

- Jest **mocks** `@react-native-ml-kit/text-recognition`; **`mapLoanFieldsFromText`** is unit-tested without native OCR.

### What we use

| Package | Role |
|---------|------|
| `@react-native-ml-kit/text-recognition` | On-device text recognition |

### Where it lives

- `src/ocr/extractTextFromDocument.ts`
- `src/loan/mapLoanFieldsFromText.ts`, `src/loan/types.ts`, `src/loan/mapLoanFieldsFromText.test.ts`
- `src/screens/LoanExtractionScreen.tsx`
- `src/navigation/types.ts`, `RootNavigator.tsx` — `LoanExtraction` route params

**Alternatives not chosen for v1:** cloud OCR (compliance / network), Tesseract-in-JS (bundle/Hermes friction), custom native OCR.

---

## Cross-cutting engineering (not tied to one phase)

| Topic | Approach |
|--------|-----------|
| **Display name vs native name** | Launcher / plist **DocuVerify**; `app.json` **`name`** stays **`FirstMobileApp`** so `MainActivity` / `AppDelegate` / `AppRegistry` stay aligned. |
| **Sideloadable debug APK** | `react { debuggableVariants.set([]) }` in `android/app/build.gradle` so **debug** builds **embed the JS bundle** (no Metro/USB required for a shared `…-debug.apk`). |
| **APK filename** | Gradle reads **`app_name`** from `strings.xml` → outputs e.g. **`DocuVerify-debug.apk`**. |
| **iOS** | Same JS; native pods include scanner, resizer, ML Kit, etc. **`pod install`** on a Mac after dependency changes. |

---

## Suggested implementation order (onboarding)

1. Dependencies + permissions (Phase 1–2).  
2. Navigator + Home + Document scan + scanner + preview.  
3. Quality module + wire on scan success (Phase 3).  
4. ML Kit OCR + loan mapper + `LoanExtraction` screen + navigation (Phase 4).  
5. Jest mocks + unit tests for pure logic; device QA on Android (and iOS when available).

---

## Out of scope (later product / backend)

- Submitting documents or OCR JSON to a **server**, **e-sign**, **KYC vendor** integration, or **model training** for quality/OCR.
- **Guaranteed** field accuracy or **auto-fill** of loan applications without human review.

---

## Risks (short)

| Risk | Mitigation |
|------|------------|
| Scanner / ML Kit **differs by OS** | Test both platforms; read plugin + ML Kit release notes. |
| Phase 3 **thresholds** vary by paper/light | Advisory UX; tune `constants.ts` with real scans. |
| OCR **garbage in → wrong hints** | Disclaimers; full raw text; no auto-submit. |
| **PII** in OCR output | Avoid promoting SSN/amounts into structured cards; educate users on sharing APKs/screenshots. |
| **APK size / debug vs release** | Use release + Play **AAB** for distribution when ready; optional ABI splits. |

---

## Doc map

| File | Purpose |
|------|---------|
| **`PHASES-1-4-APPROACH.md`** (this file) | End-to-end approach Phases 1–4 |
| **`PHASE-1-2.md`** | Original phased requirements + Phase 3 detail (Phase 4 line may be stale vs repo) |

When Phase 4 requirements are frozen in checklist form, you can extend **`PHASE-1-2.md`** or add **`PHASE-4.md`** and link it here.
