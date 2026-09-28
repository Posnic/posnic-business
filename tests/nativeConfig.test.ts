import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const plugin = require("../plugins/withBusinessNavigation.js");

test("iOS privacy modifies the installed SDK template once and refuses conflicting lifecycle overrides", async () => {
  const template = execFileSync(
    "tar",
    [
      "-xOf",
      "node_modules/expo/template.tgz",
      "package/ios/HelloWorld/AppDelegate.swift",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  const config = plugin({ name: "Business", slug: "business" });
  const modify = (contents: string) =>
    config.mods.ios.appDelegate({
      ...config,
      modResults: { language: "swift", contents },
      modRequest: { platform: "ios", modName: "appDelegate" },
    });
  const output = (await modify(template)).modResults.contents;
  assert.match(output, /window\.addSubview\(cover\)/);
  assert.match(
    output,
    /coverBusinessWindow\(\)\s+super\.applicationWillResignActive/,
  );
  assert.match(
    output,
    /coverBusinessWindow\(\)\s+super\.applicationDidEnterBackground/,
  );
  assert.equal((await modify(output)).modResults.contents, output);
  await assert.rejects(
    modify(
      template.replace(
        "class AppDelegate: ExpoAppDelegate {",
        "class RenamedDelegate: ExpoAppDelegate {",
      ),
    ),
    /Review AppDelegate/,
  );
  await assert.rejects(
    modify(
      template.replace(
        "class AppDelegate: ExpoAppDelegate {",
        "class AppDelegate: ExpoAppDelegate {\n override func applicationWillResignActive(_ application: UIApplication) {}",
      ),
    ),
    /Review AppDelegate/,
  );
});
