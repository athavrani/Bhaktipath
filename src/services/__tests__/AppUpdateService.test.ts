import { checkForAppUpdate, compareVersions } from '../AppUpdateService';

function response(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('AppUpdateService', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('v1.2.0', '1.2')).toBe(0);
    expect(compareVersions('1.1.9', '1.2.0')).toBeLessThan(0);
  });

  it('reports the current version when no public release exists', async () => {
    const result = await checkForAppUpdate('0.2.0', async () => response(404, {}));
    expect(result).toEqual({ status: 'no-release', currentVersion: '0.2.0' });
  });

  it('reports up-to-date when the latest release is not newer', async () => {
    const result = await checkForAppUpdate('0.2.0', async () => response(200, {
      tag_name: 'v0.2.0',
      html_url: 'https://github.com/athavrani/Bhaktipath/releases/tag/v0.2.0',
      assets: [],
    }));
    expect(result.status).toBe('up-to-date');
  });

  it('returns a direct APK download URL for a newer release', async () => {
    const result = await checkForAppUpdate('0.2.0', async () => response(200, {
      tag_name: 'v0.3.0',
      html_url: 'https://github.com/athavrani/Bhaktipath/releases/tag/v0.3.0',
      assets: [{
        name: 'BhaktiPath-v0.3.0.apk',
        browser_download_url: 'https://github.com/athavrani/Bhaktipath/releases/download/v0.3.0/BhaktiPath-v0.3.0.apk',
      }],
    }));
    expect(result).toEqual({
      status: 'update-available',
      currentVersion: '0.2.0',
      latestVersion: '0.3.0',
      releaseUrl: 'https://github.com/athavrani/Bhaktipath/releases/tag/v0.3.0',
      apkDownloadUrl: 'https://github.com/athavrani/Bhaktipath/releases/download/v0.3.0/BhaktiPath-v0.3.0.apk',
    });
  });

  it('does not claim an update is downloadable without an APK asset', async () => {
    await expect(checkForAppUpdate('0.2.0', async () => response(200, {
      tag_name: 'v0.3.0',
      html_url: 'https://github.com/athavrani/Bhaktipath/releases/tag/v0.3.0',
      assets: [],
    }))).rejects.toThrow('no downloadable APK');
  });
});
