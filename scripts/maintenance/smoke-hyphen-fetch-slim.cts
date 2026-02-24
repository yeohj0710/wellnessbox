const fs = require("fs");
const path = require("path");

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function run() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const fetchContractPath = path.join(
    repoRoot,
    "lib/server/hyphen/fetch-contract.ts"
  );
  const fetchClientPolicyPath = path.join(
    repoRoot,
    "app/(features)/health-link/fetchClientPolicy.ts"
  );
  const fetchExecutorPath = path.join(
    repoRoot,
    "lib/server/hyphen/fetch-executor.ts"
  );
  const normalizePath = path.join(repoRoot, "lib/server/hyphen/normalize.ts");

  const fetchContract = read(fetchContractPath);
  const fetchClientPolicy = read(fetchClientPolicyPath);
  const fetchExecutor = read(fetchExecutorPath);
  const normalize = read(normalizePath);

  assert(
    /DEFAULT_NHIS_FETCH_TARGETS[\s\S]*checkupOverview[\s\S]*medication/.test(
      fetchContract
    ),
    "default targets must include checkupOverview + medication"
  );
  assert(
    !/DEFAULT_NHIS_FETCH_TARGETS[\s\S]*\[[\s\S]*"medical"[\s\S]*\]/.test(
      fetchContract
    ),
    "default targets must not include medical"
  );
  assert(
    /SUMMARY_FETCH_TARGETS\s*=\s*\[\s*"checkupOverview"\s*,\s*"medication"\s*\]/.test(
      fetchClientPolicy
    ),
    "client summary targets must be exactly checkupOverview + medication"
  );

  assert(
    !/resolveMedicationProbeWindows/.test(fetchExecutor),
    "default summary path must not use medication probe windows"
  );

  assert(
    /runIndependentTarget\(\s*"checkupOverview"/.test(fetchExecutor),
    "fetch-executor should call checkupOverview target"
  );
  assert(
    /runIndependentTarget\(\s*"medication"/.test(fetchExecutor),
    "fetch-executor should call medication target"
  );

  assert(
    /MEDICATION_RECENT_LIMIT\s*=\s*3/.test(normalize),
    "normalize.ts must keep medication row limit at 3"
  );
  assert(
    /selectLatestCheckupOverviewRows/.test(normalize),
    "normalize.ts must narrow overview to latest checkup batch"
  );

  console.log("[nhis-fetch-slim-smoke] PASS");
}

try {
  run();
} catch (error) {
  console.error("[nhis-fetch-slim-smoke] FAIL", error);
  process.exit(1);
}
