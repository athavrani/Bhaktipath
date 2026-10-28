jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    digest: jest.fn().mockResolvedValue('B'.repeat(64)),
  })),
}), { virtual: true });

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
}), { virtual: true });

import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { ExpoModelDownloadPort, ExpoModelFilePort } from '../ExpoModelAdapters';

const fs = FileSystem as jest.Mocked<typeof FileSystem>;

describe('ExpoModelFilePort', () => {
  it('uses Expo native File.digest for SHA-256 by default', async () => {
    const files = new ExpoModelFilePort();
    expect(await files.sha256('file:///models/tiny.bin')).toBe('b'.repeat(64));
    expect(File).toHaveBeenCalledWith('file:///models/tiny.bin');
    expect(((File as unknown) as jest.Mock).mock.results[0].value.digest).toHaveBeenCalledWith('SHA-256');
  });

  it('checks file existence and normalizes an injected digest', async () => {
    (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false });
    const files = new ExpoModelFilePort(async () => 'A'.repeat(64));
    expect(await files.exists('/models/tiny.bin')).toBe(true);
    expect(await files.sha256('/models/tiny.bin')).toBe('a'.repeat(64));
  });

  it('returns exact file size from native file metadata', async () => {
    (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false, size: 1234 });
    const files = new ExpoModelFilePort();
    await expect(files.size('/models/tiny.bin')).resolves.toBe(1234);
  });

  it('rejects file size lookup when metadata is unavailable', async () => {
    (fs.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false, isDirectory: false });
    const files = new ExpoModelFilePort();
    await expect(files.size('/models/missing.bin')).rejects.toThrow('Cannot determine');
  });

  it('rejects invalid digest output', async () => {
    const files = new ExpoModelFilePort(async () => 'not-a-digest');
    await expect(files.sha256('/models/tiny.bin')).rejects.toThrow('invalid SHA-256');
  });
});

describe('ExpoModelDownloadPort', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires HTTPS before creating a download', async () => {
    const downloader = new ExpoModelDownloadPort();
    await expect(downloader.download('http://example.com/model.bin', '/models/model.bin')).rejects.toThrow('HTTPS');
    expect(fs.createDownloadResumable).not.toHaveBeenCalled();
  });

  it('creates parent directories and reports download progress', async () => {
    const downloadAsync = jest.fn().mockResolvedValue({ status: 200 });
    (fs.createDownloadResumable as jest.Mock).mockImplementation((_url, _path, _options, callback) => {
      callback({ totalBytesWritten: 50, totalBytesExpectedToWrite: 100 });
      return { downloadAsync, cancelAsync: jest.fn() };
    });
    const progress: number[][] = [];
    const downloader = new ExpoModelDownloadPort();
    await downloader.download('https://example.com/model.bin', '/models/model.bin', (received, total) => {
      progress.push([received, total ?? 0]);
    });
    expect(fs.makeDirectoryAsync).toHaveBeenCalledWith('/models', { intermediates: true });
    expect(progress).toEqual([[50, 100]]);
    expect(downloadAsync).toHaveBeenCalledTimes(1);
  });

  it('rejects non-success HTTP responses', async () => {
    (fs.createDownloadResumable as jest.Mock).mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue({ status: 404 }),
      cancelAsync: jest.fn(),
    });
    const downloader = new ExpoModelDownloadPort();
    await expect(downloader.download('https://example.com/model.bin', '/models/model.bin')).rejects.toThrow('HTTP status 404');
  });
});
