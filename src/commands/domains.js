import { parseOptions } from "../lib/args.js";
import { requestJson, envelopeHttpError } from "../lib/http.js";
import { commandError, makeEnvelope } from "../lib/output.js";

export async function handleDomains({ action, args, context }) {
  if (!action || action === "help") return help();
  if (!context.auth.accessToken) {
    return makeEnvelope({ ok: false, command: `domains.${action}`, profile: context.profileName, service: "gateway", error: commandError({ code: "missing_access_token", message: "Run searvora auth login first, set SEARVORA_ACCESS_TOKEN, or pass --access-token." }) });
  }
  if (action === "list") return gatewayRequest({ command: "domains.list", path: "/api/v1/domains", context });
  if (action === "add") return add(args, context);
  if (action === "remove") return remove(args, context);
  if (action === "access-check") return accessCheck(args, context);
  throw new Error(`Unknown domains action: ${action}`);
}

async function add(args, context) {
  const { options } = parseOptions(args);
  const rootDomain = options.domain || options.rootDomain || options.url;
  if (!rootDomain) return domainsError("missing_domain", "Pass --domain.", "domains.add", context);
  const body = { root_domain: rootDomain };
  if (options.displayName) body.display_name = options.displayName;
  return gatewayRequest({ command: "domains.add", method: "POST", path: "/api/v1/domains", body, context });
}

async function remove(args, context) {
  const { options, positional } = parseOptions(args);
  const id = options.id || positional[0];
  if (!id) return domainsError("missing_domain_id", "Pass --id or a domain id positional argument.", "domains.remove", context);
  return gatewayRequest({ command: "domains.remove", method: "DELETE", path: `/api/v1/domains/${id}`, context });
}

async function accessCheck(args, context) {
  const { options } = parseOptions(args);
  const domain = options.domain || options.url || options.domainOrUrl;
  const product = options.product;
  if (!domain) return domainsError("missing_domain", "Pass --domain.", "domains.access-check", context);
  if (!product) return domainsError("missing_product", "Pass --product sfm|sdp|sca.", "domains.access-check", context);
  const body = { product, domain_or_url: domain };
  return gatewayRequest({ command: "domains.access-check", method: "POST", path: "/api/v1/domains/access-check", body, context });
}

async function gatewayRequest({ command, method = "GET", path, body, context }) {
  try {
    const data = await requestJson({ method, baseUrl: context.profile.gatewayUrl, path, body, auth: context.auth, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command, profile: context.profileName, service: "gateway", request: body, data });
  } catch (error) {
    return envelopeHttpError({ error, command, profileName: context.profileName, service: "gateway", request: body, pricingBaseUrl: context.profile.pricingBaseUrl, locale: context.globals.locale });
  }
}

function domainsError(code, message, command, context) {
  return makeEnvelope({ ok: false, command, profile: context.profileName, service: "gateway", error: commandError({ code, message }) });
}

function help() {
  return `Usage:
  searvora domains list [--json]
  searvora domains add --domain example.com [--display-name "Example"] [--json]
  searvora domains remove --id 123 [--json]
  searvora domains access-check --domain example.com --product sfm|sdp|sca [--json]`;
}

export const __test__ = { add, remove, accessCheck, gatewayRequest };
