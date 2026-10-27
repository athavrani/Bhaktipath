# BhaktiPath — Test Plan

## Automated tests
- LRC parser sorts timestamps and ignores malformed lines/metadata.
- Active lyric lookup returns the latest line at or before the current playback position.
- Lyric domain logic handles start/end boundaries and validation errors.
- Repetition domain logic rejects stale/duplicate completion events and stops at the target.
- TypeScript strict type checking.
- Expo Doctor for dependency/configuration diagnostics.

## Manual Android test matrix
| Scenario | Expected result |
|---|---|
| Select a supported local audio file | File loads and name is visible |
| Start, pause and resume | Playback state and controls remain consistent |
| Lock the screen during playback | Playback continues and media controls are available |
| Let a recording finish naturally | Count increases exactly once |
| Reach repetition target | Playback stops and completed session is saved |
| Press Stop mid-recording | No repetition is counted for the partial recording |
| Use timestamped lyrics | Active lyric follows playback time |
| Restart app | Previously completed sessions remain in History |
| Enable battery saver / OEM restrictions | Document any background playback limitation |
| Receive a call or switch audio output | Playback recovers or fails gracefully |

## Current verification status
Static syntax/config checks and direct domain assertions were performed in the working environment. The full Jest suite, Expo Doctor, Android Gradle build and physical-device tests must be confirmed by CI/device testing; do not infer success from source inspection.