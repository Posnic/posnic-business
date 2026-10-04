// Only used by pin-qa.yml's isolated application; never the shipping entry point.
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccountScreen } from "../../src/components/AccountScreen";
import { UIContext } from "../../src/components/ui";
import { vault } from "../../src/platform/vault";
import { derivePinKey } from "../../src/platform/pinCrypto";
import { bytesToHex } from "@noble/hashes/utils.js";
import { account } from "./network";

const session = {
  origin: "https://pin-qa.example.test",
  token: "pb1_" + "q".repeat(43),
  expiresAt: "2099-01-01T00:00:00.000Z",
  context: account,
};
export default function PinQa() {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [exited, setExited] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    void (async () => {
      const started = performance.now();
      const key = await derivePinKey("8264", "01".repeat(48));
      if (
        bytesToHex(key) !==
        "574203076fdb98a4826d51ff3d53c6119c8d96fdc692ad1f1eec0fbdb643cf9e"
      )
        throw new Error("Native KDF known-answer mismatch");
      key.fill(0);
      console.info(
        "PIN_QA_NATIVE_KDF_MS=" + Math.round(performance.now() - started),
      );
      setSaved(await vault.hasCredential());
    })().catch((error) => setFailure(String(error)));
  }, []);
  return (
    <SafeAreaProvider>
      <UIContext.Provider
        value={{
          button: { padding: 16, borderRadius: 12, backgroundColor: "#146b54" },
          buttonText: { color: "white", fontSize: 16 },
          secondary: { backgroundColor: "#dde8e4" },
          secondaryText: { color: "#146b54" },
          disabled: { opacity: 0.5 },
          card: {
            padding: 16,
            gap: 14,
            borderRadius: 12,
            backgroundColor: "white",
          },
        }}
      >
        {failure ? (
          <Text>{failure}</Text>
        ) : saved === null ? (
          <Text>Loading PIN test</Text>
        ) : exited ? (
          <Text>Cloud sign-in required</Text>
        ) : (
          <AccountScreen
            initialSession={saved ? null : session}
            onSessionConsumed={() => {}}
            onExit={() => setExited(true)}
          />
        )}
      </UIContext.Provider>
    </SafeAreaProvider>
  );
}
