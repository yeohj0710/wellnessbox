import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const client = read("lib/server/wb-rnd-interim-client.ts");
const routes = read("lib/server/wb-rnd-interim-route.ts");
const replay = read("lib/server/tips-lab/rnd-session-replay.ts");
const runtime = read("lib/server/tips-lab/runtime.ts");
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
assert.match(replay, /callWbRndInterim/);
assert.match(replay, /\/v1\/interim\/executions\?limit=20/);
assert.match(replay, /VERSION_MISMATCH/);
assert.match(replay, /invalid_rnd_execution_id/);
assert.match(runtime, /list_rnd_sessions/);
assert.match(runtime, /replay_rnd_session/);

assert.match(userPage, /PROXY_GOLD_SIMULATION/);
assert.match(userPage, /log_adverse_event/);
assert.match(userPage, /ingest_pro/);
assert.match(userPage, /create_followup/);
assert.match(userPage, /저장 세션 재생 검증/);
assert.match(userPage, /R&D 서버 미연결/);
assert.match(userPage, /입력 일치/);
assert.match(userPage, /실행 버전 일치/);
assert.match(userPage, /추천 결과 일치/);
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
        "rnd_saved_session_replay",
      ],
    },
    null,
    2
  )
);
