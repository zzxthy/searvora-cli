import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const bin = new URL("../src/index.js", import.meta.url).pathname;

function cliJson(args) {
  const out = execFileSync(process.execPath, [bin, "--json", ...args], { encoding: "utf8" });
  return JSON.parse(out);
}

test("Data Plane user-scoped facts commands fail locally before HTTP without service key", () => {
  const result = cliJson(["facts", "audit", "--domain", "example.com"]);
  assert.equal(result.ok, false);
  assert.equal(result.command, "facts.audit");
  assert.equal(result.error.code, "missing_service_key");
});

test("subscription alias warns and returns pricing URL", () => {
  const result = cliJson(["subscription", "url", "--locale", "tw"]);
  assert.equal(result.ok, true);
  assert.equal(result.data.pricing_url, "https://searvora.com/tw/pricing");
  assert.match(result.warnings.join("\n"), /compatibility alias/);
});

test("Data Plane user-scoped facts commands fail locally before HTTP without platform user id", () => {
  const result = cliJson(["facts", "audit", "--domain", "example.com", "--service-key", "test-service-key"]);
  assert.equal(result.ok, false);
  assert.equal(result.command, "facts.audit");
  assert.equal(result.error.code, "missing_platform_user_id");
});
