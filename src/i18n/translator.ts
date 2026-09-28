export type Interpolation = Readonly<Record<string, string | number>>;
export type LanguageDefinition = {
  code: string;
  name: string;
  formatLocale: string;
  rtl: boolean;
};

function placeholders(message: string) {
  return [...message.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join("|");
}

/** Reject incomplete packs before they can be selected, including lost values. */
export function validateCatalog<K extends string>(
  reference: Record<K, string>,
  candidate: unknown,
): asserts candidate is Record<K, string> {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
    throw new Error("Invalid language catalog");
  const entries = candidate as Record<string, unknown>;
  const keys = Object.keys(reference);
  if (Object.keys(entries).length !== keys.length)
    throw new Error("Language catalog has missing or extra messages");
  for (const key of keys as K[]) {
    const message = Object.hasOwn(entries, key) ? entries[key] : null;
    if (
      typeof message !== "string" ||
      !message.trim() ||
      placeholders(message) !== placeholders(reference[key])
    )
      throw new Error(`Invalid translated message: ${key}`);
  }
}

export function createTranslator<K extends string>(
  reference: Record<K, string>,
  languages: readonly LanguageDefinition[],
  catalogs: Readonly<Record<string, Record<K, string>>>,
  fallback = "en",
) {
  const definitions = new Map(
    languages.map((language) => [language.code, language]),
  );
  const available = new Map<string, Readonly<Record<K, string>>>();
  for (const [code, catalog] of Object.entries(catalogs)) {
    if (!definitions.has(code)) throw new Error("Unknown catalog language");
    validateCatalog(reference, catalog);
    // Do not let later mutations silently change validated financial wording.
    available.set(code, Object.freeze({ ...catalog }));
  }
  if (!available.has(fallback)) throw new Error("Missing fallback language");
  let current = fallback;
  const listeners = new Set<() => void>();
  const getLanguage = () => definitions.get(current)!;
  return {
    getLocale: () => current,
    getLanguage,
    available: (code: string) => available.has(code),
    resolveLocale(preferences: readonly string[]) {
      for (const preference of preferences) {
        const code = preference
          .trim()
          .replace(/_/g, "-")
          .toLowerCase()
          .split("-")[0]!;
        if (available.has(code)) return code;
      }
      return fallback;
    },
    setLocale(code: string) {
      if (!available.has(code)) return false;
      if (current === code) return true;
      current = code;
      for (const listener of [...listeners]) listener();
      return true;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    translate(key: K, values: Interpolation = {}) {
      const catalog = available.get(current)!;
      if (!Object.hasOwn(catalog, key)) throw new Error("Unknown message key");
      return catalog[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
        if (!Object.hasOwn(values, name)) return placeholder;
        const value = String(values[name]);
        // Keep account names, ISO dates and currency amounts in their own bidi run.
        return getLanguage().rtl ? `\u2068${value}\u2069` : value;
      });
    },
  };
}
