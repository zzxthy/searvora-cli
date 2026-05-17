# Searvora CLI

Agent-ready command line interface for the Searvora SEO platform.

The CLI groups Searvora service operations behind stable commands and JSON envelopes so humans, CI jobs, and AI agents can discover services, inspect pricing, query shared SEO facts, run marketing SEO tools, and hand work off to product services without guessing internal routes.

## Install

```bash
npm install -g @searvora/cli
```

For local development from this repository:

```bash
npm install
npm link
searvora --help
```

## Usage

```bash
searvora <group> <command> [options]
```

Common examples:

```bash
searvora services list --json
searvora services health --profile public --json
searvora price url --locale zh
searvora facts audit --domain example.com --service-key "$SEARVORA_SERVICE_KEY" --platform-user-id "$SEARVORA_PLATFORM_USER_ID" --json
searvora tools canonical check --url https://searvora.com --json
```

## Command groups

- `services` — service discovery, health checks, public URLs, and Compose hints.
- `config` — local CLI profiles and endpoint configuration.
- `price` / `pricing` — pricing page, plan, checkout, portal, and subscription status commands.
- `facts` — SEO Data Plane shared audit, link, refresh, URL fact, crawl, and tool facts.
- `analysis` — SEO AI Analysis / SDP diagnostics and planning context.
- `spider` — SEO Spider Crawler tasks, progress, exports, reports, and tool handoff.
- `tools` — marketing SEO tools and tool run history.
- `content` — Blogify / Shopify content operations.
- `workflow` — scaffolded cross-service agent workflows.

`subscription` is intentionally only a compatibility alias. Public subscription UX should point to the Searvora Pricing page and the `price` / `pricing` command group.

## Configuration

The CLI reads configuration from:

1. Global flags such as `--profile`, `--access-token`, `--service-key`, and `--platform-user-id`.
2. Environment variables such as `SEARVORA_PROFILE`, `SEARVORA_ACCESS_TOKEN`, `SEARVORA_SERVICE_KEY`, and `SEARVORA_PLATFORM_USER_ID`.
3. A local config file at `~/.config/searvora/config.json` or the path in `SEARVORA_CONFIG`.

Create a config file:

```bash
searvora config init
searvora config get --json
```

Stored token values are redacted by `config get`.

## JSON contract

Use `--json` for machine-readable output. Commands return a stable envelope:

```json
{
  "ok": true,
  "command": "services.list",
  "profile": "local",
  "data": {}
}
```

Failures use the same envelope with normalized `error` metadata.

## Security

- Do not commit local config files or credentials.
- Prefer environment variables or your secret manager for tokens and service keys.
- This repository intentionally contains no production credentials.
- Public commands that require authenticated Searvora APIs fail locally before making unsafe unauthenticated requests.

## Development

```bash
npm test
npm run check
npm run test:coverage
```

## License

MIT
