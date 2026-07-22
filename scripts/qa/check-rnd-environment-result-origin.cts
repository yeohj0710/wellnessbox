import assert from "node:assert/strict";

import { resolveWbRndEnvironmentContract } from "../../lib/server/wb-rnd-environment";
import { resolveWbRndResultOrigin } from "../../lib/wb-rnd-result-origin";

assert.deepEqual(resolveWbRndEnvironmentContract({}), {
  enabled: false,
  status: "disabled",
});
assert.throws(
  () => resolveWbRndEnvironmentContract({ WB_RND_RECOMMEND_ENABLED: "1" }),
  /WB_RND_SERVICE_BASE_URL_missing/
);
assert.throws(
  () => resolveWbRndEnvironmentContract({
    NODE_ENV: "production",
    WB_RND_RECOMMEND_ENABLED: "1",
    WB_RND_SERVICE_BASE_URL: "http://rnd.example.test",
    WB_RND_SERVICE_TOKEN: "x".repeat(32),
  }),
  /https_required/
);
assert.throws(
  () => resolveWbRndEnvironmentContract({
    NODE_ENV: "production",
    WB_RND_RECOMMEND_ENABLED: "1",
    WB_RND_SERVICE_BASE_URL: "https://user:pass@rnd.example.test/?debug=1",
    WB_RND_SERVICE_TOKEN: "x".repeat(32),
  }),
  /contains_credentials_or_suffix/
);
const contract = resolveWbRndEnvironmentContract({
  NODE_ENV: "production",
  WB_RND_RECOMMEND_ENABLED: "true",
  WB_RND_SERVICE_BASE_URL: "https://rnd.example.test/",
  WB_RND_SERVICE_TOKEN: "x".repeat(32),
  WB_RND_RECOMMEND_TIMEOUT_MS: "2500",
});
assert.equal(contract.enabled && contract.baseUrl, "https://rnd.example.test");
assert.equal(contract.enabled && contract.timeoutMs, 2500);

const execution = resolveWbRndResultOrigin({
  source: "rnd",
  response: {
    execution_id: "exec_123",
    metadata: { generated_at: "2026-07-22T00:00:00Z" },
  },
  requestedAt: "2026-07-22T00:00:01Z",
  fallbackReason: null,
});
assert.equal(execution.label, "R&D 실행 결과");
assert.equal(execution.kind, "rnd_execution");

const snapshot = resolveWbRndResultOrigin({
  source: "fallback",
  response: {},
  requestedAt: "2026-07-22T00:00:01Z",
  fallbackReason: "timeout",
});
assert.equal(snapshot.label, "로컬 스냅샷 결과");
assert.equal(snapshot.kind, "local_snapshot");
assert.throws(
  () => resolveWbRndResultOrigin({ source: "fallback", response: {}, requestedAt: "x", fallbackReason: null }),
  /missing_fallback_reason/
);

console.log("WB_RND environment and result-origin contract: PASS");
