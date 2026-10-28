import {
  getVerifiedWhisperModel,
  listVerifiedWhisperModels,
  requireVerifiedWhisperModel,
} from '../WhisperModelCatalog';

describe('WhisperModelCatalog', () => {
  it('does not expose any model until exact source bytes and checksum are verified', () => {
    expect(listVerifiedWhisperModels()).toEqual([]);
  });

  it('does not resolve an unverified model ID', () => {
    expect(getVerifiedWhisperModel('multilingual-tiny')).toBeUndefined();
    expect(() => requireVerifiedWhisperModel('multilingual-tiny')).toThrow('not in the verified catalog');
  });
});
