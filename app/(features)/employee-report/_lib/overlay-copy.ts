"use client";

import type { BusyHint } from "./use-busy-state";

export function resolveEmployeeReportOverlayDescription(busyHint: BusyHint) {
  if (busyHint === "force-preflight" || busyHint === "sync-preflight") {
    return "연동 상태를 확인하고 있어요.";
  }
  if (busyHint === "force-remote") {
    return "건강정보를 다시 불러오고 있어요. 잠시만 기다려 주세요.";
  }
  if (busyHint === "sync-remote") {
    return "건강정보를 불러오고 있어요. 잠시만 기다려 주세요.";
  }
  return "완료되면 화면이 자동으로 갱신됩니다.";
}

export function resolveEmployeeReportOverlayDetailLines(input: {
  busyHint: BusyHint;
  busyElapsedSec: number;
}) {
  const { busyHint, busyElapsedSec } = input;
  if (busyHint === "sync-preflight" || busyHint === "force-preflight") {
    return [
      "저장된 정보가 있는지 먼저 확인합니다.",
      "필요한 경우에만 외부 연동을 진행합니다.",
    ];
  }
  if (busyHint !== "sync-remote" && busyHint !== "force-remote") {
    return [] as string[];
  }
  if (busyElapsedSec < 45) {
    return [
      "인증 상태와 요청 정보를 확인하고 있어요.",
      "브라우저를 닫지 말고 잠시만 기다려 주세요.",
    ];
  }
  if (busyElapsedSec < 120) {
    return [
      "외부 건강정보를 조회하고 있어요.",
      "응답 시간에 따라 몇 분 정도 걸릴 수 있어요.",
    ];
  }
  return [
    "받은 데이터를 정리하고 레포트를 갱신하고 있어요.",
    "완료 후 화면이 자동으로 갱신됩니다.",
  ];
}
