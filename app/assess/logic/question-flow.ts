import { fixedA, sectionA, sectionB } from "../data/questions";

type AnswersState = Record<string, unknown>;

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
    return ids.filter((id) => !answeredSet.has(id));
  }

  let ids = sectionB.map((question) => question.id);
  if (answers.A1 !== "F") {
    ids = ids.filter((id) => id !== "B22");
  }
  return ids.filter((id) => !answeredSet.has(id));
}
