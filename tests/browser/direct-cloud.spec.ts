import { test, expect } from "@playwright/test";

test("one Cloud tap opens device approval and cancel permits a fresh request", async ({
  page,
  context,
}) => {
  const origin = "https://www.posnic.com";
  let requests = 0;
  await context.route(origin + "/api/business/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/authorize")) {
      await route.fulfill({
        contentType: "text/html",
        body: "<h1>Approve Business device</h1>",
      });
      return;
    }
    let body: unknown;
    if (path.endsWith("/discovery"))
      body = {
        product: "posnic-business",
        apiVersion: 1,
        issuer: origin,
        authorization: "business-cloud-pkce-v1",
        audience: "posnic-business",
        reporting: "unavailable",
      };
    else if (path.endsWith("/requests")) {
      requests++;
      expect(route.request().postDataJSON().codeChallenge).toMatch(
        /^[\w-]{43}$/,
      );
      const request = String(requests).repeat(43);
      body = {
        request,
        authorizationUrl:
          origin + "/api/business/v1/authorize?request=" + request,
        expiresIn: 600,
        interval: 5,
      };
    } else body = { error: { code: "authorization_pending" } };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Continue with Posnic Cloud", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "Approve Business device" }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await expect(page.getByText("Match this code on the sign-in page")).toHaveCount(0);
  await expect(page.getByText(origin, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Today" })).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Continue with Posnic Cloud",
      exact: true,
    }),
  ).toBeDisabled();
  await popup.close();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Continue with Posnic Cloud",
      exact: true,
    }),
  ).toBeEnabled();
  const secondPopup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Continue with Posnic Cloud", exact: true })
    .click();
  const second = await secondPopup;
  await expect(
    second.getByRole("heading", { name: "Approve Business device" }),
  ).toBeVisible();
  expect(requests).toBe(2);
  await second.close();
});
