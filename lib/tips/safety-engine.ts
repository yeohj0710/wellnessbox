import type { TipsLabProfile } from "./proxy-model-engine";

export type SafetyDecision = {
  decision: "ALLOW" | "REVIEW" | "STOP_AND_ESCALATE";
  reasons: string[];
  blockedIngredients: string[];
};

export function checkTipsSafety(profile: TipsLabProfile): SafetyDecision {
  const reasons: string[] = [];
  const blocked = new Set<string>();
  const flags = new Set(profile.riskFlags);
  const conditions = new Set(profile.conditions);
  const medications = new Set(profile.medicationClasses);
  if (flags.has("red_flag_chest_pain") || flags.has("red_flag_severe_abdominal_pain")) {
    return { decision: "STOP_AND_ESCALATE", reasons: ["응급 위험 신호가 있어 추천을 중단하고 의료기관 확인이 필요합니다."], blockedIngredients: [] };
  }
  if (profile.pregnant) reasons.push("임신 중에는 성분·용량별 전문가 검토가 필요합니다.");
  if (conditions.has("chronic_kidney_disease")) {
    blocked.add("ING:MAGNESIUM"); blocked.add("ING:POTASSIUM");
    reasons.push("신장질환 정보가 있어 마그네슘 등 전해질 관련 성분을 보류합니다.");
  }
  if (conditions.has("hemochromatosis")) {
    blocked.add("ING:IRON"); reasons.push("철 과부하 위험 정보가 있어 철분을 제외합니다.");
  }
  if (medications.has("warfarin")) {
    blocked.add("ING:OMEGA3"); reasons.push("와파린 복용 정보가 있어 오메가3는 약사 검토 전 보류합니다.");
  }
  if (profile.allergies.includes("fish")) {
    blocked.add("ING:OMEGA3"); reasons.push("어류 알레르기 정보가 있어 오메가3 원료 확인이 필요합니다.");
  }
  return { decision: reasons.length ? "REVIEW" : "ALLOW", reasons, blockedIngredients: [...blocked] };
}
