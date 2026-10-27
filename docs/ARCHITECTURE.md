# BhaktiPath — Architecture

## Stack
- React Native and TypeScript
- Expo app configuration and prebuild
- `expo-audio` for playback and media controls
- `expo-document-picker` for selecting local recordings
- AsyncStorage for local session history
- Jest / jest-expo for domain tests
- GitHub Actions for cloud checks and Android debug APK build

## Components
- `App.tsx`: practice/history UI, app state, audio player integration and session persistence.
- `src/domain/lrc.ts`: parse timestamped lyric lines and resolve the active line.
- `src/domain/lyrics.ts`: reusable lyric timeline validation and lookup logic.
- `src/domain/repetition.ts`: duplicate-safe domain logic for natural repetition completion.
- `src/services/AudioPlaybackService.ts`: interface contract for a future decoupled playback adapter.

## Data flow
1. Document picker returns a local URI.
2. Audio player loads and plays the selected recording.
3. Player status drives elapsed time and active lyric lookup.
4. A natural completion event increments the repetition count.
5. When target is reached, the session is recorded in AsyncStorage.
6. History UI reads saved records from local storage.

## Build flow
GitHub Actions checks out the source, installs npm dependencies, aligns Expo dependencies, runs Expo Doctor, TypeScript and Jest checks, then generates Android native files and runs Gradle `assembleDebug`. The APK is uploaded as a workflow artifact for 14 days.

## Known architectural gaps
- The audio URI may reference a cache copy rather than durable app-managed storage.
- App-level completion logic relies on Expo audio status events; it needs device testing for repeat reliability.
- No database migrations or history export exist.
- Background media session behavior varies by Android version and OEM battery policy.
- The service interface is a contract, not a complete alternate playback implementation.