#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgv } from "./lib/args.js";
import { authContext, defaultConfig, envOverlay, loadConfig, resolveProfile } from "./lib/config.js";
import { printResult, makeEnvelope, commandError } from "./lib/output.js";
import { handleServices } from "./commands/services.js";
import { handleAuth } from "./commands/auth.js";
import { handleConfig } from "./commands/config.js";
import { handlePrice } from "./commands/price.js";
import { handleFacts, handleAnalysis, handleSpider, handleContent } from "./commands/proxy.js";
import { handleTools } from "./commands/tools.js";
import { handleDomains } from "./commands/domains.js";
import { handleStaticGroup } from "./commands/misc.js";

const VERSION = "0.1.2";

export async function main(argv = process.argv.slice(2)) {
  const { globals, rest } = parseArgv(argv);
  const group = rest.shift();
  if (!group || group === "help" || group === "--help" || group === "-h") return globals.json ? makeEnvelope({ command: "help", data: { version: VERSION, usage: rootHelp() } }) : rootHelp();
  if (group === "version" || group === "--version" || group === "-v") return globals.json ? makeEnvelope({ command: "version", data: { version: VERSION } }) : `searvora ${VERSION}`;

  const action = rest.shift();
  const skipConfigLoad = group === "config" && (!action || action === "help" || action === "init" || action === "path");
  const config = skipConfigLoad ? defaultConfig() : loadConfig();
  let profileName = config.activeProfile || "local";
  let profile = envOverlay(config.profiles?.[profileName] || config.profiles?.local || {});
  if (group !== "config") {
    const resolved = resolveProfile(config, globals.profile);
    profileName = resolved.name;
    profile = envOverlay(resolved.profile);
  }
  const context = { globals, config, profileName, profile, auth: authContext(config, globals), fetchImpl: globalThis.fetch };

  switch (group) {
    case "services": return handleServices({ action, args: rest, context });
    case "auth": return handleAuth({ action, args: rest, context });
    case "config": return handleConfig({ action, args: rest, context });
    case "price":
    case "pricing": return handlePrice({ action, args: rest, context });
    case "subscription": return subscriptionAlias(action, rest, context);
    case "facts": return handleFacts({ action, args: rest, context });
    case "analysis": return handleAnalysis({ action, args: rest, context });
    case "spider": return handleSpider({ action, args: rest, context });
    case "tools": return handleTools({ action, args: rest, context });
    case "content": return handleContent({ action, args: rest, context });
    case "domains": return handleDomains({ action, args: rest, context });
    case "account":
    case "integrations":
    case "ops":
    case "workflow": return handleStaticGroup({ group, action, args: rest, context });
    default: throw new Error(`Unknown command group: ${group}`);
  }
}

function rootHelp() {
  return `SEARVORA CLI ${VERSION}

Usage:
  searvora <group> <command> [options]

Groups:
  services      Service discovery, health, URLs, Compose profile hints
  config        CLI config profiles
  auth          Gateway login/session/token commands
  account       User/account/permissions commands (scaffolded)
  domains       Domain inventory and access checks (scaffolded)
  price         Pricing page, plans, checkout, portal, subscription status
  pricing       Alias for price
  facts         SEO Data Plane shared facts
  analysis      SDP / SEO AI Analysis
  spider        SFM / SEO Spider Crawler
  tools         Marketing SEO Tools and tool run history
  content       Blogify / Shopify Content Agent
  integrations  GSC and Shopify integrations (scaffolded)
  ops           Local operations and verification hints (scaffolded)
  workflow      Cross-service workflows (scaffolded)

Global options:
  --json
  --profile local|docker|public
  --access-token <token>
  --service-key <key>
  --platform-user-id <id>
  --locale en|zh|tw

Important: use 'price'/'pricing' for subscription UX. The legacy 'subscription' alias only redirects to price commands.`;
}

async function subscriptionAlias(action, args, context) {
  const result = await handlePrice({ action: action || "help", args, context });
  if (typeof result === "string") return `${result}\n\nNote: 'subscription' is a compatibility alias. Prefer 'searvora price ...'.`;
  result.warnings = [...(result.warnings || []), "subscription is a compatibility alias; prefer searvora price ..."];
  return result;
}

if (isMainModule()) {
  main().then((result) => {
    const { globals } = parseArgv(process.argv.slice(2));
    printResult(result, globals);
  }).catch((error) => {
    const { globals } = parseArgv(process.argv.slice(2));
    const envelope = makeEnvelope({ ok: false, error: commandError({ code: "cli_error", message: error.message }) });
    printResult(envelope, globals);
    process.exitCode = 1;
  });
}

function isMainModule() {
  return Boolean(process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]));
}
