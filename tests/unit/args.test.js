import test from "node:test";
import assert from "node:assert/strict";
import { parseArgv, parseOptions, readJsonOption, toCamel } from "../../src/lib/args.js";

test("parseArgv separates global options from command args", () => {
  const result = parseArgv([
    "--json",
    "--profile", "public",
    "--access-token", "test-access-token",
    "--service-key", "test-service-key",
    "--platform-user-id", "42",
    "--locale", "tw",
    "services", "list",
  ]);

  assert.deepEqual(result.globals, {
    json: true,
    profile: "public",
    accessToken: "test-access-token",
    serviceKey: "test-service-key",
    platformUserId: "42",
    locale: "tw",
    debug: false,
  });
  assert.deepEqual(result.rest, ["services", "list"]);
});

test("parseOptions supports booleans, equals values, camelCase, numbers, and positional args", () => {
  const { options, positional } = parseOptions(["target", "--dry-run", "--range-days=30", "--body-json", '{"ok":true}', "--flag", "false"]);

  assert.deepEqual(positional, ["target"]);
  assert.equal(options.dryRun, true);
  assert.equal(options.rangeDays, 30);
  assert.equal(options.bodyJson, '{"ok":true}');
  assert.equal(options.flag, false);
  assert.equal(toCamel("trial-domain"), "trialDomain");
});

test("readJsonOption parses JSON and reports invalid payloads", () => {
  assert.deepEqual(readJsonOption({ bodyJson: '{"url":"https://example.com"}' }), { url: "https://example.com" });
  assert.throws(() => readJsonOption({ bodyJson: "not json" }), /Invalid --body-json JSON/);
  assert.equal(readJsonOption({}), undefined);
});
