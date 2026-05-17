import { requestJson, envelopeHttpError } from "../lib/http.js";
import { makeEnvelope } from "../lib/output.js";
import { pricingSuccessUrl, pricingUrl } from "../lib/pricing.js";
import { parseOptions } from "../lib/args.js";

export async function handlePrice({ action, args, context }) {
  if (!action || action === "help") return help();
  const { options } = parseOptions(args);
  const locale = options.locale || context.globals.locale || "en";
  if (action === "url") {
    return makeEnvelope({ command: "price.url", profile: context.profileName, data: { pricing_url: pricingUrl(context.profile.pricingBaseUrl, locale), locale } });
  }
  if (action === "open") {
    return makeEnvelope({ command: "price.open", profile: context.profileName, data: { pricing_url: pricingUrl(context.profile.pricingBaseUrl, locale), open_command: `open ${pricingUrl(context.profile.pricingBaseUrl, locale)}` } });
  }
  if (action === "current") return gatewayGet("price.current", "/api/v1/subscription/current", context, locale);
  if (action === "plans") return gatewayGet("price.plans", "/api/v1/subscription/config-status", context, locale);
  if (action === "checkout") return checkout(options, context, locale);
  if (action === "portal") return gatewayGet("price.portal", "/api/v1/subscription/portal", context, locale);
  if (action === "cancel") return cancel(options, context, locale);
  throw new Error(`Unknown price action: ${action}`);
}

function help() {
  return `Usage:
  searvora price url [--locale en|zh|tw] [--json]
  searvora price open [--locale en|zh|tw]
  searvora price current [--json]
  searvora price plans [--json]
  searvora price checkout --scope universal|sfm|sdp|sca --plan basic|pro --interval monthly|yearly [--trial-domain example.com]
  searvora price portal [--json]
  searvora price cancel --scope universal|sfm|sdp|sca [--json]

Note: subscription is intentionally a compatibility alias; use price/pricing as the product-facing group.`;
}

async function gatewayGet(command, path, context, locale) {
  try {
    const data = await requestJson({ baseUrl: context.profile.gatewayUrl, path, auth: context.auth, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command, profile: context.profileName, service: "gateway", data });
  } catch (error) {
    return envelopeHttpError({ error, command, profileName: context.profileName, service: "gateway", pricingBaseUrl: context.profile.pricingBaseUrl, locale });
  }
}

async function postSubscription(command, path, options, context, locale) {
  try {
    const data = await requestJson({ method: "POST", baseUrl: context.profile.gatewayUrl, path, body: options, auth: context.auth, fetchImpl: context.fetchImpl });
    return makeEnvelope({ command, profile: context.profileName, service: "gateway", request: options, data });
  } catch (error) {
    return envelopeHttpError({ error, command, profileName: context.profileName, service: "gateway", request: options, pricingBaseUrl: context.profile.pricingBaseUrl, locale });
  }
}

async function cancel(options, context, locale) {
  const body = {
    subscription_scope: options.subscriptionScope || options.scope,
    immediately: options.immediately === true,
  };
  return postSubscription("price.cancel", "/api/v1/subscription/cancel", body, context, locale);
}

async function checkout(options, context, locale) {
  const body = {
    target_scope: options.scope || options.targetScope,
    target_plan: options.plan || options.targetPlan,
    billing_interval: options.interval || options.billingInterval || "monthly",
    success_url: pricingSuccessUrl(context.profile.pricingBaseUrl, locale),
  };
  if (options.trialDomain) {
    body.domain = options.trialDomain;
    body.trial_requested = true;
  }
  const endpoint = body.trial_requested ? "/api/v1/subscription/checkout" : "/api/v1/subscription/switch";
  return postSubscription("price.checkout", endpoint, body, context, locale);
}

export const __test__ = { checkout, cancel, gatewayGet, postSubscription };
