import { makeEnvelope } from "../lib/output.js";

export async function handleStaticGroup({ group, action, context }) {
  const implemented = {
    auth: ["login", "me", "refresh", "logout", "validate"],
    account: ["me", "domains", "permissions"],
    domains: ["list", "add", "remove", "access-check"],
    integrations: ["status", "gsc", "shopify"],
    ops: ["compose", "test", "verify", "logs"],
    workflow: ["diagnose-domain", "crawl-and-ingest", "full-audit", "refresh-plan", "content-from-opportunity", "tool-to-spider", "dashboard-summary"],
  };
  return makeEnvelope({
    command: `${group}.${action || "help"}`,
    profile: context.profileName,
    data: {
      status: "scaffolded",
      message: `${group} command group is reserved by the CLI plan; implementation will be expanded in the next Ralph lane.`,
      planned_actions: implemented[group] || [],
    },
  });
}
