---
name: searvora-cli
description: Use this skill when working with the Searvora CLI package or repository, including install/run guidance, command-group discovery, authentication flags and env vars, JSON output, pricing vs subscription aliasing, package verification, or updates to the CLI docs and prompts.
---

# Searvora CLI

Use this skill to help Codex understand and operate the Searvora CLI.

## Start here

Read `references/command-map.md` first when you need command names, auth inputs, or safe defaults.

## What this skill covers

- Installing and running `@searvora/cli`
- Choosing the right command group for a task
- Using `--json` for agent-readable output
- Passing auth via flags or environment variables
- Treating `subscription` as a compatibility alias only
- Verifying package changes before publish

## Core workflow

1. Identify the task surface: discovery, pricing, facts, analysis, spider, tools, content, or workflow.
2. Prefer `price` / `pricing` for public plan and subscription UX.
3. Use explicit auth flags only when needed; otherwise prefer environment variables or local config.
4. Add `--json` whenever another agent or script must consume the result.
5. Keep responses and docs aligned with the published package name `@searvora/cli`.

## Safety rules

- Do not invent secrets or ask for credentials that should come from env/config.
- Do not recommend `subscription` as the primary public command group.
- Do not claim a package is unpublished if `npm view @searvora/cli version` resolves.
- When modifying the CLI package, keep `README.md`, `package.json`, and tests consistent with the actual published behavior.

## Useful commands

- `npm install -g @searvora/cli`
- `searvora --help`
- `searvora --json services list`
- `printf '%s' "$SEARVORA_AUTH_PASSWORD" | searvora auth login --email user@example.com --password-stdin --profile public --json`
- `searvora auth validate --profile public --json`
- `searvora price url --locale tw`
- `searvora facts audit --domain example.com --service-key ... --platform-user-id ... --json`

## When editing the skill itself

Keep this skill short, directive, and stable. If command behavior changes, update the reference file first, then adjust the skill body to match the new contract.
