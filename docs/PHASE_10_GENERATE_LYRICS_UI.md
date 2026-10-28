# Phase 10 — Generate Lyrics workflow readiness UI

## Delivered
- Added a Generate Lyrics readiness panel in Practice.
- The panel reads the verified model catalog and displays whether a verified model is available.
- Generation stays disabled while the catalog is empty or runtime integration is incomplete.
- The UI explicitly states that audio is not uploaded and that no unverified model will be downloaded.
- Existing language selection, manual LRC editing, local draft save, and review-before-save flow remain the supported fallback.

## Deliberate safety gate
The verified catalog is currently empty. The Expo model file adapter also requires a native streaming SHA-256 provider, which is not yet wired. Therefore, this phase does not expose a fake download button, fabricated progress, or a transcription action that cannot succeed.

## Remaining work before enabling Generate
1. Implement and Android-test native streaming SHA-256.
2. Verify an exact multilingual Whisper model artifact, source, license, immutable URL, expected size, and SHA-256.
3. Add that verified artifact to the catalog.
4. Wire model installation to the UI with real progress, cancellation, cleanup, and retry states.
5. Wire the installed model path to the Whisper runtime and test native lifecycle.
6. Convert transcription output to an editable draft, validate timestamps, and require user review before saving.
7. Benchmark Gujarati and Hindi on representative devotional audio. Treat Sanskrit as a separate validation target.

## Validation boundary
CI checks and APK packaging do not establish that native transcription runs on a physical phone, works offline, or produces accurate devotional lyrics.
