type RouteClassification =
  | "guarded"
  | "review_expected"
  | "review_unexpected"
  | "public_or_internal";

type GuardMapEntry = {
  file: string;
  route: string;
  methods: string[];
  guards: string[];
  directGuards: string[];
  importsRouteAuth: boolean;
  usesGetSession: boolean;
  note: string | null;
  classification: RouteClassification;
};

type GuardMapGroups = {
  guarded: Array<{ route: string }>;
  expectedReview: Array<{ route: string }>;
  unexpectedReview: Array<{ route: string }>;
  publicOrInternal: Array<{ route: string }>;
  missingMethodExports: Array<{ route: string }>;
};

type GuardPolicy = {
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

const { buildGuardMapMarkdown } = require("./guard-map.render.cts") as {
  buildGuardMapMarkdown: (input: {
    entries: GuardMapEntry[];
    groups: GuardMapGroups;
    policyViolations?: GuardPolicyViolation[];
  }) => string;
};
const { evaluateRouteGuardPolicies } = require("./guard-map.policy.cts") as {
  evaluateRouteGuardPolicies: (entries: GuardMapEntry[], policies: GuardPolicy[]) => GuardPolicyViolation[];
};
const { groupRouteEntries, scanApiGuardEntries } = require("./guard-map.scan.cts") as {
  groupRouteEntries: (entries: GuardMapEntry[]) => GuardMapGroups;
  scanApiGuardEntries: (input: {
    repoRoot: string;
    apiRoot: string;
    routeGuardTokens: string[];
    expectedSessionRouteNotes: Record<string, string>;
  }) => GuardMapEntry[];
};

module.exports = {
  buildGuardMapMarkdown,
  evaluateRouteGuardPolicies,
  groupRouteEntries,
  scanApiGuardEntries,
};
