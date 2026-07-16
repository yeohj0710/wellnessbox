import "server-only";

import type { WbRndRecommendationRouteDependencies } from "@/lib/server/wb-rnd-interim-route";

const testDependencies = new WeakMap<
  Request,
  Partial<WbRndRecommendationRouteDependencies>
>();

export function setTipsPostTestDependencies(
  req: Request,
  dependencies: Partial<WbRndRecommendationRouteDependencies>
) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("tips_post_test_dependencies_require_test_environment");
  }
  testDependencies.set(req, dependencies);
}

export function takeTipsPostTestDependencies(req: Request) {
  if (process.env.NODE_ENV !== "test") return undefined;
  const dependencies = testDependencies.get(req);
  testDependencies.delete(req);
  return dependencies;
}
