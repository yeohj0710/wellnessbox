import type { PrimaryFlow } from "./ui-types";
import type { NhisFetchFailure, NhisStatusResponse } from "./types";
import type { LatestCheckupMeta, MedicationDigest } from "./utils";

type HealthLinkRecoveryCoachTone = "info" | "warn" | "success";

export type HealthLinkRecoveryCoachModel = {
  tone: HealthLinkRecoveryCoachTone;
  badge: string;
  title: string;
  body: string;
  bullets: string[];
  footnote?: string;
};

type BuildHealthLinkRecoveryCoachInput = {
  status?: NhisStatusResponse["status"];
  primaryFlow?: PrimaryFlow;
  sessionExpired?: boolean;
  showHealthInPrereqGuide?: boolean;
  summaryFetchBlocked?: boolean;
  summaryFetchBlockedMessage?: string | null;
  fetchFailures?: NhisFetchFailure[];
  hasFetchResult?: boolean;
  latestCheckupMeta?: LatestCheckupMeta;
  medicationDigest?: MedicationDigest;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRemainingTime(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.ceil(minutes / 60);
  return `${hours}시간`;
}

function buildAvailableDataBullets(input: {
  latestCheckupMeta?: LatestCheckupMeta;
  medicationDigest?: MedicationDigest;
}) {
  const bullets: string[] = [];

  if (input.latestCheckupMeta?.checkupDate) {
    bullets.push(`최근 검진일은 ${input.latestCheckupMeta.checkupDate}로 확인돼요.`);
  } else if (input.latestCheckupMeta?.year) {
    bullets.push(`최근 검진 기록은 ${input.latestCheckupMeta.year}년 기준으로 확인돼요.`);
  }

  if (input.latestCheckupMeta?.agency) {
    bullets.push(`검진기관 정보는 ${input.latestCheckupMeta.agency} 기준으로 내려왔어요.`);
  }

  if ((input.medicationDigest?.totalRows ?? 0) > 0) {
    bullets.push(
      `복약 이력 ${input.medicationDigest?.totalRows.toLocaleString("ko-KR")}건은 먼저 읽을 수 있어요.`
    );
  }

  return bullets.slice(0, 3);
}

export function buildHealthLinkRecoveryCoach(
  input: BuildHealthLinkRecoveryCoachInput
): HealthLinkRecoveryCoachModel {
  const latestFetchedAt =
    formatDateTime(input.status?.cache?.latestFetchedAt ?? input.status?.lastFetchedAt ?? null) ??
    null;
  const latestAvailableAt =
    formatDateTime(input.status?.forceRefresh?.availableAt ?? null) ?? null;
  const remainingCooldown = formatRemainingTime(
    input.status?.forceRefresh?.remainingSeconds ?? null
  );
  const visibleFailureCount = input.fetchFailures?.length ?? 0;

  if (input.showHealthInPrereqGuide) {
    return {
      tone: "warn",
      badge: "사전 준비",
      title: "건강iN 서비스 활성화가 먼저예요",
      body:
        "본인 인증이 틀린 것이 아니라, 국민건강보험 쪽 건강검진 서비스 활성화가 아직 안 된 상태일 가능성이 커요.",
      bullets: [
        "건강iN에서 건강검진 서비스를 먼저 활성화한 뒤 다시 시도해 주세요.",
        "이 단계가 끝나면 여기서는 카카오 인증만 다시 보내면 이어서 진행돼요.",
        "입력 정보는 그대로 두고 준비가 끝난 뒤 같은 흐름으로 다시 시작하면 돼요.",
      ],
      footnote:
        "의료 판단을 하는 단계는 아니고, 데이터를 안전하게 불러오기 위한 사전 연결 단계예요.",
    };
  }

  if (input.sessionExpired && !input.hasFetchResult) {
    return {
      tone: "warn",
      badge: "재인증 필요",
      title: "인증이 만료돼서 다시 연결이 필요해요",
      body:
        "건강링크 자체가 끊긴 것은 아니고, 카카오 인증 세션이 끝나서 최신 데이터를 이어서 가져오지 못한 상태예요.",
      bullets: [
        "지금 단계에서는 상단 버튼으로 인증을 다시 보내는 것이 가장 빠른 해결 방법이에요.",
        "재인증이 끝나면 기존 연결을 새로 만들지 않고 이어서 결과를 다시 불러와요.",
        "같은 화면에서 바로 이어지므로 검사나 상담 기록이 사라지지 않아요.",
      ],
      footnote: "약사 검토가 필요한 판단은 데이터를 다시 불러온 뒤에만 이어서 진행돼요.",
    };
  }

  if (input.primaryFlow?.kind === "sign") {
    return {
      tone: "info",
      badge: "마지막 확인",
      title: "카카오 인증 완료 확인만 남았어요",
      body:
        "카카오톡에서 본인 인증을 끝냈다면 여기서 한 번만 완료 확인을 눌러 주면 결과 조회 단계로 넘어가요.",
      bullets: [
        "인증을 이미 끝냈다면 다시 처음부터 입력할 필요는 없어요.",
        "완료 확인 뒤에는 최근 검진과 복약 이력을 한 번에 불러와요.",
        "응답이 조금 느려도 같은 화면에서 자동으로 이어질 수 있어요.",
      ],
    };
  }

  if (input.summaryFetchBlocked) {
    const bullets = [
      input.summaryFetchBlockedMessage?.trim() ||
        "방금 새로고침을 사용해 잠시 후 다시 시도할 수 있어요.",
      input.hasFetchResult
        ? "지금 화면에 보이는 최근 결과는 그대로 확인할 수 있어요."
        : "쿨다운이 끝나면 같은 버튼으로 다시 이어서 시도하면 돼요.",
    ];
    if (latestFetchedAt) {
      bullets.push(`가장 최근에 확보한 데이터 시각은 ${latestFetchedAt}예요.`);
    }

    return {
      tone: input.hasFetchResult ? "info" : "warn",
      badge: "새로고침 제한",
      title: input.hasFetchResult
        ? "지금은 받아온 결과부터 읽는 편이 좋아요"
        : "잠시 후 다시 새로고침하면 돼요",
      body:
        "짧은 시간 안에 반복 조회가 이어지면 비용 보호와 외부 응답 안정성을 위해 잠시 재시도가 막힐 수 있어요.",
      bullets,
      footnote:
        remainingCooldown || latestAvailableAt
          ? `다음 시도 가능 시점: ${remainingCooldown ?? latestAvailableAt}.`
          : undefined,
    };
  }

  if (input.hasFetchResult && visibleFailureCount > 0) {
    const bullets = buildAvailableDataBullets({
      latestCheckupMeta: input.latestCheckupMeta,
      medicationDigest: input.medicationDigest,
    });
    bullets.push("누락된 일부 항목은 나중에 다시 새로고침해도 괜찮아요.");

    return {
      tone: "success",
      badge: "부분 성공",
      title: "가져온 데이터부터 먼저 읽어도 충분해요",
      body:
        "일부 항목 응답이 늦거나 빠졌더라도, 이미 내려온 검진·복약 정보만으로도 지금 상태를 이해하는 데 도움이 되는 경우가 많아요.",
      bullets: bullets.slice(0, 4),
      footnote:
        "AI 요약과 안내는 현재 확보된 정보 기준이며, 부족한 정보가 있으면 약사 확인이 더 중요해져요.",
    };
  }

  if (input.hasFetchResult) {
    const bullets = buildAvailableDataBullets({
      latestCheckupMeta: input.latestCheckupMeta,
      medicationDigest: input.medicationDigest,
    });
    if (latestFetchedAt) {
      bullets.push(`마지막 갱신 시각은 ${latestFetchedAt}예요.`);
    }

    return {
      tone: "success",
      badge: "연결 유지",
      title: "건강링크가 정상적으로 이어져 있어요",
      body:
        "지금부터는 데이터를 다시 연결하는 것보다, 받아온 결과를 읽고 상담이나 다음 행동으로 이어가는 것이 더 중요해요.",
      bullets: bullets.slice(0, 4),
    };
  }

  return {
    tone: "info",
    badge: "연결 안내",
    title: "지금 단계만 넘기면 결과 확인까지 이어져요",
    body:
      input.primaryFlow?.kind === "init"
        ? "이름, 생년월일, 휴대폰 번호만 정확히 맞으면 카카오 인증 요청까지 바로 넘어갈 수 있어요."
        : "현재 단계에 맞는 버튼 하나만 누르면 다음 단계로 이어지도록 흐름이 맞춰져 있어요.",
    bullets: [
      "건강링크는 진단을 내리는 기능이 아니라, 최근 건강 데이터를 안전하게 가져오는 연결 단계예요.",
      "가져온 뒤에는 검사 결과와 상담 맥락이 더 정확해져요.",
      "불확실하거나 누락된 정보가 있으면 이후 안내에서 약사 확인을 우선으로 잡아요.",
    ],
  };
}
