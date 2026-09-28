import { Platform } from "react-native";
import { enableAppSwitcherProtectionAsync } from "expo-screen-capture";

let protection: Promise<void> | undefined;
export function enableSwitcherPrivacy(): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  protection ??= enableAppSwitcherProtectionAsync(1);
  return protection;
}
