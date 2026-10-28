# Phase 4 — Lyrics transcription engine evaluation

## Decision status

**Decision updated after product approval:** the selected implementation direction is multilingual Whisper-family transcription on-device, using whisper.cpp through the React Native binding whisper.rn. The model/runtime is still subject to compatibility and devotional-audio benchmarking; no accuracy claim is made. See [Phase 5 integration plan](PHASE_5_WHISPER_ON_DEVICE_INTEGRATION.md). Phase 4 itself adds only the provider-neutral contract and does not upload audio or download a model.

The initial evaluation languages are Gujarati (`gu-IN`), Hindi (`hi-IN`) and Sanskrit (`sa-IN`). English (`en-US`) may be used as a control if a recording warrants it. Provider capability declarations must be verified against the specific model, region, and API version before exposing a language in the UI.

## Evidence-based shortlist

### Cloud candidate: Google Cloud Speech-to-Text

Google's official V2 supported-language table lists Gujarati (`gu-IN`) and Hindi (`hi-IN`) for certain models and regions. This establishes documented language availability, not performance on singing, mantras, Sanskrit, or line-level alignment. Validate the selected region/model combination against the current official table before implementation:
https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages

Sanskrit is not assumed supported. Do not send Sanskrit recordings under another language code as a workaround.

### Local candidate: Whisper-family multilingual model

The official Whisper model card describes multilingual speech recognition, multiple model sizes, uneven performance across languages, and possible hallucinations. It recommends evaluating a target use case before deployment:
https://github.com/openai/whisper/blob/main/model-card.md

Approved local implementation path: evaluate whisper.cpp through whisper.rn for React Native/Android. The binding requires native integration, so validate Expo prebuild compatibility and model packaging before merging runtime code. Multilingual tiny/base models are candidates, not final selections. Benchmark download size, peak memory, cold-start time, latency, thermal impact, battery use, text accuracy and timestamp quality on the target Android device.

### Required fallback

Manual text editing and LRC paste/import remain available without network access. Previously accepted lyric documents must remain usable offline.

## Benchmark protocol

1. Assemble a small, permissioned evaluation set from recordings representative of actual use: Gujarati bhajans, Hindi devotional songs, Sanskrit stotras/mantras, clear solo vocals, chorus, instrumental backing and different recording quality.
2. For each clip, prepare a human-verified transcript in the intended script. Keep a held-out set that is not used for prompt/model tuning.
3. Record clip duration, language, vocal style, background music, source quality, and whether repeated refrains occur.
4. Run each candidate with its documented recommended settings. Save raw output and settings for reproducibility; do not upload a clip to a cloud provider without explicit consent.
5. Evaluate both transcription and timestamps. Recognition quality and alignment quality are separate metrics.
6. Review failures manually, especially repeated mantras, elongated vowels, chorus overlap, Sanskrit sandhi, and text that the model appears to invent.
7. Choose a provider only if it meets the acceptance thresholds below. Otherwise ship the manual workflow and report the unsupported capability honestly.

## Scorecard

| Dimension | Measurement | Acceptance approach |
|---|---|---|
| Text accuracy | Character error rate (CER) and word error rate (WER), where tokenization is meaningful | Report per language and recording style; never rely only on an aggregate |
| Timestamp quality | Median and 90th-percentile absolute boundary error against human-reviewed line/word boundaries | Set threshold after annotating the test set; expose uncertain alignment for editing |
| Completeness | Missed/repeated line rate, including repeated refrains | No hallucinated text should be silently accepted |
| Latency | Wall-clock duration and real-time factor (processing time / audio duration) | Measure cold and warm runs on target Android hardware |
| Device impact | Peak memory, model size, battery/thermal behavior, crash rate | Must fit target devices without making playback unreliable |
| Network/cost | Bytes uploaded/downloaded, per-minute cost, timeout rate | Display cloud mode clearly; enforce request limits and handle offline failures |
| Privacy | Audio destination, retention, logging, region and deletion policy | Disclose before upload; never include audio or lyrics in app logs by default |
| Reliability | Cancellation, timeout, unsupported-language and malformed-response behavior | Every failure returns a recoverable user-facing error and preserves the source audio |

## Consent and privacy requirements

- Default mode is **on-device** if an acceptable local engine is later selected; otherwise the user explicitly chooses cloud.
- Cloud processing must be a separate, affirmative user action after showing what audio will be uploaded, which provider receives it, and applicable retention/cost information.
- No automatic local-to-cloud fallback after a local failure.
- Do not upload on opening a screen, selecting a file, or merely toggling a language.
- Keep provider credentials off-device. Any cloud integration should call a controlled backend, not embed a long-lived API key in the app.
- Transcription output is an unreviewed draft. Saving as reviewed requires the existing lyric validation/review workflow.
- Provide cancellation when supported, progress that reflects actual engine events, and a retry path that does not duplicate saved documents.

## Phase 4 gate

Before selecting an engine, attach the completed scorecard and document:
- Tested provider/model/runtime version and region.
- Tested language codes and known unsupported languages.
- Dataset composition and consent/permission basis.
- Per-language text and timestamp results.
- Target-device latency, memory and battery results for local candidates.
- Cloud cost estimate, upload path, retention and privacy review for cloud candidates.
- Decision, rationale, limitations and fallback behavior.

## Implementation added in this phase

`src/services/LyricsGenerationService.ts` defines provider capabilities, request/progress/result types and shared request validation. Cloud requests are rejected unless consent metadata is present and valid. It intentionally has no provider implementation; integration belongs to Phase 5 after the evaluation gate.
