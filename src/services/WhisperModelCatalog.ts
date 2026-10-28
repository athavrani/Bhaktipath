import type { WhisperModelArtifact } from './WhisperModelManager';

/**
 * Only immutable model artifacts with a verified SHA-256 and authoritative source
 * may be added here. Do not add guessed URLs, mutable "latest" links, or checksums
 * copied from untrusted mirrors.
 *
 * The catalog intentionally ships empty until an artifact's exact bytes, license,
 * source, and digest have been independently verified and documented.
 */
const VERIFIED_MODELS: readonly WhisperModelArtifact[] = [];

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
