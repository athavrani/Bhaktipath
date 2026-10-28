/** Platform-neutral model installation coordinator. Native filesystem/network adapters are injected. */

export interface WhisperModelArtifact {
  id: string;
  displayName: string;
  downloadUrl: string;
  /** SHA-256 hex digest published for this exact immutable artifact. */
  sha256: string;
  expectedBytes: number;
}

export interface ModelFilePort {
  exists(path: string): Promise<boolean>;
  size(path: string): Promise<number>;
  delete(path: string): Promise<void>;
  sha256(path: string): Promise<string>;
}

export interface ModelDownloadPort {
  /** Must write to destinationPath and report byte progress where available. */
  download(
    url: string,
    destinationPath: string,
    onProgress?: (receivedBytes: number, totalBytes?: number) => void,
  ): Promise<void>;
  cancel(): Promise<void>;
}

export type ModelInstallProgress =
  | { phase: 'checking'; fraction?: number }
  | { phase: 'downloading'; fraction?: number; receivedBytes?: number; totalBytes?: number }
  | { phase: 'verifying'; fraction?: number }
  | { phase: 'ready'; fraction: 1 };

export type ModelInstallResult = {
  modelId: string;
  filePath: string;
  sha256: string;
};

export class ModelIntegrityError extends Error {
  constructor(message = 'Downloaded model failed integrity verification (size or SHA-256 mismatch).') {
    super(message);
    this.name = 'ModelIntegrityError';
  }
}

/** Installs only explicitly requested artifacts; never downloads at app startup. */
export class WhisperModelManager {
  constructor(
    private readonly files: ModelFilePort,
    private readonly downloader: ModelDownloadPort,
  ) {}

  async ensureInstalled(
    artifact: WhisperModelArtifact,
    destinationPath: string,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<ModelInstallResult> {
    if (!artifact.id.trim() || !artifact.downloadUrl.trim() || !destinationPath.trim()) {
      throw new Error('Model ID, download URL, and destination path are required.');
    }
    if (!/^https:\/\//i.test(artifact.downloadUrl)) {
      throw new Error('Whisper model downloads must use HTTPS.');
    }
    if (!/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
      throw new Error('A valid SHA-256 digest is required before downloading a model.');
    }
    if (!Number.isSafeInteger(artifact.expectedBytes) || artifact.expectedBytes <= 0) {
      throw new Error('Expected model size must be a positive safe integer.');
    }

    onProgress?.({ phase: 'checking' });
    if (await this.files.exists(destinationPath)) {
      let existingIsValid = false;
      try {
        const existingSize = await this.files.size(destinationPath);
        const existingDigest = (await this.files.sha256(destinationPath)).toLowerCase();
        existingIsValid =
          existingSize === artifact.expectedBytes &&
          existingDigest === artifact.sha256.toLowerCase();
        if (existingIsValid) {
          onProgress?.({ phase: 'ready', fraction: 1 });
          return { modelId: artifact.id, filePath: destinationPath, sha256: existingDigest };
        }
      } catch {
        // An unreadable or partially written existing file is not trusted.
      }
      // Replace stale, corrupt, or unreadable local files with a verified download.
      await this.files.delete(destinationPath);
    }

    try {
      await this.downloader.download(artifact.downloadUrl, destinationPath, (receivedBytes, totalBytes) => {
        const denominator = totalBytes && totalBytes > 0 ? totalBytes : artifact.expectedBytes;
        onProgress?.({
          phase: 'downloading',
          receivedBytes,
          totalBytes,
          fraction: Math.max(0, Math.min(1, receivedBytes / denominator)),
        });
      });
      onProgress?.({ phase: 'verifying' });
      const actualSize = await this.files.size(destinationPath);
      const digest = (await this.files.sha256(destinationPath)).toLowerCase();
      if (actualSize !== artifact.expectedBytes || digest !== artifact.sha256.toLowerCase()) {
        await this.files.delete(destinationPath);
        throw new ModelIntegrityError();
      }
      onProgress?.({ phase: 'ready', fraction: 1 });
      return { modelId: artifact.id, filePath: destinationPath, sha256: digest };
    } catch (error) {
      if (await this.files.exists(destinationPath)) await this.files.delete(destinationPath);
      throw error;
    }
  }

  async cancelDownload(): Promise<void> {
    await this.downloader.cancel();
  }

  async deleteInstalledModel(path: string): Promise<void> {
    if (await this.files.exists(path)) await this.files.delete(path);
  }
}
