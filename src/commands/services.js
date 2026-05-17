import { COMPOSE_PROFILES, GROUPS, SERVICE_CATALOG, resolveServiceUrl } from "../lib/catalog.js";
import { joinUrl, requestJson } from "../lib/http.js";
import { makeEnvelope } from "../lib/output.js";

export async function handleServices({ action, args, context }) {
  if (!action || action === "help") return help();
  if (action === "groups") return makeEnvelope({ command: "services.groups", profile: context.profileName, data: GROUPS });
  if (action === "list" || action === "urls") return listServices(context);
  if (action === "compose") return compose(args);
  if (action === "health") return health(args, context);
  throw new Error(`Unknown services action: ${action}`);
}

function help() {
  return `Usage:
  searvora services list [--json]
  searvora services urls [--json]
  searvora services groups [--json]
  searvora services health [--all|gateway|facts|analysis|spider|blogify|marketing] [--json]
  searvora services compose profiles [--json]`;
}

function listServices(context) {
  const services = SERVICE_CATALOG.map((service) => {
    const url = resolveServiceUrl(context.profile, service);
    return {
      ...service,
      baseUrl: url,
      healthUrl: url ? joinUrl(url, service.healthPath) : null,
      routeNote: context.profile.routeNotes?.[service.urlField],
    };
  });
  return makeEnvelope({ command: "services.list", profile: context.profileName, data: { services } });
}

function compose(args) {
  const sub = args[0] || "profiles";
  if (sub !== "profiles") throw new Error("Only 'searvora services compose profiles' is implemented in the safe scaffold.");
  return makeEnvelope({ command: "services.compose.profiles", data: { profiles: COMPOSE_PROFILES } });
}

async function health(args, context) {
  const targets = selectTargets(args);
  const checks = [];
  for (const service of targets) {
    const baseUrl = resolveServiceUrl(context.profile, service);
    if (!baseUrl) {
      checks.push({ key: service.key, ok: false, skipped: true, reason: "base_url_not_configured" });
      continue;
    }
    try {
      const data = await requestJson({ baseUrl, path: service.healthPath, timeoutMs: 5000, fetchImpl: context.fetchImpl });
      checks.push({ key: service.key, ok: true, url: joinUrl(baseUrl, service.healthPath), data });
    } catch (error) {
      checks.push({ key: service.key, ok: false, url: joinUrl(baseUrl, service.healthPath), error: error.message, status: error.status });
    }
  }
  const ok = checks.every((check) => check.ok || check.skipped);
  return makeEnvelope({ ok, command: "services.health", profile: context.profileName, data: { checks } });
}

function selectTargets(args) {
  if (!args.length || args.includes("--all") || args[0] === "all") return SERVICE_CATALOG.filter((s) => s.key !== "marketing");
  const names = new Set(args.filter((arg) => !arg.startsWith("--")));
  return SERVICE_CATALOG.filter((service) => names.has(service.key));
}

export const __test__ = { listServices, compose, health, selectTargets };
