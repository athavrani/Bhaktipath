# Phase 11 — Native SHA-256 provider for model integrity

## Delivered

- Connected `ExpoModelFilePort` to Expo SDK 58's native `File.digest('SHA-256')` API by default.
- Kept digest injection available for deterministic unit tests.
- Preserved strict 64-character hexadecimal validation and lowercase normalization.
- Added a regression test proving the default adapter constructs an Expo `File` for the supplied path and requests SHA-256.
- Did not add a third-party native dependency or a custom native module.

## Why this implementation

The app is on Expo SDK 58, whose `expo-file-system` API provides `File.digest()` for SHA-256 and other file digests. This avoids reading an entire large model into JavaScript memory. See the [Expo FileSystem SDK 58 documentation](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) and [SDK 58 changelog](https://github.com/expo/expo/blob/main/packages/expo-file-system/CHANGELOG.md).

## Safety boundaries

- The verified model catalog remains empty. This change does not authorize downloading any model.
- The UI must remain disabled until an exact artifact's immutable source, redistribution license, expected byte count, and SHA-256 are verified.
- Model installation must continue to delete partial or checksum-mismatched files.
- CI and APK packaging can verify TypeScript/tests/native compilation, but cannot prove hashing correctness on every physical device. Device-level model-file digest validation remains required before enabling model installation for users.

## Validation

Run the existing typecheck, Jest suite, Expo diagnostics, and Android release APK packaging in GitHub Actions. Merge only after all required jobs pass.
