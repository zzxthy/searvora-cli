import { commandError, makeEnvelope } from "./output.js";
import { normalizePricingError, pricingUrl } from "./pricing.js";

export function joinUrl(base, path = "") {
  if (!base) throw new Error("Base URL is not configured for this profile/service");
  const normalizedBase = String(base).replace(/\/$/, "");
  if (!path) return normalizedBase;
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildHeaders({ auth, internal = false, json = true } = {}) {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  if (internal) {
    if (!auth?.serviceKey) throw new Error("Missing service key. Set SEARVORA_SERVICE_KEY or pass --service-key.");
    headers["X-Service-Key"] = auth.serviceKey;
    if (auth.platformUserId) headers["X-Platform-User-Id"] = String(auth.platformUserId);
  } else if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return headers;
}

export async function requestJson({ method = "GET", baseUrl, path, query, body, headers, auth, internal = false, timeoutMs = 30000, fetchImpl = globalThis.fetch }) {
  const url = new URL(joinUrl(baseUrl, path));
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      headers: { ...buildHeaders({ auth, internal, json: body !== undefined }), ...(headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? tryJson(text) : null;
    if (!response.ok) {
      const detail = data?.detail || data?.error || response.statusText;
      const error = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return text; }
}

export function envelopeHttpError({ error, command, profileName, service, request, pricingBaseUrl, locale }) {
  const raw = error?.data;
  const detail = raw?.detail && typeof raw.detail === "object" ? raw.detail : raw;
  const base = {
    code: detail?.error || detail?.code || (error?.status ? `http_${error.status}` : "request_failed"),
    message: detail?.message || detail?.detail || error?.message || "Request failed",
    http_status: error?.status,
    retryable: Boolean(detail?.retryable),
    pricing_url: detail?.pricing_url || detail?.upgrade_url,
    details: detail,
  };
  const normalized = normalizePricingError(base, pricingBaseUrl, locale);
  if (error?.status === 402 && !normalized.pricing_url) normalized.pricing_url = pricingUrl(pricingBaseUrl, locale);
  return makeEnvelope({ ok: false, command, profile: profileName, service, request, error: commandError(normalized), raw });
}
