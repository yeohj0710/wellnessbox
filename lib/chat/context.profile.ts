import type { UserProfile } from "@/types/chat";
import { asStringArray, uniq } from "./context.base";
import type { UserContextSummary } from "./context.types";

function profileSexAge(profile: UserProfile | null | undefined) {
  if (!profile) return "없음";
  const sex =
    profile.sex === "male"
      ? "남성"
      : profile.sex === "female"
      ? "여성"
      : profile.sex === "other"
      ? "기타"
      : "";
  const age = typeof profile.age === "number" ? `${profile.age}세` : "";
  const merged = [sex, age].filter(Boolean).join(" ").trim();
  return merged || "없음";
}

export function buildProfileSummary(profile?: UserProfile | null): UserContextSummary["profile"] {
  if (!profile) return null;
  const goals = uniq(asStringArray(profile.goals), 3);
  const constraints = uniq(
    [
      ...asStringArray(profile.dietaryRestrictions),
      profile.pregnantOrBreastfeeding ? "임신/수유" : "",
      profile.caffeineSensitivity ? "카페인 민감" : "",
    ].filter(Boolean),
    4
  );
  const conditions = uniq(asStringArray(profile.conditions), 3);
  const medications = uniq(asStringArray(profile.medications), 3);
  const allergies = uniq(asStringArray(profile.allergies), 3);

  if (
    goals.length === 0 &&
    constraints.length === 0 &&
    conditions.length === 0 &&
    medications.length === 0 &&
    allergies.length === 0 &&
    profileSexAge(profile) === "없음"
  ) {
    return null;
  }

  return {
    sexAge: profileSexAge(profile),
    goals,
    constraints,
    conditions,
    medications,
    allergies,
  };
}
