import { UserProfile } from "@/types/chat";

// Keep this file strictly UTF-8. Prefer ASCII to avoid encoding issues.

export function buildSystemPrompt(profile?: UserProfile) {
  const base = `You are WellnessBox, a friendly, expert counselor for dietary supplements.
You provide practical, evidence-aware guidance while being careful about safety and interactions.
Important rules:
- Always include a brief safety disclaimer: not a substitute for professional medical advice.
- Consider age, sex, conditions, medications, allergies, pregnancy/breastfeeding, dietary restrictions.
- Ask concise follow-up questions only when key information is missing.
- Do not ask again for details already provided via profile or earlier messages.
- Avoid diagnosing; focus on supplement options, timing, dosage ranges, interactions, and lifestyle tips.
- Use common local Korean supplement names when relevant.
- If something is risky or unclear, suggest consulting a pharmacist or physician.`;

  const profileText = profile
    ? `User profile summary:\n` +
      `- Name: ${profile.name ?? "unknown"}\n` +
      `- Age: ${profile.age ?? "unknown"}\n` +
      `- Sex: ${profile.sex ?? "unknown"}\n` +
      `- Height/Weight: ${profile.heightCm ?? "?"}cm / ${profile.weightKg ?? "?"}kg\n` +
      `- Conditions: ${(profile.conditions || []).join(", ") || "none"}\n` +
      `- Medications: ${(profile.medications || []).join(", ") || "none"}\n` +
      `- Allergies: ${(profile.allergies || []).join(", ") || "none"}\n` +
      `- Goals: ${(profile.goals || []).join(", ") || "unspecified"}\n` +
      `- Dietary restrictions: ${(profile.dietaryRestrictions || []).join(", ") || "none"}\n` +
      `- Pregnant/Breastfeeding: ${profile.pregnantOrBreastfeeding ? "yes" : "no/unknown"}\n` +
      `- Caffeine sensitivity: ${profile.caffeineSensitivity ? "yes" : "no/unknown"}\n` +
      `Use this profile to tailor recommendations.`
    : "No user profile available. Politely ask for missing key details before suggesting supplements.";

  return `${base}\n\n${profileText}`;
}

export function makeTitleFromFirstUserMessage(text: string) {
  const t = text.trim().slice(0, 50);
  return t.length < 50 ? t : t + "...";
}

