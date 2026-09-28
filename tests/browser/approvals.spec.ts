import { test, expect } from "@playwright/test";
import { type Decision } from "../../src/services/decisions";

test("review confirms identity and reconciles a lost decision response without claiming the till applied it", async ({
  page,
  context,
}) => {
  const origin = "https://approvals.example.com",
    token = "pb1_" + "t".repeat(43),
    proof = "pb1_" + "p".repeat(43);
  const account = {
    accountId: "1".repeat(24),
    businessId: "2".repeat(24),
    businessName: "Approval test business",
    capabilities: ["approvals.read", "discounts.approve"],
    branches: [
      {
        id: "3".repeat(24),
        name: "Central",
        currency: "INR",
        currencyDigits: 2,
        timezone: "Asia/Kolkata",
      },
    ],
  };
  let stepUp = false,
    decisions = 0,
    proofRevoked = false;
  let row: Decision = {
    id: "4".repeat(24),
    branchId: account.branches[0]!.id,
    action: "discount_apply",
    state: "pending",
    revision: 0,
    requester: { id: "5".repeat(24), name: "Anita" },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    summary: {
      beforeDiscountMinor: 10000,
      discountMinor: 2000,
      payableMinor: 8000,
      roundingMinor: 0,
      currency: "INR",
      currencyDigits: 2,
      itemCount: 2,
      reason: "Regular customer",
    },
    canDecide: true,
    unavailableReason: null,
    requiresStepUp: true,
    decision: null,
    timeline: [{ state: "pending", at: new Date().toISOString() }],
  };
  await context.route(origin + "/api/business/v1/**", async (route) => {
    const url = new URL(route.request().url()),
      endpoint = url.pathname.slice("/api/business/v1".length);
    let result: unknown;
    if (endpoint === "/discovery")
      result = {
        product: "posnic-business",
        apiVersion: 1,
        issuer: origin,
        authorization: "business-pkce-v1",
        audience: "posnic-business",
        reporting: "unavailable",
      };
    else if (endpoint === "/requests") {
      stepUp = route.request().postDataJSON().stepUp === true;
      const request = (stepUp ? "s" : "r").repeat(43);
      result = {
        request,
        authorizationUrl:
          origin + "/api/business/v1/authorize?request=" + request,
        expiresIn: 600,
        interval: 5,
      };
    } else if (endpoint === "/authorize") {
      await route.fulfill({
        contentType: "text/html",
        body: "<h1>Test password confirmed</h1>",
      });
      return;
    } else if (endpoint === "/token")
      result = {
        token: stepUp ? proof : token,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        context: account,
      };
    else if (endpoint === "/decisions")
      result = { schemaVersion: 1, entries: [row], nextCursor: null };
    else if (endpoint === "/decisions/" + row.id) {
      expect(route.request().headers().authorization).toBe("Bearer " + token);
      if (route.request().method() === "POST") {
        const command = route.request().postDataJSON();
        expect(command.confirmationToken).toBe(proof);
        expect(command.expectedRevision).toBe(0);
        expect(command.outcome).toBe("approved");
        decisions++;
        row = {
          ...row,
          state: "approved",
          revision: 1,
          canDecide: false,
          unavailableReason: "closed",
          requiresStepUp: false,
          decision: {
            id: command.decisionId,
            outcome: "approved",
            reason: command.reason,
            approver: { id: account.accountId, name: "Owner" },
          },
          timeline: [
            ...row.timeline,
            { state: "approved", at: new Date().toISOString() },
          ],
        };
        await route.abort("connectionreset");
        return;
      }
      result = row;
    } else if (endpoint === "/session") {
      expect(route.request().headers().authorization).toBe("Bearer " + proof);
      proofRevoked = true;
      result = { revoked: true };
    } else throw new Error("Unexpected endpoint " + endpoint);
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
  let popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "Open secure sign-in" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await page.bringToFront();
  await expect(
    page.getByRole("heading", { name: account.businessName }),
  ).toBeVisible({ timeout: 12000 });
  await page.getByRole("tab", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "All branches", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await expect(
    page.getByText("Customer pays: ₹80.00", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm approval", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Decision note" })
    .fill("Customer loyalty");
  await page
    .getByRole("button", { name: "Confirm identity", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm identity", exact: true })
    .last()
    .click();
  await expect(page.getByText("SSSSSS", { exact: true })).toBeVisible();
  popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "Open secure sign-in" }).click();
  const confirmPopup = await popupPromise;
  await confirmPopup.waitForLoadState();
  await page.bringToFront();
  await expect(
    page.getByRole("button", { name: "Confirm approval", exact: true }),
  ).toBeEnabled({ timeout: 12000 });
  expect(decisions).toBe(0);
  await page.screenshot({
    path: "test-results/business-approval-review.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirm approval", exact: true })
    .click();
  await expect(page.getByText(/The response was interrupted/)).toBeVisible();
  expect(decisions).toBe(1);
  await expect(page.getByText("Applied at till", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText(/Your approval is recorded/)).toBeVisible();
  await expect.poll(() => proofRevoked).toBe(true);
  expect(decisions).toBe(1);
  await expect(
    page.getByRole("button", { name: "Confirm approval", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/business-approval-recorded.png",
    fullPage: true,
  });
  await popup.close().catch(() => {});
  await confirmPopup.close().catch(() => {});
});
