import test from "node:test";
import assert from "node:assert/strict";
import { handleAnalysis, handleContent, handleFacts, handleSpider, __test__ } from "../../src/commands/proxy.js";

function context(fetchImpl) {
  return {
    profileName: "local",
    profile: {
      dataPlaneUrl: "http://facts.test",
      sdpUrl: "http://sdp.test",
      sfmUrl: "http://sfm.test",
      blogifyUrl: "http://blogify.test",
      pricingBaseUrl: "https://searvora.com",
    },
    auth: { serviceKey: "svc", platformUserId: "user", accessToken: "access" },
    globals: { locale: "en" },
    fetchImpl,
  };
}

test("proxy helpers expose expected endpoint catalogs and snake-case conversion", () => {
  assert.equal(__test__.FACTS_ENDPOINTS.audit.path, "/api/internal/audit/issues");
  assert.equal(__test__.ANALYSIS_ENDPOINTS.plan.method, "POST");
  assert.equal(__test__.SPIDER_ENDPOINTS["crawl-create"].method, "POST");
  assert.equal(__test__.CONTENT_ENDPOINTS.articles.path, "/api/v1/blog/articles");
  assert.equal(__test__.toSnake("rangeDays"), "range_days");
});

test("facts proxy forwards internal headers and allowed query fields", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify({ issues: [] }), { status: 200 });
  };
  const result = await handleFacts({ action: "audit", args: ["--domain", "example.com", "--limit", "5", "--ignored", "x"], context: context(fetchImpl) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "http://facts.test/api/internal/audit/issues?domain=example.com&limit=5");
  assert.equal(captured.init.headers["X-Service-Key"], "svc");
  assert.equal(captured.init.headers["X-Platform-User-Id"], "user");
});

test("analysis plan posts options as body", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ plan: [] }), { status: 200 });
  };
  await handleAnalysis({ action: "plan", args: ["--domain", "example.com"], context: context(fetchImpl) });
  assert.equal(captured.url, "http://sdp.test/api/ai-plan");
  assert.deepEqual(captured.body, { domain: "example.com" });
});

test("spider crawl create and list route to distinct endpoints", async () => {
  const captured = [];
  const fetchImpl = async (url, init) => {
    captured.push({ url: String(url), body: init.body ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  await handleSpider({ action: "crawl", args: ["--limit", "10"], context: context(fetchImpl) });
  await handleSpider({ action: "crawl", args: ["create", "--url", "https://example.com"], context: context(fetchImpl) });
  assert.deepEqual(captured, [
    { url: "http://sfm.test/api/crawl/tasks?limit=10", body: undefined },
    { url: "http://sfm.test/api/crawl/tasks", body: { url: "https://example.com" } },
  ]);
});

test("content proxy forwards access token and wraps http failures", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ detail: "Nope" }), { status: 500 });
  const result = await handleContent({ action: "articles", args: [], context: context(fetchImpl) });
  assert.equal(result.ok, false);
  assert.equal(result.command, "content./api/v1/blog/articles");
  assert.equal(result.error.code, "http_500");
});
