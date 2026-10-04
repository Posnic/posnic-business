import { requireOptionalNativeModule } from "expo-modules-core";
import { hexToBytes } from "@noble/hashes/utils.js";
import { VaultError } from "../services/sessionVault";

export async function derivePinKey(pin: string, saltAndSecret: string) {
  const native = requireOptionalNativeModule<{
    derive(pin: string, saltAndSecret: string): Promise<string>;
  }>("PosnicPinCrypto");
  if (!native) throw new VaultError("storageUnavailable");
  const value = await native.derive(pin, saltAndSecret);
  if (!/^[a-f0-9]{64}$/.test(value)) throw new VaultError("storageUnavailable");
  return hexToBytes(value);
}
