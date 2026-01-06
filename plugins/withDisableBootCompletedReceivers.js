const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * This plugin ensures Android 15 compatibility for expo-audio.
 * 
 * Android 15 does not allow BOOT_COMPLETED broadcast receivers to start certain
 * foreground service types including microphone and mediaPlayback services.
 * 
 * This plugin:
 * 1. Removes any BOOT_COMPLETED receivers that might trigger expo-audio services
 * 2. Ensures the tools namespace is present for manifest merging
 * 
 * Note: The expo-audio services themselves have been patched via patch-package
 * to gracefully handle ForegroundServiceStartNotAllowedException on Android 15+.
 */
module.exports = function withDisableBootCompletedReceivers(config) {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const { manifest } = androidManifest;

        if (!manifest.application || !manifest.application[0]) {
            return config;
        }

        const application = manifest.application[0];

        // Ensure tools namespace is present for any tools: attributes
        if (!manifest.$['xmlns:tools']) {
            manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        // Remove any receivers that listen for BOOT_COMPLETED
        // This prevents any background trigger of audio services after device reboot
        if (application.receiver) {
            const originalCount = application.receiver.length;
            application.receiver = application.receiver.filter((receiver) => {
                const receiverName = receiver.$['android:name'] || '';

                // Check if this receiver has BOOT_COMPLETED intent-filter
                if (receiver['intent-filter']) {
                    const hasBootCompleted = receiver['intent-filter'].some((intentFilter) => {
                        if (intentFilter.action) {
                            return intentFilter.action.some((action) =>
                                action.$['android:name'] === 'android.intent.action.BOOT_COMPLETED'
                            );
                        }
                        return false;
                    });

                    if (hasBootCompleted) {
                        console.log(`[withDisableBootCompletedReceivers] Removing BOOT_COMPLETED receiver: ${receiverName}`);
                        return false; // Remove this receiver
                    }
                }

                return true; // Keep this receiver
            });

            if (originalCount !== application.receiver.length) {
                console.log(`[withDisableBootCompletedReceivers] Removed ${originalCount - application.receiver.length} BOOT_COMPLETED receivers`);
            }
        }

        // Note: We no longer remove expo-audio services as they have been patched
        // to handle Android 15 foreground service restrictions gracefully.
        // The services will catch ForegroundServiceStartNotAllowedException and
        // fall back to regular notifications when started from restricted contexts.

        console.log('[withDisableBootCompletedReceivers] Plugin applied - BOOT_COMPLETED receivers filtered');
        return config;
    });
};
