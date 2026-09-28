import { test, expect } from "@playwright/test";
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
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue with Posnic Cloud" })
    .click();
  await expect(
    page.getByText(/Business sign-in is not connected yet/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect your own server" }).click();
  await page
    .getByRole("textbox", { name: "HTTPS server address" })
    .fill("http://shop.example.com");
  await page.getByRole("button", { name: "Check address" }).click();
  await expect(
    page.getByText(/Use a secure HTTPS server origin/),
  ).toBeVisible();
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
