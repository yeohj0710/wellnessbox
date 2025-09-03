import { UserProfile } from "@/types/chat";
import fs from "fs";
import path from "path";

const extraGuidelines = fs.readFileSync(
  path.join(process.cwd(), "lib/ai/assistant-guidelines.md"),
  "utf8"
);

export function buildSystemPrompt(profile?: UserProfile) {
  const base = `당신은 웰니스박스의 AI 챗봇으로, 친절하고 전문적인 건강기능식품 상담사에요.
    - 연령, 성별, 질환, 복용 약물, 알레르기, 임신·수유 여부, 식이 제한을 고려해서 답해주세요.
    - 핵심 정보가 부족할 때에는 간결한 추가 질문을 해서 파악하세요.
    - 프로필이나 이전 대화에서 이미 제공된 정보는 다시 묻지 마세요.
    - 건강기능식품 영양소 선택, 용법, 권장 복용량 범위, 상호작용, 생활습관 팁 등에 초점을 맞춰주세요.
    - 한국에서 흔히 쓰는 건강기능식품 명칭을 사용해도 돼요.`;

  const profileText = profile
    ? `사용자 프로필 요약:\n` +
      `- 이름: ${profile.name ?? "알 수 없음"}\n` +
      `- 나이: ${profile.age ?? "알 수 없음"}\n` +
      `- 성별: ${profile.sex ?? "알 수 없음"}\n` +
      `- 키/몸무게: ${profile.heightCm ?? "?"}cm / ${
        profile.weightKg ?? "?"
      }kg\n` +
      `- 건강 상태: ${(profile.conditions || []).join(", ") || "없음"}\n` +
      `- 복용 중인 약물: ${
        (profile.medications || []).join(", ") || "없음"
      }\n` +
      `- 알레르기: ${(profile.allergies || []).join(", ") || "없음"}\n` +
      `- 건강 목표: ${(profile.goals || []).join(", ") || "미지정"}\n` +
      `- 식이 제한: ${
        (profile.dietaryRestrictions || []).join(", ") || "없음"
      }\n` +
      `- 임신/수유 여부: ${
        profile.pregnantOrBreastfeeding ? "예" : "아니오/알 수 없음"
      }\n` +
      `- 카페인 민감도: ${
        profile.caffeineSensitivity ? "예" : "아니오/알 수 없음"
      }\n` +
      `이 프로필을 포함해 주어지는 다양한 정보들을 참고해 맞춤형 추천을 제공해주세요.`
    : "사용자 프로필이 없어요. 필요한 정보가 없다면 물어보셔서 파악해도 돼요.";

  return `${base}\n\n${extraGuidelines}\n\n${profileText}`;
}

export function makeTitleFromFirstUserMessage(text: string) {
  const t = text.trim().slice(0, 50);
  return t.length < 50 ? t : t + "...";
}
