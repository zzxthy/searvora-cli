export const GROUPS = [
  { name: "services", summary: "Service discovery, URLs, health, and Compose profile hints" },
  { name: "config", summary: "CLI profile and endpoint configuration" },
  { name: "auth", summary: "Gateway login/session/token commands" },
  { name: "account", summary: "Current user, permissions, and account domains" },
  { name: "domains", summary: "Domain inventory and plan access checks" },
  { name: "price", summary: "Pricing page, plans, checkout, portal, and subscription status" },
  { name: "pricing", summary: "Alias for price" },
  { name: "facts", summary: "SEO Data Plane shared facts and events" },
  { name: "analysis", summary: "SDP / SEO AI Analysis diagnostics, planning, sync, and chat" },
  { name: "spider", summary: "SFM / SEO Spider Crawler tasks, progress, exports, and AI reports" },
  { name: "tools", summary: "Marketing SEO Tools and tool run history" },
  { name: "content", summary: "Blogify content generation, opportunities, drafts, and publishing" },
  { name: "integrations", summary: "GSC and Shopify integration helpers" },
  { name: "ops", summary: "Local operations, verification command hints, and Compose wrappers" },
  { name: "workflow", summary: "Cross-service diagnostic and optimization workflows" },
];

export const DEFAULT_PROFILES = {
  local: {
    gatewayUrl: "http://localhost:9100",
    dataPlaneUrl: "http://localhost:9400",
    sdpUrl: "http://localhost:9200",
    sfmUrl: "http://localhost:9300",
    blogifyUrl: "http://localhost:9024",
    marketingUrl: "https://searvora.com",
    pricingBaseUrl: "https://searvora.com",
  },
  docker: {
    gatewayUrl: "http://gateway:9100",
    dataPlaneUrl: "http://seo-data-plane:9400",
    sdpUrl: "http://sdp:3000",
    sfmUrl: "http://sfm:8000",
    blogifyUrl: "http://sca-saas-gateway:9024",
    marketingUrl: "https://searvora.com",
    pricingBaseUrl: "https://searvora.com",
  },
  public: {
    gatewayUrl: "https://auth.searvora.com",
    dataPlaneUrl: null,
    sdpUrl: "https://searvora.com/app/seo-ai-analysis",
    sfmUrl: "https://searvora.com/app/seo-spider-crawler",
    blogifyUrl: "https://searvora.com/app/blogify",
    marketingUrl: "https://searvora.com",
    pricingBaseUrl: "https://searvora.com",
  },
};

export const SERVICE_CATALOG = [
  {
    key: "gateway",
    group: "platform",
    displayName: "Platform Gateway",
    urlField: "gatewayUrl",
    defaultPort: 9100,
    healthPath: "/health",
    capabilities: ["auth", "account", "domains", "price", "quota", "dashboard", "tool-runs"],
  },
  {
    key: "facts",
    group: "seo",
    displayName: "SEO Data Plane",
    urlField: "dataPlaneUrl",
    defaultPort: 9400,
    healthPath: "/health",
    capabilities: ["crawl-runs", "url-facts", "audit", "links", "refresh", "content-opportunities", "tool-facts"],
  },
  {
    key: "analysis",
    group: "seo",
    displayName: "SEO AI Analysis / SDP",
    urlField: "sdpUrl",
    defaultPort: 9200,
    healthPath: "/api/health",
    capabilities: ["overview", "pages", "audit", "links", "refresh", "clusters", "ai-plan", "ai-chat", "gsc", "shopify-sync"],
  },
  {
    key: "spider",
    group: "seo",
    displayName: "SEO Spider Crawler / SFM",
    urlField: "sfmUrl",
    defaultPort: 9300,
    healthPath: "/health",
    capabilities: ["crawl", "progress", "pages", "exports", "structure", "ai-analysis", "tool-handoff"],
  },
  {
    key: "blogify",
    group: "content",
    displayName: "Blogify SaaS Gateway",
    urlField: "blogifyUrl",
    defaultPort: 9024,
    healthPath: "/health",
    capabilities: ["credentials", "articles", "drafts", "products", "shared-seo", "settings"],
  },
  {
    key: "marketing",
    group: "marketing",
    displayName: "Marketing Site + SEO Tools",
    urlField: "marketingUrl",
    defaultPort: null,
    healthPath: "/",
    capabilities: ["pricing-page", "seo-tools", "subscription-proxy"],
  },
];

export const TOOL_CATALOG = [
  { slug: "sitemap-url-extractor", command: "tools sitemap extract", endpoint: "/api/tools/sitemap-url-extractor" },
  { slug: "sitemap-validator", command: "tools sitemap validate", endpoint: "/api/tools/sitemap-validator" },
  { slug: "canonical-checker", command: "tools canonical check", endpoint: "/api/tools/canonical-checker" },
  { slug: "indexability-checker", command: "tools indexability check", endpoint: "/api/tools/indexability-checker" },
  { slug: "meta-title-generator", command: "tools meta title", endpoint: "/api/tools/meta-title-generator" },
  { slug: "meta-description-generator", command: "tools meta description", endpoint: "/api/tools/meta-description-generator" },
  { slug: "llms-txt-generator", command: "tools llms-txt generate", endpoint: "/api/tools/llms-txt-generator" },
  { slug: "robots-txt-generator", command: "tools robots generate", endpoint: "/api/tools/robots-txt-generator" },
  { slug: "hreflang-tag-generator", command: "tools hreflang generate", endpoint: "/api/tools/hreflang-tag-generator" },
  { slug: "spider-launch", command: "tools spider launch", endpoint: "/api/tools/spider/launch" },
];

export const COMPOSE_PROFILES = [
  { profile: "base", command: "docker compose up -d", services: ["postgres", "redis", "gateway", "seo-data-plane"] },
  { profile: "sfm", command: "docker compose --profile sfm up -d", services: ["sfm"] },
  { profile: "sdp", command: "docker compose --profile sdp up -d", services: ["sdp"] },
  { profile: "sca", command: "docker compose --profile sca up -d", services: ["sca-blog-api", "sca-blog-app", "sca-saas-gateway", "sca-saas-frontend", "sca-celery-worker"] },
  { profile: "all", command: "docker compose --profile all up -d", services: ["all product services"] },
  { profile: "monitoring", command: "docker compose --profile monitoring up -d", services: ["sca-celery-flower"] },
];

export function resolveServiceUrl(profile, service) {
  const url = profile?.[service.urlField] ?? null;
  return url ? String(url).replace(/\/$/, "") : null;
}
