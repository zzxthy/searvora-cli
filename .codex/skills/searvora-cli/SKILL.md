---
name: searvora-cli
description: Use this skill when an agent needs to install, authenticate, operate, test, package, or document the Searvora CLI (`@searvora/cli`) for Searvora SEO services, including service discovery, pricing, Data Plane facts, SEO AI Analysis, Spider Crawler deep crawls, marketing SEO tools, Blogify content, JSON automation, and full technical SEO audits for a domain.
---

# Searvora CLI

Agent operating guide for `@searvora/cli`, the command-line surface for Searvora SEO diagnostics and optimization services.

## Start here

1. For exact groups/options: read `references/command-map.md`.
2. For a full domain SEO diagnosis: read `references/seo-audit-playbook.md`.
3. Prefer machine-readable output: add `--json` to every command you will parse.

## Core defaults

- Package: `@searvora/cli`; binary: `searvora`; public profile: `--profile public`.
- Install: `npm install -g @searvora/cli`; verify with `npm view @searvora/cli version` and `searvora --help`.
- If global CLI lacks a newly documented command, use the checked-out repo until npm is updated: `node src/index.js ...`.
- Use `price` or `pricing` for plan/subscription UX. Treat `subscription` as a legacy compatibility alias only.

## Safe authentication

- Never print passwords, access tokens, refresh tokens, service keys, cookies, or config-file token contents.
- Prefer stdin/env for credentials; never pass passwords as command-line arguments.

### If the user asks how to log in

1. Use an isolated config unless the user explicitly wants to reuse the default session:
   ```bash
   export SEARVORA_CONFIG="$(mktemp -d)/config.json"
   ```
2. Check whether the selected profile is already authenticated:
   ```bash
   searvora auth validate --profile public --json
   ```
3. If validation reports `missing_access_token`, collect credentials through environment variables or another non-echoing secret channel, then log in with stdin:
   ```bash
   printf '%s' "$SEARVORA_AUTH_PASSWORD" \
     | searvora auth login --email "$SEARVORA_AUTH_EMAIL" --password-stdin --profile public --json
   ```
4. Confirm the session without exposing tokens:
   ```bash
   searvora auth me --profile public --json
   searvora auth validate --profile public --json
   ```
5. In the final answer, report only the command result, profile, and user email/id if present. Do not paste token fields, cookie values, or config-file contents.
6. If login returns HTTP 401 `Invalid email or password`, do not retry in a loop and do not guess credentials. Ask for corrected credentials or a password reset, then rerun the same stdin login flow.
7. After unattended or one-off work, clear the temporary session unless the user explicitly asks to keep it:
   ```bash
   searvora auth logout --profile public --json
   ```

## Operating pattern

1. Confirm the surface is healthy: `searvora services health --profile public --json`.
2. Pick the narrow command group: `services`, `auth`, `price`, `facts`, `analysis`, `spider`, `tools`, `content`, or `workflow`.
3. Run the CLI first. Only call product HTTP APIs directly when the CLI does not yet expose the detailed endpoint; keep the CLI command/task IDs as the audit trail.
4. Save raw JSON/CSV/Markdown artifacts under a task-specific directory, then produce a human-readable summary with evidence.
5. If a command returns marketing HTML/404 for a product API, suspect public routing/proxy drift and stop to diagnose routes before trusting results.

## Quality gates

When editing the CLI package or this skill, keep docs and behavior aligned:

- CLI repo checks: `npm test`, `npm run check`, `npm pack --dry-run`.
- Skill package checks: `unzip -l <zip>`, `shasum -a 256 <zip>`, and a secret scan for token/password literals.
- Do not add README/CHANGELOG-style auxiliary files inside the skill; keep only `SKILL.md`, `agents/openai.yaml`, and directly useful references/scripts.
