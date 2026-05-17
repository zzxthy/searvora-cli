import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const bin = new URL("../../src/index.js", import.meta.url).pathname;

function cliJson(args, env = {}) {
  const out = execFileSync(process.execPath, [bin, "--json", ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return JSON.parse(out);
}

test("process CLI supports config init/get/path lifecycle", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-cli-proc-"));
  const configPath = join(dir, "config.json");
  const env = { SEARVORA_CONFIG: configPath };

  assert.equal(cliJson(["config", "path"], env).data.path, configPath);
  assert.equal(cliJson(["config", "init"], env).data.overwritten, false);
  const get = cliJson(["config", "get"], env);
  assert.equal(get.data.activeProfile, "local");
});

test("process CLI reports unknown groups as cli_error with non-zero exit", () => {
  const result = spawnSync(process.execPath, [bin, "--json", "missing"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "cli_error");
});

test("process CLI refuses malformed config for non-init commands", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-cli-proc-"));
  const configPath = join(dir, "config.json");
  writeFileSync(configPath, "{bad");
  const result = spawnSync(process.execPath, [bin, "--json", "services", "list"], { encoding: "utf8", env: { ...process.env, SEARVORA_CONFIG: configPath } });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, "cli_error");
});

test("process CLI facts guard errors are structured and local", () => {
  const result = cliJson(["facts", "audit", "--domain", "example.com", "--service-key", "test-service-key"]);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "missing_platform_user_id");
});

test("process CLI runs when invoked through an npm-style symlinked bin", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-cli-bin-"));
  const link = join(dir, "searvora");
  symlinkSync(bin, link);

  const result = spawnSync(process.execPath, [link, "--json", "version"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, command: "version", data: { version: "0.1.0" } });
});
