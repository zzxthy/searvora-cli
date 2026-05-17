export function normalizeLocale(locale = "en") {
  return ["en", "zh", "tw"].includes(locale) ? locale : "en";
}

export function pricingPath(locale = "en") {
  const normalized = normalizeLocale(locale);
  if (normalized === "zh") return "/zh/pricing";
  if (normalized === "tw") return "/tw/pricing";
  return "/pricing";
}

export function pricingUrl(baseUrl = "https://searvora.com", locale = "en") {
  return `${String(baseUrl).replace(/\/$/, "")}${pricingPath(locale)}`;
}

export function pricingSuccessUrl(baseUrl = "https://searvora.com", locale = "en") {
  return `${pricingUrl(baseUrl, locale)}?checkout=success`;
}

export function normalizePricingError(error, baseUrl, locale) {
  if (!error || typeof error !== "object") return error;
  if (error.http_status !== 402 && error.status !== 402 && error.statusCode !== 402) return error;
  return {
    ...error,
    pricing_url: error.pricing_url || error.upgrade_url || pricingUrl(baseUrl, locale),
  };
}
