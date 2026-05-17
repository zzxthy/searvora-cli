import { inspect } from "node:util";

export function makeEnvelope({ ok = true, command, profile, service, request, data, warnings = [], next_actions = [], error, raw } = {}) {
  const envelope = { ok };
  if (command) envelope.command = command;
  if (profile) envelope.profile = profile;
  if (service) envelope.service = service;
  if (request) envelope.request = request;
  if (data !== undefined) envelope.data = data;
  else if (ok) envelope.data = null;
  if (!ok) envelope.error = error ?? { code: "unknown_error", message: "Unknown error" };
  if (warnings.length) envelope.warnings = warnings;
  if (next_actions.length) envelope.next_actions = next_actions;
  if (raw !== undefined) envelope.raw = raw;
  return envelope;
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function printHuman(value) {
  if (typeof value === "string") {
    process.stdout.write(`${value}\n`);
    return;
  }
  process.stdout.write(`${inspect(value, { colors: process.stdout.isTTY, depth: 8, maxArrayLength: 200 })}\n`);
}

export function printResult(value, globals = {}) {
  if (globals.json) printJson(value);
  else printHuman(value);
}

export function commandError({ code = "command_failed", message, http_status, pricing_url, retryable = false, details } = {}) {
  return { code, message: message || code, http_status, pricing_url, retryable, details };
}
