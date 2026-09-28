import { test, expect } from "@playwright/test";

test("language choice persists and changing it preserves the sample screen and branch access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("radio", { name: "Français", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Votre activité à portée de main." }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Français", exact: true }),
  ).toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("posnic.business.language")),
    )
    .toBe("fr");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Votre activité à portée de main." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page
    .getByRole("button", { name: "Explorer l’entreprise de démonstration" })
    .click();
  await page.getByRole("tab", { name: "Plus", exact: true }).click();
  await page.getByRole("radio", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "More", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Leave sample business" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore sample business" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("radio", { name: "Français", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("an unavailable or malformed saved language falls back without blocking startup", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("posnic.business.language", "constructor"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your business. Within reach." }),
  ).toBeVisible();
});
