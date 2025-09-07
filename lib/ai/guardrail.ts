import { UserProfile } from "@/types/chat";

export function buildGuardrailHint() {
  return "위험 질환, 상호작용, 금기, 임신·수유, 소아·고령, 과다 복용은 답변 시작에 경고로 제시하고 정보 부족 시 불확실성을 명시하며 전문가 상담을 권고";
}

export function buildDisclaimer() {
  return "이 답변은 의료 조언이 아니며 전문의 상담이 필요할 수 있어요.";
}

export function uncertainty() {
  return "정보가 부족해 확답드리기 어려워요. 전문의와 상담해 주세요.";
}
