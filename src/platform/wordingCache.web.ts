import { createWordingCache } from "../services/wordingCache";
export const wordingCache = createWordingCache({
  get: async (key) => window.localStorage.getItem(key),
  set: async (key, value) => {
    window.localStorage.setItem(key, value);
  },
  remove: async (key) => {
    window.localStorage.removeItem(key);
  },
});
