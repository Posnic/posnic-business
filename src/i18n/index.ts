import en from "./en.json";
import fr from "./fr.json";
import ar from "./ar.json";
import ta from "./ta.json";
import hi from "./hi.json";
import es from "./es.json";
import pt from "./pt.json";
import id from "./id.json";
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
  formatLocale: code === "en" ? "en-IN" : code === "pt" ? "pt-PT" : code!,
  rtl: code === "ar",
}));
export const bundledCatalogs = {
  en,
  fr,
  ar,
  ta,
  hi,
  es,
  pt,
  id,
};
export const translator = createTranslator<MessageKey>(
  en,
  definitions,
  bundledCatalogs,
);
export const releaseLanguages = definitions.map((language) => ({
  ...language,
  status: translator.available(language.code) ? "preview" : "planned",
}));
export const getLocale = translator.getLocale;
export const getFormatLocale = () => translator.getLanguage().formatLocale;
export const isRTL = () => translator.getLanguage().rtl;
export const getTextAlign = (): "left" | "right" =>
  isRTL() ? "right" : "left";
export function t(key: MessageKey, values: Interpolation = {}) {
  return translator.translate(key, values);
}
