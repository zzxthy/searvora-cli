# Complete SEO Audit Playbook

Use this when asked to diagnose a site with Searvora CLI, especially when the user asks for Spider/Analysis coverage.

## 0. Workspace and login

```bash
TARGET="https://example.com/"
DOMAIN="example.com"
AUDIT_DIR="/tmp/searvora-audit-${DOMAIN}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$AUDIT_DIR"
export SEARVORA_CONFIG="$AUDIT_DIR/searvora-config.json"
printf '%s' "$SEARVORA_AUTH_PASSWORD" \
  | searvora auth login --email "$SEARVORA_AUTH_EMAIL" --password-stdin --profile public --json \
  | tee "$AUDIT_DIR/auth-login.json"
searvora auth validate --profile public --json | tee "$AUDIT_DIR/auth-validate.json"
```

Do not paste token fields into the final answer. It is okay to cite command names, task IDs, counts, and artifact paths.

## 1. Service health

```bash
searvora services health --profile public --json | tee "$AUDIT_DIR/services-health.json"
searvora analysis health --profile public --json | tee "$AUDIT_DIR/analysis-health.json"
searvora spider health --profile public --json | tee "$AUDIT_DIR/spider-health.json"
```

Stop and diagnose routing/auth before trusting downstream results if product APIs return marketing HTML, public 404s, 401s, or 403s.

## 2. Deterministic public SEO tools

Run at minimum:

```bash
searvora tools canonical check --url "$TARGET" --profile public --json | tee "$AUDIT_DIR/tool-canonical.json"
searvora tools indexability check --url "$TARGET" --profile public --json | tee "$AUDIT_DIR/tool-indexability.json"
searvora tools sitemap extract --url "$TARGET" --profile public --json | tee "$AUDIT_DIR/tool-sitemap-extract.json"
searvora tools robots check --url "$TARGET" --profile public --json | tee "$AUDIT_DIR/tool-robots.json"
```

If a sitemap URL is discovered, validate it:

```bash
searvora tools sitemap validate --url "https://example.com/sitemap.xml" --profile public --json \
  | tee "$AUDIT_DIR/tool-sitemap-validate.json"
```

Optional: metadata, hreflang, and other `tools` subcommands when relevant. If a tool reports `llm_not_configured`, note it but continue.

## 3. Spider deep crawl

Create a deep crawl with a high page cap. The public SFM API expects `start_url`.

```bash
searvora spider crawl create --profile public --json --body-json '{
  "start_url":"https://example.com/",
  "max_pages":1200,
  "max_depth":20,
  "respect_robots":true,
  "include_images":true,
  "include_external":false
}' | tee "$AUDIT_DIR/spider-create.json"
```

Poll until `completed` or `failed`:

```bash
searvora spider crawl --profile public --json | tee "$AUDIT_DIR/spider-tasks.json"
```

If `pages_crawled` equals `max_pages`, the crawl hit the cap. Rerun with a larger `max_pages` before calling it complete.

## 4. Detailed Spider evidence

Use CLI task IDs as the audit trail. If the CLI does not expose detailed page/issue endpoints yet, use the authenticated Spider API directly as a fallback without printing tokens:

- `/app/seo-spider-crawler/api/crawl/tasks/{task_id}/stats`
- `/app/seo-spider-crawler/api/pages/{task_id}/stats/overview`
- `/app/seo-spider-crawler/api/pages/{task_id}?page=1&page_size=200`

Save all JSON responses. Export representative issue rows to CSV when possible: URL, status, title length, meta description length, H1 count, canonical, word count, text ratio, hreflang/x-default, issue labels.

## 5. Analysis and Data Plane

Run public analysis endpoints for context:

```bash
searvora analysis overview --profile public --json | tee "$AUDIT_DIR/analysis-overview.json"
searvora analysis audit --profile public --json | tee "$AUDIT_DIR/analysis-audit.json"
searvora analysis links --profile public --json | tee "$AUDIT_DIR/analysis-links.json"
searvora analysis refresh --profile public --json | tee "$AUDIT_DIR/analysis-refresh.json"
searvora analysis clusters --profile public --json | tee "$AUDIT_DIR/analysis-clusters.json"
searvora analysis skills --profile public --json | tee "$AUDIT_DIR/analysis-skills.json"
```

Before using Analysis evidence, verify it belongs to the target domain. If `property_id`, configured domain, or page samples point to another site, label it stale/mis-bound and exclude it from findings.

Use `facts` only when authorized service key/platform user ID are available; otherwise do not fabricate internal evidence.

## 6. Final report structure

Use absolute dates and include:

1. Scope: target, crawl date, CLI profile, task IDs, page counts, artifact directory.
2. Executive summary: top risks and expected impact.
3. P0/P1/P2 prioritized findings: evidence counts + examples + exact remediation.
4. Crawl coverage: total URLs, HTTP status distribution, cap-hit status, sitemap vs crawl observations.
5. Technical SEO sections: indexability, canonicals, title/meta, headings, content depth, hreflang, robots/sitemap, broken URLs, internal links, images/performance hints.
6. 30/60/90-day roadmap with owner-friendly action items.
7. Appendix: commands run and saved artifact paths.

Do not overstate findings that come only from stale Analysis data or unavailable AI tools.
