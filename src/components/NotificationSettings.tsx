import { useLocale } from "../i18n/useLocale";
import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, View, Switch, useColorScheme } from "react-native";
import { Card, Button } from "./ui";
import { type Credential } from "../services/sessionVault";
import {
  readPreference,
  savePreference,
  type NotificationPreference,
} from "../services/notifications";
import { ConnectionError } from "../services/businessConnection";
import { businessFetch } from "../platform/network";
import { t } from "../i18n";
import { normalizeDigits } from "../i18n/digits";

export function NotificationSettings({
  credential,
  branchId,
  onAccessLost,
  page = false,
  onClose,
  onDirtyChanged,
}: {
  credential: Credential;
  branchId: string;
  onAccessLost: () => void;
  page?: boolean;
  onClose?: () => void;
  onDirtyChanged?: (dirty: boolean) => void;
}) {
  useLocale();
  const [open, setOpen] = useState(page),
    [value, setValue] = useState<NotificationPreference | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null),
    running = useRef(false);
  const [savedValue, setSavedValue] = useState<string | null>(null);
  useEffect(() => {
    onDirtyChanged?.(
      value !== null &&
        savedValue !== null &&
        JSON.stringify(value) !== savedValue,
    );
  }, [value, savedValue, onDirtyChanged]);
  const ink = { color: useColorScheme() === "dark" ? "#eef5fa" : "#172b37" };
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (page) void load();
  }, []);
  async function load(save = false) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    const request = new AbortController();
    controller.current = request;
    try {
      const options = { fetcher: businessFetch, signal: request.signal };
      const result =
        save && value
          ? await savePreference(credential, value, options)
          : await readPreference(credential, branchId, options);
      if (!request.signal.aborted) {
        setValue(result);
        setSavedValue(JSON.stringify(result));
        if (save) setMessage(t("notificationSaved"));
      }
    } catch (error) {
      if (request.signal.aborted) return;
      setValue(null);
      if (
        error instanceof ConnectionError &&
        ["signInRequired", "accessChanged"].includes(error.problem)
      )
        onAccessLost();
      else setMessage(t("notificationSettingsUnavailable"));
    } finally {
      running.current = false;
      if (!request.signal.aborted) setBusy(false);
    }
  }
  if (!open)
    return (
      <Button
        label={t("notificationSettings")}
        secondary
        onPress={() => {
          setOpen(true);
          void load();
        }}
      />
    );
  const validTime = (text: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text);
  const valid =
    value &&
    validTime(value.time) &&
    (!value.quiet.enabled ||
      (validTime(value.quiet.start) &&
        validTime(value.quiet.end) &&
        value.quiet.start !== value.quiet.end));
  const timeInput = (
    label: string,
    text: string,
    change: (text: string) => void,
  ) => (
    <View style={{ gap: 6 }}>
      <Text style={ink}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={text}
        onChangeText={(input) => change(normalizeDigits(input))}
        editable={!busy}
        maxLength={5}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="23:00"
        style={[
          ink,
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: "#8296a2",
            borderRadius: 12,
            padding: 12,
            fontSize: 18,
          },
        ]}
      />
    </View>
  );
  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={[ink, { fontSize: 20, fontWeight: "600" }]}
      >
        {t("notificationSettings")}
      </Text>
      <Text style={[ink, { lineHeight: 23 }]}>{t("inboxDeliveryHelp")}</Text>
      {value && (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text style={[ink, { flex: 1 }]}>{t("dailySummary")}</Text>
            <Switch
              accessibilityLabel={t("dailySummary")}
              value={value.enabled}
              disabled={busy}
              onValueChange={(enabled) => setValue({ ...value, enabled })}
            />
          </View>
          <Text style={ink}>
            {t("branchTimezone", { timezone: value.timezone })}
          </Text>
          {timeInput(t("summaryTime"), value.time, (time) =>
            setValue({ ...value, time }),
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text style={[ink, { flex: 1 }]}>{t("quietHours")}</Text>
            <Switch
              accessibilityLabel={t("quietHours")}
              value={value.quiet.enabled}
              disabled={busy}
              onValueChange={(enabled) =>
                setValue({
                  ...value,
                  quiet: {
                    enabled,
                    start: validTime(value.quiet.start)
                      ? value.quiet.start
                      : "22:00",
                    end: validTime(value.quiet.end) ? value.quiet.end : "07:00",
                  },
                })
              }
            />
          </View>
          {value.quiet.enabled && (
            <>
              {timeInput(t("quietStart"), value.quiet.start, (start) =>
                setValue({ ...value, quiet: { ...value.quiet, start } }),
              )}
              {timeInput(t("quietEnd"), value.quiet.end, (end) =>
                setValue({ ...value, quiet: { ...value.quiet, end } }),
              )}
            </>
          )}
          <Text style={ink}>{t("quietHoursHelp")}</Text>
          <Button
            label={t("saveNotificationSettings")}
            disabled={busy || !valid}
            onPress={() => void load(true)}
          />
        </>
      )}
      {message ? (
        <Text accessibilityRole="alert" style={ink}>
          {message}
        </Text>
      ) : null}
      {!value && (
        <Button
          label={t("refresh")}
          secondary
          disabled={busy}
          onPress={() => void load()}
        />
      )}
      <Button
        label={t("closeNotificationSettings")}
        secondary
        disabled={busy}
        onPress={() => {
          if (onClose) {
            onClose();
            return;
          }
          setOpen(false);
          setValue(null);
          setMessage("");
        }}
      />
    </Card>
  );
}
