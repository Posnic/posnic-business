import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { notificationIntent } from "../domain/notificationIntent";
import { t, translator } from "../i18n";
import { createPushChannelUpdater } from "../services/pushChannel";
const updateChannel = createPushChannelUpdater({
  read: () => Notifications.getNotificationChannelAsync("business-updates"),
  name: () => t("phoneNotifications"),
  defaultImportance: Notifications.AndroidImportance.DEFAULT,
  async write(name, importance, create) {
    await Notifications.setNotificationChannelAsync("business-updates", {
      name,
      importance,
      ...(create
        ? {
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PRIVATE,
          }
        : {}),
    });
  },
});
export function watchPushChannelLanguage() {
  if (Platform.OS !== "android") return () => {};
  const refresh = () => {
    void updateChannel().catch(() => {});
  };
  refresh();
  const unsubscribe = translator.subscribe(refresh);
  const foreground = AppState.addEventListener("change", (state) => {
    if (state === "active") refresh();
  });
  return () => {
    unsubscribe();
    foreground.remove();
  };
}
const configuredProject =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
export const pushProjectId: string | null =
  typeof configuredProject === "string" ? configuredProject : null;
export const supportsPush =
  Device.isDevice &&
  ["ios", "android"].includes(Platform.OS) &&
  !!pushProjectId;
export class PushPermissionError extends Error {}
export async function pushAllowed() {
  if (!supportsPush) return false;
  const permission = await Notifications.getPermissionsAsync();
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export async function requestPushToken(prompt: boolean) {
  if (!supportsPush) throw new Error("push_unavailable");
  if (Platform.OS === "android") await updateChannel(true);
  if (!(await pushAllowed()) && prompt)
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
  if (!(await pushAllowed()))
    throw new PushPermissionError("permission_denied");
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId: pushProjectId! })
  ).data;
  return {
    token,
    projectId: pushProjectId!,
    platform: Platform.OS as "ios" | "android",
  };
}
export function listenPush(openInbox: () => void, tokenChanged: () => void) {
  if (!supportsPush) return () => {};
  let disposed = false;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    if (
      !disposed &&
      response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
      notificationIntent(data) === "inbox"
    ) {
      openInbox();
      void Notifications.clearLastNotificationResponseAsync();
    }
  };
  const tap = Notifications.addNotificationResponseReceivedListener(handle);
  const tokens = Notifications.addPushTokenListener(() => {
    if (!disposed) tokenChanged();
  });
  void Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => {});
  return () => {
    disposed = true;
    tap.remove();
    tokens.remove();
  };
}
