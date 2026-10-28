export type AppUpdateResult =
  | { status: 'no-release'; currentVersion: string }
  | { status: 'up-to-date'; currentVersion: string; latestVersion: string; releaseUrl: string }
  | { status: 'update-available'; currentVersion: string; latestVersion: string; releaseUrl: string; apkDownloadUrl: string };

type ReleaseResponse = {
  tag_name?: unknown;
  html_url?: unknown;
  assets?: Array<{ name?: unknown; browser_download_url?: unknown }>;
};

function parseVersion(version: string): number[] {
  const normalized = version.trim().replace(/^[vV]/, '').split(/[+-]/, 1)[0];
  if (!/^\d+(\.\d+)*$/.test(normalized)) throw new Error(`Invalid app version: ${version}`);
  return normalized.split('.').map((part) => Number.parseInt(part, 10));
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const av = a[index] ?? 0;
    const bv = b[index] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

export async function checkForAppUpdate(
  currentVersion: string,
  request: typeof fetch = fetch,
): Promise<AppUpdateResult> {
  const response = await request('https://api.github.com/repos/athavrani/Bhaktipath/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (response.status === 404) return { status: 'no-release', currentVersion };
  if (!response.ok) throw new Error(`Could not check for updates (HTTP ${response.status}). Try again later.`);

  const release = await response.json() as ReleaseResponse;
  const tag = typeof release.tag_name === 'string' ? release.tag_name : '';
  const releaseUrl = typeof release.html_url === 'string' ? release.html_url : '';
  const latestVersion = tag.replace(/^[vV]/, '');
  if (!latestVersion || !releaseUrl) throw new Error('The latest release metadata is incomplete.');

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return { status: 'up-to-date', currentVersion, latestVersion, releaseUrl };
  }

  const apk = (release.assets ?? []).find((asset) =>
    typeof asset.name === 'string'
      && asset.name.toLowerCase().endsWith('.apk')
      && typeof asset.browser_download_url === 'string'
      && asset.browser_download_url.startsWith('https://github.com/'),
  );
  if (!apk || typeof apk.browser_download_url !== 'string') {
    throw new Error(`Version ${latestVersion} is published, but its release has no downloadable APK yet.`);
  }

  return {
    status: 'update-available',
    currentVersion,
    latestVersion,
    releaseUrl,
    apkDownloadUrl: apk.browser_download_url,
  };
}
