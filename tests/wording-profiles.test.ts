import test from "node:test";
import assert from "node:assert/strict";
import { createTranslator } from "../src/i18n/translator";

function create() {
  const en = {
    product: "Product",
    line: "Product: {name}",
    items: "{count} items",
  };
  return createTranslator(
    en,
    [
      { code: "en", name: "English", formatLocale: "en", rtl: false },
      { code: "fr", name: "French", formatLocale: "fr", rtl: false },
    ],
    {
      en,
      fr: {
        product: "Produit",
        line: "Produit: {name}",
        items: "{count} articles",
      },
    },
    "en",
    {
      en: {
        items: {
          argument: "count",
          forms: { one: "{count} item", other: "{count} items" },
        },
      },
    },
  );
}

test("published exact wording changes labels, never interpolated business data", () => {
  const engine = create();
  const generation = engine.beginWordingScope("server/tenant/branch/user");
  assert.equal(
    engine.applySourceWording(generation, "en", {
      Product: "Item",
      "Product: {name}": "Item: {name}",
      "{count} items": "{count} goods",
    }),
    true,
  );
  assert.equal(engine.translate("product"), "Item");
  assert.equal(
    engine.translate("line", { name: "Product sample" }),
    "Item: Product sample",
  );
  assert.equal(engine.translate("items", { count: 1 }), "1 item");
});

test("branch, account, logout and locale changes reject delayed responses", () => {
  const engine = create();
  const old = engine.beginWordingScope("server/tenant/A/user");
  const next = engine.beginWordingScope("server/tenant/B/user");
  assert.equal(
    engine.applySourceWording(old, "en", { Product: "Wrong shop" }),
    false,
  );
  engine.applySourceWording(next, "en", { Product: "Item" });
  engine.setLocale("fr");
  assert.equal(engine.translate("product"), "Produit");
  assert.equal(
    engine.applySourceWording(next, "en", { Product: "Wrong locale" }),
    false,
  );
  const french = engine.beginWordingScope("server/tenant/B/user");
  engine.applySourceWording(french, "fr", { Product: "Article" });
  engine.beginWordingScope(null);
  assert.equal(engine.translate("product"), "Produit");
  assert.equal(
    engine.applySourceWording(french, "fr", { Product: "Stale" }),
    false,
  );
});

test("invalid placeholders fall back, malformed bundles cannot replace accepted wording", () => {
  const engine = create();
  const generation = engine.beginWordingScope("scope");
  engine.applySourceWording(generation, "en", {
    Product: "Item",
    "Product: {name}": "Item: {other}",
  });
  assert.equal(engine.translate("line", { name: "Tea" }), "Product: Tea");
  assert.equal(
    engine.applySourceWording(generation, "en", { Product: 12 }),
    false,
  );
  assert.equal(engine.translate("product"), "Item");
  engine.applySourceWording(generation, "en", {});
  assert.equal(engine.translate("product"), "Product");
});

test("wording updates invalidate the React snapshot without changing language", () => {
  const engine = create();
  let notifications = 0;
  engine.subscribe(() => notifications++);
  const before = engine.getSnapshot();
  const generation = engine.beginWordingScope("scope");
  engine.applySourceWording(generation, "en", { Product: "Item" });
  assert.equal(engine.getLocale(), "en");
  assert.equal(engine.getSnapshot(), before + 2);
  assert.equal(notifications, 2);
});
