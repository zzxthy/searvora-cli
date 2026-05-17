import { parseOptions, readJsonOption } from "../lib/args.js";
import { requestJson, envelopeHttpError } from "../lib/http.js";
import { makeEnvelope } from "../lib/output.js";

const FACTS_ENDPOINTS = {
  policy: { path: "/api/internal/shared-data/policy", internal: true, commandName: "policy" },
  "crawl-runs": { path: "/api/internal/crawl-runs", internal: true, requiresUser: true, commandName: "crawl-runs", query: ["domain", "limit"] },
  url: { path: "/api/internal/url-facts", internal: true, requiresUser: true, commandName: "url", query: ["propertyId", "rangeDays", "compareDays"] },
  audit: { path: "/api/internal/audit/issues", internal: true, requiresUser: true, commandName: "audit", query: ["domain", "taskId", "limit"] },
  links: { path: "/api/internal/links/overview", internal: true, requiresUser: true, commandName: "links", query: ["domain", "taskId", "limit"] },
  refresh: { path: "/api/internal/refresh/opportunities", internal: true, requiresUser: true, commandName: "refresh", query: ["domain", "propertyId", "taskId", "limit", "rangeDays", "compareDays"] },
  "content-opportunities": { path: "/api/internal/content/opportunities", internal: true, requiresUser: true, commandName: "content-opportunities", query: ["domain", "propertyId", "taskId", "limit", "rangeDays", "compareDays"] },
  "crawl-ai-report": { path: "/api/internal/crawl/ai-report", internal: true, requiresUser: true, commandName: "crawl-ai-report", query: ["domain", "taskId"] },
  "crawl-compare": { path: "/api/internal/crawl/compare", internal: true, requiresUser: true, commandName: "crawl-compare", query: ["domain", "currentTaskId", "previousTaskId", "limit"] },
};

const ANALYSIS_ENDPOINTS = {
  health: { path: "/api/health" },
  overview: { path: "/api/overview" },
  pages: { path: "/api/pages" },
  audit: { path: "/api/audit" },
  links: { path: "/api/links" },
  refresh: { path: "/api/refresh" },
  clusters: { path: "/api/clusters" },
  "content-opportunities": { path: "/api/content-opportunities" },
  skills: { path: "/api/skills" },
  "ai-status": { path: "/api/ai-status" },
  plan: { path: "/api/ai-plan", method: "POST", query: [] },
};

const SPIDER_ENDPOINTS = {
  health: { path: "/health" },
  "crawl-list": { path: "/api/crawl/tasks" },
  "crawl-create": { path: "/api/crawl/tasks", method: "POST", query: [] },
  "from-tool": { path: "/api/crawl/tasks/from-tool", method: "POST", query: [] },
};

const CONTENT_ENDPOINTS = {
  health: { path: "/health" },
  products: { path: "/api/v1/blog/products" },
  opportunities: { path: "/api/v1/shared-seo/content-opportunities" },
  articles: { path: "/api/v1/blog/articles" },
  settings: { path: "/api/v1/blog/settings" },
};

export async function handleFacts({ action, args, context }) {
  if (!action || action === "help") return factsHelp();
  const endpoint = FACTS_ENDPOINTS[action];
  if (!endpoint) throw new Error(`Unknown facts action: ${action}`);
  return proxy({ group: "facts", service: "seo-data-plane", baseUrl: context.profile.dataPlaneUrl, endpoint, args, context });
}

export async function handleAnalysis({ action, args, context }) {
  if (!action || action === "help") return analysisHelp();
  const endpoint = ANALYSIS_ENDPOINTS[action];
  if (!endpoint) throw new Error(`Unknown analysis action: ${action}`);
  return proxy({ group: "analysis", service: "sdp", baseUrl: context.profile.sdpUrl, endpoint, args, context });
}

export async function handleSpider({ action, args, context }) {
  if (!action || action === "help") return spiderHelp();
  let key = action;
  if (action === "crawl") {
    key = args[0] === "create" ? "crawl-create" : "crawl-list";
    if (key === "crawl-create") args.shift();
  }
  const endpoint = SPIDER_ENDPOINTS[key];
  if (!endpoint) throw new Error(`Unknown spider action: ${action}`);
  return proxy({ group: "spider", service: "sfm", baseUrl: context.profile.sfmUrl, endpoint, args, context });
}

export async function handleContent({ action, args, context }) {
  if (!action || action === "help") return contentHelp();
  const endpoint = CONTENT_ENDPOINTS[action];
  if (!endpoint) throw new Error(`Unknown content action: ${action}`);
  return proxy({ group: "content", service: "blogify", baseUrl: context.profile.blogifyUrl, endpoint, args, context });
}

async function proxy({ group, service, baseUrl, endpoint, args, context }) {
  const { options } = parseOptions(args);
  const commandName = `${group}.${endpoint.commandName || endpoint.path}`;
  if (endpoint.internal && !context.auth.serviceKey) {
    return makeEnvelope({ ok: false, command: commandName, profile: context.profileName, service, error: { code: "missing_service_key", message: "Set SEARVORA_SERVICE_KEY or pass --service-key for internal service commands.", retryable: false } });
  }
  if (endpoint.requiresUser && !context.auth.platformUserId) {
    return makeEnvelope({ ok: false, command: commandName, profile: context.profileName, service, error: { code: "missing_platform_user_id", message: "Set SEARVORA_PLATFORM_USER_ID or pass --platform-user-id for user-scoped Data Plane commands.", retryable: false } });
  }
  const query = {};
  const allowedQuery = endpoint.query || Object.keys(options);
  for (const key of allowedQuery) {
    if (options[key] !== undefined) query[toSnake(key)] = options[key];
  }
  let body = undefined;
  if ((endpoint.method || "GET") !== "GET") body = options.bodyJson ? readJsonOption(options) : options;
  try {
    const data = await requestJson({ method: endpoint.method || "GET", baseUrl, path: endpoint.path, query, body, auth: context.auth, internal: endpoint.internal, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command: commandName, profile: context.profileName, service, request: { query, body }, data });
  } catch (error) {
    return envelopeHttpError({ error, command: commandName, profileName: context.profileName, service, request: { query, body }, pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

function toSnake(key) { return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`); }

function factsHelp() { return "Usage: searvora facts policy|crawl-runs|url|audit|links|refresh|content-opportunities|crawl-ai-report|crawl-compare [options] [--json]"; }
function analysisHelp() { return "Usage: searvora analysis health|overview|pages|audit|links|refresh|clusters|content-opportunities|skills|ai-status|plan [options] [--json]"; }
function spiderHelp() { return "Usage: searvora spider health|crawl [create] [options] [--json]"; }
function contentHelp() { return "Usage: searvora content health|products|opportunities|articles|settings [options] [--json]"; }

export const __test__ = {
  FACTS_ENDPOINTS,
  ANALYSIS_ENDPOINTS,
  SPIDER_ENDPOINTS,
  CONTENT_ENDPOINTS,
  proxy,
  toSnake,
};
