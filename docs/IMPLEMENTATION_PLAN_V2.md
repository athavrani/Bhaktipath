# BhaktiPath — Approved Implementation Plan (v2)

## Scope
Implement the approved seven-page structure with five-item bottom navigation, a shared player with visible synchronized lyrics, and hybrid automatic lyrics generation. Keep audio, accepted lyrics, repetition tracking and session history offline-first.

## Phase 0 — Baseline and guardrails
- Record the known-good commit and current release workflow.
- Inspect existing source, tests, dependency versions and Android config.
- Add acceptance criteria and regression checklist.
- Do not change app behavior in this phase.

**Gate 0:** baseline source reviewed; current CI result recorded; no secrets or user data in repository.

## Phase 1 — Navigation foundation
- Add compatible React Navigation native-stack and bottom-tabs dependencies.
- Add typed routes and the seven dedicated screens.
- Move existing Practice and History behavior into the new screen structure without redesigning playback internals yet.
- Preserve the current app theme and existing functionality.
- Keep Player and Lyrics as stack screens; bottom tabs remain Home, Library, Practice, History and Settings.

**Gate 1:** Expo Doctor, TypeScript, unit tests and navigation smoke tests pass; every destination is reachable; back navigation works; no blank route.

## Phase 2 — Shared playback and live lyrics
- Establish one app-wide playback provider/service instance.
- Move audio selection, playback status, session progress and repeat logic into the shared state boundary.
- Show current lyric line and upcoming lines in the Chanting Player.
- Update active line from actual playback time, not a timer that assumes uninterrupted playback.
- Auto-scroll the active line; handle pause, resume, seek, app backgrounding and navigation.
- Retain lock-screen media controls and avoid duplicate completion events.

**Gate 2:** unit tests cover lyric boundary times and duplicate completion; manual test confirms navigation does not stop/restart audio; background/lock-screen playback and interruption behavior are tested on Android.

## Phase 3 — Lyrics data and editor
- Define a versioned lyric document model: id, audio/library association, language, source, lines with timestamps, review status, and updated time.
- Add create/edit/review screens and timestamp validation.
- Retain manual LRC import/paste as a reliable fallback.
- Store accepted lyrics locally and load them offline.
- Plan a migration rather than silently discarding existing user data.

**Gate 3:** tests cover malformed LRC, duplicate/out-of-order timestamps, Unicode, empty lyrics, duration mismatch and local persistence.

## Phase 4 — Transcription engine evaluation
- Benchmark candidate local and cloud engines against a small, representative, permissioned test set of Gujarati, Hindi and Sanskrit devotional recordings.
- Evaluate sung-word error rate qualitatively/quantitatively, timestamp quality, Android compatibility, model size, memory, latency, cost and privacy.
- Document support gaps and do not promise language or singing accuracy that was not demonstrated.
- Keep provider selection behind a provider-neutral interface.

**Gate 4:** comparison report reviewed; explicit cloud-upload consent flow designed; failure/cancellation paths specified; chosen approach fits device and cost constraints.

## Phase 5 — Automatic generation integration
- Add user-triggered Generate Lyrics flow and language selection.
- Indicate local versus cloud processing and show progress/errors.
- Generate draft text/timestamps, align when feasible, and present an editable review screen.
- Save only after user acceptance; never block ordinary playback on transcription.
- Ensure previously accepted lyrics are available offline.

**Gate 5:** mocked-provider tests pass; engine integration tests cover success, partial transcript, no speech, unsupported language, timeout, cancellation and offline failure; no upload occurs without explicit action.

## Phase 6 — Reliability and release validation
- Run dependency install, icon generation, Expo Doctor, TypeScript, Jest and release Gradle build.
- Verify the APK exists and artifact upload succeeds.
- Install on a physical Android phone and test offline launch, navigation, playback, current/upcoming lyrics, repetition counting, history persistence, screen lock, interruptions and app restart.
- Record defects and fix before release.

**Gate 6:** all required CI jobs pass and critical physical-device acceptance tests pass. A green CI build alone is not a substitute for device testing.

## Pre-push validation policy
For each implementation increment:
1. Review the current branch head and working files.
2. Make a small, scoped change.
3. Run available static checks and focused tests before pushing.
4. Review the diff and validate JSON/YAML/configuration and route/module references.
5. Push the increment and inspect the resulting GitHub Actions run.
6. If CI fails, inspect logs and fix the actual cause before proceeding.
7. Merge only after required checks pass; do not claim device verification until performed on a physical device.

## Risks and mitigations
- **Audio state lost on navigation:** one shared player/provider; regression test route transitions.
- **Incorrect sung lyrics:** draft/review step, editable timestamps and explicit limitations.
- **Cloud privacy/cost:** opt-in only, disclosure before upload, no background uploads.
- **Large local model:** benchmark package size, memory and performance before selection.
- **Local data loss:** versioned storage and migration tests.
- **Android background restrictions:** physical-device validation with lock screen and battery settings.

## Delivery order
Navigation foundation → shared player/live lyrics → lyrics data/editor → engine evaluation → generation integration → full release validation.
