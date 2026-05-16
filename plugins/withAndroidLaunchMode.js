const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidLaunchMode(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application || !manifest.application[0]) {
      return config;
    }

    const application = manifest.application[0];
    if (!application.activity) {
      return config;
    }

    // Set launchMode to singleTask for all activities (or find MainActivity specifically)
    // In Expo, the main activity is usually the first one or the one with intent-filter
    application.activity.forEach((activity) => {
      const activityName = activity.$['android:name'] || '';
      // Set launchMode for MainActivity or the first activity
      if (
        activityName.includes('MainActivity') ||
        activityName === '.MainActivity' ||
        activityName === 'com.conversa.app.MainActivity' ||
        (application.activity.indexOf(activity) === 0 && !activity.$['android:launchMode'])
      ) {
        activity.$['android:launchMode'] = 'singleTask';
      }
    });

    return config;
  });
};

