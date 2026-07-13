const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withExcludeOldSupportLib(config) {
  return withAppBuildGradle(config, (config) => {
    const excludeBlock = `
android {
    configurations.all {
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-v4'
        exclude group: 'com.android.support', module: 'versionedparcelable'
        exclude group: 'com.android.support', module: 'animated-vector-drawable'
        exclude group: 'com.android.support', module: 'support-vector-drawable'
        exclude group: 'com.android.support', module: 'support-fragment'
        exclude group: 'com.android.support', module: 'support-core-utils'
        exclude group: 'com.android.support', module: 'support-core-ui'
    }
}
`;
    config.modResults.contents += excludeBlock;
    return config;
  });
};