# BhaktiPath — Architecture

## Stack
- React Native and TypeScript
- Expo app configuration and prebuild
- `expo-audio` for playback and media controls
- `expo-document-picker` for selecting local recordings
- AsyncStorage for current local session history; evaluate a structured local database before introducing migrations
- Jest / jest-expo for domain tests
- GitHub Actions for cloud checks and standalone Android release APK builds

## Approved navigation model
Use a native stack with five bottom-tab destinations:
- Home
- My Library
- Practice Setup (bottom tab label: Practice)
- History & Progress (bottom tab label: History)
- Settings

Chanting Player and Lyrics are dedicated stack screens opened from Practice Setup, Home, and Library. They are not separate bottom tabs. Navigation must not create a second audio player or reset playback state.

## Proposed module boundaries
- `src/navigation/`: root stack, bottom tabs and typed route parameters.
- `src/screens/HomeScreen.tsx`: dashboard and recent-practice entry points.
- `src/screens/LibraryScreen.tsx`: recordings, saved lyrics and presets.
- `src/screens/PracticeSetupScreen.tsx`: audio selection and session configuration.
- `src/screens/ChantingPlayerScreen.tsx`: playback controls, live lyrics, time and repetition progress.
- `src/screens/LyricsScreen.tsx`: lyric generation entry point, review, editing and timestamps.
- `src/screens/HistoryScreen.tsx`: completed sessions and progress.
- `src/screens/SettingsScreen.tsx`: appearance, language and storage preferences.
- `src/state/PlaybackProvider.tsx`: one player instance and shared playback/session state.
- `src/domain/lrc.ts` and `src/domain/lyrics.ts`: timestamp parsing, validation and active-line lookup.
- `src/domain/repetition.ts`: duplicate-safe natural completion logic.
- `src/services/AudioPlaybackService.ts`: playback boundary.
- `src/services/LyricsGenerationService.ts`: provider-neutral generation contract; provider implementations selected only after evaluation.
- `src/storage/`: local persistence and schema/version handling.

## Data flow
1. User selects a local recording; app stores a stable reference or imports it into app-managed storage.
2. Library metadata associates the recording with saved lyrics and optional practice presets.
3. Playback provider owns the player instance, playback status and active session.
4. Player status drives current-time lyric lookup and scrolling.
5. Natural completion passes through duplicate-safe repetition logic.
6. Completed sessions are persisted locally.
7. Optional lyric generation creates a draft; the user reviews and edits it before local persistence.
8. Accepted lyrics and timestamps are loaded locally for future offline sessions.

## Lyrics generation boundary
The app UI calls a provider-neutral interface rather than a vendor SDK directly. The interface must represent progress, cancellation where supported, language/model capability, transcription text, timestamps, errors and whether processing is local or remote. Cloud implementations must not upload without explicit user action. Generated text is untrusted draft content until reviewed.

## Build flow
GitHub Actions checks out source, installs dependencies, aligns Expo dependencies, generates app icons, runs Expo Doctor, TypeScript and Jest checks, then prebuilds Android and runs Gradle `assembleRelease`. The release APK is uploaded as a workflow artifact for 14 days.

## Known gaps to close
- Current `App.tsx` combines navigation, UI, player integration and persistence.
- Current audio URI may refer to a cache copy rather than durable app-managed storage.
- Completion behavior and background media session need physical-device testing.
- No database migrations, library model or history export exist.
- Transcription provider has not been selected; language and sung-audio quality must be benchmarked.
- Background behavior varies by Android version and OEM battery policy.
