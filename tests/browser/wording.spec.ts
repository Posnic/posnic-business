import { test, expect } from "@playwright/test";
import { sampleContext } from "../../src/data/sample";
import en from "../../src/i18n/en.json";

test("connected wording refreshes, survives a network interruption and clears on unassignment", async ({
  page,
  context,
}) => {
  await page.clock.install();
  const origin = "https://wording.example.com",
    request = "r".repeat(43),
    token = "pb1_" + "t".repeat(43);
  const account = sampleContext("manager");
  account.branches[0]!.id = "a".repeat(24);
  let assigned = true,
    offline = false,
    reads = 0;
  await context.route(origin + "/api/business/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let result: unknown;
    if (offline) {
      await route.abort();
      return;
    }
    if (url.pathname.endsWith("/discovery")) {
      result = {
        product: "posnic-business",
        apiVersion: 1,
        issuer: origin,
        authorization: "business-pkce-v1",
        audience: "posnic-business",
        reporting: "unavailable",
        ...(url.searchParams.has("wording")
          ? { wordingProfiles: "published-wording-v1" }
          : {}),
      };
    } else if (url.pathname.endsWith("/requests")) {
      result = {
        request,
        authorizationUrl:
          origin + "/api/business/v1/authorize?request=" + request,
        expiresIn: 600,
        interval: 5,
      };
    } else if (url.pathname.endsWith("/authorize")) {
      await route.fulfill({
        contentType: "text/html",
        body: "<h1>Test consent</h1>",
      });
      return;
    } else if (url.pathname.endsWith("/token")) {
      result = {
        token,
        expiresAt: "2099-01-01T00:00:00.000Z",
        context: account,
      };
    } else if (url.pathname.endsWith("/wording")) {
      reads++;
      expect(route.request().headers().authorization).toBe("Bearer " + token);
      expect(url.searchParams.get("branchId")).toBe(account.branches[0]!.id);
      result = {
        schemaVersion: 1,
        revision: reads,
        locale: "en",
        branchId: account.branches[0]!.id,
        profileId: assigned ? "p" : null,
        profileRevision: assigned ? "r" : null,
        profileName: assigned ? "Shop English" : null,
        values: {},
        sourceValues: assigned ? { More: "Account tools" } : {},
      };
    } else if (url.pathname.endsWith("/inbox"))
      result = { entries: [], next: null };
    else throw new Error("Unexpected endpoint: " + url.pathname);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: en.community, exact: true }).click();
  await page.getByRole("textbox", { name: en.serverAddress }).fill(origin);
  const popupReady = context.waitForEvent("page");
  await page
    .getByRole("button", { name: en.secureSignIn, exact: true })
    .click();
  const popup = await popupReady;
  await page.bringToFront();
  await expect(
    page.getByRole("tab", { name: "Account tools", exact: true }),
  ).toBeVisible({ timeout: 12000 });
  expect(reads).toBeGreaterThan(0);
  offline = true;
  const failed = page.waitForEvent("requestfailed", (request) =>
    request.url().includes("/discovery?wording=1"),
  );
  await page.clock.fastForward(61000);
  await failed;
  await page.clock.runFor(100);
  await expect(
    page.getByRole("tab", { name: "Account tools", exact: true }),
  ).toBeVisible();
  offline = false;
  assigned = false;
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole("tab", { name: "More", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    token,
  );
  await popup.close();
});
