import {
  ModelIntegrityError,
  WhisperModelManager,
  type ModelDownloadPort,
  type ModelFilePort,
  type WhisperModelArtifact,
} from '../WhisperModelManager';

const artifact: WhisperModelArtifact = {
  id: 'multilingual-tiny',
  displayName: 'Multilingual Tiny',
  downloadUrl: 'https://models.example.invalid/immutable-model.bin',
  sha256: 'a'.repeat(64),
  expectedBytes: 1024,
};

describe('WhisperModelManager', () => {
  const setup = (options?: { exists?: boolean; digest?: string; downloadedDigest?: string }) => {
    let exists = options?.exists ?? false;
    let digest = options?.digest ?? '';
    const files: ModelFilePort = {
      exists: jest.fn(async () => exists),
      size: jest.fn(async () => artifact.expectedBytes),
      sha256: jest.fn(async () => digest),
      delete: jest.fn(async () => { exists = false; }),
    };
    const downloader: ModelDownloadPort = {
      download: jest.fn(async (_url, _path, progress) => {
        exists = true;
        digest = options?.downloadedDigest ?? artifact.sha256;
        progress?.(512, 1024);
      }),
      cancel: jest.fn(async () => undefined),
    };
    return { files, downloader, manager: new WhisperModelManager(files, downloader) };
  };

  it('downloads explicitly and verifies the resulting digest', async () => {
    const { manager, downloader } = setup();
    const events: string[] = [];
    const result = await manager.ensureInstalled(artifact, '/private/model.bin', (event) => events.push(event.phase));
    expect(downloader.download).toHaveBeenCalledWith(artifact.downloadUrl, '/private/model.bin', expect.any(Function));
    expect(result.sha256).toBe(artifact.sha256);
    expect(events).toEqual(['checking', 'downloading', 'verifying', 'ready']);
  });

  it('reuses a valid existing model without downloading', async () => {
    const { manager, downloader } = setup({ exists: true, digest: artifact.sha256 });
    await manager.ensureInstalled(artifact, '/private/model.bin');
    expect(downloader.download).not.toHaveBeenCalled();
  });

  it('replaces an existing file when its integrity check cannot be read', async () => {
    const { manager, files, downloader } = setup({ exists: true, digest: artifact.sha256 });
    (files.size as jest.Mock).mockRejectedValueOnce(new Error('metadata unavailable'));
    await expect(manager.ensureInstalled(artifact, '/private/model.bin')).resolves.toMatchObject({
      modelId: artifact.id,
      sha256: artifact.sha256,
    });
    expect(files.delete).toHaveBeenCalledTimes(1);
    expect(downloader.download).toHaveBeenCalledTimes(1);
  });

  it('deletes a downloaded file when its digest is incorrect', async () => {
    const { manager, files } = setup({ downloadedDigest: 'b'.repeat(64) });
    await expect(manager.ensureInstalled(artifact, '/private/model.bin')).rejects.toBeInstanceOf(ModelIntegrityError);
    expect(files.delete).toHaveBeenCalled();
  });

  it('deletes a downloaded file when its byte size is incorrect', async () => {
    const { manager, files } = setup();
    (files.size as jest.Mock).mockResolvedValueOnce(999);
    await expect(manager.ensureInstalled(artifact, '/private/model.bin')).rejects.toBeInstanceOf(ModelIntegrityError);
    expect(files.delete).toHaveBeenCalled();
  });

  it('rejects a non-HTTPS model URL before downloading', async () => {
    const { manager, downloader } = setup();
    await expect(manager.ensureInstalled({ ...artifact, downloadUrl: 'http://example.com/model.bin' }, '/private/model.bin')).rejects.toThrow('HTTPS');
    expect(downloader.download).not.toHaveBeenCalled();
  });

  it('rejects an artifact without a valid checksum before downloading', async () => {
    const { manager, downloader } = setup();
    await expect(manager.ensureInstalled({ ...artifact, sha256: 'not-a-hash' }, '/private/model.bin')).rejects.toThrow('SHA-256');
    expect(downloader.download).not.toHaveBeenCalled();
  });
});
