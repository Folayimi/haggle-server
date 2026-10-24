import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRecencyFactor,
  getViewDedupeBucket,
  isValidListingReview,
  TRENDING_WEIGHTS,
} from "../utils/listing-discovery";

test("listing review ratings accept only whole stars from one through five", () => {
  for (const rating of [1, 2, 3, 4, 5]) assert.equal(isValidListingReview(rating), true);
  for (const rating of [0, 6, 1.5, "5", null, undefined]) assert.equal(isValidListingReview(rating), false);
});

test("view deduplication uses stable thirty-minute buckets", () => {
  const start = 1_800_000_000_000;
  assert.equal(getViewDedupeBucket(start), getViewDedupeBucket(start + 29 * 60_000));
  assert.notEqual(getViewDedupeBucket(start), getViewDedupeBucket(start + 30 * 60_000));
});

test("trending weights favor deliberate marketplace actions", () => {
  assert.ok(TRENDING_WEIGHTS.negotiation_started > TRENDING_WEIGHTS.view);
  assert.ok(TRENDING_WEIGHTS.contact_seller > TRENDING_WEIGHTS.tap);
});

test("trending scores decay with age and retain a low floor", () => {
  assert.equal(applyRecencyFactor(10, 0), 10);
  assert.ok(applyRecencyFactor(10, 7 * 86400000) < 10);
  assert.equal(applyRecencyFactor(10, 30 * 86400000), 1);
});
