import { TOOL_CATALOG } from "../lib/catalog.js";
import { parseOptions, readJsonOption } from "../lib/args.js";
import { requestJson, envelopeHttpError } from "../lib/http.js";
import { makeEnvelope } from "../lib/output.js";

export async function handleTools({ action, args, context }) {
  if (!action || action === "help") return help();
  if (action === "list") return makeEnvelope({ command: "tools.list", profile: context.profileName, data: { tools: TOOL_CATALOG } });
  if (action === "runs") return runs(args, context);
  const spec = resolveTool(action, args);
  if (!spec) throw new Error(`Unknown tools action: ${action}`);
  const { options } = parseOptions(spec.args);
  const body = options.bodyJson ? readJsonOption(options) : options;
  try {
    const data = await requestJson({ method: "POST", baseUrl: context.profile.marketingUrl, path: spec.tool.endpoint, body, auth: context.auth, headers: toolCookieHeaders(context.auth), fetchImpl: context.fetchImpl });
    return makeEnvelope({ command: spec.tool.command, profile: context.profileName, service: "marketing", request: body, data });
  } catch (error) {
    return envelopeHttpError({ error, command: spec.tool.command, profileName: context.profileName, service: "marketing", request: body, pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

function resolveTool(action, args) {
  const parts = [action, ...args];
  const command = `tools ${parts.slice(0, 3).join(" ")}`;
  let tool = TOOL_CATALOG.find((item) => item.command === command);
  let used = 3;
  if (!tool) {
    const command2 = `tools ${parts.slice(0, 2).join(" ")}`;
    tool = TOOL_CATALOG.find((item) => item.command === command2);
    used = 2;
  }
  return tool ? { tool, args: parts.slice(used) } : null;
}

async function runs(args, context) {
  const sub = args[0] || "list";
  const path = sub === "get" ? `/api/v1/tools/runs/${args[1]}` : "/api/v1/tools/runs";
  try {
    const data = await requestJson({ baseUrl: context.profile.gatewayUrl, path, auth: context.auth, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command: `tools.runs.${sub}`, profile: context.profileName, service: "gateway", data });
  } catch (error) {
    return envelopeHttpError({ error, command: `tools.runs.${sub}`, profileName: context.profileName, service: "gateway", pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

function help() {
  return "Usage: searvora tools list|runs|sitemap extract|sitemap validate|canonical check|indexability check|meta title|meta description|llms-txt generate [options] [--json]";
}

function toolCookieHeaders(auth = {}) {
  return auth.accessToken ? { Cookie: `access_token=${auth.accessToken}` } : {};
}

export const __test__ = { resolveTool, runs, toolCookieHeaders };
