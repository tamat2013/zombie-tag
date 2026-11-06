// Expo OTA updates are for iOS only. Android updates itself from GitHub Releases (src/services/appUpdate.ts),
// so app.json keeps `updates.enabled: false` and the iOS build profile in eas.json turns it back on.
module.exports = ({ config }) => ({
  ...config,
  updates: {
    ...config.updates,
    enabled: process.env.EXPO_IOS_OTA === '1',
  },
});
