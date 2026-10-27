# BhaktiPath

Offline-first devotional chanting app for Android, built with React Native, TypeScript and Expo.

## Phase 1 status

Phase 1 source code and a cloud Android build workflow are being assembled in this repository. **No APK should be considered available until GitHub Actions completes successfully and publishes the artifact.** The app has not yet been validated on a physical Android phone.

## Included in Phase 1

- Practice and history screens.
- Select an audio recording stored on the phone.
- Repetition presets (5, 11, 21, 51, 108) and a custom target up to 1080.
- Count repetitions when the full recording finishes naturally, and stop at the target.
- Paste LRC-style timestamped lyrics and highlight the current line.
- Store completed session history locally with AsyncStorage.
- Domain unit tests for lyrics and repetition logic.
- GitHub Actions workflow for type checks, tests, Expo diagnostics, Android prebuild and a debug APK artifact.

## Current limitations

- This is an MVP, not a production release.
- Audio selection uses the document picker with a cache copy; durable import into app-managed storage remains follow-up work.
- The user must provide timestamped lyrics that match their own recording; no recording or complete prayer text is bundled.
- A repetition means one full recording; configurable segment looping is not implemented.
- Playback interruption recovery, resume after process death, accessibility review and physical-device QA remain to be completed.
- Background playback and lock-screen controls are configured but require real-device validation.
- History is local to the app installation and may be lost if the app is uninstalled.

## Build an APK from a phone

1. Open **Actions** in this repository.
2. Select **Android CI** and choose **Run workflow** if available. A push to `main` also triggers it.
3. Wait for the workflow to finish. The build job runs only if checks pass.
4. Open the completed run and download the `BhaktiPath-debug-apk` artifact.
5. Extract the downloaded artifact ZIP on Android and install `app-debug.apk`. Android may ask you to allow installation from that source.

The debug APK is for testing. A production release needs secure release signing and a release build process. Never commit keystores or signing passwords.

## Local development

Requires Node.js, JDK 17, Android SDK and an Android device/emulator.

```bash
npm install
npx expo install --fix
npx expo-doctor
npm run typecheck
npm test
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
```

## Privacy

The app has no backend, analytics, account or network service for practice data. Audio and session history are intended to remain on the device. GitHub Actions accesses the network to install dependencies and build the app.
