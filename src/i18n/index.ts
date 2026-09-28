import en from "./en.json";
import fr from "./fr.json";
import { createTranslator, type Interpolation } from "./translator";
export type MessageKey = keyof typeof en;
/** Target registry, not a claim of completed Business translations. */
const definitions = [
  ["en", "English"],
  ["ta", "தமிழ்"],
  ["hi", "हिन्दी"],
  ["ml", "മലയാളം"],
  ["kn", "ಕನ್ನಡ"],
  ["te", "తెలుగు"],
  ["si", "සිංහල"],
  ["ne", "नेपाली"],
  ["ar", "العربية"],
  ["fr", "Français"],
  ["es", "Español"],
  ["pt", "Português"],
  ["id", "Bahasa Indonesia"],
  ["th", "ไทย"],
  ["de", "Deutsch"],
  ["sw", "Kiswahili"],
  ["nl", "Nederlands"],
  ["it", "Italiano"],
].map(([code, name]) => ({
  code: code!,
  name: name!,
  formatLocale: code === "en" ? "en-IN" : code!,
  rtl: code === "ar",
}));
export const translator = createTranslator<MessageKey>(en, definitions, {
  en,
  fr,
});
export const releaseLanguages = definitions.map((language) => ({
  ...language,
  status: translator.available(language.code) ? "preview" : "planned",
}));
export const getLocale = translator.getLocale;
export const getFormatLocale = () => translator.getLanguage().formatLocale;
export const isRTL = () => translator.getLanguage().rtl;
export function t(key: MessageKey, values: Interpolation = {}) {
  return translator.translate(key, values);
}
