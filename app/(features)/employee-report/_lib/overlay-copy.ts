"use client";

import type { BusyHint } from "./use-busy-state";

export function resolveEmployeeReportOverlayDescription(busyHint: BusyHint) {
  if (busyHint === "force-preflight" || busyHint === "sync-preflight") {
    return "현재 상태를 확인하고 있어요.";
  }
  if (busyHint === "force-remote") {
    return "건강 정보를 다시 확인하고 있어요. 잠시만 기다려 주세요.";
  }
  if (busyHint === "sync-remote") {
    return "건강 정보를 확인하고 있어요. 잠시만 기다려 주세요.";
  }
  return "준비가 끝나면 화면에 바로 반영됩니다.";
}

export function resolveEmployeeReportOverlayDetailLines(input: {
  busyHint: BusyHint;
  busyElapsedSec: number;
}) {
  const { busyHint, busyElapsedSec } = input;
  if (busyHint === "sync-preflight" || busyHint === "force-preflight") {
    return [
      "입력한 정보와 현재 상태를 살펴보고 있어요.",
      "필요한 다음 단계가 있으면 곧 안내해 드릴게요.",
    ];
  }
  if (busyHint !== "sync-remote" && busyHint !== "force-remote") {
    return [] as string[];
  }
  if (busyElapsedSec < 45) {
    return [
      "인증 여부와 요청 내용을 확인하고 있어요.",
      "잠시만 기다려 주세요.",
    ];
  }
  if (busyElapsedSec < 120) {
    return [
      "건강 정보를 순서대로 확인하고 있어요.",
      "조금 더 걸릴 수 있지만 끝나면 바로 반영됩니다.",
    ];
  }
  return [
    "확인한 내용을 리포트에 정리하고 있어요.",
    "준비가 끝나면 바로 이어서 볼 수 있어요.",
  ];
}
