# Searvora CLI Command Map

## Package facts

- Package name: `@searvora/cli`
- Binary: `searvora`
- Install: `npm install -g @searvora/cli`
- Homepage: `https://searvora.com/cli`
- Skill download page: `https://searvora.com/cli/skill`
- Registry check: `npm view @searvora/cli version`

## Command groups

- `services` — discover service URLs, health checks, and Compose hints.
- `config` — manage local CLI profiles and config path.
- `auth` — login, current user, refresh, logout, token validation.
- `price` / `pricing` — pricing page, plans, checkout, portal, subscription state.
- `facts` — SEO Data Plane shared facts and events.
- `analysis` — SEO AI Analysis / SDP APIs.
- `spider` — SEO Spider Crawler / SFM APIs.
- `tools` — marketing SEO tools and tool run history.
- `content` — Blogify / Shopify content operations.
- `workflow` — scaffolded cross-service workflows.
- `account`, `domains`, `integrations`, `ops` — scaffolded or helper groups.

## Alias rule

Use `price` or `pricing` in docs and prompts. `subscription` is a compatibility alias and should not be the primary command.

## Global options

- `--json`
- `--profile local|docker|public`
- `--access-token <token>`
- `--service-key <key>`
- `--platform-user-id <id>`
- `--locale en|zh|tw`

## Auth commands

Use this sequence for a one-off public login. The temporary config keeps tokens out of the user's default CLI profile.

```bash
export SEARVORA_CONFIG="$(mktemp -d)/config.json"
searvora auth validate --profile public --json
printf '%s' "$SEARVORA_AUTH_PASSWORD" \
  | searvora auth login --email "$SEARVORA_AUTH_EMAIL" --password-stdin --profile public --json
searvora auth me --profile public --json
searvora auth validate --profile public --json
searvora auth refresh --profile public --json
searvora auth logout --profile public --json
```

Input precedence: explicit flags, environment variables, then local config. Prefer `--password-stdin` or `SEARVORA_AUTH_PASSWORD`; avoid `--password` because shells can preserve it in process lists or history. If login returns HTTP 401 `Invalid email or password`, stop and request corrected credentials or a password reset rather than guessing.

Relevant env vars: `SEARVORA_CONFIG`, `SEARVORA_PROFILE`, `SEARVORA_AUTH_EMAIL`, `SEARVORA_AUTH_PASSWORD`, `SEARVORA_ACCESS_TOKEN`, `SEARVORA_REFRESH_TOKEN`, `SEARVORA_SERVICE_KEY`, `SEARVORA_PLATFORM_USER_ID`, `SEARVORA_GATEWAY_URL`, `SEARVORA_DATA_PLANE_URL`, `SEARVORA_SDP_URL`, `SEARVORA_SFM_URL`, `SEARVORA_BLOGIFY_URL`, `SEARVORA_MARKETING_URL`, `SEARVORA_PRICING_BASE_URL`.

## Useful commands

```bash
searvora services list --profile public --json
searvora services health --profile public --json
searvora price url --locale zh
searvora price plans --profile public --json
searvora tools canonical check --url https://example.com/ --profile public --json
searvora tools indexability check --url https://example.com/ --profile public --json
searvora tools sitemap extract --url https://example.com/ --profile public --json
searvora tools sitemap validate --url https://example.com/sitemap.xml --profile public --json
searvora tools robots check --url https://example.com/ --profile public --json
searvora analysis health --profile public --json
searvora analysis overview --profile public --json
searvora spider health --profile public --json
searvora spider crawl --profile public --json
searvora spider crawl create --profile public --body-json '{"start_url":"https://example.com/","max_pages":1200,"max_depth":20}' --json
```

## Internal facts commands

Data Plane internal commands usually require `--service-key` and `--platform-user-id` or matching env vars. Do not invent these values.

```bash
searvora facts audit --domain example.com --limit 100 --profile public --json
searvora facts links --domain example.com --limit 100 --profile public --json
searvora facts refresh --domain example.com --limit 100 --profile public --json
searvora facts crawl-runs --domain example.com --limit 20 --profile public --json
```

If the CLI reports `missing_service_key` or `missing_platform_user_id`, ask for authorized internal credentials or continue with public `tools`, `analysis`, and `spider` evidence.

## Common failure interpretation

- `llm_not_configured`: AI text generation for a tool is unavailable; record it and continue with deterministic SEO checks.
- HTTP 401/403: login may be missing/expired or the account lacks product access.
- HTTP 404 with Searvora marketing HTML for `analysis`/`spider`: likely public route/proxy drift; do not treat as product data.
- Spider create 422: use `start_url` in `--body-json`, not `url` or `target_url`.
- Analysis data with a `property_id` for a different domain: mark analysis evidence as stale/mis-bound and avoid using it for final findings.
