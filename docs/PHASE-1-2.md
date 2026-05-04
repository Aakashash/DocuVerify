# Loan document capture — Phase 1–3

## Context

Mobile app (React Native **FirstMobileApp**) to capture documents for a **loan application**. **Phase 1–2** delivered **capture + native scanning** using the **plugin-first** approach (not the fully custom Vision Camera flow). **Phase 3** adds **post-capture image quality analysis** on the cropped file. **Phase 4** (OCR and loan-field mapping) remains future work.

---

## Phase 1 — Capture pipeline & foundation

### Goals

- User opens the app and can reach a **document capture** flow from a clear entry point.
- **Camera permission** is requested where required before scanning.
- **Navigation** structure supports adding more screens later (quality / OCR in later phases).

### Requirements

| ID | Requirement |
|----|-------------|
| P1.1 | Multi-screen flow: at least **Home** and **Document scan**. |
| P1.2 | **Android:** runtime **CAMERA** permission before launching the scanner (and **manifest** `uses-permission`). |
| P1.3 | **iOS:** **NSCameraUsageDescription** in `Info.plist`. |
| P1.4 | Root app wiring: **Safe area**, **GestureHandlerRootView** for navigation compatibility. |
| P1.5 | Short **UX copy** on Home explaining loan document capture; primary action navigates to scan. |

### Approach

- Use **React Navigation** (native stack) for Home → Document scan.
- **Do not** implement live custom overlay or Vision Camera in Phase 1.
- **Document scan screen** hosts the action that invokes the scanner plugin (full integration completed with Phase 2).

### Packages (Phase 1)

| Package | Role |
|---------|------|
| `@react-navigation/native` | Navigation container |
| `@react-navigation/native-stack` | Stack for Home + Document scan |
| `react-native-screens` | Native stack performance (peer for navigators) |
| `react-native-gesture-handler` | Standard with navigators; **import first** in `index.js` |
| `react-native-safe-area-context` | Already in project; wrap app for safe insets |

Optional cleanup: remove **`@react-native/new-app-screen`** if unused after replacing the template UI.

### Deliverables

- Updated **`App.tsx`**: providers + navigator.
- **`index.js`**: `import 'react-native-gesture-handler'` before other imports.
- **Screens**: Home, Document scan.
- **Android** `AndroidManifest.xml`: `CAMERA`.
- **iOS** `Info.plist`: camera usage string.

---

## Phase 2 — Document edges, adjustment, perspective crop (via plugin)

### Goals

- User runs a **native document scanner** that detects a **rectangular document**, allows **corner adjustment** where the platform/plugin supports it, and returns a **cropped, perspective-flattened** image.
- App **displays the result** (e.g. `Image` with `file://` URI on Android as needed).

### Requirements

| ID | Requirement |
|----|-------------|
| P2.1 | Invoke **`react-native-document-scanner-plugin`** from the Document scan screen (not a second competing camera stack). |
| P2.2 | Prefer **file paths** for preview (`ResponseType.ImageFilePath`) unless we switch to base64 for a specific reason. |
| P2.3 | **Single document** per run initially (`maxNumDocuments: 1` on Android) — can increase later for multi-page. |
| P2.4 | **Quality** setting for cropped output (e.g. `croppedImageQuality` in the 90–100 range). |
| P2.5 | Handle **cancel** (user closed scanner) without treating it as a hard error. |
| P2.6 | **Error** path: show a simple alert if scan throws or returns no image. |

### Approach

- **One package** drives capture + edge detection + crop: **`react-native-document-scanner-plugin`** (native UI, not a custom JS overlay).
- **Android:** plugin may expose options such as **user crop adjustment**; behavior depends on the **installed plugin version** — verify in that version’s README.
- **iOS:** uses the native scanner flow provided by the plugin; adjustment UX follows the native implementation.
- After success, show **preview** of the returned image on the Document scan screen; optional **Clear** to scan again.

### Packages (Phase 2)

| Package | Role |
|---------|------|
| `react-native-document-scanner-plugin` | Full-screen scan, document detection, corner adjust (per platform), perspective crop output |

**Not in Phase 2** (by design for “plugin first”): `react-native-vision-camera`, `react-native-reanimated`, `react-native-svg` for **custom** live edges — reserved for a later custom scanner phase if needed.

### Deliverables

- Document scan screen: **`DocumentScanner.scanDocument({ ... })`** with agreed options.
- **Preview** of `scannedImages[0]` after success.
- **Jest**: mock the plugin so unit tests do not load native code.

