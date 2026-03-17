/* eslint-disable no-console */
import assert from "node:assert/strict";
import path from "node:path";
import "tsconfig-paths/register";

const ROOT = process.cwd();

const db = require(path.join(ROOT, "lib/db.ts")).default as {
  appUser: {
    create: (input: {
      data: { kakaoId: string };
      select: { id: true };
    }) => Promise<{ id: string }>;
    deleteMany: (input: { where: { id: string } }) => Promise<{ count: number }>;
  };
  b2bEmployee: {
    deleteMany: (input: { where: { id: string } }) => Promise<{ count: number }>;
  };
  $queryRawUnsafe: <T = unknown>(query: string, ...params: unknown[]) => Promise<T>;
  $disconnect: () => Promise<void>;
};

const {
  upsertB2bEmployee,
} = require(path.join(ROOT, "lib/b2b/employee-service.ts")) as {
  upsertB2bEmployee: (input: {
    appUserId: string;
    name: string;
    birthDate: string;
    phone: string;
  }) => Promise<{
    employee: { id: string; identityHash: string };
    identity: { identityHash: string };
  }>;
};

const {
  B2bEmployeeIdentityValidationError,
} = require(path.join(ROOT, "lib/b2b/identity.ts")) as {
  B2bEmployeeIdentityValidationError: new (...args: any[]) => Error;
};

const {
  resolveEmployeeSessionLogin,
  resolveEmployeeSessionStatus,
} = require(path.join(ROOT, "lib/b2b/employee-session-route.ts")) as {
  resolveEmployeeSessionLogin: (input: {
    identityHash: string;
    name: string;
    birthDate: string;
    phoneNormalized: string;
  }) => Promise<{
    found: boolean;
    token?: { employeeId: string; identityHash: string };
  }>;
  resolveEmployeeSessionStatus: (employeeId: string) => Promise<{
    authenticated: boolean;
    employee?: { id: string };
  }>;
};

const {
  runEmployeeSessionPostRoute,
} = require(path.join(ROOT, "lib/b2b/employee-session-route-handler.ts")) as {
  runEmployeeSessionPostRoute: (req: Request) => Promise<Response>;
};

const {
  runEmployeeSyncAuthedPostRoute,
} = require(path.join(ROOT, "lib/b2b/employee-sync-route-handler.ts")) as {
  runEmployeeSyncAuthedPostRoute: (input: {
    req: Request;
    appUserId: string;
    guest: boolean;
  }) => Promise<Response>;
};

