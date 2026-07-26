const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withManifestFix(config) {
  // 1. Fix main AndroidManifest.xml via config-plugins
  config = withAndroidManifest(config, (config) => {
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

  // 2. Fix debug AndroidManifest.xml safely using withDangerousMod
  return withDangerousMod(config, [
    'android',
    async (config) => {
      try {
        const debugManifestPath = path.join(
          config.modRequest.platformProjectRoot,
          'app/src/debug/AndroidManifest.xml'
        );
        if (fs.existsSync(debugManifestPath)) {
          let content = fs.readFileSync(debugManifestPath, 'utf8');
          let changed = false;
          if (content.includes('<application') && !content.includes('android:appComponentFactory="')) {
            content = content.replace(
              '<application',
              '<application android:appComponentFactory="androidx.core.app.CoreComponentFactory"'
            );
            changed = true;
          }
          if (content.includes('tools:replace="android:usesCleartextTraffic"') && !content.includes('tools:replace="android:usesCleartextTraffic,android:appComponentFactory"')) {
            content = content.replace(
              'tools:replace="android:usesCleartextTraffic"',
              'tools:replace="android:usesCleartextTraffic,android:appComponentFactory"'
            );
            changed = true;
          }
          if (changed) {
            fs.writeFileSync(debugManifestPath, content, 'utf8');
            console.log('ManifestFixPlugin: Successfully patched debug AndroidManifest.xml tools:replace and appComponentFactory attribute');
          }
        }
      } catch (e) {
        console.log('ManifestFixPlugin: Warning - could not patch debug AndroidManifest.xml:', e.message);
      }
      return config;
    },
  ]);
};