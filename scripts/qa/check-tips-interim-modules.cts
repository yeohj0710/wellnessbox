import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const client = read("lib/server/wb-rnd-interim-client.ts");
const routes = read("lib/server/wb-rnd-interim-route.ts");
const userPage = read("components/tips/InterimUserConsole.tsx");
const rolePage = read("components/tips/InterimRoleConsole.tsx");

assert.match(client, /WB_RND_INTERIM_ENABLED/);
assert.match(client, /createHmac\("sha256"/);
assert.match(client, /x-wb-rnd-token/);
assert.match(client, /AbortController/);
assert.match(client, /cache: "no-store"/);
assert.equal(client.includes("body: JSON.stringify({ appUserId"), false);

assert.match(routes, /requireUserSession/);
assert.match(routes, /requirePharmSession/);
assert.match(routes, /requireAdminSession/);
assert.match(routes, /pseudonymizeInterimUserId\(auth\.data\.appUserId\)/);
assert.match(routes, /request_too_large/);
assert.match(routes, /review_already_decided|runPharmInterimDecisionRoute/);

assert.match(userPage, /PROXY_GOLD_SIMULATION/);
assert.match(userPage, /log_adverse_event/);
assert.match(userPage, /ingest_pro/);
assert.match(userPage, /create_followup/);
assert.match(rolePage, /실제 연구 완료/);
assert.match(rolePage, /simulation badge/);

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        "feature_flag",
        "fixed_server_proxy",
        "hmac_pseudonymization",
        "role_auth",
        "timeout_no_store",
        "simulation_disclosure",
        "pro_ae_followup_paths",
      ],
    },
    null,
    2
  )
);
