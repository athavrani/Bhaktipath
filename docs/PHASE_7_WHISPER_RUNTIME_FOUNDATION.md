# Phase 7 — Whisper runtime foundation

## Scope
This phase introduces testable, platform-neutral contracts for on-device transcription and verified model installation. It does not yet ship a concrete native bridge, model catalog/download URL, or Generate Lyrics screen.

## Runtime adapter
- `WhisperOnDeviceService` implements the existing `LyricsGenerationService` contract through an injected `WhisperRuntimePort`.
- The runtime port must only be connected to the pinned `whisper.rn` package after Phase 6's Android release APK build succeeds.
- Model paths are obtained from a verifier-backed provider; the adapter will not initialize a model without a path.
- Cloud requests are rejected. There is no upload or cloud fallback.
- Output is a draft, never auto-saved. Warnings call out singing/mantra/Sanskrit accuracy limits and require user review.
- Native resources are released in a `finally` block.

## Model installation
- `WhisperModelManager` coordinates injected downloader and filesystem ports.
- Download is only triggered by an explicit caller action.
- Existing files are reused only when SHA-256 matches the manifest.
- Newly downloaded files are verified before being reported ready; invalid or partial files are deleted.
- No model URL or checksum is fabricated in this phase. A production catalog must pin an immutable source, exact model artifact, SHA-256, license, and expected size before UI enables installation.
- UI should expose progress, cancellation, retry, storage use, and deletion. Platform adapter and lifecycle integration are still required.

## Remaining work
1. Complete Phase 6 Android native build validation and merge its dependency spike only after successful packaging.
2. Implement Expo-compatible filesystem/download/hash ports and choose a verified multilingual model artifact.
3. Connect the runtime port to the actual `whisper.rn` API, including native result shape, cancellation, and release semantics.
4. Add Generate Lyrics UI, user-selected language, model install/delete flow, progress and cancellation.
5. Convert runtime segments to the existing lyric line model; require review before saving.
6. Test on physical Android devices with Gujarati and Hindi devotional recordings. Sanskrit remains unvalidated until benchmarked.

## Audio input caveat
The runtime adapter accepts a local audio URI, but this does not guarantee every format from the app's audio picker is accepted by Whisper. Validate the package's exact file decoding behavior; implement a local conversion path for unsupported formats rather than silently uploading or failing without explanation.
