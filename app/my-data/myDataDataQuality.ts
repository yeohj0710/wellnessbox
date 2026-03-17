import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";
import type { UserProfile as ChatUserProfile } from "@/types/chat";
import type { MyDataCollections } from "./myDataPageData";

export type MyDataDataQualityIssue =
  | {
      id: "profile-goal-missing";
      tone: "amber" | "sky";
      title: string;
      description: string;
      evidence: string[];
      primaryAction:
        | {
            kind: "save_goal";
            label: string;
            value: string;
          }
        | {
            kind: "open_profile";
            label: string;
          };
      secondaryAction:
        | {
            kind: "link";
            label: string;
            href: string;
          }
        | {
            kind: "open_profile";
            label: string;
          }
        | null;
    }
  | {
      id: "profile-medications-missing";
      tone: "amber" | "sky";
      title: string;
      description: string;
      evidence: string[];
      primaryAction: {
        kind: "save_medications";
        label: string;
        values: string[];
      };
      secondaryAction:
        | {
            kind: "open_profile";
            label: string;
          }
        | null;
    }
  | {
      id: "health-link-stale" | "results-stale" | "profile-core-missing";
      tone: "amber" | "sky";
      title: string;
      description: string;
      evidence: string[];
      primaryAction:
        | {
            kind: "link";
            label: string;
            href: string;
          }
        | {
            kind: "open_profile";
            label: string;
          };
      secondaryAction:
        | {
            kind: "link";
            label: string;
            href: string;
          }
        | null;
    };

