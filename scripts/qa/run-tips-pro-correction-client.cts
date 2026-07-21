import { readFile } from "node:fs/promises";

import {
  runUserInterimProFollowUpRoute,
  runUserInterimProPlanRoute,
} from "../../lib/server/wb-rnd-interim-route";

async function run() {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error("input_path_required");
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const action = input.action;
  const body = input.body;
  const requestPath = action === "enroll" ? "/api/tips/pro/plans" : "/api/tips/pro/effects";
  const request = new Request(`http://localhost${requestPath}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const dependencies = {
    requireUserSessionImpl: async () => ({
      ok: true as const,
      data: { appUserId: "op057-service-user" },
    }),
  };
  const response = action === "enroll"
    ? await runUserInterimProPlanRoute(request, dependencies)
    : await runUserInterimProFollowUpRoute(request, dependencies);
  const responseBody = await response.text();
  if (!response.ok) throw new Error(`service_route_${response.status}:${responseBody}`);
  process.stdout.write(responseBody);
}

void run();
