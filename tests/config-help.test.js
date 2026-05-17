import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const bin = new URL("../src/index.js", import.meta.url).pathname;

function cliJson(args, env = {}) {
  const out = execFileSync(process.execPath, [bin, "--json", ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return JSON.parse(out);
}

test("--json help returns structured envelope", () => {
  const result = cliJson(["help"]);
  assert.equal(result.ok, true);
  assert.equal(result.command, "help");
  assert.match(result.data.usage, /Groups:/);
});

test("config init refuses to overwrite existing config unless forced", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-cli-"));
  const configPath = join(dir, "config.json");
  writeFileSync(configPath, JSON.stringify({ activeProfile: "custom", tokens: { accessToken: "test-access-token" } }));
  const result = cliJson(["config", "init"], { SEARVORA_CONFIG: configPath });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "config_exists");
});

test("config init reports fresh versus forced overwrite status", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-cli-"));
  const configPath = join(dir, "config.json");

  const fresh = cliJson(["config", "init"], { SEARVORA_CONFIG: configPath });
  assert.equal(fresh.ok, true);
  assert.equal(fresh.data.overwritten, false);
  assert.equal(fresh.data.activeProfile, "local");

  const forced = cliJson(["config", "init", "--force"], { SEARVORA_CONFIG: configPath });
  assert.equal(forced.ok, true);
  assert.equal(forced.data.overwritten, true);
});

test("config init --force recovers from malformed existing config", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-cli-"));
  const configPath = join(dir, "config.json");
  writeFileSync(configPath, "{not-json");

  const result = cliJson(["config", "init", "--force"], { SEARVORA_CONFIG: configPath });
  assert.equal(result.ok, true);
  assert.equal(result.command, "config.init");
  assert.equal(result.data.overwritten, true);

  const saved = JSON.parse(readFileSync(configPath, "utf8"));
  assert.equal(saved.activeProfile, "local");
  assert.ok(saved.profiles.local);
});

test("static scaffolded groups return structured envelopes", () => {
  const result = cliJson(["workflow", "full-audit"]);
  assert.equal(result.ok, true);
  assert.equal(result.command, "workflow.full-audit");
  assert.equal(result.data.status, "scaffolded");
});


test("tools runs returns structured HTTP error envelope", () => {
  const result = cliJson(["tools", "runs"], { SEARVORA_GATEWAY_URL: "http://127.0.0.1:9" });
  assert.equal(result.ok, false);
  assert.equal(result.command, "tools.runs.list");
  assert.ok(result.error.code);
});
