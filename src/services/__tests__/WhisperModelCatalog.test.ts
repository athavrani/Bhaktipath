import {
  getVerifiedWhisperModel,
  listVerifiedWhisperModels,
  requireVerifiedWhisperModel,
} from '../WhisperModelCatalog';

describe('WhisperModelCatalog', () => {
  it('exposes the pinned multilingual Tiny artifact with its integrity metadata', () => {
    expect(listVerifiedWhisperModels()).toEqual([
      {
        id: 'whisper-tiny-multilingual',
        displayName: 'Whisper Tiny (multilingual, 74 MiB)',
        downloadUrl:
          'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.bin',
        sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
        expectedBytes: 77691713,
      },
    ]);
  });

  it('returns defensive copies so callers cannot mutate the trusted catalog', () => {
    const model = getVerifiedWhisperModel('whisper-tiny-multilingual');
    expect(model).toBeDefined();
    if (model) model.sha256 = '0'.repeat(64);
    expect(requireVerifiedWhisperModel('whisper-tiny-multilingual').sha256).toBe(
      'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
    );
  });

  it('does not resolve an unknown model ID', () => {
    expect(getVerifiedWhisperModel('unverified-model')).toBeUndefined();
    expect(() => requireVerifiedWhisperModel('unverified-model')).toThrow(
      'not in the verified catalog',
    );
  });
});
