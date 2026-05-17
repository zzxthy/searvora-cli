import test from "node:test";
import assert from "node:assert/strict";
import { pricingPath, pricingSuccessUrl, pricingUrl } from "../src/lib/pricing.js";

const base = "https://searvora.com";

test("pricingPath maps supported locales to marketing pricing pages", () => {
  assert.equal(pricingPath("en"), "/pricing");
  assert.equal(pricingPath("zh"), "/zh/pricing");
  assert.equal(pricingPath("tw"), "/tw/pricing");
  assert.equal(pricingPath("bad"), "/pricing");
});

test("pricingUrl and pricingSuccessUrl build stable URLs", () => {
  assert.equal(pricingUrl(`${base}/`, "zh"), "https://searvora.com/zh/pricing");
  assert.equal(pricingSuccessUrl(base, "tw"), "https://searvora.com/tw/pricing?checkout=success");
});
