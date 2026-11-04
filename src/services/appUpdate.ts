// Android only: looks for a newer APK on the latest GitHub Release. iOS and web never call this.
// Distribution is outside the stores, so there is no Expo OTA involved and no monthly-user cap.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isNewerVersion } from './versionCompare';

const RELEASE_API = 'https://api.github.com/repos/tamat2013/zombie-tag/releases/latest';

export type AndroidUpdate = { version: string; apkUrl: string };

// Returns null on any failure (offline, no release, private repo, bad JSON), so the game never waits on it.
export async function checkAndroidUpdate(): Promise<AndroidUpdate | null> {
  if (Platform.OS !== 'android' || __DEV__) return null;
  const current = Constants.expoConfig?.version ?? '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const release = (await res.json()) as {
      tag_name?: string;
      assets?: { name: string; browser_download_url: string }[];
    };
    const version = (release.tag_name ?? '').replace(/^v/, '');
    if (!isNewerVersion(version, current)) return null;
    const apk = release.assets?.find((asset) => asset.name.endsWith('.apk'));
    return apk ? { version, apkUrl: apk.browser_download_url } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
