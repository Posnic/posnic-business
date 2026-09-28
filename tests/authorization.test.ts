import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import {
  startAuthorization,
  checkAuthorization,
} from "../src/services/authorization";
import { sampleContext } from "../src/data/sample";
const origin = "https://shop.example.com",
  request = "r".repeat(43);
const crypto = {
  async random() {
    return randomBytes(32).toString("base64url");
  },
  async challenge(v: string) {
    return createHash("sha256").update(v).digest("base64url");
  },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
test("browser authorization binds its page, verifier and grant to the chosen issuer", async () => {
  let challenge = "";
  const attempt = await startAuthorization(origin, crypto, {
    fetcher: async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      challenge = body.codeChallenge;
      assert.equal(body.deviceName, "Posnic Business");
      assert.equal(body.password, undefined);
      return json({
        request,
        authorizationUrl:
          origin + "/api/business/v1/authorize?request=" + request,
        expiresIn: 600,
        interval: 5,
      });
    },
  });
  assert.equal(await crypto.challenge(attempt.verifier), challenge);
  assert.equal(attempt.matchingCode, "RRRRRR");
  assert.equal(
    await checkAuthorization(attempt, {
      fetcher: async () =>
        json({ error: { code: "authorization_pending" } }, 202),
    }),
    null,
  );
  const grant = await checkAuthorization(attempt, {
    fetcher: async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.codeVerifier, attempt.verifier);
      return json({
        token: "pb1_" + "t".repeat(43),
        expiresAt: "2099-01-01T00:00:00.000Z",
        context: sampleContext("manager"),
      });
    },
  });
  assert.equal(grant?.origin, origin);
});
test("a substituted browser page or password-bearing grant is rejected", async () => {
  await assert.rejects(
    startAuthorization(origin, crypto, {
      fetcher: async () =>
        json({
          request,
          authorizationUrl: "https://attacker.example.com/login",
          expiresIn: 600,
          interval: 5,
        }),
    }),
  );
  const attempt = await startAuthorization(origin, crypto, {
    fetcher: async () =>
      json({
        request,
        authorizationUrl:
          origin + "/api/business/v1/authorize?request=" + request,
        expiresIn: 600,
        interval: 5,
      }),
  });
  await assert.rejects(
    checkAuthorization(attempt, {
      fetcher: async () =>
        json({
          token: "pb1_" + "t".repeat(43),
          expiresAt: "2099-01-01T00:00:00.000Z",
          context: sampleContext("manager"),
          password: "not allowed",
        }),
    }),
  );
});
