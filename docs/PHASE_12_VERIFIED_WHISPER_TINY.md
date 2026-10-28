# Phase 12 — Verified multilingual Whisper Tiny artifact

## Decision

Add one verified candidate to the model catalog: the multilingual Whisper Tiny model in `ggml-tiny.bin`. This is the smallest unquantized multilingual artifact in the upstream whisper.cpp catalog and is a reasonable first download-size / capability candidate for on-device experimentation. It is **not yet a validated production model for BhaktiPath**.

## Pinned artifact metadata

- **Catalog ID:** `whisper-tiny-multilingual`
- **File:** `ggml-tiny.bin`
- **Upstream repository:** [ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp)
- **Immutable source URL:** https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.bin
- **Pinned upstream revision:** `5359861c739e955e79d9a303bcbc70fb988958b1`
- **Exact size:** 77,691,713 bytes (about 74.1 MiB; Hugging Face displays 77.7 MB)
- **SHA-256:** `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21`
- **License:** MIT, as stated by the upstream whisper.cpp model repository. OpenAI's Whisper README also states that its code and model weights are MIT-licensed.
- **Independent artifact manifest:** [cgerdes/whisper.cpp-mirror README](https://huggingface.co/cgerdes/whisper.cpp-mirror), which identifies this digest, byte count, and upstream commit.

## Verification basis and limitations

1. The upstream Hugging Face repository identifies itself as the collection of OpenAI Whisper models converted to ggml format for whisper.cpp, declares MIT licensing, and lists multilingual Tiny as approximately 75 MiB.
2. The independent manifest lists the exact byte count, SHA-256, and upstream revision for `ggml-tiny.bin`.
3. The download URL is pinned to that full revision rather than a mutable `main` or `latest` branch.
4. Runtime installation must still enforce exact SHA-256 and should also compare actual file size with `expectedBytes`. A checksum mismatch must fail closed and remove the downloaded file.

These checks establish a pinned source and expected bytes from published metadata; they do not constitute a fresh local hash of the downloaded 77 MB file in this development environment. The app's native SHA-256 verification is the runtime integrity check.

## Language and product validation plan

- Use this as the **first benchmark candidate**, not as an accuracy guarantee.
- Benchmark Gujarati and Hindi separately with a reviewed set of devotional recordings, including clean speech, music accompaniment, fast chanting, and varied speakers.
- Evaluate transcript accuracy, timestamps, cold-start time, real-time factor, peak memory, battery/thermal impact, and failure recovery on physical Android devices.
- Keep Sanskrit out of the initial pass/fail claim until separately evaluated.
- Generated lyrics remain an editable draft; users must review the transcript and timestamps before saving.
- Inference and audio processing must remain on-device. No audio upload or cloud fallback is introduced by this phase.

## Not included

- No claim that Gujarati/Hindi quality is sufficient for release.
- No automatic download at startup.
- No automatic transcription UI wiring or model-load call in this phase.
- No physical-device validation; CI can verify code and APK packaging only.
