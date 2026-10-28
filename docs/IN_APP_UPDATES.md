# In-app update checking

BhaktiPath Settings includes a manual **Check for updates** action. It queries the public GitHub Releases latest-release endpoint and compares the release tag with the app version in `app.json`.

## Release publishing contract

For the in-app update flow to offer a download, publish a GitHub Release with:
- a semantic version tag matching the app version, such as `v0.3.0`;
- an APK asset attached to the release, named with a `.apk` extension (for example, `BhaktiPath-v0.3.0.apk`).

The CI workflow's short-retention Actions artifact is not a permanent update channel and is not used by this checker. A newer release without an APK is reported as unavailable rather than offering a broken download.

## User experience and limitations

The app opens the release APK's direct GitHub download URL in the system browser. Android then downloads the APK; the user taps it and confirms installation. Android may require allowing installs from that browser. The app does not silently install packages, bypass Android's security prompts, or download executable updates without the user's action.

This feature requires internet access to check releases and download an update. Core chanting and locally saved data remain offline-first. Current version must be kept in sync with `app.json` when preparing a release.
