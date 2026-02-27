import type { NextResponse } from "next/server";
import {
  B2B_EMPLOYEE_TOKEN_COOKIE,
  buildB2bEmployeeAccessToken,
  getB2bEmployeeCookieOptions,
} from "@/lib/b2b/employee-token";
import { buildCooldownPayload } from "@/lib/b2b/employee-sync-core";
import { noStoreJson } from "@/lib/server/no-store";

export type BuildSyncSuccessResponseInput = {
  employeeId: string;
  employeeName: string;
  identityHash: string;
  source: string;
  snapshotId: string;
  forceRefresh: boolean;
  cooldownSeconds: number;
  remainingCooldownSeconds: number;
  cooldownAvailableAt: string | null;
  reportId: string;
  reportVariantIndex: number;
  reportStatus: string;
  reportPeriodKey: string;
};

export function attachEmployeeToken(
  response: NextResponse,
  employeeId: string,
  identityHash: string
) {
  const token = buildB2bEmployeeAccessToken({
    employeeId,
    identityHash,
  });
  response.cookies.set(
    B2B_EMPLOYEE_TOKEN_COOKIE,
    token,
    getB2bEmployeeCookieOptions()
  );
  return response;
}

export function buildSyncSuccessResponse(input: BuildSyncSuccessResponseInput) {
  const response = noStoreJson({
    ok: true,
    employee: {
      id: input.employeeId,
      name: input.employeeName,
    },
    sync: {
      source: input.source,
      snapshotId: input.snapshotId,
      forceRefresh: input.forceRefresh,
      cooldown: buildCooldownPayload(
        input.cooldownSeconds,
        input.remainingCooldownSeconds,
        input.cooldownAvailableAt
      ),
    },
    report: {
      id: input.reportId,
      variantIndex: input.reportVariantIndex,
      status: input.reportStatus,
      periodKey: input.reportPeriodKey,
    },
  });

  return attachEmployeeToken(response, input.employeeId, input.identityHash);
}
