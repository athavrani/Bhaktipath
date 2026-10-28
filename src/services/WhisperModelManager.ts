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
  constructor(message = 'Downloaded model failed SHA-256 verification.') {
    super(message);
    this.name = 'ModelIntegrityError';
  }
}

/**
 * Installs only explicitly requested artifacts. It never starts a download at app startup.
 * Caller must provide a private app-storage destination and a trusted manifest entry.
 */
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
    if (!/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
      throw new Error('A valid SHA-256 digest is required before downloading a model.');
    }
    if (!Number.isSafeInteger(artifact.expectedBytes) || artifact.expectedBytes <= 0) {
      throw new Error('Expected model size must be a positive safe integer.');
    }

    onProgress?.({ phase: 'checking' });
    if (await this.files.exists(destinationPath)) {
      const existingDigest = (await this.files.sha256(destinationPath)).toLowerCase();
      if (existingDigest === artifact.sha256.toLowerCase()) {
        onProgress?.({ phase: 'ready', fraction: 1 });
        return { modelId: artifact.id, filePath: destinationPath, sha256: existingDigest };
      }
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
      const digest = (await this.files.sha256(destinationPath)).toLowerCase();
      if (digest !== artifact.sha256.toLowerCase()) {
        await this.files.delete(destinationPath);
        throw new ModelIntegrityError();
      }
      onProgress?.({ phase: 'ready', fraction: 1 });
      return { modelId: artifact.id, filePath: destinationPath, sha256: digest };
    } catch (error) {
      // Remove incomplete or invalid downloads; preserve the original error for the UI.
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
