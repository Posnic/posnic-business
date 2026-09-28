import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Text,
  TextInput,
  View,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Button, Card } from "./ui";
import { type Session, revokeSession } from "../services/authorization";
import { createReportingClient } from "../services/businessConnection";
import {
  type Credential,
  VaultError,
  validPin,
} from "../services/sessionVault";
import { vault, supportsRememberedSession } from "../platform/vault";
import { businessFetch } from "../platform/network";
import { type BusinessContext } from "../domain/contracts";
import { t } from "../i18n";

export function AccountScreen({
  initialSession,
  onExit,
  onSessionConsumed,
}: {
  initialSession: Session | null;
  onExit: (message?: string) => void;
  onSessionConsumed: () => void;
}) {
  const [credential, setCredential] = useState<Credential | null>(
    initialSession
      ? {
          origin: initialSession.origin,
          token: initialSession.token,
          expiresAt: initialSession.expiresAt,
        }
      : null,
  );
  const [context, setContext] = useState<BusinessContext | null>(
    initialSession?.context ?? null,
  );
  const [stage, setStage] = useState<"setup" | "locked" | "active">(
    initialSession
      ? supportsRememberedSession
        ? "setup"
        : "active"
      : "locked",
  );
  const [pin, setPin] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0);
  const live = useRef({ stage, credential });
  live.current = { stage, credential };
  const exit = useRef(onExit);
  exit.current = onExit;
  const dark = useColorScheme() === "dark",
    ink = dark ? "#eef5fa" : "#172b37";
  const text = [styles.text, { color: ink }],
    title = [styles.title, { color: ink }];
  function lock() {
    generation.current++;
    controller.current?.abort();
    vault.lock();
    setCredential(null);
    setContext(null);
    setPin("");
    setConfirm("");
    setMessage("");
    setBusy(false);
    setStage("locked");
  }
  useEffect(() => {
    onSessionConsumed();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") return;
      const current = live.current;
      lock();
      if (!supportsRememberedSession || current.stage === "setup") {
        if (current.credential)
          void revokeSession(current.credential, {
            fetcher: businessFetch,
          }).catch(() => {});
        exit.current();
      }
    });
    return () => {
      generation.current++;
      controller.current?.abort();
      vault.lock();
      subscription.remove();
    };
  }, []);
  async function unlockOrEnroll() {
    if (busy) return;
    if (stage === "setup" && (!validPin(pin) || pin !== confirm)) {
      setMessage(t(pin !== confirm ? "pinMismatch" : "pinWeak"));
      return;
    }
    setBusy(true);
    setMessage("");
    const current = generation.current,
      request = new AbortController();
    controller.current = request;
    try {
      if (stage === "setup" && credential) {
        await vault.enroll(credential, pin);
        if (current === generation.current) {
          setStage("active");
          setPin("");
          setConfirm("");
        }
      } else {
        const saved = await vault.unlock(pin);
        if (current !== generation.current) return;
        const fresh = await createReportingClient(saved.origin, saved.token, {
          fetcher: businessFetch,
          signal: request.signal,
        }).context();
        if (current === generation.current) {
          setCredential(saved);
          setContext(fresh);
          setStage("active");
          setPin("");
          setBranch(null);
        }
      }
    } catch (error) {
      if (current === generation.current) {
        setPin("");
        setConfirm("");
        setMessage(
          t(error instanceof VaultError ? error.code : "accountUnavailable"),
        );
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true);
    const saved = credential;
    lock();
    let remoteFailed = false;
    try {
      if (saved) await revokeSession(saved, { fetcher: businessFetch });
    } catch {
      remoteFailed = true;
    }
    try {
      if (supportsRememberedSession) await vault.forget();
      exit.current(remoteFailed ? t("localSignOutOnly") : undefined);
    } catch {
      setMessage(t("storageUnavailable"));
    }
  }
  if (stage !== "active")
    return (
      <Card>
        <Text accessibilityRole="header" style={title}>
          {t(stage === "setup" ? "createPin" : "unlockBusiness")}
        </Text>
        <Text style={text}>
          {t(stage === "setup" ? "createPinHelp" : "unlockHelp")}
        </Text>
        <TextInput
          accessibilityLabel={t("sixDigitPin")}
          placeholder={t("sixDigitPin")}
          placeholderTextColor={dark ? "#b1c1cb" : "#566a77"}
          value={pin}
          onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 6))}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="off"
          style={[styles.input, { color: ink }]}
        />
        {stage === "setup" && (
          <TextInput
            accessibilityLabel={t("confirmPin")}
            placeholder={t("confirmPin")}
            placeholderTextColor={dark ? "#b1c1cb" : "#566a77"}
            value={confirm}
            onChangeText={(value) =>
              setConfirm(value.replace(/\D/g, "").slice(0, 6))
            }
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
            style={[styles.input, { color: ink }]}
          />
        )}
        {message ? (
          <Text accessibilityRole="alert" style={text}>
            {message}
          </Text>
        ) : null}
        <Button
          label={t(
            busy ? "unlocking" : stage === "setup" ? "savePin" : "unlock",
          )}
          disabled={busy || pin.length !== 6}
          onPress={() => {
            void unlockOrEnroll();
          }}
        />
        <Button
          label={t("signInAgain")}
          secondary
          disabled={busy}
          onPress={() => {
            void (async () => {
              try {
                await vault.forget();
                exit.current();
              } catch {
                setMessage(t("storageUnavailable"));
              }
            })();
          }}
        />
      </Card>
    );
  return (
    <View style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={title}>
        {context?.businessName}
      </Text>
      {context && context.branches.length > 1 ? (
        <Card>
          <Text style={text}>{t("scope")}</Text>
          <Button
            label={t("allBranches")}
            secondary={branch !== null}
            onPress={() => setBranch(null)}
          />
          {context.branches.map((b) => (
            <Button
              key={b.id}
              label={b.name}
              secondary={branch !== b.id}
              onPress={() => setBranch(b.id)}
            />
          ))}
        </Card>
      ) : context?.branches[0] ? (
        <Text style={text}>
          {t("branchLabel", { name: context.branches[0].name })}
        </Text>
      ) : null}
      <Card>
        <Text accessibilityRole="header" style={title}>
          {t(context?.branches.length ? "accountConnected" : "noAccess")}
        </Text>
        <Text style={text}>
          {t(context?.branches.length ? "liveReportsPending" : "noAccessHelp")}
        </Text>
      </Card>
      {message ? (
        <Text accessibilityRole="alert" style={text}>
          {message}
        </Text>
      ) : null}
      {supportsRememberedSession && (
        <Button label={t("lockApp")} secondary onPress={lock} />
      )}
      <Button
        label={t("signOut")}
        secondary
        onPress={() => {
          void signOut();
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 25, lineHeight: 31, fontWeight: "700" },
  text: { fontSize: 15, lineHeight: 23 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#a5b7c2",
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    letterSpacing: 5,
  },
});
