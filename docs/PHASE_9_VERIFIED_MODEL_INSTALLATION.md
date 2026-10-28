# Phase 9 — Verified Whisper model installation foundation

## Delivered
- Expo-backed private-storage file operations and cancellable downloads.
- HTTPS-only model transfers, progress forwarding, parent-directory creation, and non-2xx response handling.
- A fail-closed model catalog. It intentionally contains no entries until an exact immutable artifact has an independently verified SHA-256, authoritative source, and license review.
- Unit tests for catalog fail-closed behavior, digest validation, HTTPS enforcement, progress forwarding, and HTTP errors.

## Critical integration boundary
ExpoModelFilePort requires a native streaming SHA-256 provider. It intentionally does not read an entire large model into JavaScript memory to calculate a digest. Do not wire model installation into the UI until a streaming native digest provider is supplied and tested on Android.

The existing WhisperModelManager verifies the final file digest and removes invalid or partial downloads. Only pass artifacts returned by requireVerifiedWhisperModel; never construct artifact objects from arbitrary URLs or user input.

## Why the catalog is empty
No model entry is safe to ship until the team has verified the exact downloadable bytes, SHA-256 digest, license/redistribution terms, and source stability. A guessed checksum or mutable URL would undermine the model-integrity guarantee. The app must explain that on-device transcription is not ready rather than silently downloading an unverified model.

## Not yet delivered
- No production native streaming SHA-256 provider has been wired.
- No model is downloadable until the catalog is populated with verified metadata.
- No Generate Lyrics UI integration in this phase.
- Retry policy is intentionally left to the UI/coordinator layer; retries must not bypass digest verification.
- Native model load/transcription, Gujarati/Hindi quality, cancellation, memory, and offline behavior still require physical Android validation.

## Validation
CI typecheck, Jest, Expo diagnostics, and Android APK packaging validate source/build integrity only. They do not prove model inference or performance on a physical device.
