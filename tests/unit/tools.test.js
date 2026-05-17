import test from "node:test";
import assert from "node:assert/strict";
import { handleTools, __test__ } from "../../src/commands/tools.js";

function context(fetchImpl) {
  return {
    profileName: "local",
    profile: { marketingUrl: "http://marketing.test", gatewayUrl: "http://gateway.test", pricingBaseUrl: "https://searvora.com" },
    auth: { accessToken: "test-access-token" },
    globals: {},
    fetchImpl,
  };
}

test("resolveTool supports two- and three-part tool commands", () => {
  assert.equal(__test__.resolveTool("canonical", ["check", "--url", "https://example.com"]).tool.slug, "canonical-checker");
  assert.equal(__test__.resolveTool("meta", ["title", "--keyword", "seo"]).tool.slug, "meta-title-generator");
  assert.equal(__test__.resolveTool("missing", []), null);
});

test("tools list returns marketing tool catalog", async () => {
  const result = await handleTools({ action: "list", args: [], context: context() });
  assert.equal(result.command, "tools.list");
  assert.ok(result.data.tools.some((tool) => tool.slug === "sitemap-validator"));
});

test("tool invocation posts parsed options to marketing endpoint", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(init.body), headers: init.headers };
    return new Response(JSON.stringify({ result: true }), { status: 200 });
  };
  const result = await handleTools({ action: "canonical", args: ["check", "--url", "https://example.com"], context: context(fetchImpl) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "http://marketing.test/api/tools/canonical-checker");
  assert.deepEqual(captured.body, { url: "https://example.com" });
  assert.equal(captured.headers.Authorization, "Bearer test-access-token");
  assert.equal(captured.headers.Cookie, "access_token=test-access-token");
});

test("tools runs list and get use Gateway endpoints", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  await handleTools({ action: "runs", args: [], context: context(fetchImpl) });
  await handleTools({ action: "runs", args: ["get", "run_123"], context: context(fetchImpl) });
  assert.deepEqual(urls, ["http://gateway.test/api/v1/tools/runs", "http://gateway.test/api/v1/tools/runs/run_123"]);
});

test("toolCookieHeaders mirrors access token into marketing cookie auth", () => {
  assert.deepEqual(__test__.toolCookieHeaders({ accessToken: "test-access-token" }), { Cookie: "access_token=test-access-token" });
  assert.deepEqual(__test__.toolCookieHeaders({}), {});
});
