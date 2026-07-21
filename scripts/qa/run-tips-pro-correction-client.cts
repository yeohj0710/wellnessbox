import { readFile } from "node:fs/promises";

import { runUserInterimProCorrectionRoute } from "../../lib/server/wb-rnd-interim-route";

async function run() {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error("input_path_required");
  const body = JSON.parse(await readFile(inputPath, "utf8"));
  const response = await runUserInterimProCorrectionRoute(
    new Request("http://localhost/api/tips/pro/effects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    {
      requireUserSessionImpl: async () => ({
        ok: true as const,
        data: { appUserId: "op057-service-user" },
      }),
    }
  );
  const responseBody = await response.text();
  if (!response.ok) throw new Error(`service_route_${response.status}:${responseBody}`);
  process.stdout.write(responseBody);
}

void run();
