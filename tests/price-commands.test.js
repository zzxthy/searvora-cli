import test from "node:test";
import assert from "node:assert/strict";
import { __test__ } from "../src/commands/price.js";

function context(fetchImpl) {
  return {
    profileName: "local",
    profile: { gatewayUrl: "http://gateway.test", pricingBaseUrl: "https://searvora.com" },
    auth: { accessToken: "tok" },
    globals: {},
    fetchImpl,
  };
}

test("price checkout uses switch endpoint for non-trial checkout body", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ checkout_url: "https://pay.test/switch" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const result = await __test__.checkout({ scope: "universal", plan: "basic", interval: "monthly" }, context(fetchImpl), "zh");
  assert.equal(result.ok, true);
  assert.match(captured.url, /\/api\/v1\/subscription\/switch$/);
  assert.deepEqual(captured.body, {
    target_scope: "universal",
    target_plan: "basic",
    billing_interval: "monthly",
    success_url: "https://searvora.com/zh/pricing?checkout=success",
  });
});

test("price checkout uses checkout endpoint and trial fields for trial domain", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ checkout_url: "https://pay.test/trial" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  await __test__.checkout({ scope: "universal", plan: "basic", interval: "monthly", trialDomain: "example.com" }, context(fetchImpl), "en");
  assert.match(captured.url, /\/api\/v1\/subscription\/checkout$/);
  assert.equal(captured.body.domain, "example.com");
  assert.equal(captured.body.trial_requested, true);
});

test("price cancel maps --scope to Gateway subscription_scope", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ canceled: true }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const result = await __test__.cancel({ scope: "sfm", immediately: true }, context(fetchImpl), "en");
  assert.equal(result.ok, true);
  assert.match(captured.url, /\/api\/v1\/subscription\/cancel$/);
  assert.deepEqual(captured.body, { subscription_scope: "sfm", immediately: true });
});
