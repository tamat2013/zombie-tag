// Expo OTA updates are for iOS only. Android updates itself from GitHub Releases (src/services/appUpdate.ts),
// so app.json keeps `updates.enabled: false` and the iOS build profile in eas.json turns it back on.
// Android needs a whole number that grows with every release: 1.2.3 -> 10203, plus 1 so 0.0.0 is still valid.
function versionCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch + 1;
}

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: versionCode(config.version),
  },
  updates: {
    ...config.updates,
    enabled: process.env.EXPO_IOS_OTA === '1',
  },
});
