# Phase 8 — Concrete whisper.rn runtime adapter

## Scope
This phase connects the Phase 7 runtime port to the pinned `whisper.rn@0.7.4` package. It does not add model downloading, a model catalog, or Generate Lyrics UI.

## Implementation
- `WhisperRnRuntime` initializes a native context with `initWhisper({ filePath })`.
- It calls `context.transcribe(audioPath, { language, onProgress })` and awaits the documented `{ result, segments, isAborted }` result.
- Native segment timestamps `t0`/`t1` are interpreted as seconds and converted to the app's millisecond model.
- It maps native progress percentages to the service contract's 0–1 fraction.
- It normalizes absolute paths to `file://` URIs while preserving existing `file://` and `content://` URIs.
- Cancellation delegates to the active native task's `stop()`; cleanup calls context `release()` and is idempotent.
- The adapter is injectable for Jest tests, so tests do not load native JSI.

## Constraints
- Use a multilingual Whisper model for Gujarati/Hindi; English-only models such as `tiny.en` are not suitable for those languages.
- This adapter does not convert MP3/AAC/FLAC to WAV. Before enabling the UI for arbitrary picker files, confirm the exact `whisper.rn` audio decoder behavior on Android and add a local conversion step for unsupported formats. Never upload audio as a fallback.
- Native timestamps are segment-level, not guaranteed word-level alignment. Generated output remains an unreviewed draft.
- Sanskrit is a test target, not a guaranteed supported/accurate language.
- Unit tests verify the adapter's contract with a mocked native API. They do not prove real device inference, native cancellation behavior, model compatibility, or performance.

## Validation gates
1. TypeScript and Jest pass in CI.
2. Expo diagnostics and Android release APK packaging pass.
3. A physical Android device initializes a verified multilingual model and transcribes local Gujarati/Hindi recordings.
4. Test cancellation, release, long recordings, app backgrounding, low memory, and unsupported audio formats before enabling this workflow in the UI.

## API reference
The adapter follows the `whisper.rn` public usage documented in its README: `initWhisper`, `WhisperContext.transcribe`, task `stop()`, result `promise`, and context `release()`.

- https://github.com/mybigday/whisper.rn
- https://www.npmjs.com/package/whisper.rn
