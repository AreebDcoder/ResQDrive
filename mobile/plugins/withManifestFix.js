const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure the tools namespace is declared
    if (!manifest['$']['xmlns:tools']) {
      manifest['$']['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application[0];
    // Explicitly set the value we want AND tell the merger to use it
    application['$']['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
    application['$']['tools:replace'] = 'android:appComponentFactory';

    return config;
  });
};