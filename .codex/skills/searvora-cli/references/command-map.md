# Searvora CLI Command Map

## Package facts

- Package name: `@searvora/cli`
- Binary: `searvora`
- Public install: `npm install -g @searvora/cli`
- Package homepage: `https://searvora.com/cli`
- Registry version should be checked with `npm view @searvora/cli version`

## Core command groups

- `services` — discover services, health, URLs, and Compose hints.
- `config` — manage local CLI profiles.
- `auth` — login, current user, refresh, logout, and token validation.
- `price` / `pricing` — pricing page, plans, checkout, portal, subscription status.
- `facts` — SEO Data Plane shared facts and events.
- `analysis` — SEO AI Analysis / SDP.
- `spider` — SEO Spider Crawler.
- `tools` — marketing SEO tools and tool run history.
- `content` — Blogify / Shopify content operations.
- `workflow` — scaffolded cross-service workflows.

## Important alias rule

- Treat `subscription` as a compatibility alias only.
- Prefer `price` or `pricing` for public user guidance and plan UX.

## Global options

- `--json`
- `--profile local|docker|public`
- `--access-token <token>`
- `--service-key <key>`
- `--platform-user-id <id>`
- `--locale en|zh|tw`

## Auth inputs

Prefer these sources, in order:

1. Explicit flags
2. Environment variables
3. Local config file

Relevant env vars:

- `SEARVORA_PROFILE`
- `SEARVORA_AUTH_EMAIL`
- `SEARVORA_AUTH_PASSWORD`
- `SEARVORA_ACCESS_TOKEN`
- `SEARVORA_REFRESH_TOKEN`
- `SEARVORA_SERVICE_KEY`
- `SEARVORA_PLATFORM_USER_ID`
- `SEARVORA_GATEWAY_URL`
- `SEARVORA_DATA_PLANE_URL`
- `SEARVORA_SDP_URL`
- `SEARVORA_SFM_URL`
- `SEARVORA_BLOGIFY_URL`
- `SEARVORA_MARKETING_URL`
- `SEARVORA_PRICING_BASE_URL`

## Safe usage

- Use `--json` when another agent or script must parse the result.
- Prefer `searvora auth login --email <email> --password-stdin --profile public --json` instead of passing passwords in shell history.
- Do not invent secrets; fail fast if required auth inputs are missing.
- Use the published package name in docs and prompts; do not reference unpublished placeholders.
- For package verification, run `npm test`, `npm run check`, and `npm pack --dry-run` before publish.

## Typical agent flows

- Discover the surface: `searvora services list --json`
- Login safely: `printf '%s' "$SEARVORA_AUTH_PASSWORD" | searvora auth login --email user@example.com --password-stdin --profile public --json`
- Validate the session: `searvora auth validate --profile public --json`
- Check the public site: `searvora services health --profile public --json`
- Inspect pricing: `searvora price url --locale zh`
- Query shared facts: `searvora facts audit --domain example.com --json`
- Call tools: `searvora tools canonical check --url https://searvora.com --json`
