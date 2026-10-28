import type { WhisperModelArtifact } from './WhisperModelManager';

/**
 * Artifact evidence is recorded in docs/PHASE_12_VERIFIED_WHISPER_TINY.md.
 * The URL is pinned to an immutable Hugging Face repository commit and the
 * SHA-256 / byte count are checked against the artifact manifest documented there.
 *
 * This establishes download integrity and licensing provenance, not language
 * accuracy or acceptable performance on every Android device.
 */
const VERIFIED_MODELS: readonly WhisperModelArtifact[] = [
  {
    id: 'whisper-tiny-multilingual',
    displayName: 'Whisper Tiny (multilingual, 74 MiB)',
    downloadUrl:
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.bin',
    sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
    expectedBytes: 77691713,
  },
];

export function listVerifiedWhisperModels(): readonly WhisperModelArtifact[] {
  return VERIFIED_MODELS.map((model) => ({ ...model }));
}

export function getVerifiedWhisperModel(modelId: string): WhisperModelArtifact | undefined {
  const model = VERIFIED_MODELS.find((candidate) => candidate.id === modelId);
  return model ? { ...model } : undefined;
}

export function requireVerifiedWhisperModel(modelId: string): WhisperModelArtifact {
  const model = getVerifiedWhisperModel(modelId);
  if (!model) {
    throw new Error(
      `Whisper model "${modelId}" is not in the verified catalog. No model can be downloaded until its source and SHA-256 are verified.`,
    );
  }
  return model;
}
