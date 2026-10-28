# Phase 5 — On-device Whisper integration plan

## Decision

**Approved direction: use a multilingual Whisper-family model on-device first.** The target runtime is `whisper.cpp` through the React Native binding `whisper.rn`. This aligns with BhaktiPath's offline-first design and keeps user audio on the device during transcription.

This is an architecture decision, not a claim that Whisper is accurate enough for devotional singing. Do not select a final model size or advertise language support until representative recordings have been benchmarked.

References:
- whisper.cpp supports Android and lists a React Native binding: https://github.com/ggml-org/whisper.cpp
- whisper.rn React Native binding, installation and Expo prebuild guidance: https://github.com/mybigday/whisper.rn
- Whisper model card and limitations: https://github.com/openai/whisper/blob/main/model-card.md

## Candidate model strategy

1. Evaluate a multilingual `tiny` model first for lowest storage and runtime cost.
2. Compare a multilingual `base` model where device resources allow; do not use `.en` models for Gujarati, Hindi or Sanskrit.
3. Keep the model separate from the application bundle. Offer an explicit model download, show estimated size, verify the downloaded file, report progress, and allow cancellation/retry.
4. Store the installed model in app-private storage and reuse it offline. Provide a clear model deletion action to reclaim space.
5. Do not silently download a large model, consume mobile data, or upload audio.
6. Verify the model's license and source before distributing or downloading it. Pin model identifiers, checksums, and runtime versions in the implementation.

Tiny/base are benchmark candidates only; the final choice must be based on real device measurements and text quality.

## Runtime and Expo constraints

- `whisper.rn` is a native React Native module. BhaktiPath must use an Expo prebuild / native Android build, not Expo Go alone.
- Verify dependency compatibility with the repository's React Native and Expo SDK versions in CI before merging the runtime dependency.
- Keep the native module behind the existing `LyricsGenerationService` interface so the UI and saved-document model do not depend on a specific runtime.
- Treat model download, model initialization, transcription, cancellation, and cleanup as separate states.
- Do not block audio playback or the UI thread while inference runs.
- Input media may need decoding/resampling to the audio format supported by the selected binding. Inspect actual `whisper.rn` requirements and add a tested conversion step if needed; do not assume arbitrary MP3/AAC files can be passed directly.
- Capture segment timestamps from the runtime, convert units explicitly to milliseconds, and clamp/validate values before constructing lyric drafts.
- The runtime's segment timestamps are not guaranteed to be ideal karaoke line boundaries. A user must review text and timing before saving.

## Language and quality policy

- Gujarati (`gu-IN`) and Hindi (`hi-IN`) are initial benchmark targets, not a promise of accuracy.
- Sanskrit (`sa-IN`) must be tested separately. A multilingual model's existence does not prove reliable Sanskrit recognition or support for the requested script.
- Keep language selection tied to languages actually supported by the chosen runtime/model. Surface an unavailable-language message rather than silently substituting another language.
- Music, singing, chorus, elongated syllables, repeated mantras, and instrumental passages can cause omissions or hallucinations. Generated output is always an editable draft.
- Manual lyrics and LRC paste/edit remain available without model installation and with no network connection.

## Privacy and failure handling

- On-device transcription does not require cloud consent because audio stays on-device; disclose that processing occurs locally.
- Do not add cloud fallback. Any future cloud option must be separately selected and explicitly consented to.
- Never log raw audio, full transcripts, or private file paths by default.
- Preserve the source recording and existing lyric documents if download, initialization, conversion, inference, or save fails.
- A cancelled or failed operation must not create a reviewed document or increment completed chanting history.
- Show honest progress states; never simulate a percentage when the native runtime does not provide one.

## Phase 5 implementation sequence

1. Validate `whisper.rn` compatibility with Expo SDK 58 / React Native 0.88 and the existing Android release workflow.
2. Add a typed adapter implementing `LyricsGenerationService`, with injectable runtime boundary for unit tests.
3. Add explicit model management (download, checksum verification, progress, cancel, installed status, delete).
4. Add the Generate Lyrics flow: choose supported language, select on-device mode, confirm model readiness, run transcription, show draft and warnings.
5. Convert runtime segments to the app's lyric-document model without marking them reviewed.
6. Add unit tests for request validation, progress/error/cancel mapping, timestamps, unsupported language and duplicate-save prevention.
7. Build the release APK in GitHub Actions and validate installation and a permissioned test recording on a physical Android device.

## Release gates

Do not mark Phase 5 complete until:
- Android CI and APK artifact build pass with the native dependency.
- The app launches and the existing playback/player/history workflows still work.
- Model download is explicit, resumable/retryable where supported, and checksum-verified.
- A permissioned Gujarati and Hindi benchmark set has human-reviewed transcripts and a recorded scorecard.
- Sanskrit support is either independently demonstrated or clearly marked as unverified/unsupported.
- Users can review/edit generated text and timestamps before saving.
- Manual lyrics remain functional when offline and without any model installed.
- Physical-device memory, latency, heat, battery, and cancellation behavior are recorded.

