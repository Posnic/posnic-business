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
  let summaryUnavailable = false;
  let publisherChanged = false;
  let inboxRead = false;
  let notificationRevision = 0;
  const liveContext = {
    ...sampleContext("manager"),
    businessName: "Connected test business",
    branches: sampleContext("manager").branches.map((branch) => ({
      ...branch,
      id: "a".repeat(24),
    })),
    capabilities: [
      ...sampleContext("manager").capabilities,
      "reporting.manage",
    ],
  };
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
        reporting: "bounded-summary-v2",
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
        context: liveContext,
      };
    else if (url.pathname.endsWith("/overview")) {
      expect(route.request().headers().authorization).toBe("Bearer " + token);
      const scope = liveContext;
      expect(url.searchParams.getAll("branchId")).toEqual(
        scope.branches.map((b) => b.id),
      );
      if (summaryUnavailable) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "summary_unavailable" }),
        });
        return;
      }
      result = {
        schemaVersion: 2,
        metricDefinitionVersion: 2,
        businessId: scope.businessId,
        branchIds: scope.branches.map((b) => b.id),
        businessDate: url.searchParams.get("businessDate"),
        currency: "INR",
        currencyDigits: 2,
        billedSalesMinor: 10000,
        refundsMinor: 2500,
        salesAfterReturnsMinor: 7500,
        completedSales: 2,
        preparedAt: new Date().toISOString(),
        freshness: {
          state: "partial",
          sourceUpdatedAt: null,
          checkedAt: new Date().toISOString(),
          complete: false,
        },
      };
    } else if (url.pathname.includes("/notifications/preferences/")) {
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON().expectedRevision).toBe(0);
        expect(route.request().postDataJSON().time).toBe("21:30");
        notificationRevision++;
      }
      result = {
        branchId: liveContext.branches[0]!.id,
        timezone: "Asia/Kolkata",
        revision: notificationRevision,
        enabled: notificationRevision > 0,
        time: notificationRevision ? "21:30" : "23:00",
        quiet: { enabled: false, start: "22:00", end: "07:00" },
        locale: "en",
        channel: "inApp",
        nextSendAt: null,
      };
    } else if (url.pathname.endsWith("/inbox")) {
      result = {
        entries: [
          {
            id: "e".repeat(24),
            branchId: liveContext.branches[0]!.id,
            kind: "daily_unavailable",
            businessDate: "2026-09-28",
            createdAt: new Date().toISOString(),
            read: inboxRead,
            summary: null,
          },
        ],
        next: null,
      };
    } else if (url.pathname.endsWith("/inbox/" + "e".repeat(24) + "/read")) {
      expect(route.request().method()).toBe("POST");
      inboxRead = true;
      result = { read: true };
    } else if (url.pathname.includes("/reporting/publishers/")) {
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON()).toEqual({
          deviceId: "till-b",
          expectedEpoch: 1,
        });
        publisherChanged = true;
        summaryUnavailable = true;
        result = { changed: true, epoch: 2 };
      } else
        result = {
          branchId: liveContext.branches[0]!.id,
          publisher: {
            deviceId: publisherChanged ? "till-b" : "till-a",
            name: publisherChanged ? "Front desk" : "Old desk",
            epoch: publisherChanged ? 2 : 1,
            online: true,
            lastPublishedAt: null,
          },
          candidates: [
            {
              deviceId: "till-b",
              name: "Front desk",
              lastSeenAt: new Date().toISOString(),
            },
          ],
        };
    } else if (url.pathname.endsWith("/sessions")) {
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
  await expect(page.getByText("₹75.00", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Some sales may still be syncing", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/business-live-today.png",
    fullPage: true,
  });
  for (const name of ["Today", "Inbox", "More"]) {
    const label = page
      .getByRole("tab", { name, exact: true })
      .getByText(name, { exact: true });
    const bounds = await label.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  }
  await page.setViewportSize({ width: 320, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Notification settings", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "More", exact: true }).click();
  await page.screenshot({
    path: "test-results/business-more.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Notification settings", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Summary time (24-hour HH:mm)" })
    .fill("21:30");
  await page
    .getByRole("button", { name: "Close notification settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Discard changes?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Summary time (24-hour HH:mm)" }),
  ).toHaveValue("21:30");
  await page
    .getByRole("switch", { name: "Daily summary", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save notification settings", exact: true })
    .click();
  await expect(
    page.getByText("Notification settings saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close notification settings", exact: true })
    .click();
  await page.getByRole("tab", { name: "Inbox", exact: true }).click();
  await expect(
    page.getByText(/A verified summary was unavailable at the scheduled time/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mark as read", exact: true }),
  ).toHaveCount(0);
  expect(inboxRead).toBe(true);
  await page.screenshot({
    path: "test-results/business-inbox.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "More", exact: true }).click();
  await page
    .getByRole("button", { name: "Reporting desktop", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use Front desk", exact: true })
    .click();
  expect(publisherChanged).toBe(false);
  await page
    .getByRole("button", { name: "Confirm desktop change", exact: true })
    .click();
  await expect(page.getByText(/Reporting desktop updated/)).toBeVisible();
  expect(publisherChanged).toBe(true);
  await page
    .getByRole("button", { name: "Close desktop settings", exact: true })
    .click();
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await expect(page.getByText("₹75.00", { exact: true })).toHaveCount(0);
  summaryUnavailable = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText(/A prepared summary is not available yet/),
  ).toBeVisible();
  await expect(page.getByText("₹75.00", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    token,
  );
  await page.getByRole("tab", { name: "More", exact: true }).click();
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
  await page
    .getByRole("button", { name: "Close devices", exact: true })
    .click();
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
