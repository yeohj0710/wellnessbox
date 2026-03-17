import { fixedA, sectionA, sectionB } from "../data/questions";

type AnswersState = Record<string, unknown>;

const QUESTION_TAGS: Record<string, string[]> = {
  A5: ["women", "safety"],
  A6: ["safety"],
  A7: ["kidney", "safety"],
  A8: ["liver", "safety"],
  A9: ["blood", "fatigue", "safety"],
  A11: ["cardio", "diet"],
  A12: ["bone", "lifestyle"],
  A13: ["bone", "diet"],
  A14: ["eye", "lifestyle"],
  A15: ["gut"],
  B16: ["fatigue"],
  B17: ["sleep", "stress"],
  B18: ["joint"],
  B19: ["skin", "hair"],
  B20: ["weight"],
  B21: ["liver", "lifestyle"],
  B22: ["women", "blood"],
  B23: ["cardio", "circulation"],
  B24: ["focus", "stress"],
  B25: ["gut"],
  B26: ["immune"],
  B27: ["exercise", "fatigue"],
  B28: ["blood", "circulation"],
  B29: ["weight", "diet"],
  B30: ["exercise", "fatigue"],
  B31: ["eye"],
};

const CATEGORY_TAGS: Record<string, string[]> = {
  vitaminC: ["immune", "fatigue"],
  omega3: ["cardio", "circulation", "eye"],
  calcium: ["bone"],
  lutein: ["eye"],
  vitaminD: ["bone", "fatigue"],
  milkThistle: ["liver"],
  probiotics: ["gut"],
  vitaminB: ["fatigue", "stress"],
  magnesium: ["sleep", "stress"],
  garcinia: ["weight"],
  multivitamin: ["fatigue"],
  zinc: ["immune", "skin"],
  psyllium: ["gut", "weight"],
  minerals: ["fatigue"],
  vitaminA: ["eye", "skin"],
  iron: ["blood", "fatigue", "circulation"],
  phosphatidylserine: ["focus", "stress"],
  folicAcid: ["women", "blood"],
  arginine: ["exercise", "circulation"],
  chondroitin: ["joint"],
  coenzymeQ10: ["fatigue", "cardio"],
  collagen: ["skin", "hair"],
};

