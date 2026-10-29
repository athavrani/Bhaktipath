# Sequential media playlists

## Requirement change

Automatic lyric generation is currently unreliable on the target device. BhaktiPath should remain useful as an offline devotional player without requiring generated lyrics.

## User workflow

1. In Practice, choose **Add audio / video files to playlist**.
2. Select multiple local files in the Android document picker.
3. BhaktiPath copies selected media into its app-private document storage and saves the playlist order locally.
4. The user can select a track, move it up/down, or remove it.
5. Starting Sadhana plays the selected track and then continues through the remaining playlist entries in order.
6. At the end of the playlist, one repetition is counted. If more repetitions were requested, playback starts again from the first playlist item. When the target is reached, the session completes.

## Media behavior

- Audio files are played normally.
- Video files are accepted as media sources for audio playback; the video picture is not displayed in this audio-first workflow. Actual codec/container support depends on Android's native playback stack and must be verified on a physical device.
- Playback is local. The app does not upload media.
- The playlist and copied media are stored in app-private storage. Removing the app removes its private files.
- If a file cannot be played on the device, remove it and add a supported format.

## Validation still required

- Verify multiple selection from the Android document picker.
- Verify supported audio formats and video-container audio playback.
- Verify track transitions with screen locked/backgrounded.
- Verify playlist persistence after app restart and handling of missing/unplayable files.
- Verify repeat count counts a complete playlist cycle rather than an individual track.

## Lyrics

Automatic transcription remains optional and separate from playlist playback. Users can continue using manual LRC editing/import, but playlist playback must not depend on transcription succeeding.
