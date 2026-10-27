# BhaktiPath — Implementation Plan

## Phase 1 — MVP foundation
- React Native app shell and practice/history views.
- Local audio selection and audio playback.
- Repetition target presets and full-recording repeat behavior.
- LRC input and active lyric highlighting.
- Local completed-session history.
- Domain unit tests and Android CI workflow.

## Phase 1 verification gates
- Install dependencies successfully in CI.
- Expo Doctor completes.
- TypeScript check passes.
- Unit tests pass.
- Expo prebuild and Gradle debug APK build pass.
- Download and install APK on a physical Android phone.
- Validate screen-locked playback, pause/resume, interruptions and repetition counting.

## Phase 2 — Reliability
- Import recordings into durable app-managed storage.
- Improve playback lifecycle handling, audio-focus interruptions and process recreation.
- Add session details, delete/export history and storage error handling.
- Improve lyric editing, validation and scroll-to-active-line behavior.
- Add accessibility labels and screen-reader testing.

## Phase 3 — Product polish
- Prayer library and user-created practice presets.
- Optional segment loop start/end markers.
- Playback speed and sleep timer.
- Theme preferences and localization.
- Performance, battery and compatibility testing across Android devices.

## Release gate
Do not call the app production-ready until licensing, accessibility, privacy, crash behavior, device testing, release signing and store compliance have been reviewed.