const TAG_REASON_COPY: Record<string, string> = {
  safety: "복용 주의나 기저 상태와 연결될 수 있어 먼저 확인하고 있어요.",
  eye: "눈 피로와 시야 관련 신호를 먼저 살펴보고 있어요.",
  gut: "장 건강과 배변 리듬 관련 신호를 먼저 보고 있어요.",
  fatigue: "피로와 회복 흐름을 먼저 확인하고 있어요.",
  stress: "스트레스와 집중 흐름을 먼저 보고 있어요.",
  sleep: "수면 질과 회복 신호를 먼저 보고 있어요.",
  liver: "간 부담이나 회복과 연결된 신호를 먼저 보고 있어요.",
  cardio: "혈행과 심혈관 쪽 신호를 먼저 확인하고 있어요.",
  circulation: "순환과 냉감, 어지럼 흐름을 먼저 보고 있어요.",
  joint: "관절과 움직임 불편 신호를 먼저 보고 있어요.",
  skin: "피부와 모발 관련 신호를 먼저 보고 있어요.",
  hair: "피부와 모발 관련 신호를 먼저 보고 있어요.",
  weight: "체중 변화와 식습관 흐름을 먼저 확인하고 있어요.",
  focus: "집중과 기억 관련 신호를 먼저 보고 있어요.",
  immune: "면역과 잔병치레 흐름을 먼저 확인하고 있어요.",
  women: "여성 건강과 연관된 신호를 먼저 확인하고 있어요.",
  blood: "빈혈감이나 혈액 관련 신호를 먼저 보고 있어요.",
  bone: "뼈 건강과 관련된 습관을 먼저 확인하고 있어요.",
  exercise: "체력과 운동 회복 신호를 먼저 보고 있어요.",
  diet: "식습관과 영양 섭취 패턴을 먼저 확인하고 있어요.",
  lifestyle: "생활 패턴이 결과에 미치는 영향을 먼저 확인하고 있어요.",
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function derivePriorityTags(answers: AnswersState) {
  const tags = new Set<string>();

  for (const key of asStringArray(answers.A10)) {
    for (const tag of CATEGORY_TAGS[key] ?? []) {
      tags.add(tag);
    }
  }

  if (answers.A5 === true) tags.add("women");
  if (answers.A6 === true || answers.A7 === true || answers.A8 === true) {
    tags.add("safety");
  }
  if (answers.A8 === true) tags.add("liver");
  if (answers.A9 === true) {
    tags.add("blood");
    tags.add("fatigue");
  }
  if (answers.A12 === true) tags.add("bone");
  if (answers.A15 === "const" || answers.A15 === "loose") tags.add("gut");

  return tags;
}

function scoreQuestionId(
  questionId: string,
  answers: AnswersState,
  priorityTags: Set<string>
) {
  const tags = QUESTION_TAGS[questionId] ?? [];
  let score = 0;

  for (const tag of tags) {
    if (priorityTags.has(tag)) score += 5;
  }

  if (tags.includes("safety")) score += 3;
  if (answers.A6 === true && questionId === "A6") score += 6;
  if (answers.A7 === true && questionId === "A7") score += 6;
  if (answers.A8 === true && questionId === "A8") score += 6;
  if (answers.A9 === true && questionId === "A9") score += 6;
  if (answers.A15 === "const" && questionId === "B25") score += 4;
  if (answers.A15 === "loose" && questionId === "B25") score += 4;
  if (answers.A12 === true && (questionId === "A12" || questionId === "A13")) {
    score += 4;
  }

  return score;
}

function sortQuestionIds(ids: string[], answers: AnswersState) {
  const priorityTags = derivePriorityTags(answers);
  const baseOrder = [...sectionA, ...sectionB].map((question) => question.id);

  return ids.slice().sort((left, right) => {
    const scoreDiff =
      scoreQuestionId(right, answers, priorityTags) -
      scoreQuestionId(left, answers, priorityTags);
    if (scoreDiff !== 0) return scoreDiff;
    return baseOrder.indexOf(left) - baseOrder.indexOf(right);
  });
}

export function resolveAssessQuestionGuide(
  questionId: string,
  answers: AnswersState
) {
  const priorityTags = derivePriorityTags(answers);
  const tags = QUESTION_TAGS[questionId] ?? [];
  const matchedTag = tags.find((tag) => priorityTags.has(tag));

  if (matchedTag && TAG_REASON_COPY[matchedTag]) {
    return {
      title: "앞선 답변 기준으로 이 질문을 먼저 보고 있어요",
      description: TAG_REASON_COPY[matchedTag],
    };
  }

  if (tags.includes("safety")) {
    return {
      title: "추천 전에 확인이 필요한 항목이에요",
      description: TAG_REASON_COPY.safety,
    };
  }

  return {
    title: "관련도 높은 질문부터 순서대로 보여드리고 있어요",
    description: "완주 시간을 줄이기 위해 지금 상태와 가까운 질문을 먼저 묻고 있어요.",
  };
}

export function computeRemainingQuestionIds(
  section: "A" | "B",
  answers: AnswersState,
  history: string[]
): string[] {
  const answeredSet = new Set(history.filter((id) => id.startsWith(section)));

  if (section === "A") {
    let ids = sectionA.map((question) => question.id).filter((id) => !fixedA.includes(id));
    if (answers.A1 === "M") {
      ids = ids.filter((id) => id !== "A5");
    }
    return sortQuestionIds(
      ids.filter((id) => !answeredSet.has(id)),
      answers
    );
  }

  let ids = sectionB.map((question) => question.id);
  if (answers.A1 !== "F") {
    ids = ids.filter((id) => id !== "B22");
  }
  return sortQuestionIds(
    ids.filter((id) => !answeredSet.has(id)),
    answers
  );
}
