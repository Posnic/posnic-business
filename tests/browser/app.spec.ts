import { test, expect } from "@playwright/test";
import { sampleContext } from "../../src/data/sample";

test("approved Business connection shows only real scope and revokes on sign-out", async ({
  page,
  context,
}) => {
  const origin = "https://shop.example.com",
    requestId = "r".repeat(43),
    token = "pb1_" + "t".repeat(43);
  let revoked = false,
    removedDevice = false;
  await context.route(origin + "/api/business/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let result: unknown;
    if (url.pathname.endsWith("/discovery"))
      result = {
        product: "posnic-business",
        apiVersion: 1,
        issuer: origin,
        authorization: "business-pkce-v1",
        audience: "posnic-business",
        reporting: "unavailable",
      };
    else if (url.pathname.endsWith("/requests")) {
      expect(route.request().postDataJSON().codeChallenge).toMatch(
        /^[\w-]{43}$/,
      );
      result = {
        request: requestId,
        authorizationUrl:
          origin + "/api/business/v1/authorize?request=" + requestId,
        expiresIn: 600,
        interval: 5,
      };
    } else if (url.pathname.endsWith("/authorize")) {
      await route.fulfill({
        contentType: "text/html",
        body: "<h1>Test consent completed</h1>",
      });
      return;
    } else if (url.pathname.endsWith("/token"))
      result = {
        token,
        expiresAt: "2099-01-01T00:00:00.000Z",
        context: {
          ...sampleContext("manager"),
          businessName: "Connected test business",
        },
      };
    else if (url.pathname.endsWith("/sessions")) {
      result = [
        {
          id: "c".repeat(43),
          name: "Current phone",
          current: true,
          issuedAt: "2026-09-28T01:00:00.000Z",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        ...(removedDevice
          ? []
          : [
              {
                id: "d".repeat(43),
                name: "Old phone",
                current: false,
                issuedAt: "2026-09-27T01:00:00.000Z",
                expiresAt: "2099-01-01T00:00:00.000Z",
              },
            ]),
      ];
    } else if (url.pathname.endsWith("/sessions/" + "d".repeat(43))) {
      expect(route.request().method()).toBe("DELETE");
      removedDevice = true;
      result = { revoked: true };
    } else if (url.pathname.endsWith("/session")) {
      expect(route.request().method()).toBe("DELETE");
      expect(route.request().headers().authorization).toBe("Bearer " + token);
      revoked = true;
      result = { revoked: true };
    } else throw new Error("Unexpected endpoint: " + url.pathname);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Connect your own server" }).click();
  await page
    .getByRole("textbox", { name: "HTTPS server address" })
    .fill(origin);
  await page.getByRole("button", { name: "Check server", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in securely", exact: true })
    .click();
  await expect(page.getByText("RRRRRR", { exact: true })).toBeVisible();
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "Open secure sign-in" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await page.bringToFront();
  await expect(
    page.getByRole("heading", { name: "Connected test business" }),
  ).toBeVisible({ timeout: 12000 });
  await expect(page.getByText("Central branch", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "All branches", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("₹42,850.00", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    token,
  );
  await page
    .getByRole("button", { name: "Connected devices", exact: true })
    .click();
  await expect(page.getByText("Old phone", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Remove device", exact: true })
    .click();
  expect(removedDevice).toBe(false);
  await page
    .getByRole("button", { name: "Confirm removal", exact: true })
    .click();
  await expect(page.getByText("Old phone", { exact: true })).toHaveCount(0);
  expect(removedDevice).toBe(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Posnic Cloud" }),
  ).toBeVisible();
  expect(revoked).toBe(true);
  await popup.close().catch(() => {});
});
test("sample scope, item paging, offline refresh and restricted access", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample business" }).click();
  await expect(
    page.getByRole("button", { name: "All branches", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("₹42,850.00", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/business-today.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Insights" }).click();
  await page.getByRole("button", { name: "Masala dosa", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Paneer wrap" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "More" }).click();
  await page
    .getByRole("button", {
      name: "Reporting manager · one branch",
      exact: true,
    })
    .click();
  await expect(page.getByText("Central branch", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "All branches", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "More" }).click();
  await page.getByRole("button", { name: "Offline", exact: true }).click();
  await page.getByRole("tab", { name: "Today" }).click();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("Offline. Saved figures remain visible.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "More" }).click();
  await page
    .getByRole("button", { name: "Stock supervisor · one branch", exact: true })
    .click();
  await expect(page.getByText("Net sales", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Stock watch", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "More" }).click();
  await page
    .getByRole("button", { name: "No branch access", exact: true })
    .click();
  await expect(
    page.getByText(
      "Ask your administrator for access. No business data is loaded.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("Cloud and Community do not impersonate completed authorization", async ({
  page,
}) => {
  await page.route(
    "https://www.posnic.com/api/business/v1/discovery",
    (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: "{}",
      }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue with Posnic Cloud" })
    .click();
  await expect(
    page.getByText(/This server does not yet support Posnic Business/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect your own server" }).click();
  await page
    .getByRole("textbox", { name: "HTTPS server address" })
    .fill("http://shop.example.com");
  await page.getByRole("button", { name: "Check server", exact: true }).click();
  await expect(
    page.getByText(/Use a secure HTTPS server origin/),
  ).toBeVisible();
});
test("Community compatibility does not sign in and obsolete checks cannot update the welcome screen", async ({
  page,
}) => {
  const origin = "https://shop.example.com";
  const body = JSON.stringify({
    product: "posnic-business",
    apiVersion: 1,
    issuer: origin,
    authorization: "business-pkce-v1",
    audience: "posnic-business",
    reporting: "bounded-summary-v1",
  });
  await page.route(origin + "/api/business/v1/discovery", (route) =>
    route.fulfill({ contentType: "application/json", body }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Connect your own server" }).click();
  await page
    .getByRole("textbox", { name: "HTTPS server address" })
    .fill(origin);
  await page.getByRole("button", { name: "Check server", exact: true }).click();
  await expect(
    page.getByText(/This server supports the Business connection protocol/),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Today" })).toHaveCount(0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.unroute(origin + "/api/business/v1/discovery");
  await page.route(origin + "/api/business/v1/discovery", async (route) => {
    await gate;
    await route
      .fulfill({ contentType: "application/json", body })
      .catch(() => {});
  });
  await page.getByRole("button", { name: "Check server", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Checking server…", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  release();
  await expect(
    page.getByRole("button", { name: "Continue with Posnic Cloud" }),
  ).toBeEnabled();
  await expect(
    page.getByText(/This server supports the Business connection protocol/),
  ).toHaveCount(0);
});
test("small screen has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample business" }).click();
  for (const tab of ["Today", "Insights", "Inbox", "More"]) {
    await page.getByRole("tab", { name: tab }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
