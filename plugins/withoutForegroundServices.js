const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Strip foreground-service declarations contributed by expo-audio and
 * expo-location.
 *
 * The app never starts a foreground service: recording and playback happen
 * only while it is in the foreground (`allowsBackgroundRecording` and
 * `shouldPlayInBackground` are left at their default `false`, so expo-audio's
 * `useForegroundService` stays off), and location is a single
 * `getCurrentPositionAsync` call. Their presence in the merged manifest is
 * pure library baggage — but Google Play sees the permissions and demands a
 * "Foreground service permissions" declaration, which blocks app updates
 * until it is filed.
 *
 * Builds today run `gradlew bundleRelease` against the checked-in
 * android/ directory, so android/app/src/main/AndroidManifest.xml carries the
 * same `tools:node="remove"` markers. This plugin exists so a future
 * `expo prebuild` regenerates an identical manifest — keep the two in sync.
 */

const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.RECEIVE_BOOT_COMPLETED',
];

const SERVICES = [
  'expo.modules.audio.service.AudioControlsService',
  'expo.modules.audio.service.AudioRecordingService',
  'expo.modules.location.services.LocationTaskService',
];

// Permissions the project template adds but the app has no use for.
// SYSTEM_ALERT_WINDOW is a sensitive "draw over other apps" permission;
// WRITE_EXTERNAL_STORAGE is pre-scoped-storage legacy.
const UNUSED_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

module.exports = function withoutForegroundServices(config) {
  return withAndroidManifest(config, (config) => {
    const { manifest } = config.modResults;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    manifest['uses-permission'] = manifest['uses-permission'] || [];

    // Drop outright — these come from our own manifest, not a library.
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (p) => !UNUSED_PERMISSIONS.includes(p.$['android:name'])
    );

    // Library-contributed: they reappear at merge time unless explicitly removed.
    for (const name of PERMISSIONS) {
      const existing = manifest['uses-permission'].find(
        (p) => p.$['android:name'] === name
      );
      if (existing) {
        existing.$['tools:node'] = 'remove';
      } else {
        manifest['uses-permission'].push({
          $: { 'android:name': name, 'tools:node': 'remove' },
        });
      }
    }

    const application = manifest.application && manifest.application[0];
    if (!application) return config;

    application.service = application.service || [];
    for (const name of SERVICES) {
      const existing = application.service.find(
        (s) => s.$['android:name'] === name
      );
      if (existing) {
        existing.$['tools:node'] = 'remove';
      } else {
        application.service.push({
          $: { 'android:name': name, 'tools:node': 'remove' },
        });
      }
    }

    return config;
  });
};
