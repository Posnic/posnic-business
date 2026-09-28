import { test, expect } from "@playwright/test";
import { releaseLanguages } from "../../src/i18n";
import ne from "../../src/i18n/ne.json";
import fr from "../../src/i18n/fr.json";

test.use({ locale: "fr-CA", timezoneId: "Asia/Kathmandu" });

test("missing locale data is bundled without changing device language, timezone or branch dates", async ({
  page,
}) => {
  await page.goto("/");
  // Initialization must not replace the phone's language preference with English.
  await expect(page.getByRole("heading", { name: fr.welcome })).toBeVisible();
  const result = await page.evaluate(
    (thaiLocale) => {
      const locales = [
        "en-IN",
        "ta",
        "hi",
        "ml",
        "kn",
        "te",
        "si",
        "ne",
        "ar",
        "fr",
        "es",
        "pt-PT",
        "id",
        "th",
        "de",
        "sw",
        "nl",
        "it",
      ];
      const instant = new Date("2026-09-28T20:00:00Z");
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(instant);
      return {
        numbers: Intl.NumberFormat.supportedLocalesOf(locales),
        dates: Intl.DateTimeFormat.supportedLocalesOf(locales),
        plural: Intl.PluralRules.supportedLocalesOf(locales),
        nepali: new Intl.NumberFormat("ne", { useGrouping: false }).format(
          1234567890,
        ),
        localHour: new Intl.DateTimeFormat("en", {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(instant),
        branchDay: ["year", "month", "day"]
          .map((type) => parts.find((part) => part.type === type)!.value)
          .join("-"),
        date: instant.toLocaleDateString("ne", {
          timeZone: "Asia/Kathmandu",
          year: "numeric",
        }),
        thaiYear: new Intl.DateTimeFormat(thaiLocale, {
          timeZone: "Asia/Bangkok",
          year: "numeric",
        })
          .formatToParts(instant)
          .find((part) => part.type === "year")?.value,
        thaiCalendar: new Intl.DateTimeFormat(thaiLocale).resolvedOptions()
          .calendar,
        zero: new Intl.NumberFormat("ne", {
          style: "currency",
          currency: "JPY",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).formatToParts(123),
        three: new Intl.NumberFormat("ne", {
          style: "currency",
          currency: "KWD",
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }).formatToParts(1.234),
      };
    },
    releaseLanguages.find((language) => language.code === "th")!.formatLocale,
  );
  expect(result.numbers).toHaveLength(18);
  expect(result.dates).toHaveLength(18);
  expect(result.plural).toHaveLength(18);
  expect(result.nepali).toBe("१२३४५६७८९०");
  expect(result.localHour).toBe("01:45");
  expect(result.branchDay).toBe("2026-09-29");
  expect(result.date).toContain("२०२६");
  expect(result.thaiYear).toBe("2569");
  expect(result.thaiCalendar).toBe("buddhist");
  expect(result.zero.some((part) => part.type === "fraction")).toBe(false);
  expect(result.three.find((part) => part.type === "fraction")?.value).toBe(
    "२३४",
  );
});

test("Nepali sample renders actual localized amounts after a reload", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("posnic.business.language", "ne"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: ne.sample, exact: true }).click();
  await expect(page.getByText(/४२,८५०\.००/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: ne.sample, exact: true }).click();
  await expect(page.getByText(/४२,८५०\.००/)).toBeVisible();
});
