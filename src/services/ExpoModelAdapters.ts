import * as FileSystem from 'expo-file-system/legacy';
import type { ModelDownloadPort, ModelFilePort } from './WhisperModelManager';

type DownloadResumable = ReturnType<typeof FileSystem.createDownloadResumable>;
type FileDigest = (path: string) => Promise<string>;

/**
 * Expo-backed private app-storage operations. The digest implementation is injected
 * deliberately: hashing a multi-hundred-megabyte model by loading it wholly into
 * JavaScript memory is unsafe. Production wiring must supply a native, streaming
 * SHA-256 implementation before model installation is enabled.
 */
export class ExpoModelFilePort implements ModelFilePort {
  constructor(private readonly digestFile: FileDigest) {}

  async exists(path: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && !info.isDirectory;
  }

  async delete(path: string): Promise<void> {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }

  async sha256(path: string): Promise<string> {
    const digest = await this.digestFile(path);
    if (!/^[a-f0-9]{64}$/i.test(digest)) {
      throw new Error('The native file digest provider returned an invalid SHA-256 value.');
    }
    return digest.toLowerCase();
  }
}

/** One active transfer at a time; cancelAsync is forwarded to the active task. */
export class ExpoModelDownloadPort implements ModelDownloadPort {
  private activeDownload: DownloadResumable | null = null;

  async download(
    url: string,
    destinationPath: string,
    onProgress?: (receivedBytes: number, totalBytes?: number) => void,
  ): Promise<void> {
    if (!/^https:\/\//i.test(url)) {
      throw new Error('Whisper model downloads must use HTTPS.');
    }
    if (this.activeDownload) {
      throw new Error('A Whisper model download is already in progress.');
    }

    const destinationDirectory = destinationPath.slice(0, destinationPath.lastIndexOf('/'));
    if (destinationDirectory) {
      await FileSystem.makeDirectoryAsync(destinationDirectory, { intermediates: true });
    }

    const task = FileSystem.createDownloadResumable(
      url,
      destinationPath,
      {},
      (event) => onProgress?.(event.totalBytesWritten, event.totalBytesExpectedToWrite || undefined),
    );
    this.activeDownload = task;
    try {
      const result = await task.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) {
        throw new Error(`Whisper model download failed with HTTP status ${result?.status ?? 'unknown'}.`);
      }
    } finally {
      if (this.activeDownload === task) this.activeDownload = null;
    }
  }

  async cancel(): Promise<void> {
    const task = this.activeDownload;
    if (task) {
      this.activeDownload = null;
      await task.cancelAsync();
    }
  }
}
