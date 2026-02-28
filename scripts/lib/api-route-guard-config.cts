type GuardCheck = {
  file: string;
  requiredTokens: string[];
};

type ExpectedSessionRouteEntry = {
  route: string;
  routeFile: string;
  note: string;
};

type RouteGuardPolicyEntry = {
  routePrefix: string;
  requiredTokens: string[];
  note: string;
};

const ROUTE_GUARD_TOKENS = [
  "requireAdminSession",
  "requireAnySession",
  "requireUserSession",
  "requireNhisSession",
  "requirePharmSession",
  "requireRiderSession",
  "requireCustomerOrderAccess",
  "requireB2bEmployeeToken",
  "requireCronSecret",
];

const CRITICAL_GUARD_CHECKS: GuardCheck[] = [
  {
    file: "app/api/admin/model/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/agent-playground/run/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/rag/debug/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/rag/ingest/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/rag/reindex/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/push/subscribe/route.ts",
    requiredTokens: ["requireCustomerOrderAccess"],
  },
  {
    file: "app/api/push/send/route.ts",
    requiredTokens: ["requireCustomerOrderAccess"],
  },
  {
    file: "app/api/pharm-push/subscribe/route.ts",
    requiredTokens: ["requirePharmSession"],
  },
  {
    file: "app/api/rider-push/subscribe/route.ts",
    requiredTokens: ["requireRiderSession"],
  },
  {
    file: "app/api/me/profile/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/phone-status/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/link-phone/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/unlink-phone/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/nickname/check/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/auth/email/send-otp/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/auth/email/verify-otp/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/messages/stream/token/route.ts",
    requiredTokens: ["requirePharmSession", "requireRiderSession"],
  },
  {
    file: "app/api/b2b/employee/sync/route.ts",
    requiredTokens: ["requireNhisSession"],
  },
];

const EXPECTED_SESSION_ROUTE_ENTRIES: ExpectedSessionRouteEntry[] = [
  {
    route: "/api/auth/kakao/callback",
    routeFile: "app/api/auth/kakao/callback/route.ts",
    note: "OAuth callback route that sets login session after provider redirect.",
  },
  {
    route: "/api/auth/kakao/complete/[token]",
    routeFile: "app/api/auth/kakao/complete/[token]/route.ts",
    note: "One-time token completion route that finalizes login session.",
  },
  {
    route: "/api/auth/login-status",
    routeFile: "app/api/auth/login-status/route.ts",
    note: "Read-only route that reports current session status to UI.",
  },
  {
    route: "/api/auth/logout",
    routeFile: "app/api/auth/logout/route.ts",
    note: "Logout route that clears session cookies.",
  },
  {
    route: "/api/logout",
    routeFile: "app/api/logout/route.ts",
    note: "Legacy logout compatibility route that clears session cookies.",
  },
  {
    route: "/api/verify-password",
    routeFile: "app/api/verify-password/route.ts",
    note: "Admin password verification route that creates admin/test session.",
  },
];

const ROUTE_GUARD_POLICIES: RouteGuardPolicyEntry[] = [
  {
    routePrefix: "/api/admin",
    requiredTokens: ["requireAdminSession"],
    note: "Admin API routes must require admin session guard.",
  },
];

module.exports = {
  CRITICAL_GUARD_CHECKS,
  EXPECTED_SESSION_ROUTE_ENTRIES,
  ROUTE_GUARD_POLICIES,
  ROUTE_GUARD_TOKENS,
};
