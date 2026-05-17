import test from "node:test";
import assert from "node:assert/strict";
import { GROUPS, SERVICE_CATALOG, TOOL_CATALOG } from "../src/lib/catalog.js";

test("CLI exposes planned top-level groups including price but not primary subscription", () => {
  const names = GROUPS.map((group) => group.name);
  for (const required of ["services", "config", "auth", "account", "domains", "price", "facts", "analysis", "spider", "tools", "content", "integrations", "ops", "workflow"]) {
    assert.ok(names.includes(required), `missing ${required}`);
  }
  assert.equal(names.includes("subscription"), false);
});

test("service and tool catalogs include core SEARVORA surfaces", () => {
  assert.deepEqual(SERVICE_CATALOG.map((service) => service.key), ["gateway", "facts", "analysis", "spider", "blogify", "marketing"]);
  assert.ok(TOOL_CATALOG.some((tool) => tool.slug === "canonical-checker"));
  assert.ok(TOOL_CATALOG.some((tool) => tool.slug === "spider-launch"));
});
