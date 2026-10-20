import type { SecretStore } from "./sessionVault";

/** One bounded label bundle. Serial writes prevent cleanup racing a refresh.
 * Small UTF-16 chunks stay within native keychain per-item size limits. */
export function createWordingCache(store: SecretStore) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work, work);
    queue = result.catch(() => undefined);
    return result;
  };
  const prefix = "wording.cache.v1.";
  const clear = async () => {
    const count = Math.max(
      Number(await store.get(prefix + "count")),
      Number(await store.get(prefix + "pending")),
    );
    await store.remove(prefix + "count");
    await store.remove(prefix + "pending");
    if (Number.isInteger(count) && count >= 0 && count <= 512)
      for (let i = 0; i < count; i++) await store.remove(prefix + i);
  };
  return {
    clear: () => serial(clear),
    read: () =>
      serial(async () => {
        const count = Number(await store.get(prefix + "count"));
        if (!Number.isInteger(count) || count < 1 || count > 512) return null;
        let value = "";
        for (let i = 0; i < count; i++) {
          const chunk = await store.get(prefix + i);
          if (chunk === null || chunk.length > 501) return null;
          value += chunk;
        }
        try {
          return JSON.parse(value) as unknown;
        } catch {
          return null;
        }
      }),
    write: (value: unknown) =>
      serial(async () => {
        const raw = JSON.stringify(value);
        if (raw.length > 255000) throw new Error("Wording cache too large");
        await clear();
        const chunks: string[] = [];
        for (let start = 0; start < raw.length;) {
          let end = Math.min(start + 500, raw.length);
          if (end < raw.length && /[\uD800-\uDBFF]/.test(raw[end - 1]!)) end++;
          chunks.push(raw.slice(start, end));
          start = end;
        }
        const count = chunks.length;
        await store.set(prefix + "pending", String(count));
        for (let i = 0; i < count; i++) await store.set(prefix + i, chunks[i]!);
        // Commit last: interrupted writes are never considered a complete cache.
        await store.set(prefix + "count", String(count));
        await store.remove(prefix + "pending");
      }),
  };
}
