import test from "node:test";
import assert from "node:assert/strict";
import { handlePrice } from "../../src/commands/price.js";
import { __test__ } from "../../src/commands/price.js";

function context(fetchImpl) {
  return {
    profileName: "local",
    profile: { gatewayUrl: "http://gateway.test", pricingBaseUrl: "https://searvora.com" },
    auth: { accessToken: "tok" },
    globals: { locale: "tw" },
    fetchImpl,
  };
}

test("price url and open produce localized pricing page targets", async () => {
  const url = await handlePrice({ action: "url", args: [], context: context() });
  assert.equal(url.data.pricing_url, "https://searvora.com/tw/pricing");
  const open = await handlePrice({ action: "open", args: ["--locale", "zh"], context: context() });
  assert.equal(open.data.open_command, "open https://searvora.com/zh/pricing");
});

test("price current/plans/portal call Gateway GET endpoints", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  await handlePrice({ action: "current", args: [], context: context(fetchImpl) });
  await handlePrice({ action: "plans", args: [], context: context(fetchImpl) });
  await handlePrice({ action: "portal", args: [], context: context(fetchImpl) });
  assert.deepEqual(urls, [
    "http://gateway.test/api/v1/subscription/current",
    "http://gateway.test/api/v1/subscription/config-status",
    "http://gateway.test/api/v1/subscription/portal",
  ]);
});

test("price GET failures include localized pricing URL on 402", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ detail: { code: "upgrade_required", message: "Upgrade" } }), { status: 402 });
  const result = await handlePrice({ action: "current", args: ["--locale", "zh"], context: context(fetchImpl) });
  assert.equal(result.ok, false);
  assert.equal(result.error.pricing_url, "https://searvora.com/zh/pricing");
});

test("price help and unknown actions are explicit", async () => {
  assert.match(await handlePrice({ action: "help", args: [], context: context() }), /searvora price checkout/);
  await assert.rejects(() => handlePrice({ action: "missing", args: [], context: context() }), /Unknown price action/);
});

test("postSubscription wraps Gateway failures with request context", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ detail: { code: "bad_scope", message: "Bad scope" } }), { status: 400 });
  const body = { target_scope: "bad" };
  const result = await __test__.postSubscription("price.checkout", "/api/v1/subscription/switch", body, context(fetchImpl), "en");
  assert.equal(result.ok, false);
  assert.equal(result.request, body);
  assert.equal(result.error.code, "bad_scope");
});