export type MyDataDataQualityModel = {
  profile: ChatUserProfile;
  issues: MyDataDataQualityIssue[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseProfileData(data: unknown): ChatUserProfile {
  const record = asRecord(data);
  if (!record) return {};

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    age: asNumber(record.age),
    sex:
      record.sex === "male" || record.sex === "female" || record.sex === "other"
        ? record.sex
        : undefined,
    heightCm: asNumber(record.heightCm),
    weightKg: asNumber(record.weightKg),
    conditions: asStringArray(record.conditions),
    medications: asStringArray(record.medications),
    allergies: asStringArray(record.allergies),
    goals: asStringArray(record.goals),
    dietaryRestrictions: asStringArray(record.dietaryRestrictions),
    pregnantOrBreastfeeding: asBoolean(record.pregnantOrBreastfeeding),
    caffeineSensitivity: asBoolean(record.caffeineSensitivity),
  };
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function uniqueStrings(values: string[], limit = values.length) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function inferGoalFromSignals(input: {
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const latestAssess = input.assessResults[0];
  const latestCheck = input.checkAiResults[0];
  const assessLabels = latestAssess
    ? normalizeAssessmentResult(latestAssess).topLabels
    : [];
  const checkLabels = latestCheck ? normalizeCheckAiResult(latestCheck).topLabels : [];
  const latestChat = input.chatSessions[0];
  const chatText = latestChat
    ? `${latestChat.title || ""} ${latestChat.messages
        .slice(-4)
        .map((message) => message.content || "")
        .join(" ")}`
    : "";
  const sourceText = [
    ...assessLabels,
    ...checkLabels,
    input.healthLink?.headline || "",
    input.healthLink?.summary || "",
    ...(input.healthLink?.highlights || []),
    chatText,
  ]
    .join(" ")
    .toLowerCase();

  if (/(수면|잠|숙면|불면|스트레스|긴장|마그네슘)/.test(sourceText)) {
    return "수면·스트레스";
  }
  if (/(피로|무기력|활력|에너지|비타민b|코엔자임|간)/.test(sourceText)) {
    return "피로 개선";
  }
  if (/(장|소화|배변|더부룩|유산균|식이섬유)/.test(sourceText)) {
    return "장·소화";
  }
  if (/(면역|감기|잔병치레|비타민c|아연)/.test(sourceText)) {
    return "면역 관리";
  }
  if (/(혈당|당|식사|탄수화물)/.test(sourceText)) {
    return "혈당·식습관";
  }
  if (/(눈|건조|루테인|시야)/.test(sourceText)) {
    return "눈 건강";
  }
  if (/(집중|기억|멍함|업무|학습)/.test(sourceText)) {
    return "집중·기억";
  }
  if (/(피부|모발|트러블|탄력|콜라겐)/.test(sourceText)) {
    return "피부·모발";
  }
  if (/(관절|무릎|뻣뻣)/.test(sourceText)) {
    return "관절 관리";
  }
  if (/(여성|생리|폐경|호르몬|엽산|철분)/.test(sourceText)) {
    return "여성 건강";
  }
  return null;
}

function hasRecentActivity(input: {
  orders: MyDataCollections["orders"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const latestOrderDays = daysSince(input.orders[0]?.createdAt);
  const latestChatDays = daysSince(input.chatSessions[0]?.updatedAt);

  return (
    (latestOrderDays != null && latestOrderDays <= 45) ||
    (latestChatDays != null && latestChatDays <= 45)
  );
}

export function buildMyDataDataQualityModel(input: {
  profileData: unknown;
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}): MyDataDataQualityModel | null {
  const profile = parseProfileData(input.profileData);
  const issues: MyDataDataQualityIssue[] = [];
  const inferredGoal = inferGoalFromSignals(input);
  const healthLinkMedicines = uniqueStrings(
    (input.healthLink?.topMedicines || []).map((item) =>
      typeof item === "string" ? item : item?.label || ""
    ),
    3
  );
  const healthLinkDays = daysSince(input.healthLink?.fetchedAt);
  const latestAssessDays = daysSince(input.assessResults[0]?.createdAt);
  const latestCheckDays = daysSince(input.checkAiResults[0]?.createdAt);
  const recentActivity = hasRecentActivity({
    orders: input.orders,
    chatSessions: input.chatSessions,
  });

  if ((profile.goals?.length ?? 0) === 0 && inferredGoal) {
    issues.push({
      id: "profile-goal-missing",
      tone: "sky",
      title: "목표 한 가지만 확정해도 추천과 상담 맥락이 훨씬 선명해집니다.",
      description:
        "지금 기록을 보면 가장 가까운 축이 보여요. 이 목표를 한 번만 확정해 두면 이후 탐색과 상담이 덜 흔들립니다.",
      evidence: uniqueStrings(
        [
          `최근 기록이 ${inferredGoal} 쪽으로 모이고 있어요.`,
          input.chatSessions[0]?.title
            ? `최근 상담 "${input.chatSessions[0].title}" 흐름과도 잘 맞아요.`
            : "",
          input.healthLink?.headline
            ? `건강링크 요약도 "${input.healthLink.headline}" 맥락을 보여줘요.`
            : "",
        ].filter(Boolean),
        3
      ),
      primaryAction: {
        kind: "save_goal",
        label: `"${inferredGoal}" 목표 저장`,
        value: inferredGoal,
      },
      secondaryAction: {
        kind: "open_profile",
        label: "직접 프로필 확인하기",
      },
    });
  }

  if (
    (profile.medications?.length ?? 0) === 0 &&
    healthLinkMedicines.length > 0 &&
    (healthLinkDays == null || healthLinkDays <= 90)
  ) {
    issues.push({
      id: "profile-medications-missing",
      tone: "amber",
      title: "프로필에는 복용약이 비어 있지만 최근 건강링크에는 복약 이력이 보여요.",
      description:
        "복용약 정보가 빠지면 상담과 추천이 더 보수적으로 흐르거나, 반대로 놓치는 주의점이 생길 수 있어요.",
      evidence: uniqueStrings(
        [
          `최근 건강링크 복약 이력: ${healthLinkMedicines.join(", ")}`,
          healthLinkDays != null
            ? `건강링크는 ${healthLinkDays}일 전에 갱신됐어요.`
            : "",
        ].filter(Boolean),
        2
      ),
      primaryAction: {
        kind: "save_medications",
        label: "최근 복용약 프로필에 반영",
        values: healthLinkMedicines,
      },
      secondaryAction: {
        kind: "open_profile",
        label: "직접 복용약 확인하기",
      },
    });
  }

  if (
    (!profile.sex || typeof profile.age !== "number") &&
    (input.orders.length > 0 ||
      input.chatSessions.length > 0 ||
      input.assessResults.length > 0 ||
      input.checkAiResults.length > 0)
  ) {
    issues.push({
      id: "profile-core-missing",
      tone: "sky",
      title: "성별·나이 같은 기본값이 비어 있어 설명과 비교 기준이 약해집니다.",
      description:
        "핵심 프로필이 비어 있으면 같은 결과도 더 넓고 조심스럽게만 해석될 수 있어요.",
      evidence: uniqueStrings(
        [
          !profile.sex ? "성별 정보가 비어 있어요." : "",
          typeof profile.age !== "number" ? "나이 정보가 비어 있어요." : "",
          recentActivity ? "최근 주문이나 상담이 있어 지금 정리해 두는 가치가 커요." : "",
        ].filter(Boolean),
        3
      ),
      primaryAction: {
        kind: "open_profile",
        label: "프로필 1분 확인하기",
      },
      secondaryAction: null,
    });
  }

  if (
    ((healthLinkDays != null && healthLinkDays >= 180) || !input.healthLink) &&
    (input.orders.length > 0 ||
      input.chatSessions.length > 0 ||
      input.assessResults.length > 0 ||
      input.checkAiResults.length > 0)
  ) {
    issues.push({
      id: "health-link-stale",
      tone: "amber",
      title: input.healthLink
        ? "건강링크가 오래돼 최신 복약·검진 맥락이 약해졌어요."
        : "건강링크가 없어 검진·복약 맥락이 비어 있어요.",
      description:
        "검진과 복약 데이터가 최신이 아니면 추천보다 안전 여유를 크게 잡게 되고, 실제 맞춤도 약해질 수 있습니다.",
      evidence: uniqueStrings(
        [
          healthLinkDays != null ? `마지막 건강링크 갱신: ${healthLinkDays}일 전` : "",
          recentActivity ? "최근 주문이나 상담은 이어지고 있어 다시 붙일 가치가 커요." : "",
        ].filter(Boolean),
        2
      ),
      primaryAction: {
        kind: "link",
        label: input.healthLink ? "건강링크 다시 갱신하기" : "건강링크 연결하기",
        href: "/health-link",
      },
      secondaryAction: {
        kind: "link",
        label: "마이데이터 흐름 유지하기",
        href: "/my-data",
      },
    });
  }

  const latestResultDays =
    latestAssessDays == null
      ? latestCheckDays
      : latestCheckDays == null
      ? latestAssessDays
      : Math.min(latestAssessDays, latestCheckDays);

  if (
    latestResultDays != null &&
    latestResultDays >= 120 &&
    recentActivity
  ) {
    issues.push({
      id: "results-stale",
      tone: "amber",
      title: "검사 결과가 오래돼 최근 상태와 현재 추천 사이 간격이 커졌어요.",
      description:
        "최근 상담이나 주문은 있는데 검사 기준이 오래되면 지금 상태와 맞지 않는 설명이 남을 수 있어요.",
      evidence: uniqueStrings(
        [
          latestAssessDays != null ? `정밀검사 최근 갱신: ${latestAssessDays}일 전` : "",
          latestCheckDays != null ? `빠른검사 최근 갱신: ${latestCheckDays}일 전` : "",
        ].filter(Boolean),
        2
      ),
      primaryAction: {
        kind: "link",
        label: "빠른검사 다시 하기",
        href: "/check-ai",
      },
      secondaryAction: {
        kind: "link",
        label: "정밀검사로 더 자세히 보기",
        href: "/assess",
      },
    });
  }

  if (issues.length === 0) return null;

  return {
    profile,
    issues: issues.slice(0, 4),
  };
}
