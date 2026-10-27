# BhaktiPath — Product Requirements

## Product goal
Provide an offline-first Android experience for devotional audio practice, repetition counting, synchronized lyrics, automatic lyric generation, and local session history.

## Approved product direction
- Seven dedicated destinations: Home, My Library, Practice Setup, Chanting Player, Lyrics, History & Progress, and Settings.
- Five-item bottom navigation: Home, Library, Practice, History, Settings.
- Chanting Player and Lyrics open as dedicated stack screens from the relevant workflow.
- While audio is playing, the player must show the matching lyric line and upcoming lines so the user can read and chant in real time.
- Automatic lyric generation uses a hybrid approach: evaluate local and optional cloud transcription. Generated content must be reviewed before acceptance.
- Audio playback, saved lyrics, highlighting, repetition tracking, and session history remain available offline after setup/import.

## Primary user journey
1. Open Home and choose a recent practice or open My Library.
2. Select a recording or open Practice Setup.
3. Set a prayer name and repetition target.
4. Choose existing lyrics, import timestamped LRC, or request lyric generation.
5. Review and correct generated lyrics and timestamps before saving.
6. Open Chanting Player; the current lyric line and upcoming lines are visible while audio plays.
7. Pause, resume, seek, navigate to Lyrics, or lock the screen without unintentionally resetting the session.
8. Count a repetition only after a natural full-recording completion.
9. Persist a completed session locally and review it in History & Progress.

## Functional requirements
- Local audio selection through Android's document picker.
- Repetition presets 5, 11, 21, 51, 108 and custom target 1–1080.
- Background playback and lock-screen media controls configured in the native build.
- LRC timestamp parsing, timeline validation, active lyric highlighting and auto-scroll.
- Player remains active when navigating between screens.
- Library entries associate audio metadata, saved lyrics and practice presets.
- Local history of completed sessions and basic progress summaries.
- Lyrics generation is user-triggered, language-aware, failure-tolerant, and includes an edit/review step.
- Cloud processing, if used, requires clear disclosure and explicit user action before audio is uploaded.
- No sign-in, analytics, or automatic audio upload.

## Non-functional requirements
- Core practice must work offline after app installation and local media/lyrics setup.
- UI supports Unicode scripts including Gujarati, Hindi and Sanskrit.
- Do not count the same natural completion more than once.
- Transcription results are estimates; never imply guaranteed correctness for sung devotional audio.
- Avoid bundling copyrighted audio or full prayer text without permission.
- Preserve user data during upgrades and provide clear behavior for storage failures.

## Out of scope until separately approved
Cloud sync, user accounts, community sharing, audio downloads, subscriptions, and a hosted user library.

## Acceptance criteria
- Seven destinations are accessible through the approved navigation model.
- Audio playback state survives screen navigation.
- Player shows the currently active lyric line and upcoming lines synchronized to playback position.
- Pause/resume/seek do not cause stale highlighting.
- Accepted lyrics and audio associations are available offline.
- Generated lyrics can be reviewed, edited, and saved; transcription failure does not break manual lyrics or playback.
- Completed sessions appear in local history after app restart.
- CI runs static checks/tests and creates a standalone release APK.
- Physical-device tests cover offline launch, locked-screen playback, interruptions, lyric sync, and repetition counting.
