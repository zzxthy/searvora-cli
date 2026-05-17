import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { authContext, configPath, defaultConfig, envOverlay, loadConfig, resolveProfile, saveConfig } from "../../src/lib/config.js";
import { handleConfig, __test__ } from "../../src/commands/config.js";

test("defaultConfig includes local profile and empty token store", () => {
  const config = defaultConfig();
  assert.equal(config.activeProfile, "local");
  assert.ok(config.profiles.local.gatewayUrl);
  assert.deepEqual(config.tokens, {});
});

test("saveConfig and loadConfig round-trip custom profiles while preserving defaults", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-config-"));
  const path = join(dir, "config.json");
  const previous = process.env.SEARVORA_CONFIG;
  process.env.SEARVORA_CONFIG = path;
  try {
    assert.equal(configPath(), path);
    saveConfig({ activeProfile: "custom", profiles: { custom: { gatewayUrl: "http://custom" } }, tokens: { accessToken: "a" } });
    const loaded = loadConfig();
    assert.equal(loaded.activeProfile, "custom");
    assert.equal(loaded.profiles.custom.gatewayUrl, "http://custom");
    assert.ok(loaded.profiles.local.gatewayUrl);
    assert.equal(loaded.tokens.accessToken, "a");
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.match(readFileSync(path, "utf8"), /"activeProfile"/);
  } finally {
    if (previous === undefined) delete process.env.SEARVORA_CONFIG;
    else process.env.SEARVORA_CONFIG = previous;
  }
});

test("loadConfig missing-file behavior is explicit", () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-config-"));
  const previous = process.env.SEARVORA_CONFIG;
  process.env.SEARVORA_CONFIG = join(dir, "missing.json");
  try {
    assert.equal(loadConfig().activeProfile, "local");
    assert.throws(() => loadConfig({ allowMissing: false }), /Config file not found/);
  } finally {
    if (previous === undefined) delete process.env.SEARVORA_CONFIG;
    else process.env.SEARVORA_CONFIG = previous;
  }
});

test("resolveProfile and envOverlay apply explicit and environment overrides", () => {
  const previousProfile = process.env.SEARVORA_PROFILE;
  const previousGateway = process.env.SEARVORA_GATEWAY_URL;
  process.env.SEARVORA_PROFILE = "docker";
  process.env.SEARVORA_GATEWAY_URL = "http://override-gateway";
  try {
    const config = defaultConfig();
    assert.equal(resolveProfile(config).name, "docker");
    assert.equal(resolveProfile(config, "public").name, "public");
    assert.throws(() => resolveProfile(config, "missing"), /Unknown profile/);
    assert.equal(envOverlay(config.profiles.local).gatewayUrl, "http://override-gateway");
  } finally {
    if (previousProfile === undefined) delete process.env.SEARVORA_PROFILE;
    else process.env.SEARVORA_PROFILE = previousProfile;
    if (previousGateway === undefined) delete process.env.SEARVORA_GATEWAY_URL;
    else process.env.SEARVORA_GATEWAY_URL = previousGateway;
  }
});

test("authContext prioritizes globals then environment then config tokens", () => {
  const previous = {
    access: process.env.SEARVORA_ACCESS_TOKEN,
    service: process.env.SEARVORA_SERVICE_KEY,
    internal: process.env.PLATFORM_INTERNAL_SECRET,
    user: process.env.SEARVORA_PLATFORM_USER_ID,
    refresh: process.env.SEARVORA_REFRESH_TOKEN,
  };
  process.env.SEARVORA_ACCESS_TOKEN = "env-access";
  process.env.SEARVORA_SERVICE_KEY = "env-service";
  process.env.SEARVORA_PLATFORM_USER_ID = "env-user";
  process.env.SEARVORA_REFRESH_TOKEN = "env-refresh";
  try {
    const auth = authContext({ tokens: { accessToken: "cfg-access", serviceKey: "cfg-service", platformUserId: "cfg-user" } }, { accessToken: "global-access", serviceKey: "global-service" });
    assert.equal(auth.accessToken, "global-access");
    assert.equal(auth.serviceKey, "global-service");
    assert.equal(auth.platformUserId, "env-user");
    assert.equal(auth.refreshToken, "env-refresh");
  } finally {
    for (const [key, value] of Object.entries({ SEARVORA_ACCESS_TOKEN: previous.access, SEARVORA_SERVICE_KEY: previous.service, PLATFORM_INTERNAL_SECRET: previous.internal, SEARVORA_PLATFORM_USER_ID: previous.user, SEARVORA_REFRESH_TOKEN: previous.refresh })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("config get redacts all stored token values", async () => {
  const result = await handleConfig({
    action: "get",
    args: [],
    context: { config: { activeProfile: "local", profiles: {}, tokens: { accessToken: "a", serviceKey: "s" } } },
  });
  assert.deepEqual(result.data.tokens, { accessToken: "***", serviceKey: "***" });
  assert.deepEqual(__test__.redact({ tokens: {} }).tokens, {});
});

test("config profile use persists selected profile and rejects missing profiles", async () => {
  const dir = mkdtempSync(join(tmpdir(), "searvora-config-"));
  const path = join(dir, "config.json");
  const previous = process.env.SEARVORA_CONFIG;
  process.env.SEARVORA_CONFIG = path;
  try {
    const config = defaultConfig();
    const result = await handleConfig({ action: "profile", args: ["use", "docker"], context: { config } });
    assert.equal(result.data.activeProfile, "docker");
    assert.equal(loadConfig().activeProfile, "docker");
    await assert.rejects(() => handleConfig({ action: "profile", args: ["use", "missing"], context: { config } }), /Unknown profile/);
  } finally {
    if (previous === undefined) delete process.env.SEARVORA_CONFIG;
    else process.env.SEARVORA_CONFIG = previous;
  }
});

test("config help and unknown action behavior are explicit", async () => {
  assert.match(await handleConfig({ action: "help", args: [], context: { config: defaultConfig() } }), /searvora config init/);
  await assert.rejects(() => handleConfig({ action: "unknown", args: [], context: { config: defaultConfig() } }), /Unknown config action/);
});
