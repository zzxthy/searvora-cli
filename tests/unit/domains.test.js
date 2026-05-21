import test from "node:test";
import assert from "node:assert/strict";
import { handleDomains } from "../../src/commands/domains.js";

function context(fetchImpl, auth = { accessToken: "tok" }) {
  return {
    profileName: "public",
    profile: { gatewayUrl: "http://gateway.test", pricingBaseUrl: "https://searvora.com" },
    auth,
    globals: {},
    fetchImpl,
  };
}

test("domains require access token", async () => {
  const result = await handleDomains({ action: "list", args: [], context: context(undefined, {}) });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "missing_access_token");
});

test("domains list calls Gateway with bearer token", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify([{ root_domain: "example.com" }]), { status: 200 });
  };
  const result = await handleDomains({ action: "list", args: [], context: context(fetchImpl) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "http://gateway.test/api/v1/domains");
  assert.equal(captured.init.headers.Authorization, "Bearer tok");
});

test("domains add posts root domain", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ id: 1, root_domain: "example.com" }), { status: 201 });
  };
  const result = await handleDomains({ action: "add", args: ["--domain", "https://www.example.com/page", "--display-name", "Example"], context: context(fetchImpl) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "http://gateway.test/api/v1/domains");
  assert.deepEqual(captured.body, { root_domain: "https://www.example.com/page", display_name: "Example" });
});

test("domains remove accepts id flag", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), method: init.method };
    return new Response(null, { status: 204 });
  };
  const result = await handleDomains({ action: "remove", args: ["--id", "12"], context: context(fetchImpl) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "http://gateway.test/api/v1/domains/12");
  assert.equal(captured.method, "DELETE");
});

test("domains access-check posts product and domain", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ allowed: true, canonical_root_domain: "example.com" }), { status: 200 });
  };
  const result = await handleDomains({ action: "access-check", args: ["--domain", "example.com", "--product", "sfm"], context: context(fetchImpl) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "http://gateway.test/api/v1/domains/access-check");
  assert.deepEqual(captured.body, { product: "sfm", domain_or_url: "example.com" });
});
