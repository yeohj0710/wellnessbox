import db from "./db";

const ADJECTIVES = [
  "친절한",
  "상큼한",
  "명랑한",
  "따뜻한",
  "산뜻한",
  "반짝이는",
  "든든한",
  "활기찬",
  "싱그러운",
  "포근한",
];

const ANIMALS = [
  "고양이",
  "강아지",
  "토끼",
  "판다",
  "부엉이",
  "돌고래",
  "여우",
  "다람쥐",
  "수달",
  "고슴도치",
];

export function normalizeNickname(value: unknown, maxLength = 60) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function isNicknameAvailable(
  nickname: string,
  excludeKakaoId?: string
) {
  if (!nickname) return false;

  const existing = await db.appUser.findFirst({
    where: {
      nickname,
      ...(excludeKakaoId ? { NOT: { kakaoId: excludeKakaoId } } : {}),
    },
    select: { id: true },
  });

  return !existing;
}

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function generateFriendlyNickname(
  excludeKakaoId?: string
): Promise<string> {
  const combinations = shuffle(
    ADJECTIVES.flatMap((adj) => ANIMALS.map((animal) => `${adj} ${animal}`))
  );

  for (const combo of combinations) {
    const normalized = normalizeNickname(combo);
    if (await isNicknameAvailable(normalized, excludeKakaoId)) {
      return normalized;
    }
  }

  const base = combinations[0] ?? "친절한 친구";
  for (let suffix = 1; suffix <= 9999; suffix += 1) {
    const candidate = normalizeNickname(`${base} ${suffix}`);
    if (await isNicknameAvailable(candidate, excludeKakaoId)) {
      return candidate;
    }
  }

  return normalizeNickname(`${base} ${Date.now()}`);
}
