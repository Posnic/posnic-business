import test from "node:test";
import assert from "node:assert/strict";
import { sampleContext } from "../src/data/sample";
import {
  branchDay,
  validatePreparedOverview,
} from "../src/domain/preparedOverview";

const context = sampleContext("manager"),
  ids = context.branches.map((b) => b.id),
  day = "2026-09-28";
const value = {
  schemaVersion: 2,
  metricDefinitionVersion: 2,
  businessId: context.businessId,
  branchIds: ids,
  businessDate: day,
  currency: "INR",
  currencyDigits: 2,
  billedSalesMinor: 0,
  refundsMinor: 2500,
  salesAfterReturnsMinor: -2500,
  completedSales: 0,
  preparedAt: "2026-09-28T01:00:00.000Z",
  freshness: {
    state: "partial",
    sourceUpdatedAt: null,
    checkedAt: "2026-09-28T01:01:00.000Z",
    complete: false,
  },
};
test("live summaries allow a return-only negative day and reject conflicting definitions, scope and completeness", () => {
  assert.deepEqual(validatePreparedOverview(value, context, ids, day), value);
  for (const change of [
    { schemaVersion: 1 },
    { metricDefinitionVersion: 1 },
    { currency: "USD" },
    { branchIds: [...ids, ...ids] },
    { businessId: "other" },
    { businessDate: "2026-09-27" },
    { billedSalesMinor: -1 },
    { refundsMinor: Infinity },
    { salesAfterReturnsMinor: 0 },
    { preparedAt: "2026-09-29T01:00:00.000Z" },
    { freshness: { ...value.freshness, complete: true } },
    { freshness: { ...value.freshness, state: "current" } },
    { customerName: "must not be exposed" },
  ])
    assert.throws(() =>
      validatePreparedOverview({ ...value, ...change }, context, ids, day),
    );
  assert.throws(() =>
    validatePreparedOverview(value, sampleContext("stock"), ids, day),
  );
});
test("Today follows branch time at midnight and across daylight-saving boundaries", () => {
  assert.equal(
    branchDay("Asia/Kolkata", new Date("2026-09-27T19:00:00Z")),
    "2026-09-28",
  );
  assert.equal(
    branchDay("America/New_York", new Date("2026-09-28T01:00:00Z")),
    "2026-09-27",
  );
  assert.equal(
    branchDay("America/New_York", new Date("2026-11-01T06:30:00Z")),
    "2026-11-01",
  );
});
