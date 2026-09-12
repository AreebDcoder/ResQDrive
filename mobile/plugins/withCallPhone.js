const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withCallPhone(config) {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const packagePath = path.join(
        projectRoot,
        "app/src/main/java/com/basit_009/resqdrivemobile"
      );

      if (!fs.existsSync(packagePath)) {
        fs.mkdirSync(packagePath, { recursive: true });
      }

      const moduleContent = `package com.basit_009.resqdrivemobile;

import android.content.Intent;
import android.net.Uri;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class CallPhoneModule extends ReactContextBaseJavaModule {
    public CallPhoneModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "CallPhoneModule";
    }

    @ReactMethod
    public void callNumber(String phoneNumber) {
        try {
            Intent callIntent = new Intent(Intent.ACTION_CALL);
            callIntent.setData(Uri.parse("tel:" + phoneNumber));
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(callIntent);
        } catch (Exception e) {
            Intent dialIntent = new Intent(Intent.ACTION_DIAL);
            dialIntent.setData(Uri.parse("tel:" + phoneNumber));
            dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(dialIntent);
        }
    }
}
`;

      const packageContent = `package com.basit_009.resqdrivemobile;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CallPhonePackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new CallPhoneModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

      fs.writeFileSync(path.join(packagePath, "CallPhoneModule.java"), moduleContent, "utf8");
      fs.writeFileSync(path.join(packagePath, "CallPhonePackage.java"), packageContent, "utf8");
      console.log("CallPhonePlugin: Written CallPhoneModule.java and CallPhonePackage.java");

      // Register in MainApplication.kt
      const mainAppPath = path.join(packagePath, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");
        if (!content.includes("CallPhonePackage")) {
          content = content.replace(
            "PackageList(this).packages",
            "PackageList(this).packages.also { it.add(CallPhonePackage()) }"
          );
          fs.writeFileSync(mainAppPath, content, "utf8");
          console.log("CallPhonePlugin: Registered CallPhonePackage in MainApplication.kt");
        }
      }

      return config;
    },
  ]);

  return config;
};
