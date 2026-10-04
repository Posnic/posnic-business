// Only used by pin-qa.yml's isolated application; never the shipping entry point.
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccountScreen } from "../../src/components/AccountScreen";
import { UIContext } from "../../src/components/ui";
import { vault } from "../../src/platform/vault";
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
  useEffect(() => {
    void vault.hasCredential().then(setSaved);
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
        {saved === null ? (
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
