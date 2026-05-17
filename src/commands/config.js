import { existsSync } from "node:fs";
import { configPath, defaultConfig, saveConfig } from "../lib/config.js";
import { parseOptions } from "../lib/args.js";
import { makeEnvelope } from "../lib/output.js";

export async function handleConfig({ action, args, context }) {
  if (!action || action === "help") return help();
  if (action === "path") return makeEnvelope({ command: "config.path", data: { path: configPath() } });
  if (action === "get") return makeEnvelope({ command: "config.get", data: redact(context.config) });
  if (action === "init") {
    const { options } = parseOptions(args);
    const path = configPath();
    const existed = existsSync(path);
    if (existed && !options.force) {
      return makeEnvelope({ ok: false, command: "config.init", error: { code: "config_exists", message: `Config already exists at ${path}. Use --force to overwrite.`, retryable: false } });
    }
    const savedPath = saveConfig(defaultConfig());
    return makeEnvelope({ command: "config.init", data: { path: savedPath, activeProfile: "local", overwritten: existed } });
  }
  if (action === "profile") {
    const sub = args[0];
    if (sub === "use") {
      const name = args[1];
      if (!context.config.profiles[name]) throw new Error(`Unknown profile: ${name}`);
      context.config.activeProfile = name;
      const path = saveConfig(context.config);
      return makeEnvelope({ command: "config.profile.use", data: { path, activeProfile: name } });
    }
  }
  throw new Error(`Unknown config action: ${action}`);
}

function help() {
  return `Usage:
  searvora config init
  searvora config get [--json]
  searvora config path [--json]
  searvora config profile use local|docker|public`;
}

function redact(config) {
  return { ...config, tokens: Object.fromEntries(Object.keys(config.tokens || {}).map((key) => [key, "***"])) };
}

export const __test__ = { redact };
