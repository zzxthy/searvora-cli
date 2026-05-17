import test from "node:test";
import assert from "node:assert/strict";
import { main } from "../../src/index.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("main returns structured help and version envelopes", async () => {
  assert.equal((await main(["--json", "help"])).command, "help");
  assert.deepEqual(await main(["--json", "version"]), { ok: true, command: "version", data: { version: "0.1.0" } });
});

test("main routes services and scaffolded workflow commands", async () => {
  const groups = await main(["--json", "services", "groups"]);
  assert.equal(groups.command, "services.groups");
  assert.ok(groups.data.some((group) => group.name === "price"));

  const workflow = await main(["--json", "workflow", "full-audit"]);
  assert.equal(workflow.command, "workflow.full-audit");
  assert.equal(workflow.data.status, "scaffolded");
});

test("main routes auth commands to the implemented auth handler", async () => {
  const result = await main(["--json", "auth", "validate"]);
  assert.equal(result.command, "auth.validate");
  assert.equal(result.data.valid, false);
  assert.equal(result.data.reason, "missing_access_token");
});

test("main uses explicit profile and environment config safely", async () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-main-"));
  const configPath = join(dir, "config.json");
  const previous = process.env.SEARVORA_CONFIG;
  process.env.SEARVORA_CONFIG = configPath;
  try {
    const init = await main(["--json", "config", "init"]);
    assert.equal(init.data.overwritten, false);
    const services = await main(["--json", "--profile", "public", "services", "list"]);
    assert.equal(services.profile, "public");
    assert.equal(services.data.services.find((service) => service.key === "gateway").baseUrl, "https://auth.searvora.com");
  } finally {
    if (previous === undefined) delete process.env.SEARVORA_CONFIG;
    else process.env.SEARVORA_CONFIG = previous;
  }
});

test("main config init --force bypasses malformed config parsing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-main-"));
  const configPath = join(dir, "config.json");
  writeFileSync(configPath, "not-json");
  const previous = process.env.SEARVORA_CONFIG;
  process.env.SEARVORA_CONFIG = configPath;
  try {
    const result = await main(["--json", "config", "init", "--force"]);
    assert.equal(result.ok, true);
    assert.equal(result.data.overwritten, true);
  } finally {
    if (previous === undefined) delete process.env.SEARVORA_CONFIG;
    else process.env.SEARVORA_CONFIG = previous;
  }
});

test("main keeps subscription as compatibility alias with warnings", async () => {
  const result = await main(["--json", "subscription", "url", "--locale", "zh"]);
  assert.equal(result.command, "price.url");
  assert.equal(result.data.pricing_url, "https://searvora.com/zh/pricing");
  assert.match(result.warnings.join("\n"), /compatibility alias/);
});
