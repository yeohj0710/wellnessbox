import { resolveWbRndEnvironmentContract } from "./wb-rnd-environment";

export type WbRndHealthAlias = {
  status: "ok" | "unavailable" | "disabled";
  alias: "wellnessbox-rnd";
  upstreamStatus?: string;
  upstreamEnvironment?: string;
  deploymentReady?: boolean;
};

export async function getWbRndHealthAlias(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<{ body: WbRndHealthAlias; status: number }> {
  const contract = resolveWbRndEnvironmentContract(env);
  if (!contract.enabled) {
    return {
      status: 503,
      body: { status: "disabled", alias: "wellnessbox-rnd" },
    };
  }

  try {
    const response = await fetchImpl(`${contract.baseUrl}/health`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(contract.timeoutMs),
    });
    if (!response.ok) throw new Error(`upstream_health_${response.status}`);
    const upstream = (await response.json()) as Record<string, unknown>;
    const deployment = upstream.deployment_contract as
      | Record<string, unknown>
      | null
      | undefined;
    return {
      status: 200,
      body: {
        status: "ok",
        alias: "wellnessbox-rnd",
        upstreamStatus: String(upstream.status ?? "unknown"),
        upstreamEnvironment: String(upstream.environment ?? "unknown"),
        deploymentReady:
          deployment?.status === "READY_FOR_PROVIDER_DEPLOYMENT",
      },
    };
  } catch {
    return {
      status: 503,
      body: { status: "unavailable", alias: "wellnessbox-rnd" },
    };
  }
}
