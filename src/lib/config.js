import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { DEFAULT_PROFILES } from "./catalog.js";

export function configPath() {
  return process.env.SEARVORA_CONFIG || join(homedir(), ".config", "searvora", "config.json");
}

export function defaultConfig() {
  return { activeProfile: "local", profiles: DEFAULT_PROFILES, tokens: {} };
}

export function loadConfig({ allowMissing = true } = {}) {
  const path = configPath();
  if (!existsSync(path)) {
    if (allowMissing) return defaultConfig();
    throw new Error(`Config file not found: ${path}`);
  }
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return {
    ...defaultConfig(),
    ...parsed,
    profiles: { ...DEFAULT_PROFILES, ...(parsed.profiles || {}) },
    tokens: parsed.tokens || {},
  };
}

export function saveConfig(config) {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return path;
}

export function resolveProfile(config, profileName) {
  const name = profileName || process.env.SEARVORA_PROFILE || config.activeProfile || "local";
  const profile = config.profiles?.[name];
  if (!profile) throw new Error(`Unknown profile: ${name}`);
  return { name, profile };
}

export function envOverlay(profile) {
  return {
    ...profile,
    gatewayUrl: process.env.SEARVORA_GATEWAY_URL || profile.gatewayUrl,
    dataPlaneUrl: process.env.SEARVORA_DATA_PLANE_URL || profile.dataPlaneUrl,
    sdpUrl: process.env.SEARVORA_SDP_URL || profile.sdpUrl,
    sfmUrl: process.env.SEARVORA_SFM_URL || profile.sfmUrl,
    blogifyUrl: process.env.SEARVORA_BLOGIFY_URL || profile.blogifyUrl,
    marketingUrl: process.env.SEARVORA_MARKETING_URL || profile.marketingUrl,
    pricingBaseUrl: process.env.SEARVORA_PRICING_BASE_URL || profile.pricingBaseUrl,
  };
}

export function authContext(config, globals) {
  return {
    accessToken: globals.accessToken || process.env.SEARVORA_ACCESS_TOKEN || config.tokens?.accessToken,
    refreshToken: process.env.SEARVORA_REFRESH_TOKEN || config.tokens?.refreshToken,
    serviceKey: globals.serviceKey || process.env.SEARVORA_SERVICE_KEY || process.env.PLATFORM_INTERNAL_SECRET || config.tokens?.serviceKey,
    platformUserId: globals.platformUserId || process.env.SEARVORA_PLATFORM_USER_ID || config.tokens?.platformUserId,
  };
}
