import en from "./en.json";
export type MessageKey = keyof typeof en;
export function t(
  key: MessageKey,
  values: Record<string, string | number> = {},
) {
  return en[key].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(values[name] ?? `{${name}}`),
  );
}
/** Target registry, not a claim of completed Business translations. */
export const releaseLanguages = [
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
  rtl: code === "ar",
  status: code === "en" ? "preview" : "planned",
}));
