import test from "node:test";
import assert from "node:assert/strict";
import { sampleContext } from "../src/data/sample";
import { readBusinessWording } from "../src/services/wordingProfiles";
const context = sampleContext("manager"),
  branchId = context.branches[0]!.id;
const credential = {
  origin: "https://shop.example.com",
  token: "pb1_" + "a".repeat(43),
  expiresAt: "2099-01-01T00:00:00.000Z",
};
const discovery = {
  product: "posnic-business",
  apiVersion: 1,
  issuer: credential.origin,
  authorization: "business-pkce-v1",
  audience: "posnic-business",
  reporting: "bounded-summary-v2",
  wordingProfiles: "published-wording-v1",
};
const bundle = {
  schemaVersion: 1,
  revision: 1,
  branchId,
  locale: "en",
  profileId: "p",
  profileRevision: "r",
  profileName: "Shop",
  values: {},
  sourceValues: { Product: "Item" },
};
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

test("wording negotiates capability and sends the credential only to its Business origin", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    calls.push(String(input));
    assert.equal(options?.redirect, "error");
    if (calls.length === 1) return json(discovery);
    assert.equal(
      new Headers(options?.headers).get("authorization"),
      "Bearer " + credential.token,
    );
    return json(bundle);
  };
  assert.equal(
    (
      await readBusinessWording(credential, context, branchId, "en", {
        fetcher,
      })
    ).sourceValues.Product,
    "Item",
  );
  assert.equal(
    calls[0],
    credential.origin + "/api/business/v1/discovery?wording=1",
  );
  assert.ok(
    calls[1]!.startsWith(credential.origin + "/api/business/v1/wording?"),
  );
});

test("unknown branches, older servers and wrong-scope responses are rejected", async () => {
  await assert.rejects(
    readBusinessWording(credential, context, "foreign", "en"),
    /accessChanged/,
  );
  await assert.rejects(
    readBusinessWording(credential, context, branchId, "en", {
      fetcher: async () => json({ ...discovery, wordingProfiles: undefined }),
    }),
    /unsupported/,
  );
  for (const change of [
    { branchId: "foreign" },
    { locale: "fr" },
    { schemaVersion: 2 },
  ]) {
    let requests = 0;
    await assert.rejects(
      readBusinessWording(credential, context, branchId, "en", {
        fetcher: async () =>
          json(++requests === 1 ? discovery : { ...bundle, ...change }),
      }),
      /invalidResponse/,
    );
  }
});
