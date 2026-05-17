import test from "node:test";
import assert from "node:assert/strict";
import { handleServices, __test__ } from "../../src/commands/services.js";
import { DEFAULT_PROFILES } from "../../src/lib/catalog.js";

function context(fetchImpl, profile = DEFAULT_PROFILES.local) {
  return { profileName: "local", profile, fetchImpl };
}

test("services list includes base and health URLs", async () => {
  const result = await handleServices({ action: "list", args: [], context: context() });
  assert.equal(result.ok, true);
  assert.equal(result.data.services.find((service) => service.key === "gateway").healthUrl, "http://localhost:9100/health");
});

test("services compose profiles returns safe compose hints and rejects unknown subcommands", async () => {
  const result = await handleServices({ action: "compose", args: ["profiles"], context: context() });
  assert.equal(result.command, "services.compose.profiles");
  assert.ok(result.data.profiles.some((profile) => profile.profile === "all"));
  assert.throws(() => __test__.compose(["up"]), /Only 'searvora services compose profiles'/);
});

test("services health checks selected targets and reports failures without throwing", async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    if (String(url).includes("9400")) throw Object.assign(new Error("down"), { status: 503 });
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  };
  const result = await handleServices({ action: "health", args: ["gateway", "facts"], context: context(fetchImpl) });
  assert.equal(result.ok, false);
  assert.deepEqual(seen, ["http://localhost:9100/health", "http://localhost:9400/health"]);
  assert.equal(result.data.checks[0].ok, true);
  assert.equal(result.data.checks[1].status, 503);
});

test("services health skips services without configured base URLs", async () => {
  const profile = { ...DEFAULT_PROFILES.public, dataPlaneUrl: null };
  const result = await handleServices({ action: "health", args: ["facts"], context: context(undefined, profile) });
  assert.equal(result.ok, true);
  assert.equal(result.data.checks[0].skipped, true);
});

test("selectTargets supports all/default and explicit target lists", () => {
  assert.ok(__test__.selectTargets([]).some((service) => service.key === "gateway"));
  assert.equal(__test__.selectTargets([]).some((service) => service.key === "marketing"), false);
  assert.deepEqual(__test__.selectTargets(["gateway"]).map((service) => service.key), ["gateway"]);
});