---

## Phase 3 — Post-capture image quality

### Goals

- After a **successful** scan, analyze the **cropped** image file (same path used for preview) for **quality signals** the user or a later pipeline can act on (e.g. blur, overexposure / glare hints).
- Keep analysis **decoupled** from the scanner plugin and from **Phase 4** OCR so each phase can ship and be tested independently.

### Requirements

| ID | Requirement |
|----|-------------|
| P3.1 | Run quality analysis **after** `scanDocument` returns a valid **file path** (no change to “single plugin” capture ownership from Phase 2). |
| P3.2 | Expose at least **one** actionable metric (e.g. **blur / sharpness**). Optional: **exposure** or **highlight / glare** heuristics if needed after tuning blur-only. |
| P3.3 | **UX:** show quality outcome on the Document scan screen (copy + visual affordance). Default to **advisory** mode: **warn** + **Retake** + **Use anyway** (or equivalent) until thresholds are validated on real devices. |
| P3.4 | **API:** small module (e.g. `assessDocumentImageQuality(path) → result`) suitable for **unit tests** without launching the native scanner. |
| P3.5 | **Jest:** cover quality logic with fixtures and/or mocks (no dependency on scan in CI). |

### Approach

- **Pipeline:** `cropped file path` → decode / sample pixels (implementation-specific) → compute metrics → map to **labels** (e.g. `ok` / `maybe_blurry`) and optional numeric scores → UI.
- **Strategy (choose in implementation):**
  - **Preferred first:** **on-device heuristics** (e.g. variance of Laplacian or gradient magnitude for blur; histogram / saturated-pixel ratio for overexposure) — works offline, fewer privacy concerns for loan images.
  - **Alternatives:** on-device ML (TFLite / custom native) for stronger generalization; **cloud APIs** only after security and compliance sign-off.
- **Performance:** profile on mid-range **Android**; move heavy work to **native** if JS path is too slow for full-resolution images (downscale for metrics if acceptable).
- **Phase 4 hook:** persist or pass through **path + quality summary** together when we add OCR so bad captures can be flagged or re-scanned.

### Packages (Phase 3)

| Package | Role |
|---------|------|
| `@bam.tech/react-native-image-resizer` | Downscale scanned JPEG **before** JS decode (memory / speed). |
| `react-native-fs` | Read resized file as **base64** from device path. |
| `jpeg-js` | Decode small JPEG to **RGBA** in JS for heuristics. |
| No change to Phase 2 | **`react-native-document-scanner-plugin`** remains the only capture path. |

### Deliverables

- Quality module with a **stable result type** (scores, flags, human-readable reasons for UI).
- **Document scan screen:** invoke quality check after success; update UI from result.
- **Tests** for quality module; CI remains green without native scan.

### Post–Phase 3 (out of scope for this doc)

- **Phase 4:** OCR and mapping to loan fields.

---

## Implementation order (implementation pass)

**Phases 1–2 (done)**

1. Add npm dependencies and run **`npm install`**; on macOS iOS: **`pod install`** in `ios/`.
2. Native permissions (Android + iOS).
3. `index.js` gesture-handler import.
4. Navigator + Home + Document scan + plugin integration + preview.
5. Jest setup + smoke test still passing.

**Phase 3 (shipped in app; tune on devices)**

6. Define quality **result type**, **UX mode** (advisory vs strict), and **copy** — see `src/quality` and Document scan screen.
7. **Blur** (Laplacian variance) + **highlight / glare** heuristic on a downscaled copy; tune `src/quality/constants.ts` on real hardware.
8. Wire **Retake** (clears + starts a new scan) / **Use anyway** on advisory banner; cancel / scan error behavior unchanged from Phase 2.
9. **Jest** covers pure metrics in `computeQualityFromRgba.test.ts`; native file + resize paths mocked in `jest.setup.js`.
10. Remaining: **device QA** (motion, harsh lighting, office fluorescent) and threshold refinement.

---

## Risks / notes

- Plugin UX differs **Android vs iOS**; manual corner behavior may not be identical on both.
- Newer plugin versions may use **Turbo Modules**; align with **React Native 0.85** / New Architecture per plugin docs.
- iOS **`pod install`** requires macOS locally; CI may only build Android.
- **Phase 3:** heuristic thresholds vary by **paper, ink, and lighting**; false positives/negatives are expected until tuned — start with **advisory** UX.
- **Phase 3:** full-resolution pixel work can be **slow** on low-end devices; consider downscaled analysis if product accepts it.
