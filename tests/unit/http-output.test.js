import test from "node:test";
import assert from "node:assert/strict";
import { buildHeaders, envelopeHttpError, joinUrl, requestJson } from "../../src/lib/http.js";
import { commandError, makeEnvelope, printHuman, printJson, printResult } from "../../src/lib/output.js";

test("joinUrl normalizes slashes and rejects missing base URL", () => {
  assert.equal(joinUrl("https://example.com/", "/health"), "https://example.com/health");
  assert.equal(joinUrl("https://example.com", "api"), "https://example.com/api");
  assert.throws(() => joinUrl(null, "/x"), /Base URL is not configured/);
});

test("buildHeaders emits bearer or internal service headers", () => {
  assert.deepEqual(buildHeaders({ auth: { accessToken: "tok" } }), { "Content-Type": "application/json", Authorization: "Bearer tok" });
  assert.deepEqual(buildHeaders({ auth: { serviceKey: "svc", platformUserId: "user" }, internal: true }), { "Content-Type": "application/json", "X-Service-Key": "svc", "X-Platform-User-Id": "user" });
  assert.throws(() => buildHeaders({ internal: true }), /Missing service key/);
});

test("requestJson builds query/body/headers and parses JSON responses", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const data = await requestJson({ method: "POST", baseUrl: "https://api.test", path: "/v1", query: { a: 1, empty: "" }, body: { x: true }, headers: { "X-Test": "yes" }, auth: { accessToken: "tok" }, fetchImpl });
  assert.deepEqual(data, { ok: true });
  assert.equal(captured.url, "https://api.test/v1?a=1");
  assert.equal(captured.init.headers.Authorization, "Bearer tok");
  assert.equal(captured.init.headers["X-Test"], "yes");
  assert.equal(captured.init.body, '{"x":true}');
});

test("requestJson throws enriched errors for non-2xx responses", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ detail: { code: "quota", message: "Upgrade" } }), { status: 402 });
  await assert.rejects(
    () => requestJson({ baseUrl: "https://api.test", path: "/quota", fetchImpl }),
    (error) => {
      assert.equal(error.status, 402);
      assert.equal(error.data.detail.code, "quota");
      return true;
    },
  );
});

test("envelopeHttpError normalizes Gateway pricing errors", () => {
  const error = new Error("Payment required");
  error.status = 402;
  error.data = { detail: { code: "upgrade_required", message: "Upgrade required" } };
  const envelope = envelopeHttpError({ error, command: "price.current", profileName: "local", service: "gateway", pricingBaseUrl: "https://searvora.com", locale: "zh" });
  assert.equal(envelope.ok, false);
  assert.equal(envelope.error.code, "upgrade_required");
  assert.equal(envelope.error.pricing_url, "https://searvora.com/zh/pricing");
  assert.equal(envelope.raw, error.data);
});

test("makeEnvelope and commandError shape structured output", () => {
  assert.deepEqual(makeEnvelope({ command: "x", data: { y: 1 }, warnings: ["w"] }), { ok: true, command: "x", data: { y: 1 }, warnings: ["w"] });
  assert.deepEqual(commandError({ message: "failed" }), { code: "command_failed", message: "failed", http_status: undefined, pricing_url: undefined, retryable: false, details: undefined });
});

test("print helpers write JSON, strings, and inspected objects", () => {
  const originalWrite = process.stdout.write;
  const chunks = [];
  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));
    return true;
  };
  try {
    printJson({ ok: true });
    printHuman("hello");
    printHuman({ nested: { value: 1 } });
    printResult({ json: true }, { json: true });
    printResult("human", {});
  } finally {
    process.stdout.write = originalWrite;
  }
  assert.match(chunks[0], /\"ok\": true/);
  assert.equal(chunks[1], "hello\n");
  assert.match(chunks[2], /nested/);
  assert.match(chunks[3], /\"json\": true/);
  assert.equal(chunks[4], "human\n");
});
