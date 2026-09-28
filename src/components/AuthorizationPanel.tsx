import React, { useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button, Card } from "./ui";
import { businessFetch } from "../platform/network";
import { proofSource } from "../platform/proof";
import {
  startAuthorization,
  checkAuthorization,
  type AuthorizationAttempt,
  type Session,
} from "../services/authorization";
import { t } from "../i18n";

export function AuthorizationPanel({
  origin,
  onConnected,
}: {
  origin: string;
  onConnected: (session: Session) => void;
}) {
  const [attempt, setAttempt] = useState<AuthorizationAttempt | null>(null);
  const [waiting, setWaiting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const connected = useRef(onConnected);
  connected.current = onConnected;
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!attempt || !waiting) return;
    const request = new AbortController();
    controller.current = request;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const session = await checkAuthorization(attempt, {
          signal: request.signal,
          fetcher: businessFetch,
        });
        if (request.signal.aborted) return;
        if (session) {
          connected.current(session);
          try {
            WebBrowser.dismissBrowser();
          } catch {
            /* Android browser closes through system navigation. */
          }
          return;
        }
        timer = setTimeout(check, attempt.interval);
      } catch {
        if (!request.signal.aborted) {
          setError(true);
          setWaiting(false);
          setAttempt(null);
        }
      }
    };
    timer = setTimeout(check, attempt.interval);
    return () => {
      request.abort();
      clearTimeout(timer);
    };
  }, [attempt, waiting]);
  async function begin() {
    if (controller.current && busy) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError(false);
    try {
      const value = await startAuthorization(origin, proofSource, {
        signal: request.signal,
        fetcher: businessFetch,
      });
      if (!request.signal.aborted) setAttempt(value);
    } catch {
      if (!request.signal.aborted) setError(true);
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={styles.title}>{t("secureSignIn")}</Text>
      <Text style={styles.text}>{origin}</Text>
      <Text style={styles.text}>{t("browserSignInHelp")}</Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.text}>
          {t("authorizationFailed")}
        </Text>
      )}
      {attempt ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.text}>{t("matchingCode")}</Text>
          <Text selectable style={styles.code}>
            {attempt.matchingCode}
          </Text>
          <Button
            label={t(waiting ? "reopenBrowser" : "openBrowser")}
            onPress={() => {
              setWaiting(true);
              void WebBrowser.openBrowserAsync(attempt.authorizationUrl).catch(
                () => {
                  setWaiting(false);
                  setError(true);
                },
              );
            }}
          />
          {waiting && (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {t("waitingApproval")}
            </Text>
          )}
          <Button
            label={t("cancel")}
            secondary
            onPress={() => {
              controller.current?.abort();
              setWaiting(false);
              setAttempt(null);
              setError(false);
            }}
          />
        </View>
      ) : (
        <Button
          label={t(busy ? "preparingSignIn" : "secureSignIn")}
          disabled={busy}
          onPress={() => {
            void begin();
          }}
        />
      )}
    </Card>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "600", color: "#146b54" },
  text: { fontSize: 14, lineHeight: 21, color: "#667b88" },
  code: { fontSize: 28, fontWeight: "700", letterSpacing: 5, color: "#146b54" },
});
