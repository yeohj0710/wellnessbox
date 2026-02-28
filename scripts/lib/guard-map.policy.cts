type RouteEntry = {
  file: string;
  route: string;
  methods: string[];
  guards: string[];
  directGuards: string[];
  importsRouteAuth: boolean;
  usesGetSession: boolean;
  note: string | null;
  classification:
    | "guarded"
    | "review_expected"
    | "review_unexpected"
    | "public_or_internal";
};

type RouteGuardPolicyEntry = {
  routePrefix: string;
  requiredTokens: string[];
  note: string;
};

type GuardPolicyViolation = {
  route: string;
  file: string;
  guards: string[];
  requiredTokens: string[];
  missingTokens: string[];
  note: string;
};

function matchesRoutePrefix(route: string, routePrefix: string) {
  return route === routePrefix || route.startsWith(`${routePrefix}/`);
}

function evaluateRouteGuardPolicies(
  entries: RouteEntry[],
  policies: RouteGuardPolicyEntry[]
): GuardPolicyViolation[] {
  const violations: GuardPolicyViolation[] = [];

  for (const policy of policies) {
    for (const entry of entries) {
      if (!matchesRoutePrefix(entry.route, policy.routePrefix)) continue;
      const missingTokens = policy.requiredTokens.filter(
        (token) => !entry.guards.includes(token)
      );
      if (missingTokens.length === 0) continue;
      violations.push({
        route: entry.route,
        file: entry.file,
        guards: entry.guards,
        requiredTokens: policy.requiredTokens,
        missingTokens,
        note: policy.note,
      });
    }
  }

  return violations.sort((a, b) => a.route.localeCompare(b.route));
}

module.exports = {
  evaluateRouteGuardPolicies,
};
