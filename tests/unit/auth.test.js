import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handleAuth, __test__ } from "../../src/commands/auth.js";
import { loadConfig } from "../../src/lib/config.js";

function tokenFor(payload = { sub: "42", email: "test@example.com" }) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
}

function withTempConfig(fn) {
  const dir = mkdtempSync(join(tmpdir(), "searvora-auth-"));
  const configPath = join(dir, "config.json");
  const previous = process.env.SEARVORA_CONFIG;
  process.env.SEARVORA_CONFIG = configPath;
  return Promise.resolve()
    .then(() => fn(configPath))
    .finally(() => {
      if (previous === undefined) delete process.env.SEARVORA_CONFIG;
      else process.env.SEARVORA_CONFIG = previous;
    });
}

function context(fetchImpl, auth = {}) {
  return {
    profileName: "public",
    profile: { gatewayUrl: "https://auth.test", pricingBaseUrl: "https://searvora.com" },
    auth,
    globals: { locale: "en" },
    fetchImpl,
  };
}

test("auth login posts credentials, saves redacted token state, and fetches current user", async () => withTempConfig(async () => {
  const access = tokenFor({ sub: "99", email: "ada@example.com" });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : undefined });
    if (String(url).endsWith("/login")) return new Response(JSON.stringify({ access_token: access, refresh_token: "refresh-token", token_type: "bearer" }), { status: 200 });
    if (String(url).endsWith("/me")) return new Response(JSON.stringify({ user: { id: 99, email: "ada@example.com", name: "Ada", is_admin: false, is_active: true, products: ["sfm"] }, domains: [], permissions: [] }), { status: 200 });
    throw new Error("unexpected call");
  };

  const result = await handleAuth({ action: "login", args: ["--email", "Ada@Example.com", "--password", "secret"], context: context(fetchImpl) });

  assert.equal(result.ok, true);
  assert.equal(result.command, "auth.login");
  assert.equal(result.request.email, "ada@example.com");
  assert.deepEqual(calls[0].body, { email: "ada@example.com", password: "secret" });
  assert.equal(result.data.user.email, "ada@example.com");
  assert.ok(result.data.saved.includes("accessToken"));
  assert.ok(result.data.saved.includes("refreshToken"));
  assert.ok(result.data.saved.includes("platformUserId"));
  assert.equal(loadConfig().tokens.accessToken, access);
  assert.equal(loadConfig().tokens.refreshToken, "refresh-token");
  assert.equal(loadConfig().tokens.platformUserId, "99");
}));

test("auth login validates missing email and password before HTTP", async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  const missingEmail = await handleAuth({ action: "login", args: ["--password", "secret"], context: context(fetchImpl) });
  assert.equal(missingEmail.ok, false);
  assert.equal(missingEmail.error.code, "missing_email");
  const missingPassword = await handleAuth({ action: "login", args: ["--email", "a@example.com"], context: context(fetchImpl) });
  assert.equal(missingPassword.error.code, "missing_password");
  assert.equal(called, false);
});

test("auth me calls Gateway with bearer token", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify({ user: { id: 7, email: "u@example.com", name: "User", is_admin: false, is_active: true, products: [] }, domains: [], permissions: [] }), { status: 200 });
  };
  const result = await handleAuth({ action: "me", args: [], context: context(fetchImpl, { accessToken: "access" }) });
  assert.equal(result.ok, true);
  assert.equal(captured.url, "https://auth.test/api/v1/auth/me");
  assert.equal(captured.init.headers.Authorization, "Bearer access");
  assert.equal(result.data.user.email, "u@example.com");
});

test("auth refresh saves new tokens", async () => withTempConfig(async () => {
  const access = tokenFor({ sub: "123" });
  const fetchImpl = async (url, init) => {
    assert.equal(String(url), "https://auth.test/api/v1/auth/refresh");
    assert.deepEqual(JSON.parse(init.body), { refresh_token: "old-refresh" });
    return new Response(JSON.stringify({ access_token: access, refresh_token: "new-refresh" }), { status: 200 });
  };
  const result = await handleAuth({ action: "refresh", args: [], context: context(fetchImpl, { refreshToken: "old-refresh" }) });
  assert.equal(result.ok, true);
  assert.equal(loadConfig().tokens.accessToken, access);
  assert.equal(loadConfig().tokens.refreshToken, "new-refresh");
  assert.equal(loadConfig().tokens.platformUserId, "123");
}));

test("auth logout clears local tokens even when remote logout fails", async () => withTempConfig(async () => {
  writeFileSync(process.env.SEARVORA_CONFIG, JSON.stringify({ activeProfile: "local", tokens: { accessToken: "old", refreshToken: "refresh", platformUserId: "1", email: "a@example.com" } }));
  const fetchImpl = async () => new Response(JSON.stringify({ detail: "expired" }), { status: 401 });
  const result = await handleAuth({ action: "logout", args: [], context: context(fetchImpl, { accessToken: "old" }) });
  assert.equal(result.ok, true);
  assert.equal(result.data.local_tokens_cleared, true);
  assert.equal(result.data.remote.ok, false);
  assert.deepEqual(loadConfig().tokens, {});
}));

test("auth validate returns true/false without throwing", async () => {
  const validFetch = async () => new Response(JSON.stringify({ user: { id: 5, email: "ok@example.com", name: "Ok", is_admin: false, is_active: true, products: [] } }), { status: 200 });
  const valid = await handleAuth({ action: "validate", args: [], context: context(validFetch, { accessToken: "access" }) });
  assert.equal(valid.data.valid, true);

  const invalidFetch = async () => new Response(JSON.stringify({ detail: "Invalid token" }), { status: 401 });
  const invalid = await handleAuth({ action: "validate", args: [], context: context(invalidFetch, { accessToken: "bad" }) });
  assert.equal(invalid.ok, true);
  assert.equal(invalid.data.valid, false);
  assert.equal(invalid.data.reason, "invalid_or_expired_token");

  const missing = await handleAuth({ action: "validate", args: [], context: context(validFetch, {}) });
  assert.equal(missing.data.valid, false);
  assert.equal(missing.data.reason, "missing_access_token");
});

test("auth helpers decode JWT subjects and clear tokens", () => {
  assert.equal(__test__.jwtSubject(tokenFor({ sub: "77" })), "77");
  const config = { tokens: { accessToken: "a", refreshToken: "r", platformUserId: "1", email: "e", serviceKey: "svc" } };
  __test__.clearTokens(config);
  assert.deepEqual(config.tokens, { serviceKey: "svc" });
});
