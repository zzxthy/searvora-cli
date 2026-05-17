export function parseArgv(argv) {
  const globals = { json: false, profile: undefined, accessToken: undefined, serviceKey: undefined, platformUserId: undefined, locale: undefined, debug: false };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--json") globals.json = true;
    else if (token === "--debug") globals.debug = true;
    else if (token === "--profile") globals.profile = argv[++i];
    else if (token === "--access-token") globals.accessToken = argv[++i];
    else if (token === "--service-key") globals.serviceKey = argv[++i];
    else if (token === "--platform-user-id") globals.platformUserId = argv[++i];
    else if (token === "--locale") globals.locale = argv[++i];
    else rest.push(token);
  }
  return { globals, rest };
}

export function parseOptions(tokens) {
  const options = {};
  const positional = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const rawKey = token.slice(2);
    const eq = rawKey.indexOf("=");
    if (eq >= 0) {
      options[toCamel(rawKey.slice(0, eq))] = coerce(rawKey.slice(eq + 1));
      continue;
    }
    const key = toCamel(rawKey);
    const next = tokens[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = coerce(next);
      i += 1;
    }
  }
  return { options, positional };
}

export function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && /^-?\d+$/.test(value)) return Number(value);
  return value;
}

export function readJsonOption(options, key = "bodyJson") {
  if (!options[key]) return undefined;
  try {
    return JSON.parse(String(options[key]));
  } catch (error) {
    throw new Error(`Invalid --${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} JSON: ${error.message}`);
  }
}
