# BhaktiPath — Product Requirements

## Product goal
Provide an offline-first Android experience for devotional audio practice, repetition counting, synchronized lyrics, and local session history.

## Primary user journey
1. Open BhaktiPath.
2. Enter a prayer or practice name.
3. Choose a local audio recording.
4. Select a repetition target.
5. Optionally paste LRC timestamps for lyric highlighting.
6. Start playback; pause or stop as needed.
7. Count a repetition only after a natural full-recording completion.
8. Persist a completed session locally and review it in History.

## Functional requirements
- Local audio selection through Android's document picker.
- Repetition presets 5, 11, 21, 51, 108 and custom target 1–1080.
- Background playback and lock-screen media controls configured in the native build.
- LRC timestamp parsing and active lyric highlighting based on playback position.
- Local history of completed sessions.
- No sign-in, server dependency, analytics, or upload of audio/session data.

## Non-functional requirements
- Core practice should work offline after app installation and local media selection.
- UI should support Unicode scripts including Gujarati, Hindi and Sanskrit.
- Avoid counting the same natural completion more than once.
- Do not bundle copyrighted audio or full prayer text without permission.

## Out of scope for Phase 1
Segment-based looping, cloud sync, accounts, audio downloads, automatic lyric matching, production signing, and comprehensive device compatibility testing.

## Acceptance criteria
- User can select an audio file and play/pause/stop.
- User can choose a repetition target and see progress.
- A natural recording completion increments the count and repeats until target.
- Timestamped lyrics update with playback position.
- Completed sessions appear in local history after app restart.
- CI runs static checks/tests and attempts a debug APK build.
- Physical-device playback and installation tests are completed before release.