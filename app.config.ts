import { type ExpoConfig } from "expo/config";
import config from "./app.json";

const projectId = process.env.POSNIC_BUSINESS_EXPO_PROJECT_ID;
if (projectId && !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(projectId))
  throw new Error(
    "POSNIC_BUSINESS_EXPO_PROJECT_ID must be an EAS project UUID",
  );
export default {
  ...config.expo,
  android: {
    ...config.expo.android,
    predictiveBackGestureEnabled: false,
    ...(process.env.POSNIC_BUSINESS_GOOGLE_SERVICES_FILE
      ? { googleServicesFile: process.env.POSNIC_BUSINESS_GOOGLE_SERVICES_FILE }
      : {}),
  },
  plugins: [
    ...config.expo.plugins,
    "./plugins/withBusinessNavigation.js",
    ["expo-notifications", { defaultChannel: "business-updates" }],
  ],
  ...(projectId ? { extra: { eas: { projectId } } } : {}),
} as ExpoConfig;
