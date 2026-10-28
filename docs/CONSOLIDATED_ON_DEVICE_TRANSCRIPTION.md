# Consolidated on-device transcription workflow

## Intended flow

1. The user explicitly selects a local audio recording.
2. The user explicitly downloads the multilingual Whisper Tiny artifact. The app verifies its expected byte count and SHA-256 before marking it installed.
3. The user explicitly chooses **Generate draft on this device**. The runtime rechecks the model file integrity before loading it.
4. whisper.rn transcribes the selected audio locally. There is no cloud upload or network fallback.
5. Returned timed segments are converted into editable LRC text. The app does not save the result automatically.
6. The user reviews/edits the text and timestamps, then chooses Save Draft or Review & Save.

## Boundaries and validation

- The model is downloaded only after an explicit user action; installation is cancellable and corrupt/incomplete files are deleted.
- Gujarati and Hindi are the initial languages to benchmark. English is available as a convenience. Sanskrit is not enabled for automatic generation until it receives a separate accuracy evaluation.
- Whisper is not a singing-alignment model. Transcribed words and segment timestamps can be wrong for devotional singing, music, mantras, and Sanskrit; review is mandatory.
- The selected audio URI must remain readable by the native runtime. Picker cache URIs may be temporary and users may need to reselect audio after app restart.
- CI checks, unit tests, and APK packaging do not establish real-device model load success, memory/latency, audio-format compatibility, cancellation under load, or Gujarati/Hindi accuracy. Validate those on a physical Android device before production claims.
- No generated content is automatically persisted. Cloud transcription remains disabled.
