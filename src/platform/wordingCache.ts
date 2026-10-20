import * as SecureStore from "expo-secure-store";
import { createWordingCache } from "../services/wordingCache";
const options = {
  keychainService: "com.posnic.business.wording",
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const wordingCache = createWordingCache({
  get: (key) => SecureStore.getItemAsync(key, options),
  set: (key, value) => SecureStore.setItemAsync(key, value, options),
  remove: (key) => SecureStore.deleteItemAsync(key, options),
});