function createJsonRequest(urlPath: string, body: unknown) {
  return new Request(`http://localhost${urlPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function countEmployees() {
  const rows = (await db.$queryRawUnsafe<{ count: number }[]>(
    'SELECT COUNT(*)::int AS count FROM "B2bEmployee";'
  )) as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}

async function countGhostEmployees() {
  const rows = (await db.$queryRawUnsafe<{ count: number }[]>(
    `
      SELECT COUNT(*)::int AS count
      FROM "B2bEmployee"
      WHERE char_length(btrim("name")) = 0
         OR "birthDate" !~ '^[0-9]{8}$'
         OR "phoneNormalized" !~ '^[0-9]{10,11}$'
         OR "identityHash" !~ '^[0-9a-f]{64}$'
         OR ("appUserId" IS NOT NULL AND char_length(btrim("appUserId")) = 0);
    `
  )) as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}

async function countByIdentityHash(identityHash: string) {
  const rows = (await db.$queryRawUnsafe<{ count: number }[]>(
    'SELECT COUNT(*)::int AS count FROM "B2bEmployee" WHERE "identityHash" = $1;',
    identityHash
  )) as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}

async function runInvalidIdentityCases(appUserId: string) {
  const invalidCases = [
    { name: "   ", birthDate: "19990101", phone: "01055551234" },
    { name: "GhostUser", birthDate: "1999", phone: "01055551234" },
    { name: "GhostUser", birthDate: "19990101", phone: "01012" },
  ];

  for (const input of invalidCases) {
    let thrown: unknown = null;
    try {
      await upsertB2bEmployee({
        appUserId,
        name: input.name,
        birthDate: input.birthDate,
        phone: input.phone,
      });
    } catch (error) {
      thrown = error;
    }
    assert.ok(
      thrown instanceof B2bEmployeeIdentityValidationError,
      "Invalid identity input must throw B2bEmployeeIdentityValidationError."
    );
  }
}

async function runRouteRejectionCases(appUserId: string) {
  const badSessionReq = createJsonRequest("/api/b2b/employee/session", {
    name: " ",
    birthDate: "199901",
    phone: "010",
  });
  const badSessionRes = await runEmployeeSessionPostRoute(badSessionReq);
  assert.equal(badSessionRes.status, 400);
  const badSessionPayload = await readJson(badSessionRes);
  assert.equal(Boolean(badSessionPayload?.ok), false);

  const badSyncReq = createJsonRequest("/api/b2b/employee/sync", {
    name: " ",
    birthDate: "199901",
    phone: "010",
    forceRefresh: false,
  });
  const badSyncRes = await runEmployeeSyncAuthedPostRoute({
    req: badSyncReq,
    appUserId,
    guest: true,
  });
  assert.equal(badSyncRes.status, 400);
  const badSyncPayload = await readJson(badSyncRes);
  assert.equal(Boolean(badSyncPayload?.ok), false);
}

async function runSessionFlowCase(identity: {
  name: string;
  birthDate: string;
  phone: string;
  identityHash: string;
}) {
  const sessionLoginRes = await runEmployeeSessionPostRoute(
    createJsonRequest("/api/b2b/employee/session", {
      name: identity.name,
      birthDate: identity.birthDate,
      phone: identity.phone,
    })
  );
  assert.equal(sessionLoginRes.status, 200);
  const sessionLoginPayload = await readJson(sessionLoginRes);
  assert.equal(Boolean(sessionLoginPayload?.ok), true);
  assert.equal(Boolean(sessionLoginPayload?.found), true);

  const loginByHash = await resolveEmployeeSessionLogin({
    identityHash: identity.identityHash,
    name: identity.name,
    birthDate: identity.birthDate,
    phoneNormalized: identity.phone.replace(/\D/g, ""),
  });
  assert.equal(loginByHash.found, true);
  assert.ok(loginByHash.token?.employeeId, "Session login should resolve employee token.");

  const status = await resolveEmployeeSessionStatus(loginByHash.token!.employeeId);
  assert.equal(status.authenticated, true);
}

async function run() {
  const baselineTotal = await countEmployees();
  const baselineGhost = await countGhostEmployees();

  let createdAppUserId: string | null = null;
  let createdEmployeeId: string | null = null;

  try {
    const appUser = await db.appUser.create({
      data: {
        kakaoId: `qa-ghost-guard-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      select: { id: true },
    });
    createdAppUserId = appUser.id;

    const first = await upsertB2bEmployee({
      appUserId: appUser.id,
      name: "Ghost QA User",
      birthDate: "19990101",
      phone: "01055551234",
    });
    createdEmployeeId = first.employee.id;
    assert.ok(createdEmployeeId, "First upsert should create employee.");

    const second = await upsertB2bEmployee({
      appUserId: appUser.id,
      name: "Ghost   QA  User",
      birthDate: "1999-01-01",
      phone: "010-5555-1234",
    });
    assert.equal(
      second.employee.id,
      first.employee.id,
      "Same normalized identity must not create a new employee."
    );

    const sameIdentityCount = await countByIdentityHash(first.identity.identityHash);
    assert.equal(sameIdentityCount, 1);

    const renamed = await upsertB2bEmployee({
      appUserId: appUser.id,
      name: "Ghost QA User (테스트)",
      birthDate: "19990101",
      phone: "01055551234",
    });
    assert.equal(
      renamed.employee.id,
      first.employee.id,
      "Same birth date and phone should keep matching even if the name changes."
    );

    await runSessionFlowCase({
      name: "Ghost QA User",
      birthDate: "19990101",
      phone: "01055551234",
      identityHash: first.identity.identityHash,
    });

    await runInvalidIdentityCases(appUser.id);
    await runRouteRejectionCases(appUser.id);

    const ghostAfterActions = await countGhostEmployees();
    assert.equal(
      ghostAfterActions,
      baselineGhost,
      "Ghost employee count must not increase after multi-action flow."
    );

    const totalAfterActions = await countEmployees();
    assert.equal(
      totalAfterActions,
      baselineTotal + 1,
      "Only one valid employee row should be added in the scenario."
    );

    console.log("[qa:b2b-employee-ghost-guard] PASS multi-action no-ghost checks");
  } finally {
    if (createdEmployeeId) {
      await db.b2bEmployee.deleteMany({ where: { id: createdEmployeeId } });
    }
    if (createdAppUserId) {
      await db.appUser.deleteMany({ where: { id: createdAppUserId } });
    }
  }

  const finalTotal = await countEmployees();
  const finalGhost = await countGhostEmployees();
  assert.equal(finalTotal, baselineTotal);
  assert.equal(finalGhost, baselineGhost);
  console.log("[qa:b2b-employee-ghost-guard] PASS cleanup and baseline restore");
}

run()
  .then(async () => {
    await db.$disconnect();
    console.log("[qa:b2b-employee-ghost-guard] ALL PASS");
  })
  .catch(async (error) => {
    console.error("[qa:b2b-employee-ghost-guard] FAIL", error);
    try {
      await db.$disconnect();
    } catch {}
    process.exit(1);
  });
