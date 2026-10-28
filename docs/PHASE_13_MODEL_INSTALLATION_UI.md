# Phase 13 — Explicit Whisper model installation UI

## Delivered

- Practice screen now offers an explicit, user-initiated download of the pinned multilingual Whisper Tiny artifact (~74 MiB).
- Shows transfer progress, downloaded MiB, verification status, failure detail, retry action, and cancellation.
- Model files are stored under the app's private document directory.
- Startup only checks an already-present model; it never initiates a download.
- On startup, the app verifies both expected byte count and SHA-256. Invalid local artifacts are deleted.
- Users can remove the installed model without deleting recordings or saved lyric documents.
- The installation coordinator checks HTTPS, expected byte count, and SHA-256. Failed/partial downloads are removed.
- Model installation and verification remain on-device after the initial network download; audio recordings are not uploaded.

## Runtime boundary

The model is only installed and integrity-verified. This phase intentionally does **not** enable the Generate Lyrics action or call Whisper inference. Phase 14 must connect the verified local path to `whisper.rn`, validate the model format/runtime compatibility, and convert transcription segments into editable timestamped LRC drafts.

## Validation boundary

Automated typecheck, unit tests, Expo diagnostics, and Android release APK packaging are required. They do not prove physical-device download cancellation, low-storage behavior, model loading, Gujarati/Hindi transcription quality, or memory/thermal performance. Test these on an actual Android device before release.
