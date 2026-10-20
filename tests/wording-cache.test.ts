import test from "node:test";
import assert from "node:assert/strict";
import { createWordingCache } from "../src/services/wordingCache";
test("cache roundtrips Unicode, clears all chunks and serializes logout after refresh", async () => {
  const rows = new Map<string, string>();
  const cache = createWordingCache({
    get: async (key) => rows.get(key) ?? null,
    set: async (key, value) => {
      rows.set(key, value);
    },
    remove: async (key) => {
      rows.delete(key);
    },
  });
  const value = { scope: "branch/account", words: "தமிழ்🙂".repeat(800) };
  await cache.write(value);
  assert.deepEqual(await cache.read(), value);
  await Promise.all([cache.write(value), cache.clear()]);
  assert.equal(await cache.read(), null);
  assert.equal(rows.size, 0);
});
test("interrupted cache writes are unreadable and orphaned chunks are removed", async () => {
  const rows = new Map<string, string>();
  const cache = createWordingCache({
    get: async (key) => rows.get(key) ?? null,
    set: async (key, value) => {
      if (key.endsWith(".2")) throw new Error("Storage unavailable");
      rows.set(key, value);
    },
    remove: async (key) => {
      rows.delete(key);
    },
  });
  await assert.rejects(cache.write({ words: "a".repeat(4000) }));
  assert.equal(await cache.read(), null);
  await cache.clear();
  assert.equal(rows.size, 0);
});
