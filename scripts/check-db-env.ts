(function runDbEnvCheck() {
  require("dotenv").config({ quiet: true });
  const { ensurePrismaEnvConfigured } = require("../lib/db-env") as typeof import("../lib/db-env");

  const result = ensurePrismaEnvConfigured(true);
  if (!result.ok) {
    console.error(result.message || "[db-env] 데이터베이스 환경변수 검증에 실패했습니다.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `[db-env] OK databaseKey=${result.databaseKey ?? "-"} directKey=${result.directKey ?? "-"}`
  );
})();
