import test from "node:test";
import assert from "node:assert/strict";
import { createTranslator, validateCatalog } from "../src/i18n/translator";
import { releaseLanguages, t } from "../src/i18n";
import { normalizeDigits, pinInput } from "../src/i18n/digits";

const messages = { amount: "Pay {value}", state: "Approved" };

test("native decimal keyboards preserve PIN digits and schedule punctuation", () => {
  for (const pin of [
    "٣١٤١٥٩",
    "۳۱۴۱۵۹",
    "३१४१५९",
    "௩௧௪௧௫௯",
    "౩౧౪౧౫౯",
    "೩೧೪೧೫೯",
    "൩൧൪൧൫൯",
    "๓๑๔๑๕๙",
    "３１４１５９",
  ]) {
    assert.equal(pinInput(pin), "314159");
  }
  assert.equal(pinInput("12345678"), "123456");
  assert.equal(pinInput("12a٣-٤"), "1234");
  assert.equal(normalizeDigits("٢٣:٠٥"), "23:05");
  assert.equal(normalizeDigits("10:ab"), "10:ab");
});
const languages = [
  { code: "en", name: "English", formatLocale: "en-IN", rtl: false },
  { code: "fr", name: "Français", formatLocale: "fr", rtl: false },
  { code: "ar", name: "العربية", formatLocale: "ar", rtl: true },
];
const catalogs = {
  en: messages,
  fr: { amount: "Payer {value}", state: "Approuvé" },
  ar: { amount: "ادفع {value}", state: "تمت الموافقة" },
};

test("language selection uses complete packs and preserves regional preference order", () => {
  const engine = createTranslator(messages, languages, catalogs);
  assert.equal(engine.resolveLocale(["zz-ZZ", "fr-CA", "ar"]), "fr");
  assert.equal(engine.resolveLocale(["AR_eg"]), "ar");
  assert.equal(engine.resolveLocale(["constructor"]), "en");
  assert.equal(engine.setLocale("fr"), true);
  assert.equal(
    engine.translate("amount", { value: "12,00 €" }),
    "Payer 12,00 €",
  );
  assert.equal(engine.setLocale("constructor"), false);
  assert.equal(engine.getLocale(), "fr");
});

test("catalog validation rejects missing messages and changed financial placeholders", () => {
  for (const invalid of [
    null,
    [],
    { amount: "Payer {value}" },
    { ...catalogs.fr, extra: "Extra" },
    { ...catalogs.fr, amount: "Payer" },
    { ...catalogs.fr, amount: "Payer {amount}" },
    { ...catalogs.fr, amount: "Payer {value} {value}" },
    { ...catalogs.fr, state: " " },
  ])
    assert.throws(() => validateCatalog(messages, invalid));
  assert.throws(() =>
    createTranslator(messages, languages, { fr: catalogs.fr }),
  );
});

test("RTL interpolation isolates amounts, never expands inherited or nested values", () => {
  const engine = createTranslator(messages, languages, catalogs);
  engine.setLocale("ar");
  assert.equal(
    engine.translate("amount", { value: "INR 12.00" }),
    "ادفع \u2068INR 12.00\u2069",
  );
  assert.equal(
    engine.translate("amount", Object.create({ value: "hidden" })),
    "ادفع {value}",
  );
  engine.setLocale("en");
  assert.equal(engine.translate("amount", { value: "{state}" }), "Pay {state}");
});

test("locale subscriptions update only on change and are removable", () => {
  const engine = createTranslator(messages, languages, catalogs);
  let changes = 0;
  const remove = engine.subscribe(() => {
    changes++;
  });
  engine.setLocale("fr");
  engine.setLocale("fr");
  engine.setLocale("missing");
  assert.equal(changes, 1);
  remove();
  engine.setLocale("en");
  assert.equal(changes, 1);
});

test("the release registry distinguishes target languages from complete selectable packs", () => {
  assert.equal(releaseLanguages.length, 18);
  assert.equal(
    new Set(releaseLanguages.map((language) => language.code)).size,
    18,
  );
  assert.equal(
    t("decisionPayable", { amount: "₹12.00" }),
    "Customer pays: ₹12.00",
  );
});
