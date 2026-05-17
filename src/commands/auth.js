import { parseOptions } from "../lib/args.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { envelopeHttpError, requestJson } from "../lib/http.js";
import { commandError, makeEnvelope } from "../lib/output.js";

const AUTH_PATHS = {
  login: "/api/v1/auth/login",
  me: "/api/v1/auth/me",
  refresh: "/api/v1/auth/refresh",
  logout: "/api/v1/auth/logout",
};

export async function handleAuth({ action, args, context }) {
  if (!action || action === "help") return help();
  if (action === "login") return login(args, context);
  if (action === "me") return me(args, context);
  if (action === "refresh") return refresh(args, context);
  if (action === "logout") return logout(args, context);
  if (action === "validate") return validate(args, context);
  throw new Error(`Unknown auth action: ${action}`);
}

async function login(args, context) {
  const { options } = parseOptions(args);
  const email = String(options.email || process.env.SEARVORA_AUTH_EMAIL || "").trim().toLowerCase();
  const password = await resolvePassword(options);
  if (!email) return authError("missing_email", "Pass --email or set SEARVORA_AUTH_EMAIL.", "auth.login", context);
  if (!password) return authError("missing_password", "Pass --password, --password-stdin, or set SEARVORA_AUTH_PASSWORD.", "auth.login", context);

  const request = { email };
  try {
    const tokens = await requestJson({ method: "POST", baseUrl: context.profile.gatewayUrl, path: AUTH_PATHS.login, body: { email, password }, fetchImpl: context.fetchImpl });
    const config = loadConfig();
    saveTokens(config, tokens, { email });
    const path = saveConfig(config);
    let user;
    try {
      const meData = await requestJson({ baseUrl: context.profile.gatewayUrl, path: AUTH_PATHS.me, auth: { accessToken: tokens.access_token }, fetchImpl: context.fetchImpl });
      user = meData?.user;
      if (user?.id) {
        config.tokens.platformUserId = String(user.id);
        saveConfig(config);
      }
    } catch {
      const sub = jwtSubject(tokens.access_token);
      if (sub) {
        config.tokens.platformUserId = String(sub);
        saveConfig(config);
      }
    }
    return makeEnvelope({ command: "auth.login", profile: context.profileName, service: "gateway", request, data: { authenticated: true, email, user: redactUser(user), config_path: path, saved: ["accessToken", "refreshToken", "platformUserId"].filter((key) => Boolean(config.tokens?.[key])) } });
  } catch (error) {
    return envelopeHttpError({ error, command: "auth.login", profileName: context.profileName, service: "gateway", request, pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

async function me(args, context) {
  const { options } = parseOptions(args);
  const accessToken = options.accessToken || context.auth.accessToken;
  if (!accessToken) return authError("missing_access_token", "Run searvora auth login first, set SEARVORA_ACCESS_TOKEN, or pass --access-token.", "auth.me", context);
  try {
    const data = await requestJson({ baseUrl: context.profile.gatewayUrl, path: AUTH_PATHS.me, auth: { accessToken }, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command: "auth.me", profile: context.profileName, service: "gateway", data: redactMe(data) });
  } catch (error) {
    return envelopeHttpError({ error, command: "auth.me", profileName: context.profileName, service: "gateway", pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

async function refresh(args, context) {
  const { options } = parseOptions(args);
  const refreshToken = options.refreshToken || context.auth.refreshToken;
  if (!refreshToken) return authError("missing_refresh_token", "Run searvora auth login first, set SEARVORA_REFRESH_TOKEN, or pass --refresh-token.", "auth.refresh", context);
  try {
    const tokens = await requestJson({ method: "POST", baseUrl: context.profile.gatewayUrl, path: AUTH_PATHS.refresh, body: { refresh_token: refreshToken }, fetchImpl: context.fetchImpl });
    const config = loadConfig();
    saveTokens(config, tokens, { email: config.tokens?.email });
    const sub = jwtSubject(tokens.access_token);
    if (sub) config.tokens.platformUserId = String(sub);
    const path = saveConfig(config);
    return makeEnvelope({ command: "auth.refresh", profile: context.profileName, service: "gateway", data: { refreshed: true, config_path: path, saved: ["accessToken", "refreshToken", "platformUserId"].filter((key) => Boolean(config.tokens?.[key])) } });
  } catch (error) {
    return envelopeHttpError({ error, command: "auth.refresh", profileName: context.profileName, service: "gateway", pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

async function logout(args, context) {
  const { options } = parseOptions(args);
  const accessToken = options.accessToken || context.auth.accessToken;
  const localOnly = Boolean(options.localOnly);
  let remote = { attempted: false, ok: null };
  if (accessToken && !localOnly) {
    remote.attempted = true;
    try {
      await requestJson({ method: "POST", baseUrl: context.profile.gatewayUrl, path: AUTH_PATHS.logout, auth: { accessToken }, fetchImpl: context.fetchImpl });
      remote.ok = true;
    } catch (error) {
      remote.ok = false;
      remote.error = { code: error?.status ? `http_${error.status}` : "request_failed", message: error?.message || "Logout request failed" };
    }
  }
  const config = loadConfig();
  clearTokens(config);
  const path = saveConfig(config);
  return makeEnvelope({ command: "auth.logout", profile: context.profileName, service: "gateway", data: { logged_out: true, local_tokens_cleared: true, remote, config_path: path }, warnings: remote.error ? ["Remote logout failed; local tokens were still cleared."] : [] });
}

async function validate(args, context) {
  const { options } = parseOptions(args);
  const accessToken = options.accessToken || context.auth.accessToken;
  if (!accessToken) {
    return makeEnvelope({ command: "auth.validate", profile: context.profileName, service: "gateway", data: { valid: false, reason: "missing_access_token" } });
  }
  try {
    const data = await requestJson({ baseUrl: context.profile.gatewayUrl, path: AUTH_PATHS.me, auth: { accessToken }, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command: "auth.validate", profile: context.profileName, service: "gateway", data: { valid: true, user: redactUser(data?.user) } });
  } catch (error) {
    return makeEnvelope({ command: "auth.validate", profile: context.profileName, service: "gateway", data: { valid: false, reason: error?.status === 401 ? "invalid_or_expired_token" : "request_failed", http_status: error?.status, message: error?.message } });
  }
}

async function resolvePassword(options) {
  if (options.password) return String(options.password);
  if (options.passwordStdin) return readStdin().then((value) => value.trimEnd());
  if (process.env.SEARVORA_AUTH_PASSWORD) return process.env.SEARVORA_AUTH_PASSWORD;
  return "";
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function saveTokens(config, tokens, extra = {}) {
  config.tokens = { ...(config.tokens || {}) };
  if (tokens?.access_token) config.tokens.accessToken = tokens.access_token;
  if (tokens?.refresh_token) config.tokens.refreshToken = tokens.refresh_token;
  if (extra.email) config.tokens.email = extra.email;
}

function clearTokens(config) {
  config.tokens = { ...(config.tokens || {}) };
  delete config.tokens.accessToken;
  delete config.tokens.refreshToken;
  delete config.tokens.platformUserId;
  delete config.tokens.email;
}

function jwtSubject(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1] || "", "base64url").toString("utf8"));
    return payload.sub;
  } catch {
    return undefined;
  }
}

function redactUser(user) {
  if (!user) return undefined;
  return { id: user.id, email: user.email, name: user.name, is_admin: Boolean(user.is_admin), is_active: user.is_active, products: user.products || [] };
}

function redactMe(data) {
  if (!data) return data;
  return { ...data, user: redactUser(data.user) };
}

function authError(code, message, command, context) {
  return makeEnvelope({ ok: false, command, profile: context.profileName, service: "gateway", error: commandError({ code, message }) });
}

function help() {
  return `Usage:
  searvora auth login --email <email> [--password <password>|--password-stdin] [--json]
  searvora auth me [--json]
  searvora auth refresh [--refresh-token <token>] [--json]
  searvora auth logout [--local-only] [--json]
  searvora auth validate [--json]

Security:
  Prefer --password-stdin or SEARVORA_AUTH_PASSWORD over passing passwords in shell history.
  Login stores access and refresh tokens in the Searvora config file with 0600 permissions.`;
}

export const __test__ = { clearTokens, jwtSubject, redactMe, redactUser, resolvePassword, saveTokens };
