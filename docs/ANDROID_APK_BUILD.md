# Android APK Build

## Automated build
The `Android CI` workflow runs on pushes to `main` and supports manual dispatch.

1. The checks job installs dependencies and aligns Expo SDK packages.
2. Expo Doctor, TypeScript and Jest checks run.
3. If checks pass on a push/manual run, the Android job installs JDK 17 and Android SDK tools.
4. Expo prebuild generates the native Android project.
5. Gradle runs `assembleDebug`.
6. The workflow uploads `BhaktiPath-debug-apk` for 14 days.

## Download on Android
1. Open the repository's Actions tab.
2. Open a completed successful run.
3. Download the `BhaktiPath-debug-apk` artifact.
4. Extract the ZIP and install `app-debug.apk`.
5. If prompted, allow installation from the browser/file manager used to open the APK.

## Important
A successful workflow and visible artifact are required before claiming an APK exists. A debug APK is for testing only. Production distribution requires release signing, protected credentials, versioning, and additional QA. Do not commit signing keys or passwords.