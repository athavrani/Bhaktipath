# Build BhaktiPath Using Only an Android Phone

You can use GitHub Actions to compile the app in the cloud; Android Studio is not required on the phone.

1. Open the repository in GitHub.
2. Tap **Actions**.
3. Choose **Android CI**.
4. Use **Run workflow** when available, or wait for the push-triggered run.
5. Open the latest run and confirm both jobs succeeded.
6. Download the `BhaktiPath-debug-apk` artifact.
7. Extract the artifact ZIP using a file manager.
8. Tap `app-debug.apk` and follow Android's install prompts.

## Troubleshooting
- If checks fail, open the failed job and read the first failing step.
- If the build job is skipped, check whether the checks job passed and whether the run was triggered by a push/manual dispatch rather than a pull request.
- If Android blocks installation, review the system prompt for installing unknown apps from that specific source.
- Background playback must be tested with the screen locked; battery optimization may affect behavior.

Do not share GitHub access tokens or signing secrets in chat or commit them to the repository.